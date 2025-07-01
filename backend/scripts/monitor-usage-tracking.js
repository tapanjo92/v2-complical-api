#!/usr/bin/env node

/**
 * Monitor Usage Tracking Health
 * This script monitors the effectiveness of synchronous usage tracking
 * and compares it with the async log processing to identify discrepancies
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cloudwatch = new CloudWatchClient({});

const API_KEYS_TABLE = process.env.API_KEYS_TABLE || 'complical-api-keys-test';
const API_USAGE_TABLE = process.env.API_USAGE_TABLE || 'complical-api-usage-test';

async function getUsageStats() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  console.log('📊 Usage Tracking Health Report');
  console.log('================================');
  console.log(`Report Time: ${now.toISOString()}`);
  console.log(`Period: Last 24 hours\n`);

  // 1. Get CloudWatch metrics for tracking success/failure
  try {
    const successMetrics = await cloudwatch.send(new GetMetricStatisticsCommand({
      Namespace: 'CompliCal/API',
      MetricName: 'UsageTrackingSuccess',
      StartTime: oneDayAgo,
      EndTime: now,
      Period: 3600, // 1 hour
      Statistics: ['Sum'],
      Dimensions: [
        { Name: 'Environment', Value: process.env.ENVIRONMENT || 'test' }
      ],
    }));

    const failureMetrics = await cloudwatch.send(new GetMetricStatisticsCommand({
      Namespace: 'CompliCal/API',
      MetricName: 'UsageTrackingFailure',
      StartTime: oneDayAgo,
      EndTime: now,
      Period: 3600,
      Statistics: ['Sum'],
      Dimensions: [
        { Name: 'Environment', Value: process.env.ENVIRONMENT || 'test' }
      ],
    }));

    const successCount = successMetrics.Datapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    const failureCount = failureMetrics.Datapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    const totalAttempts = successCount + failureCount;
    const successRate = totalAttempts > 0 ? ((successCount / totalAttempts) * 100).toFixed(2) : 0;

    console.log('🎯 Synchronous Tracking Metrics (Last 24h)');
    console.log(`   ✅ Successful Updates: ${successCount}`);
    console.log(`   ❌ Failed Updates: ${failureCount}`);
    console.log(`   📈 Success Rate: ${successRate}%`);
    console.log(`   📊 Total Attempts: ${totalAttempts}\n`);

    // Show hourly breakdown if there are datapoints
    if (successMetrics.Datapoints.length > 0) {
      console.log('⏰ Hourly Breakdown:');
      const combined = {};
      
      successMetrics.Datapoints.forEach(dp => {
        const hour = dp.Timestamp.toISOString().slice(0, 13);
        combined[hour] = { success: dp.Sum || 0, failure: 0 };
      });
      
      failureMetrics.Datapoints.forEach(dp => {
        const hour = dp.Timestamp.toISOString().slice(0, 13);
        if (!combined[hour]) combined[hour] = { success: 0, failure: 0 };
        combined[hour].failure = dp.Sum || 0;
      });
      
      Object.entries(combined).sort().slice(-5).forEach(([hour, data]) => {
        const total = data.success + data.failure;
        const rate = total > 0 ? ((data.success / total) * 100).toFixed(1) : 0;
        console.log(`   ${hour}: ${data.success}/${total} (${rate}% success)`);
      });
      console.log();
    }
  } catch (error) {
    console.log('⚠️  CloudWatch metrics not available yet (new deployment?)');
    console.log(`   Error: ${error.message}\n`);
  }

  // 2. Sample API keys and check their usage counts
  try {
    console.log('🔑 API Key Usage Analysis');
    
    const scanResult = await dynamodb.send(new ScanCommand({
      TableName: API_KEYS_TABLE,
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' },
      Limit: 10,
    }));

    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log(`   Analyzing ${scanResult.Items.length} active API keys:\n`);
      
      for (const key of scanResult.Items) {
        const lastUsed = key.lastUsed ? new Date(key.lastUsed) : null;
        const isRecent = lastUsed && (now - lastUsed) < 24 * 60 * 60 * 1000;
        
        console.log(`   📌 ${key.name} (${key.keyPrefix}...)`);
        console.log(`      User: ${key.userEmail}`);
        console.log(`      Usage Count: ${key.usageCount || 0}`);
        console.log(`      Last Used: ${lastUsed ? lastUsed.toISOString() : 'Never'} ${isRecent ? '✨' : ''}`);
        console.log(`      Reset Date: ${key.usageResetDate || 'Not set'}`);
        
        // Check for recent usage records in usage table
        if (key.userEmail) {
          const dateHour = now.toISOString().slice(0, 13);
          const usageQuery = await dynamodb.send(new QueryCommand({
            TableName: API_USAGE_TABLE,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: {
              ':pk': `USER#${key.userEmail}`,
              ':prefix': `USAGE#${dateHour}`,
            },
            Limit: 5,
          }));
          
          if (usageQuery.Items && usageQuery.Items.length > 0) {
            console.log(`      Recent Activity: ${usageQuery.Items.length} requests this hour`);
          }
        }
        console.log();
      }
    } else {
      console.log('   No active API keys found\n');
    }
  } catch (error) {
    console.log(`❌ Error analyzing API keys: ${error.message}\n`);
  }

  // 3. Check for discrepancies
  console.log('🔍 Discrepancy Analysis');
  console.log('   Checking for common issues:\n');
  
  // Check if any users have suspiciously low usage counts
  try {
    const lowUsageKeys = await dynamodb.send(new ScanCommand({
      TableName: API_KEYS_TABLE,
      FilterExpression: '#status = :active AND usageCount < :threshold AND attribute_exists(lastUsed)',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { 
        ':active': 'active',
        ':threshold': 10
      },
      ProjectionExpression: 'id, name, userEmail, usageCount, lastUsed',
    }));
    
    if (lowUsageKeys.Items && lowUsageKeys.Items.length > 0) {
      console.log(`   ⚠️  Found ${lowUsageKeys.Items.length} keys with suspiciously low usage (<10) despite being used`);
      lowUsageKeys.Items.forEach(key => {
        console.log(`      - ${key.name}: ${key.usageCount || 0} calls (last used: ${key.lastUsed})`);
      });
    } else {
      console.log('   ✅ No keys with suspiciously low usage counts');
    }
  } catch (error) {
    console.log(`   ❌ Error checking for discrepancies: ${error.message}`);
  }

  console.log('\n================================');
  console.log('📝 Recommendations:\n');
  console.log('1. If success rate is below 95%, check Lambda logs for errors');
  console.log('2. If usage counts seem low, verify the enhanced authorizer is deployed');
  console.log('3. Monitor CloudWatch metrics dashboard for real-time tracking');
  console.log('4. Consider setting up alarms for high failure rates\n');
}

// Run the monitor
getUsageStats().catch(console.error);