#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { AuthStack } from '../lib/auth-stack';
import { ApiStack } from '../lib/api-stack';
import { FrontendStack } from '../lib/frontend-stack';

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

// Deploy API stack with dependencies
const apiStack = new ApiStack(app, `CompliCal-API-${environment}`, {
  environment,
  env,
  deadlinesTable: dynamoStack.deadlinesTable,
  apiKeysTable: dynamoStack.apiKeysTable,
  apiUsageTable: dynamoStack.apiUsageTable,
  webhooksTable: dynamoStack.webhooksTable,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  description: 'CompliCal API Gateway and Lambda functions',
});

apiStack.addDependency(dynamoStack);
apiStack.addDependency(authStack);

// Deploy Frontend stack
const frontendStack = new FrontendStack(app, `CompliCal-Frontend-${environment}`, {
  environment,
  env,
  description: 'CompliCal frontend with CloudFront and S3',
});

app.synth();