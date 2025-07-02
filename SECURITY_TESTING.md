# 🛡️ CompliCal API Security Testing Checklist

## 1. **Authentication & Authorization** 🔐

### API Key Security
- [ ] Brute force protection (rate limiting on failed attempts)
- [ ] Key rotation enforcement
- [ ] Deleted keys immediately stop working (cache invalidation)
- [ ] Keys can't be enumerated or predicted
- [ ] SHA-256 hashing in database

### Test Commands:
```bash
# Test deleted key still works (cache issue)
API_KEY="your-key"
curl -H "x-api-key: $API_KEY" $API_URL/v1/deadlines
# Delete key via API
# Immediately retry - should fail

# Test key prediction
# Keys should be cryptographically random
```

## 2. **Injection Attacks** 💉

### SQL/NoSQL Injection
- [ ] DynamoDB query parameterization
- [ ] Input validation on all parameters
- [ ] No string concatenation in queries

### Test Payloads:
```bash
# SQL Injection attempts
?country=' OR '1'='1
?country=AU' UNION SELECT * FROM users--
?year=2025; DROP TABLE deadlines;--

# NoSQL Injection
?country[$ne]=null
?country[$gt]=
?filter[status][$regex]=.*

# Command Injection
?country=AU;cat /etc/passwd
?country=AU$(whoami)
?country=AU`id`
```

## 3. **Business Logic Vulnerabilities** 💰

### Usage Metering Bypass
- [ ] Can't manipulate usage counts
- [ ] Can't make free API calls
- [ ] Race conditions in counting
- [ ] Negative number attacks

### Tests:
```bash
# Parallel requests to test race conditions
for i in {1..100}; do
  curl -H "x-api-key: $KEY" $API/v1/deadlines &
done

# Check if count = 100 or less (race condition)
```

## 4. **Rate Limiting & DoS** 🚦

### Protection Layers:
- [ ] API Gateway throttling (10 req/s)
- [ ] Lambda concurrent execution limits
- [ ] DynamoDB auto-scaling
- [ ] CloudFront DDoS protection

### Load Tests:
```bash
# Install artillery
npm install -g artillery

# Create load test
cat > load-test.yml << EOF
config:
  target: "https://api.complical.com"
  phases:
    - duration: 60
      arrivalRate: 100
scenarios:
  - name: "API Load Test"
    flow:
      - get:
          url: "/v1/deadlines"
          headers:
            x-api-key: "{{ \$randomString() }}"
EOF

artillery run load-test.yml
```

## 5. **Data Security** 🔒

### Sensitive Data Exposure
- [ ] No PII in logs
- [ ] No API keys in CloudWatch
- [ ] Error messages sanitized
- [ ] No stack traces in production

### Test:
```bash
# Check CloudWatch logs for sensitive data
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-function \
  --filter-pattern "api-key OR password OR email"
```

## 6. **CORS & CSRF** 🌐

### Cross-Origin Attacks
- [ ] CORS restricted to known domains
- [ ] No wildcard origins
- [ ] Credentials not allowed with wildcard
- [ ] CSRF tokens for state-changing operations

### Test:
```javascript
// Run from browser console on different domain
fetch('https://api.complical.com/v1/deadlines', {
  headers: {'x-api-key': 'stolen-key'},
  credentials: 'include'
}).then(r => console.log('CORS bypass:', r.status))
```

## 7. **Infrastructure Security** 🏗️

### AWS Configuration
- [ ] Lambda functions in VPC
- [ ] Secrets in SSM/Secrets Manager
- [ ] IAM least privilege
- [ ] CloudTrail enabled
- [ ] S3 buckets private

### Audit Commands:
```bash
# Check IAM permissions
aws iam get-role-policy --role-name YourLambdaRole

# Check S3 bucket policies
aws s3api get-bucket-acl --bucket your-bucket

# Check exposed endpoints
nmap -p 443 api.complical.com
```

## 8. **Cryptography** 🔐

### Encryption Standards
- [ ] TLS 1.2+ only
- [ ] Strong cipher suites
- [ ] Certificate pinning (mobile)
- [ ] Secure random for API keys

### Test:
```bash
# SSL/TLS scan
nmap --script ssl-enum-ciphers -p 443 api.complical.com

# Or use online tool
# https://www.ssllabs.com/ssltest/
```

## 9. **Session Management** 🍪

### Cookie Security
- [ ] httpOnly flag
- [ ] Secure flag
- [ ] SameSite attribute
- [ ] Session timeout
- [ ] Secure session storage

## 10. **Monitoring & Incident Response** 📊

### Detection Capabilities
- [ ] Failed auth attempts alerting
- [ ] Usage anomaly detection
- [ ] Error rate monitoring
- [ ] Latency alerting
- [ ] Security event logging

### CloudWatch Alarms:
```bash
# High error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "high-api-errors" \
  --alarm-description "Alert on high API error rate" \
  --metric-name 4XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

## 🎯 Priority Vulnerabilities to Test

1. **Deleted API keys still working** (cache invalidation)
2. **Usage count manipulation** (billing bypass)
3. **Rate limit bypass** (DoS potential)
4. **Injection in query parameters**
5. **Sensitive data in logs**

## 🛠️ Security Testing Tools

```bash
# API Security
- OWASP ZAP
- Burp Suite
- Postman with security tests

# Infrastructure
- AWS Config Rules
- AWS Security Hub
- CloudTrail analysis

# Code Analysis
- ESLint security plugin
- npm audit
- Snyk
```

## 📝 Security Test Report Template

```markdown
## Test: [Name]
- **Risk**: High/Medium/Low
- **Status**: ✅ PASS / ❌ FAIL
- **Details**: [What was tested]
- **Evidence**: [Screenshots/logs]
- **Remediation**: [If failed]
```