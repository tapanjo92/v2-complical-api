#!/bin/bash
# Deploy Backend Infrastructure to us-east-1
# Includes: DynamoDB, Auth, Kinesis, API, WAF, Monitoring

set -e

# Configuration
REGION="us-east-1"
ENVIRONMENT=${1:-prod}
ENABLE_KINESIS=${2:-true}

echo "=================================================="
echo "🚀 Deploying Backend Infrastructure to us-east-1"
echo "=================================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Kinesis Analytics: $ENABLE_KINESIS"
echo "=================================================="

# Set environment variables
export AWS_REGION=$REGION
export CDK_DEFAULT_REGION=$REGION
export ENVIRONMENT=$ENVIRONMENT
export ENABLE_KINESIS_ANALYTICS=$ENABLE_KINESIS

# Change to infrastructure directory
cd ../../../infrastructure

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building CDK app..."
npm run build

# Bootstrap CDK (if needed)
echo "🏗️ Bootstrapping CDK..."
npx cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/$REGION || true

# Deploy backend stacks in order
echo "🚢 Deploying backend stacks..."

# Deploy core infrastructure
npx cdk deploy \
  CompliCal-DynamoDB-$ENVIRONMENT \
  CompliCal-Auth-$ENVIRONMENT \
  --require-approval never

# Deploy Kinesis if enabled
if [ "$ENABLE_KINESIS" = "true" ]; then
  npx cdk deploy CompliCal-Kinesis-$ENVIRONMENT --require-approval never
fi

# Deploy API
npx cdk deploy CompliCal-API-$ENVIRONMENT --require-approval never

# Deploy WAF and Monitoring
npx cdk deploy \
  CompliCal-WAF-$ENVIRONMENT \
  CompliCal-Monitoring-$ENVIRONMENT \
  --require-approval never

# Get outputs
echo ""
echo "=================================================="
echo "✅ Backend Deployment Complete!"
echo "=================================================="

# Extract important values
API_URL=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-API-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

KINESIS_STREAM=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-Kinesis-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='StreamName'].OutputValue" \
  --output text 2>/dev/null || echo "N/A")

echo "API URL: $API_URL"
echo "Kinesis Stream: $KINESIS_STREAM"
echo ""
echo "Next steps:"
echo "1. Deploy frontend: ./deploy-frontend.sh $ENVIRONMENT"
echo "2. Load data: AWS_REGION=$REGION TABLE_NAME=complical-deadlines-$ENVIRONMENT node ../../../scripts/load-data.js"
echo "3. Verify deployment: ./verify-deployment.sh $ENVIRONMENT"