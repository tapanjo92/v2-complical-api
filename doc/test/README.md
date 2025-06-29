# Testing Documentation

## Quick Links

1. **[API Testing Guide](API_TESTING_GUIDE.md)** - Quick commands to test all API endpoints
2. **[Playwright Testing](PLAYWRIGHT_TESTING.md)** - E2E test suites for frontend

## Additional Resources

- [Usage Limit Test Scenarios](USAGE_LIMIT_TEST_SCENARIOS.md) - Detailed 10k limit testing
- [Browser Test Guide](browser-test-guide.md) - Running tests in browser environments

## Key Test Points

- ✅ API key usage tracking (async, 1-2 min delay)
- ✅ 10,000 calls per user limit (not per key)
- ✅ Rolling 30-day usage reset
- ✅ Session isolation between users
- ✅ Maximum 5 API keys per user