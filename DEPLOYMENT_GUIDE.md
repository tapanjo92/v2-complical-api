# CompliCal API Deployment Guide

## Overview

CompliCal API is a serverless compliance deadline tracking system built on AWS. It uses Kinesis Data Streams for real-time usage metering and supports multi-region deployment.

## Architecture Highlights

- **API Gateway** with custom authorizer for API key validation
- **Kinesis Data Streams** for real-time usage tracking (primary metric counter)
- **DynamoDB** for data storage with on-demand scaling
- **CloudFront** for global content delivery
- **WAF** for API protection and rate limiting
- **Cognito** for user authentication

## Deployment Scripts

All deployment is managed through organized scripts in `deployment/scripts/`:

```
deployment/scripts/
├── us-east-1/          # US East (N. Virginia)
│   ├── deploy-backend.sh
│   ├── deploy-frontend.sh
│   └── verify-deployment.sh
├── ap-south-1/         # Asia Pacific (Mumbai)
│   ├── deploy-backend.sh
│   ├── deploy-frontend.sh
│   └── verify-deployment.sh
└── test-api-usage.sh   # Test usage tracking
```

## Quick Start Deployment

### Deploy to us-east-1 (Primary Region)

```bash
cd deployment/scripts/us-east-1

# 1. Deploy all backend infrastructure
./deploy-backend.sh prod true

# 2. Deploy frontend (after backend completes)
./deploy-frontend.sh prod

# 3. Load sample data
AWS_REGION=us-east-1 TABLE_NAME=complical-deadlines-prod node ../../../scripts/load-data.js

# 4. Verify everything is working
./verify-deployment.sh prod
```

### Deploy to ap-south-1 (Mumbai)

```bash
cd deployment/scripts/ap-south-1

# Same commands as above
./deploy-backend.sh prod true
./deploy-frontend.sh prod
# ... etc
```

## Kinesis-Based Usage Metering

The system uses AWS Kinesis as the primary metric counter for real-time usage tracking:

### Data Flow
```
API Request → Custom Authorizer → Kinesis Stream → Lambda Processor → DynamoDB/CloudWatch
                     ↓
            (Fire & Forget)
                     ↓
              API Response
```

### Key Benefits
- **Performance**: Sub-millisecond latency impact
- **Reliability**: 7-day replay capability
- **Cost Effective**: ~$90/month for 10M API calls
- **Fair Billing**: Only successful (2xx) calls count
- **Real-time Analytics**: Minute-level aggregations

### Monitoring
- Kinesis Analytics Dashboard: Real-time metrics
- CloudWatch Dashboards: Usage trends and alerts
- DynamoDB Tables: Aggregated usage data

## Post-Deployment Configuration

### 1. DNS Setup
Point your domain (e.g., getcomplical.com) to CloudFront:
- Type: CNAME
- Value: Your CloudFront distribution domain

### 2. Email Configuration (SES)
1. Verify your domain in SES
2. Configure DKIM records
3. Request production access (move out of sandbox)

### 3. Create API Keys
1. Visit your CloudFront URL
2. Register an account
3. Generate API keys from the dashboard

### 4. Test Usage Tracking
```bash
cd deployment/scripts
./test-api-usage.sh prod YOUR_API_KEY us-east-1
```

## Environment Variables

### Required for Deployment
- `AWS_REGION`: Target AWS region
- `ENVIRONMENT`: Deployment environment (prod/test/dev)
- `ENABLE_KINESIS_ANALYTICS`: Enable real-time analytics (true/false)

### Optional
- `ALERT_EMAIL`: Email for CloudWatch alarms
- `SES_FROM_EMAIL`: From address for system emails

## Cost Breakdown (Estimated for 10M calls/month)

| Service | Monthly Cost |
|---------|-------------|
| Kinesis | ~$72 |
| Lambda | ~$20 |
| DynamoDB | ~$15 |
| API Gateway | ~$35 |
| CloudFront | ~$10 |
| **Total** | **~$152** |

## Security Features

- **WAF Protection**: Rate limiting and security rules
- **API Key Auth**: SHA-256 hashed keys with in-memory caching
- **Cognito Auth**: User authentication with JWT tokens
- **Encryption**: At-rest encryption for all data stores
- **HTTPS Only**: Enforced via CloudFront and API Gateway

## Troubleshooting

### Deployment Issues
- Check AWS credentials: `aws sts get-caller-identity`
- Review CloudFormation events in AWS Console
- Ensure CDK is bootstrapped: `npx cdk bootstrap`

### Usage Tracking Issues
- Check Kinesis stream metrics in CloudWatch
- Review Lambda logs: `/aws/lambda/complical-usage-processor-*`
- Verify API Gateway logs are enabled

### Performance Issues
- Monitor Lambda cold starts
- Check DynamoDB throttling metrics
- Review API Gateway latency metrics

## Maintenance

### Regular Tasks
1. Monitor CloudWatch alarms
2. Review usage patterns in Kinesis dashboard
3. Check for Lambda errors
4. Update dependencies monthly

### Scaling Considerations
- Kinesis shards auto-scale based on load
- DynamoDB on-demand handles spikes automatically
- Lambda concurrent executions: Monitor and adjust if needed
- API Gateway: 10,000 RPS limit by default

## Support

- **Dashboards**: Check CloudWatch dashboards first
- **Logs**: CloudWatch Logs for detailed debugging
- **Metrics**: Real-time metrics in Kinesis Analytics dashboard
- **Alarms**: SNS notifications for critical issues