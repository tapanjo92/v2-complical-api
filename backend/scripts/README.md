# Backend Scripts

This directory contains operational scripts for the CompliCal API backend.

## Active Scripts

### monitor-usage-tracking.js
Monitor the health of synchronous API usage tracking system.

**Usage:**
```bash
node monitor-usage-tracking.js
```

**Features:**
- Shows CloudWatch metrics for usage tracking success/failure
- Lists API keys with their current usage counts
- Identifies discrepancies in usage tracking
- Provides recommendations for issues

**When to use:**
- Daily operational checks
- After deploying authorizer changes
- When users report usage tracking issues

### test-authorizer-locally.js
Test the API key authorizer locally before deployment.

**Usage:**
```bash
# Test with a real API key
TEST_API_KEY=your-api-key node test-authorizer-locally.js

# Test without API key (basic tests only)
node test-authorizer-locally.js
```

**Features:**
- Tests missing/invalid API key handling
- Validates authorization with real API keys
- Checks non-blocking usage tracking
- Measures authorization performance

**When to use:**
- Before deploying authorizer changes
- When debugging authorization issues
- To verify API key functionality

## Archived Scripts

Historical scripts and troubleshooting tools have been moved to:
- `/archive/troubleshooting/` - Diagnostic scripts
- `/docs/postmortems/` - RCA and analysis documents

## Environment Variables

Both scripts use these environment variables:
- `API_KEYS_TABLE` - DynamoDB table for API keys (default: complical-api-keys-test)
- `API_USAGE_TABLE` - DynamoDB table for usage data (default: complical-api-usage-test)
- `ENVIRONMENT` - Environment name (default: test)