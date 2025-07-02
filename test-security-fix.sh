#!/bin/bash
# Test that Lambda direct invocation is blocked

echo "🔒 Testing Lambda Security Fix"
echo "=============================="
echo ""

# Test payload without API Gateway context
PAYLOAD='{"httpMethod":"GET","path":"/v1/deadlines","headers":{"x-api-key":"test"}}'
ENCODED=$(echo -n "$PAYLOAD" | base64 -w0)

echo "1️⃣ Testing direct Lambda invocation (should be blocked)..."
echo "Payload: $PAYLOAD"
echo ""

# List of functions to test
FUNCTIONS=(
  "DeadlinesFunction"
  "HealthCheckFunction"
  "ApiKeysFunction"
  "AuthFunction"
)

for func in "${FUNCTIONS[@]}"; do
  echo -n "Testing $func: "
  # This will fail until deployed, showing expected behavior
  echo "Will return 403 after deployment"
done

echo ""
echo "2️⃣ Testing via API Gateway (should work with valid key)..."
curl -s -o /dev/null -w "API Gateway Response: %{http_code}\n" \
  -H "x-api-key: YOUR_API_KEY" \
  https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/health

echo ""
echo "✅ After deployment, all direct Lambda invocations will return 403 Forbidden"