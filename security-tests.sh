#!/bin/bash
# CompliCal API Security Test Suite

API_URL="https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test"
echo "🔒 COMPLICAL API SECURITY TESTS"
echo "================================"
echo ""

# Test 1: API Key Brute Force Protection
echo "1️⃣ Testing API Key Validation..."
echo -n "  Empty key: "
curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/deadlines" && echo " ❌ FAIL - Should be 403" || echo ""

echo -n "  Invalid key: "
curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: invalid123" "$API_URL/v1/deadlines" && echo ""

echo -n "  SQL Injection in key: "
curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: ' OR '1'='1" "$API_URL/v1/deadlines" && echo ""

echo -n "  Malformed key: "
curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $(python3 -c 'print("A"*1000)')" "$API_URL/v1/deadlines" && echo ""
echo ""

# Test 2: Injection Attacks
echo "2️⃣ Testing Injection Vulnerabilities..."
echo -n "  SQL Injection in params: "
curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/deadlines?country=' OR 1=1--" && echo ""

echo -n "  NoSQL Injection: "
curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/deadlines?country[\$ne]=null" && echo ""

echo -n "  Command Injection: "
curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/deadlines?country=AU;cat+/etc/passwd" && echo ""

echo -n "  XSS in params: "
curl -s "$API_URL/v1/deadlines?country=<script>alert(1)</script>" | grep -q "<script>" && echo "❌ FAIL - XSS reflected" || echo "✅ PASS"
echo ""

# Test 3: Authentication Bypass
echo "3️⃣ Testing Authentication Bypass..."
echo -n "  Direct Lambda invoke: "
aws lambda invoke --function-name CompliCal-API-test-DeadlinesFunctionFFA195DF-En4yo3qi3sFN \
  --payload '{"httpMethod":"GET","path":"/v1/deadlines"}' \
  /tmp/lambda-test.json 2>/dev/null && \
  cat /tmp/lambda-test.json | jq -r '.statusCode' | grep -q "403" && echo "✅ PASS" || echo "❌ FAIL"

echo -n "  Authorization header confusion: "
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer fake-token" \
  -H "x-api-key: invalid" \
  "$API_URL/v1/deadlines" && echo ""
echo ""

# Test 4: Rate Limiting & DoS
echo "4️⃣ Testing Rate Limiting..."
echo -n "  Burst requests (10 in 1s): "
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code} " -H "x-api-key: test" "$API_URL/v1/deadlines" &
done
wait
echo ""

echo -n "  Large payload: "
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$(python3 -c 'print("{\"data\":\"" + "A"*1000000 + "\"}")')" \
  "$API_URL/v1/auth/login" && echo ""
echo ""

# Test 5: Information Disclosure
echo "5️⃣ Testing Information Disclosure..."
echo -n "  Error details leak: "
curl -s "$API_URL/v1/deadlines?country=INVALID" | grep -E "(stack|trace|internal)" && echo "❌ FAIL" || echo "✅ PASS"

echo -n "  Headers leak: "
curl -s -I "$API_URL/health" | grep -E "(Server:|X-Powered-By:|X-AspNet-Version:)" && echo "❌ FAIL" || echo "✅ PASS"

echo -n "  Debug endpoints: "
curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/debug" | grep -q "404" && echo "✅ PASS" || echo "❌ FAIL"
echo ""

# Test 6: CORS & Headers
echo "6️⃣ Testing Security Headers..."
HEADERS=$(curl -s -I "$API_URL/health")
echo -n "  HSTS: "
echo "$HEADERS" | grep -q "Strict-Transport-Security" && echo "✅ PASS" || echo "❌ FAIL"

echo -n "  CSP: "
echo "$HEADERS" | grep -q "Content-Security-Policy" && echo "✅ PASS" || echo "❌ FAIL"

echo -n "  X-Frame-Options: "
echo "$HEADERS" | grep -q "X-Frame-Options" && echo "✅ PASS" || echo "❌ FAIL"

echo -n "  CORS wildcard: "
echo "$HEADERS" | grep "Access-Control-Allow-Origin: \*" && echo "❌ FAIL" || echo "✅ PASS"
echo ""

# Test 7: Business Logic
echo "7️⃣ Testing Business Logic..."
echo -n "  Negative usage count: "
# Would need to test if we can manipulate usage counts

echo -n "  Deleted key reuse: "
# Test if deleted keys still work due to cache

echo -n "  Usage count manipulation: "
# Test if we can bypass billing
echo ""

echo "📊 Security Test Complete!"
echo "Review any ❌ FAIL results above"