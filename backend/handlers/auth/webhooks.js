const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');
const { z } = require('zod');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const WEBHOOKS_TABLE = process.env.WEBHOOKS_TABLE;

// Webhook configuration schema
const webhookSchema = z.object({
  url: z.string().url().startsWith('https://'), // HTTPS only for security
  events: z.array(z.enum(['usage.threshold.50', 'usage.threshold.80', 'usage.threshold.90', 'usage.threshold.95', 'usage.threshold.100'])),
  active: z.boolean().optional().default(true),
  description: z.string().optional(),
});

// Get allowed origin from request
const getAllowedOrigin = (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigins = [
    'https://d1v4wmxs6wjlqf.cloudfront.net',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  return allowedOrigins[0]; // Default to CloudFront
};

const getHeaders = (event) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': getAllowedOrigin(event),
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token',
  'Access-Control-Allow-Credentials': 'true',
});

exports.handler = async (event) => {
  console.log('Webhook handler invoked:', JSON.stringify({
    path: event.path,
    method: event.httpMethod,
    pathParameters: event.pathParameters,
  }));

  // Extract user email from JWT token
  const authHeader = event.headers.Authorization || event.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: getHeaders(event),
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const token = authHeader.substring(7);
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
      headers: getHeaders(event),
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }

  const method = event.httpMethod;
  const webhookId = event.pathParameters?.webhookId;

  try {
    switch (method) {
      case 'GET':
        // List all webhooks for user
        const webhooks = await listWebhooks(userEmail);
        return {
          statusCode: 200,
          headers: getHeaders(event),
          body: JSON.stringify({ webhooks }),
        };

      case 'POST':
        // Create new webhook
        const createBody = JSON.parse(event.body || '{}');
        const validatedData = webhookSchema.parse(createBody);
        
        // Generate webhook ID and signing secret
        const newWebhookId = `whk_${crypto.randomBytes(16).toString('hex')}`;
        const signingSecret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
        
        const webhook = {
          userEmail,
          webhookId: newWebhookId,
          url: validatedData.url,
          events: validatedData.events,
          active: validatedData.active,
          description: validatedData.description || '',
          signingSecret, // Store encrypted in production
          createdAt: new Date().toISOString(),
          lastTriggered: null,
          failureCount: 0,
          status: 'active',
        };

        await dynamodb.send(new PutCommand({
          TableName: WEBHOOKS_TABLE,
          Item: webhook,
        }));

        // Return webhook without signing secret for security
        const { signingSecret: _, ...webhookResponse } = webhook;
        return {
          statusCode: 201,
          headers: getHeaders(event),
          body: JSON.stringify({
            webhook: webhookResponse,
            signingSecret, // Only returned on creation
          }),
        };

      case 'PUT':
        // Update webhook
        if (!webhookId) {
          return {
            statusCode: 400,
            headers: getHeaders(event),
            body: JSON.stringify({ error: 'Webhook ID required' }),
          };
        }

        const updateBody = JSON.parse(event.body || '{}');
        const updateData = webhookSchema.partial().parse(updateBody);
        
        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        if (updateData.url !== undefined) {
          updateExpression.push('#url = :url');
          expressionAttributeValues[':url'] = updateData.url;
          expressionAttributeNames['#url'] = 'url';
        }
        if (updateData.events !== undefined) {
          updateExpression.push('events = :events');
          expressionAttributeValues[':events'] = updateData.events;
        }
        if (updateData.active !== undefined) {
          updateExpression.push('active = :active');
          expressionAttributeValues[':active'] = updateData.active;
        }
        if (updateData.description !== undefined) {
          updateExpression.push('description = :description');
          expressionAttributeValues[':description'] = updateData.description;
        }

        updateExpression.push('updatedAt = :updatedAt');
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        await dynamodb.send(new UpdateCommand({
          TableName: WEBHOOKS_TABLE,
          Key: { userEmail, webhookId },
          UpdateExpression: `SET ${updateExpression.join(', ')}`,
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
          ConditionExpression: 'attribute_exists(webhookId)',
        }));

        return {
          statusCode: 200,
          headers: getHeaders(event),
          body: JSON.stringify({ message: 'Webhook updated' }),
        };

      case 'DELETE':
        // Delete webhook
        if (!webhookId) {
          return {
            statusCode: 400,
            headers: getHeaders(event),
            body: JSON.stringify({ error: 'Webhook ID required' }),
          };
        }

        await dynamodb.send(new DeleteCommand({
          TableName: WEBHOOKS_TABLE,
          Key: { userEmail, webhookId },
          ConditionExpression: 'attribute_exists(webhookId)',
        }));

        return {
          statusCode: 200,
          headers: getHeaders(event),
          body: JSON.stringify({ message: 'Webhook deleted' }),
        };

      default:
        return {
          statusCode: 405,
          headers: getHeaders(event),
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Webhook handler error:', error);

    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers: getHeaders(event),
        body: JSON.stringify({
          error: 'Validation error',
          details: error.errors,
        }),
      };
    }

    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: getHeaders(event),
        body: JSON.stringify({ error: 'Webhook not found' }),
      };
    }

    return {
      statusCode: 500,
      headers: getHeaders(event),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function listWebhooks(userEmail) {
  const result = await dynamodb.send(new QueryCommand({
    TableName: WEBHOOKS_TABLE,
    KeyConditionExpression: 'userEmail = :email',
    ExpressionAttributeValues: {
      ':email': userEmail,
    },
  }));

  // Remove signing secrets from response
  return (result.Items || []).map(({ signingSecret, ...webhook }) => webhook);
}