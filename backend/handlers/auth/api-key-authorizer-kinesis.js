const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
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

// PRODUCTION OPTIMIZATION: In-memory cache for API keys (TTL: 30 seconds)
// This reduces DynamoDB reads while maintaining fresh data
const apiKeyCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Clean up expired cache entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of apiKeyCache.entries()) {
    if (value.expires < now) {
      apiKeyCache.delete(key);
    }
  }
}, 60000);

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
    if (!KINESIS_STREAM) return true;
    
    const record = {
      StreamName: KINESIS_STREAM,
      Data: Buffer.from(JSON.stringify(eventData)),
      PartitionKey: eventData.userEmail || 'unknown',
    };

    await kinesis.send(new PutRecordCommand(record));
    return true;
  } catch (error) {
    // Don't throw - this is non-critical for API operation
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
  
  // Only log in development/debug mode
  const DEBUG = process.env.DEBUG === 'true' || ENVIRONMENT === 'dev';
  if (DEBUG) {
    console.log(`Kinesis Authorizer invoked: ${requestId}, AWS RequestId: ${event.requestContext?.requestId}`);
  }
  
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
    
    // Check cache first
    const cacheKey = `key:${hashedKey}`;
    const cached = apiKeyCache.get(cacheKey);
    let keyData;
    
    if (cached && cached.expires > Date.now()) {
      if (DEBUG) console.log(`Cache hit for key hash: ${hashedKey.substring(0, 8)}...`);
      keyData = cached.data;
    } else {
      if (DEBUG) console.log(`Cache miss for key hash: ${hashedKey.substring(0, 8)}..., querying DynamoDB`);
      
      // PRODUCTION STRATEGY: Try GSI first for performance, fallback to scan
      try {
        // First attempt: Use GSI for speed (most cases will work)
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
        
        const queryResult = await dynamodb.send(queryCommand);
        
        if (queryResult.Items && queryResult.Items.length > 0) {
          keyData = queryResult.Items[0];
          // Cache the result
          apiKeyCache.set(cacheKey, {
            data: keyData,
            expires: Date.now() + CACHE_TTL
          });
        } else {
          // Fallback: Use scan with consistent read if GSI returns nothing
          if (DEBUG) console.log('GSI returned no results, falling back to consistent scan');
          const scanCommand = new ScanCommand({
            TableName: API_KEYS_TABLE,
            FilterExpression: 'hashedKey = :hash AND #status = :active',
            ExpressionAttributeNames: {
              '#status': 'status',
            },
            ExpressionAttributeValues: {
              ':hash': hashedKey,
              ':active': 'active',
            },
            ConsistentRead: true,
          });
          
          const scanResult = await dynamodb.send(scanCommand);
          if (scanResult.Items && scanResult.Items.length > 0) {
            keyData = scanResult.Items[0];
            // Cache the result
            apiKeyCache.set(cacheKey, {
              data: keyData,
              expires: Date.now() + CACHE_TTL
            });
          } else {
            keyData = null;
          }
        }
      } catch (error) {
        if (DEBUG) console.error('Failed to query API key:', error);
        keyData = null;
      }
    }
    
    const result = { Items: keyData ? [keyData] : [] };

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

    keyData = result.Items[0];
    if (DEBUG) console.log(`Found API key: id=${keyData.id}, name=${keyData.name}, user=${keyData.userEmail}, currentCount=${keyData.usageCount}`);
    
    // PRODUCTION GRADE: Get all user's keys with consistent read for accurate billing
    const userKeysScan = new ScanCommand({
      TableName: API_KEYS_TABLE,
      FilterExpression: 'userEmail = :email AND #status = :active',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':email': keyData.userEmail,
        ':active': 'active',
      },
      ConsistentRead: true, // CRITICAL for billing accuracy
    });
    
    const userKeysResult = await dynamodb.send(userKeysScan);
    const userKeys = userKeysResult.Items || [];
    
    // Check rolling window reset
    const now = new Date();
    const usageResetDate = keyData.usageResetDate ? new Date(keyData.usageResetDate) : null;
    const needsReset = !usageResetDate || now > usageResetDate;
    
    if (needsReset) {
      const newResetDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const newResetDateISO = newResetDate.toISOString();
      
      if (DEBUG) console.log(`Resetting usage for user ${keyData.userEmail}`);
      
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
      if (DEBUG) console.log(`User ${keyData.userEmail} exceeded limit: ${totalUserUsage}/${userUsageLimit}`);
      throw new Error('Usage limit exceeded');
    }
    
    const newTotalAfterThisRequest = totalUserUsage + 1;
    
    // Send successful auth event to Kinesis
    if (KINESIS_STREAM) {
      if (DEBUG) console.log(`Sending to Kinesis stream: ${KINESIS_STREAM}`);
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
    
    // Update usage count in DynamoDB - MUST be synchronous for accurate counting
    if (DEBUG) console.log(`BEFORE UPDATE: Updating key id=${keyData.id}, name=${keyData.name}, currentCount=${keyData.usageCount}, requestId=${requestId}, awsRequestId=${event.requestContext?.requestId}`);
    try {
      const updateResult = await dynamodb.send(new UpdateCommand({
        TableName: API_KEYS_TABLE,
        Key: { id: keyData.id },
        UpdateExpression: 'SET usageCount = usageCount + :inc, lastUsed = :timestamp, lastRequestId = :requestId',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':timestamp': now.toISOString(),
          ':requestId': event.requestContext?.requestId || requestId,
        },
        ConditionExpression: 'attribute_exists(id)',
        ReturnValues: 'ALL_NEW',
      }));
      
      // CRITICAL: Update cache with fresh data
      const updatedKeyData = updateResult.Attributes;
      apiKeyCache.set(cacheKey, {
        data: updatedKeyData,
        expires: Date.now() + CACHE_TTL
      });
      
      if (DEBUG) console.log(`AFTER UPDATE: key=${keyData.name}, oldCount=${keyData.usageCount}, newCount=${updateResult.Attributes.usageCount}, increment=${updateResult.Attributes.usageCount - (keyData.usageCount || 0)}`);
    } catch (err) {
      console.error('CRITICAL: Failed to update usage count:', err);
      // This is critical - usage tracking must work
      throw new Error('Failed to track API usage');
    }
    
    // Check for threshold alerts
    const usagePercentage = Math.round((newTotalAfterThisRequest / userUsageLimit) * 100);
    const thresholds = [50, 80, 90, 95, 100];
    
    for (const threshold of thresholds) {
      if (usagePercentage >= threshold && totalUserUsage < (userUsageLimit * threshold / 100)) {
        if (DEBUG) console.log(`User ${keyData.userEmail} crossed ${threshold}% threshold`);
        
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
            // Silent fail - webhooks are non-critical
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

    if (DEBUG) console.log(`Authorization completed in ${Date.now() - startTime}ms`);
    return policy;

  } catch (error) {
    if (DEBUG) console.error('Authorization failed:', error.message);
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