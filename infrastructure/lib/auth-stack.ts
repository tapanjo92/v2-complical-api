import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `complical-users-${cdk.Stack.of(this).stackName}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        tier: new cognito.StringAttribute({
          mutable: true,
        }),
        rate_limit: new cognito.NumberAttribute({
          mutable: true,
        }),
        company: new cognito.StringAttribute({
          mutable: true,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create app client
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: ['http://localhost:3000/callback'],
        logoutUrls: ['http://localhost:3000'],
      },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // Create user groups
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admins',
      description: 'Administrative users',
      precedence: 1,
    });

    new cognito.CfnUserPoolGroup(this, 'DeveloperGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'developer',
      description: 'Developer tier users',
      precedence: 10,
    });

    new cognito.CfnUserPoolGroup(this, 'ProfessionalGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'professional',
      description: 'Professional tier users',
      precedence: 20,
    });

    new cognito.CfnUserPoolGroup(this, 'EnterpriseGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'enterprise',
      description: 'Enterprise tier users',
      precedence: 30,
    });

    // Create resource server for machine-to-machine auth
    new cognito.CfnUserPoolResourceServer(this, 'ResourceServer', {
      userPoolId: this.userPool.userPoolId,
      identifier: 'complical-api',
      name: 'CompliCal API',
      scopes: [
        {
          scopeName: 'read',
          scopeDescription: 'Read access to compliance deadlines',
        },
      ],
    });

    // Store values for cross-stack reference
    this.userPoolId = this.userPool.userPoolId;
    this.userPoolClientId = this.userPoolClient.userPoolClientId;

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }
}