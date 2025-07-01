import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as logsDestinations from 'aws-cdk-lib/aws-logs-destinations';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  deadlinesTable: dynamodb.Table;
  apiKeysTable: dynamodb.Table;
  apiUsageTable: dynamodb.Table;
  webhooksTable: dynamodb.Table;
  sessionsTable: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly usagePlanId: string;
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

    // Lambda function for API key authorizer with enhanced synchronous usage tracking
    const apiKeyAuthorizerFunction = new lambda.Function(this, 'ApiKeyAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/auth/api-key-authorizer-enhanced.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        TABLE_NAME: props.apiKeysTable.tableName,
        API_USAGE_TABLE: props.apiUsageTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      tracing: lambda.Tracing.ACTIVE,
      description: 'Enhanced authorizer with synchronous usage tracking to fix missing API call counts',
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
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': 'CompliCal/API'
        }
      }
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

    // Auth endpoints
    const auth = v1.addResource('auth');
    auth.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    auth.addResource('login').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    auth.addResource('logout').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    auth.addResource('refresh').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    auth.addResource('change-password').addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    const emailPrefsResource = auth.addResource('email-preferences');
    emailPrefsResource.addMethod('GET', new apigateway.LambdaIntegration(authFunction));
    emailPrefsResource.addMethod('POST', new apigateway.LambdaIntegration(authFunction));
    
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
    
    auth.addResource('verify-email').addMethod('GET', new apigateway.LambdaIntegration(verifyEmailFunction));
    
    const apiKeysResource = auth.addResource('api-keys');
    apiKeysResource.addMethod('GET', new apigateway.LambdaIntegration(apiKeysFunction));
    apiKeysResource.addMethod('POST', new apigateway.LambdaIntegration(apiKeysFunction));
    const apiKeyIdResource = apiKeysResource.addResource('{keyId}');
    apiKeyIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(apiKeysFunction));
    
    // Usage endpoint (requires JWT authentication)
    const usageResource = auth.addResource('usage');
    usageResource.addMethod('GET', new apigateway.LambdaIntegration(usageFunction));
    
    // Webhook endpoints (requires JWT authentication)
    const webhooksResource = auth.addResource('webhooks');
    webhooksResource.addMethod('GET', new apigateway.LambdaIntegration(webhooksFunction));
    webhooksResource.addMethod('POST', new apigateway.LambdaIntegration(webhooksFunction));
    const webhookIdResource = webhooksResource.addResource('{webhookId}');
    webhookIdResource.addMethod('PUT', new apigateway.LambdaIntegration(webhooksFunction));
    webhookIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(webhooksFunction));

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
    
    // Assign Lambda functions to public properties
    this.deadlinesFunction = deadlinesFunction;
    this.authFunction = authFunction;
    this.apiKeysFunction = apiKeysFunction;
    this.webhooksFunction = webhooksFunction;
    this.authorizerFunction = apiKeyAuthorizerFunction;

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

    // SNS Topic for webhook triggers
    const webhookTopic = new sns.Topic(this, 'WebhookTriggerTopic', {
      topicName: `complical-webhook-triggers-${props.environment}`,
      displayName: 'CompliCal Webhook Triggers',
    });

    // Subscribe webhook processor to SNS topic
    webhookTopic.addSubscription(
      new snsSubscriptions.LambdaSubscription(processWebhooksFunction)
    );

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
      value: usagePlan.usagePlanId,
      description: 'API Usage Plan ID',
    });
  }
}