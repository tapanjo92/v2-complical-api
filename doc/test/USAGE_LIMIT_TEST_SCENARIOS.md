# CompliCal V2 - Usage Limit Test Scenarios

## Key Business Rules

1. **10,000 API calls per user per month** (not per key)
2. **Rolling 30-day window** (not calendar month)
3. **Maximum 5 API keys per user**
4. **All keys share the same usage pool**

## Test Scenarios

### 1. Usage Aggregation Across Keys
**Setup:**
- User creates 3 API keys: "Production", "Development", "Testing"
- Make 2,000 calls with "Production" key
- Make 3,000 calls with "Development" key
- Make 1,000 calls with "Testing" key

**Expected:**
- Dashboard shows total usage: 6,000 calls (60% of limit)
- Each key shows its individual usage
- All keys can still make calls (under 10,000 limit)

### 2. Rate Limit Enforcement at 10,000
**Setup:**
- User has made 9,999 API calls across all keys
- Attempt to make one more call with any key

**Expected:**
- Call #10,000 succeeds with 200 OK
- Call #10,001 fails with 429 Too Many Requests
- Error message: "Monthly API limit exceeded. Usage resets on [date]"
- ALL user's keys are blocked (not just the one that hit the limit)

### 3. Rolling 30-Day Reset
**Setup:**
- User first API call on June 1st at 10:00 AM
- User hits 10,000 limit on June 15th
- Wait until July 1st at 10:01 AM (30 days + 1 minute)

**Expected:**
- Usage count resets to 0
- All API keys work again
- New reset date is July 31st at 10:01 AM

### 4. Five Key Maximum
**Setup:**
- User has 5 active API keys
- Attempt to create a 6th key

**Expected:**
- Error message: "Maximum 5 API keys allowed per account"
- Must revoke an existing key to create a new one

### 5. Usage Tracking Async Delay
**Setup:**
- Make 10 API calls in rapid succession
- Check dashboard immediately
- Wait 2 minutes and check again

**Expected:**
- Immediate check: May show old count (async processing)
- After 2 minutes: Shows correct count (+10)
- Notice on dashboard: "Usage tracking is asynchronous"

## API Responses

### Under Limit (< 10,000 calls)
```json
{
  "data": {...},
  "meta": {
    "usage": {
      "current": 5234,
      "limit": 10000,
      "reset_date": "2025-07-29T10:00:00Z"
    }
  }
}
```

### Over Limit (>= 10,000 calls)
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1754384400

{
  "error": "Monthly API limit exceeded",
  "message": "You have reached your monthly limit of 10,000 API calls",
  "reset_date": "2025-07-29T10:00:00Z"
}
```

## Implementation Details

### API Key Authorizer (Lambda)
- Aggregates usage across all user's keys
- Checks total against 10,000 limit
- Returns 403 if over limit
- Implements rolling 30-day window logic

### Usage Processor (Async Lambda)
- Processes CloudWatch logs asynchronously
- Updates individual key usage counts
- No impact on API latency

### Dashboard
- Shows total usage across all keys
- Individual key breakdowns
- Visual progress bar (green < 80%, yellow 80-95%, red > 95%)
- Countdown to reset date when near/over limit

## Manual Testing Steps

1. **Create Test User**
   - Register new account
   - Create 3 API keys with different names

2. **Test Usage Aggregation**
   - Make 100 calls with key 1
   - Make 200 calls with key 2
   - Make 150 calls with key 3
   - Verify dashboard shows 450 total

3. **Test Rate Limit**
   - Use script to make 9,500 more calls
   - Verify last 50 calls succeed
   - Verify call 10,001 returns 429

4. **Test Reset Window**
   - Note the reset date shown
   - Wait until after reset date
   - Verify usage resets to 0
   - Verify new reset date is 30 days later

## Automated Test Commands

```bash
# Run Playwright tests
cd /home/ubuntu/v2-complical-api/playwright-tests
npm test tests/rate-limiting.spec.ts

# Test API directly
# Make calls and check usage
for i in {1..100}; do
  curl -X GET "https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/v1/deadlines?country=AU" \
    -H "x-api-key: YOUR_KEY" -s -o /dev/null -w "%{http_code}\n"
done

# Check current usage
aws dynamodb scan --table-name complical-api-keys-test \
  --filter-expression "userEmail = :email" \
  --expression-attribute-values '{":email":{"S":"test@example.com"}}' \
  --query "Items[*].usageCount.N" \
  --region ap-south-1 | jq 'add'
```