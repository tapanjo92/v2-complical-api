const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const API_KEYS_TABLE = process.env.API_KEYS_TABLE;
const API_USAGE_TABLE = process.env.API_USAGE_TABLE;

exports.handler = async (event) => {
  console.log('Usage handler invoked');
  
  // Get the origin from the request
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'https://d1v4wmxs6wjlqf.cloudfront.net'];
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'max-age=60', // Cache for 1 minute
  };

  try {
    // Extract user email from JWT
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const token = authHeader.substring(7);
    
    // Parse JWT token safely
    let userEmail;
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      userEmail = payload.email;
    } catch (error) {
      console.error('Failed to parse JWT token:', error);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' }),
      };
    }

    if (!userEmail) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    // Get all user's API keys with strongly consistent read
    const keysQuery = new QueryCommand({
      TableName: API_KEYS_TABLE,
      IndexName: 'userEmail-createdAt-index',
      KeyConditionExpression: 'userEmail = :email',
      ExpressionAttributeValues: {
        ':email': userEmail,
      },
      ConsistentRead: false, // GSI doesn't support consistent reads, but we'll handle it differently
    });

    const keysResult = await dynamodb.send(keysQuery);
    const apiKeys = keysResult.Items || [];

    // For accurate counts, fetch each key with GetItem (strongly consistent)
    const keyDetailsPromises = apiKeys.map(key => 
      dynamodb.send(new GetCommand({
        TableName: API_KEYS_TABLE,
        Key: { id: key.id },
        ConsistentRead: true,
      }))
    );
    
    const keyDetailsResults = await Promise.all(keyDetailsPromises);
    const freshApiKeys = keyDetailsResults
      .map(result => result.Item)
      .filter(item => item !== undefined);

    // Calculate current period (rolling 30-day window)
    const now = new Date();
    
    // Get the reset date from any key (they should all have the same reset date)
    const resetDate = freshApiKeys[0]?.usageResetDate ? new Date(freshApiKeys[0].usageResetDate) : null;
    const daysUntilReset = resetDate ? Math.ceil((resetDate - now) / (1000 * 60 * 60 * 24)) : 30;

    // Aggregate usage across all keys using fresh data
    const totalUsage = freshApiKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
    const activeKeys = freshApiKeys.filter(key => key.status === 'active').length;
    
    // Get recent usage details (last 10 requests)
    const recentUsage = [];
    if (API_USAGE_TABLE && userEmail) {
      try {
        const usageQuery = new QueryCommand({
          TableName: API_USAGE_TABLE,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `USER#${userEmail}`,
          },
          ScanIndexForward: false, // Most recent first
          Limit: 10,
        });
        
        const usageResult = await dynamodb.send(usageQuery);
        recentUsage.push(...(usageResult.Items || []));
      } catch (error) {
        console.error('Failed to get recent usage:', error);
      }
    }

    // Build response
    const response = {
      current_period: {
        usage: totalUsage,
        limit: 10000, // Free tier limit
        percentage: Math.round((totalUsage / 10000) * 100),
        remaining: Math.max(0, 10000 - totalUsage),
        reset_date: resetDate ? resetDate.toISOString() : null,
        days_until_reset: daysUntilReset,
        window_type: 'rolling_30_days',
      },
      api_keys: {
        active: activeKeys,
        total: freshApiKeys.length,
      },
      usage_by_key: freshApiKeys.map(key => ({
        id: key.id,
        name: key.name,
        usage: key.usageCount || 0,
        last_used: key.lastUsed,
        status: key.status,
      })),
      recent_requests: recentUsage.slice(0, 10).map(req => ({
        timestamp: req.timestamp,
        method: req.method,
        path: req.path,
        status: req.statusCode,
        key_used: req.keyName,
      })),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Usage handler error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to retrieve usage data',
      }),
    };
  }
};