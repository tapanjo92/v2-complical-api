import { test, expect } from '@playwright/test';

const APP_URL = 'https://d1v4wmxs6wjlqf.cloudfront.net';

test.describe('Visual Inspection', () => {
  test('capture current state of key pages', async ({ page }) => {
    const pages = [
      { name: 'Landing Page', path: '/' },
      { name: 'Login Page', path: '/login' },
      { name: 'Register Page', path: '/register' },
    ];

    for (const pageInfo of pages) {
      await page.goto(`${APP_URL}${pageInfo.path}`);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot
      await page.screenshot({ 
        path: `screenshots/${pageInfo.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true 
      });
      
      // Log page info
      const title = await page.title();
      console.log(`${pageInfo.name}: ${title}`);
      
      // Check for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(1000);
      
      if (errors.length > 0) {
        console.log(`Console errors on ${pageInfo.name}:`, errors);
      }
    }
  });

  test('check responsive design', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];

    await page.goto(APP_URL);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      // Check if navigation is properly responsive
      const mobileMenuButton = page.locator('button[aria-label*="menu"], button[class*="mobile-menu"]');
      const isMobileMenuVisible = await mobileMenuButton.isVisible().catch(() => false);
      
      console.log(`${viewport.name} (${viewport.width}x${viewport.height}): Mobile menu visible = ${isMobileMenuVisible}`);
    }
  });
});