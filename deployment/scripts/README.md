# Deployment Scripts

This directory contains deployment scripts for different AWS regions.

## Directory Structure

```
deployment/scripts/
├── us-east-1/          # Scripts for US East (N. Virginia)
│   ├── deploy-backend.sh
│   ├── deploy-frontend.sh
│   └── verify-deployment.sh
├── ap-south-1/         # Scripts for Asia Pacific (Mumbai)
│   ├── deploy-backend.sh
│   ├── deploy-frontend.sh
│   └── verify-deployment.sh
└── post-deployment/    # Scripts to run after deployment
    ├── update-frontend-csp.sh  # Fix CSP issues
    └── test-api-usage.sh       # Test usage tracking
```

## Usage

### 1. Deploy Backend Infrastructure

Deploys all backend components: DynamoDB, Auth, Kinesis, API, WAF, and Monitoring.

```bash
# Deploy to us-east-1
cd deployment/scripts/us-east-1
./deploy-backend.sh [environment] [enable-kinesis]

# Deploy to ap-south-1
cd deployment/scripts/ap-south-1
./deploy-backend.sh [environment] [enable-kinesis]
```

**Parameters:**
- `environment`: Environment name (default: `prod`)
- `enable-kinesis`: Enable Kinesis analytics (default: `true`)

**Example:**
```bash
./deploy-backend.sh prod true
```

### 2. Deploy Frontend

Deploys the React frontend to S3 and CloudFront. Must be run AFTER backend deployment.

```bash
# Deploy to us-east-1
cd deployment/scripts/us-east-1
./deploy-frontend.sh [environment]

# Deploy to ap-south-1
cd deployment/scripts/ap-south-1
./deploy-frontend.sh [environment]
```

**Parameters:**
- `environment`: Environment name (default: `prod`)

**Example:**
```bash
./deploy-frontend.sh prod
```

### 3. Verify Deployment

Comprehensive verification of all deployed components.

```bash
# Verify us-east-1 deployment
cd deployment/scripts/us-east-1
./verify-deployment.sh [environment]

# Verify ap-south-1 deployment
cd deployment/scripts/ap-south-1
./verify-deployment.sh [environment]
```

**Parameters:**
- `environment`: Environment name (default: `prod`)

**What it checks:**
- CloudFormation stack status
- API health endpoint
- Kinesis stream status
- DynamoDB tables
- CloudFront distribution
- Sample data loaded
- Dashboard URLs

## Complete Deployment Workflow

### For us-east-1:
```bash
# 1. Deploy backend infrastructure
cd deployment/scripts/us-east-1
./deploy-backend.sh prod true

# 2. Fix hardcoded URLs BEFORE building frontend
cd ../post-deployment
./fix-hardcoded-urls.sh prod us-east-1

# 3. Deploy frontend
cd ../us-east-1
./deploy-frontend.sh prod

# 4. Load initial data
AWS_REGION=us-east-1 TABLE_NAME=complical-deadlines-prod node ../../../scripts/load-data.js

# 5. Verify deployment
./verify-deployment.sh prod

# 6. Test API usage tracking (after creating an API key)
cd ../post-deployment
./test-api-usage.sh prod YOUR_API_KEY us-east-1
```

### For ap-south-1:
```bash
# 1. Deploy backend infrastructure
cd deployment/scripts/ap-south-1
./deploy-backend.sh prod true

# 2. Fix hardcoded URLs BEFORE building frontend
cd ../post-deployment
./fix-hardcoded-urls.sh prod ap-south-1

# 3. Deploy frontend
cd ../ap-south-1
./deploy-frontend.sh prod

# 4. Load initial data
AWS_REGION=ap-south-1 TABLE_NAME=complical-deadlines-prod node ../../../scripts/load-data.js

# 5. Verify deployment
./verify-deployment.sh prod

# 6. Test API usage tracking (after creating an API key)
cd ../post-deployment
./test-api-usage.sh prod YOUR_API_KEY ap-south-1
```

### Common Post-Deployment Issues

1. **Frontend shows wrong API URL or CSP errors**:
   ```bash
   cd deployment/scripts/post-deployment
   ./update-frontend-csp.sh prod [region]
   ```

2. **Documentation shows old API URLs**:
   ```bash
   cd deployment/scripts/post-deployment
   ./fix-hardcoded-urls.sh prod [region]
   # Then rebuild and redeploy frontend
   ```

3. **Need to update .env.production manually**:
   ```bash
   cd frontend
   echo "VITE_API_URL=https://YOUR-API-ID.execute-api.REGION.amazonaws.com/prod/" > .env.production
   npm run build
   cd ../deployment/scripts/[region]
   ./deploy-frontend.sh prod
   ```

## Script Features

### Backend Deployment (`deploy-backend.sh`)
- Installs CDK dependencies
- Builds TypeScript code
- Bootstraps CDK if needed
- Deploys stacks in correct order
- Shows API URL and Kinesis stream name

### Frontend Deployment (`deploy-frontend.sh`)
- Gets API URL from backend stack
- Installs frontend dependencies
- Creates production environment file
- Builds optimized React app
- Deploys to S3/CloudFront
- Shows CloudFront URL

### Verification (`verify-deployment.sh`)
- Checks all CloudFormation stacks
- Tests API health endpoint
- Verifies Kinesis stream is active
- Confirms DynamoDB tables exist
- Checks data is loaded
- Provides dashboard URLs
- Color-coded output (green=good, red=error, yellow=warning)

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 18+ installed
3. npm installed
4. Sufficient AWS permissions for:
   - CloudFormation
   - DynamoDB
   - Lambda
   - API Gateway
   - Kinesis
   - CloudFront
   - S3
   - WAF
   - CloudWatch
   - IAM

## Post-Deployment Scripts

Located in `post-deployment/` directory:

### 1. Fix Hardcoded URLs (`fix-hardcoded-urls.sh`)

**IMPORTANT**: Run this BEFORE building the frontend if you're deploying to a new region or environment.

```bash
cd deployment/scripts/post-deployment
./fix-hardcoded-urls.sh prod us-east-1
```

This script:
- Updates ALL hardcoded API URLs in the frontend source code
- Fixes index.html preconnect links
- Updates documentation examples
- Updates vite.config.ts proxy settings
- Shows count of files changed

### 2. Update Frontend CSP (`update-frontend-csp.sh`)

If you encounter Content Security Policy errors after deployment:

```bash
cd deployment/scripts/post-deployment
./update-frontend-csp.sh prod us-east-1
```

This script:
- Dynamically fetches the API URL from CloudFormation
- Updates CloudFront CSP headers to allow the correct API
- Invalidates CloudFront cache
- No hardcoded values

### 3. Test API Usage (`test-api-usage.sh`)

Test that usage tracking is working correctly:

```bash
cd deployment/scripts/post-deployment
./test-api-usage.sh prod YOUR_API_KEY us-east-1
```

This script:
- Makes test API calls (successful and failed)
- Waits for Kinesis batch processing
- Shows usage statistics from DynamoDB
- Verifies only successful calls are counted

## Troubleshooting

### Backend deployment fails
- Check AWS credentials: `aws sts get-caller-identity`
- Verify region is correct
- Check CloudFormation console for detailed errors

### Frontend deployment fails
- Ensure backend is deployed first
- Check if frontend build succeeds locally
- Verify S3 bucket permissions

### Verification shows failures
- Check individual service consoles
- Review CloudWatch logs
- Ensure data loading script completed successfully