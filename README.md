# CompliCal API - Production Documentation

<div align="center">
  <strong>🎯 Never miss a tax deadline again</strong>
  <br>
  <em>Enterprise-grade compliance deadline API for Australia & New Zealand</em>
</div>

---

## 🚀 Live Production System

- **API Endpoint**: `https://5jhvtpw59k.execute-api.us-east-1.amazonaws.com/prod/`
- **Documentation**: `https://d1v4wmxs6wjlqf.cloudfront.net`
- **Region**: US East 1 (N. Virginia)
- **Status**: ✅ Production Ready

## 📊 Current System Metrics

| Metric | Value | Description |
|--------|-------|-------------|
| **Deadlines** | 430 | 421 AU, 9 NZ compliance dates |
| **API Keys** | 64 total | 53 active customers |
| **Monthly Usage** | 20K+ calls | Growing 15% MoM |
| **Availability** | 99.9% | API Gateway SLA |
| **Response Time** | p50: 45ms | p99: 120ms |
| **Cost Efficiency** | 99.6% margin | $10 per 10K calls |

## 🏗 Architecture Overview

```
Client Request → CloudFront → API Gateway → WAF → Lambda (w/ Auth)
                                ↓                      ↓
                          Custom Authorizer      DynamoDB Tables
                                ↓                      ↓
                          Kinesis Stream        GSI Optimizations
                                ↓
                          Usage Analytics
```

### Key Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **API Gateway** | Request routing & throttling | REST API with 3 usage tiers |
| **WAF** | DDoS & security protection | Rate limiting, geo-blocking |
| **Lambda** | Business logic | Node.js 20.x, 256-512MB |
| **DynamoDB** | Data storage | Single-table design with GSIs |
| **Kinesis** | Real-time analytics | 60s batch aggregation |
| **CloudWatch** | Monitoring & alerts | Custom dashboards |

## 🚀 Quick Start

### Prerequisites

- AWS Account with appropriate IAM permissions
- Node.js 20.x and npm 10+
- AWS CLI v2 configured
- AWS CDK 2.x (`npm install -g aws-cdk`)
- Domain name (optional for custom domain)

### Installation & Deployment

```bash
# Clone and setup
git clone https://github.com/your-org/v2-complical-api.git
cd v2-complical-api

# Install all dependencies
npm run install:all

# Deploy to production (us-east-1)
export ENVIRONMENT=prod
export AWS_REGION=us-east-1
cd infrastructure
npm run deploy:all

# Load initial data
cd ../backend/scripts/data-loaders
node load-all-data.js
```

## 📁 API Endpoints

### Public Endpoints (No Auth Required)
```
GET  /health                    # Health check
POST /v1/auth/register         # User registration  
POST /v1/auth/login           # User login
GET  /v1/auth/verify-email    # Email verification
```

### Protected Endpoints (JWT Auth Required)
```
POST /v1/auth/logout          # Logout
POST /v1/auth/refresh         # Refresh token
POST /v1/auth/change-password # Change password
GET  /v1/auth/api-keys        # List API keys
POST /v1/auth/api-keys        # Create API key
GET  /v1/auth/usage           # Usage statistics
```

### Data Endpoints (API Key Required)
```
GET /v1/deadlines                          # All deadlines
GET /v1/deadlines/{country}/{year}/{month} # Filtered deadlines
GET /v1/{country}/deadlines               # Country deadlines
GET /v1/{country}/{agency}/deadlines      # Agency deadlines
```

## 🔐 Security Features

### Multi-Layer Security
1. **WAF Protection**
   - IP rate limiting: 2000 req/5min
   - Auth endpoint protection: 100 req/5min
   - SQL injection & XSS prevention
   - Geo-blocking (configurable)

2. **Authentication & Authorization**
   - JWT tokens for user sessions (5min cache)
   - API keys with SHA-256 hashing
   - Zero-cache authorizer for accurate usage tracking

3. **Security Headers** (OWASP compliant)
   ```javascript
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   X-XSS-Protection: 1; mode=block
   Strict-Transport-Security: max-age=63072000
   Content-Security-Policy: default-src 'self'
   ```

4. **Rate Limiting Tiers**
   - **Basic**: 10 req/s, 10K/month
   - **Professional**: 50 req/s, 100K/month  
   - **Enterprise**: 100 req/s, 1M/month

## 💰 Usage Metering & Billing

### How It Works
```
API Request → Authorizer → Kinesis Stream → Batch Processor (60s)
                 ↓                              ↓
           Context Injection            DynamoDB Usage Counter
                 ↓
           Response Headers
           (X-RateLimit-*)
```

### Billing Features
- **Fair billing**: Only successful (2xx) responses count
- **Real-time tracking**: 60-second aggregation window
- **Transparent usage**: Headers show remaining quota
- **Webhook notifications**: Usage threshold alerts
- **Volume discounts**: Enterprise pricing available

## 🛠 Operations & Monitoring

### Health Checks
```bash
# API health
curl https://5jhvtpw59k.execute-api.us-east-1.amazonaws.com/prod/health

# Check with auth
curl -H "x-api-key: YOUR_KEY" \
  https://5jhvtpw59k.execute-api.us-east-1.amazonaws.com/prod/v1/deadlines
```

### CloudWatch Dashboards
- **API Performance**: Request rates, latency, errors
- **Lambda Metrics**: Invocations, duration, throttles
- **DynamoDB**: Read/write capacity, throttles
- **Usage Analytics**: API key usage, top users

### Alarm Notifications
- API 4XX/5XX errors > 1%
- Lambda errors > 0.1%
- DynamoDB throttles > 0
- High usage customers (80% quota)

## 📊 Data Management

### Current Coverage
- **Australia**: 421 deadlines across ATO, ASIC, Fair Work
- **New Zealand**: 9 deadlines from IRD
- **Update Frequency**: Quarterly legislative reviews

### Adding New Deadlines
```javascript
// backend/scripts/data-loaders/custom-loader.js
const deadline = {
  jurisdiction: 'AU',
  agency: 'ATO',
  name: 'Quarterly BAS',
  dueDate: '2024-07-28',
  period: 'Q4 2024',
  type: 'RETURN',
  description: 'Lodge and pay quarterly BAS'
};
```

### Data Quality Checks
- Automated validation on import
- Duplicate detection
- Date format standardization
- Missing field warnings

## 🚨 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **429 Rate Limit** | Check usage plan tier, upgrade if needed |
| **403 Forbidden** | Verify API key is active and has correct permissions |
| **Invalid API Key** | Ensure using header `x-api-key`, not query param |
| **CORS Errors** | Check allowed origins in API Gateway settings |
| **Missing Deadlines** | Verify country/date filters are correct format |

### Debug Commands
```bash
# Check API key usage
aws dynamodb get-item --table-name complical-api-keys-prod \
  --key '{"userId":{"S":"USER_ID"}}'

# View recent logs
aws logs tail /aws/lambda/complical-api-key-authorizer-prod \
  --follow --format short

# Test rate limiting
for i in {1..15}; do
  curl -H "x-api-key: YOUR_KEY" https://api.getcomplical.com/v1/health
  sleep 0.1
done
```

## 💵 Cost Optimization

### Monthly AWS Costs (Estimated)
| Service | Cost | Notes |
|---------|------|-------|
| API Gateway | $3.50 | Per million requests |
| Lambda | $2.00 | 256MB, <100ms avg |
| DynamoDB | $5.00 | On-demand, 5MB data |
| CloudWatch | $3.00 | Logs & metrics |
| Kinesis | $12.00 | 1 shard |
| **Total** | **$25.50** | At 20K requests/month |

### Cost Saving Tips
1. Use CloudWatch Logs retention policies (7 days)
2. Enable API caching for static responses
3. Optimize Lambda memory allocation
4. Use DynamoDB on-demand for variable traffic
5. Implement client-side caching

## 🔄 Development Workflow

### Local Development
```bash
# Install dependencies
npm run install:all

# Run tests
npm test              # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e     # End-to-end tests

# Local development
cd backend && sam local start-api  # API on :3001
cd frontend && npm start           # UI on :3000
```

### Deployment Pipeline
1. **Feature Branch**: Develop & test locally
2. **Pull Request**: Automated tests run
3. **Staging**: Deploy to test environment
4. **Production**: Deploy with approval

### Environment Variables
```bash
export ENVIRONMENT=prod
export AWS_REGION=us-east-1
export ALERT_EMAIL=ops@getcomplical.com
export ENABLE_KINESIS_ANALYTICS=true
```

## 📈 Future Roadmap

### Q1 2025
- [ ] GraphQL API support
- [ ] SDK libraries (Python, Go, Ruby)
- [ ] Compliance calendar UI
- [ ] Multi-region deployment

### Q2 2025  
- [ ] Machine learning for deadline predictions
- [ ] Automated compliance reminders
- [ ] Partner API integrations
- [ ] Advanced analytics dashboard

## 🤝 Support & Contact

- **Technical Issues**: [GitHub Issues](https://github.com/your-org/v2-complical-api/issues)
- **API Support**: api-support@getcomplical.com
- **Sales**: sales@getcomplical.com
- **Documentation**: [API Docs](https://docs.getcomplical.com)

---

<div align="center">
  <strong>Built with ❤️ by the CompliCal Team</strong>
  <br>
  <em>Making tax compliance simple, one API call at a time</em>
</div>