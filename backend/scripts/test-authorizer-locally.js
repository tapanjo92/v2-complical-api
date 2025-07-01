#!/usr/bin/env node

/**
 * Local test script for the enhanced authorizer
 * This helps verify the authorizer works correctly before deployment
 */

// Set up environment variables
process.env.TABLE_NAME = process.env.API_KEYS_TABLE || 'complical-api-keys-test';
process.env.API_USAGE_TABLE = process.env.API_USAGE_TABLE || 'complical-api-usage-test';
process.env.ENVIRONMENT = process.env.ENVIRONMENT || 'test';

const { handler } = require('../handlers/auth/api-key-authorizer-enhanced');

async function testAuthorizer() {
  console.log('🧪 Testing Enhanced API Key Authorizer Locally\n');
  
  // Test 1: Missing API key
  console.log('Test 1: Missing API key');
  try {
    await handler({
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:test/test/GET/deadlines',
      headers: {}
    });
    console.log('❌ FAIL: Should have thrown Unauthorized');
  } catch (error) {
    if (error.message === 'Unauthorized') {
      console.log('✅ PASS: Correctly rejected missing API key\n');
    } else {
      console.log(`❌ FAIL: Unexpected error: ${error.message}\n`);
    }
  }

  // Test 2: Invalid API key
  console.log('Test 2: Invalid API key');
  try {
    await handler({
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:test/test/GET/deadlines',
      headers: {
        'x-api-key': 'invalid-key-12345'
      }
    });
    console.log('❌ FAIL: Should have thrown Unauthorized');
  } catch (error) {
    if (error.message === 'Unauthorized') {
      console.log('✅ PASS: Correctly rejected invalid API key\n');
    } else {
      console.log(`❌ FAIL: Unexpected error: ${error.message}\n`);
    }
  }

  // Test 3: Valid API key (requires real key in database)
  const testApiKey = process.env.TEST_API_KEY;
  if (testApiKey) {
    console.log('Test 3: Valid API key');
    try {
      const result = await handler({
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:test/test/GET/deadlines',
        headers: {
          'x-api-key': testApiKey
        }
      });
      
      console.log('✅ PASS: Authorization successful');
      console.log('   Principal:', result.principalId);
      console.log('   Usage Count:', result.context.usageCount);
      console.log('   Remaining Calls:', result.context.remainingCalls);
      console.log('   Reset Date:', result.context.usageResetDate);
      console.log();
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  } else {
    console.log('Test 3: Skipped (set TEST_API_KEY environment variable to test with real key)\n');
  }

  // Test 4: Check non-blocking behavior
  console.log('Test 4: Non-blocking usage tracking');
  console.log('   This test verifies that authorization completes quickly');
  console.log('   even if usage tracking has delays\n');
  
  if (testApiKey) {
    const startTime = Date.now();
    try {
      await handler({
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:test/test/GET/deadlines',
        headers: {
          'x-api-key': testApiKey
        }
      });
      const duration = Date.now() - startTime;
      
      if (duration < 100) {
        console.log(`✅ PASS: Authorization completed in ${duration}ms (non-blocking)\n`);
      } else {
        console.log(`⚠️  WARNING: Authorization took ${duration}ms (might be blocking)\n`);
      }
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  console.log('📊 Test Summary');
  console.log('================');
  console.log('The enhanced authorizer is designed to:');
  console.log('1. Track every authorized API call synchronously');
  console.log('2. Not block or slow down API responses');
  console.log('3. Provide accurate usage counts immediately');
  console.log('4. Fall back gracefully if tracking fails\n');
  
  console.log('Next Steps:');
  console.log('1. Deploy using CDK: npm run deploy');
  console.log('2. Monitor with: node scripts/monitor-usage-tracking.js');
  console.log('3. Check CloudWatch metrics for UsageTrackingSuccess/Failure\n');
}

// Run tests
testAuthorizer().catch(console.error);