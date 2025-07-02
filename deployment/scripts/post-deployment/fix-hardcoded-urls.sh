#!/bin/bash
# Fix all hardcoded API URLs in the frontend
# This script updates all references from the old API to the new one

set -e

# Configuration
OLD_API_URL="https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test"
OLD_API_HOST="https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com"
ENVIRONMENT=${1:-prod}
REGION=${2:-us-east-1}

echo "=================================================="
echo "🔧 Fixing Hardcoded URLs in Frontend"
echo "=================================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "=================================================="

# Get the actual API URL dynamically
NEW_API_URL=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-API-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

if [ -z "$NEW_API_URL" ]; then
  echo "❌ Error: API stack not found in $REGION"
  exit 1
fi

# Remove trailing slash if present
NEW_API_URL=${NEW_API_URL%/}
NEW_API_HOST=$(echo $NEW_API_URL | sed 's|/[^/]*$||')

echo "📡 Found API URL: $NEW_API_URL"
echo "📡 API Host: $NEW_API_HOST"

# Change to frontend directory
cd ../../../frontend

# Fix all occurrences in source files
echo ""
echo "🔍 Fixing source files..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec \
  sed -i "s|$OLD_API_URL|$NEW_API_URL|g" {} \;

# Fix index.html preconnect
echo "🔍 Fixing index.html..."
sed -i "s|$OLD_API_HOST|$NEW_API_HOST|g" index.html

# Fix vite.config.ts
echo "🔍 Fixing vite.config.ts..."
sed -i "s|$OLD_API_URL|$NEW_API_URL|g" vite.config.ts

# Fix api-client.ts fallback URL
echo "🔍 Fixing api-client.ts fallback..."
sed -i "s|$OLD_API_URL|$NEW_API_URL|g" src/lib/api-client.ts

# Count changes
CHANGES=$(git diff --name-only | wc -l)

echo ""
echo "=================================================="
echo "✅ Fixed hardcoded URLs in $CHANGES files"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Build frontend: npm run build"
echo "3. Deploy: ../deployment/scripts/us-east-1/deploy-frontend.sh $ENVIRONMENT"
echo ""
echo "Or run all at once:"
echo "npm run build && ../deployment/scripts/$REGION/deploy-frontend.sh $ENVIRONMENT"