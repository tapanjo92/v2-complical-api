const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cloudwatch = new CloudWatchClient({});

const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE;
const API_USAGE_TABLE = process.env.API_USAGE_TABLE;
const ENVIRONMENT = process.env.ENVIRONMENT || 'test';

// Process batch of Kinesis records
exports.handler = async (event) => {
  console.log(`Processing ${event.Records.length} Kinesis records`);
  
  const startTime = Date.now();
  const metrics = {
    totalRecords: event.Records.length,
    successfulRecords: 0,
    failedRecords: 0,
    apiCalls: 0,
    authFailures: 0,
    rateLimits: 0,
  };

  // Group records by type for batch processing
  const recordsByType = {
    API_CALL: [],
    API_AUTH_FAILED: [],
    API_RATE_LIMITED: [],
    USAGE_THRESHOLD: [],
    API_AUTH_ERROR: [],
  };

  // Parse and categorize records
  for (const record of event.Records) {
    try {
      const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
      const data = JSON.parse(payload);
      
      if (recordsByType[data.eventType]) {
        recordsByType[data.eventType].push({
          ...data,
          kinesisMetadata: {
            sequenceNumber: record.kinesis.sequenceNumber,
            approximateArrivalTimestamp: record.kinesis.approximateArrivalTimestamp,
            partitionKey: record.kinesis.partitionKey,
          },
        });
      }
      
      metrics.successfulRecords++;
    } catch (error) {
      console.error('Failed to parse record:', error);
      metrics.failedRecords++;
    }
  }

  // Process API calls
  if (recordsByType.API_CALL.length > 0) {
    await processApiCalls(recordsByType.API_CALL, metrics);
  }

  // Process auth failures
  if (recordsByType.API_AUTH_FAILED.length > 0) {
    await processAuthFailures(recordsByType.API_AUTH_FAILED, metrics);
  }

  // Process rate limits
  if (recordsByType.API_RATE_LIMITED.length > 0) {
    await processRateLimits(recordsByType.API_RATE_LIMITED, metrics);
  }

  // Process usage thresholds
  if (recordsByType.USAGE_THRESHOLD.length > 0) {
    await processUsageThresholds(recordsByType.USAGE_THRESHOLD);
  }

  // Send metrics to CloudWatch
  await publishMetrics(metrics, Date.now() - startTime);

  console.log(`Processing completed in ${Date.now() - startTime}ms`, metrics);
  
  // Return successful processing
  return {
    batchItemFailures: [], // Empty array means all records processed successfully
  };
};

async function processApiCalls(records, metrics) {
  metrics.apiCalls = records.length;
  
  // Prepare batch writes for analytics table
  const analyticsWrites = [];
  const usageWrites = [];
  
  // Group by user and time window for aggregation
  const aggregations = {};
  
  for (const record of records) {
    const timestamp = new Date(record.timestamp);
    const dateHour = timestamp.toISOString().slice(0, 13);
    const dateMinute = timestamp.toISOString().slice(0, 16);
    
    // Store raw event in analytics table
    analyticsWrites.push({
      PutRequest: {
        Item: {
          PK: `USER#${record.userEmail}`,
          SK: `EVENT#${record.timestamp}#${record.requestId}`,
          eventType: 'API_CALL',
          timestamp: timestamp.getTime(),
          timeWindow: dateHour,
          data: record,
          ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
        },
      },
    });
    
    // Store in usage table for backward compatibility
    usageWrites.push({
      PutRequest: {
        Item: {
          PK: `USER#${record.userEmail}`,
          SK: `USAGE#${dateHour}#${record.requestId}`,
          apiKeyId: record.apiKeyId,
          keyName: record.apiKeyName,
          timestamp: record.timestamp,
          method: record.method || 'GET',
          path: record.path,
          sourceIp: record.sourceIp,
          userAgent: record.userAgent,
          latencyMs: record.latencyMs,
          ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
        },
      },
    });
    
    // Aggregate by minute
    const aggKey = `${record.userEmail}#${dateMinute}`;
    if (!aggregations[aggKey]) {
      aggregations[aggKey] = {
        userEmail: record.userEmail,
        companyName: record.companyName,
        timeWindow: dateMinute,
        apiCalls: 0,
        uniqueKeys: new Set(),
        totalLatency: 0,
        methods: {},
        paths: {},
      };
    }
    
    aggregations[aggKey].apiCalls++;
    aggregations[aggKey].uniqueKeys.add(record.apiKeyId);
    aggregations[aggKey].totalLatency += (record.latencyMs || 0);
    aggregations[aggKey].methods[record.method] = (aggregations[aggKey].methods[record.method] || 0) + 1;
    
    // Track top paths
    const path = record.path || 'unknown';
    aggregations[aggKey].paths[path] = (aggregations[aggKey].paths[path] || 0) + 1;
  }
  
  // Write aggregations
  for (const [key, agg] of Object.entries(aggregations)) {
    const [userEmail, timeWindow] = key.split('#');
    
    // Update minute-level aggregation
    await dynamodb.send(new UpdateCommand({
      TableName: ANALYTICS_TABLE,
      Key: {
        PK: `AGGREGATE#MINUTE`,
        SK: `${timeWindow}#${userEmail}`,
      },
      UpdateExpression: `
        SET #user = :user,
            #company = :company,
            #window = :window,
            #timestamp = :timestamp,
            #ttl = :ttl
        ADD apiCalls :calls,
            totalLatency :latency
      `,
      ExpressionAttributeNames: {
        '#user': 'userEmail',
        '#company': 'companyName',
        '#window': 'timeWindow',
        '#timestamp': 'lastUpdated',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':user': userEmail,
        ':company': agg.companyName || 'Unknown',
        ':window': timeWindow,
        ':timestamp': Date.now(),
        ':calls': agg.apiCalls,
        ':latency': agg.totalLatency,
        ':ttl': Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days for aggregates
      },
    }));
    
    // Update user's all-time stats
    await dynamodb.send(new UpdateCommand({
      TableName: ANALYTICS_TABLE,
      Key: {
        PK: `USER#${userEmail}`,
        SK: 'STATS#ALL_TIME',
      },
      UpdateExpression: `
        SET #user = :user,
            #company = :company,
            lastActivity = :timestamp
        ADD totalApiCalls :calls,
            totalLatency :latency
      `,
      ExpressionAttributeNames: {
        '#user': 'userEmail',
        '#company': 'companyName',
      },
      ExpressionAttributeValues: {
        ':user': userEmail,
        ':company': agg.companyName || 'Unknown',
        ':calls': agg.apiCalls,
        ':latency': agg.totalLatency,
        ':timestamp': Date.now(),
      },
    }));
  }
  
  // Batch write raw events
  if (analyticsWrites.length > 0) {
    await batchWrite(ANALYTICS_TABLE, analyticsWrites);
  }
  
  if (usageWrites.length > 0) {
    await batchWrite(API_USAGE_TABLE, usageWrites);
  }
}

async function processAuthFailures(records, metrics) {
  metrics.authFailures = records.length;
  
  // Track auth failure patterns
  const failuresByReason = {};
  const failuresByIp = {};
  
  for (const record of records) {
    failuresByReason[record.reason] = (failuresByReason[record.reason] || 0) + 1;
    failuresByIp[record.sourceIp] = (failuresByIp[record.sourceIp] || 0) + 1;
  }
  
  // Store aggregated failure data
  const timestamp = new Date().toISOString().slice(0, 16); // By minute
  
  await dynamodb.send(new UpdateCommand({
    TableName: ANALYTICS_TABLE,
    Key: {
      PK: 'SECURITY#AUTH_FAILURES',
      SK: timestamp,
    },
    UpdateExpression: `
      SET #window = :window,
          #timestamp = :timestamp,
          #ttl = :ttl,
          failureReasons = :reasons,
          topOffendingIps = :ips
      ADD totalFailures :count
    `,
    ExpressionAttributeNames: {
      '#window': 'timeWindow',
      '#timestamp': 'lastUpdated',
      '#ttl': 'ttl',
    },
    ExpressionAttributeValues: {
      ':window': timestamp,
      ':timestamp': Date.now(),
      ':count': records.length,
      ':reasons': failuresByReason,
      ':ips': Object.entries(failuresByIp)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((acc, [ip, count]) => ({ ...acc, [ip]: count }), {}),
      ':ttl': Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
    },
  }));
}

async function processRateLimits(records, metrics) {
  metrics.rateLimits = records.length;
  
  // Store rate limit events for analysis
  const writes = records.map(record => ({
    PutRequest: {
      Item: {
        PK: `USER#${record.userEmail}`,
        SK: `RATE_LIMIT#${record.timestamp}`,
        eventType: 'RATE_LIMITED',
        timestamp: new Date(record.timestamp).getTime(),
        currentUsage: record.currentUsage,
        limit: record.limit,
        apiKeyId: record.apiKeyId,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
      },
    },
  }));
  
  if (writes.length > 0) {
    await batchWrite(ANALYTICS_TABLE, writes);
  }
}

async function processUsageThresholds(records) {
  // Store threshold crossing events
  const writes = records.map(record => ({
    PutRequest: {
      Item: {
        PK: `USER#${record.userEmail}`,
        SK: `THRESHOLD#${record.timestamp}#${record.threshold}`,
        eventType: 'USAGE_THRESHOLD',
        timestamp: new Date(record.timestamp).getTime(),
        threshold: record.threshold,
        usage: record.usage,
        limit: record.limit,
        percentage: record.percentage,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
      },
    },
  }));
  
  if (writes.length > 0) {
    await batchWrite(ANALYTICS_TABLE, writes);
  }
}

async function batchWrite(tableName, items) {
  // DynamoDB batch write limit is 25 items
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }
  
  for (const chunk of chunks) {
    try {
      await dynamodb.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk,
        },
      }));
    } catch (error) {
      console.error('Batch write failed:', error);
      // Continue processing other chunks
    }
  }
}

async function publishMetrics(metrics, processingTime) {
  const metricData = [
    {
      MetricName: 'ProcessedRecords',
      Value: metrics.totalRecords,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
        { Name: 'RecordType', Value: 'All' },
      ],
    },
    {
      MetricName: 'ProcessingLatency',
      Value: processingTime,
      Unit: 'Milliseconds',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
      ],
    },
    {
      MetricName: 'APICalls',
      Value: metrics.apiCalls,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
      ],
    },
    {
      MetricName: 'AuthFailures',
      Value: metrics.authFailures,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
      ],
    },
    {
      MetricName: 'RateLimits',
      Value: metrics.rateLimits,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
      ],
    },
  ];
  
  try {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'CompliCal/Kinesis',
      MetricData: metricData,
    }));
  } catch (error) {
    console.error('Failed to publish metrics:', error);
  }
}