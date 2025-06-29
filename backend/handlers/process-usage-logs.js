const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const zlib = require('zlib');
const { promisify } = require('util');

const gunzip = promisify(zlib.gunzip);

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
const API_KEYS_TABLE = process.env.API_KEYS_TABLE;
const API_USAGE_TABLE = process.env.API_USAGE_TABLE;

// Parse API Gateway date format: "27/Jun/2025:09:12:41 +0000"
function parseApiGatewayDate(dateStr) {
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const match = dateStr.match(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
  const [, day, month, year, hour, minute, second, timezone] = match;
  const monthNum = months[month];
  
  // Create date in UTC
  const date = new Date(Date.UTC(
    parseInt(year),
    monthNum,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  ));
  
  // Adjust for timezone offset
  const tzHours = parseInt(timezone.slice(0, 3));
  const tzMinutes = parseInt(timezone.slice(3));
  date.setUTCHours(date.getUTCHours() - tzHours);
  date.setUTCMinutes(date.getUTCMinutes() - tzMinutes);
  
  return date;
}

exports.handler = async (event) => {
  try {
    // Decode and decompress the log data
    const payload = Buffer.from(event.awslogs.data, 'base64');
    const decompressed = await gunzip(payload);
    const logData = JSON.parse(decompressed.toString('utf-8'));

    console.log(`Processing ${logData.logEvents.length} log events`);

    // Process each log event
    for (const logEvent of logData.logEvents) {
      try {
        // Parse the access log entry
        const logEntry = JSON.parse(logEvent.message);
        
        // Debug: Log the structure for the first event
        if (logData.logEvents.indexOf(logEvent) === 0) {
          console.log('Sample log entry structure:', JSON.stringify({
            apiKeyId: logEntry.apiKeyId,
            authorizer: logEntry.authorizer,
            requestTime: logEntry.requestTime,
            status: logEntry.status
          }));
        }

        // Skip if no API key was used
        // Handle both formats: top-level apiKeyId and authorizer.apiKeyId
        const apiKeyId = logEntry.apiKeyId || logEntry.authorizer?.apiKeyId;
        if (!apiKeyId) {
          continue;
        }

        // Get user email from authorizer context or look it up from the API key
        let userEmail = logEntry.authorizer?.userEmail || logEntry.userEmail;
        
        // If no user email in logs, fetch from API key record
        if (!userEmail) {
          try {
            const keyData = await dynamodb.send(new GetCommand({
              TableName: API_KEYS_TABLE,
              Key: { id: apiKeyId }
            }));
            userEmail = keyData.Item?.userEmail || 'unknown';
          } catch (error) {
            console.error(`Failed to fetch user email for key ${apiKeyId}:`, error);
            userEmail = 'unknown';
          }
        }
        
        // Parse the API Gateway date format: "27/Jun/2025:09:12:41 +0000"
        const requestTimeStr = logEntry.requestTime;
        const requestDate = parseApiGatewayDate(requestTimeStr);
        const dateHour = requestDate.toISOString().slice(0, 13); // YYYY-MM-DDTHH
        const statusCode = parseInt(logEntry.status);

        // Update API key usage count and last used timestamp
        console.log(`Updating usage for API key ${apiKeyId}, user: ${userEmail}`);
        const updateKeyCommand = new UpdateCommand({
          TableName: API_KEYS_TABLE,
          Key: { id: apiKeyId },
          UpdateExpression: 'SET lastUsed = :timestamp, usageCount = usageCount + :inc',
          ExpressionAttributeValues: {
            ':timestamp': requestDate.toISOString(),
            ':inc': 1,
          },
          ConditionExpression: 'attribute_exists(id)',
        });

        try {
          const result = await dynamodb.send(updateKeyCommand);
          console.log(`Successfully updated usage count for API key ${apiKeyId}`);
        } catch (error) {
          // Key might not exist anymore (deleted/expired)
          if (error.name !== 'ConditionalCheckFailedException') {
            console.error(`Failed to update API key ${apiKeyId}:`, error);
          } else {
            console.warn(`API key ${apiKeyId} does not exist in table`);
          }
        }

        // Store detailed usage metrics in separate table
        const usageMetric = {
          PK: `USER#${userEmail}`,
          SK: `USAGE#${dateHour}#${logEntry.requestId}`,
          apiKeyId,
          keyName: logEntry.authorizer?.keyName || 'unknown',
          timestamp: requestDate.toISOString(),
          method: logEntry.httpMethod,
          path: logEntry.resourcePath || logEntry.path,
          statusCode,
          responseLength: parseInt(logEntry.responseLength) || 0,
          sourceIp: logEntry.ip || logEntry.identity?.sourceIp,
          userAgent: logEntry.userAgent || logEntry.identity?.userAgent,
          error: statusCode >= 400 ? logEntry.error : undefined,
          // TTL for 90 days
          ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
        };

        // Store usage metric
        await dynamodb.send(new UpdateCommand({
          TableName: API_USAGE_TABLE,
          Key: {
            PK: usageMetric.PK,
            SK: usageMetric.SK,
          },
          UpdateExpression: 'SET #data = :data, #ttl = :ttl',
          ExpressionAttributeNames: {
            '#data': 'data',
            '#ttl': 'ttl',
          },
          ExpressionAttributeValues: {
            ':data': usageMetric,
            ':ttl': usageMetric.ttl,
          },
        }));

        // Update hourly aggregates
        const aggregateKey = {
          PK: `USER#${userEmail}`,
          SK: `AGGREGATE#${dateHour}`,
        };

        // First, try to update the aggregate. If it doesn't exist, we'll create it.
        try {
          const aggregateUpdate = new UpdateCommand({
            TableName: API_USAGE_TABLE,
            Key: aggregateKey,
            UpdateExpression: `
              SET requests = if_not_exists(requests, :zero) + :inc,
                  successfulRequests = if_not_exists(successfulRequests, :zero) + :success,
                  failedRequests = if_not_exists(failedRequests, :zero) + :failure,
                  totalResponseBytes = if_not_exists(totalResponseBytes, :zero) + :bytes,
                  lastUpdated = :timestamp,
                  #ttl = :ttl,
                  userEmail = if_not_exists(userEmail, :email),
                  dateHour = if_not_exists(dateHour, :dateHour)
            `,
            ExpressionAttributeNames: {
              '#ttl': 'ttl',
            },
            ExpressionAttributeValues: {
              ':zero': 0,
              ':inc': 1,
              ':success': statusCode < 400 ? 1 : 0,
              ':failure': statusCode >= 400 ? 1 : 0,
              ':bytes': parseInt(logEntry.responseLength) || 0,
              ':timestamp': requestDate.toISOString(),
              ':ttl': Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
              ':email': userEmail,
              ':dateHour': dateHour,
            },
          });

          await dynamodb.send(aggregateUpdate);

          // Update API keys set separately to avoid marshalling issues
          const addApiKeyUpdate = new UpdateCommand({
            TableName: API_USAGE_TABLE,
            Key: aggregateKey,
            UpdateExpression: 'ADD apiKeys :apiKey',
            ExpressionAttributeValues: {
              ':apiKey': new Set([apiKeyId]),
            },
          });

          await dynamodb.send(addApiKeyUpdate);
        } catch (error) {
          console.error('Failed to update aggregate:', error);
          // Continue processing even if aggregate update fails
        }

      } catch (error) {
        console.error('Failed to process log event:', error);
        console.error('Log event:', logEvent);
      }
    }

    console.log('Successfully processed all log events');
    // CloudWatchLogsHandler expects void return

  } catch (error) {
    console.error('Failed to process CloudWatch logs:', error);
    throw error;
  }
};