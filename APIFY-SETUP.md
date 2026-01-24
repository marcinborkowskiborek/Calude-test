# SADS Contact Extractor - Apify Actor Setup

## Key Improvements in the New Version

### 1. **Robust Login Form Detection**
   - Multiple strategies to find login form (direct ID, alternative selectors, login button clicks)
   - Handles cases where form loads slowly or requires interaction
   - Falls back to alternative selectors if primary ones fail

### 2. **Better Wait Strategies**
   - Uses `domcontentloaded` instead of `networkidle` for faster initial load
   - Multiple timeout catches to prevent full failure
   - Waits for specific elements with fallbacks

### 3. **Comprehensive Debugging**
   - Screenshots at every step (step1-loaded.png, step2-after-login-click.png, etc.)
   - Detailed console logging with emojis for easy scanning
   - Page content dumps when errors occur

### 4. **Alternative Selectors**
   - Email field: `#AmCustomersUserEmail`, `input[type="email"]`, `input[name*="email"]`
   - Password field: `#AmCustomersUserPassword`, `input[type="password"]`
   - Submit button: `#loginSubmitBtn`, `button[type="submit"]`, plus Enter key fallback

### 5. **Smart Login Detection**
   - Checks if already logged in before attempting login
   - Looks for login links/buttons that might need clicking first
   - Detects login errors in Polish and English

### 6. **Better Contact Extraction**
   - Multiple selectors for contact buttons
   - Handles missing elements gracefully
   - Extracts from broader range of listing containers

## Setup Instructions

### 1. Create New Apify Actor

1. Go to [Apify Console](https://console.apify.com/)
2. Click "Actors" → "Create new"
3. Choose "Playwright & Crawlee" template (JavaScript)
4. Name it: "SADS Contact Extractor"

### 2. Replace Code

1. Open `src/main.js` in the Apify editor
2. Delete all existing code
3. Copy the entire contents of `apify-actor-improved.js`
4. Paste into `src/main.js`
5. Click "Save"

### 3. Configure Input Schema (Optional)

Add this to the Actor's Input Schema to create a nice UI:

```json
{
    "title": "SADS Contact Extractor Input",
    "type": "object",
    "schemaVersion": 1,
    "properties": {
        "username": {
            "title": "Email",
            "type": "string",
            "description": "Your SADS login email",
            "editor": "textfield",
            "default": "kamil.ksiazek@ks-partners.pl"
        },
        "password": {
            "title": "Password",
            "type": "string",
            "description": "Your SADS password",
            "editor": "textfield",
            "isSecret": true,
            "default": "Kspartners#321"
        }
    },
    "required": ["username", "password"]
}
```

### 4. Test Run

1. Click "Build" and wait for build to complete
2. Click "Start" to run the Actor
3. Check the console logs for detailed progress
4. Look for screenshots in the run output for debugging

### 5. Debugging

If login fails, check the screenshots in order:

- `step1-loaded.png` - What page loaded initially?
- `step2-after-login-click.png` - Did login form appear?
- `step3-credentials-filled.png` - Were credentials filled?
- `step5-after-login.png` - What happened after clicking login?
- `step6-offers-page.png` - Did we reach the offers page?
- `step8-contacts-revealed.png` - Were contacts revealed?

### 6. Schedule (After Successful Test)

Once working, set up a schedule:

1. Go to Actor → "Schedules" tab
2. Click "Create schedule"
3. Set to run hourly during work hours:
   - Cron: `0 9-17 * * 1-5` (9 AM - 5 PM, Monday-Friday)
   - Or: `0 * * * *` for every hour, 24/7

### 7. Retrieve Data

After each run:

- **Structured data**: Go to "Storage" → "Datasets" → View JSON
- **Markdown file**: Go to "Storage" → "Key-value stores" → Download "OUTPUT_MARKDOWN"

## Common Issues and Solutions

### Issue: "Login form not found"
**Solution**: Check `error-no-login-form.png`. The page might:
- Require clicking a "Login" link first (new code handles this)
- Block automated browsers (might need residential proxy)
- Have different structure than expected

### Issue: "Timeout waiting for selector"
**Solution**: The new code has multiple fallbacks and shouldn't timeout as easily. If it still times out:
- Check if www.sads.pl is accessible from Apify (try opening in browser)
- Check if credentials are correct
- Look at screenshot to see what actually loaded

### Issue: "No contact buttons found"
**Solution**:
- Check `step6-offers-page.png` - did we reach the right page?
- The page structure might have changed
- Might need to be logged in correctly first

### Issue: "0 contacts extracted"
**Solution**:
- Check `step8-contacts-revealed.png` to see if contacts appeared
- Buttons might not have clicked successfully
- Page might have anti-bot protection preventing contact reveal

## Next Steps

After getting this working:

1. **Export to Make.com**: Use Apify's Make.com integration to send contacts to your CRM
2. **Email automation**: Connect to SendGrid/Mailgun for cold outreach
3. **SMS automation**: Connect to Twilio for SMS campaigns
4. **Deduplication**: Track extracted contacts to avoid duplicates

## Monitoring

Set up monitoring:

1. In Apify, go to Actor → "Monitoring"
2. Enable "Notify on failure"
3. Add your email or Slack webhook
4. You'll be notified if any scheduled run fails

## Cost Optimization

- Each run uses ~0.01-0.02 compute units (very cheap)
- Running hourly = ~$1-2/month
- Can reduce frequency if needed (e.g., every 2 hours)

## Support

If issues persist:
1. Check Actor run logs for detailed error messages
2. Download all screenshots from failed run
3. Look for Polish error messages on the page itself
4. Check if the website changed their structure
