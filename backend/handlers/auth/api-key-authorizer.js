const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const API_KEYS_TABLE = process.env.TABLE_NAME;

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
    
    // Calculate TOTAL usage across ALL user's keys
    const totalUserUsage = userKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
    const userUsageLimit = 10000; // 10k limit PER USER (not per key)
    
    if (totalUserUsage >= userUsageLimit) {
      console.log(`User ${keyData.userEmail} has exceeded usage limit: ${totalUserUsage}/${userUsageLimit}`);
      throw new Error('Usage limit exceeded');
    }
    
    const currentUsage = keyData.usageCount || 0;

    // Update usage count and last used timestamp asynchronously
    // We don't await this to avoid adding latency to the authorization
    console.log(`Updating usage count for key ${keyData.id}. User total: ${totalUserUsage}/${userUsageLimit}`);
    const updatePromise = dynamodb.send(new UpdateCommand({
      TableName: API_KEYS_TABLE,
      Key: { id: keyData.id },
      UpdateExpression: 'SET lastUsed = :timestamp, usageCount = if_not_exists(usageCount, :zero) + :inc',
      ExpressionAttributeValues: {
        ':timestamp': new Date().toISOString(),
        ':inc': 1,
        ':zero': 0,
      },
    })).then(() => {
      console.log(`Successfully updated usage count for key ${keyData.id}`);
    }).catch(error => {
      console.error('Failed to update usage count:', error);
    });

    // Generate and return the policy
    // Pass key metadata as context for access logging
    // Use wildcard resource to allow all methods
    const arnParts = event.methodArn.split('/');
    const stage = arnParts[1];
    const wildcardResource = `${arnParts[0]}/${stage}/*/*`;
    
    console.log('Generated wildcard resource:', wildcardResource);
    
    // Calculate new usage count (current + 1)
    const newUsageCount = currentUsage + 1;
    const newTotalUserUsage = totalUserUsage + 1;
    const remainingCalls = Math.max(0, userUsageLimit - newTotalUserUsage);
    
    const policy = generatePolicy(
      keyData.userEmail, // Use email as principal
      'Allow',
      wildcardResource, // Allow all methods and resources
      {
        apiKeyId: keyData.id,
        userEmail: keyData.userEmail,
        keyName: keyData.name,
        usageCount: String(newTotalUserUsage), // Total USER usage, not just key
        usageLimit: String(userUsageLimit),
        remainingCalls: String(remainingCalls),
      }
    );

    return policy;

  } catch (error) {
    // Any error results in unauthorized
    throw new Error('Unauthorized');
  }
};