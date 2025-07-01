#!/bin/bash
# Test API Usage Metering System

ENVIRONMENT=${1:-test}
API_KEY=$2
REGION="ap-south-1"

if [ -z "$API_KEY" ]; then
  echo "Usage: $0 <environment> <api-key>"
  echo "Example: $0 test YOUR_API_KEY"
  exit 1
fi

# Get API endpoint
API_URL=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-API-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

echo "🧪 Testing API Usage Metering"
echo "Environment: $ENVIRONMENT"
echo "API: $API_URL"
echo ""

# Test 1: Successful call (should count)
echo "1️⃣ Making successful API call..."
curl -s -X GET "${API_URL}v1/deadlines?limit=1" \
  -H "x-api-key: $API_KEY" \
  -o /dev/null -w "Status: %{http_code}\n"

# Test 2: Failed call (should NOT count)
echo "2️⃣ Making failed API call..."
curl -s -X POST "${API_URL}v1/invalid" \
  -H "x-api-key: $API_KEY" \
  -o /dev/null -w "Status: %{http_code}\n"

# Wait for processing
echo ""
echo "⏳ Waiting 60 seconds for batch processing..."
sleep 60

# Check usage
echo ""
echo "3️⃣ Checking usage counts..."
KEY_PREFIX=${API_KEY:0:8}
aws dynamodb scan \
  --table-name complical-api-keys-$ENVIRONMENT \
  --filter-expression "begins_with(keyPrefix, :prefix)" \
  --expression-attribute-values "{\":prefix\": {\"S\": \"$KEY_PREFIX\"}}" \
  --region $REGION \
  --query 'Items[0].[usageCount.N,successfulCalls.N,failedCalls.N]' \
  --output json | jq -r '.[] | "Total: \(.[0]), Success: \(.[1]), Failed: \(.[2])"'

echo ""
echo "📊 Dashboard: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=complical-api-usage-$ENVIRONMENT"