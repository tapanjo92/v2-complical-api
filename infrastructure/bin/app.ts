#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { AuthStack } from '../lib/auth-stack';
import { ApiStack } from '../lib/api-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { WafStack } from '../lib/waf-stack';
import { MonitoringStack } from '../lib/monitoring-stack';
import { KinesisAnalyticsStack } from '../lib/kinesis-analytics-stack';
import { applyTags } from '../lib/tagging';

const app = new cdk.App();

const environment = process.env.ENVIRONMENT || 'test';
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-south-1',
};

// Deploy DynamoDB stack first
const dynamoStack = new DynamoDBStack(app, `CompliCal-DynamoDB-${environment}`, {
  environment,
  env,
  description: 'CompliCal DynamoDB tables with optimized design',
});

// Deploy Auth stack
const authStack = new AuthStack(app, `CompliCal-Auth-${environment}`, {
  env,
  description: 'CompliCal Cognito authentication',
});

// Deploy Kinesis Analytics stack (optional - controlled by environment variable)
let kinesisStack: KinesisAnalyticsStack | undefined;
if (process.env.ENABLE_KINESIS_ANALYTICS === 'true') {
  kinesisStack = new KinesisAnalyticsStack(app, `CompliCal-Kinesis-${environment}`, {
    environment,
    env,
    apiKeysTable: dynamoStack.apiKeysTable,
    apiUsageTable: dynamoStack.apiUsageTable,
    description: 'CompliCal real-time analytics with Kinesis Data Streams',
  });
  kinesisStack.addDependency(dynamoStack);
}

// Deploy API stack with dependencies
const apiStack = new ApiStack(app, `CompliCal-API-${environment}`, {
  environment,
  env,
  deadlinesTable: dynamoStack.deadlinesTable,
  apiKeysTable: dynamoStack.apiKeysTable,
  apiUsageTable: dynamoStack.apiUsageTable,
  webhooksTable: dynamoStack.webhooksTable,
  sessionsTable: dynamoStack.sessionsTable,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  kinesisStream: kinesisStack?.usageStream,
  analyticsTable: kinesisStack?.analyticsTable,
  description: 'CompliCal API Gateway and Lambda functions',
});

apiStack.addDependency(dynamoStack);
apiStack.addDependency(authStack);
if (kinesisStack) {
  apiStack.addDependency(kinesisStack);
}

// Deploy Frontend stack
const frontendStack = new FrontendStack(app, `CompliCal-Frontend-${environment}`, {
  environment,
  env,
  description: 'CompliCal frontend with CloudFront and S3',
});

// Deploy WAF stack
const wafStack = new WafStack(app, `CompliCal-WAF-${environment}`, {
  environment,
  env,
  apiArn: `arn:aws:apigateway:${env.region}::/restapis/${apiStack.api.restApiId}/stages/${apiStack.api.deploymentStage.stageName}`,
  description: 'CompliCal WAF protection rules',
});

wafStack.addDependency(apiStack);

// Deploy Monitoring stack
const monitoringStack = new MonitoringStack(app, `CompliCal-Monitoring-${environment}`, {
  environment,
  env,
  apiName: apiStack.api.restApiName,
  lambdaFunctions: {
    deadlines: apiStack.deadlinesFunction,
    auth: apiStack.authFunction,
    apiKeys: apiStack.apiKeysFunction,
    webhooks: apiStack.webhooksFunction,
    authorizer: apiStack.authorizerFunction,
  },
  alertEmail: process.env.ALERT_EMAIL, // Set this in your environment
  description: 'CompliCal CloudWatch monitoring and alarms',
});

monitoringStack.addDependency(apiStack);

// Apply tags to all resources
applyTags(app, environment);

app.synth();