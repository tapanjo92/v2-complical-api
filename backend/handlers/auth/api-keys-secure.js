const { APIGatewayClient, CreateApiKeyCommand, DeleteApiKeyCommand, CreateUsagePlanKeyCommand } = require('@aws-sdk/client-api-gateway');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { z } = require('zod');
const crypto = require('crypto');
const { validateAuth, parseCookies } = require('../../utils/session-validator');

const apigateway = new APIGatewayClient({});
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ssm = new SSMClient({});

const API_KEYS_TABLE = process.env.TABLE_NAME;
const USAGE_PLAN_SSM_PARAMETER = process.env.USAGE_PLAN_ID_PARAM;

// Cache the usage plan ID
let cachedUsagePlanId = null;

// Helper function to hash API key
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Helper function to generate API key prefix for identification
function getApiKeyPrefix(apiKey) {
  // Return first 8 characters of the key for identification
  return apiKey.substring(0, 8);
}

// Helper function to get allowed origin
function getAllowedOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowedOrigins = [
    'https://complical.com',
    'https://www.complical.com',
    'https://app.complical.com',
    'https://d2xoxkdqlbm2pj.cloudfront.net',
    'https://d1v4wmxs6wjlqf.cloudfront.net', // V2 CloudFront
  ];
  
  // Allow localhost only in dev
  const environment = process.env.ENVIRONMENT || 'dev';
  if (environment === 'dev' || environment === 'test') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:3001');
  }
  
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
}

async function getUsagePlanId() {
  if (cachedUsagePlanId) {
    return cachedUsagePlanId;
  }

  try {
    const command = new GetParameterCommand({
      Name: USAGE_PLAN_SSM_PARAMETER,
    });
    const response = await ssm.send(command);
    cachedUsagePlanId = response.Parameter?.Value || null;
    return cachedUsagePlanId;
  } catch (error) {
    console.error('Failed to get usage plan ID from SSM:', error);
    return null;
  }
}

// Schema for creating API key
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  expiresIn: z.number().min(1).max(365).optional().default(90), // Days until expiration
});

exports.handler = async (event) => {
  console.log('API Keys handler invoked:', JSON.stringify({
    path: event.path,
    method: event.httpMethod,
    cookies: event.headers?.Cookie || event.headers?.cookie,
    authorizerClaims: event.requestContext?.authorizer?.claims,
  }));
  
  const allowedOrigin = getAllowedOrigin(event);
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    // Security headers
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
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
      const cookies = parseCookies(event.headers);
      const idToken = authResult.token || cookies.id_token || cookies.idToken;
      
      if (!idToken) {
        console.log('No id_token found in cookies or Authorization header');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' }),
        };
      }
      
      try {
        // Decode JWT to get user email (in production, verify the JWT signature)
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        userEmail = payload.email;
        
        if (!userEmail) {
          console.log('No email in JWT payload');
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' }),
          };
        }
      } catch (error) {
        console.error('Failed to parse JWT token:', error);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid token' }),
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

    const path = event.path;
    const method = event.httpMethod;

    // POST /v1/auth/api-keys - Create new API key
    if (method === 'POST' && path.endsWith('/api-keys')) {
      const body = JSON.parse(event.body || '{}');
      const { name, description, expiresIn } = createApiKeySchema.parse(body);

      // Check if user has reached API key limit
      const existingKeysQuery = new QueryCommand({
        TableName: API_KEYS_TABLE,
        IndexName: 'userEmail-createdAt-index',
        KeyConditionExpression: 'userEmail = :email',
        FilterExpression: '#status = :active',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':email': userEmail,
          ':active': 'active',
        },
      });

      const existingKeys = await dynamodb.send(existingKeysQuery);
      const activeKeyCount = existingKeys.Items?.length || 0;

      // Limit users to 5 active API keys
      if (activeKeyCount >= 5) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'API key limit reached',
            message: 'You can have a maximum of 5 active API keys. Please revoke an existing key first.'
          }),
        };
      }

      // Generate unique API key name
      const timestamp = Date.now();
      const apiKeyName = `${userEmail}-${name.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}`;

      // Create API key in API Gateway
      const createCommand = new CreateApiKeyCommand({
        name: apiKeyName,
        description: description || `API key for ${userEmail}`,
        enabled: true,
        tags: {
          userEmail,
          keyName: name,
        },
      });

      const apiKeyResponse = await apigateway.send(createCommand);

      if (!apiKeyResponse.id || !apiKeyResponse.value) {
        throw new Error('Failed to create API key');
      }

      // Associate with usage plan
      const usagePlanId = await getUsagePlanId();
      if (usagePlanId) {
        try {
          const associateCommand = new CreateUsagePlanKeyCommand({
            usagePlanId,
            keyId: apiKeyResponse.id,
            keyType: 'API_KEY',
          });
          await apigateway.send(associateCommand);
          console.log(`Associated API key ${apiKeyResponse.id} with usage plan ${usagePlanId}`);
        } catch (error) {
          // Log but don't fail if association fails
          console.error('Failed to associate API key with usage plan:', error);
        }
      } else {
        console.warn('No usage plan ID available, API key created without usage plan association');
      }

      // Calculate expiration date
      const createdAt = new Date();
      const expiresAt = new Date(createdAt);
      expiresAt.setDate(expiresAt.getDate() + expiresIn);

      // Calculate TTL for DynamoDB (Unix timestamp in seconds)
      const ttlTimestamp = Math.floor(expiresAt.getTime() / 1000);

      // Store API key metadata in DynamoDB with hashed key
      const hashedKey = hashApiKey(apiKeyResponse.value);
      const keyPrefix = getApiKeyPrefix(apiKeyResponse.value);
      
      const keyMetadata = {
        id: apiKeyResponse.id,
        userEmail,
        name,
        description,
        hashedKey, // Store hashed version
        keyPrefix, // Store prefix for identification
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        ttl: ttlTimestamp, // DynamoDB TTL attribute
        lastUsed: null,
        status: 'active',
        usageCount: 0,
      };

      await dynamodb.send(new PutCommand({
        TableName: API_KEYS_TABLE,
        Item: keyMetadata,
      }));

      // Log API key creation for audit
      console.log(`API key created for user ${userEmail}: ${apiKeyResponse.id} (expires: ${expiresAt.toISOString()})`);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          id: apiKeyResponse.id,
          name,
          description,
          apiKey: apiKeyResponse.value, // Only time we return the full key
          keyPrefix, // For future identification
          createdAt: keyMetadata.createdAt,
          expiresAt: keyMetadata.expiresAt,
          message: 'Store this API key securely. You will not be able to see it again.',
        }),
      };
    }

    // GET /v1/auth/api-keys - List user's API keys
    if (method === 'GET' && path.endsWith('/api-keys')) {
      const queryCommand = new QueryCommand({
        TableName: API_KEYS_TABLE,
        IndexName: 'userEmail-createdAt-index',
        KeyConditionExpression: 'userEmail = :email',
        ExpressionAttributeValues: {
          ':email': userEmail,
        },
      });

      const result = await dynamodb.send(queryCommand);

      // DynamoDB TTL will automatically remove expired keys
      // No need to check expiration manually
      const keys = (result.Items || []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        keyPrefix: item.keyPrefix, // For identification
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
        lastUsed: item.lastUsed,
        status: item.status,
        usageCount: item.usageCount || 0,
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ apiKeys: keys }),
      };
    }

    // DELETE /v1/auth/api-keys/{id} - Delete an API key
    if (method === 'DELETE' && path.includes('/api-keys/')) {
      const keyId = path.split('/').pop();
      if (!keyId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid API key ID' }),
        };
      }

      // Verify ownership by checking DynamoDB
      const getCommand = new GetCommand({
        TableName: API_KEYS_TABLE,
        Key: { id: keyId },
      });

      const keyData = await dynamodb.send(getCommand);
      
      if (!keyData.Item || keyData.Item.userEmail !== userEmail) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'API key not found' }),
        };
      }

      // Delete from API Gateway
      const deleteCommand = new DeleteApiKeyCommand({
        apiKey: keyId,
      });

      await apigateway.send(deleteCommand);

      // Mark as revoked in DynamoDB (soft delete for audit trail)
      await dynamodb.send(new PutCommand({
        TableName: API_KEYS_TABLE,
        Item: {
          ...keyData.Item,
          status: 'revoked',
          revokedAt: new Date().toISOString(),
        },
      }));

      // Log API key revocation for audit
      console.log(`API key revoked for user ${userEmail}: ${keyId}`);

      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }

    // Unknown endpoint
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };

  } catch (error) {
    console.error('API key management error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Validation error',
          details: error.errors,
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Request failed',
        message: error.message || 'An unexpected error occurred',
      }),
    };
  }
};