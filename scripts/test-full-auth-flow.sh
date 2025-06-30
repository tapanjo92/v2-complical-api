#!/bin/bash

# Test Full Authentication Flow with Fresh User

API_URL="https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test"
FRONTEND_URL="https://d1v4wmxs6wjlqf.cloudfront.net"

echo "=============================================="
echo "Testing Full Authentication Flow"
echo "=============================================="

# Generate unique test email
TIMESTAMP=$(date +%s)
TEST_EMAIL="auth-test-${TIMESTAMP}@example.com"
TEST_PASSWORD="SecureTestPass123!"
TEST_COMPANY="Test Company ${TIMESTAMP}"

echo -e "\nTest User Details:"
echo "Email: $TEST_EMAIL"
echo "Password: $TEST_PASSWORD"
echo "Company: $TEST_COMPANY"

# Test 1: Register new user
echo -e "\n1. Testing Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/v1/auth/register" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_URL}" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"companyName\":\"${TEST_COMPANY}\"}")

echo "Register Response: $REGISTER_RESPONSE"

if [[ ! "$REGISTER_RESPONSE" =~ "Registration successful" ]]; then
  echo "❌ Registration failed!"
  exit 1
fi
echo "✅ Registration successful"

# Test 2: Login with the new user
echo -e "\n2. Testing Login..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "${API_URL}/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_URL}" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

echo "Login Response: $LOGIN_RESPONSE"

if [[ ! "$LOGIN_RESPONSE" =~ "Login successful" ]]; then
  echo "❌ Login failed!"
  exit 1
fi
echo "✅ Login successful"

# Extract important values
SESSION_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
CSRF_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
ID_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"idToken":"[^"]*' | cut -d'"' -f4)

echo -e "\nExtracted values:"
echo "Session ID: ${SESSION_ID}"
echo "CSRF Token: $(echo $CSRF_TOKEN | cut -c1-20)..."
echo "ID Token: $(echo $ID_TOKEN | cut -c1-50)..."

# Test 3: Check cookies
echo -e "\n3. Checking Cookies..."
echo "Cookies set:"
cat cookies.txt | grep -E "(session_id|id_token|access_token|refresh_token|csrf_token)" | awk '{print $6 "=" substr($7, 1, 20) "..."}'

# Test 4: Test authenticated API call (get usage)
echo -e "\n4. Testing Authenticated API Call (Usage)..."
USAGE_RESPONSE=$(curl -s -b cookies.txt -X GET "${API_URL}/v1/auth/usage" \
  -H "Origin: ${FRONTEND_URL}")

echo "Usage Response: $USAGE_RESPONSE"

if [[ "$USAGE_RESPONSE" =~ "error" ]]; then
  echo "❌ Authenticated API call failed!"
else
  echo "✅ Authenticated API call successful"
fi

# Test 5: Create API Key
echo -e "\n5. Testing API Key Creation..."
API_KEY_RESPONSE=$(curl -s -b cookies.txt -X POST "${API_URL}/v1/auth/api-keys" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_URL}" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -d '{"name":"Test API Key","description":"Created during auth test"}')

echo "API Key Response: $API_KEY_RESPONSE"

if [[ "$API_KEY_RESPONSE" =~ "apiKey" ]]; then
  echo "✅ API key creation successful"
  API_KEY=$(echo "$API_KEY_RESPONSE" | grep -o '"apiKey":"[^"]*' | cut -d'"' -f4)
  echo "Created API Key: $(echo $API_KEY | cut -c1-10)..."
else
  echo "❌ API key creation failed!"
fi

# Test 6: List API Keys
echo -e "\n6. Testing List API Keys..."
LIST_KEYS_RESPONSE=$(curl -s -b cookies.txt -X GET "${API_URL}/v1/auth/api-keys" \
  -H "Origin: ${FRONTEND_URL}")

echo "List Keys Response: $LIST_KEYS_RESPONSE"

if [[ "$LIST_KEYS_RESPONSE" =~ "apiKeys" ]]; then
  echo "✅ List API keys successful"
else
  echo "❌ List API keys failed!"
fi

# Test 7: Test Webhook Creation
echo -e "\n7. Testing Webhook Creation..."
WEBHOOK_RESPONSE=$(curl -s -b cookies.txt -X POST "${API_URL}/v1/auth/webhooks" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_URL}" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -d '{"url":"https://example.com/webhook-test","events":["usage.threshold.50","usage.threshold.80"],"description":"Test webhook"}')

echo "Webhook Response: $WEBHOOK_RESPONSE"

if [[ "$WEBHOOK_RESPONSE" =~ "webhookId" ]]; then
  echo "✅ Webhook creation successful"
else
  echo "❌ Webhook creation failed!"
fi

# Test 8: Test Refresh Token
echo -e "\n8. Testing Token Refresh..."
sleep 2  # Wait a bit before refresh
REFRESH_RESPONSE=$(curl -s -b cookies.txt -c cookies.txt -X POST "${API_URL}/v1/auth/refresh" \
  -H "Origin: ${FRONTEND_URL}")

echo "Refresh Response: $REFRESH_RESPONSE"

if [[ "$REFRESH_RESPONSE" =~ "Token refreshed successfully" ]]; then
  echo "✅ Token refresh successful"
else
  echo "❌ Token refresh failed!"
fi

# Test 9: Test with new API Key
if [[ ! -z "$API_KEY" ]]; then
  echo -e "\n9. Testing API Access with API Key..."
  DEADLINE_RESPONSE=$(curl -s -X GET "${API_URL}/v1/deadlines?country=AU&limit=1" \
    -H "x-api-key: ${API_KEY}")
  
  echo "Deadline Response: $(echo $DEADLINE_RESPONSE | cut -c1-200)..."
  
  if [[ "$DEADLINE_RESPONSE" =~ "deadlines" ]]; then
    echo "✅ API key authentication successful"
  else
    echo "❌ API key authentication failed!"
  fi
fi

# Test 10: Test Logout
echo -e "\n10. Testing Logout..."
LOGOUT_RESPONSE=$(curl -s -b cookies.txt -c cookies.txt -X POST "${API_URL}/v1/auth/logout" \
  -H "Origin: ${FRONTEND_URL}")

echo "Logout Response: $LOGOUT_RESPONSE"

if [[ "$LOGOUT_RESPONSE" =~ "Logout successful" ]]; then
  echo "✅ Logout successful"
else
  echo "❌ Logout failed!"
fi

# Test 11: Verify access denied after logout
echo -e "\n11. Testing Access After Logout..."
AFTER_LOGOUT=$(curl -s -b cookies.txt -X GET "${API_URL}/v1/auth/api-keys" \
  -H "Origin: ${FRONTEND_URL}")

echo "After Logout Response: $AFTER_LOGOUT"

if [[ "$AFTER_LOGOUT" =~ "Unauthorized" ]]; then
  echo "✅ Access properly denied after logout"
else
  echo "❌ Access not properly denied after logout!"
fi

# Clean up
rm -f cookies.txt

echo -e "\n=============================================="
echo "Test Summary"
echo "=============================================="
echo "Test User: $TEST_EMAIL"
echo "All tests completed. Check results above."
echo "=============================================="