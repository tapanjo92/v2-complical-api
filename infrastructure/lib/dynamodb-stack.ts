import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DynamoDBStackProps extends cdk.StackProps {
  environment: string;
}

export class DynamoDBStack extends cdk.Stack {
  public readonly deadlinesTable: dynamodb.Table;
  public readonly apiKeysTable: dynamodb.Table;
  public readonly apiUsageTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
    super(scope, id, props);

    // SINGLE COHERENT DATA MODEL
    // Based on API access patterns from openapi.yaml:
    // 1. Get deadlines by jurisdiction + optional filters (type, date range)
    // 2. Get deadlines by jurisdiction + agency + optional filters
    
    this.deadlinesTable = new dynamodb.Table(this, 'DeadlinesTable', {
      tableName: `complical-deadlines-${props.environment}`,
      
      // Primary Key Design:
      // PK: JURISDICTION#{jurisdiction}#YEARMONTH#{yyyy-mm}
      // SK: DUEDATE#{yyyy-mm-dd}#TYPE#{type}#ID#{uuid}
      // This enables efficient queries for jurisdiction + date range
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // SINGLE OPTIMIZED GSI for agency-based queries
    // GSI PK: AGENCY#{agency}#{jurisdiction}
    // GSI SK: DUEDATE#{yyyy-mm-dd}#TYPE#{type}
    // This enables efficient queries for agency + optional date range
    this.deadlinesTable.addGlobalSecondaryIndex({
      indexName: 'AgencyIndex',
      partitionKey: {
        name: 'GSI_PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI_SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // API Keys table for managing user API keys
    this.apiKeysTable = new dynamodb.Table(this, 'ApiKeysTable', {
      tableName: `complical-api-keys-${props.environment}`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for querying by user email
    this.apiKeysTable.addGlobalSecondaryIndex({
      indexName: 'userEmail-createdAt-index',
      partitionKey: {
        name: 'userEmail',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for querying by hashed key
    this.apiKeysTable.addGlobalSecondaryIndex({
      indexName: 'hashedKey-index',
      partitionKey: {
        name: 'hashedKey',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // API Usage table for tracking usage metrics
    this.apiUsageTable = new dynamodb.Table(this, 'ApiUsageTable', {
      tableName: `complical-api-usage-${props.environment}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DeadlinesTableName', {
      value: this.deadlinesTable.tableName,
      description: 'Deadlines DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'ApiKeysTableName', {
      value: this.apiKeysTable.tableName,
      description: 'API Keys DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'ApiUsageTableName', {
      value: this.apiUsageTable.tableName,
      description: 'API Usage DynamoDB table name',
    });
  }
}