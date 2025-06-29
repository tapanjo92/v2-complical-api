const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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

    // Get all user's API keys
    const keysQuery = new QueryCommand({
      TableName: API_KEYS_TABLE,
      IndexName: 'userEmail-createdAt-index',
      KeyConditionExpression: 'userEmail = :email',
      ExpressionAttributeValues: {
        ':email': userEmail,
      },
    });

    const keysResult = await dynamodb.send(keysQuery);
    const apiKeys = keysResult.Items || [];

    // Calculate current period (monthly)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Aggregate usage across all keys
    const totalUsage = apiKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
    const activeKeys = apiKeys.filter(key => key.status === 'active').length;
    
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
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        usage: totalUsage,
        limit: 10000, // Free tier limit
        percentage: Math.round((totalUsage / 10000) * 100),
      },
      api_keys: {
        active: activeKeys,
        total: apiKeys.length,
      },
      usage_by_key: apiKeys.map(key => ({
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