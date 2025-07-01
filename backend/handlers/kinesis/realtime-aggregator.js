const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cloudwatch = new CloudWatchClient({});

const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE;
const ENVIRONMENT = process.env.ENVIRONMENT || 'test';

// Runs every minute to aggregate real-time statistics
exports.handler = async (event) => {
  console.log('Running real-time aggregation');
  
  const now = new Date();
  const currentMinute = now.toISOString().slice(0, 16);
  const previousMinute = new Date(now.getTime() - 60000).toISOString().slice(0, 16);
  const currentHour = now.toISOString().slice(0, 13);
  
  try {
    // Aggregate minute-level data
    const minuteStats = await aggregateMinuteData(previousMinute);
    
    // Update hourly aggregates
    await updateHourlyAggregates(currentHour, minuteStats);
    
    // Update real-time dashboard metrics
    await updateRealtimeMetrics(minuteStats);
    
    // Publish CloudWatch metrics for monitoring
    await publishMetrics(minuteStats);
    
    console.log('Aggregation completed successfully', minuteStats);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Aggregation completed',
        stats: minuteStats,
      }),
    };
  } catch (error) {
    console.error('Aggregation failed:', error);
    throw error;
  }
};

async function aggregateMinuteData(timeWindow) {
  // Query all minute-level aggregations for the previous minute
  const queryResult = await dynamodb.send(new QueryCommand({
    TableName: ANALYTICS_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': 'AGGREGATE#MINUTE',
      ':sk': timeWindow,
    },
  }));
  
  const stats = {
    timeWindow,
    totalApiCalls: 0,
    uniqueUsers: new Set(),
    uniqueCompanies: new Set(),
    totalLatency: 0,
    avgLatency: 0,
    topUsers: {},
    topCompanies: {},
  };
  
  // Process all user aggregates for this minute
  for (const item of queryResult.Items || []) {
    stats.totalApiCalls += item.apiCalls || 0;
    stats.totalLatency += item.totalLatency || 0;
    
    if (item.userEmail) {
      stats.uniqueUsers.add(item.userEmail);
      stats.topUsers[item.userEmail] = (stats.topUsers[item.userEmail] || 0) + (item.apiCalls || 0);
    }
    
    if (item.companyName) {
      stats.uniqueCompanies.add(item.companyName);
      stats.topCompanies[item.companyName] = (stats.topCompanies[item.companyName] || 0) + (item.apiCalls || 0);
    }
  }
  
  // Calculate averages
  if (stats.totalApiCalls > 0) {
    stats.avgLatency = Math.round(stats.totalLatency / stats.totalApiCalls);
  }
  
  // Convert sets to counts
  stats.uniqueUsersCount = stats.uniqueUsers.size;
  stats.uniqueCompaniesCount = stats.uniqueCompanies.size;
  
  // Get top 5 users and companies
  stats.topUsers = Object.entries(stats.topUsers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .reduce((acc, [user, count]) => ({ ...acc, [user]: count }), {});
    
  stats.topCompanies = Object.entries(stats.topCompanies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .reduce((acc, [company, count]) => ({ ...acc, [company]: count }), {});
  
  return stats;
}

async function updateHourlyAggregates(hourWindow, minuteStats) {
  // Update hourly aggregate
  await dynamodb.send(new UpdateCommand({
    TableName: ANALYTICS_TABLE,
    Key: {
      PK: 'AGGREGATE#HOUR',
      SK: hourWindow,
    },
    UpdateExpression: `
      SET #window = :window,
          #timestamp = :timestamp,
          #ttl = :ttl
      ADD totalApiCalls :calls,
          totalLatency :latency,
          minutesProcessed :one
    `,
    ExpressionAttributeNames: {
      '#window': 'timeWindow',
      '#timestamp': 'lastUpdated',
      '#ttl': 'ttl',
    },
    ExpressionAttributeValues: {
      ':window': hourWindow,
      ':timestamp': Date.now(),
      ':calls': minuteStats.totalApiCalls,
      ':latency': minuteStats.totalLatency,
      ':one': 1,
      ':ttl': Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    },
  }));
  
  // Update daily aggregate
  const dayWindow = hourWindow.slice(0, 10);
  await dynamodb.send(new UpdateCommand({
    TableName: ANALYTICS_TABLE,
    Key: {
      PK: 'AGGREGATE#DAY',
      SK: dayWindow,
    },
    UpdateExpression: `
      SET #window = :window,
          #timestamp = :timestamp,
          #ttl = :ttl
      ADD totalApiCalls :calls,
          totalLatency :latency
    `,
    ExpressionAttributeNames: {
      '#window': 'timeWindow',
      '#timestamp': 'lastUpdated',
      '#ttl': 'ttl',
    },
    ExpressionAttributeValues: {
      ':window': dayWindow,
      ':timestamp': Date.now(),
      ':calls': minuteStats.totalApiCalls,
      ':latency': minuteStats.totalLatency,
      ':ttl': Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
    },
  }));
}

async function updateRealtimeMetrics(stats) {
  // Store real-time metrics for dashboard
  await dynamodb.send(new UpdateCommand({
    TableName: ANALYTICS_TABLE,
    Key: {
      PK: 'REALTIME',
      SK: 'CURRENT_STATS',
    },
    UpdateExpression: `
      SET lastMinuteApiCalls = :calls,
          lastMinuteUniqueUsers = :users,
          lastMinuteAvgLatency = :latency,
          topUsers = :topUsers,
          topCompanies = :topCompanies,
          lastUpdated = :timestamp
    `,
    ExpressionAttributeValues: {
      ':calls': stats.totalApiCalls,
      ':users': stats.uniqueUsersCount,
      ':latency': stats.avgLatency,
      ':topUsers': stats.topUsers,
      ':topCompanies': stats.topCompanies,
      ':timestamp': Date.now(),
    },
  }));
  
  // Keep last 60 minutes of minute-by-minute data
  const recentWindow = new Date().toISOString().slice(0, 13); // Current hour
  await dynamodb.send(new UpdateCommand({
    TableName: ANALYTICS_TABLE,
    Key: {
      PK: 'REALTIME',
      SK: `MINUTE#${stats.timeWindow}`,
    },
    UpdateExpression: `
      SET apiCalls = :calls,
          uniqueUsers = :users,
          avgLatency = :latency,
          #window = :window,
          #ttl = :ttl
    `,
    ExpressionAttributeNames: {
      '#window': 'timeWindow',
      '#ttl': 'ttl',
    },
    ExpressionAttributeValues: {
      ':calls': stats.totalApiCalls,
      ':users': stats.uniqueUsersCount,
      ':latency': stats.avgLatency,
      ':window': stats.timeWindow,
      ':ttl': Math.floor(Date.now() / 1000) + 3600, // 1 hour TTL
    },
  }));
}

async function publishMetrics(stats) {
  // Publish custom CloudWatch metrics for dashboard
  const metrics = [
    {
      MetricName: 'TotalAPICalls',
      Value: stats.totalApiCalls,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
        { Name: 'Aggregation', Value: 'PerMinute' },
      ],
    },
    {
      MetricName: 'UniqueUsers',
      Value: stats.uniqueUsersCount,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
      ],
    },
    {
      MetricName: 'UniqueCompanies',
      Value: stats.uniqueCompaniesCount,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
      ],
    },
    {
      MetricName: 'AverageLatency',
      Value: stats.avgLatency || 0,
      Unit: 'Milliseconds',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
      ],
    },
  ];
  
  // Add per-user metrics for top users
  for (const [user, count] of Object.entries(stats.topUsers).slice(0, 3)) {
    metrics.push({
      MetricName: 'UserAPICalls',
      Value: count,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Environment', Value: ENVIRONMENT },
        { Name: 'UserEmail', Value: user },
      ],
    });
  }
  
  try {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'CompliCal/Analytics',
      MetricData: metrics,
    }));
  } catch (error) {
    console.error('Failed to publish metrics:', error);
  }
}