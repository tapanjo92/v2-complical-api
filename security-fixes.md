# 🔧 Security Fixes for CompliCal API

## 1. Fix Lambda Direct Invocation

Add this to EVERY Lambda handler:

```javascript
// At the start of every handler
exports.handler = async (event) => {
  // Security check - ensure request came through API Gateway
  if (!event.requestContext || !event.requestContext.apiId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden' })
    };
  }
  
  // For authenticated endpoints, check authorizer context
  if (!event.requestContext.authorizer?.userEmail) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  // ... rest of handler
};
```

## 2. Add Security Headers

In `api-stack.ts`, add default headers:

```typescript
const api = new apigateway.RestApi(this, 'Api', {
  defaultMethodOptions: {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Strict-Transport-Security': true,
        'method.response.header.X-Content-Type-Options': true,
        'method.response.header.X-Frame-Options': true,
        'method.response.header.Content-Security-Policy': true,
      },
    }],
  },
});

// Add integration response
integration.addIntegrationResponse({
  statusCode: '200',
  responseParameters: {
    'method.response.header.Strict-Transport-Security': "'max-age=31536000; includeSubDomains'",
    'method.response.header.X-Content-Type-Options': "'nosniff'",
    'method.response.header.X-Frame-Options': "'DENY'",
    'method.response.header.Content-Security-Policy': "'default-src 'self''",
  },
});
```

## 3. Fix Authorization Status Codes

In `api-key-authorizer-production.js`:

```javascript
// Change this:
throw new Error('Unauthorized');

// To this:
const error = new Error('Forbidden');
error.statusCode = 403;
throw error;
```

## 4. Immediate Actions

```bash
# 1. Run full security scan
npm audit --production

# 2. Check for exposed secrets
git secrets --scan

# 3. Enable AWS GuardDuty
aws guardduty create-detector --enable

# 4. Set up WAF rules
# (Block SQL injection, XSS, etc.)
```

## 5. Security Monitoring

Add these CloudWatch alarms:

```bash
# Failed authorization attempts
aws cloudwatch put-metric-alarm \
  --alarm-name "high-auth-failures" \
  --metric-name "API_AUTH_FAILED" \
  --namespace "CompliCal/API/Usage" \
  --threshold 100 \
  --period 300

# Direct Lambda invocations
aws cloudwatch put-metric-alarm \
  --alarm-name "direct-lambda-calls" \
  --metric-name "Invocations" \
  --namespace "AWS/Lambda" \
  --threshold 10
```