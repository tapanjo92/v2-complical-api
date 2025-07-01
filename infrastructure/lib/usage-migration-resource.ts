import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface UsageMigrationResourceProps {
  apiKeysTable: dynamodb.Table;
  environment: string;
}

/**
 * Custom resource to migrate API keys table to support success-based billing
 */
export class UsageMigrationResource extends Construct {
  constructor(scope: Construct, id: string, props: UsageMigrationResourceProps) {
    super(scope, id);

    // Lambda function to perform migration
    const migrationFunction = new lambda.Function(this, 'MigrationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
        
        const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
        
        exports.handler = async (event) => {
          console.log('Migration event:', JSON.stringify(event));
          const tableName = event.ResourceProperties.TableName;
          
          if (event.RequestType === 'Delete') {
            // Nothing to do on delete
            return { PhysicalResourceId: event.PhysicalResourceId };
          }
          
          try {
            // Scan all API keys
            const scanResult = await dynamodb.send(new ScanCommand({
              TableName: tableName,
              ConsistentRead: true
            }));
            
            const items = scanResult.Items || [];
            console.log(\`Found \${items.length} API keys to check\`);
            
            let migratedCount = 0;
            let skippedCount = 0;
            
            // Update each key that doesn't have successfulCalls field
            for (const item of items) {
              if (item.successfulCalls === undefined) {
                await dynamodb.send(new UpdateCommand({
                  TableName: tableName,
                  Key: { id: item.id },
                  UpdateExpression: 'SET successfulCalls = :zero, failedCalls = :zero',
                  ExpressionAttributeValues: {
                    ':zero': 0
                  },
                  ConditionExpression: 'attribute_exists(id)'
                }));
                console.log(\`Migrated key: \${item.id} (\${item.name})\`);
                migratedCount++;
              } else {
                skippedCount++;
              }
            }
            
            console.log(\`Migration complete: migrated=\${migratedCount}, skipped=\${skippedCount}\`);
            
            return {
              PhysicalResourceId: \`migration-\${tableName}-\${Date.now()}\`,
              Data: {
                MigratedCount: migratedCount,
                SkippedCount: skippedCount,
                TotalKeys: items.length
              }
            };
          } catch (error) {
            console.error('Migration failed:', error);
            throw error;
          }
        };
      `),
      timeout: cdk.Duration.minutes(5),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant permissions
    props.apiKeysTable.grantReadWriteData(migrationFunction);

    // Create custom resource
    const provider = new cr.Provider(this, 'MigrationProvider', {
      onEventHandler: migrationFunction,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    new cdk.CustomResource(this, 'MigrationResource', {
      serviceToken: provider.serviceToken,
      properties: {
        TableName: props.apiKeysTable.tableName,
        Environment: props.environment,
        Timestamp: Date.now(), // Force update on each deployment
      },
    });
  }
}