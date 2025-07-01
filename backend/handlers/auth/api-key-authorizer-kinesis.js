const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { KinesisClient, PutRecordCommand } = require('@aws-sdk/client-kinesis');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const crypto = require('crypto');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const kinesis = new KinesisClient({});
const sns = new SNSClient({});

const API_KEYS_TABLE = process.env.TABLE_NAME;
const KINESIS_STREAM = process.env.KINESIS_STREAM;
const WEBHOOK_TOPIC_ARN = process.env.WEBHOOK_TOPIC_ARN;
const ENVIRONMENT = process.env.ENVIRONMENT || 'test';

// Helper function to hash API key
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Generate unique request ID
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Send usage event to Kinesis (fire-and-forget)
async function sendToKinesis(eventData) {
  try {
    console.log(`Attempting to send event to Kinesis: ${eventData.eventType}`);
    const record = {
      StreamName: KINESIS_STREAM,
      Data: Buffer.from(JSON.stringify(eventData)),
      PartitionKey: eventData.userEmail, // Partition by user for ordering
      ExplicitHashKey: undefined, // Let Kinesis handle distribution
    };

    // Send to Kinesis
    try {
      await kinesis.send(new PutRecordCommand(record));
      console.log(`Successfully sent ${eventData.eventType} to Kinesis`);
    } catch (err) {
      console.error('Failed to send to Kinesis:', err);
      // Don't throw - this is non-critical for API operation
    }

    return true;
  } catch (error) {
    console.error('Kinesis send error:', error);
    return false;
  }
}

// Generate policy
function generatePolicy(principalId, effect, resource, context) {
  const authResponse = {
    principalId,
  };

  if (effect && resource) {
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    };
    authResponse.policyDocument = policyDocument;
  }

  if (context) {
    authResponse.context = context;
  }

  return authResponse;
}

exports.handler = async (event) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  console.log(`Kinesis Authorizer invoked: ${requestId}`);
  console.log(`KINESIS_STREAM env var: "${KINESIS_STREAM}"`);
  console.log(`Environment: ${ENVIRONMENT}`);
  
  try {
    // Extract API key from header
    const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'];
    
    if (!apiKey) {
      // Track failed auth attempts
      if (KINESIS_STREAM) {
        sendToKinesis({
          eventType: 'API_AUTH_FAILED',
          requestId,
          timestamp: new Date().toISOString(),
          reason: 'missing_api_key',
          methodArn: event.methodArn,
          sourceIp: event.requestContext?.identity?.sourceIp,
          userAgent: event.requestContext?.identity?.userAgent,
        });
      }
      throw new Error('Unauthorized');
    }

    // Hash and look up API key
    const hashedKey = hashApiKey(apiKey);
    
    const queryCommand = new QueryCommand({
      TableName: API_KEYS_TABLE,
      IndexName: 'hashedKey-index',
      KeyConditionExpression: 'hashedKey = :hash',
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':hash': hashedKey,
        ':active': 'active',
      },
      Limit: 1,
    });

    const result = await dynamodb.send(queryCommand);

    if (!result.Items || result.Items.length === 0) {
      // Track invalid key attempts
      if (KINESIS_STREAM) {
        sendToKinesis({
          eventType: 'API_AUTH_FAILED',
          requestId,
          timestamp: new Date().toISOString(),
          reason: 'invalid_api_key',
          methodArn: event.methodArn,
          sourceIp: event.requestContext?.identity?.sourceIp,
          userAgent: event.requestContext?.identity?.userAgent,
        });
      }
      throw new Error('Unauthorized');
    }

    const keyData = result.Items[0];
    console.log(`Found API key for user: ${keyData.userEmail}`);
    
    // Get all user's keys for total usage calculation
    const userKeysQuery = new QueryCommand({
      TableName: API_KEYS_TABLE,
      IndexName: 'userEmail-createdAt-index',
      KeyConditionExpression: 'userEmail = :email',
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':email': keyData.userEmail,
        ':active': 'active',
      },
    });
    
    const userKeysResult = await dynamodb.send(userKeysQuery);
    const userKeys = userKeysResult.Items || [];
    
    // Check rolling window reset
    const now = new Date();
    const usageResetDate = keyData.usageResetDate ? new Date(keyData.usageResetDate) : null;
    const needsReset = !usageResetDate || now > usageResetDate;
    
    if (needsReset) {
      const newResetDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const newResetDateISO = newResetDate.toISOString();
      
      console.log(`Resetting usage for user ${keyData.userEmail}`);
      
      // Reset all user keys
      const resetPromises = userKeys.map(key => 
        dynamodb.send(new UpdateCommand({
          TableName: API_KEYS_TABLE,
          Key: { id: key.id },
          UpdateExpression: 'SET usageCount = :zero, usageResetDate = :resetDate',
          ExpressionAttributeValues: {
            ':zero': 0,
            ':resetDate': newResetDateISO,
          },
        }))
      );
      
      await Promise.all(resetPromises);
      
      // Update in-memory data
      userKeys.forEach(key => {
        key.usageCount = 0;
        key.usageResetDate = newResetDateISO;
      });
      keyData.usageCount = 0;
      keyData.usageResetDate = newResetDateISO;
    }
    
    // Calculate usage
    const totalUserUsage = userKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
    const userUsageLimit = 10000;
    
    if (totalUserUsage >= userUsageLimit) {
      // Track rate limit hits
      if (KINESIS_STREAM) {
        sendToKinesis({
          eventType: 'API_RATE_LIMITED',
          requestId,
          timestamp: new Date().toISOString(),
          userEmail: keyData.userEmail,
          apiKeyId: keyData.id,
          currentUsage: totalUserUsage,
          limit: userUsageLimit,
          methodArn: event.methodArn,
        });
      }
      console.log(`User ${keyData.userEmail} exceeded limit: ${totalUserUsage}/${userUsageLimit}`);
      throw new Error('Usage limit exceeded');
    }
    
    const newTotalAfterThisRequest = totalUserUsage + 1;
    
    // Send successful auth event to Kinesis
    if (KINESIS_STREAM) {
      console.log(`Sending to Kinesis stream: ${KINESIS_STREAM}`);
      const eventData = {
        eventType: 'API_CALL',
        requestId,
        timestamp: new Date().toISOString(),
        userEmail: keyData.userEmail,
        companyName: keyData.companyName,
        apiKeyId: keyData.id,
        apiKeyName: keyData.name,
        methodArn: event.methodArn,
        method: event.requestContext?.httpMethod,
        path: event.requestContext?.path,
        stage: event.requestContext?.stage,
        sourceIp: event.requestContext?.identity?.sourceIp,
        userAgent: event.requestContext?.identity?.userAgent,
        region: event.requestContext?.identity?.region,
        currentUsage: newTotalAfterThisRequest,
        usageLimit: userUsageLimit,
        remainingCalls: Math.max(0, userUsageLimit - newTotalAfterThisRequest),
        resetDate: keyData.usageResetDate,
        latencyMs: Date.now() - startTime,
      };
      
      await sendToKinesis(eventData);
    }
    
    // Update usage count in DynamoDB (still do this for redundancy)
    dynamodb.send(new UpdateCommand({
      TableName: API_KEYS_TABLE,
      Key: { id: keyData.id },
      UpdateExpression: 'SET usageCount = usageCount + :inc, lastUsed = :timestamp',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':timestamp': now.toISOString(),
      },
      ConditionExpression: 'attribute_exists(id)',
    })).catch(err => {
      console.error('Failed to update usage count:', err);
      // Don't fail the request
    });
    
    // Check for threshold alerts
    const usagePercentage = Math.round((newTotalAfterThisRequest / userUsageLimit) * 100);
    const thresholds = [50, 80, 90, 95, 100];
    
    for (const threshold of thresholds) {
      if (usagePercentage >= threshold && totalUserUsage < (userUsageLimit * threshold / 100)) {
        console.log(`User ${keyData.userEmail} crossed ${threshold}% threshold`);
        
        // Send to Kinesis for analytics
        if (KINESIS_STREAM) {
          sendToKinesis({
            eventType: 'USAGE_THRESHOLD',
            requestId,
            timestamp: new Date().toISOString(),
            userEmail: keyData.userEmail,
            threshold,
            usage: newTotalAfterThisRequest,
            limit: userUsageLimit,
            percentage: usagePercentage,
          });
        }
        
        // Send SNS notification
        if (WEBHOOK_TOPIC_ARN) {
          sns.send(new PublishCommand({
            TopicArn: WEBHOOK_TOPIC_ARN,
            Message: JSON.stringify({
              userEmail: keyData.userEmail,
              eventType: `usage.threshold.${threshold}`,
              data: {
                usage: newTotalAfterThisRequest,
                limit: userUsageLimit,
                percentage: usagePercentage,
                remainingCalls: Math.max(0, userUsageLimit - newTotalAfterThisRequest),
                resetDate: keyData.usageResetDate,
              },
            }),
            MessageAttributes: {
              eventType: {
                DataType: 'String',
                StringValue: `usage.threshold.${threshold}`,
              },
            },
          })).catch(err => {
            console.error('Failed to send webhook:', err);
          });
        }
        
        break;
      }
    }
    
    // Generate wildcard resource
    const arnParts = event.methodArn.split('/');
    const stage = arnParts[1];
    const wildcardResource = `${arnParts[0]}/${stage}/*/*`;
    
    const policy = generatePolicy(
      keyData.userEmail,
      'Allow',
      wildcardResource,
      {
        apiKeyId: keyData.id,
        userEmail: keyData.userEmail,
        keyName: keyData.name,
        usageCount: String(newTotalAfterThisRequest),
        usageLimit: String(userUsageLimit),
        remainingCalls: String(Math.max(0, userUsageLimit - newTotalAfterThisRequest)),
        usageResetDate: keyData.usageResetDate || '',
        requestId, // Include for tracing
      }
    );

    console.log(`Authorization completed in ${Date.now() - startTime}ms`);
    return policy;

  } catch (error) {
    console.error('Authorization failed:', error.message);
    // Final catch-all for any errors
    if (KINESIS_STREAM) {
      sendToKinesis({
        eventType: 'API_AUTH_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
        error: error.message,
        methodArn: event.methodArn,
        latencyMs: Date.now() - startTime,
      });
    }
    throw new Error('Unauthorized');
  }
};