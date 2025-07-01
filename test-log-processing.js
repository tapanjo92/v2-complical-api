#!/usr/bin/env node

const zlib = require('zlib');

// Sample API Gateway access log entry based on the configured format
const sampleLogEntry = {
  requestId: "test-request-123",
  requestTime: "29/Jun/2025:10:15:30 +0000",
  httpMethod: "GET",
  path: "/v1/deadlines",
  status: "200",
  responseLength: "1234",
  error: null,
  identity: {
    sourceIp: "192.168.1.1",
    userAgent: "Mozilla/5.0"
  },
  authorizer: {
    apiKeyId: "test-api-key-id",
    userEmail: "test@example.com",
    keyName: "Test Key",
    principalId: "test@example.com"
  }
};

// Simulate CloudWatch Logs format
const cloudWatchLogEvent = {
  messageType: "DATA_MESSAGE",
  owner: "809555764832",
  logGroup: "/aws/apigateway/complical-test",
  logStream: "test-stream",
  subscriptionFilters: ["UsageLogSubscription"],
  logEvents: [
    {
      id: "37891234567890123456789012345678901234567890123456789012",
      timestamp: Date.now(),
      message: JSON.stringify(sampleLogEntry)
    }
  ]
};

// Compress and encode like CloudWatch Logs does
const compressed = zlib.gzipSync(JSON.stringify(cloudWatchLogEvent));
const base64Encoded = compressed.toString('base64');

// This is what the Lambda receives
const lambdaEvent = {
  awslogs: {
    data: base64Encoded
  }
};

console.log('Sample Lambda event for process-usage-logs:');
console.log(JSON.stringify(lambdaEvent, null, 2));

// Test the parsing logic
console.log('\n--- Testing parsing logic ---\n');

const { promisify } = require('util');
const gunzip = promisify(zlib.gunzip);

async function testParsing() {
  try {
    // Decode and decompress
    const payload = Buffer.from(lambdaEvent.awslogs.data, 'base64');
    const decompressed = await gunzip(payload);
    const logData = JSON.parse(decompressed.toString('utf-8'));
    
    console.log('Parsed log data:');
    console.log('Log group:', logData.logGroup);
    console.log('Number of events:', logData.logEvents.length);
    
    // Parse each log event
    for (const logEvent of logData.logEvents) {
      const logEntry = JSON.parse(logEvent.message);
      console.log('\nLog entry:');
      console.log('- Request ID:', logEntry.requestId);
      console.log('- Request Time:', logEntry.requestTime);
      console.log('- API Key ID:', logEntry.authorizer?.apiKeyId);
      console.log('- User Email:', logEntry.authorizer?.userEmail);
      console.log('- Status:', logEntry.status);
      console.log('- Path:', logEntry.path);
    }
    
    // Test date parsing
    console.log('\n--- Testing date parsing ---\n');
    const dateStr = sampleLogEntry.requestTime;
    console.log('Input date string:', dateStr);
    
    // Parse API Gateway date format
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const match = dateStr.match(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})/);
    if (match) {
      const [, day, month, year, hour, minute, second, timezone] = match;
      console.log('Parsed components:', { day, month, year, hour, minute, second, timezone });
      
      const monthNum = months[month];
      const date = new Date(Date.UTC(
        parseInt(year),
        monthNum,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      ));
      
      // Adjust for timezone
      const tzHours = parseInt(timezone.slice(0, 3));
      const tzMinutes = parseInt(timezone.slice(3));
      date.setUTCHours(date.getUTCHours() - tzHours);
      date.setUTCMinutes(date.getUTCMinutes() - tzMinutes);
      
      console.log('Parsed date:', date.toISOString());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testParsing();