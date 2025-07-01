# Production API Usage Metering - Complete Deployment Guide

## Overview
This deploys a production-grade API usage metering system that:
- Only counts successful (2xx) API calls
- Updates usage within 60 seconds
- Handles cache invalidation for deleted keys
- Includes monitoring dashboard

## Prerequisites
- AWS CLI configured with appropriate credentials
- Node.js 18+ installed
- CDK CLI installed (`npm install -g aws-cdk`)

## One-Command Deployment

```bash
# Clone and deploy everything
git clone <your-repo>
cd v2-complical-api/infrastructure
npm install
export AWS_REGION=ap-south-1
export ENVIRONMENT=prod  # or test/dev
npx cdk deploy CompliCal-API-${ENVIRONMENT} --context environment=${ENVIRONMENT}
```

## What Gets Deployed

1. **Production Authorizer** (`api-key-authorizer-production.js`)
   - No debug logs
   - 30-second in-memory cache
   - GSI with consistent read fallback

2. **Usage Log Processor** (`usage-log-processor.js`)
   - Processes CloudWatch Logs batches
   - Only counts 2xx responses
   - Updates DynamoDB atomically

3. **Cache Invalidation System**
   - SNS topic for key deletion events
   - Immediate cache clearing across all Lambda instances

4. **Monitoring**
   - CloudWatch Dashboard with usage metrics
   - Alarms for high error rates

## Architecture

```
Client → API Gateway → Authorizer → Lambda → Response
                ↓
         CloudWatch Logs
                ↓
         Filter (2xx only)
                ↓
         Usage Processor
                ↓
            DynamoDB
```

## Verify Deployment

```bash
# Check all components
./verify-deployment.sh ${ENVIRONMENT}

# Test with API key
./test-usage-metering.sh ${ENVIRONMENT} YOUR_API_KEY
```

## Dashboard
After deployment, view metrics at:
https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=complical-api-usage-${ENVIRONMENT}

## Rollback
If needed, redeploy previous version:
```bash
git checkout <previous-commit>
npx cdk deploy CompliCal-API-${ENVIRONMENT}
```