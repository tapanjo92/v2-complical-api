import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as logsDestinations from 'aws-cdk-lib/aws-logs-destinations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { UsageMigrationResource } from './usage-migration-resource';
import * as path from 'path';

export interface ProductionUsageMeteringProps {
  environment: string;
  apiKeysTable: dynamodb.Table;
  apiLogGroup: logs.LogGroup;
  apiKeyAuthorizerFunction: lambda.Function;
  apiKeysManagementFunction: lambda.Function;
}

/**
 * Production-grade usage metering construct
 * Implements the Stripe/Twilio pattern for ap-south-1
 */
export class ProductionUsageMeteringConstruct extends Construct {
  public readonly cacheInvalidationTopic: sns.Topic;
  public readonly usageProcessor: lambda.Function;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: ProductionUsageMeteringProps) {
    super(scope, id);

    // Run migration to add successfulCalls field
    new UsageMigrationResource(this, 'Migration', {
      apiKeysTable: props.apiKeysTable,
      environment: props.environment,
    });

    // SNS Topic for cache invalidation
    this.cacheInvalidationTopic = new sns.Topic(this, 'CacheInvalidationTopic', {
      displayName: `API Key Cache Invalidation - ${props.environment}`,
      topicName: `complical-api-cache-invalidation-${props.environment}`,
    });

    // Usage processor Lambda function
    this.usageProcessor = new lambda.Function(this, 'UsageProcessor', {
      functionName: `complical-usage-processor-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/auth/usage-log-processor.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        ENVIRONMENT: props.environment,
      },
      reservedConcurrentExecutions: 10,
    });

    // Grant permissions
    props.apiKeysTable.grantReadWriteData(this.usageProcessor);
    this.usageProcessor.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': 'CompliCal/API/Usage'
        }
      }
    }));

    // Subscribe to CloudWatch Logs - only successful requests with usage tracking
    new logs.SubscriptionFilter(this, 'UsageLogSubscription', {
      logGroup: props.apiLogGroup,
      filterPattern: logs.FilterPattern.literal('{ $.status = 2* && $.authorizer.shouldCountUsage = "true" }'),
      destination: new logsDestinations.LambdaDestination(this.usageProcessor),
    });

    // Configure cache invalidation
    this.cacheInvalidationTopic.addSubscription(
      new snsSubscriptions.LambdaSubscription(props.apiKeyAuthorizerFunction, {
        filterPolicy: {
          action: sns.SubscriptionFilter.stringFilter({
            allowlist: ['invalidate_key'],
          }),
        },
      })
    );

    // Grant permissions
    this.cacheInvalidationTopic.grantPublish(props.apiKeysManagementFunction);
    
    // Add environment variables
    props.apiKeyAuthorizerFunction.addEnvironment(
      'CACHE_INVALIDATION_TOPIC_ARN',
      this.cacheInvalidationTopic.topicArn
    );
    
    props.apiKeysManagementFunction.addEnvironment(
      'CACHE_INVALIDATION_TOPIC_ARN',
      this.cacheInvalidationTopic.topicArn
    );

    // CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'UsageDashboard', {
      dashboardName: `complical-api-usage-${props.environment}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'API Calls by Status',
            width: 12,
            height: 6,
            left: [
              new cloudwatch.Metric({
                namespace: 'CompliCal/API/Usage',
                metricName: 'SuccessfulAPICalls',
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
                color: cloudwatch.Color.GREEN,
              }),
              new cloudwatch.Metric({
                namespace: 'CompliCal/API/Usage',
                metricName: 'FailedAPICalls',
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
                color: cloudwatch.Color.RED,
              }),
            ],
          }),
          new cloudwatch.GraphWidget({
            title: 'Processing Performance',
            width: 12,
            height: 6,
            left: [
              new cloudwatch.Metric({
                namespace: 'CompliCal/API/Usage',
                metricName: 'ProcessingLatency',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
                color: cloudwatch.Color.BLUE,
              }),
            ],
          }),
        ],
      ],
    });

    // Alarms
    new cloudwatch.Alarm(this, 'ProcessingErrors', {
      alarmName: `${props.environment}-usage-processing-errors`,
      metric: new cloudwatch.Metric({
        namespace: 'CompliCal/API/Usage',
        metricName: 'ProcessingErrors',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
    });
  }
}