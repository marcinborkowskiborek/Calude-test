// Apify Actor - SADS Contact Extractor with Improved Login
// This is the complete code to paste into Apify Actor's src/main.js

import { Actor } from 'apify';
import { playwright } from 'crawlee';

await Actor.init();

// Get input from Apify
const input = await Actor.getInput();
const username = input.username || 'kamil.ksiazek@ks-partners.pl';
const password = input.password || 'Kspartners#321';
const loginUrl = 'https://www.sads.pl';
const targetUrl = 'https://app.sads.pl/Offers';

console.log('🚀 Starting SADS Contact Extractor...');
console.log(`📧 Username: ${username}`);

// Launch browser
const browser = await playwright.chromium.launch({
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
    ]
});

const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    javaScriptEnabled: true
});

const page = await context.newPage();

// Enable request/response logging
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('requestfailed', request => console.log('❌ Request failed:', request.url()));

try {
    console.log('📍 Step 1: Navigating to login page...');

    // Navigate with multiple wait strategies
    await page.goto(loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
    });

    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('⚠️ Network not fully idle, continuing anyway...');
    });

    console.log('✅ Page loaded');
    console.log('📍 Current URL:', page.url());
    console.log('📍 Page title:', await page.title());

    // Take screenshot for debugging
    await page.screenshot({ path: 'step1-loaded.png', fullPage: true });
    console.log('📸 Screenshot saved: step1-loaded.png');

    // Check if we're already logged in by checking for redirect to app
    if (page.url().includes('app.sads.pl')) {
        console.log('✅ Already logged in! Skipping login step.');
    } else {
        console.log('📍 Step 2: Looking for login form...');

        // Try multiple strategies to find the login form
        let loginFormFound = false;

        // Strategy 1: Direct ID selectors
        const emailField = await page.$('#AmCustomersUserEmail');
        if (emailField) {
            console.log('✅ Found email field with direct ID');
            loginFormFound = true;
        } else {
            console.log('⚠️ Email field not immediately visible, trying alternative methods...');

            // Strategy 2: Wait for any form with email input
            try {
                await page.waitForSelector('input[type="email"], input[name*="email"], input[id*="email"]', {
                    timeout: 5000,
                    state: 'visible'
                });
                console.log('✅ Found email input with alternative selector');
                loginFormFound = true;
            } catch (e) {
                console.log('⚠️ No email input found yet');
            }

            // Strategy 3: Check if there's a login button/link to click first
            const loginLinks = await page.$$('a, button');
            for (const link of loginLinks) {
                const text = await link.innerText().catch(() => '');
                if (text.toLowerCase().includes('login') || text.toLowerCase().includes('logowanie')) {
                    console.log(`🔗 Found login link with text: "${text}"`);
                    await link.click();
                    await page.waitForTimeout(2000);
                    await page.screenshot({ path: 'step2-after-login-click.png', fullPage: true });

                    // Check again for form
                    const emailFieldAfterClick = await page.$('#AmCustomersUserEmail');
                    if (emailFieldAfterClick) {
                        console.log('✅ Login form appeared after clicking link!');
                        loginFormFound = true;
                        break;
                    }
                }
            }
        }

        if (!loginFormFound) {
            console.log('❌ Could not find login form');
            await page.screenshot({ path: 'error-no-login-form.png', fullPage: true });

            // Get page content for debugging
            const bodyText = await page.evaluate(() => document.body.innerText);
            console.log('📄 Page content (first 1000 chars):', bodyText.substring(0, 1000));

            throw new Error('Login form not found on page');
        }

        console.log('📍 Step 3: Filling login credentials...');

        // Wait a bit for any dynamic content
        await page.waitForTimeout(1000);

        // Fill email - try multiple selectors
        const emailSelectors = [
            '#AmCustomersUserEmail',
            'input[type="email"]',
            'input[name*="email"]',
            'input[placeholder*="email"]'
        ];

        let emailFilled = false;
        for (const selector of emailSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 2000, state: 'visible' });
                await page.fill(selector, username);
                console.log(`✅ Filled email using selector: ${selector}`);
                emailFilled = true;
                break;
            } catch (e) {
                console.log(`⚠️ Could not fill email with selector: ${selector}`);
            }
        }

        if (!emailFilled) {
            throw new Error('Could not fill email field');
        }

        // Fill password - try multiple selectors
        const passwordSelectors = [
            '#AmCustomersUserPassword',
            'input[type="password"]',
            'input[name*="password"]',
            'input[name*="haslo"]'
        ];

        let passwordFilled = false;
        for (const selector of passwordSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 2000, state: 'visible' });
                await page.fill(selector, password);
                console.log(`✅ Filled password using selector: ${selector}`);
                passwordFilled = true;
                break;
            } catch (e) {
                console.log(`⚠️ Could not fill password with selector: ${selector}`);
            }
        }

        if (!passwordFilled) {
            throw new Error('Could not fill password field');
        }

        console.log('✅ Credentials filled');
        await page.screenshot({ path: 'step3-credentials-filled.png', fullPage: true });

        console.log('📍 Step 4: Waiting 3 seconds (anti-bot protection)...');
        await page.waitForTimeout(3000);

        console.log('📍 Step 5: Clicking login button...');

        // Try multiple ways to submit
        const submitSelectors = [
            '#loginSubmitBtn',
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Login")',
            'button:has-text("Zaloguj")'
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
            try {
                await page.click(selector, { timeout: 2000 });
                console.log(`✅ Clicked submit button using: ${selector}`);
                submitted = true;
                break;
            } catch (e) {
                console.log(`⚠️ Could not click submit with: ${selector}`);
            }
        }

        // If clicking didn't work, try pressing Enter
        if (!submitted) {
            console.log('⚠️ Trying to submit with Enter key...');
            await page.keyboard.press('Enter');
        }

        console.log('⏳ Waiting for navigation after login...');

        // Wait for navigation or URL change
        try {
            await Promise.race([
                page.waitForNavigation({ timeout: 15000 }),
                page.waitForURL('**/app.sads.pl/**', { timeout: 15000 }),
                page.waitForTimeout(15000)
            ]);
        } catch (e) {
            console.log('⚠️ Navigation timeout, checking current state...');
        }

        console.log('📍 After login URL:', page.url());
        await page.screenshot({ path: 'step5-after-login.png', fullPage: true });

        // Check if login was successful
        if (!page.url().includes('app.sads.pl')) {
            // Check for error messages
            const bodyText = await page.evaluate(() => document.body.innerText);
            if (bodyText.toLowerCase().includes('error') ||
                bodyText.toLowerCase().includes('błąd') ||
                bodyText.toLowerCase().includes('nieprawidłow')) {
                console.log('❌ Login error detected:', bodyText.substring(0, 500));
                throw new Error('Login failed - incorrect credentials or error on page');
            }
            console.log('⚠️ Still not on app.sads.pl, but continuing...');
        } else {
            console.log('✅ Login successful!');
        }
    }

    // Navigate to offers page
    console.log('📍 Step 6: Navigating to offers page...');
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    console.log('✅ On offers page:', page.url());
    await page.screenshot({ path: 'step6-offers-page.png', fullPage: true });

    // Wait for contact buttons to load
    console.log('📍 Step 7: Looking for contact buttons...');
    await page.waitForTimeout(2000);

    // Find all contact reveal buttons
    const buttons = await page.$$('.phone-contact, button:has-text("Pokaż kontakt"), span:has-text("Pokaż kontakt")');
    console.log(`🔍 Found ${buttons.length} contact buttons`);

    if (buttons.length === 0) {
        console.log('⚠️ No contact buttons found');
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log('📄 Page content:', bodyText.substring(0, 1000));
    } else {
        console.log('📍 Step 8: Clicking all contact buttons...');

        // Click all buttons
        for (let i = 0; i < buttons.length; i++) {
            try {
                await buttons[i].click();
                console.log(`✅ Clicked button ${i + 1}/${buttons.length}`);
                await page.waitForTimeout(500); // Wait between clicks
            } catch (e) {
                console.log(`⚠️ Could not click button ${i + 1}:`, e.message);
            }
        }

        // Wait for all contacts to load
        await page.waitForTimeout(2000);
        console.log('✅ All buttons clicked');

        await page.screenshot({ path: 'step8-contacts-revealed.png', fullPage: true });
    }

    // Extract contacts
    console.log('📍 Step 9: Extracting contact data...');

    const extractedData = await page.evaluate(() => {
        const phoneRegex = /(\+48\s?)?(\d{3}[\s\-]?\d{3}[\s\-]?\d{3})/g;
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const contacts = [];

        // Find all listing containers
        const listings = document.querySelectorAll('[class*="listing"], [class*="offer"], .row, article, .card');

        listings.forEach((listing) => {
            const text = listing.innerText || listing.textContent || '';

            // Extract data
            const phones = text.match(phoneRegex) || [];
            const emails = text.match(emailRegex) || [];

            if (phones.length > 0 || emails.length > 0) {
                const titleEl = listing.querySelector('h1, h2, h3, h4, [class*="title"]');
                const locationEl = listing.querySelector('[class*="location"], [class*="address"]');
                const priceEl = listing.querySelector('[class*="price"], [class*="cena"]');
                const linkEl = listing.querySelector('a[href*="/offer"], a[href*="/oferta"]');

                contacts.push({
                    title: titleEl ? titleEl.innerText.trim() : '',
                    location: locationEl ? locationEl.innerText.trim() : '',
                    price: priceEl ? priceEl.innerText.trim() : '',
                    phone: phones[0] || '',
                    email: emails[0] || '',
                    offerUrl: linkEl ? linkEl.href : '',
                    extractedAt: new Date().toISOString()
                });
            }
        });

        return contacts;
    });

    console.log(`📊 Extracted ${extractedData.length} contacts`);

    // Save to Apify dataset
    if (extractedData.length > 0) {
        await Actor.pushData(extractedData);
        console.log('✅ Data saved to Apify dataset');

        // Also create downloadable markdown
        let markdown = `# Wyciągnięte kontakty\n\n`;
        markdown += `Data: ${new Date().toLocaleString('pl-PL')}\n`;
        markdown += `Liczba kontaktów: ${extractedData.length}\n\n---\n\n`;

        extractedData.forEach((item, index) => {
            markdown += `## ${index + 1}. ${item.title || 'Bez tytułu'}\n\n`;
            if (item.location) markdown += `**Lokalizacja:** ${item.location}\n\n`;
            if (item.price) markdown += `**Cena:** ${item.price}\n\n`;
            if (item.phone) markdown += `📞 **Telefon:** ${item.phone}\n\n`;
            if (item.email) markdown += `📧 **Email:** ${item.email}\n\n`;
            if (item.offerUrl) markdown += `**Link:** ${item.offerUrl}\n\n`;
            markdown += `---\n\n`;
        });

        await Actor.setValue('OUTPUT_MARKDOWN', markdown, { contentType: 'text/markdown' });
        console.log('✅ Markdown file created');
    } else {
        console.log('⚠️ No contacts extracted');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);

    // Take error screenshot
    try {
        await page.screenshot({ path: 'error-final.png', fullPage: true });
        console.log('📸 Error screenshot saved');
    } catch (e) {
        console.log('Could not take error screenshot');
    }

    throw error;

} finally {
    await browser.close();
    console.log('🏁 Browser closed');
}

await Actor.exit();
