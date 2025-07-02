const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;

// Policy helper function
function generatePolicy(principalId, effect, resource, context = {}) {
  const authResponse = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
  return authResponse;
}

// Validate JWT token (session-based)
async function validateJWT(token) {
  try {
    // Remove Bearer prefix if present
    const sessionId = token.replace('Bearer ', '').trim();
    
    if (!sessionId || sessionId.length < 32) {
      return null;
    }

    // Look up session in DynamoDB
    const response = await dynamodb.send(new GetCommand({
      TableName: SESSIONS_TABLE,
      Key: { sessionId },
    }));

    if (!response.Item) {
      return null;
    }

    const session = response.Item;

    // Check if session is expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return null;
    }

    return {
      userId: session.userId,
      email: session.email,
      sessionId,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

exports.handler = async (event) => {
  console.log('JWT Authorizer event:', JSON.stringify(event, null, 2));

  const token = event.authorizationToken;
  const methodArn = event.methodArn;

  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    // Validate JWT/Session token
    const session = await validateJWT(token);
    
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Generate policy allowing access
    const policy = generatePolicy(
      session.userId,
      'Allow',
      methodArn,
      {
        userId: session.userId,
        email: session.email,
        sessionId: session.sessionId,
      }
    );

    return policy;
  } catch (error) {
    console.error('Authorization error:', error);
    throw new Error('Unauthorized');
  }
};