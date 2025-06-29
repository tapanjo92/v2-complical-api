const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');
const https = require('https');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const WEBHOOKS_TABLE = process.env.WEBHOOKS_TABLE;

// Helper to make HTTPS request with timeout
function httpsRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 5000); // 5 second timeout

    const req = https.request(url, options, (res) => {
      clearTimeout(timeout);
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Calculate HMAC signature for webhook security
function calculateSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return {
    timestamp,
    signature: `v1=${signature}`,
  };
}

exports.handler = async (event) => {
  console.log('Webhook processor invoked:', JSON.stringify(event));

  // Event comes from SNS
  const snsMessage = JSON.parse(event.Records[0].Sns.Message);
  const { userEmail, eventType, data } = snsMessage;

  try {
    // Get all active webhooks for this user that subscribe to this event
    const webhooksResult = await dynamodb.send(new QueryCommand({
      TableName: WEBHOOKS_TABLE,
      KeyConditionExpression: 'userEmail = :email',
      FilterExpression: 'active = :active AND contains(events, :event)',
      ExpressionAttributeValues: {
        ':email': userEmail,
        ':active': true,
        ':event': eventType,
      },
    }));

    const webhooks = webhooksResult.Items || [];
    console.log(`Found ${webhooks.length} webhooks to trigger for ${eventType}`);

    // Process each webhook
    const results = await Promise.allSettled(
      webhooks.map(webhook => sendWebhook(webhook, eventType, data))
    );

    // Update webhook delivery status
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const webhook = webhooks[i];
      
      if (result.status === 'fulfilled' && result.value.success) {
        // Success - update last triggered
        await dynamodb.send(new UpdateCommand({
          TableName: WEBHOOKS_TABLE,
          Key: { userEmail: webhook.userEmail, webhookId: webhook.webhookId },
          UpdateExpression: 'SET lastTriggered = :now, failureCount = :zero, #status = :active',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':now': new Date().toISOString(),
            ':zero': 0,
            ':active': 'active',
          },
        }));
      } else {
        // Failure - increment failure count
        const failureCount = (webhook.failureCount || 0) + 1;
        const status = failureCount >= 5 ? 'suspended' : 'active'; // Suspend after 5 failures
        
        await dynamodb.send(new UpdateCommand({
          TableName: WEBHOOKS_TABLE,
          Key: { userEmail: webhook.userEmail, webhookId: webhook.webhookId },
          UpdateExpression: 'SET failureCount = :count, #status = :status, lastError = :error',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':count': failureCount,
            ':status': status,
            ':error': result.reason?.message || 'Unknown error',
          },
        }));
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Webhooks processed',
        results: results.map((r, i) => ({
          webhookId: webhooks[i].webhookId,
          success: r.status === 'fulfilled' && r.value.success,
          error: r.reason?.message,
        })),
      }),
    };
  } catch (error) {
    console.error('Webhook processor error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process webhooks' }),
    };
  }
};

async function sendWebhook(webhook, eventType, data) {
  const payload = JSON.stringify({
    id: `evt_${crypto.randomBytes(16).toString('hex')}`,
    type: eventType,
    created: Math.floor(Date.now() / 1000),
    data: {
      ...data,
      user_email: webhook.userEmail,
    },
  });

  const { timestamp, signature } = calculateSignature(payload, webhook.signingSecret);
  const url = new URL(webhook.url);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'CompliCal-Signature': signature,
      'CompliCal-Timestamp': timestamp,
      'User-Agent': 'CompliCal-Webhook/1.0',
    },
  };

  try {
    const response = await httpsRequest(url, options, payload);
    
    // Success if 2xx status code
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log(`Webhook sent successfully to ${webhook.url}`);
      return { success: true };
    } else {
      throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
    }
  } catch (error) {
    console.error(`Failed to send webhook to ${webhook.url}:`, error.message);
    throw error;
  }
}