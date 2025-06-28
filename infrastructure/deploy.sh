#!/bin/bash

# V2 CompliCal Full Stack Deployment Script

set -e

echo "🚀 Starting V2 CompliCal Deployment..."

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from infrastructure directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing CDK dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Build frontend
echo "🎨 Building frontend..."
cd ../frontend
npm install
npm run build

# Return to infrastructure directory
cd ../infrastructure

# Deploy all stacks
echo "🚀 Deploying to AWS..."
echo "This will deploy:"
echo "  - DynamoDB tables"
echo "  - Cognito authentication" 
echo "  - API Gateway + Lambda functions"
echo "  - Frontend (S3 + CloudFront)"
echo ""
npx cdk deploy --all --require-approval never

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Check the CDK outputs for API Gateway URL and CloudFront URL"
echo "2. Update frontend/.env with your API URL if needed"
echo "3. Wait 5-10 minutes for CloudFront distribution to be fully deployed"