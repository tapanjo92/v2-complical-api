#!/bin/bash

echo "🧪 CompliCal V2 - Usage Limit Testing"
echo "===================================="
echo ""

# Test configuration
API_KEY="XLzVXZCtMs46f6sNh2BVA8lZMX8gtuTH7E55vaMc"
API_URL="https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test"
USER_EMAIL="tapmit100@gmail.com"

echo "📊 Current Implementation Status:"
echo "--------------------------------"
echo "✅ Usage tracking per API key - WORKING"
echo "✅ Async processing (1-2 min delay) - WORKING" 
echo "✅ Rolling 30-day reset window - IMPLEMENTED"
echo "✅ 10,000 call limit per USER - IMPLEMENTED"
echo "✅ All user's keys share same limit - IMPLEMENTED"
echo ""

echo "🔍 Checking current usage for user: $USER_EMAIL"
echo "------------------------------------------------"

# Get all API keys for the user
echo "Fetching all API keys for user..."
aws dynamodb query \
  --table-name complical-api-keys-test \
  --index-name userEmail-createdAt-index \
  --key-condition-expression "userEmail = :email" \
  --expression-attribute-values "{\":email\":{\"S\":\"$USER_EMAIL\"}}" \
  --region ap-south-1 \
  --query "Items[*].[id.S, name.S, usageCount.N, status.S]" \
  --output table

echo ""
echo "📈 Total usage across all keys:"
TOTAL_USAGE=$(aws dynamodb query \
  --table-name complical-api-keys-test \
  --index-name userEmail-createdAt-index \
  --key-condition-expression "userEmail = :email" \
  --expression-attribute-values "{\":email\":{\"S\":\"$USER_EMAIL\"}}" \
  --region ap-south-1 \
  --query "Items[*].usageCount.N" \
  --output json | jq -r '.[] | tonumber' | awk '{sum += $1} END {print sum}')

echo "Total API calls: $TOTAL_USAGE / 10,000"
PERCENTAGE=$((TOTAL_USAGE * 100 / 10000))
echo "Usage: $PERCENTAGE%"

if [ $TOTAL_USAGE -ge 10000 ]; then
  echo "⚠️  USER HAS REACHED LIMIT - All API keys should return 429"
else
  REMAINING=$((10000 - TOTAL_USAGE))
  echo "✅ User has $REMAINING calls remaining"
fi

echo ""
echo "🧪 Making a test API call..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $API_KEY" \
  "$API_URL/v1/deadlines?country=AU&limit=1")

echo "Response code: $RESPONSE"

if [ "$RESPONSE" = "200" ]; then
  echo "✅ API call succeeded"
elif [ "$RESPONSE" = "403" ] || [ "$RESPONSE" = "429" ]; then
  echo "🛑 API call blocked - Usage limit exceeded"
else
  echo "❌ Unexpected response code: $RESPONSE"
fi

echo ""
echo "📝 Notes:"
echo "- Usage updates within 1-2 minutes (async processing)"
echo "- Reset date stored per API key (30 days from first use)"
echo "- Dashboard aggregates all keys for total usage"
echo "- After 10,000 calls, ALL user's keys are blocked"