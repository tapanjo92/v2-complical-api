# V2 CompliCal Infrastructure

This directory contains the AWS CDK infrastructure for deploying the complete V2 CompliCal stack.

## Architecture

The V2 infrastructure consists of 4 stacks:

1. **DynamoDB Stack** (`CompliCal-DynamoDB-{env}`)
   - Deadlines table
   - API Keys table
   - API Usage table

2. **Auth Stack** (`CompliCal-Auth-{env}`)
   - Cognito User Pool
   - Cognito User Pool Client

3. **API Stack** (`CompliCal-API-{env}`)
   - API Gateway REST API
   - Lambda functions
   - API Key authorizer
   - Usage tracking

4. **Frontend Stack** (`CompliCal-Frontend-{env}`)
   - S3 Bucket for React SPA
   - CloudFront Distribution
   - Origin Access Identity (OAI)
   - CloudFront Logs bucket

## Features

- ✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)
- ✅ Automatic compression support (gzip and brotli)
- ✅ Error page handling for SPA routing
- ✅ Optimized caching policies
- ✅ CloudFront access logs
- ✅ Pre-compressed asset support

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 20.x or later
3. AWS CDK CLI: `npm install -g aws-cdk`

## Deployment

### Quick Deploy

```bash
./deploy.sh
```

### Manual Deploy

1. Install dependencies:
```bash
npm install
```

2. Build the frontend:
```bash
cd ../frontend
npm install
npm run build
cd ../infrastructure
```

3. Deploy to AWS:
```bash
npx cdk deploy
```

## Environment Configuration

Before deploying, create a `.env` file in the frontend directory:

```bash
cd ../frontend
cp .env.example .env
```

Update the `.env` file with your API URL:
```
VITE_API_URL=https://your-api-gateway-url.amazonaws.com/stage
```

## CDK Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npx cdk deploy` - Deploy stack to AWS
- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk synth` - Emit synthesized CloudFormation template
- `npx cdk destroy` - Remove stack from AWS

## Post-Deployment

After deployment:

1. Note the CloudFront URL from the CDK output
2. Wait 5-10 minutes for CloudFront distribution to be fully deployed
3. Access your frontend at the CloudFront URL
4. Optional: Set up a custom domain with Route 53

## Security Features

The deployment includes:

- HTTPS-only access (HTTP redirects to HTTPS)
- Security headers via CloudFront Response Headers Policy
- Origin Access Identity to prevent direct S3 access
- S3 bucket with all public access blocked
- CloudFront minimum TLS 1.2

## Caching Strategy

- `/index.html`: No cache (always fresh)
- `/assets/*`: Cached for 30 days (immutable assets with hashed names)
- Error pages: No cache

## Monitoring

- CloudFront access logs stored in S3
- Logs retained for 30 days
- Can be analyzed with AWS Athena or exported to monitoring tools

## Cost Optimization

- Uses PRICE_CLASS_100 (North America and Europe only)
- S3 lifecycle rules to delete old logs
- Efficient caching to reduce origin requests

## Troubleshooting

### 403/404 Errors
- These are normal for SPA routing and handled by error responses
- All routes return index.html for client-side routing

### Deployment Fails
- Ensure AWS credentials are configured
- Check CDK bootstrap has been run
- Verify frontend build completes successfully

### CloudFront Not Updating
- CloudFront deployments can take 5-30 minutes
- Use invalidation for immediate updates: `aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"`