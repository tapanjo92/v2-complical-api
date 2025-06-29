# CompliCal API Testing Guide

## Quick Start

```bash
# Set environment
export API_URL="https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test"

# Test health endpoint
curl $API_URL/health

# Test with API key
curl -H "x-api-key: YOUR_KEY" "$API_URL/v1/deadlines?country=AU"
```

## Authentication Flow

### 1. Register User
```bash
curl -X POST $API_URL/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "companyName": "Test Co"
  }'
```

### 2. Login (Get JWT)
```bash
curl -c cookies.txt -X POST $API_URL/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### 3. Create API Key
```bash
curl -b cookies.txt -X POST $API_URL/v1/auth/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Key"}'
```

## API Endpoints

### Deadlines - Simplified
```bash
# Multi-country query
curl -H "x-api-key: YOUR_KEY" "$API_URL/v1/deadlines?countries=AU,NZ"

# Filter by year/month
curl -H "x-api-key: YOUR_KEY" "$API_URL/v1/deadlines?country=AU&year=2025&month=3"
```

### Deadlines - Traditional
```bash
# Australia
curl -H "x-api-key: YOUR_KEY" "$API_URL/v1/au/ato/deadlines"

# New Zealand
curl -H "x-api-key: YOUR_KEY" "$API_URL/v1/nz/ird/deadlines"
```

## Usage Tracking

### Check Usage
```bash
curl -b cookies.txt $API_URL/v1/auth/usage
```

**Key Points:**
- 10,000 calls per user per month
- Rolling 30-day window
- All API keys share the same limit
- Usage updates within 1-2 minutes (async)

## Rate Limiting Test

```bash
# Make multiple calls
for i in {1..10}; do
  curl -H "x-api-key: YOUR_KEY" "$API_URL/v1/deadlines?country=AU" \
    -s -o /dev/null -w "Call $i: %{http_code}\n"
done

# Check usage after 2 minutes
curl -b cookies.txt $API_URL/v1/auth/usage | jq '.current_period'
```

## Common Issues

1. **403 Forbidden**: Invalid or missing API key
2. **401 Unauthorized**: JWT expired (login again)
3. **429 Too Many Requests**: Usage limit exceeded
4. **500 Error on usage endpoint**: JWT parsing issue (fixed in latest deployment)