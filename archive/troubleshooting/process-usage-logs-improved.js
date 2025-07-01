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
  // Track processing statistics
  const stats = {
    totalEvents: 0,
    processedEvents: 0,
    skippedNoApiKey: 0,
    skippedOther: 0,
    errors: 0,
    apiKeyNotFound: 0,
    successfulUpdates: 0
  };

  try {
    // Decode and decompress the log data
    const payload = Buffer.from(event.awslogs.data, 'base64');
    const decompressed = await gunzip(payload);
    const logData = JSON.parse(decompressed.toString('utf-8'));

    stats.totalEvents = logData.logEvents.length;
    console.log(`Processing ${stats.totalEvents} log events from ${logData.logGroup}`);

    // Process each log event
    for (const logEvent of logData.logEvents) {
      try {
        // Parse the access log entry
        let logEntry;
        try {
          logEntry = JSON.parse(logEvent.message);
        } catch (parseError) {
          console.error('Failed to parse log message:', logEvent.message);
          stats.errors++;
          continue;
        }
        
        // Debug: Log the structure for the first few events
        if (stats.totalEvents <= 3 || logData.logEvents.indexOf(logEvent) < 3) {
          console.log('Sample log entry structure:', JSON.stringify({
            hasApiKeyId: !!logEntry.apiKeyId,
            hasAuthorizer: !!logEntry.authorizer,
            authorizerKeys: logEntry.authorizer ? Object.keys(logEntry.authorizer) : [],
            requestTime: logEntry.requestTime,
            status: logEntry.status,
            path: logEntry.path,
            httpMethod: logEntry.httpMethod
          }));
        }

        // Skip non-API requests (like health checks)
        if (logEntry.path === '/health' || logEntry.path === '/favicon.ico') {
          stats.skippedOther++;
          continue;
        }

        // Handle both formats: top-level apiKeyId and authorizer.apiKeyId
        const apiKeyId = logEntry.apiKeyId || logEntry.authorizer?.apiKeyId;
        
        if (!apiKeyId) {
          stats.skippedNoApiKey++;
          // Log details about why we're skipping
          console.log('Skipping log entry - no API key found:', {
            path: logEntry.path,
            status: logEntry.status,
            hasAuthorizer: !!logEntry.authorizer,
            authorizerContent: logEntry.authorizer ? JSON.stringify(logEntry.authorizer).substring(0, 100) : 'none'
          });
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
            
            if (!keyData.Item) {
              console.warn(`API key ${apiKeyId} not found in database`);
              stats.apiKeyNotFound++;
              continue;
            }
            
            userEmail = keyData.Item.userEmail || 'unknown';
          } catch (error) {
            console.error(`Failed to fetch user email for key ${apiKeyId}:`, error.message);
            userEmail = 'unknown';
          }
        }
        
        // Parse the API Gateway date format
        const requestTimeStr = logEntry.requestTime;
        let requestDate;
        try {
          requestDate = parseApiGatewayDate(requestTimeStr);
        } catch (dateError) {
          console.error('Failed to parse date:', requestTimeStr, dateError.message);
          stats.errors++;
          continue;
        }
        
        const dateHour = requestDate.toISOString().slice(0, 13); // YYYY-MM-DDTHH
        const statusCode = parseInt(logEntry.status);

        // Update API key usage count and last used timestamp
        console.log(`Updating usage for API key ${apiKeyId}, user: ${userEmail}, path: ${logEntry.path}`);
        
        try {
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

          await dynamodb.send(updateKeyCommand);
          stats.successfulUpdates++;
          console.log(`Successfully updated usage count for API key ${apiKeyId}`);
        } catch (error) {
          if (error.name === 'ConditionalCheckFailedException') {
            console.warn(`API key ${apiKeyId} does not exist in table (might be deleted)`);
            stats.apiKeyNotFound++;
          } else {
            console.error(`Failed to update API key ${apiKeyId}:`, error.message);
            stats.errors++;
          }
          // Continue processing other events even if this one fails
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
        try {
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
        } catch (error) {
          console.error('Failed to store usage metric:', error.message);
          // Continue processing
        }

        // Update hourly aggregates
        try {
          const aggregateKey = {
            PK: `USER#${userEmail}`,
            SK: `AGGREGATE#${dateHour}`,
          };

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

          // Update API keys set separately
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
          console.error('Failed to update aggregate:', error.message);
          // Continue processing
        }

        stats.processedEvents++;

      } catch (error) {
        console.error('Failed to process log event:', error);
        console.error('Log event:', JSON.stringify(logEvent).substring(0, 500));
        stats.errors++;
      }
    }

    // Log final statistics
    console.log('Processing complete:', JSON.stringify(stats));
    console.log(`Success rate: ${((stats.processedEvents / stats.totalEvents) * 100).toFixed(2)}%`);
    
    if (stats.skippedNoApiKey > stats.processedEvents) {
      console.warn('WARNING: More events skipped than processed. Check if authorizer is properly configured.');
    }

  } catch (error) {
    console.error('Failed to process CloudWatch logs:', error);
    console.error('Event:', JSON.stringify(event).substring(0, 500));
    throw error;
  }
};