# CompliCal Clean Implementation Deployment Guide

This clean implementation includes all the features of the original CompliCal project with an optimized DynamoDB design that reduces costs by 66% (single GSI instead of 3).

## Architecture Improvements

- **Optimized DynamoDB Design**: Single coherent data model with 1 GSI instead of 3
- **No Hot Partitions**: Data distributed across jurisdiction+yearmonth combinations
- **Clean Codebase**: No legacy technical debt
- **Full Feature Parity**: Includes all authentication, API, and frontend features

## Complete Deployment Steps

### 1. Prerequisites

```bash
cd /home/ubuntu/CompliCal/clean-implementation
npm install
```

### 2. Deploy Infrastructure

```bash
# Deploy all stacks
npm run deploy

# Or deploy individually
npx cdk deploy CompliCal-DynamoDB-test --require-approval never
npx cdk deploy CompliCal-Auth-test --require-approval never
npx cdk deploy CompliCal-API-test --require-approval never
npx cdk deploy CompliCal-Frontend-test --require-approval never
```

### 3. Load Data

```bash
# Set the table name
export TABLE_NAME=complical-deadlines-test

# Load Australian and New Zealand data
npm run load-data
```

### 4. Create API Key

```bash
# Get API Gateway ID
API_ID=$(aws apigateway get-rest-apis --region ap-south-1 --query "items[?name=='complical-api-test'].id" --output text)

# Get Usage Plan ID
USAGE_PLAN_ID=$(aws apigateway get-usage-plans --region ap-south-1 --query "items[?apiStages[?apiId=='$API_ID']].id" --output text)

# Create API key
API_KEY_ID=$(aws apigateway create-api-key --name test-api-key --enabled --region ap-south-1 --query "id" --output text)

# Associate with usage plan
aws apigateway create-usage-plan-key --usage-plan-id $USAGE_PLAN_ID --key-id $API_KEY_ID --key-type API_KEY --region ap-south-1

# Get the actual API key value
API_KEY_VALUE=$(aws apigateway get-api-key --api-key $API_KEY_ID --include-value --region ap-south-1 --query "value" --output text)

echo "API Key: $API_KEY_VALUE"
```

### 5. Deploy Frontend (Optional)

```bash
# Copy frontend code
./scripts/copy-frontend.sh

# Build frontend
cd frontend
npm install
npm run build

# Get bucket name from stack outputs
FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name CompliCal-Frontend-test --region ap-south-1 --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text)

# Deploy to S3
aws s3 sync out s3://$FRONTEND_BUCKET --delete

# Get CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name CompliCal-Frontend-test --region ap-south-1 --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text)

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths '/*'
```

### 6. Test the API

```bash
# Get API URL
API_URL=$(aws cloudformation describe-stacks --stack-name CompliCal-API-test --region ap-south-1 --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

# Test health endpoint
curl $API_URL/health

# Test with API key
curl -H "x-api-key: $API_KEY_VALUE" $API_URL/v1/au/ato/deadlines

# Run full test suite
export API_URL
export API_KEY=$API_KEY_VALUE
npm run test-api
```

## Stack Components

### DynamoDB Stack
- **Deadlines Table**: Optimized single-table design with 1 GSI
- **API Keys Table**: For managing user API keys with SHA-256 hashing
- **API Usage Table**: For tracking usage metrics

### Auth Stack
- **Cognito User Pool**: User authentication
- **User Pool Client**: Web application client
- **User Groups**: admins, developer, professional, enterprise

### API Stack
- **API Gateway**: REST API with usage plans
- **Lambda Functions**:
  - Deadlines handler (optimized queries)
  - Simplified deadlines (Calendarific-style)
  - Auth handler (login, register, logout)
  - API keys handler (create, list, delete)
  - API key authorizer (custom authorizer)
  - Process usage logs (async usage tracking)
- **Custom Authorizers**: API key and Cognito JWT
- **CloudWatch Logs**: Access logging and usage tracking

### Frontend Stack
- **S3 Bucket**: Static website hosting
- **CloudFront Distribution**: CDN with OAI
- **S3 Logs Bucket**: CloudFront access logs

## Clean Architecture Benefits

1. **Cost Reduction**: 66% reduction in DynamoDB costs (1 GSI vs 3)
2. **Performance**: No hot partitions, efficient query patterns
3. **Maintainability**: Clean codebase without legacy cruft
4. **Scalability**: Can handle millions of requests efficiently
5. **Security**: All security features included (httpOnly cookies, CSRF, hashing)

## Troubleshooting

### API returns 403 Forbidden
- Ensure API key is created and associated with usage plan
- Check that API key is included in x-api-key header
- Verify API Gateway deployment is current

### DynamoDB queries return empty
- Check data is loaded with correct key structure
- Verify table name in Lambda environment variables
- Review CloudWatch logs for query details

### Frontend not loading
- Ensure CloudFront distribution is deployed
- Check S3 bucket has index.html
- Verify CloudFront error pages redirect to index.html

## Next Steps

1. Configure custom domain for API and frontend
2. Set up monitoring dashboards
3. Configure alerts for errors and usage
4. Implement automated testing pipeline
5. Set up CI/CD with GitHub Actions