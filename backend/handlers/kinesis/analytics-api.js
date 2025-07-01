const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE;

// Analytics API endpoints
exports.handler = async (event) => {
  console.log('Analytics API invoked:', event.path);
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'max-age=60',
  };
  
  try {
    const path = event.path;
    const queryParams = event.queryStringParameters || {};
    
    let response;
    
    // Route to appropriate handler
    if (path.includes('/realtime')) {
      response = await getRealtimeStats();
    } else if (path.includes('/timeseries')) {
      response = await getTimeSeries(queryParams);
    } else if (path.includes('/user-stats')) {
      response = await getUserStats(queryParams.email);
    } else if (path.includes('/company-stats')) {
      response = await getCompanyStats(queryParams.company);
    } else if (path.includes('/security')) {
      response = await getSecurityStats(queryParams);
    } else {
      response = await getDashboardSummary();
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Analytics API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

async function getRealtimeStats() {
  // Get current real-time statistics
  const result = await dynamodb.send(new GetCommand({
    TableName: ANALYTICS_TABLE,
    Key: {
      PK: 'REALTIME',
      SK: 'CURRENT_STATS',
    },
  }));
  
  const stats = result.Item || {};
  
  // Get last 60 minutes of data
  const now = new Date();
  const timeSeriesData = [];
  
  for (let i = 0; i < 60; i++) {
    const time = new Date(now.getTime() - i * 60000);
    const timeWindow = time.toISOString().slice(0, 16);
    
    const minuteData = await dynamodb.send(new GetCommand({
      TableName: ANALYTICS_TABLE,
      Key: {
        PK: 'REALTIME',
        SK: `MINUTE#${timeWindow}`,
      },
    }));
    
    if (minuteData.Item) {
      timeSeriesData.push({
        time: timeWindow,
        apiCalls: minuteData.Item.apiCalls || 0,
        uniqueUsers: minuteData.Item.uniqueUsers || 0,
        avgLatency: minuteData.Item.avgLatency || 0,
      });
    }
  }
  
  return {
    current: {
      lastMinuteApiCalls: stats.lastMinuteApiCalls || 0,
      lastMinuteUniqueUsers: stats.lastMinuteUniqueUsers || 0,
      lastMinuteAvgLatency: stats.lastMinuteAvgLatency || 0,
      topUsers: stats.topUsers || {},
      topCompanies: stats.topCompanies || {},
      lastUpdated: stats.lastUpdated,
    },
    timeSeries: timeSeriesData.reverse(),
  };
}

async function getTimeSeries(params) {
  const { granularity = 'hour', duration = '24h' } = params;
  
  let pk, hoursToFetch;
  
  switch (granularity) {
    case 'minute':
      pk = 'AGGREGATE#MINUTE';
      hoursToFetch = duration === '1h' ? 1 : 24;
      break;
    case 'hour':
      pk = 'AGGREGATE#HOUR';
      hoursToFetch = duration === '24h' ? 24 : 168; // 7 days
      break;
    case 'day':
      pk = 'AGGREGATE#DAY';
      hoursToFetch = 720; // 30 days
      break;
    default:
      pk = 'AGGREGATE#HOUR';
      hoursToFetch = 24;
  }
  
  const now = new Date();
  const startTime = new Date(now.getTime() - hoursToFetch * 60 * 60 * 1000);
  
  const result = await dynamodb.send(new QueryCommand({
    TableName: ANALYTICS_TABLE,
    KeyConditionExpression: 'PK = :pk AND SK >= :start',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':start': startTime.toISOString().slice(0, granularity === 'day' ? 10 : granularity === 'hour' ? 13 : 16),
    },
    ScanIndexForward: true,
  }));
  
  const timeSeries = (result.Items || []).map(item => ({
    time: item.timeWindow,
    apiCalls: item.totalApiCalls || 0,
    avgLatency: item.minutesProcessed > 0 ? Math.round(item.totalLatency / item.totalApiCalls) : 0,
    minutesProcessed: item.minutesProcessed,
  }));
  
  return {
    granularity,
    duration,
    dataPoints: timeSeries.length,
    timeSeries,
  };
}

async function getUserStats(email) {
  if (!email) {
    throw new Error('Email parameter is required');
  }
  
  // Get user's all-time stats
  const allTimeStats = await dynamodb.send(new GetCommand({
    TableName: ANALYTICS_TABLE,
    Key: {
      PK: `USER#${email}`,
      SK: 'STATS#ALL_TIME',
    },
  }));
  
  // Get recent events
  const recentEvents = await dynamodb.send(new QueryCommand({
    TableName: ANALYTICS_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `USER#${email}`,
      ':prefix': 'EVENT#',
    },
    ScanIndexForward: false,
    Limit: 100,
  }));
  
  // Get rate limit events
  const rateLimits = await dynamodb.send(new QueryCommand({
    TableName: ANALYTICS_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `USER#${email}`,
      ':prefix': 'RATE_LIMIT#',
    },
    ScanIndexForward: false,
    Limit: 10,
  }));
  
  return {
    email,
    allTimeStats: allTimeStats.Item || {
      totalApiCalls: 0,
      totalLatency: 0,
      lastActivity: null,
    },
    recentActivity: {
      events: recentEvents.Items?.length || 0,
      rateLimits: rateLimits.Items?.length || 0,
    },
    avgLatency: allTimeStats.Item?.totalApiCalls > 0 
      ? Math.round(allTimeStats.Item.totalLatency / allTimeStats.Item.totalApiCalls)
      : 0,
  };
}

async function getCompanyStats(company) {
  if (!company) {
    return { error: 'Company parameter is required' };
  }
  
  // Query by company would require a GSI or scan
  // For now, return aggregate data from real-time stats
  const realtimeStats = await dynamodb.send(new GetCommand({
    TableName: ANALYTICS_TABLE,
    Key: {
      PK: 'REALTIME',
      SK: 'CURRENT_STATS',
    },
  }));
  
  const companyUsage = realtimeStats.Item?.topCompanies?.[company] || 0;
  
  return {
    company,
    lastMinuteApiCalls: companyUsage,
    message: 'Full company analytics require additional indexing',
  };
}

async function getSecurityStats(params) {
  const { timeRange = '1h' } = params;
  
  const now = new Date();
  const startTime = timeRange === '1h' 
    ? new Date(now.getTime() - 60 * 60 * 1000)
    : new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Get auth failures
  const authFailures = await dynamodb.send(new QueryCommand({
    TableName: ANALYTICS_TABLE,
    KeyConditionExpression: 'PK = :pk AND SK >= :start',
    ExpressionAttributeValues: {
      ':pk': 'SECURITY#AUTH_FAILURES',
      ':start': startTime.toISOString().slice(0, 16),
    },
  }));
  
  let totalFailures = 0;
  const failureReasons = {};
  const offendingIps = {};
  
  for (const item of authFailures.Items || []) {
    totalFailures += item.totalFailures || 0;
    
    // Aggregate failure reasons
    for (const [reason, count] of Object.entries(item.failureReasons || {})) {
      failureReasons[reason] = (failureReasons[reason] || 0) + count;
    }
    
    // Aggregate offending IPs
    for (const [ip, count] of Object.entries(item.topOffendingIps || {})) {
      offendingIps[ip] = (offendingIps[ip] || 0) + count;
    }
  }
  
  return {
    timeRange,
    authFailures: {
      total: totalFailures,
      reasons: failureReasons,
      topOffendingIps: Object.entries(offendingIps)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((acc, [ip, count]) => ({ ...acc, [ip]: count }), {}),
    },
  };
}

async function getDashboardSummary() {
  // Get multiple data points in parallel
  const [realtimeStats, hourlyStats, dailyStats, securityStats] = await Promise.all([
    dynamodb.send(new GetCommand({
      TableName: ANALYTICS_TABLE,
      Key: { PK: 'REALTIME', SK: 'CURRENT_STATS' },
    })),
    dynamodb.send(new GetCommand({
      TableName: ANALYTICS_TABLE,
      Key: { PK: 'AGGREGATE#HOUR', SK: new Date().toISOString().slice(0, 13) },
    })),
    dynamodb.send(new GetCommand({
      TableName: ANALYTICS_TABLE,
      Key: { PK: 'AGGREGATE#DAY', SK: new Date().toISOString().slice(0, 10) },
    })),
    getSecurityStats({ timeRange: '24h' }),
  ]);
  
  return {
    realtime: {
      lastMinute: {
        apiCalls: realtimeStats.Item?.lastMinuteApiCalls || 0,
        uniqueUsers: realtimeStats.Item?.lastMinuteUniqueUsers || 0,
        avgLatency: realtimeStats.Item?.lastMinuteAvgLatency || 0,
      },
      topUsers: realtimeStats.Item?.topUsers || {},
      topCompanies: realtimeStats.Item?.topCompanies || {},
    },
    hourly: {
      apiCalls: hourlyStats.Item?.totalApiCalls || 0,
      avgLatency: hourlyStats.Item?.totalApiCalls > 0
        ? Math.round(hourlyStats.Item.totalLatency / hourlyStats.Item.totalApiCalls)
        : 0,
    },
    daily: {
      apiCalls: dailyStats.Item?.totalApiCalls || 0,
      avgLatency: dailyStats.Item?.totalApiCalls > 0
        ? Math.round(dailyStats.Item.totalLatency / dailyStats.Item.totalApiCalls)
        : 0,
    },
    security: securityStats,
    lastUpdated: realtimeStats.Item?.lastUpdated || Date.now(),
  };
}