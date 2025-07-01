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
const DEBUG = process.env.DEBUG === 'true';

// PRODUCTION OPTIMIZATION: In-memory cache for API keys (TTL: 30 seconds)
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
    // Non-critical for API operation
    if (DEBUG) console.error('Kinesis send error:', error);
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
  
  // CRITICAL: Store whether this request should count toward usage
  // This context will be passed to the API Gateway integration
  let shouldCountUsage = false;
  
  try {
    // Extract API key from header
    const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'];
    
    if (!apiKey) {
      // Track failed auth attempts
      sendToKinesis({
        eventType: 'API_AUTH_FAILED',
        requestId,
        timestamp: new Date().toISOString(),
        reason: 'missing_api_key',
        methodArn: event.methodArn,
        sourceIp: event.requestContext?.identity?.sourceIp,
        userAgent: event.requestContext?.identity?.userAgent,
      });
      throw new Error('Unauthorized');
    }

    // Hash and look up API key
    const hashedKey = hashApiKey(apiKey);
    
    // Check cache first
    const cacheKey = `key:${hashedKey}`;
    const cached = apiKeyCache.get(cacheKey);
    let keyData;
    
    if (cached && cached.expires > Date.now()) {
      keyData = cached.data;
      if (DEBUG) console.log(`Cache hit for key: ${keyData.name}`);
    } else {
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
    
    if (!keyData) {
      // Track invalid key attempts
      sendToKinesis({
        eventType: 'API_AUTH_FAILED',
        requestId,
        timestamp: new Date().toISOString(),
        reason: 'invalid_api_key',
        methodArn: event.methodArn,
        sourceIp: event.requestContext?.identity?.sourceIp,
        userAgent: event.requestContext?.identity?.userAgent,
      });
      throw new Error('Unauthorized');
    }
    
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
      throw new Error('Usage limit exceeded');
    }
    
    // CRITICAL: Mark that we should count this request
    // The actual counting happens AFTER we know the response status
    shouldCountUsage = true;
    
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
        // Pass shouldCountUsage flag to integration
        shouldCountUsage: String(shouldCountUsage),
        requestId,
        // Pass current usage for response headers
        currentUsage: String(totalUserUsage),
        usageLimit: String(userUsageLimit),
        remainingCalls: String(Math.max(0, userUsageLimit - totalUserUsage)),
        usageResetDate: keyData.usageResetDate || '',
      }
    );

    return policy;

  } catch (error) {
    // Log only in debug mode
    if (DEBUG) console.error('Authorization failed:', error.message);
    
    // Final catch-all for any errors
    sendToKinesis({
      eventType: 'API_AUTH_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      error: error.message,
      methodArn: event.methodArn,
      latencyMs: Date.now() - startTime,
    });
    
    throw new Error('Unauthorized');
  }
};

// Export cache clear function for testing and manual invalidation
exports.clearCache = (keyHash) => {
  if (keyHash) {
    apiKeyCache.delete(`key:${keyHash}`);
  } else {
    apiKeyCache.clear();
  }
};

// Handler for SNS cache invalidation messages
exports.cacheInvalidationHandler = async (event) => {
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.Sns.Message);
      if (message.action === 'invalidate_key' && message.hashedKey) {
        exports.clearCache(message.hashedKey);
      }
    } catch (error) {
      if (DEBUG) console.error('Cache invalidation error:', error);
    }
  }
  return { statusCode: 200 };
};