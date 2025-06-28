#!/bin/bash

# V2 CompliCal Frontend-Only Deployment Script

set -e

echo "🎨 Starting V2 CompliCal Frontend-Only Deployment..."

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from infrastructure directory"
    exit 1
fi

# Build frontend
echo "🎨 Building frontend..."
cd ../frontend
npm install
npm run build

# Return to infrastructure directory
cd ../infrastructure

# Deploy only frontend stack
echo "🚀 Deploying Frontend to AWS..."
npx cdk deploy CompliCal-Frontend-test --require-approval never

echo "✅ Frontend deployment complete!"
echo ""
echo "📝 Check the CDK output for your CloudFront URL"