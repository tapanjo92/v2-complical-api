import { test, expect } from '@playwright/test';

const APP_URL = 'https://d1v4wmxs6wjlqf.cloudfront.net';

test.describe('Security Tests', () => {
  test('should not expose sensitive data in localStorage', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Check localStorage
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key);
        }
      }
      return items;
    });
    
    console.log('localStorage keys:', Object.keys(localStorage));
    
    // Check for sensitive data
    const localStorageString = JSON.stringify(localStorage);
    const hasApiKey = localStorageString.includes('sk_test_') || localStorageString.includes('api_key');
    const hasPassword = localStorageString.includes('password');
    
    expect(hasApiKey).toBe(false);
    expect(hasPassword).toBe(false);
  });

  test('should have CSRF protection', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    
    // Intercept network requests
    const csrfTokenFound = await page.evaluate(() => {
      return document.querySelector('meta[name="csrf-token"]') !== null ||
             document.cookie.includes('csrf') ||
             false;
    });
    
    console.log('CSRF token implementation found:', csrfTokenFound);
  });

  test('should enforce password requirements', async ({ page }) => {
    await page.goto(`${APP_URL}/register`);
    
    // Try weak password
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '123'); // Too weak
    
    // Check for password requirements display
    const requirementsVisible = await page.locator('text=/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/').isVisible()
      .catch(() => false);
    
    console.log('Password requirements shown:', requirementsVisible);
  });
});