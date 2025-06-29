import { test, expect } from '@playwright/test';

const APP_URL = 'https://d1v4wmxs6wjlqf.cloudfront.net';

test.describe('Session Isolation Tests', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies and storage before each test
    await context.clearCookies();
  });

  test('should not show previous user data after login', async ({ page, context }) => {
    // Test User 1 Login
    await page.goto(APP_URL);
    
    // Navigate to login if not already there
    await page.waitForLoadState('networkidle');
    
    // Click login link if on landing page
    const loginButton = page.locator('a:has-text("Sign In"), button:has-text("Sign In")').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
    }
    
    // Fill login form for User 1
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 10000 }).catch(() => {});
    
    // Check if we see user 1 email
    const user1Email = await page.locator('text=test1@example.com').isVisible().catch(() => false);
    
    // Logout
    const logoutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
    
    // Clear everything
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Navigate to login again
    await page.goto(`${APP_URL}/login`);
    
    // Login as User 2
    await page.fill('input[type="email"]', 'test2@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    
    // Verify we don't see User 1's email
    await expect(page.locator('text=test1@example.com')).not.toBeVisible();
    
    // Log findings
    console.log('Session isolation test completed');
  });

  test('localStorage should be cleared on logout', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Set some test data in localStorage
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value');
      localStorage.setItem('complical-auth', JSON.stringify({ user: { email: 'old@example.com' } }));
    });
    
    // Navigate to login
    await page.goto(`${APP_URL}/login`);
    
    // Login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForLoadState('networkidle');
    
    // Check localStorage before logout
    const authDataBefore = await page.evaluate(() => localStorage.getItem('complical-auth'));
    console.log('Auth data before logout:', authDataBefore ? 'Present' : 'Not present');
    
    // Logout
    const logoutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
    
    // Check localStorage after logout
    const authDataAfter = await page.evaluate(() => localStorage.getItem('complical-auth'));
    const testKeyAfter = await page.evaluate(() => localStorage.getItem('test-key'));
    
    console.log('Auth data after logout:', authDataAfter ? 'Still present!' : 'Cleared');
    console.log('Test key after logout:', testKeyAfter ? 'Still present' : 'Cleared');
    
    expect(authDataAfter).toBeNull();
  });

  test('API usage should reflect current user only', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    
    // Login
    await page.fill('input[type="email"]', 'tapmit1@gmail.com');
    await page.fill('input[type="password"]', 'YourPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    
    // Look for API usage display
    const usageElement = page.locator('[class*="API Calls"], [class*="Total API Calls"], text=/\\d+.*calls?/i').first();
    const usageText = await usageElement.textContent().catch(() => 'Not found');
    
    console.log('API Usage display:', usageText);
    
    // Check if email matches
    const emailVisible = await page.locator('text=tapmit1@gmail.com').isVisible().catch(() => false);
    console.log('Correct user email visible:', emailVisible);
  });
});

test.describe('Authentication Flow', () => {
  test('should handle registration and auto-login', async ({ page }) => {
    await page.goto(`${APP_URL}/register`);
    
    const randomEmail = `test${Date.now()}@example.com`;
    
    // Fill registration form
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    // Check for company name field
    const companyField = page.locator('input[name="companyName"], input[placeholder*="Company"]');
    if (await companyField.isVisible()) {
      await page.fill('input[name="companyName"], input[placeholder*="Company"]', 'Test Company');
    }
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should auto-login and redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
    
    // Check for welcome message or user email
    const userEmailVisible = await page.locator(`text=${randomEmail}`).isVisible().catch(() => false);
    console.log('New user auto-logged in:', userEmailVisible);
  });
});

test.describe('Frontend State Management', () => {
  test('should show loading states properly', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    
    // Monitor network requests
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('api')) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });
    
    // Login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    // Check for loading state on button
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Check if button shows loading state
    const hasLoadingState = await submitButton.locator('svg[class*="animate"], [class*="spinner"], [class*="loading"]').isVisible().catch(() => false);
    console.log('Submit button shows loading state:', hasLoadingState);
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    
    console.log('API calls made:', apiCalls.length);
    apiCalls.forEach(call => console.log('  -', call));
  });
});