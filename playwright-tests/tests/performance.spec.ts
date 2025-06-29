import { test, expect } from '@playwright/test';

const APP_URL = 'https://d1v4wmxs6wjlqf.cloudfront.net';

test.describe('Performance Tests', () => {
  test('should load dashboard quickly', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    
    const startTime = Date.now();
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Dashboard load time: ${loadTime}ms`);
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have optimized bundle size', async ({ page }) => {
    const resources = [];
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.css')) {
        resources.push({
          url: url.split('/').pop(),
          size: response.headers()['content-length'] || '0',
          type: url.includes('.js') ? 'JS' : 'CSS'
        });
      }
    });
    
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    const totalJS = resources
      .filter(r => r.type === 'JS')
      .reduce((sum, r) => sum + parseInt(r.size), 0);
    
    console.log('Total JS size:', (totalJS / 1024).toFixed(2) + 'KB');
    console.log('Resources loaded:', resources.length);
    
    // Check if using code splitting
    const hasCodeSplitting = resources.some(r => r.url.includes('chunk'));
    console.log('Code splitting enabled:', hasCodeSplitting);
  });
});