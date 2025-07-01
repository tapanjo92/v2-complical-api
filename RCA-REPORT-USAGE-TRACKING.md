# Root Cause Analysis: API Usage Tracking Issue

## Executive Summary
Only 6 out of 560+ API calls are being recorded in the usage tracking system. This document provides a comprehensive analysis of the issue and actionable recommendations.

## Issue Description
- **Expected**: All API calls made with valid API keys should be tracked
- **Actual**: Only ~1% of API calls are being recorded
- **Impact**: Users see incorrect usage counts, billing/limits are not properly enforced

## Architecture Overview
1. API Gateway logs all requests to CloudWatch Logs (`/aws/apigateway/complical-test`)
2. CloudWatch Subscription Filter triggers `process-usage-logs` Lambda
3. Lambda parses logs and updates DynamoDB tables:
   - `complical-api-keys-test`: Updates usage count per API key
   - `complical-api-usage-test`: Stores detailed usage metrics

## Root Cause Analysis

### 1. **Primary Issue: Missing API Key Context in Logs**
The `process-usage-logs.js` Lambda skips log entries without an API key ID (lines 78-80):
```javascript
const apiKeyId = logEntry.apiKeyId || logEntry.authorizer?.apiKeyId;
if (!apiKeyId) {
  continue;
}
```

**Likely Causes:**
- API Gateway is not populating the authorizer context for all requests
- Some requests bypass the authorizer (health checks, CORS preflight)
- Failed authorization attempts don't include API key context

### 2. **Log Format Mismatch**
The configured access log format expects:
```json
"authorizer": {
  "apiKeyId": "$context.authorizer.apiKeyId",
  "userEmail": "$context.authorizer.userEmail",
  "keyName": "$context.authorizer.keyName",
  "principalId": "$context.authorizer.principalId"
}
```

But if the authorizer doesn't return these values, they'll be empty in the logs.

### 3. **Silent Failures**
- The Lambda continues processing on errors, potentially hiding systematic issues
- No alerting on high skip rates
- Conditional DynamoDB updates fail silently for deleted keys

## Verification Steps

### 1. Check Recent Lambda Logs
```bash
aws logs tail /aws/lambda/CompliCal-API-test-ProcessUsageLogsFunction-* --follow
```

### 2. Verify API Gateway Access Logs
```bash
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/complical-test" \
  --start-time $(($(date +%s) - 300))000 \
  --max-items 10
```

### 3. Check Authorizer Response
Make a test API call and verify the authorizer context is populated:
```bash
curl -X GET "https://api.complical.ai/test/v1/deadlines?country=AU" \
  -H "x-api-key: YOUR_TEST_KEY" -v
```

## Recommended Solutions

### 1. **Immediate Fix: Enhanced Logging**
Deploy the improved `process-usage-logs-improved.js` which includes:
- Detailed statistics on processed vs skipped events
- Better error logging
- Sample log structure output

### 2. **Fix Authorizer Context**
Update `api-key-authorizer.js` to ensure context is always returned:
```javascript
// In generatePolicy function, ensure all fields are populated
authResponse.context = {
  apiKeyId: keyData.id || 'unknown',
  userEmail: keyData.userEmail || 'unknown',
  keyName: keyData.name || 'unknown',
  // ... other fields
};
```

### 3. **Add Monitoring**
Create CloudWatch alarms for:
- High skip rate (>50% events skipped)
- Lambda errors
- Processing latency

### 4. **Implement Fallback Logic**
For requests without API key context, try to extract from:
- Request headers
- Query parameters
- Request path

### 5. **Add Usage Tracking at Authorization Time**
Consider updating usage count directly in the authorizer (synchronous) as a backup:
```javascript
// In api-key-authorizer.js, after successful authorization
await dynamodb.send(new UpdateCommand({
  TableName: API_KEYS_TABLE,
  Key: { id: apiKeyId },
  UpdateExpression: 'SET usageCount = usageCount + :inc',
  ExpressionAttributeValues: { ':inc': 1 }
}));
```

## Action Items

1. **Deploy Enhanced Lambda** (Priority: HIGH)
   - Replace process-usage-logs.js with the improved version
   - Monitor logs for diagnostic output

2. **Verify Authorizer Output** (Priority: HIGH)
   - Test API calls and check CloudWatch logs
   - Ensure authorizer context is populated

3. **Add Monitoring** (Priority: MEDIUM)
   - Set up CloudWatch alarms
   - Create dashboard for usage tracking metrics

4. **Test End-to-End** (Priority: HIGH)
   - Make test API calls
   - Verify usage is tracked correctly
   - Check both DynamoDB tables for updates

5. **Document Expected Behavior** (Priority: LOW)
   - Update documentation with log format
   - Add troubleshooting guide

## Testing Commands

```bash
# Run diagnostic script
./diagnose-usage-tracking.sh test ap-south-1

# Monitor Lambda logs in real-time
aws logs tail /aws/lambda/CompliCal-API-test-ProcessUsageLogsFunction-* --follow

# Check specific user's usage
aws dynamodb query \
  --table-name complical-api-keys-test \
  --index-name userEmail-createdAt-index \
  --key-condition-expression "userEmail = :email" \
  --expression-attribute-values '{":email":{"S":"test@example.com"}}' \
  --region ap-south-1
```

## Expected Outcome
After implementing these fixes:
- 95%+ of API calls should be tracked
- Clear visibility into why certain calls are not tracked
- Alerts when tracking fails
- Accurate usage counts for all users