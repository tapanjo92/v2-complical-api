#!/bin/bash

# Test Session-Based Authentication

API_URL="${API_URL:-https://api.getcomplical.com}"
FRONTEND_URL="${FRONTEND_URL:-https://app.getcomplical.com}"

echo "===================================="
echo "Testing Session-Based Authentication"
echo "===================================="

# Test 1: Register a new user
echo -e "\n1. Testing Registration..."
TIMESTAMP=$(date +%s)
TEST_EMAIL="session-test-${TIMESTAMP}@example.com"
TEST_PASSWORD="SecurePass123!"

REGISTER_RESPONSE=$(curl -s -c cookies.txt -X POST "${API_URL}/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"companyName\":\"Session Test Co\"}")

echo "Register Response: $REGISTER_RESPONSE"

# Test 2: Login with session
echo -e "\n2. Testing Login with Session..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -b cookies.txt -X POST "${API_URL}/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

echo "Login Response: $LOGIN_RESPONSE"

# Extract CSRF token
CSRF_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
echo "CSRF Token: $CSRF_TOKEN"

# Check cookies
echo -e "\n3. Checking Cookies..."
echo "Cookies stored:"
cat cookies.txt | grep -E "(session_id|id_token|csrf_token)" | awk '{print $6 "=" substr($7, 1, 20) "..."}'

# Test 3: Create API Key using session
echo -e "\n4. Testing API Key Creation with Session..."
API_KEY_RESPONSE=$(curl -s -b cookies.txt -X POST "${API_URL}/v1/auth/api-keys" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -d '{"name":"Session Test Key","description":"Testing session auth"}')

echo "API Key Response: $API_KEY_RESPONSE"

# Test 4: List API Keys using session
echo -e "\n5. Testing API Key List with Session..."
LIST_RESPONSE=$(curl -s -b cookies.txt -X GET "${API_URL}/v1/auth/api-keys" \
  -H "Content-Type: application/json")

echo "List Response: $LIST_RESPONSE"

# Test 5: Test Webhook creation (requires session)
echo -e "\n6. Testing Webhook Creation with Session..."
WEBHOOK_RESPONSE=$(curl -s -b cookies.txt -X POST "${API_URL}/v1/auth/webhooks" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -d '{"url":"https://example.com/webhook","events":["usage.threshold.80","usage.threshold.100"]}')

echo "Webhook Response: $WEBHOOK_RESPONSE"

# Test 6: Test logout
echo -e "\n7. Testing Logout..."
LOGOUT_RESPONSE=$(curl -s -b cookies.txt -c cookies.txt -X POST "${API_URL}/v1/auth/logout" \
  -H "Content-Type: application/json")

echo "Logout Response: $LOGOUT_RESPONSE"

# Test 7: Verify session is invalid after logout
echo -e "\n8. Testing Access After Logout..."
AFTER_LOGOUT=$(curl -s -b cookies.txt -X GET "${API_URL}/v1/auth/api-keys" \
  -H "Content-Type: application/json")

echo "After Logout Response: $AFTER_LOGOUT"

# Clean up
rm -f cookies.txt

echo -e "\n===================================="
echo "Session Auth Test Complete"
echo "===================================="