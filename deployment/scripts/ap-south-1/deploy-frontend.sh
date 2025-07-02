#!/bin/bash
# Deploy Frontend to ap-south-1
# Includes: S3, CloudFront, Frontend assets

set -e

# Configuration
REGION="ap-south-1"
ENVIRONMENT=${1:-prod}

echo "=================================================="
echo "🎨 Deploying Frontend to ap-south-1"
echo "=================================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "=================================================="

# Set environment variables
export AWS_REGION=$REGION
export CDK_DEFAULT_REGION=$REGION
export ENVIRONMENT=$ENVIRONMENT

# Get API URL from backend stack
API_URL=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-API-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text 2>/dev/null)

if [ -z "$API_URL" ]; then
  echo "❌ Error: Backend API not found. Deploy backend first!"
  exit 1
fi

echo "📡 Using API URL: $API_URL"

# Change to frontend directory
cd ../../../frontend

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Create production environment file
echo "📝 Creating production environment configuration..."
cat > .env.production <<EOF
# API Configuration for $ENVIRONMENT (ap-south-1)
VITE_API_URL=$API_URL

# Environment
VITE_ENVIRONMENT=$ENVIRONMENT

# Optional: Sentry for error tracking
VITE_SENTRY_DSN=
EOF

# Build frontend
echo "🔨 Building frontend assets..."
npm run build

# Change to infrastructure directory
cd ../infrastructure

# Deploy frontend stack
echo "🚢 Deploying frontend stack..."
npx cdk deploy CompliCal-Frontend-$ENVIRONMENT --require-approval never

# Get CloudFront URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-Frontend-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
  --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-Frontend-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

echo ""
echo "=================================================="
echo "✅ Frontend Deployment Complete!"
echo "=================================================="
echo "CloudFront URL: https://$CLOUDFRONT_URL"
echo "Distribution ID: $DISTRIBUTION_ID"
echo ""
echo "Next steps:"
echo "1. Configure DNS: Point your domain to $CLOUDFRONT_URL"
echo "2. Test the application: https://$CLOUDFRONT_URL"
echo "3. Invalidate cache if needed: aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths '/*'"