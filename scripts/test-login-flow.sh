#!/bin/bash

# Test login flow to debug the issue

# Configuration - set these as environment variables or pass as arguments
API_URL=${1:-${API_URL:-"https://api.getcomplical.com"}}
FRONTEND_URL=${2:-${FRONTEND_URL:-"https://app.getcomplical.com"}}
REGION=${3:-${AWS_REGION:-"us-east-1"}}

echo "=============================================="
echo "Testing Login Flow - Debugging 401/404 Issue"
echo "=============================================="

# Create a test user
TIMESTAMP=$(date +%s)
TEST_EMAIL="debug-test-${TIMESTAMP}@example.com"
TEST_PASSWORD="SecurePass123!"

echo -e "\n1. Creating test user..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/v1/auth/register" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_URL}" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"companyName\":\"Debug Test\"}")

echo "Register response: $REGISTER_RESPONSE"

# Test login and capture all headers
echo -e "\n2. Testing login with verbose output..."
echo "Sending login request..."

# Use -i to include headers in output
LOGIN_FULL_RESPONSE=$(curl -s -i -c /tmp/cookies.txt -X POST "${API_URL}/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_URL}" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

# Extract headers and body
LOGIN_HEADERS=$(echo "$LOGIN_FULL_RESPONSE" | sed -n '1,/^\r$/p')
LOGIN_BODY=$(echo "$LOGIN_FULL_RESPONSE" | sed -n '/^\r$/,$p' | tail -n +2)

echo -e "\n3. Login Response Headers:"
echo "$LOGIN_HEADERS"

echo -e "\n4. Login Response Body:"
echo "$LOGIN_BODY" | jq '.' 2>/dev/null || echo "$LOGIN_BODY"

# Check cookies
echo -e "\n5. Cookies set:"
cat /tmp/cookies.txt | grep -v "^#" | awk '{print $6"="substr($7, 1, 20)"..."}'

# Extract session info
SESSION_ID=$(echo "$LOGIN_BODY" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
CSRF_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)

echo -e "\n6. Testing authenticated endpoints..."

# Test usage endpoint (this was failing in the earlier test)
echo -e "\na) Testing /v1/auth/usage endpoint..."
USAGE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b /tmp/cookies.txt \
  -X GET "${API_URL}/v1/auth/usage" \
  -H "Origin: ${FRONTEND_URL}")

USAGE_BODY=$(echo "$USAGE_RESPONSE" | head -n -1)
USAGE_STATUS=$(echo "$USAGE_RESPONSE" | tail -n 1 | cut -d: -f2)

echo "Usage endpoint status: $USAGE_STATUS"
echo "Usage response: $USAGE_BODY"

# Test API keys endpoint
echo -e "\nb) Testing /v1/auth/api-keys endpoint..."
KEYS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -b /tmp/cookies.txt \
  -X GET "${API_URL}/v1/auth/api-keys" \
  -H "Origin: ${FRONTEND_URL}")

KEYS_BODY=$(echo "$KEYS_RESPONSE" | head -n -1)
KEYS_STATUS=$(echo "$KEYS_RESPONSE" | tail -n 1 | cut -d: -f2)

echo "API Keys endpoint status: $KEYS_STATUS"
echo "API Keys response: $(echo $KEYS_BODY | cut -c1-100)..."

# Test with both cookie and Authorization header
echo -e "\n7. Testing with Authorization header (backward compatibility)..."
if [ ! -z "$LOGIN_BODY" ]; then
  ID_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"idToken":"[^"]*' | cut -d'"' -f4)
  if [ ! -z "$ID_TOKEN" ]; then
    echo "Found idToken, testing with Authorization header..."
    
    AUTH_USAGE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X GET "${API_URL}/v1/auth/usage" \
      -H "Origin: ${FRONTEND_URL}" \
      -H "Authorization: Bearer ${ID_TOKEN}")
    
    AUTH_STATUS=$(echo "$AUTH_USAGE" | tail -n 1 | cut -d: -f2)
    echo "Usage with Auth header status: $AUTH_STATUS"
  fi
fi

# Check what the frontend expects
echo -e "\n8. Checking frontend expectations..."
echo "The frontend likely expects:"
echo "- Session cookie to be set"
echo "- User data in localStorage (complical-auth)"
echo "- Successful navigation to /dashboard"

# Simulate what happens after login
echo -e "\n9. What happens after successful login:"
echo "- Frontend receives login response with user data"
echo "- Sets user in auth store (Zustand)"
echo "- Attempts to navigate to /dashboard"
echo "- Dashboard route checks for authentication"
echo "- If auth check fails -> redirect to login (causing 401/404)"

# Clean up
rm -f /tmp/cookies.txt

echo -e "\n=============================================="
echo "Debug Summary:"
echo "- Login API call: SUCCESS"
echo "- Session created: ${SESSION_ID:0:20}..."
echo "- Cookies set: YES"
echo "- Auth endpoints: Check results above"
echo "=============================================="