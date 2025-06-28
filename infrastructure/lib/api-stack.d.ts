import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
export interface ApiStackProps extends cdk.StackProps {
    environment: string;
    deadlinesTable: dynamodb.Table;
    apiKeysTable: dynamodb.Table;
    apiUsageTable: dynamodb.Table;
    userPool: cognito.UserPool;
    userPoolClient: cognito.UserPoolClient;
}
export declare class ApiStack extends cdk.Stack {
    readonly api: apigateway.RestApi;
    readonly usagePlanId: string;
    constructor(scope: Construct, id: string, props: ApiStackProps);
}
