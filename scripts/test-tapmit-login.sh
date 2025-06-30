#!/bin/bash

# Test login for tapmit200@gmail.com

API_URL="https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test"
FRONTEND_URL="https://d1v4wmxs6wjlqf.cloudfront.net"

echo "=============================================="
echo "Testing Login for tapmit200@gmail.com"
echo "=============================================="

# Ask for password
echo -n "Please enter your password: "
read -s PASSWORD
echo

# Test login
echo -e "\n1. Testing Login..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "${API_URL}/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_URL}" \
  -d "{\"email\":\"tapmit200@gmail.com\",\"password\":\"${PASSWORD}\"}")

echo "Login Response: $LOGIN_RESPONSE"

if [[ "$LOGIN_RESPONSE" =~ "Login successful" ]]; then
  echo "✅ Login successful!"
  
  # Extract values
  SESSION_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
  CSRF_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
  
  echo -e "\nSession ID: $SESSION_ID"
  echo "CSRF Token: $(echo $CSRF_TOKEN | cut -c1-20)..."
  
  # Test authenticated call
  echo -e "\n2. Testing Authenticated API Call (Usage)..."
  USAGE_RESPONSE=$(curl -s -b cookies.txt -X GET "${API_URL}/v1/auth/usage" \
    -H "Origin: ${FRONTEND_URL}")
  
  echo "Usage Response: $USAGE_RESPONSE"
  
  # List API keys
  echo -e "\n3. Testing List API Keys..."
  API_KEYS_RESPONSE=$(curl -s -b cookies.txt -X GET "${API_URL}/v1/auth/api-keys" \
    -H "Origin: ${FRONTEND_URL}")
  
  echo "API Keys Response: $API_KEYS_RESPONSE"
  
  # Logout
  echo -e "\n4. Testing Logout..."
  LOGOUT_RESPONSE=$(curl -s -b cookies.txt -X POST "${API_URL}/v1/auth/logout" \
    -H "Origin: ${FRONTEND_URL}")
  
  echo "Logout Response: $LOGOUT_RESPONSE"
  
else
  echo "❌ Login failed!"
  echo "Common issues:"
  echo "1. Incorrect password"
  echo "2. Password may contain special characters that need escaping"
  echo "3. Try logging in through the web interface: ${FRONTEND_URL}/login"
fi

# Clean up
rm -f cookies.txt

echo -e "\n=============================================="