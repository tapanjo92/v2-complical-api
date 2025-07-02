import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as logsDestinations from 'aws-cdk-lib/aws-logs-destinations';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path';
import { ProductionUsageMeteringConstruct } from './production-usage-metering-construct';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  deadlinesTable: dynamodb.Table;
  apiKeysTable: dynamodb.Table;
  apiUsageTable: dynamodb.Table;
  webhooksTable: dynamodb.Table;
  sessionsTable: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  kinesisStream?: kinesis.Stream;
  analyticsTable?: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly usagePlanId: string;
  public readonly basicUsagePlanId: string;
  public readonly professionalUsagePlanId: string;
  public readonly enterpriseUsagePlanId: string;
  public readonly deadlinesFunction: lambda.Function;
  public readonly authFunction: lambda.Function;
  public readonly apiKeysFunction: lambda.Function;
  public readonly webhooksFunction: lambda.Function;
  public readonly authorizerFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Lambda function for deadlines
    const deadlinesFunction = new lambda.Function(this, 'DeadlinesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/deadlines.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
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
      handler: 'handlers/simplified-deadlines.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
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
      handler: 'handlers/auth/auth-secure.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        SESSIONS_TABLE: props.sessionsTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for API keys
    const apiKeysFunction = new lambda.Function(this, 'ApiKeysFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/auth/api-keys-secure.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        TABLE_NAME: props.apiKeysTable.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
        SESSIONS_TABLE: props.sessionsTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for usage analytics
    const usageFunction = new lambda.Function(this, 'UsageFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/auth/usage.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        API_USAGE_TABLE: props.apiUsageTable.tableName,
        SESSIONS_TABLE: props.sessionsTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for API key authorizer with Kinesis streaming
    const apiKeyAuthorizerFunction = new lambda.Function(this, 'ApiKeyAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/auth/api-key-authorizer-production.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        TABLE_NAME: props.apiKeysTable.tableName,
        API_USAGE_TABLE: props.apiUsageTable.tableName,
        KINESIS_STREAM: `complical-usage-stream-${props.environment}`,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ENVIRONMENT: props.environment,
        DEBUG: 'false', // Production: no debug logs
      },
      timeout: cdk.Duration.seconds(3), // Faster timeout for production
      memorySize: 512, // More memory = faster execution
      tracing: lambda.Tracing.ACTIVE,
      description: 'Kinesis-enabled authorizer for real-time analytics with zero caching',
    });

    // Lambda function for processing usage logs
    const processUsageLogsFunction = new lambda.Function(this, 'ProcessUsageLogsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/process-usage-logs.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        API_USAGE_TABLE: props.apiUsageTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for webhook management
    const webhooksFunction = new lambda.Function(this, 'WebhooksFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/auth/webhooks.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        WEBHOOKS_TABLE: props.webhooksTable.tableName,
        SESSIONS_TABLE: props.sessionsTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for processing webhook deliveries
    const processWebhooksFunction = new lambda.Function(this, 'ProcessWebhooksFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/process-webhooks.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        WEBHOOKS_TABLE: props.webhooksTable.tableName,
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        SES_FROM_EMAIL: props.environment === 'prod' ? 'noreply@complical.ai' : 'noreply@get-comp.dev.tatacommunications.link',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions
    props.deadlinesTable.grantReadData(deadlinesFunction);
    props.deadlinesTable.grantReadData(simplifiedDeadlinesFunction);
    props.apiKeysTable.grantReadWriteData(apiKeysFunction);
    props.apiKeysTable.grantReadWriteData(apiKeyAuthorizerFunction); // Need write for usage tracking
    props.apiUsageTable.grantWriteData(apiKeyAuthorizerFunction); // Enhanced authorizer writes usage directly
    props.apiKeysTable.grantWriteData(processUsageLogsFunction);
    props.apiUsageTable.grantWriteData(processUsageLogsFunction);
    props.apiKeysTable.grantReadData(usageFunction);
    props.apiUsageTable.grantReadData(usageFunction);
    props.webhooksTable.grantReadWriteData(webhooksFunction);
    props.webhooksTable.grantReadWriteData(processWebhooksFunction);
    
    // Grant sessions table permissions
    props.sessionsTable.grantReadWriteData(authFunction); // Create, read, delete sessions
    props.sessionsTable.grantReadData(apiKeysFunction); // Validate sessions
    props.sessionsTable.grantReadData(webhooksFunction); // Validate sessions
    props.sessionsTable.grantReadData(usageFunction); // Validate sessions

    // Grant CloudWatch metrics permissions to enhanced authorizer for usage tracking monitoring
    apiKeyAuthorizerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'], // CloudWatch PutMetricData requires * but we restrict via conditions
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': ['CompliCal/API', 'CompliCal/API/Usage']
        }
      }
    }));

    // Grant Kinesis permissions to authorizer
    apiKeyAuthorizerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['kinesis:PutRecord', 'kinesis:PutRecords'],
      resources: [`arn:aws:kinesis:${this.region}:${this.account}:stream/complical-usage-stream-${props.environment}`],
    }));

    // Grant SES permissions to webhook processor for email notifications
    processWebhooksFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'ses:SendEmail',
        'ses:SendTemplatedEmail',
      ],
      resources: [
        `arn:aws:ses:${this.region}:${this.account}:identity/*`,
        `arn:aws:ses:${this.region}:${this.account}:configuration-set/*`,
      ],
    }));

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

    // Grant auth function permission to read and update user preferences
    props.apiKeysTable.grantReadWriteData(authFunction);
    
    // Grant SES permissions to auth function for sending verification emails
    authFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail'],
      resources: [`arn:aws:ses:${this.region}:${this.account}:identity/*`],
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
            principalId: '$context.authorizer.principalId',
            shouldCountUsage: '$context.authorizer.shouldCountUsage',
            requestId: '$context.authorizer.requestId'
          },
          timestamp: '$context.requestTime'
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
      handler: 'handlers/health.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(3),
      memorySize: 128,
      // NO IAM permissions beyond basic Lambda execution
      description: 'Isolated health check endpoint with no data access',
    });

    // Health check endpoint - using dedicated Lambda with NO data access
    const health = this.api.root.addResource('health');
    health.addMethod('GET', new apigateway.LambdaIntegration(healthCheckFunction));

    // V1 endpoints
    const v1 = this.api.root.addResource('v1');

    // Create JWT authorizer Lambda function
    const jwtAuthorizerFunction = new lambda.Function(this, 'JwtAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'jwt-authorizer.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/handlers/auth')),
      timeout: cdk.Duration.seconds(3),
      environment: {
        SESSIONS_TABLE: props.sessionsTable.tableName,
        ENVIRONMENT: props.environment,
      },
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions to JWT authorizer
    props.sessionsTable.grantReadData(jwtAuthorizerFunction);

    // Create JWT authorizer for authenticated endpoints
    const jwtAuthorizer = new apigateway.RequestAuthorizer(this, 'JwtAuthorizer', {
      authorizerName: `complical-jwt-authorizer-${props.environment}`,
      handler: jwtAuthorizerFunction,
      identitySources: [apigateway.IdentitySource.header('Authorization')],
      resultsCacheTtl: cdk.Duration.minutes(5), // Cache JWT validation for 5 minutes
    });

    // Auth endpoints
    const auth = v1.addResource('auth');
    // Public auth endpoints (no auth required for registration/login)
    auth.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    auth.addResource('login').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    
    // Protected auth endpoints (require JWT authentication)
    auth.addResource('logout').addMethod('POST', new apigateway.LambdaIntegration(authFunction), {
      authorizer: jwtAuthorizer,
    });
    auth.addResource('refresh').addMethod('POST', new apigateway.LambdaIntegration(authFunction), {
      authorizer: jwtAuthorizer,
    });
    auth.addResource('change-password').addMethod('POST', new apigateway.LambdaIntegration(authFunction), {
      authorizer: jwtAuthorizer,
    });
    
    // Email preferences endpoints (require JWT authentication)
    const emailPrefsResource = auth.addResource('email-preferences');
    emailPrefsResource.addMethod('GET', new apigateway.LambdaIntegration(authFunction), {
      authorizer: jwtAuthorizer,
    });
    emailPrefsResource.addMethod('POST', new apigateway.LambdaIntegration(authFunction), {
      authorizer: jwtAuthorizer,
    });
    
    // Email verification endpoint (separate Lambda for better isolation)
    const verifyEmailFunction = new lambda.Function(this, 'VerifyEmailFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/auth/verify-email.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        API_KEYS_TABLE: props.apiKeysTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      tracing: lambda.Tracing.ACTIVE,
    });
    
    // Grant permissions to verify email function
    props.apiKeysTable.grantReadWriteData(verifyEmailFunction);
    
    // Public endpoint for email verification (needs to be accessible from email links)
    auth.addResource('verify-email').addMethod('GET', new apigateway.LambdaIntegration(verifyEmailFunction));
    
    // API Keys management endpoints (requires JWT authentication)
    const apiKeysResource = auth.addResource('api-keys');
    apiKeysResource.addMethod('GET', new apigateway.LambdaIntegration(apiKeysFunction), {
      authorizer: jwtAuthorizer,
    });
    apiKeysResource.addMethod('POST', new apigateway.LambdaIntegration(apiKeysFunction), {
      authorizer: jwtAuthorizer,
    });
    const apiKeyIdResource = apiKeysResource.addResource('{keyId}');
    apiKeyIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(apiKeysFunction), {
      authorizer: jwtAuthorizer,
    });
    
    // Usage endpoint (requires JWT authentication)
    const usageResource = auth.addResource('usage');
    usageResource.addMethod('GET', new apigateway.LambdaIntegration(usageFunction), {
      authorizer: jwtAuthorizer,
    });
    
    // Webhook endpoints (requires JWT authentication)
    const webhooksResource = auth.addResource('webhooks');
    webhooksResource.addMethod('GET', new apigateway.LambdaIntegration(webhooksFunction), {
      authorizer: jwtAuthorizer,
    });
    webhooksResource.addMethod('POST', new apigateway.LambdaIntegration(webhooksFunction), {
      authorizer: jwtAuthorizer,
    });
    const webhookIdResource = webhooksResource.addResource('{webhookId}');
    webhookIdResource.addMethod('PUT', new apigateway.LambdaIntegration(webhooksFunction), {
      authorizer: jwtAuthorizer,
    });
    webhookIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(webhooksFunction), {
      authorizer: jwtAuthorizer,
    });

    // Custom authorizer - NO CACHING for accurate real-time usage tracking
    const apiKeyAuthorizer = new apigateway.RequestAuthorizer(this, 'ApiKeyAuthorizer', {
      authorizerName: `complical-api-key-authorizer-${props.environment}`,
      handler: apiKeyAuthorizerFunction,
      identitySources: [apigateway.IdentitySource.header('x-api-key')],
      resultsCacheTtl: cdk.Duration.seconds(0), // ZERO caching - every request must be counted
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
    
    // Ultra-simple endpoint: /v1/deadlines/{country}/{year}/{month}
    const deadlinesCountry = deadlines.addResource('{country}');
    const deadlinesYear = deadlinesCountry.addResource('{year}');
    const deadlinesMonth = deadlinesYear.addResource('{month}');
    deadlinesMonth.addMethod('GET', new apigateway.LambdaIntegration(simplifiedDeadlinesFunction), {
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

    // Create multiple usage plans for different tiers
    // API Gateway applies throttle limits PER API KEY when keys are associated with the plan
    const basicUsagePlan = this.api.addUsagePlan('BasicUsagePlan', {
      name: `complical-basic-plan-${props.environment}`,
      description: 'Basic usage plan - 10 req/sec per API key',
      throttle: {
        rateLimit: 10,  // Per API key limit
        burstLimit: 20,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
    });

    const professionalUsagePlan = this.api.addUsagePlan('ProfessionalUsagePlan', {
      name: `complical-professional-plan-${props.environment}`,
      description: 'Professional usage plan - 50 req/sec per API key',
      throttle: {
        rateLimit: 50,
        burstLimit: 100,
      },
      quota: {
        limit: 100000,
        period: apigateway.Period.MONTH,
      },
    });

    const enterpriseUsagePlan = this.api.addUsagePlan('EnterpriseUsagePlan', {
      name: `complical-enterprise-plan-${props.environment}`,
      description: 'Enterprise usage plan - 100 req/sec per API key',
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 1000000,
        period: apigateway.Period.MONTH,
      },
    });

    // Add API stage to all usage plans
    [basicUsagePlan, professionalUsagePlan, enterpriseUsagePlan].forEach(plan => {
      plan.addApiStage({
        stage: this.api.deploymentStage,
      });
    });

    // Store all usage plan IDs
    this.usagePlanId = basicUsagePlan.usagePlanId;
    this.basicUsagePlanId = basicUsagePlan.usagePlanId;
    this.professionalUsagePlanId = professionalUsagePlan.usagePlanId;
    this.enterpriseUsagePlanId = enterpriseUsagePlan.usagePlanId;
    
    // Assign Lambda functions to public properties
    this.deadlinesFunction = deadlinesFunction;
    this.authFunction = authFunction;
    this.apiKeysFunction = apiKeysFunction;
    this.webhooksFunction = webhooksFunction;
    this.authorizerFunction = apiKeyAuthorizerFunction;

    // Store all usage plan IDs in SSM for Lambda to access
    new ssm.StringParameter(this, 'BasicUsagePlanIdParameter', {
      parameterName: `/complical/${props.environment}/usage-plan-id/basic`,
      stringValue: basicUsagePlan.usagePlanId,
    });
    
    new ssm.StringParameter(this, 'ProfessionalUsagePlanIdParameter', {
      parameterName: `/complical/${props.environment}/usage-plan-id/professional`,
      stringValue: professionalUsagePlan.usagePlanId,
    });
    
    new ssm.StringParameter(this, 'EnterpriseUsagePlanIdParameter', {
      parameterName: `/complical/${props.environment}/usage-plan-id/enterprise`,
      stringValue: enterpriseUsagePlan.usagePlanId,
    });

    // Pass all plan IDs to Lambda
    apiKeysFunction.addEnvironment('BASIC_USAGE_PLAN_ID_PARAM', `/complical/${props.environment}/usage-plan-id/basic`);
    apiKeysFunction.addEnvironment('PROFESSIONAL_USAGE_PLAN_ID_PARAM', `/complical/${props.environment}/usage-plan-id/professional`);
    apiKeysFunction.addEnvironment('ENTERPRISE_USAGE_PLAN_ID_PARAM', `/complical/${props.environment}/usage-plan-id/enterprise`);
    apiKeysFunction.addEnvironment('API_ID', this.api.restApiId);
    
    // Grant SSM permissions to API keys function
    apiKeysFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/complical/${props.environment}/usage-plan-id/*`],
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

    // Create production usage metering
    const usageMetering = new ProductionUsageMeteringConstruct(this, 'UsageMetering', {
      environment: props.environment,
      apiKeysTable: props.apiKeysTable,
      apiLogGroup: logGroup,
      apiKeyAuthorizerFunction: apiKeyAuthorizerFunction,
      apiKeysManagementFunction: apiKeysFunction,
    });

    // new logs.SubscriptionFilter(this, 'UsageLogSubscription', {
    //   logGroup: apiLogGroup,
    //   filterPattern: logs.FilterPattern.literal('[...]'),
    //   destination: new logsDestinations.LambdaDestination(processUsageLogsFunction),
    // });

    // Create DLQ for failed webhook deliveries
    const webhookDLQ = new sqs.Queue(this, 'WebhookDeadLetterQueue', {
      queueName: `complical-webhook-dlq-${props.environment}`,
      retentionPeriod: cdk.Duration.days(14), // Keep failed messages for 14 days
      encryption: sqs.QueueEncryption.UNENCRYPTED, // SNS requires unencrypted or customer-managed KMS
    });

    // Create main webhook processing queue with retry logic
    const webhookQueue = new sqs.Queue(this, 'WebhookQueue', {
      queueName: `complical-webhook-queue-${props.environment}`,
      visibilityTimeout: cdk.Duration.seconds(180), // 3x Lambda timeout
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: webhookDLQ,
        maxReceiveCount: 3, // Retry 3 times before sending to DLQ
      },
      encryption: sqs.QueueEncryption.UNENCRYPTED, // SNS requires unencrypted or customer-managed KMS
    });

    // SNS Topic for webhook triggers
    const webhookTopic = new sns.Topic(this, 'WebhookTriggerTopic', {
      topicName: `complical-webhook-triggers-${props.environment}`,
      displayName: 'CompliCal Webhook Triggers',
    });

    // Subscribe webhook queue to SNS topic (instead of direct Lambda)
    webhookTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(webhookQueue, {
        rawMessageDelivery: true,
      })
    );

    // Configure Lambda to process from SQS with batching
    const webhookEventSource = new lambdaEventSources.SqsEventSource(webhookQueue, {
      batchSize: 10, // Process up to 10 webhooks at once
      reportBatchItemFailures: true, // Allow partial batch failures
    });
    
    processWebhooksFunction.addEventSource(webhookEventSource);

    // Grant permissions
    webhookQueue.grantConsumeMessages(processWebhooksFunction);
    webhookDLQ.grantConsumeMessages(processWebhooksFunction); // For reprocessing from DLQ
    
    // Add environment variables for webhook processor
    processWebhooksFunction.addEnvironment('WEBHOOK_QUEUE_URL', webhookQueue.queueUrl);
    processWebhooksFunction.addEnvironment('WEBHOOK_DLQ_URL', webhookDLQ.queueUrl);

    // Grant authorizer permission to publish to SNS
    webhookTopic.grantPublish(apiKeyAuthorizerFunction);

    // Pass SNS topic ARN to authorizer
    apiKeyAuthorizerFunction.addEnvironment('WEBHOOK_TOPIC_ARN', webhookTopic.topicArn);

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
      value: this.usagePlanId,
      description: 'Basic API Usage Plan ID',
    });
    
    new cdk.CfnOutput(this, 'ProfessionalUsagePlanId', {
      value: this.professionalUsagePlanId,
      description: 'Professional API Usage Plan ID',
    });
    
    new cdk.CfnOutput(this, 'EnterpriseUsagePlanId', {
      value: this.enterpriseUsagePlanId,
      description: 'Enterprise API Usage Plan ID',
    });
    
    // Export API stage ARN for WAF
    new cdk.CfnOutput(this, 'ApiStageArn', {
      value: `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${this.api.deploymentStage.stageName}`,
      description: 'API Gateway Stage ARN for WAF',
      exportName: `${this.stackName}:ApiStageArn`,
    });
  }
}