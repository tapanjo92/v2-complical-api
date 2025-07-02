#!/bin/bash
# Test API Usage Metering System
# Works with both us-east-1 and ap-south-1

set -e

# Configuration
ENVIRONMENT=${1:-test}
API_KEY=$2
REGION=${3:-${AWS_REGION:-us-east-1}}

if [ -z "$API_KEY" ]; then
  echo "Usage: $0 <environment> <api-key> [region]"
  echo "Example: $0 prod YOUR_API_KEY us-east-1"
  exit 1
fi

echo "=================================================="
echo "🧪 Testing API Usage Metering"
echo "=================================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "API Key: ${API_KEY:0:8}..."
echo "=================================================="

# Get API endpoint from CloudFormation
API_URL=$(aws cloudformation describe-stacks \
  --stack-name CompliCal-API-$ENVIRONMENT \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

if [ -z "$API_URL" ]; then
  echo "❌ Error: API stack not found in $REGION"
  exit 1
fi

echo "📡 API URL: $API_URL"
echo ""

# Test 1: Successful call (should count)
echo "1️⃣ Making successful API call..."
HTTP_CODE=$(curl -s -X GET "${API_URL}v1/deadlines?limit=1" \
  -H "x-api-key: $API_KEY" \
  -o /dev/null -w "%{http_code}")
echo "   Status: $HTTP_CODE"

# Test 2: Failed call (should NOT count in Kinesis-based system)
echo ""
echo "2️⃣ Making failed API call (invalid endpoint)..."
HTTP_CODE=$(curl -s -X POST "${API_URL}v1/invalid" \
  -H "x-api-key: $API_KEY" \
  -o /dev/null -w "%{http_code}")
echo "   Status: $HTTP_CODE"

# Test 3: Another successful call
echo ""
echo "3️⃣ Making another successful API call..."
HTTP_CODE=$(curl -s -X GET "${API_URL}v1/deadlines?country=AU" \
  -H "x-api-key: $API_KEY" \
  -o /dev/null -w "%{http_code}")
echo "   Status: $HTTP_CODE"

# Wait for Kinesis processing
echo ""
echo "⏳ Waiting 60 seconds for Kinesis batch processing..."
echo "   (Kinesis processes records in real-time, but DynamoDB updates are batched)"
sleep 60

# Check usage in DynamoDB
echo ""
echo "4️⃣ Checking usage counts..."
KEY_PREFIX=${API_KEY:0:8}

# Query the API keys table
USAGE_DATA=$(aws dynamodb scan \
  --table-name complical-api-keys-$ENVIRONMENT \
  --filter-expression "begins_with(keyPrefix, :prefix)" \
  --expression-attribute-values "{\":prefix\": {\"S\": \"$KEY_PREFIX\"}}" \
  --region $REGION \
  --query 'Items[0]' \
  --output json 2>/dev/null || echo "{}")

if [ "$USAGE_DATA" != "{}" ] && [ "$USAGE_DATA" != "null" ]; then
  echo ""
  echo "📊 Usage Statistics:"
  echo "$USAGE_DATA" | jq -r '
    "   Total Usage Count: \(.usageCount.N // "0")
   Successful Calls: \(.successfulCalls.N // "0")
   Failed Calls: \(.failedCalls.N // "0")
   API Key Name: \(.name.S // "Unknown")
   Last Used: \(.lastUsed.S // "Never")"
  '
else
  echo "❌ No usage data found for this API key"
  echo "   This could mean:"
  echo "   - The API key is invalid"
  echo "   - Processing is still in progress"
  echo "   - There's an issue with the usage tracking"
fi

# Check Kinesis stream metrics
echo ""
echo "5️⃣ Checking Kinesis Stream..."
STREAM_NAME="complical-usage-stream-$ENVIRONMENT"
RECORDS=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/Kinesis \
  --metric-name IncomingRecords \
  --dimensions Name=StreamName,Value=$STREAM_NAME \
  --statistics Sum \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --region $REGION \
  --query 'Datapoints[0].Sum' \
  --output text 2>/dev/null || echo "0")

echo "   Records in last 5 minutes: ${RECORDS:-0}"

# Show dashboards
echo ""
echo "📊 View Real-time Metrics:"
echo "   Kinesis Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=complical-usage-analytics-$ENVIRONMENT"
echo "   API Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=complical-api-usage-$ENVIRONMENT"

echo ""
echo "=================================================="
echo "✅ Usage Metering Test Complete"
echo "=================================================="
echo ""
echo "Note: With Kinesis-based metering:"
echo "- Only successful (2xx) calls are counted"
echo "- Processing happens in real-time"
echo "- DynamoDB updates are batched for efficiency"
echo "- Check the Kinesis dashboard for real-time data"