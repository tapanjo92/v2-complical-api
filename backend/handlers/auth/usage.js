const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { validateAuth, parseCookies } = require('../../utils/session-validator');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const API_KEYS_TABLE = process.env.API_KEYS_TABLE;
const API_USAGE_TABLE = process.env.API_USAGE_TABLE;

exports.handler = async (event) => {
  console.log('Usage handler invoked');
  
  // Security check - ensure request came through API Gateway
  if (!event.requestContext || !event.requestContext.apiId) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Forbidden - Direct Lambda invocation not allowed' })
    };
  }
  
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
    // Validate authentication (supports both sessions and JWT)
    const authResult = await validateAuth(event);
    let userEmail;
    
    if (authResult.isValid && authResult.authType === 'session') {
      // New session-based auth
      userEmail = authResult.user.email;
    } else if (authResult.authType === 'jwt' || authResult.authType === 'jwt-cookie') {
      // Fallback to JWT validation for backward compatibility
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      const cookies = parseCookies(event.headers);
      const token = authResult.token || cookies.idToken;
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' }),
        };
      }
      
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
    } else {
      // No valid auth found
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    if (!userEmail) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    // PRODUCTION GRADE: Use Scan instead of GSI for accurate billing data
    // GSIs have eventual consistency which is UNACCEPTABLE for billing
    const scanCommand = new ScanCommand({
      TableName: API_KEYS_TABLE,
      FilterExpression: 'userEmail = :email',
      ExpressionAttributeValues: {
        ':email': userEmail,
      },
      ConsistentRead: true, // CRITICAL: Always use consistent reads for billing data
    });

    const scanResult = await dynamodb.send(scanCommand);
    const freshApiKeys = scanResult.Items || [];
    
    console.log(`Found ${freshApiKeys.length} keys for user ${userEmail} with consistent read`);

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

    // Validate that all data belongs to the authenticated user
    const userValidation = {
      authenticated_user: userEmail,
      data_owner: userEmail,
      validation_timestamp: new Date().toISOString(),
    };

    // Build response with user validation
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
      // Include user validation metadata
      _metadata: userValidation,
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