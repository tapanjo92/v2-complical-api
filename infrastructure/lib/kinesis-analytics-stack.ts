import * as cdk from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as kinesisEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface KinesisAnalyticsStackProps extends cdk.StackProps {
  environment: string;
  apiKeysTable: dynamodb.Table;
  apiUsageTable: dynamodb.Table;
}

export class KinesisAnalyticsStack extends cdk.Stack {
  public readonly usageStream: kinesis.Stream;
  public readonly analyticsTable: dynamodb.Table;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: KinesisAnalyticsStackProps) {
    super(scope, id, props);

    // Create Kinesis Data Stream for real-time usage tracking
    this.usageStream = new kinesis.Stream(this, 'UsageStream', {
      streamName: `complical-usage-stream-${props.environment}`,
      shardCount: 2, // Start with 2 shards, auto-scale based on load
      retentionPeriod: cdk.Duration.days(7), // Keep data for 7 days for replay
      encryption: kinesis.StreamEncryption.MANAGED,
      streamMode: kinesis.StreamMode.PROVISIONED,
    });

    // Create analytics table for aggregated data
    this.analyticsTable = new dynamodb.Table(this, 'AnalyticsTable', {
      tableName: `complical-analytics-${props.environment}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Add GSI for time-based queries
    this.analyticsTable.addGlobalSecondaryIndex({
      indexName: 'time-index',
      partitionKey: {
        name: 'timeWindow',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Lambda for processing Kinesis records
    const streamProcessor = new lambda.Function(this, 'StreamProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/kinesis/stream-processor.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        ANALYTICS_TABLE: this.analyticsTable.tableName,
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        API_USAGE_TABLE: props.apiUsageTable.tableName,
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024, // Higher memory for faster processing
      reservedConcurrentExecutions: 10, // Dedicated capacity
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant permissions
    this.analyticsTable.grantReadWriteData(streamProcessor);
    props.apiKeysTable.grantReadWriteData(streamProcessor);
    props.apiUsageTable.grantWriteData(streamProcessor);

    // Grant CloudWatch metrics permissions
    streamProcessor.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': 'CompliCal/Kinesis'
        }
      }
    }));

    // Configure Kinesis event source with optimized settings
    streamProcessor.addEventSource(new kinesisEventSources.KinesisEventSource(this.usageStream, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100, // Process up to 100 records at once
      maxBatchingWindow: cdk.Duration.seconds(1), // 1 second batching window
      parallelizationFactor: 10, // Process 10 batches in parallel per shard
      retryAttempts: 3,
      bisectBatchOnError: true, // Isolate poison pill messages
      reportBatchItemFailures: true, // Report partial failures
      // tumblingWindowInSeconds: 60, // Not supported in this CDK version
    }));

    // Lambda for real-time aggregation
    const aggregator = new lambda.Function(this, 'RealtimeAggregator', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/kinesis/realtime-aggregator.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        ANALYTICS_TABLE: this.analyticsTable.tableName,
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
    });

    this.analyticsTable.grantReadWriteData(aggregator);

    // Grant CloudWatch metrics permissions to aggregator
    aggregator.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': 'CompliCal/Analytics'
        }
      }
    }));

    // Schedule aggregator to run every minute
    const aggregatorRule = new cdk.aws_events.Rule(this, 'AggregatorSchedule', {
      schedule: cdk.aws_events.Schedule.rate(cdk.Duration.minutes(1)),
    });

    aggregatorRule.addTarget(new cdk.aws_events_targets.LambdaFunction(aggregator));

    // Lambda for analytics queries
    const analyticsApi = new lambda.Function(this, 'AnalyticsApi', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/kinesis/analytics-api.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        ANALYTICS_TABLE: this.analyticsTable.tableName,
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    this.analyticsTable.grantReadData(analyticsApi);

    // Create CloudWatch Dashboard for real-time monitoring
    this.dashboard = new cloudwatch.Dashboard(this, 'UsageAnalyticsDashboard', {
      dashboardName: `complical-usage-analytics-${props.environment}`,
      defaultInterval: cdk.Duration.minutes(5),
    });

    // Add Kinesis metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Kinesis Stream Performance',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Kinesis',
            metricName: 'IncomingRecords',
            dimensionsMap: {
              StreamName: this.usageStream.streamName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/Kinesis',
            metricName: 'IncomingBytes',
            dimensionsMap: {
              StreamName: this.usageStream.streamName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Processing Latency',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: {
              FunctionName: streamProcessor.functionName,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(1),
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // Add custom metrics for business insights
    this.dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'Real-time API Calls (Last 5 min)',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'CompliCal/Analytics',
            metricName: 'TotalAPICalls',
            dimensionsMap: {
              Environment: props.environment,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 6,
        height: 4,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Active Users (Last Hour)',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'CompliCal/Analytics',
            metricName: 'UniqueUsers',
            dimensionsMap: {
              Environment: props.environment,
            },
            statistic: 'Maximum',
            period: cdk.Duration.hours(1),
          }),
        ],
        width: 6,
        height: 4,
      })
    );

    // Add alarms for stream health
    new cloudwatch.Alarm(this, 'StreamThrottleAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Kinesis',
        metricName: 'UserRecords.WriteProvisionedThroughputExceeded',
        dimensionsMap: {
          StreamName: this.usageStream.streamName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Kinesis stream is being throttled - consider adding shards',
    });

    // Output important values
    new cdk.CfnOutput(this, 'StreamName', {
      value: this.usageStream.streamName,
      description: 'Kinesis Data Stream name for usage tracking',
    });

    new cdk.CfnOutput(this, 'AnalyticsTableName', {
      value: this.analyticsTable.tableName,
      description: 'DynamoDB table for aggregated analytics',
    });

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });
  }
}