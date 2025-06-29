import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  apiName: string;
  environment: string;
  lambdaFunctions: {
    deadlines: lambda.Function;
    auth: lambda.Function;
    apiKeys: lambda.Function;
    webhooks: lambda.Function;
    authorizer: lambda.Function;
  };
  alertEmail?: string;
}

export class MonitoringStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Create SNS topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: `CompliCal ${props.environment} Alarms`,
      topicName: `complical-alarms-${props.environment}`,
    });

    // Add email subscription if provided
    if (props.alertEmail) {
      this.alarmTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.alertEmail)
      );
    }

    // Create dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `complical-${props.environment}-dashboard`,
      defaultInterval: cdk.Duration.hours(3),
    });

    // API Gateway Metrics
    const apiGatewayWidget = new cloudwatch.GraphWidget({
      title: 'API Gateway Metrics',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Count',
          dimensionsMap: {
            ApiName: props.apiName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: {
            ApiName: props.apiName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          color: '#ff9900',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: {
            ApiName: props.apiName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          color: '#ff0000',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: {
            ApiName: props.apiName,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          color: '#0000ff',
        }),
      ],
      width: 12,
      height: 6,
    });

    // Error Rate Widget
    const errorRateWidget = new cloudwatch.GraphWidget({
      title: 'Error Rate %',
      left: [
        new cloudwatch.MathExpression({
          expression: '(m2+m3)/m1*100',
          label: 'Error Rate %',
          usingMetrics: {
            m1: new cloudwatch.Metric({
              namespace: 'AWS/ApiGateway',
              metricName: 'Count',
              dimensionsMap: {
                ApiName: props.apiName,
              },
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
            }),
            m2: new cloudwatch.Metric({
              namespace: 'AWS/ApiGateway',
              metricName: '4XXError',
              dimensionsMap: {
                ApiName: props.apiName,
              },
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
            }),
            m3: new cloudwatch.Metric({
              namespace: 'AWS/ApiGateway',
              metricName: '5XXError',
              dimensionsMap: {
                ApiName: props.apiName,
              },
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
            }),
          },
          color: '#ff0000',
        }),
      ],
      leftAnnotations: [
        {
          value: 1,
          label: '1% Error Threshold',
          color: '#ff0000',
        },
      ],
      width: 12,
      height: 6,
    });

    // Lambda Function Metrics
    const lambdaMetrics: cloudwatch.IMetric[] = [];
    const lambdaErrorMetrics: cloudwatch.IMetric[] = [];
    const lambdaDurationMetrics: cloudwatch.IMetric[] = [];

    Object.entries(props.lambdaFunctions).forEach(([name, func]) => {
      lambdaMetrics.push(
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Invocations',
          dimensionsMap: {
            FunctionName: func.functionName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: `${name} Invocations`,
        })
      );

      lambdaErrorMetrics.push(
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: {
            FunctionName: func.functionName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: `${name} Errors`,
        })
      );

      lambdaDurationMetrics.push(
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: {
            FunctionName: func.functionName,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          label: `${name} Avg Duration`,
        })
      );
    });

    const lambdaWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Function Metrics',
      left: lambdaMetrics,
      right: lambdaDurationMetrics,
      width: 24,
      height: 6,
    });

    const lambdaErrorWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Function Errors',
      left: lambdaErrorMetrics,
      width: 12,
      height: 6,
    });

    // WAF Metrics
    const wafWidget = new cloudwatch.GraphWidget({
      title: 'WAF Blocked Requests',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/WAFV2',
          metricName: 'BlockedRequests',
          dimensionsMap: {
            WebACL: `complical-waf-${props.environment}`,
            Region: this.region,
            Rule: 'ALL',
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
      ],
      width: 12,
      height: 6,
    });

    // API Usage by Endpoint
    const apiUsageWidget = new cloudwatch.LogQueryWidget({
      title: 'Top API Endpoints (Last 3 Hours)',
      logGroupNames: [`/aws/apigateway/${props.apiName}`],
      queryString: `
        fields @timestamp, @message
        | filter @message like /resource_path/
        | stats count() by resource_path
        | sort count() desc
        | limit 10
      `,
      width: 12,
      height: 6,
    });

    // Response Time Distribution
    const responseTimeWidget = new cloudwatch.LogQueryWidget({
      title: 'Response Time Distribution',
      logGroupNames: [`/aws/apigateway/${props.apiName}`],
      queryString: `
        fields @timestamp, response_latency
        | filter response_latency > 0
        | stats count() by bin(response_latency, 100)
        | sort response_latency
      `,
      width: 12,
      height: 6,
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(apiGatewayWidget, errorRateWidget);
    this.dashboard.addWidgets(lambdaWidget);
    this.dashboard.addWidgets(lambdaErrorWidget, wafWidget);
    this.dashboard.addWidgets(apiUsageWidget, responseTimeWidget);

    // Create Alarms
    this.createAlarms(props);
  }

  private createAlarms(props: MonitoringStackProps) {
    // API Gateway 5XX Error Alarm
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: props.apiName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway 5XX errors exceed threshold',
    });
    api5xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // API Gateway Error Rate Alarm (>1%)
    const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
      metric: new cloudwatch.MathExpression({
        expression: '(m2+m3)/m1*100',
        label: 'Error Rate %',
        usingMetrics: {
          m1: new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Count',
            dimensionsMap: {
              ApiName: props.apiName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          m2: new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '4XXError',
            dimensionsMap: {
              ApiName: props.apiName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          m3: new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '5XXError',
            dimensionsMap: {
              ApiName: props.apiName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        },
      }),
      threshold: 1, // 1% error rate
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API error rate exceeds 1%',
    });
    errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // API Gateway Latency Alarm (>1s)
    const latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiName: props.apiName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1000, // 1000ms = 1s
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API latency exceeds 1 second',
    });
    latencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Lambda Function Error Alarms
    Object.entries(props.lambdaFunctions).forEach(([name, func]) => {
      const lambdaErrorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: {
            FunctionName: func.functionName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `${name} Lambda function errors exceed threshold`,
      });
      lambdaErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

      // Lambda Duration Alarm (function-specific thresholds)
      const durationThreshold = name === 'authorizer' ? 500 : 3000; // 500ms for authorizer, 3s for others
      const lambdaDurationAlarm = new cloudwatch.Alarm(this, `${name}DurationAlarm`, {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: {
            FunctionName: func.functionName,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: durationThreshold,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `${name} Lambda function duration exceeds ${durationThreshold}ms`,
      });
      lambdaDurationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    });

    // Output alarm topic ARN
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS topic ARN for CloudWatch alarms',
    });
  }
}