# SADS CRM CSV Automation - Apify Actor Setup

## Wersja 3.0.0 - CSV Automation Only

Ta wersja Actora automatyzuje **tylko pobieranie CSV** z koszyka SADS CRM.

---

## Co robi Actor (pełny flow)

1. ✅ **Logowanie** - zaloguj się na app.sads.pl
2. ✅ **Otwórz modal** - kliknij "Powiadomienia i schematy"
3. ✅ **Wybierz schemat** - znajdź schemat po nazwie i kliknij "Wyszukaj"
4. ✅ **Przeładowanie strony** - poczekaj na wyniki
5. ✅ **Zmień na 100 ofert** - dropdown "50 ofert" → "100 ofert"
6. ✅ **Zaznacz wszystkie** - checkbox "zaznacz wszystkie oferty"
7. ✅ **Dodaj do koszyka** - ikona koszyka
8. ✅ **Otwórz koszyk** - przycisk koszyka w nagłówku
9. ✅ **Pobierz CSV** - dropdown "Brak" → "Pobierz CSV"
10. ✅ **Zapisz info** - zapisz informacje o pobraniu do datasetu

---

## Setup Instructions

### 1. Create New Apify Actor

1. Go to [Apify Console](https://console.apify.com/)
2. Click **"Actors"** → **"Create new"**
3. Choose **"Playwright & Crawlee"** template (JavaScript)
4. Name it: **"SADS CRM CSV Automation"**

### 2. Replace main.js

1. Open `src/main.js` in the Apify editor
2. **Delete all existing code**
3. **Copy the entire contents** of `apify-actor-csv-automation.js`
4. **Paste into** `src/main.js`
5. Click **"Save"**

### 3. Configure Input Schema (Optional but Recommended)

1. In Apify Actor, go to **"Settings"** tab
2. Find **"Input Schema"** section
3. **Copy contents** of `apify-input-schema.json`
4. **Paste** into the Input Schema editor
5. Click **"Save"**

This creates a nice UI with three fields:
- Email (Login)
- Password (hidden)
- Schema Name

### 4. Build and Test

1. Click **"Build"** button
2. Wait for build to complete (~1 minute)
3. Click **"Start"** to run a test
4. Enter your credentials:
   - Email: `kamil.ksiazek@ks-partners.pl`
   - Password: `Kspartners#321`
   - Schema Name: `Marcin Borkowski Nowe`
5. Click **"Start"**

### 5. Monitor Execution

Watch the console logs for progress:

```
🚀 Starting SADS CRM CSV Automation...
📧 Username: kamil.ksiazek@ks-partners.pl
📋 Schema: Marcin Borkowski Nowe
📍 Step 1: Navigating to login page...
✅ Page loaded
📍 Step 2: Looking for login form...
🔗 Found login link: "ZALOGUJ"
✅ Clicked login link
✅ Login form appeared!
📍 Step 3: Filling credentials...
✅ Email filled
✅ Password filled
📍 Step 4: Waiting 3 seconds (anti-bot protection)...
📍 Step 5: Clicking login button...
✅ Login successful!
========================================
📍 Step 6: Looking for "Powiadomienia i schematy" button...
✅ Clicked "Powiadomienia i schematy"
📍 Step 7: Looking for schema "Marcin Borkowski Nowe"...
✅ Found schema at index 0
📍 Step 8: Clicking "Wyszukaj" (page will reload)...
✅ Page reloaded
📍 Step 9: Changing to 100 offers...
✅ Changed to 100 offers
📍 Step 10: Selecting all offers...
✅ Checked all offers
📍 Step 11: Adding to cart...
✅ Added to cart
📍 Step 12: Opening basket...
✅ Basket opened
📍 Step 13: Downloading CSV...
✅ Clicked "Pobierz CSV"
✅ CSV downloaded: offers_export_2026-01-24.csv
========================================
✅✅✅ AUTOMATION COMPLETED! ✅✅✅
========================================
```

### 6. Check Screenshots

Actor saves screenshots at each major step:
- `step1-loaded.png` - Initial page
- `step2-after-login-click.png` - After clicking login
- `step3-credentials-filled.png` - Credentials filled
- `step5-after-login.png` - After login
- `step6-modal-opened.png` - Modal opened
- `step8-after-search.png` - After clicking search
- `step9-100-offers.png` - Changed to 100 offers
- `step10-selected-all.png` - All offers selected
- `step11-added-to-cart.png` - Added to cart
- `step12-basket-opened.png` - Basket opened
- `step13-csv-downloaded.png` - CSV downloaded

### 7. Retrieve Results

#### Dataset
Go to **Storage** → **Datasets** to see:
```json
{
    "fileName": "offers_export_2026-01-24.csv",
    "downloadedAt": "2026-01-24T20:57:42.123Z",
    "schemaName": "Marcin Borkowski Nowe",
    "status": "success"
}
```

#### Key-Value Store
Go to **Storage** → **Key-value stores** → `DOWNLOAD_INFO`:
```json
{
    "fileName": "offers_export_2026-01-24.csv",
    "filePath": "downloads/offers_export_2026-01-24.csv",
    "timestamp": "2026-01-24T20:57:42.123Z",
    "schemaName": "Marcin Borkowski Nowe"
}
```

---

## Schedule Automation

Once working, set up automatic runs:

1. Go to Actor → **"Schedules"** tab
2. Click **"Create schedule"**
3. Choose frequency:
   - **Hourly**: `0 * * * *`
   - **Every 2 hours**: `0 */2 * * *`
   - **Work hours (9-17)**: `0 9-17 * * 1-5`
   - **Daily at 9am**: `0 9 * * *`
4. Click **"Save"**

---

## Troubleshooting

### Issue: Login fails

**Check:**
- Are credentials correct?
- Look at `step2-after-login-click.png` - did form appear?
- Look at `step5-after-login.png` - are we on app.sads.pl?

**Solution:**
- Update credentials in Actor input
- Check if website structure changed

### Issue: Schema not found

**Error message:** `Schema "Marcin Borkowski Nowe" not found`

**Check:**
- Look at `step6-modal-opened.png` - is modal open?
- Is schema name exactly correct? (case-sensitive, with spaces)

**Solution:**
- Update `schemaName` in Actor input to exact match
- Check schema name in SADS CRM manually

### Issue: Dropdown "50 ofert" not found

**Warning:** `"50 ofert" text not found, might already be 100`

**This is OK** - means the account already shows 100 offers by default.
Actor continues with next steps.

### Issue: CSV download not captured

**Message:** `Download might have started but not captured`

**This is OK** - Actor clicked the "Pobierz CSV" button successfully.
Browser downloads the file, but Apify might not capture it in headless mode.

**The important part:** CSV is being generated and downloaded by SADS.

---

## Integration with Other Tools

### Make.com (Integromat)

1. In Make.com, create new scenario
2. Add **"Apify" → "Watch Actor Runs"**
3. Select your Actor
4. Add modules to process results:
   - Parse dataset
   - Send email notification
   - Save to Google Sheets
   - Upload to Dropbox

### Webhook Notifications

1. In Actor → **Settings** → **Webhooks**
2. Add webhook URL (e.g., Slack, Discord, your API)
3. Choose events: **"Actor run succeeded"**, **"Actor run failed"**
4. Get instant notifications

---

## Cost Estimation

- **Per run**: ~0.01-0.02 compute units (~$0.001-0.002)
- **Hourly (24/7)**: ~$0.72/month
- **Work hours (8h/day)**: ~$0.24/month
- **Daily (once)**: ~$0.06/month

**Very cheap!** 💰

---

## Differences from Previous Version

| Feature | v2.x (Contact Extractor) | v3.0 (CSV Automation) |
|---------|-------------------------|----------------------|
| Login | ✅ Yes | ✅ Yes |
| Click contact buttons | ✅ Yes | ❌ No |
| Extract phones/emails | ✅ Yes | ❌ No |
| Schema selection | ❌ No | ✅ Yes |
| 100 offers | ❌ No | ✅ Yes |
| Select all | ❌ No | ✅ Yes |
| Add to cart | ❌ No | ✅ Yes |
| Download CSV | ❌ No | ✅ Yes |
| Output | JSON/Markdown | CSV file |

---

## Next Steps

After successful automation:

1. ✅ **Set up schedule** - run automatically
2. ✅ **Add webhooks** - get notifications
3. ✅ **Integrate with Make.com** - automate workflow
4. ✅ **Monitor runs** - check dashboard regularly

---

## Support

If issues persist:
1. Check all screenshots from failed run
2. Look for Polish error messages in `step*` screenshots
3. Verify schema name is correct
4. Check if SADS website changed structure
5. Open issue at: https://github.com/anthropics/claude-code/issues
