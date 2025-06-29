# CompliCal V2 Deployment Guide

## Prerequisites
- AWS CLI configured with appropriate credentials
- Node.js 20.x installed
- CDK CLI installed (`npm install -g aws-cdk`)

## Standard Deployment Command

```bash
cd /home/ubuntu/v2-complical-api/infrastructure
npm run cdk -- deploy --all --require-approval never
```

This single command will deploy:
1. **DynamoDB Stack** - All database tables with optimized GSIs
2. **Auth Stack** - Cognito User Pool and Client
3. **API Stack** - Lambda functions, API Gateway, and authorizers
4. **Frontend Stack** - S3 bucket and CloudFront distribution
5. **WAF Stack** - Web Application Firewall with security rules
6. **Monitoring Stack** - CloudWatch dashboards and alarms

## What's Included Automatically

### 1. Resource Tagging
All resources are automatically tagged with:
- `name: complical-{environment}`
- `environment: {environment}`
- `project: complical`
- `managed-by: cdk`
- `owner: complical-team`

### 2. Security Features
- AWS WAF protection (SQL injection, XSS, rate limiting)
- httpOnly cookies for authentication
- SHA-256 API key hashing
- CSRF token protection
- All security headers configured

### 3. Monitoring & Alerts
- CloudWatch dashboard for API metrics
- Automated alarms for:
  - Error rate > 1%
  - API latency > 1 second
  - 5XX errors > 10 in 5 minutes
  - Lambda function errors

### 4. API Features
- Rolling 30-day usage windows
- Per-user usage aggregation
- Webhook support for usage thresholds
- Rate limiting (10 req/s, 10k/month)

## Environment Variables

### Optional for Deployment
```bash
# Set environment (default: test)
export ENVIRONMENT=test

# Set alert email for CloudWatch alarms
export ALERT_EMAIL=your-email@example.com

# Deploy with environment variables
cd /home/ubuntu/v2-complical-api/infrastructure
npm run cdk -- deploy --all --require-approval never
```

## Post-Deployment Steps

### 1. Load Initial Data
```bash
cd /home/ubuntu/v2-complical-api/infrastructure
export TABLE_NAME=complical-deadlines-test
npm run load-data
```

### 2. Verify Deployment
```bash
# Check health endpoint
curl https://your-api-url/test/health

# Should return:
{
  "status": "healthy",
  "service": "CompliCal API",
  "timestamp": "2025-06-29T..."
}
```

### 3. Create First User (Optional)
```bash
# Register via API
curl -X POST https://your-api-url/test/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "companyName": "Admin Company"
  }'
```

## Deployment to New AWS Account

1. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter new account credentials
   ```

2. **Bootstrap CDK** (first time only)
   ```bash
   cd /home/ubuntu/v2-complical-api/infrastructure
   npm run cdk bootstrap
   ```

3. **Deploy Everything**
   ```bash
   npm run cdk -- deploy --all --require-approval never
   ```

4. **Load Data**
   ```bash
   export TABLE_NAME=complical-deadlines-test
   npm run load-data
   ```

## Stack Outputs

After deployment, you'll see outputs like:
- **API URL**: `https://xxxxx.execute-api.region.amazonaws.com/test/`
- **Frontend URL**: `https://xxxxx.cloudfront.net`
- **User Pool ID**: For Cognito configuration
- **WAF ARN**: For security monitoring

## Troubleshooting

### CDK Context Issues
```bash
# Clear CDK context if needed
rm -rf cdk.context.json
```

### Stack Already Exists
```bash
# Update existing stacks
npm run cdk -- deploy --all --require-approval never
```

### Permission Issues
Ensure your AWS credentials have permissions for:
- CloudFormation
- Lambda
- API Gateway
- DynamoDB
- Cognito
- S3
- CloudFront
- WAF
- CloudWatch
- SNS
- IAM

## Cost Optimization

The deployment includes:
- DynamoDB on-demand billing
- Lambda pay-per-use
- CloudFront with S3 origin
- Single GSI instead of 3 (66% DynamoDB cost reduction)

Estimated monthly cost for low usage: ~$50-100