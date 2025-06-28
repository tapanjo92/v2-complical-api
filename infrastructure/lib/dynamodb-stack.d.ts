import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export interface DynamoDBStackProps extends cdk.StackProps {
    environment: string;
}
export declare class DynamoDBStack extends cdk.Stack {
    readonly deadlinesTable: dynamodb.Table;
    readonly apiKeysTable: dynamodb.Table;
    readonly apiUsageTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props: DynamoDBStackProps);
}
