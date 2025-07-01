const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cloudwatch = new CloudWatchClient({});

const API_KEYS_TABLE = process.env.API_KEYS_TABLE;

/**
 * Production-grade usage processor that handles CloudWatch Logs from API Gateway
 * This is the pattern used by Stripe, Twilio, and other major SaaS providers
 * 
 * Benefits:
 * - Processes usage in batches (more efficient)
 * - Handles failures gracefully
 * - Provides detailed metrics
 * - Much cheaper than Lambda@Edge
 */
exports.handler = async (event) => {
  const startTime = Date.now();
  const usageCounts = new Map();
  const failedCounts = new Map();
  const metrics = {
    totalLogs: 0,
    successfulAPICalls: 0,
    failedAPICalls: 0,
    processed: 0,
    errors: 0,
  };

  try {
    // Decode and process CloudWatch Logs
    const payload = Buffer.from(event.awslogs.data, 'base64');
    const gunzipped = require('zlib').gunzipSync(payload);
    const logData = JSON.parse(gunzipped.toString('utf8'));
    
    metrics.totalLogs = logData.logEvents.length;

    // Process each log event
    for (const logEvent of logData.logEvents) {
      try {
        const log = JSON.parse(logEvent.message);
        
        // Skip if no authorizer context
        if (!log.authorizer?.apiKeyId || !log.authorizer?.shouldCountUsage) {
          continue;
        }

        const apiKeyId = log.authorizer.apiKeyId;
        const status = parseInt(log.status);
        
        // Count based on status code
        if (status >= 200 && status < 300) {
          // Successful request - count toward usage
          usageCounts.set(apiKeyId, {
            count: (usageCounts.get(apiKeyId)?.count || 0) + 1,
            userEmail: log.authorizer.userEmail,
            lastRequest: log.timestamp,
          });
          metrics.successfulAPICalls++;
        } else if (status >= 400) {
          // Failed request - track separately
          failedCounts.set(apiKeyId, {
            count: (failedCounts.get(apiKeyId)?.count || 0) + 1,
            userEmail: log.authorizer.userEmail,
            lastStatus: status,
          });
          metrics.failedAPICalls++;
        }
        
        metrics.processed++;
      } catch (err) {
        metrics.errors++;
        console.error('Failed to process log event:', err);
      }
    }

    // Batch update successful usage counts
    const updatePromises = [];
    for (const [apiKeyId, data] of usageCounts) {
      updatePromises.push(
        dynamodb.send(new UpdateCommand({
          TableName: API_KEYS_TABLE,
          Key: { id: apiKeyId },
          UpdateExpression: `
            ADD usageCount :count, successfulCalls :count
            SET lastUsed = :timestamp,
                lastBatchUpdate = :batchTime
          `,
          ExpressionAttributeValues: {
            ':count': data.count,
            ':timestamp': data.lastRequest,
            ':batchTime': new Date().toISOString(),
            ':active': 'active',
          },
          ConditionExpression: 'attribute_exists(id) AND #status = :active',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
        })).catch(err => {
          console.error(`Failed to update usage for ${apiKeyId}:`, err);
          metrics.errors++;
        })
      );
    }

    // Update failed request metrics (don't count toward usage)
    for (const [apiKeyId, data] of failedCounts) {
      updatePromises.push(
        dynamodb.send(new UpdateCommand({
          TableName: API_KEYS_TABLE,
          Key: { id: apiKeyId },
          UpdateExpression: `
            ADD failedCalls :count
            SET lastFailedStatus = :status
          `,
          ExpressionAttributeValues: {
            ':count': data.count,
            ':status': data.lastStatus,
          },
          ConditionExpression: 'attribute_exists(id)',
        })).catch(err => {
          // Non-critical - just log
          console.error(`Failed to update failed calls for ${apiKeyId}:`, err);
        })
      );
    }

    // Execute all updates in parallel
    await Promise.all(updatePromises);

    // Send metrics to CloudWatch
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'CompliCal/API/Usage',
      MetricData: [
        {
          MetricName: 'ProcessedLogs',
          Value: metrics.processed,
          Unit: 'Count',
          Timestamp: new Date(),
        },
        {
          MetricName: 'SuccessfulAPICalls',
          Value: metrics.successfulAPICalls,
          Unit: 'Count',
          Timestamp: new Date(),
        },
        {
          MetricName: 'FailedAPICalls', 
          Value: metrics.failedAPICalls,
          Unit: 'Count',
          Timestamp: new Date(),
        },
        {
          MetricName: 'ProcessingLatency',
          Value: Date.now() - startTime,
          Unit: 'Milliseconds',
          Timestamp: new Date(),
        },
      ],
    })).catch(err => {
      console.error('Failed to send metrics:', err);
    });

    console.log('Usage processing complete:', {
      ...metrics,
      uniqueKeys: usageCounts.size,
      processingTime: Date.now() - startTime,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(metrics),
    };

  } catch (error) {
    console.error('Critical error in usage processor:', error);
    
    // Send error metric
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'CompliCal/API/Usage',
      MetricData: [{
        MetricName: 'ProcessingErrors',
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date(),
      }],
    })).catch(() => {});

    throw error;
  }
};

/**
 * Optional: Direct invocation for testing
 */
exports.processUsageLog = async (logEntry) => {
  const apiKeyId = logEntry.authorizer?.apiKeyId;
  const status = parseInt(logEntry.status);
  
  if (!apiKeyId || status < 200 || status >= 300) {
    return { processed: false, reason: 'Invalid log entry or non-success status' };
  }

  try {
    await dynamodb.send(new UpdateCommand({
      TableName: API_KEYS_TABLE,
      Key: { id: apiKeyId },
      UpdateExpression: 'ADD usageCount :one, successfulCalls :one SET lastUsed = :now',
      ExpressionAttributeValues: {
        ':one': 1,
        ':now': new Date().toISOString(),
      },
      ConditionExpression: 'attribute_exists(id) AND #status = :active',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ':active': 'active',
      },
    }));
    
    return { processed: true, apiKeyId };
  } catch (error) {
    return { processed: false, error: error.message };
  }
};