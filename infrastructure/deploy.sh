#!/bin/bash

# V2 CompliCal Frontend Deployment Script

set -e

echo "🚀 Starting V2 CompliCal Frontend Deployment..."

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

# Bootstrap CDK (only needed once per account/region)
echo "🥾 Bootstrapping CDK (if needed)..."
npx cdk bootstrap || true

# Deploy
echo "🚀 Deploying to AWS..."
npm run deploy

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update frontend/.env with your API URL"
echo "2. Check CloudFront URL in the CDK output"
echo "3. Wait 5-10 minutes for CloudFront distribution to be fully deployed"