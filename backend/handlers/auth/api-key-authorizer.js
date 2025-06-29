const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const crypto = require('crypto');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});
const API_KEYS_TABLE = process.env.TABLE_NAME;
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

exports.handler = async (event) => {
  console.log('Authorizer invoked for:', event.methodArn);
  console.log('Headers:', JSON.stringify(event.headers));
  
  try {
    // Extract API key from header
    const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'];

    if (!apiKey) {
      throw new Error('Unauthorized');
    }

    // Hash the provided API key
    const hashedKey = hashApiKey(apiKey);

    // Query DynamoDB using GSI for the hashed key
    // Only look for active keys (expired keys are automatically removed by TTL)
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
      Limit: 1, // We only need one match
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
      
      console.log(`Resetting usage for user ${keyData.userEmail}. Previous reset: ${keyData.usageResetDate || 'never'}, New reset: ${newResetDateISO}`);
      
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
    }
    
    // Calculate TOTAL usage across ALL user's keys
    const totalUserUsage = userKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
    const userUsageLimit = 10000; // 10k limit PER USER (not per key)
    
    if (totalUserUsage >= userUsageLimit) {
      console.log(`User ${keyData.userEmail} has exceeded usage limit: ${totalUserUsage}/${userUsageLimit}`);
      // DO NOT update usage count when limit is exceeded
      throw new Error('Usage limit exceeded');
    }
    
    const currentUsage = keyData.usageCount || 0;
    
    // Only update if we're under the limit
    const newTotalAfterThisRequest = totalUserUsage + 1;
    if (newTotalAfterThisRequest > userUsageLimit) {
      console.log(`This request would exceed limit: ${newTotalAfterThisRequest}/${userUsageLimit}`);
      throw new Error('Usage limit exceeded');
    }

    // Usage tracking is now handled asynchronously via CloudWatch Logs
    // This provides accurate per-request tracking without impacting API latency
    console.log(`Authorizing key ${keyData.id} for user ${keyData.userEmail}. Current total: ${totalUserUsage}/${userUsageLimit}`);

    // Generate and return the policy
    // Pass key metadata as context for access logging
    // Use wildcard resource to allow all methods
    const arnParts = event.methodArn.split('/');
    const stage = arnParts[1];
    const wildcardResource = `${arnParts[0]}/${stage}/*/*`;
    
    console.log('Generated wildcard resource:', wildcardResource);
    
    // Calculate new usage count (current + 1)
    const newUsageCount = currentUsage + 1;
    const remainingCalls = Math.max(0, userUsageLimit - newTotalAfterThisRequest);
    
    // Get the reset date for this user (should be same for all their keys)
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
            // Log error but don't fail the authorization
            console.error('Failed to send webhook notification:', err);
          });
        }
        
        // Only trigger the first threshold we cross
        break;
      }
    }
    
    const policy = generatePolicy(
      keyData.userEmail, // Use email as principal
      'Allow',
      wildcardResource, // Allow all methods and resources
      {
        apiKeyId: keyData.id,
        userEmail: keyData.userEmail,
        keyName: keyData.name,
        usageCount: String(newTotalAfterThisRequest), // Total USER usage after this request
        usageLimit: String(userUsageLimit),
        remainingCalls: String(remainingCalls),
        usageResetDate: resetDate,
      }
    );

    return policy;

  } catch (error) {
    // Any error results in unauthorized
    throw new Error('Unauthorized');
  }
};