// Apify Actor - SADS CRM CSV Automation
// v3.0.0 - Automatyzacja pobierania CSV z koszyka

import { Actor } from 'apify';
import { chromium } from 'playwright';

await Actor.init();

// Get input from Apify
const input = await Actor.getInput();
const username = input.username || 'kamil.ksiazek@ks-partners.pl';
const password = input.password || 'Kspartners#321';
const schemaName = input.schemaName || 'Marcin Borkowski Nowe';
const loginUrl = 'https://www.sads.pl';

console.log('🚀 Starting SADS CRM CSV Automation...');
console.log(`📧 Username: ${username}`);
console.log(`📋 Schema: ${schemaName}`);

// Configuration
const CONFIG = {
    delays: {
        afterClick: 1000,
        waitForModal: 2000,
        waitForResults: 3000,
        waitForOfferChange: 3000,
        betweenActions: 1000
    }
};

// Launch browser
const browser = await chromium.launch({
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

// Enable logging
page.on('console', msg => console.log('PAGE LOG:', msg.text()));

/**
 * Wait helper
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Click element with full event simulation
 */
async function clickElement(locator) {
    try {
        await locator.scrollIntoViewIfNeeded();
        await locator.dispatchEvent('mousedown');
        await locator.dispatchEvent('mouseup');
        await locator.click();
        return true;
    } catch (e) {
        console.log(`⚠️ Click failed: ${e.message}`);
        return false;
    }
}

try {
    // ============================================
    // STEP 1: LOGIN
    // ============================================
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    console.log('✅ Page loaded:', page.url());
    await page.screenshot({ path: 'step1-loaded.png', fullPage: true });

    // Check if already logged in
    if (!page.url().includes('app.sads.pl')) {
        console.log('📍 Step 2: Looking for login form...');

        let loginFormFound = false;

        // Check for direct email field
        const emailField = await page.$('#AmCustomersUserEmail');
        if (emailField) {
            console.log('✅ Found email field directly');
            loginFormFound = true;
        } else {
            // Look for login link
            console.log('🔍 Looking for "ZALOGUJ" link...');
            const loginLinks = await page.$$('a, button');

            for (const link of loginLinks) {
                const text = await link.innerText().catch(() => '');
                const textLower = text.toLowerCase().trim();

                if (textLower === 'zaloguj' || textLower === 'login' || textLower === 'logowanie') {
                    console.log(`🔗 Found login link: "${text}"`);
                    await link.click();
                    console.log('✅ Clicked login link');

                    await Promise.race([
                        page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
                        page.waitForSelector('#AmCustomersUserEmail', { timeout: 5000 }).catch(() => {}),
                        page.waitForTimeout(3000)
                    ]);

                    await page.screenshot({ path: 'step2-after-login-click.png', fullPage: true });

                    const emailFieldAfterClick = await page.$('#AmCustomersUserEmail');
                    if (emailFieldAfterClick) {
                        console.log('✅ Login form appeared!');
                        loginFormFound = true;
                        break;
                    }
                }
            }
        }

        if (!loginFormFound) {
            throw new Error('Login form not found');
        }

        console.log('📍 Step 3: Filling credentials...');
        await wait(1000);

        // Fill email
        await page.waitForSelector('#AmCustomersUserEmail', { timeout: 5000 });
        await page.fill('#AmCustomersUserEmail', username);
        console.log('✅ Email filled');

        // Fill password
        await page.waitForSelector('#AmCustomersUserPassword', { timeout: 5000 });
        await page.fill('#AmCustomersUserPassword', password);
        console.log('✅ Password filled');

        await page.screenshot({ path: 'step3-credentials-filled.png', fullPage: true });

        console.log('📍 Step 4: Waiting 3 seconds (anti-bot protection)...');
        await wait(3000);

        console.log('📍 Step 5: Clicking login button...');
        await page.click('#loginSubmitBtn');
        console.log('✅ Login button clicked');

        await Promise.race([
            page.waitForNavigation({ timeout: 15000 }),
            page.waitForURL('**/app.sads.pl/**', { timeout: 15000 }),
            page.waitForTimeout(15000)
        ]);

        console.log('📍 After login URL:', page.url());
        await page.screenshot({ path: 'step5-after-login.png', fullPage: true });

        if (!page.url().includes('app.sads.pl')) {
            throw new Error('Login failed - not redirected to app.sads.pl');
        }

        console.log('✅ Login successful!');
    } else {
        console.log('✅ Already logged in!');
    }

    // ============================================
    // STEP 6: CSV AUTOMATION - Find and click "Notifications and Schemas"
    // ============================================
    console.log('========================================');
    console.log('📍 Step 6: Looking for "Powiadomienia i schematy" button...');

    await wait(CONFIG.delays.betweenActions);

    // Find floppy disk icon
    const floppyIcon = page.locator('.glyphicon-floppy-disk').first();
    const floppyCount = await floppyIcon.count();

    if (floppyCount === 0) {
        throw new Error('Button "Powiadomienia i schematy" not found (no .glyphicon-floppy-disk)');
    }

    // Click the parent button/link
    const notifButton = floppyIcon.locator('xpath=ancestor::*[self::button or self::a or self::div[@onclick]][1]').first();
    await clickElement(notifButton);
    console.log('✅ Clicked "Powiadomienia i schematy"');

    await wait(CONFIG.delays.waitForModal);
    await page.screenshot({ path: 'step6-modal-opened.png', fullPage: true });

    // ============================================
    // STEP 7: Find and click schema "Wyszukaj" button
    // ============================================
    console.log(`📍 Step 7: Looking for schema "${schemaName}"...`);

    // Find all pattern records
    const patternRecords = page.locator('.patternRecord');
    const recordCount = await patternRecords.count();
    console.log(`📋 Found ${recordCount} pattern records`);

    let searchButton = null;
    for (let i = 0; i < recordCount; i++) {
        const record = patternRecords.nth(i);
        const text = await record.innerText();

        if (text.includes(schemaName)) {
            console.log(`✅ Found schema at index ${i}`);
            searchButton = record.locator('button.btn-success').first();
            break;
        }
    }

    if (!searchButton || await searchButton.count() === 0) {
        await page.screenshot({ path: 'error-schema-not-found.png', fullPage: true });
        throw new Error(`Schema "${schemaName}" not found`);
    }

    console.log('📍 Step 8: Clicking "Wyszukaj" (page will reload)...');
    await clickElement(searchButton);
    console.log('✅ Clicked "Wyszukaj" - waiting for page reload...');

    // Wait for navigation after clicking search
    await Promise.race([
        page.waitForNavigation({ timeout: 10000 }),
        page.waitForLoadState('networkidle', { timeout: 10000 }),
        page.waitForTimeout(10000)
    ]);

    console.log('✅ Page reloaded');
    console.log('📍 Current URL:', page.url());
    await page.screenshot({ path: 'step8-after-search.png', fullPage: true });

    await wait(CONFIG.delays.waitForResults);

    // ============================================
    // STEP 9: Change to 100 offers
    // ============================================
    console.log('📍 Step 9: Changing to 100 offers...');

    // Find dropdown with "50 ofert"
    let offerDropdown = null;
    const allTexts = await page.locator('*').evaluateAll(elements => {
        return elements
            .filter(el => el.children.length === 0 && el.textContent.trim() === '50 ofert')
            .map(el => el);
    });

    if (allTexts.length > 0) {
        // Found text, now find the dropdown button
        const dropdownButton = page.locator('button, .dropdown-toggle, .bootstrap-select').filter({
            hasText: '50 ofert'
        }).first();

        if (await dropdownButton.count() > 0) {
            console.log('✅ Found offers dropdown');
            await clickElement(dropdownButton);
            await wait(1000);

            // Find and click "100 ofert" option
            const option100 = page.locator('li a, .dropdown-item, span.text').filter({
                hasText: '100 ofert'
            }).first();

            if (await option100.count() > 0) {
                console.log('✅ Found "100 ofert" option');
                await clickElement(option100);
                console.log('✅ Changed to 100 offers');
                await wait(CONFIG.delays.waitForOfferChange);
            } else {
                console.log('⚠️ "100 ofert" option not found, continuing...');
            }
        } else {
            console.log('⚠️ Dropdown button not found, might already be 100');
        }
    } else {
        console.log('⚠️ "50 ofert" text not found, might already be 100');
    }

    await page.screenshot({ path: 'step9-100-offers.png', fullPage: true });

    // ============================================
    // STEP 10: Select all offers
    // ============================================
    console.log('📍 Step 10: Selecting all offers...');
    await wait(CONFIG.delays.betweenActions);

    const checkAllSelectors = [
        'input.checkAll',
        'input#checkAll',
        'input[data-scope="list"]'
    ];

    let checkboxChecked = false;
    for (const selector of checkAllSelectors) {
        const checkbox = page.locator(selector).first();
        if (await checkbox.count() > 0) {
            const isChecked = await checkbox.isChecked();
            if (!isChecked) {
                await checkbox.click();
                console.log(`✅ Checked all offers using: ${selector}`);
                checkboxChecked = true;
                break;
            } else {
                console.log('✅ Offers already checked');
                checkboxChecked = true;
                break;
            }
        }
    }

    if (!checkboxChecked) {
        console.log('⚠️ Checkbox not found, continuing...');
    }

    await wait(CONFIG.delays.betweenActions);
    await page.screenshot({ path: 'step10-selected-all.png', fullPage: true });

    // ============================================
    // STEP 11: Add to cart
    // ============================================
    console.log('📍 Step 11: Adding to cart...');

    const cartIcon = page.locator('.glyphicon-shopping-cart').first();
    if (await cartIcon.count() > 0) {
        const cartButton = cartIcon.locator('xpath=ancestor::*[self::button or self::a][1]').first();
        await clickElement(cartButton);
        console.log('✅ Added to cart');
    } else {
        console.log('⚠️ Cart icon not found');
    }

    await wait(CONFIG.delays.waitForModal);
    await page.screenshot({ path: 'step11-added-to-cart.png', fullPage: true });

    // ============================================
    // STEP 12: Open basket
    // ============================================
    console.log('📍 Step 12: Opening basket...');

    const basketButton = page.locator('button.basket').first();
    if (await basketButton.count() > 0) {
        await clickElement(basketButton);
        console.log('✅ Basket opened');
    } else {
        throw new Error('Basket button not found');
    }

    await wait(CONFIG.delays.waitForModal);
    await page.screenshot({ path: 'step12-basket-opened.png', fullPage: true });

    // ============================================
    // STEP 13: Download CSV
    // ============================================
    console.log('📍 Step 13: Downloading CSV...');

    // Find dropdown with "Brak"
    const brakDropdown = page.locator('.filter-option-inner-inner').filter({
        hasText: 'Brak'
    }).first();

    if (await brakDropdown.count() > 0) {
        const dropdownButton = brakDropdown.locator('xpath=ancestor::button[1]').first();
        await clickElement(dropdownButton);
        console.log('✅ Opened CSV dropdown');
        await wait(1000);

        // Find and click "Pobierz CSV"
        const csvOption = page.locator('li a, .dropdown-item, span.text').filter({
            hasText: 'Pobierz CSV'
        }).first();

        if (await csvOption.count() > 0) {
            // Setup download listener
            const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

            await clickElement(csvOption);
            console.log('✅ Clicked "Pobierz CSV"');

            try {
                const download = await downloadPromise;
                const fileName = download.suggestedFilename();
                const filePath = `downloads/${fileName}`;

                await download.saveAs(filePath);
                console.log(`✅ CSV downloaded: ${fileName}`);

                // Save download info to dataset
                await Actor.pushData({
                    fileName: fileName,
                    downloadedAt: new Date().toISOString(),
                    schemaName: schemaName,
                    status: 'success'
                });

                // Also save as key-value store
                await Actor.setValue('DOWNLOAD_INFO', {
                    fileName: fileName,
                    filePath: filePath,
                    timestamp: new Date().toISOString(),
                    schemaName: schemaName
                });

            } catch (e) {
                console.log('⚠️ Download might have started but not captured:', e.message);
                // Still report success since we clicked the button
                await Actor.pushData({
                    status: 'clicked_but_not_captured',
                    message: 'CSV download was triggered',
                    schemaName: schemaName,
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            throw new Error('"Pobierz CSV" option not found');
        }
    } else {
        throw new Error('Dropdown "Brak" not found in basket');
    }

    await wait(2000);
    await page.screenshot({ path: 'step13-csv-downloaded.png', fullPage: true });

    console.log('========================================');
    console.log('✅✅✅ AUTOMATION COMPLETED! ✅✅✅');
    console.log('========================================');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);

    try {
        await page.screenshot({ path: 'error-final.png', fullPage: true });
        console.log('📸 Error screenshot saved');
    } catch (e) {
        console.log('Could not save error screenshot');
    }

    // Save error to dataset
    await Actor.pushData({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
    });

    throw error;

} finally {
    await browser.close();
    console.log('🏁 Browser closed');
}

await Actor.exit();
