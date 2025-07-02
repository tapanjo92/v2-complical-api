#!/bin/bash
# Update Frontend CSP with correct API URL
# This script dynamically updates the CloudFront CSP to match the deployed API

set -e

# Configuration
ENVIRONMENT=${1:-prod}
REGION=${2:-us-east-1}

echo "=================================================="
echo "🔧 Updating Frontend CSP Configuration"
echo "=================================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "=================================================="

# Get the actual API URL dynamically
API_URL=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-API-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

if [ -z "$API_URL" ]; then
  echo "❌ Error: API stack not found in $REGION"
  exit 1
fi

echo "📡 Found API URL: $API_URL"

# Export for CDK to use
export API_URL=$API_URL
export AWS_REGION=$REGION
export CDK_DEFAULT_REGION=$REGION
export ENVIRONMENT=$ENVIRONMENT

# Deploy frontend with updated CSP
echo ""
echo "🚀 Deploying frontend with updated CSP..."
cd ../../../infrastructure
npx cdk deploy CompliCal-Frontend-$ENVIRONMENT --require-approval never

# Get CloudFront distribution ID dynamically
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-Frontend-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

if [ ! -z "$DISTRIBUTION_ID" ]; then
  echo ""
  echo "🔄 Creating CloudFront invalidation..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths '/*' \
    --query 'Invalidation.Id' \
    --output text)
  
  echo "✅ Invalidation created: $INVALIDATION_ID"
  echo ""
  echo "⏳ CloudFront propagation takes 5-10 minutes globally"
else
  echo "⚠️  Warning: Could not find CloudFront distribution ID"
fi

echo ""
echo "=================================================="
echo "✅ CSP Update Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Wait 5-10 minutes for CloudFront propagation"
echo "2. Clear browser cache or use incognito mode"
echo "3. Test your application"