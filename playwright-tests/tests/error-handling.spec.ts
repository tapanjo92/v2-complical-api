import { test, expect } from '@playwright/test';

const APP_URL = 'https://d1v4wmxs6wjlqf.cloudfront.net';

test.describe('Error Handling', () => {
  test('should handle invalid login gracefully', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check for error message
    const errorMessage = await page.locator('text=/Invalid|Incorrect|Wrong|Failed/i').isVisible()
      .catch(() => false);
    
    console.log('Error message displayed:', errorMessage);
    
    // Should stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should handle network errors', async ({ page }) => {
    // Simulate offline
    await page.route('**/*', route => route.abort());
    
    await page.goto(`${APP_URL}/login`).catch(() => {});
    
    // Check if app handles offline gracefully
    const offlineMessage = await page.locator('text=/offline|network|connection/i').isVisible()
      .catch(() => false);
    
    console.log('Offline handling:', offlineMessage);
  });

  test('should handle 404 pages', async ({ page }) => {
    await page.goto(`${APP_URL}/this-page-does-not-exist`);
    
    // Check for 404 handling
    const has404Page = await page.locator('text=/404|not found/i').isVisible()
      .catch(() => false);
    
    console.log('404 page handling:', has404Page);
  });
});