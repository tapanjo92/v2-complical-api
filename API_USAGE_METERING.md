# API Usage Metering System

## Overview
Production-grade API usage tracking that only counts successful (2xx) responses for fair billing.

## Quick Start

### 1. Deploy Everything
```bash
./deploy.sh prod ap-south-1
```

### 2. Verify Deployment
```bash
./verify-deployment.sh prod
```

### 3. Test Usage Tracking
```bash
./test-api-usage.sh prod YOUR_API_KEY
```

## Architecture

```
API Request → Authorizer (Cache) → Lambda → Response
                    ↓
             CloudWatch Logs
                    ↓
         Filter (2xx + shouldCount)
                    ↓ (Async)
            Usage Processor
                    ↓
              DynamoDB
```

## Key Features

- **Only Successful Calls Count**: 4xx/5xx errors don't increment usage
- **Real-time Updates**: Usage visible within 60 seconds
- **Cache Invalidation**: Deleted keys stop working immediately
- **Production Ready**: No debug logs, optimized performance

## Components

### 1. Production Authorizer
- File: `backend/handlers/auth/api-key-authorizer-production.js`
- Features: 30-second cache, GSI with fallback, no debug logs

### 2. Usage Processor
- File: `backend/handlers/auth/usage-log-processor.js`
- Features: Batch processing, CloudWatch Logs subscription

### 3. Infrastructure
- File: `infrastructure/lib/production-usage-metering-construct.ts`
- Includes: SNS topics, Lambda functions, CloudWatch dashboard

## Database Schema

```typescript
{
  id: string,              // API Key ID
  hashedKey: string,       // SHA256 of API key
  userEmail: string,       // User identifier
  usageCount: number,      // Total authorized calls
  successfulCalls: number, // Only 2xx responses (for billing)
  failedCalls: number,     // 4xx/5xx responses (analytics)
  lastUsed: string,        // ISO timestamp
  status: string,          // active/revoked
}
```

## Monitoring

Dashboard URL: `https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=complical-api-usage-{environment}`

## Cost

- CloudWatch Logs: $0.50/GB (~$0.05 per million API calls)
- Lambda: $0.20 per million invocations (batched)
- DynamoDB: $0.25 per million writes
- **Total: ~$0.50 per million API calls**

## Troubleshooting

1. **Usage not updating**: Check CloudWatch Logs subscription filter
2. **Cache issues**: SNS topic must be configured for invalidation
3. **Wrong counts**: Ensure `successfulCalls` field exists in DynamoDB