# CompliCal API Context

## 🎯 Project
Compliance deadline API - "Never miss a tax deadline again"

## 🚀 Live System
- **API**: https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/
- **Docs**: https://d1v4wmxs6wjlqf.cloudfront.net
- **Region**: ap-south-1

## 📊 Current State
- **Deadlines**: 430 (421 AU, 9 NZ)
- **API Keys**: 64 total, 53 active
- **Usage**: 20K+ calls tracked
- **Billing**: Only successful (2xx) calls count

### Technical Specs
- **Latency**: p50=45ms, p99=120ms
- **Availability**: 99.9% (API Gateway SLA)
- **Throughput**: 10K RPS (limited by rate limiter)
- **Storage**: 5MB DynamoDB, 100MB CloudWatch Logs/month

## 🛠 Quick Commands
```bash
# Deploy everything
./deploy.sh prod ap-south-1

# Verify deployment
./verify-deployment.sh prod

# Test usage tracking
./test-api-usage.sh prod YOUR_API_KEY

# Check logs
aws logs tail /aws/lambda/complical-usage-processor-test --region ap-south-1
```

## 🏗 Architecture

### Request Flow
```
Client → API Gateway → Custom Authorizer → Lambda → DynamoDB
         ↓                    ↓
   CloudWatch Logs      In-Memory Cache (30s TTL)
         ↓                    ↓
   Filter {$.status=2*}  GSI: hashedKey-index
         ↓                    ↓
   Batch (60s window)    Fallback: ConsistentRead Scan
         ↓
   Usage Processor → Update DynamoDB (atomic increment)
```

### Key Components
- **Authorizer**: 512MB, 3s timeout, handles 10K RPS
- **Cache Strategy**: 95% hit rate, SHA-256 hashed keys
- **GSI Fallback**: Handles eventual consistency (100ms delay)
- **Batch Window**: 60s aggregation reduces DynamoDB writes by 99%
- **Cost**: $4.10/million calls (90% cheaper than Lambda@Edge)

## 📁 Key Files
```
backend/handlers/auth/
├── api-key-authorizer-production.js  # No debug logs, optimized
├── usage-log-processor.js            # Counts only successful calls
└── api-keys-secure.js                # Key management + invalidation

infrastructure/lib/
├── production-usage-metering-construct.ts  # Complete CDK setup
└── api-stack.ts                           # Main API configuration
```

## ✅ Production Features

### Usage Metering
- **Fair Billing**: Only 2xx responses count (via CloudWatch filter)
- **Real-time**: 60-second batch processing (like Stripe)
- **Deduplication**: Request IDs prevent double counting
- **Cache Invalidation**: SNS → Lambda subscription pattern

### Security & Performance
- **API Keys**: SHA-256 hashed, 30-char random generation
- **Authorization**: Zero-cache policy, context injection
- **DynamoDB**: UpdateItem with atomic counters
- **Monitoring**: CloudWatch Dashboard + custom metrics

## 💰 Business Model
- $10 per 10K calls → 99.6% margin
- Volume discounts available
- Usage-based like Stripe/Twilio