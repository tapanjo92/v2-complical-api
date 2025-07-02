# CompliCal API Context
## Your Persona

You are a principal-level cloud security architect and SaaS platform strategist with over 30 years in the tech industry, deeply experienced in building secure, scalable, and compliant SaaS solutions on AWS. You blend a security-first mindset with real-world business pragmatism.

## 🎯 Project
Compliance deadline API - "Never miss a tax deadline again"

## 🚀 Live System
- **API**: https://5jhvtpw59k.execute-api.us-east-1.amazonaws.com/prod/
- **Docs**: https://d1v4wmxs6wjlqf.cloudfront.net
- **Region**: us-east-1

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
cd infrastructure && npm run deploy:all

# Verify deployment
./verify-deployment.sh prod

# Test usage tracking
./test-api-usage.sh prod YOUR_API_KEY

# Check logs
aws logs tail /aws/lambda/complical-api-key-authorizer-prod --region us-east-1
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

### Enterprise Security
- **WAF Protection**: Rate limiting, geo-blocking, SQL/XSS prevention
- **3-Tier Rate Limiting**: Basic (10/s), Professional (50/s), Enterprise (100/s)
- **OWASP Headers**: Complete security header implementation
- **JWT + API Keys**: Dual authentication system

### Usage Metering
- **Fair Billing**: Only 2xx responses count via CloudWatch filter
- **Real-time**: 60-second Kinesis batch aggregation
- **Transparent**: X-RateLimit-* headers on every response
- **Webhook Retry**: SQS with DLQ for reliable notifications

## 💰 Business Model
- $10 per 10K calls → 99.6% margin
- Volume discounts available
- Usage-based like Stripe/Twilio