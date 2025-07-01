# Analysis of Log Processing Issues

## Root Cause Analysis

Based on the investigation, here are the potential issues causing only 6 out of 560+ API calls to be recorded:

### 1. **Log Format Parsing Issues**

The API Gateway is configured to log in a specific JSON format:
```json
{
  "requestId": "$context.requestId",
  "requestTime": "$context.requestTime",
  "httpMethod": "$context.httpMethod",
  "path": "$context.path",
  "status": "$context.status",
  "responseLength": "$context.responseLength",
  "error": "$context.error.message",
  "identity": {
    "sourceIp": "$context.identity.sourceIp",
    "userAgent": "$context.identity.userAgent"
  },
  "authorizer": {
    "apiKeyId": "$context.authorizer.apiKeyId",
    "userEmail": "$context.authorizer.userEmail",
    "keyName": "$context.authorizer.keyName",
    "principalId": "$context.authorizer.principalId"
  }
}
```

### 2. **Potential Issues Identified**

1. **Missing Authorizer Context**: 
   - The Lambda expects `logEntry.authorizer.apiKeyId` to be present
   - If requests are made without proper authentication or if the authorizer doesn't populate all fields, the log processing will skip those entries (line 78-80 in process-usage-logs.js)

2. **CloudWatch Logs Filter Pattern**:
   - The subscription filter uses `[...]` which matches all log entries
   - However, if logs are not in the expected JSON format, parsing will fail

3. **Error Handling**:
   - Errors in processing individual log events are caught and logged but don't stop processing (line 221-224)
   - This could hide systematic issues

4. **Conditional Update Failure**:
   - The Lambda uses a conditional update that requires the API key to exist (line 115)
   - If keys are deleted between API call and log processing, updates fail silently

### 3. **Most Likely Root Cause**

The most likely issue is that **most API calls are not including the authorizer context** in the logs. This could happen if:

1. **Health check endpoints** or other public endpoints are being called frequently
2. **Failed authorization attempts** don't populate the authorizer context
3. **API Gateway is not properly passing authorizer context** to the access logs

### 4. **Recommended Actions**

1. **Check CloudWatch Logs** for the process-usage-logs Lambda to see:
   ```bash
   aws logs tail /aws/lambda/CompliCal-API-test-ProcessUsageLogsFunction-* --follow
   ```

2. **Verify API Gateway Access Logs** format:
   ```bash
   aws logs tail /aws/apigateway/complical-test --follow
   ```

3. **Add Debug Logging** to process-usage-logs.js:
   - Log the raw message before parsing
   - Log when apiKeyId is missing
   - Log the count of processed vs skipped events

4. **Test with Known API Key**:
   - Make a few test calls with a known API key
   - Check if those specific calls appear in the usage logs

5. **Review Authorizer Implementation**:
   - Ensure the API key authorizer is returning all required context fields
   - Check if the context is properly passed to API Gateway logs

### 5. **Quick Fix Suggestions**

1. **Add Better Logging**:
   ```javascript
   // At the beginning of the handler
   console.log(`Processing ${logData.logEvents.length} log events from ${logData.logGroup}`);
   
   // Track statistics
   let processed = 0;
   let skipped = 0;
   let errors = 0;
   
   // In the loop
   if (!apiKeyId) {
     skipped++;
     console.log('Skipping log entry - no API key found:', {
       hasAuthorizer: !!logEntry.authorizer,
       hasApiKeyId: !!logEntry.apiKeyId,
       path: logEntry.path,
       status: logEntry.status
     });
     continue;
   }
   
   // At the end
   console.log(`Processing complete: ${processed} processed, ${skipped} skipped, ${errors} errors`);
   ```

2. **Check for Different Log Formats**:
   - API Gateway might be logging in different formats for different types of requests
   - Add handling for both `logEntry.apiKeyId` and `logEntry.authorizer.apiKeyId`

3. **Verify Subscription Filter**:
   - Ensure the CloudWatch Logs subscription is active and receiving all logs
   - Check if there are any filters accidentally excluding certain log entries