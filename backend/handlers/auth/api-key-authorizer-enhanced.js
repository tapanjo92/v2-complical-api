const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const crypto = require('crypto');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});
const cloudwatch = new CloudWatchClient({});
const API_KEYS_TABLE = process.env.TABLE_NAME;
const API_USAGE_TABLE = process.env.API_USAGE_TABLE;
const WEBHOOK_TOPIC_ARN = process.env.WEBHOOK_TOPIC_ARN;

// Helper function to hash API key
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Helper function to generate policy
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

  // Add context for downstream use
  if (context) {
    authResponse.context = context;
  }

  return authResponse;
}

// Non-blocking usage update with retry logic
async function updateUsageCount(keyData, userKeys, totalUserUsage) {
  const now = new Date();
  const timestamp = now.toISOString();
  const dateHour = timestamp.slice(0, 13); // YYYY-MM-DDTHH
  
  try {
    // Update API key usage count with optimistic locking
    const updatePromise = dynamodb.send(new UpdateCommand({
      TableName: API_KEYS_TABLE,
      Key: { id: keyData.id },
      UpdateExpression: 'SET usageCount = usageCount + :inc, lastUsed = :timestamp',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':timestamp': timestamp,
      },
      ConditionExpression: 'attribute_exists(id)',
      ReturnValues: 'ALL_NEW',
    }));

    // Store detailed usage record
    const usageRecordPromise = dynamodb.send(new UpdateCommand({
      TableName: API_USAGE_TABLE,
      Key: {
        PK: `USER#${keyData.userEmail}`,
        SK: `USAGE#${dateHour}#${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      UpdateExpression: 'SET #data = :data, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#data': 'data',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':data': {
          apiKeyId: keyData.id,
          keyName: keyData.name,
          timestamp: timestamp,
          method: 'SYNC_TRACKED',
          userEmail: keyData.userEmail,
        },
        ':ttl': Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
      },
    }));

    // Update hourly aggregate
    const aggregatePromise = dynamodb.send(new UpdateCommand({
      TableName: API_USAGE_TABLE,
      Key: {
        PK: `USER#${keyData.userEmail}`,
        SK: `AGGREGATE#${dateHour}`,
      },
      UpdateExpression: `
        SET requests = if_not_exists(requests, :zero) + :inc,
            lastUpdated = :timestamp,
            #ttl = :ttl,
            userEmail = if_not_exists(userEmail, :email),
            dateHour = if_not_exists(dateHour, :dateHour)
            ADD apiKeys :apiKeySet
      `,
      ExpressionAttributeNames: {
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1,
        ':timestamp': timestamp,
        ':ttl': Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
        ':email': keyData.userEmail,
        ':dateHour': dateHour,
        ':apiKeySet': new Set([keyData.id]),
      },
    }));

    // Execute all updates in parallel (fire-and-forget pattern)
    Promise.all([updatePromise, usageRecordPromise, aggregatePromise])
      .then(() => {
        console.log(`Successfully updated usage for key ${keyData.id}`);
        // Send success metric
        cloudwatch.send(new PutMetricDataCommand({
          Namespace: 'CompliCal/API',
          MetricData: [{
            MetricName: 'UsageTrackingSuccess',
            Value: 1,
            Unit: 'Count',
            Dimensions: [
              { Name: 'Environment', Value: process.env.ENVIRONMENT || 'test' }
            ],
          }],
        })).catch(() => {}); // Ignore metric errors
      })
      .catch((error) => {
        console.error(`Failed to update usage for key ${keyData.id}:`, error);
        // Send failure metric
        cloudwatch.send(new PutMetricDataCommand({
          Namespace: 'CompliCal/API',
          MetricData: [{
            MetricName: 'UsageTrackingFailure',
            Value: 1,
            Unit: 'Count',
            Dimensions: [
              { Name: 'Environment', Value: process.env.ENVIRONMENT || 'test' },
              { Name: 'ErrorType', Value: error.name || 'Unknown' }
            ],
          }],
        })).catch(() => {}); // Ignore metric errors
      });

    // Don't wait for the updates to complete - return immediately
    return true;
  } catch (error) {
    // Log but don't fail the authorization
    console.error('Usage tracking error (non-blocking):', error);
    return false;
  }
}

exports.handler = async (event) => {
  console.log('Enhanced Authorizer invoked for:', event.methodArn);
  
  try {
    // Extract API key from header
    const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'];

    if (!apiKey) {
      throw new Error('Unauthorized');
    }

    // Hash the provided API key
    const hashedKey = hashApiKey(apiKey);

    // Query DynamoDB using GSI for the hashed key
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
      throw new Error('Unauthorized');
    }

    const keyData = result.Items[0];
    console.log('Found API key for user:', keyData.userEmail);
    
    // Check if rolling 30-day reset is needed
    const now = new Date();
    
    // Get ALL keys for this user to calculate total usage
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
    
    // Check if we need to reset based on rolling 30-day window
    const usageResetDate = keyData.usageResetDate ? new Date(keyData.usageResetDate) : null;
    const needsReset = !usageResetDate || now > usageResetDate;
    
    if (needsReset) {
      // Calculate new reset date (30 days from now)
      const newResetDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const newResetDateISO = newResetDate.toISOString();
      
      console.log(`Resetting usage for user ${keyData.userEmail}. New reset: ${newResetDateISO}`);
      
      // Reset all active keys for this user
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
      
      // Update the keys in memory to reflect reset
      userKeys.forEach(key => {
        key.usageCount = 0;
        key.usageResetDate = newResetDateISO;
      });
      keyData.usageCount = 0; // Reset current key too
    }
    
    // Calculate TOTAL usage across ALL user's keys
    const totalUserUsage = userKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
    const userUsageLimit = 10000; // 10k limit PER USER
    
    if (totalUserUsage >= userUsageLimit) {
      console.log(`User ${keyData.userEmail} has exceeded usage limit: ${totalUserUsage}/${userUsageLimit}`);
      throw new Error('Usage limit exceeded');
    }
    
    // Check if this request would exceed the limit
    const newTotalAfterThisRequest = totalUserUsage + 1;
    if (newTotalAfterThisRequest > userUsageLimit) {
      console.log(`This request would exceed limit: ${newTotalAfterThisRequest}/${userUsageLimit}`);
      throw new Error('Usage limit exceeded');
    }

    // CRITICAL: Update usage count synchronously but non-blocking
    // This ensures every authorized request is counted
    updateUsageCount(keyData, userKeys, totalUserUsage);

    console.log(`Authorizing key ${keyData.id} for user ${keyData.userEmail}. Usage: ${totalUserUsage + 1}/${userUsageLimit}`);

    // Generate wildcard resource for the policy
    const arnParts = event.methodArn.split('/');
    const stage = arnParts[1];
    const wildcardResource = `${arnParts[0]}/${stage}/*/*`;
    
    // Calculate remaining calls and other metrics
    const remainingCalls = Math.max(0, userUsageLimit - newTotalAfterThisRequest);
    const resetDate = keyData.usageResetDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Check if we need to trigger webhook notifications
    const usagePercentage = Math.round((newTotalAfterThisRequest / userUsageLimit) * 100);
    const thresholds = [50, 80, 90, 95, 100];
    
    for (const threshold of thresholds) {
      if (usagePercentage >= threshold && totalUserUsage < (userUsageLimit * threshold / 100)) {
        // We just crossed this threshold, trigger webhook
        console.log(`User ${keyData.userEmail} crossed ${threshold}% usage threshold`);
        
        // Send SNS notification asynchronously (fire and forget)
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
                remainingCalls: remainingCalls,
                resetDate: resetDate,
              },
            }),
            MessageAttributes: {
              eventType: {
                DataType: 'String',
                StringValue: `usage.threshold.${threshold}`,
              },
            },
          })).catch(err => {
            console.error('Failed to send webhook notification:', err);
          });
        }
        
        break; // Only trigger the first threshold we cross
      }
    }
    
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
        remainingCalls: String(remainingCalls),
        usageResetDate: resetDate,
      }
    );

    return policy;

  } catch (error) {
    // Any error results in unauthorized
    console.error('Authorization failed:', error.message);
    throw new Error('Unauthorized');
  }
};