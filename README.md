# V2 CompliCal API

Complete rewrite of CompliCal with modern architecture, enhanced security, and enterprise-grade monitoring.

## 🚀 Quick Deploy

```bash
# Deploy everything including usage metering
./deploy.sh prod ap-south-1

# Verify deployment
./verify-deployment.sh prod

# Test API usage tracking
./test-api-usage.sh prod YOUR_API_KEY
```

## 📊 API Usage Metering

Production-grade usage tracking that only bills for successful (2xx) API calls.
See [API_USAGE_METERING.md](API_USAGE_METERING.md) for architecture details.

## Project Structure

```
v2-complical-api/
├── backend/           # Lambda functions
│   ├── handlers/     # API handlers
│   └── package.json  # Dependencies
├── frontend/          # React SPA with Vite
│   ├── src/          # Source code
│   └── dist/         # Build output
├── infrastructure/    # AWS CDK deployment
│   ├── lib/          # CDK stacks
│   ├── scripts/      # Data loading scripts
│   └── bin/          # CDK app entry
├── DEPLOYMENT_GUIDE.md
├── DATA_MANAGEMENT.md
└── README.md         # This file
```

## Features

### Frontend
- ⚛️ React 18 with TypeScript
- ⚡ Vite for fast development
- 🎨 Tailwind CSS + Radix UI
- 🔐 Secure authentication with httpOnly cookies
- 📊 Dashboard with API key management
- 🚀 Optimized for CloudFront deployment

### Backend
- 🔐 Cognito authentication with httpOnly cookies
- 🔑 SHA-256 hashed API keys
- 📈 Rolling 30-day usage windows
- 🪝 Webhook support for usage alerts
- ⚡ Optimized DynamoDB with single GSI

### Infrastructure
- ☁️ AWS CDK v2 with TypeScript
- 🛡️ WAF protection against attacks
- 📊 CloudWatch dashboards & alarms
- 🏷️ Automatic resource tagging
- 💰 Cost-optimized architecture

## Quick Start

### 🚀 Standard Deployment (Everything)

```bash
cd infrastructure
npm run cdk -- deploy --all --require-approval never
```

This single command deploys:
- DynamoDB tables with optimized GSIs
- Cognito authentication
- API Gateway with Lambda functions
- React frontend on CloudFront
- WAF security protection
- CloudWatch monitoring & alarms
- Automatic resource tagging

### 📊 Load Initial Data (One-time)

```bash
cd infrastructure
export TABLE_NAME=complical-deadlines-test
npm run load-data
```

### 💻 Local Development

```bash
# Backend API
cd backend
npm install
npm run test

# Frontend
cd frontend
npm install
npm run dev
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Browser   │────▶│  CloudFront  │────▶│ S3 Bucket  │
└─────────────┘     └──────────────┘     └────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ API Gateway  │
                    └──────────────┘
```

## Security Features

- 🔒 HTTPS-only with TLS 1.2+
- 🛡️ Security headers (HSTS, CSP, X-Frame-Options)
- 🚫 No direct S3 access (OAI protected)
- 🍪 httpOnly cookies for authentication
- 🔑 SHA-256 hashed API keys

## Documentation

- 📚 [Deployment Guide](./doc/DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- 💾 [Data Management](./doc/DATA_MANAGEMENT.md) - Data loading and management
- 🎨 [Frontend README](./frontend/README.md) - Frontend development guide
- 🏗️ [Infrastructure README](./infrastructure/README.md) - CDK stack details

## Environment Variables

Create `.env` in the frontend directory:

```env
VITE_API_URL=https://your-api-url.amazonaws.com/stage
VITE_SENTRY_DSN=your-sentry-dsn (optional)
VITE_ENVIRONMENT=production
```

## Deployment Outputs

After deployment, you'll get:
- CloudFront URL: `https://dxxxxxxxxx.cloudfront.net`
- S3 Bucket Name: `v2-complical-frontend-dev-{account-id}`
- Distribution ID: For cache invalidation

## Deployment to New AWS Account

```bash
# 1. Configure AWS CLI
aws configure

# 2. Bootstrap CDK (first time only)
cd infrastructure
npm run cdk bootstrap

# 3. Deploy everything
npm run cdk -- deploy --all --require-approval never

# 4. Load data
export TABLE_NAME=complical-deadlines-test
npm run load-data
```

## What's Included

✅ **6 CDK Stacks** deployed automatically:
- DynamoDB (3 tables)
- Auth (Cognito)
- API (Lambda + API Gateway)
- Frontend (S3 + CloudFront)
- WAF (Security rules)
- Monitoring (Dashboard + Alarms)

✅ **All Resources Tagged** with:
- `name: complical-test`
- `environment: test`
- `project: complical`

✅ **469 Compliance Deadlines**:
- 421 Australian
- 48 New Zealand

## License

Copyright 2025 CompliCal. All rights reserved.