import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  deadlinesTable: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Lambda function for deadlines
    const deadlinesFunction = new lambda.Function(this, 'DeadlinesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'deadlines.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/handlers')),
      environment: {
        TABLE_NAME: props.deadlinesTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant permissions
    props.deadlinesTable.grantReadData(deadlinesFunction);

    // API Gateway
    const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/complical-${props.environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.api = new apigateway.RestApi(this, 'ComplicalApi', {
      restApiName: `complical-api-${props.environment}`,
      description: 'CompliCal Compliance Deadlines API - Clean Implementation',
      deployOptions: {
        stageName: props.environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // API Key for testing
    const apiKey = this.api.addApiKey('ApiKey', {
      apiKeyName: `complical-test-key-${props.environment}`,
    });

    const usagePlan = this.api.addUsagePlan('UsagePlan', {
      name: `complical-usage-plan-${props.environment}`,
      apiStages: [{
        api: this.api,
        stage: this.api.deploymentStage,
      }],
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
    });

    usagePlan.addApiKey(apiKey);

    // Lambda integration
    const integration = new apigateway.LambdaIntegration(deadlinesFunction);

    // API Routes matching openapi.yaml
    const v1 = this.api.root.addResource('v1');
    
    // Route 1: /v1/deadlines (global endpoint)
    const deadlines = v1.addResource('deadlines');
    deadlines.addMethod('GET', integration, {
      apiKeyRequired: true,
    });

    // Route 2: /v1/{country}/deadlines
    const country = v1.addResource('{country}');
    const countryDeadlines = country.addResource('deadlines');
    countryDeadlines.addMethod('GET', integration, {
      apiKeyRequired: true,
    });

    // Route 3: /v1/{country}/{agency}/deadlines
    const agency = country.addResource('{agency}');
    const agencyDeadlines = agency.addResource('deadlines');
    agencyDeadlines.addMethod('GET', integration, {
      apiKeyRequired: true,
    });

    // Health check (no auth)
    const health = this.api.root.addResource('health');
    health.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({ status: 'healthy' }),
        },
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [{ statusCode: '200' }],
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiKey', {
      value: apiKey.keyId,
      description: 'API Key ID (retrieve value from console)',
    });
  }
}