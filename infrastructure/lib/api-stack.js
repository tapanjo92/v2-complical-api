"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiStack = void 0;
const cdk = require("aws-cdk-lib");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");
const logs = require("aws-cdk-lib/aws-logs");
const logsDestinations = require("aws-cdk-lib/aws-logs-destinations");
const ssm = require("aws-cdk-lib/aws-ssm");
const iam = require("aws-cdk-lib/aws-iam");
const path = require("path");
class ApiStack extends cdk.Stack {
    constructor(scope, id, props) {
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
                API_KEYS_TABLE_NAME: props.apiKeysTable.tableName,
                API_USAGE_TABLE_NAME: props.apiUsageTable.tableName,
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
        props.apiKeysTable.grantReadData(apiKeyAuthorizerFunction);
        props.apiKeysTable.grantWriteData(processUsageLogsFunction);
        props.apiUsageTable.grantWriteData(processUsageLogsFunction);
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
                    apiKeyId: '$context.authorizer.apiKeyId',
                    principalId: '$context.authorizer.principalId',
                })),
            },
            defaultCorsPreflightOptions: {
                allowOrigins: props.environment === 'prod'
                    ? ['https://complical.ai', 'https://www.complical.ai']
                    : ['http://localhost:3000', 'http://localhost:3001'],
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
        const apiKeysResource = auth.addResource('api-keys');
        apiKeysResource.addMethod('GET', new apigateway.LambdaIntegration(apiKeysFunction));
        apiKeysResource.addMethod('POST', new apigateway.LambdaIntegration(apiKeysFunction));
        const apiKeyIdResource = apiKeysResource.addResource('{keyId}');
        apiKeyIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(apiKeysFunction));
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
        const apiLogGroup = logs.LogGroup.fromLogGroupName(this, 'ImportedApiLogGroup', `/aws/apigateway/complical-${props.environment}`);
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
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyx5REFBeUQ7QUFDekQsaURBQWlEO0FBR2pELDZDQUE2QztBQUM3QyxzRUFBc0U7QUFDdEUsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUUzQyw2QkFBNkI7QUFXN0IsTUFBYSxRQUFTLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixnQ0FBZ0M7UUFDaEMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3ZFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLG1CQUFtQjtZQUM1QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztZQUMzRSxXQUFXLEVBQUU7Z0JBQ1gsVUFBVSxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUztnQkFDMUMsbUNBQW1DLEVBQUUsR0FBRzthQUN6QztZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNO1NBQy9CLENBQUMsQ0FBQztRQUVILGdFQUFnRTtRQUNoRSxNQUFNLDJCQUEyQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDM0YsT0FBTyxFQUFFLE1BQU0sQ0FBQyxP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TSxXQUFXO2FBQzdDO1NBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSixrREFBa0Q7UUFDbEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FDaEQsSUFBSSxFQUNKLHFCQUFxQixFQUNyQiw2QkFBNkIsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUNqRCxDQUFDO1FBRUYsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3hELFFBQVEsRUFBRSxXQUFXO1lBQ3JCLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDbEQsV0FBVyxFQUFFLElBQUksZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsd0JBQXdCLENBQUM7U0FDOUUsQ0FBQyxDQUFDO1FBRUgsVUFBVTtRQUNWLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQ2hDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUc7WUFDbkIsV0FBVyxFQUFFLGlCQUFpQjtTQUMvQixDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRTtZQUMvQixLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTO1lBQ3pCLFdBQVcsRUFBRSxnQkFBZ0I7U0FDOUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXO1lBQzVCLFdBQVcsRUFBRSxtQkFBbUI7U0FDakMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdlVELDRCQXVVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgbG9nc0Rlc3RpbmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncy1kZXN0aW5hdGlvbnMnO1xuaW1wb3J0ICogYXMgc3NtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFwaVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIGRlYWRsaW5lc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgYXBpS2V5c1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgYXBpVXNhZ2VUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xuICB1c2VyUG9vbENsaWVudDogY29nbml0by5Vc2VyUG9vbENsaWVudDtcbn1cblxuZXhwb3J0IGNsYXNzIEFwaVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xuICBwdWJsaWMgcmVhZG9ubHkgdXNhZ2VQbGFuSWQ6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBpU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBkZWFkbGluZXNcbiAgICBjb25zdCBkZWFkbGluZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0RlYWRsaW5lc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAnZGVhZGxpbmVzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2hhbmRsZXJzJykpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogcHJvcHMuZGVhZGxpbmVzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBBV1NfTk9ERUpTX0NPTk5FQ1RJT05fUkVVU0VfRU5BQkxFRDogJzEnLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3Igc2ltcGxpZmllZCBkZWFkbGluZXMgKENhbGVuZGFyaWZpYy1zdHlsZSlcbiAgICBjb25zdCBzaW1wbGlmaWVkRGVhZGxpbmVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTaW1wbGlmaWVkRGVhZGxpbmVzRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdzaW1wbGlmaWVkLWRlYWRsaW5lcy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vYmFja2VuZC9oYW5kbGVycycpKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IHByb3BzLmRlYWRsaW5lc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVdTX05PREVKU19DT05ORUNUSU9OX1JFVVNFX0VOQUJMRUQ6ICcxJyxcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIGF1dGhcbiAgICBjb25zdCBhdXRoRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBdXRoRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdhdXRoL2F1dGgtc2VjdXJlLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2hhbmRsZXJzJykpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiBwcm9wcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICBBV1NfTk9ERUpTX0NPTk5FQ1RJT05fUkVVU0VfRU5BQkxFRDogJzEnLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgQVBJIGtleXNcbiAgICBjb25zdCBhcGlLZXlzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBcGlLZXlzRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdhdXRoL2FwaS1rZXlzLXNlY3VyZS5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vYmFja2VuZC9oYW5kbGVycycpKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRBQkxFX05BTUU6IHByb3BzLmFwaUtleXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfUE9PTF9JRDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgQVdTX05PREVKU19DT05ORUNUSU9OX1JFVVNFX0VOQUJMRUQ6ICcxJyxcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZm9yIEFQSSBrZXkgYXV0aG9yaXplclxuICAgIGNvbnN0IGFwaUtleUF1dGhvcml6ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FwaUtleUF1dGhvcml6ZXJGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgaGFuZGxlcjogJ2F1dGgvYXBpLWtleS1hdXRob3JpemVyLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2hhbmRsZXJzJykpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogcHJvcHMuYXBpS2V5c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVdTX05PREVKU19DT05ORUNUSU9OX1JFVVNFX0VOQUJMRUQ6ICcxJyxcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgIG1lbW9yeVNpemU6IDEyOCxcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgcHJvY2Vzc2luZyB1c2FnZSBsb2dzXG4gICAgY29uc3QgcHJvY2Vzc1VzYWdlTG9nc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUHJvY2Vzc1VzYWdlTG9nc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAncHJvY2Vzcy11c2FnZS1sb2dzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2hhbmRsZXJzJykpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgQVBJX0tFWVNfVEFCTEVfTkFNRTogcHJvcHMuYXBpS2V5c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVBJX1VTQUdFX1RBQkxFX05BTUU6IHByb3BzLmFwaVVzYWdlVGFibGUudGFibGVOYW1lLFxuICAgICAgICBBV1NfTk9ERUpTX0NPTk5FQ1RJT05fUkVVU0VfRU5BQkxFRDogJzEnLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnNcbiAgICBwcm9wcy5kZWFkbGluZXNUYWJsZS5ncmFudFJlYWREYXRhKGRlYWRsaW5lc0Z1bmN0aW9uKTtcbiAgICBwcm9wcy5kZWFkbGluZXNUYWJsZS5ncmFudFJlYWREYXRhKHNpbXBsaWZpZWREZWFkbGluZXNGdW5jdGlvbik7XG4gICAgcHJvcHMuYXBpS2V5c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlLZXlzRnVuY3Rpb24pO1xuICAgIHByb3BzLmFwaUtleXNUYWJsZS5ncmFudFJlYWREYXRhKGFwaUtleUF1dGhvcml6ZXJGdW5jdGlvbik7XG4gICAgcHJvcHMuYXBpS2V5c1RhYmxlLmdyYW50V3JpdGVEYXRhKHByb2Nlc3NVc2FnZUxvZ3NGdW5jdGlvbik7XG4gICAgcHJvcHMuYXBpVXNhZ2VUYWJsZS5ncmFudFdyaXRlRGF0YShwcm9jZXNzVXNhZ2VMb2dzRnVuY3Rpb24pO1xuXG4gICAgLy8gR3JhbnQgQ29nbml0byBwZXJtaXNzaW9uc1xuICAgIGF1dGhGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5Jbml0aWF0ZUF1dGgnLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyJyxcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluU2V0VXNlclBhc3N3b3JkJyxcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQWRkVXNlclRvR3JvdXAnLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy51c2VyUG9vbC51c2VyUG9vbEFybl0sXG4gICAgfSkpO1xuXG4gICAgYXBpS2V5c0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlciddLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMudXNlclBvb2wudXNlclBvb2xBcm5dLFxuICAgIH0pKTtcblxuICAgIC8vIEFQSSBHYXRld2F5XG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnQXBpTG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2FwaWdhdGV3YXkvY29tcGxpY2FsLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnQ29tcGxpY2FsQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6IGBjb21wbGljYWwtYXBpLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcGxpQ2FsIENvbXBsaWFuY2UgRGVhZGxpbmVzIEFQSSAtIENsZWFuIEltcGxlbWVudGF0aW9uJyxcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgc3RhZ2VOYW1lOiBwcm9wcy5lbnZpcm9ubWVudCxcbiAgICAgICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiB0cnVlLFxuICAgICAgICB0cmFjaW5nRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgYWNjZXNzTG9nRGVzdGluYXRpb246IG5ldyBhcGlnYXRld2F5LkxvZ0dyb3VwTG9nRGVzdGluYXRpb24obG9nR3JvdXApLFxuICAgICAgICBhY2Nlc3NMb2dGb3JtYXQ6IGFwaWdhdGV3YXkuQWNjZXNzTG9nRm9ybWF0LmN1c3RvbShKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgcmVxdWVzdElkOiAnJGNvbnRleHQucmVxdWVzdElkJyxcbiAgICAgICAgICByZXF1ZXN0VGltZTogJyRjb250ZXh0LnJlcXVlc3RUaW1lJyxcbiAgICAgICAgICBodHRwTWV0aG9kOiAnJGNvbnRleHQuaHR0cE1ldGhvZCcsXG4gICAgICAgICAgcGF0aDogJyRjb250ZXh0LnBhdGgnLFxuICAgICAgICAgIHN0YXR1czogJyRjb250ZXh0LnN0YXR1cycsXG4gICAgICAgICAgcmVzcG9uc2VMZW5ndGg6ICckY29udGV4dC5yZXNwb25zZUxlbmd0aCcsXG4gICAgICAgICAgZXJyb3I6ICckY29udGV4dC5lcnJvci5tZXNzYWdlJyxcbiAgICAgICAgICBhcGlLZXlJZDogJyRjb250ZXh0LmF1dGhvcml6ZXIuYXBpS2V5SWQnLFxuICAgICAgICAgIHByaW5jaXBhbElkOiAnJGNvbnRleHQuYXV0aG9yaXplci5wcmluY2lwYWxJZCcsXG4gICAgICAgIH0pKSxcbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnIFxuICAgICAgICAgID8gWydodHRwczovL2NvbXBsaWNhbC5haScsICdodHRwczovL3d3dy5jb21wbGljYWwuYWknXVxuICAgICAgICAgIDogWydodHRwOi8vbG9jYWxob3N0OjMwMDAnLCAnaHR0cDovL2xvY2FsaG9zdDozMDAxJ10sXG4gICAgICAgIGFsbG93TWV0aG9kczogWydHRVQnLCAnUE9TVCcsICdQVVQnLCAnREVMRVRFJywgJ09QVElPTlMnXSxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdYLUFtei1EYXRlJywgJ0F1dGhvcml6YXRpb24nLCAnWC1BcGktS2V5JywgJ1gtQ1NSRi1Ub2tlbiddLFxuICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiB0cnVlLFxuICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgYSBkZWRpY2F0ZWQgaGVhbHRoIGNoZWNrIExhbWJkYSB3aXRoIE5PIHBlcm1pc3Npb25zXG4gICAgY29uc3QgaGVhbHRoQ2hlY2tGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0hlYWx0aENoZWNrRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxuICAgICAgICBleHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgICAnWC1Db250ZW50LVR5cGUtT3B0aW9ucyc6ICdub3NuaWZmJyxcbiAgICAgICAgICAgICAgJ1gtRnJhbWUtT3B0aW9ucyc6ICdERU5ZJyxcbiAgICAgICAgICAgICAgJ1gtWFNTLVByb3RlY3Rpb24nOiAnMTsgbW9kZT1ibG9jaycsXG4gICAgICAgICAgICAgICdTdHJpY3QtVHJhbnNwb3J0LVNlY3VyaXR5JzogJ21heC1hZ2U9MzE1MzYwMDA7IGluY2x1ZGVTdWJEb21haW5zJyxcbiAgICAgICAgICAgICAgJ1JlZmVycmVyLVBvbGljeSc6ICdzdHJpY3Qtb3JpZ2luLXdoZW4tY3Jvc3Mtb3JpZ2luJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgc3RhdHVzOiAnaGVhbHRoeScsXG4gICAgICAgICAgICAgIHNlcnZpY2U6ICdDb21wbGlDYWwgQVBJJyxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgIGApLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMyksXG4gICAgICBtZW1vcnlTaXplOiAxMjgsXG4gICAgICAvLyBOTyBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICAgIC8vIE5PIElBTSBwZXJtaXNzaW9ucyBiZXlvbmQgYmFzaWMgTGFtYmRhIGV4ZWN1dGlvblxuICAgICAgZGVzY3JpcHRpb246ICdJc29sYXRlZCBoZWFsdGggY2hlY2sgZW5kcG9pbnQgd2l0aCBubyBkYXRhIGFjY2VzcycsXG4gICAgfSk7XG5cbiAgICAvLyBIZWFsdGggY2hlY2sgZW5kcG9pbnQgLSB1c2luZyBkZWRpY2F0ZWQgTGFtYmRhIHdpdGggTk8gZGF0YSBhY2Nlc3NcbiAgICBjb25zdCBoZWFsdGggPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdoZWFsdGgnKTtcbiAgICBoZWFsdGguYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihoZWFsdGhDaGVja0Z1bmN0aW9uKSk7XG5cbiAgICAvLyBWMSBlbmRwb2ludHNcbiAgICBjb25zdCB2MSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3YxJyk7XG5cbiAgICAvLyBBdXRoIGVuZHBvaW50c1xuICAgIGNvbnN0IGF1dGggPSB2MS5hZGRSZXNvdXJjZSgnYXV0aCcpO1xuICAgIGF1dGguYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aEZ1bmN0aW9uKSk7XG4gICAgYXV0aC5hZGRSZXNvdXJjZSgnbG9naW4nKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoRnVuY3Rpb24pKTtcbiAgICBhdXRoLmFkZFJlc291cmNlKCdsb2dvdXQnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoRnVuY3Rpb24pKTtcbiAgICBhdXRoLmFkZFJlc291cmNlKCdyZWZyZXNoJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aEZ1bmN0aW9uKSk7XG4gICAgXG4gICAgY29uc3QgYXBpS2V5c1Jlc291cmNlID0gYXV0aC5hZGRSZXNvdXJjZSgnYXBpLWtleXMnKTtcbiAgICBhcGlLZXlzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhcGlLZXlzRnVuY3Rpb24pKTtcbiAgICBhcGlLZXlzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXBpS2V5c0Z1bmN0aW9uKSk7XG4gICAgY29uc3QgYXBpS2V5SWRSZXNvdXJjZSA9IGFwaUtleXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2tleUlkfScpO1xuICAgIGFwaUtleUlkUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhcGlLZXlzRnVuY3Rpb24pKTtcblxuICAgIC8vIEN1c3RvbSBhdXRob3JpemVyXG4gICAgY29uc3QgYXBpS2V5QXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RBdXRob3JpemVyKHRoaXMsICdBcGlLZXlBdXRob3JpemVyJywge1xuICAgICAgYXV0aG9yaXplck5hbWU6IGBjb21wbGljYWwtYXBpLWtleS1hdXRob3JpemVyLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGhhbmRsZXI6IGFwaUtleUF1dGhvcml6ZXJGdW5jdGlvbixcbiAgICAgIGlkZW50aXR5U291cmNlczogW2FwaWdhdGV3YXkuSWRlbnRpdHlTb3VyY2UuaGVhZGVyKCd4LWFwaS1rZXknKV0sXG4gICAgICByZXN1bHRzQ2FjaGVUdGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgIH0pO1xuXG4gICAgLy8gQ29nbml0byBhdXRob3JpemVyIChjb21tZW50ZWQgb3V0IGFzIG5vdCBjdXJyZW50bHkgdXNlZClcbiAgICAvLyBjb25zdCBjb2duaXRvQXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyKHRoaXMsICdDb2duaXRvQXV0aG9yaXplcicsIHtcbiAgICAvLyAgIGF1dGhvcml6ZXJOYW1lOiBgY29tcGxpY2FsLWNvZ25pdG8tYXV0aG9yaXplci0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgLy8gICBjb2duaXRvVXNlclBvb2xzOiBbcHJvcHMudXNlclBvb2xdLFxuICAgIC8vIH0pO1xuXG4gICAgLy8gU2ltcGxpZmllZCBkZWFkbGluZXMgZW5kcG9pbnQgKENhbGVuZGFyaWZpYy1zdHlsZSlcbiAgICBjb25zdCBkZWFkbGluZXMgPSB2MS5hZGRSZXNvdXJjZSgnZGVhZGxpbmVzJyk7XG4gICAgZGVhZGxpbmVzLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc2ltcGxpZmllZERlYWRsaW5lc0Z1bmN0aW9uKSwge1xuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXG4gICAgICBhdXRob3JpemVyOiBhcGlLZXlBdXRob3JpemVyLFxuICAgIH0pO1xuXG4gICAgLy8gQ291bnRyeS1zcGVjaWZpYyBlbmRwb2ludHNcbiAgICBjb25zdCBjb3VudHJ5ID0gdjEuYWRkUmVzb3VyY2UoJ3tjb3VudHJ5fScpO1xuICAgIGNvbnN0IGNvdW50cnlEZWFkbGluZXMgPSBjb3VudHJ5LmFkZFJlc291cmNlKCdkZWFkbGluZXMnKTtcbiAgICBjb3VudHJ5RGVhZGxpbmVzLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZGVhZGxpbmVzRnVuY3Rpb24pLCB7XG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcbiAgICAgIGF1dGhvcml6ZXI6IGFwaUtleUF1dGhvcml6ZXIsXG4gICAgfSk7XG5cbiAgICAvLyBBZ2VuY3ktc3BlY2lmaWMgZW5kcG9pbnRzXG4gICAgY29uc3QgYWdlbmN5ID0gY291bnRyeS5hZGRSZXNvdXJjZSgne2FnZW5jeX0nKTtcbiAgICBjb25zdCBhZ2VuY3lEZWFkbGluZXMgPSBhZ2VuY3kuYWRkUmVzb3VyY2UoJ2RlYWRsaW5lcycpO1xuICAgIGFnZW5jeURlYWRsaW5lcy5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGRlYWRsaW5lc0Z1bmN0aW9uKSwge1xuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXG4gICAgICBhdXRob3JpemVyOiBhcGlLZXlBdXRob3JpemVyLFxuICAgIH0pO1xuXG4gICAgLy8gVXNhZ2UgcGxhblxuICAgIGNvbnN0IHVzYWdlUGxhbiA9IHRoaXMuYXBpLmFkZFVzYWdlUGxhbignVXNhZ2VQbGFuJywge1xuICAgICAgbmFtZTogYGNvbXBsaWNhbC11c2FnZS1wbGFuLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVXNhZ2UgcGxhbiBmb3IgQ29tcGxpQ2FsIEFQSScsXG4gICAgICB0aHJvdHRsZToge1xuICAgICAgICByYXRlTGltaXQ6IDEwLFxuICAgICAgICBidXJzdExpbWl0OiAyMCxcbiAgICAgIH0sXG4gICAgICBxdW90YToge1xuICAgICAgICBsaW1pdDogMTAwMDAsXG4gICAgICAgIHBlcmlvZDogYXBpZ2F0ZXdheS5QZXJpb2QuTU9OVEgsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdXNhZ2VQbGFuLmFkZEFwaVN0YWdlKHtcbiAgICAgIHN0YWdlOiB0aGlzLmFwaS5kZXBsb3ltZW50U3RhZ2UsXG4gICAgfSk7XG5cbiAgICB0aGlzLnVzYWdlUGxhbklkID0gdXNhZ2VQbGFuLnVzYWdlUGxhbklkO1xuXG4gICAgLy8gU3RvcmUgdXNhZ2UgcGxhbiBJRCBpbiBTU00gZm9yIExhbWJkYSB0byBhY2Nlc3NcbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnVXNhZ2VQbGFuSWRQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgL2NvbXBsaWNhbC8ke3Byb3BzLmVudmlyb25tZW50fS91c2FnZS1wbGFuLWlkYCxcbiAgICAgIHN0cmluZ1ZhbHVlOiB1c2FnZVBsYW4udXNhZ2VQbGFuSWQsXG4gICAgfSk7XG5cbiAgICBhcGlLZXlzRnVuY3Rpb24uYWRkRW52aXJvbm1lbnQoJ1VTQUdFX1BMQU5fSURfUEFSQU0nLCBgL2NvbXBsaWNhbC8ke3Byb3BzLmVudmlyb25tZW50fS91c2FnZS1wbGFuLWlkYCk7XG4gICAgYXBpS2V5c0Z1bmN0aW9uLmFkZEVudmlyb25tZW50KCdBUElfSUQnLCB0aGlzLmFwaS5yZXN0QXBpSWQpO1xuICAgIFxuICAgIC8vIEdyYW50IFNTTSBwZXJtaXNzaW9ucyB0byBBUEkga2V5cyBmdW5jdGlvblxuICAgIGFwaUtleXNGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydzc206R2V0UGFyYW1ldGVyJ10sXG4gICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpzc206JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OnBhcmFtZXRlci9jb21wbGljYWwvJHtwcm9wcy5lbnZpcm9ubWVudH0vdXNhZ2UtcGxhbi1pZGBdLFxuICAgIH0pKTtcblxuICAgIC8vIEdyYW50IEFQSSBHYXRld2F5IHBlcm1pc3Npb25zIHRvIEFQSSBrZXlzIGZ1bmN0aW9uXG4gICAgYXBpS2V5c0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdhcGlnYXRld2F5OlBPU1QnLFxuICAgICAgICAnYXBpZ2F0ZXdheTpERUxFVEUnLFxuICAgICAgICAnYXBpZ2F0ZXdheTpHRVQnLFxuICAgICAgICAnYXBpZ2F0ZXdheTpQVVQnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czphcGlnYXRld2F5OiR7dGhpcy5yZWdpb259OjovYXBpa2V5c2AsXG4gICAgICAgIGBhcm46YXdzOmFwaWdhdGV3YXk6JHt0aGlzLnJlZ2lvbn06Oi9hcGlrZXlzLypgLFxuICAgICAgICBgYXJuOmF3czphcGlnYXRld2F5OiR7dGhpcy5yZWdpb259OjovdXNhZ2VwbGFucy8qL2tleXNgLFxuICAgICAgICBgYXJuOmF3czphcGlnYXRld2F5OiR7dGhpcy5yZWdpb259OjovdXNhZ2VwbGFucy8qL2tleXMvKmAsXG4gICAgICAgIGBhcm46YXdzOmFwaWdhdGV3YXk6JHt0aGlzLnJlZ2lvbn06Oi90YWdzLypgLFxuICAgICAgXSxcbiAgICB9KSk7XG5cbiAgICAvLyBDbG91ZFdhdGNoIExvZ3Mgc3Vic2NyaXB0aW9uIGZvciB1c2FnZSB0cmFja2luZ1xuICAgIGNvbnN0IGFwaUxvZ0dyb3VwID0gbG9ncy5Mb2dHcm91cC5mcm9tTG9nR3JvdXBOYW1lKFxuICAgICAgdGhpcyxcbiAgICAgICdJbXBvcnRlZEFwaUxvZ0dyb3VwJyxcbiAgICAgIGAvYXdzL2FwaWdhdGV3YXkvY29tcGxpY2FsLSR7cHJvcHMuZW52aXJvbm1lbnR9YFxuICAgICk7XG5cbiAgICBuZXcgbG9ncy5TdWJzY3JpcHRpb25GaWx0ZXIodGhpcywgJ1VzYWdlTG9nU3Vic2NyaXB0aW9uJywge1xuICAgICAgbG9nR3JvdXA6IGFwaUxvZ0dyb3VwLFxuICAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmxpdGVyYWwoJ1suLi5dJyksXG4gICAgICBkZXN0aW5hdGlvbjogbmV3IGxvZ3NEZXN0aW5hdGlvbnMuTGFtYmRhRGVzdGluYXRpb24ocHJvY2Vzc1VzYWdlTG9nc0Z1bmN0aW9uKSxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXBpLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5yZXN0QXBpSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2FnZVBsYW5JZCcsIHtcbiAgICAgIHZhbHVlOiB1c2FnZVBsYW4udXNhZ2VQbGFuSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBVc2FnZSBQbGFuIElEJyxcbiAgICB9KTtcbiAgfVxufSJdfQ==