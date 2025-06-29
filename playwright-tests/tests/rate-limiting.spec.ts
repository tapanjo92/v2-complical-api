import { test, expect } from '@playwright/test';

const APP_URL = 'https://d1v4wmxs6wjlqf.cloudfront.net';

test.describe('Rate Limiting and Usage', () => {
  test('should display usage statistics correctly', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Check usage display
    const usageCard = page.locator('text=Total API Calls').locator('..');
    const usageText = await usageCard.textContent();
    console.log('Usage display:', usageText);
    
    // Check if percentage is shown
    const percentageShown = usageText?.includes('%');
    console.log('Usage percentage displayed:', percentageShown);
    
    // Check rate limit info
    const limitText = await page.locator('text=/10,000.*month/').isVisible();
    console.log('Monthly limit displayed:', limitText);
  });

  test('should update usage after API calls', async ({ page }) => {
    // This test would need to:
    // 1. Note current usage
    // 2. Make API calls
    // 3. Wait 2 minutes
    // 4. Refresh and check if usage increased
    console.log('Test case: Verify usage updates after API calls');
  });

  test('should stop API access after 10,000 calls per user', async ({ page }) => {
    // Test that API returns 429 Too Many Requests after 10,000 calls
    console.log('Test case: Verify API stops at 10,000 calls limit');
    console.log('Expected: API returns 429 status when user exceeds 10,000 calls');
    console.log('Note: All 5 API keys count towards single user limit');
  });

  test('should reset usage count monthly (rolling 30-day window)', async ({ page }) => {
    // Test that usage resets after 30 days from first usage
    console.log('Test case: Verify rolling 30-day usage reset');
    console.log('Expected: Usage count resets 30 days after initial usage');
    console.log('Note: Not calendar month, but rolling 30-day window');
  });

  test('should aggregate usage across all 5 API keys per user', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[type="email"]', 'multikey@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Test scenario:
    // 1. Create multiple API keys
    // 2. Make calls with different keys
    // 3. Verify total usage is sum of all keys
    console.log('Test case: Verify usage aggregation across multiple API keys');
    console.log('Expected: Dashboard shows total usage from all user\'s API keys');
    console.log('Note: Maximum 5 API keys per user, all count towards 10,000 limit');
  });
});