// Debug script to investigate www.sads.pl login form loading
const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Starting debug session...\n');

  const browser = await chromium.launch({
    headless: true // Must run headless in this environment
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Enable console logging from the page
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    console.log('📍 Navigating to www.sads.pl...');
    await page.goto('https://www.sads.pl', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ Page loaded!');
    console.log('📍 Current URL:', page.url());
    console.log('📍 Page title:', await page.title());

    // Take a screenshot
    await page.screenshot({ path: 'debug-initial-load.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-initial-load.png');

    // Check what's on the page
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 Page content preview (first 500 chars):');
    console.log(bodyText.substring(0, 500));

    // Look for the login form
    console.log('\n🔍 Checking for login form elements...');

    const emailField = await page.$('#AmCustomersUserEmail');
    console.log('Email field (#AmCustomersUserEmail):', emailField ? '✅ FOUND' : '❌ NOT FOUND');

    const passwordField = await page.$('#AmCustomersUserPassword');
    console.log('Password field (#AmCustomersUserPassword):', passwordField ? '✅ FOUND' : '❌ NOT FOUND');

    const submitBtn = await page.$('#loginSubmitBtn');
    console.log('Submit button (#loginSubmitBtn):', submitBtn ? '✅ FOUND' : '❌ NOT FOUND');

    // Look for any login-related text
    const hasLoginText = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        hasLogin: text.includes('login') || text.includes('logowanie'),
        hasEmail: text.includes('email') || text.includes('e-mail'),
        hasPassword: text.includes('hasło') || text.includes('password')
      };
    });
    console.log('\n📝 Login-related text:', hasLoginText);

    // Check for any forms
    const forms = await page.evaluate(() => {
      const allForms = document.querySelectorAll('form');
      return Array.from(allForms).map((form, i) => ({
        index: i,
        id: form.id,
        action: form.action,
        inputs: Array.from(form.querySelectorAll('input')).map(input => ({
          type: input.type,
          id: input.id,
          name: input.name
        }))
      }));
    });
    console.log('\n📋 Forms found:', JSON.stringify(forms, null, 2));

    // Check all links on the page
    const links = await page.evaluate(() => {
      const allLinks = document.querySelectorAll('a');
      return Array.from(allLinks)
        .filter(a => a.innerText.toLowerCase().includes('login') || a.innerText.toLowerCase().includes('logowanie'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('\n🔗 Login-related links:', JSON.stringify(links, null, 2));

    console.log('\n✅ All checks complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
    console.log('📸 Error screenshot saved: debug-error.png');
  } finally {
    await browser.close();
    console.log('\n✅ Debug session complete!');
  }
})();
