#!/bin/bash
# Complete CDK Deployment Script

set -e

ENVIRONMENT=${1:-test}
REGION=${2:-ap-south-1}
PROFILE=${3:-default}

echo "🚀 Deploying CompliCal API with Production Usage Metering"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Profile: $PROFILE"
echo ""

# Navigate to infrastructure
cd infrastructure

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building CDK app..."
npm run build

# Bootstrap if needed
echo "🏗️ Bootstrapping CDK..."
npx cdk bootstrap aws://$(aws sts get-caller-identity --profile $PROFILE --query Account --output text)/$REGION \
  --profile $PROFILE || echo "Already bootstrapped"

# Deploy all stacks
echo "🚢 Deploying stacks..."
npx cdk deploy CompliCal-API-$ENVIRONMENT \
  --context environment=$ENVIRONMENT \
  --profile $PROFILE \
  --region $REGION \
  --require-approval never

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Verify deployment: cd .. && ./verify-deployment.sh $ENVIRONMENT"
echo "2. Test API usage: ./test-api-usage.sh $ENVIRONMENT YOUR_API_KEY"
echo ""
echo "📊 Dashboard: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=complical-api-usage-$ENVIRONMENT"