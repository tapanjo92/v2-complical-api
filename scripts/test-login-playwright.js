const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Browser error:', error));
  
  // Monitor network
  const failedRequests = [];
  page.on('response', response => {
    if (response.url().includes('/v1/auth') || response.status() >= 400) {
      console.log(`${response.status()} ${response.url()}`);
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    }
  });

  try {
    console.log('1. Navigating to login page...');
    await page.goto('https://d1v4wmxs6wjlqf.cloudfront.net/login');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Creating test user first...');
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // Go to register
    await page.click('text=Sign up');
    await page.waitForURL('**/register');
    
    // Fill registration
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder="Your Company Name"]', 'Test Company');
    await page.fill('input#password', testPassword);
    await page.fill('input#confirmPassword', testPassword);
    
    // Submit registration
    await page.click('button:has-text("Create account")');
    
    // Wait for navigation
    console.log('3. Waiting for registration response...');
    await page.waitForTimeout(5000);
    
    const urlAfterRegister = page.url();
    console.log('URL after register:', urlAfterRegister);
    await page.screenshot({ path: '/tmp/after-register.png' });
    
    // If we're not on dashboard, go to login
    if (!urlAfterRegister.includes('/dashboard')) {
      console.log('4. Going to login page...');
      await page.goto('https://d1v4wmxs6wjlqf.cloudfront.net/login');
      await page.waitForLoadState('networkidle');
      
      // Fill login
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input#password', testPassword);
      
      console.log('5. Submitting login...');
      await page.screenshot({ path: '/tmp/before-login.png' });
      
      // Click login and wait
      await page.click('button:has-text("Sign in")');
      
      console.log('6. Waiting for navigation...');
      await page.waitForTimeout(5000);
    }
    
    // Check final state
    const finalUrl = page.url();
    console.log('\n=== FINAL RESULTS ===');
    console.log('Final URL:', finalUrl);
    console.log('On dashboard?', finalUrl.includes('/dashboard'));
    
    // Check localStorage
    const authState = await page.evaluate(() => {
      return localStorage.getItem('complical-auth');
    });
    console.log('Auth state exists?', !!authState);
    
    // Check cookies
    const cookies = await context.cookies();
    console.log('Cookies set:', cookies.map(c => c.name));
    
    // Failed requests
    if (failedRequests.length > 0) {
      console.log('\nFailed requests:');
      failedRequests.forEach(req => {
        console.log(`  ${req.status} - ${req.url}`);
      });
    }
    
    await page.screenshot({ path: '/tmp/final-state.png' });
    console.log('\nScreenshots saved to /tmp/');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();