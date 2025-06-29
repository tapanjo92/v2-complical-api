# Playwright E2E Testing

## Running Tests

### Local Machine (with display)
```bash
cd /home/ubuntu/v2-complical-api/playwright-tests
npm test
```

### Headless Mode (SSH/CI)
```bash
npm test -- --reporter=html
# View report at: playwright-report/index.html
```

### Browser Testing
Open `/home/ubuntu/v2-complical-api/playwright-tests/quick-browser-test.html` in any browser for manual testing.

## Test Suites

### 1. Authentication (`auth.spec.ts`)
- User registration
- Login/logout
- Session persistence
- Error handling

### 2. Session Isolation (`session-isolation.spec.ts`)
- No data bleeding between users
- Proper logout cleanup
- React Query cache isolation

### 3. API Key Management (`api-key-management.spec.ts`)
- Create/revoke keys
- 5 key limit enforcement
- Key masking after creation
- Usage tracking per key

### 4. Rate Limiting (`rate-limiting.spec.ts`)
- 10,000 call limit per user
- Usage aggregation across keys
- Rolling 30-day reset
- Dashboard display

## Key Test Scenarios

### Usage Limit Enforcement
1. User creates 3 API keys
2. Makes 3,000 calls with each key (9,000 total)
3. Makes 1,000 more calls (hits 10,000 limit)
4. All keys return 429 error
5. Wait 30 days for reset

### Session Isolation
1. Login as user1, note usage count
2. Logout
3. Login as user2
4. Verify: Shows user2's data only (no refresh needed)

## Manual Testing Checklist

- [ ] Create account
- [ ] Login/logout works
- [ ] Create API key (shown once)
- [ ] API key masked after dialog close
- [ ] Make API calls
- [ ] Usage updates within 2 minutes
- [ ] Dashboard shows total usage
- [ ] Try creating 6th key (should fail)
- [ ] Logout clears all data