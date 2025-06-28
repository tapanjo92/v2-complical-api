# Complete Testing Guide - CompliCal API

This guide provides all commands needed to test the CompliCal API from start to finish.

## Prerequisites

- AWS CLI configured
- curl installed
- jq installed (optional, for pretty JSON output)

## Environment Variables

```bash
# Set these for your environment
export API_URL="https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test"
export REGION="ap-south-1"
```

## 1. Health Check (No Authentication Required)

```bash
# Basic health check
curl -X GET $API_URL/health

# Health check with pretty output
curl -X GET $API_URL/health | jq '.'
```

## 2. User Registration and Authentication

### 2.1 Register a New User

```bash
# Register user
curl -X POST $API_URL/v1/auth/register \
  -H "Content-Type: application/json" \
  --data '{
    "email": "testuser@example.com",
    "password": "TestPass123$",
    "companyName": "Test Company Ltd"
  }' | jq '.'
```

### 2.2 Login and Get Cookies

```bash
# Login and save cookies
curl -c cookies.txt -X POST $API_URL/v1/auth/login \
  -H "Content-Type: application/json" \
  --data '{
    "email": "testuser@example.com",
    "password": "TestPass123$"
  }' | jq '.'

# Check cookies were saved
cat cookies.txt
```

## 3. API Key Management

### 3.1 Create API Key

```bash
# Create API key using cookies
curl -b cookies.txt -X POST $API_URL/v1/auth/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "description": "Main API key for production use"
  }' | jq '.'

# Save the API key from the response!
export API_KEY="<paste-your-api-key-here>"
```

### 3.2 List Your API Keys

```bash
# List all your API keys
curl -b cookies.txt -X GET $API_URL/v1/auth/api-keys | jq '.'
```

### 3.3 Delete an API Key

```bash
# Delete API key (replace with actual key ID)
curl -b cookies.txt -X DELETE $API_URL/v1/auth/api-keys/<key-id>
```

## 4. Testing API Endpoints with API Key

### 4.1 Simplified Global Endpoint (Calendarific-style)

```bash
# Get all Australian deadlines
curl -X GET "$API_URL/v1/deadlines?country=AU" \
  -H "x-api-key: $API_KEY" | jq '.'

# Get deadlines for specific year
curl -X GET "$API_URL/v1/deadlines?country=AU&year=2025" \
  -H "x-api-key: $API_KEY" | jq '.'

# Get deadlines for specific month
curl -X GET "$API_URL/v1/deadlines?country=AU&year=2025&month=3" \
  -H "x-api-key: $API_KEY" | jq '.'

# Filter by type
curl -X GET "$API_URL/v1/deadlines?country=AU&type=BAS_QUARTERLY" \
  -H "x-api-key: $API_KEY" | jq '.'

# Multiple countries
curl -X GET "$API_URL/v1/deadlines?countries=AU,NZ" \
  -H "x-api-key: $API_KEY" | jq '.'

# Pagination
curl -X GET "$API_URL/v1/deadlines?country=AU&limit=10&offset=20" \
  -H "x-api-key: $API_KEY" | jq '.'
```

### 4.2 Traditional Country-Specific Endpoints

```bash
# Australian deadlines
curl -X GET "$API_URL/v1/au/deadlines" \
  -H "x-api-key: $API_KEY" | jq '.'

# New Zealand deadlines
curl -X GET "$API_URL/v1/nz/deadlines" \
  -H "x-api-key: $API_KEY" | jq '.'

# With query parameters
curl -X GET "$API_URL/v1/au/deadlines?type=PAYROLL_TAX&from_date=2025-01-01&to_date=2025-12-31" \
  -H "x-api-key: $API_KEY" | jq '.'

# With pagination
curl -X GET "$API_URL/v1/au/deadlines?limit=5" \
  -H "x-api-key: $API_KEY" | jq '.'
```

### 4.3 Agency-Specific Endpoints

```bash
# ATO deadlines
curl -X GET "$API_URL/v1/au/ato/deadlines" \
  -H "x-api-key: $API_KEY" | jq '.'

# IRD deadlines
curl -X GET "$API_URL/v1/nz/ird/deadlines" \
  -H "x-api-key: $API_KEY" | jq '.'
```

## 5. Testing Error Cases

### 5.1 No API Key

```bash
# Should return 403 Forbidden
curl -X GET "$API_URL/v1/deadlines?country=AU"
```

### 5.2 Invalid API Key

```bash
# Should return 403 Forbidden
curl -X GET "$API_URL/v1/deadlines?country=AU" \
  -H "x-api-key: invalid-key-123"
```

### 5.3 Invalid Parameters

```bash
# Invalid country
curl -X GET "$API_URL/v1/deadlines?country=XX" \
  -H "x-api-key: $API_KEY"

# Invalid date format
curl -X GET "$API_URL/v1/au/deadlines?from_date=not-a-date" \
  -H "x-api-key: $API_KEY"
```

## 6. Monitoring and Logs

### 6.1 Check API Usage

```bash
# Get your API key usage from DynamoDB
aws dynamodb get-item \
  --table-name complical-api-keys-test \
  --key '{"id":{"S":"<your-key-id>"}}' \
  --region $REGION \
  --query 'Item.{usageCount:usageCount.N,lastUsed:lastUsed.S}' \
  --output json
```

### 6.2 View Lambda Logs

```bash
# Auth function logs
aws logs tail /aws/lambda/CompliCal-API-test-AuthFunctionA1CD5E0F-81qVj3Zl0Lz2 \
  --since 5m --region $REGION

# API key authorizer logs  
aws logs tail /aws/lambda/CompliCal-API-test-ApiKeyAuthorizerFunction06E0AA0-WDeesSbzmoFR \
  --since 5m --region $REGION

# Deadlines handler logs
aws logs tail /aws/lambda/CompliCal-API-test-SimplifiedDeadlinesFunctionBE4B-4akhKNPrEcoz \
  --since 5m --region $REGION
```

### 6.3 API Gateway Logs

```bash
# View API Gateway access logs
aws logs tail /aws/apigateway/complical-test \
  --since 5m --region $REGION
```

## 7. Load Testing

### 7.1 Simple Load Test

```bash
# Run 100 requests
for i in {1..100}; do
  curl -X GET "$API_URL/v1/deadlines?country=AU" \
    -H "x-api-key: $API_KEY" \
    -o /dev/null -s -w "%{http_code} %{time_total}s\n"
  sleep 0.1
done
```

### 7.2 Concurrent Requests

```bash
# Run 10 concurrent requests
for i in {1..10}; do
  curl -X GET "$API_URL/v1/deadlines?country=AU" \
    -H "x-api-key: $API_KEY" \
    -o /dev/null -s -w "Request $i: %{http_code} %{time_total}s\n" &
done
wait
```

## 8. Data Management

### 8.1 Load Test Data

```bash
# Load sample data (if you have a data loading script)
node scripts/load-data.js
```

### 8.2 Query DynamoDB Directly

```bash
# List all deadlines
aws dynamodb scan \
  --table-name complical-deadlines-test \
  --region $REGION \
  --max-items 10 | jq '.Items[].name.S'

# Query by jurisdiction
aws dynamodb query \
  --table-name complical-deadlines-test \
  --index-name AgencyIndex \
  --key-condition-expression "GSI_PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"JURISDICTION#AU"}}' \
  --region $REGION | jq '.Items | length'
```

## 9. Cleanup

### 9.1 Logout

```bash
# Clear cookies
curl -b cookies.txt -X POST $API_URL/v1/auth/logout
rm cookies.txt
```

### 9.2 Delete Test User (Admin Only)

```bash
# This would require admin permissions
# Users can only delete their own API keys, not their accounts
```

## Common Issues and Troubleshooting

### Issue: "Invalid request body"
- Check JSON formatting, especially special characters
- Use `--data` or `--data-raw` instead of `-d` for complex passwords

### Issue: "Unauthorized" 
- Check if API key is correct
- Verify API key hasn't expired (90 days by default)
- Ensure x-api-key header is included

### Issue: "No deadlines returned"
- Check if test database has data loaded
- Verify country code is correct (AU, NZ)
- Check date filters aren't too restrictive

### Issue: Rate limit exceeded
- Default: 10 requests/second, 10,000/month
- Wait before retrying
- Contact admin for limit increase

## Useful jq Filters

```bash
# Count results
curl -X GET "$API_URL/v1/deadlines?country=AU" \
  -H "x-api-key: $API_KEY" | jq '.response.pagination.count'

# Get just deadline names
curl -X GET "$API_URL/v1/deadlines?country=AU" \
  -H "x-api-key: $API_KEY" | jq '.response.deadlines[].name'

# Filter by type locally
curl -X GET "$API_URL/v1/deadlines?country=AU" \
  -H "x-api-key: $API_KEY" | jq '.response.deadlines[] | select(.type == "BAS_QUARTERLY")'
```