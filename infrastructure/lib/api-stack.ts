import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as logsDestinations from 'aws-cdk-lib/aws-logs-destinations';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  deadlinesTable: dynamodb.Table;
  apiKeysTable: dynamodb.Table;
  apiUsageTable: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly usagePlanId: string;

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
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for simplified deadlines (Calendarific-style)
    const simplifiedDeadlinesFunction = new lambda.Function(this, 'SimplifiedDeadlinesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'simplified-deadlines.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/handlers')),
      environment: {
        TABLE_NAME: props.deadlinesTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for auth
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'auth/auth-secure.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/handlers')),
      environment: {
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for API keys
    const apiKeysFunction = new lambda.Function(this, 'ApiKeysFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'auth/api-keys-secure.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/handlers')),
      environment: {
        TABLE_NAME: props.apiKeysTable.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for usage analytics
    const usageFunction = new lambda.Function(this, 'UsageFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'auth/usage.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/handlers')),
      environment: {
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        API_USAGE_TABLE: props.apiUsageTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for API key authorizer
    const apiKeyAuthorizerFunction = new lambda.Function(this, 'ApiKeyAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'auth/api-key-authorizer.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/handlers')),
      environment: {
        TABLE_NAME: props.apiKeysTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for processing usage logs
    const processUsageLogsFunction = new lambda.Function(this, 'ProcessUsageLogsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'process-usage-logs.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/handlers')),
      environment: {
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        API_USAGE_TABLE: props.apiUsageTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions
    props.deadlinesTable.grantReadData(deadlinesFunction);
    props.deadlinesTable.grantReadData(simplifiedDeadlinesFunction);
    props.apiKeysTable.grantReadWriteData(apiKeysFunction);
    props.apiKeysTable.grantReadWriteData(apiKeyAuthorizerFunction); // Need write for usage tracking
    props.apiKeysTable.grantWriteData(processUsageLogsFunction);
    props.apiUsageTable.grantWriteData(processUsageLogsFunction);
    props.apiKeysTable.grantReadData(usageFunction);
    props.apiUsageTable.grantReadData(usageFunction);

    // Grant Cognito permissions
    authFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminInitiateAuth',
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminAddUserToGroup',
        'cognito-idp:AdminGetUser',
      ],
      resources: [props.userPool.userPoolArn],
    }));

    apiKeysFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:AdminGetUser'],
      resources: [props.userPool.userPoolArn],
    }));

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
        accessLogFormat: apigateway.AccessLogFormat.custom(JSON.stringify({
          requestId: '$context.requestId',
          requestTime: '$context.requestTime',
          httpMethod: '$context.httpMethod',
          path: '$context.path',
          status: '$context.status',
          responseLength: '$context.responseLength',
          error: '$context.error.message',
          identity: {
            sourceIp: '$context.identity.sourceIp',
            userAgent: '$context.identity.userAgent'
          },
          authorizer: {
            apiKeyId: '$context.authorizer.apiKeyId',
            userEmail: '$context.authorizer.userEmail',
            keyName: '$context.authorizer.keyName',
            principalId: '$context.authorizer.principalId'
          }
        })),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: props.environment === 'prod' 
          ? ['https://complical.ai', 'https://www.complical.ai']
          : ['http://localhost:3000', 'http://localhost:3001', 'https://d1v4wmxs6wjlqf.cloudfront.net'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-CSRF-Token'],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Create a dedicated health check Lambda with NO permissions
    const healthCheckFunction = new lambda.Function(this, 'HealthCheckFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Content-Type-Options': 'nosniff',
              'X-Frame-Options': 'DENY',
              'X-XSS-Protection': '1; mode=block',
              'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
              'Referrer-Policy': 'strict-origin-when-cross-origin'
            },
            body: JSON.stringify({
              status: 'healthy',
              service: 'CompliCal API',
              timestamp: new Date().toISOString()
            })
          };
        };
      `),
      timeout: cdk.Duration.seconds(3),
      memorySize: 128,
      // NO environment variables
      // NO IAM permissions beyond basic Lambda execution
      description: 'Isolated health check endpoint with no data access',
    });

    // Health check endpoint - using dedicated Lambda with NO data access
    const health = this.api.root.addResource('health');
    health.addMethod('GET', new apigateway.LambdaIntegration(healthCheckFunction));

    // V1 endpoints
    const v1 = this.api.root.addResource('v1');

    // Auth endpoints
    const auth = v1.addResource('auth');
    auth.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    auth.addResource('login').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    auth.addResource('logout').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    auth.addResource('refresh').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    auth.addResource('change-password').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    
    const apiKeysResource = auth.addResource('api-keys');
    apiKeysResource.addMethod('GET', new apigateway.LambdaIntegration(apiKeysFunction));
    apiKeysResource.addMethod('POST', new apigateway.LambdaIntegration(apiKeysFunction));
    const apiKeyIdResource = apiKeysResource.addResource('{keyId}');
    apiKeyIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(apiKeysFunction));
    
    // Usage endpoint (requires JWT authentication)
    const usageResource = auth.addResource('usage');
    usageResource.addMethod('GET', new apigateway.LambdaIntegration(usageFunction));

    // Custom authorizer
    const apiKeyAuthorizer = new apigateway.RequestAuthorizer(this, 'ApiKeyAuthorizer', {
      authorizerName: `complical-api-key-authorizer-${props.environment}`,
      handler: apiKeyAuthorizerFunction,
      identitySources: [apigateway.IdentitySource.header('x-api-key')],
      resultsCacheTtl: cdk.Duration.minutes(5),
    });

    // Cognito authorizer (commented out as not currently used)
    // const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
    //   authorizerName: `complical-cognito-authorizer-${props.environment}`,
    //   cognitoUserPools: [props.userPool],
    // });

    // Simplified deadlines endpoint (Calendarific-style)
    const deadlines = v1.addResource('deadlines');
    deadlines.addMethod('GET', new apigateway.LambdaIntegration(simplifiedDeadlinesFunction), {
      apiKeyRequired: true,
      authorizer: apiKeyAuthorizer,
    });

    // Country-specific endpoints
    const country = v1.addResource('{country}');
    const countryDeadlines = country.addResource('deadlines');
    countryDeadlines.addMethod('GET', new apigateway.LambdaIntegration(deadlinesFunction), {
      apiKeyRequired: true,
      authorizer: apiKeyAuthorizer,
    });

    // Agency-specific endpoints
    const agency = country.addResource('{agency}');
    const agencyDeadlines = agency.addResource('deadlines');
    agencyDeadlines.addMethod('GET', new apigateway.LambdaIntegration(deadlinesFunction), {
      apiKeyRequired: true,
      authorizer: apiKeyAuthorizer,
    });

    // Usage plan
    const usagePlan = this.api.addUsagePlan('UsagePlan', {
      name: `complical-usage-plan-${props.environment}`,
      description: 'Usage plan for CompliCal API',
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
    });

    usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    this.usagePlanId = usagePlan.usagePlanId;

    // Store usage plan ID in SSM for Lambda to access
    new ssm.StringParameter(this, 'UsagePlanIdParameter', {
      parameterName: `/complical/${props.environment}/usage-plan-id`,
      stringValue: usagePlan.usagePlanId,
    });

    apiKeysFunction.addEnvironment('USAGE_PLAN_ID_PARAM', `/complical/${props.environment}/usage-plan-id`);
    apiKeysFunction.addEnvironment('API_ID', this.api.restApiId);
    
    // Grant SSM permissions to API keys function
    apiKeysFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/complical/${props.environment}/usage-plan-id`],
    }));

    // Grant API Gateway permissions to API keys function
    apiKeysFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'apigateway:POST',
        'apigateway:DELETE',
        'apigateway:GET',
        'apigateway:PUT',
      ],
      resources: [
        `arn:aws:apigateway:${this.region}::/apikeys`,
        `arn:aws:apigateway:${this.region}::/apikeys/*`,
        `arn:aws:apigateway:${this.region}::/usageplans/*/keys`,
        `arn:aws:apigateway:${this.region}::/usageplans/*/keys/*`,
        `arn:aws:apigateway:${this.region}::/tags/*`,
      ],
    }));

    // CloudWatch Logs subscription for usage tracking
    const apiLogGroup = logs.LogGroup.fromLogGroupName(
      this,
      'ImportedApiLogGroup',
      `/aws/apigateway/complical-${props.environment}`
    );

    new logs.SubscriptionFilter(this, 'UsageLogSubscription', {
      logGroup: apiLogGroup,
      filterPattern: logs.FilterPattern.literal('[...]'),
      destination: new logsDestinations.LambdaDestination(processUsageLogsFunction),
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
    });

    new cdk.CfnOutput(this, 'UsagePlanId', {
      value: usagePlan.usagePlanId,
      description: 'API Usage Plan ID',
    });
  }
}