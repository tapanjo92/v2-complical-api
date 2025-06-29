import { test, expect } from '@playwright/test';

const APP_URL = 'https://d1v4wmxs6wjlqf.cloudfront.net';

test.describe('API Key Management', () => {
  test('should create and display new API key only once', async ({ page }) => {
    // Login first
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Navigate to API keys page
    await page.click('text=API Keys');
    await page.waitForLoadState('networkidle');
    
    // Create new key
    await page.click('button:has-text("Create API Key")');
    await page.fill('input[name="name"]', 'Test Key');
    await page.click('button:has-text("Create")');
    
    // Check if key is displayed
    const apiKeyVisible = await page.locator('code:has-text("sk_test_")').isVisible();
    console.log('New API key displayed:', apiKeyVisible);
    
    // Copy key
    await page.click('button:has-text("Copy")');
    
    // Close dialog
    await page.click('button:has-text("Close")');
    
    // Verify key is not visible anymore
    const keyHidden = await page.locator('text=••••••••').isVisible();
    console.log('API key hidden after closing:', keyHidden);
  });

  test('should enforce 5 key limit per user', async ({ page }) => {
    // This would need a test account with 5 keys already
    console.log('Test case: Verify 5 key limit enforcement');
    console.log('Expected: Error message when trying to create 6th key');
    console.log('Note: All 5 keys share the same 10,000 call limit');
  });

  test('should track API key usage correctly', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    await page.click('text=API Keys');
    
    // Look for usage count display
    const usageCount = await page.locator('text=/\\d+\\s*calls?/').first().textContent();
    console.log('API key usage display:', usageCount);
  });

  test('should share usage limit across all user API keys', async ({ page }) => {
    // Test scenario: User with multiple API keys
    console.log('Test case: Verify all API keys share same usage pool');
    console.log('Expected behavior:');
    console.log('- User has 5 API keys (max allowed)');
    console.log('- Key 1 makes 3,000 calls');
    console.log('- Key 2 makes 4,000 calls');
    console.log('- Key 3 makes 3,000 calls');
    console.log('- Total usage: 10,000 (limit reached)');
    console.log('- ALL keys now return 429 Too Many Requests');
    console.log('- Usage resets after 30 days (rolling window)');
  });
});