// Content script for extracting contacts from real estate listings

class ContactExtractor {
  constructor() {
    this.extractedData = [];
    this.isExtracting = false;
  }

  // Find all "Pokaż kontakt" buttons on the page
  findContactButtons() {
    const buttons = [];

    console.log('🔍 Starting button search...');

    // Strategy 1: Find by text content (most reliable)
    const allClickableElements = document.querySelectorAll('button, a, div[onclick], span[onclick], div[role="button"], [class*="button"], [class*="btn"]');
    console.log(`Found ${allClickableElements.length} clickable elements to check`);

    allClickableElements.forEach((el, index) => {
      const text = el.textContent.trim().toLowerCase();
      const classes = el.className.toString().toLowerCase();
      const id = el.id ? el.id.toLowerCase() : '';

      // Check various patterns
      const patterns = [
        'pokaz',
        'pokaż',
        'kontakt',
        'phone',
        'telefon',
        'contact',
        'show'
      ];

      let matchedPattern = null;

      // Check text content
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          matchedPattern = `text contains "${pattern}"`;
          break;
        }
      }

      // Check classes if no text match
      if (!matchedPattern) {
        for (const pattern of patterns) {
          if (classes.includes(pattern)) {
            matchedPattern = `class contains "${pattern}"`;
            break;
          }
        }
      }

      // Check ID if no match yet
      if (!matchedPattern && id) {
        for (const pattern of patterns) {
          if (id.includes(pattern)) {
            matchedPattern = `id contains "${pattern}"`;
            break;
          }
        }
      }

      if (matchedPattern) {
        console.log(`✓ Found potential button #${buttons.length + 1}: "${text.substring(0, 50)}" (${matchedPattern})`);
        console.log(`  Element:`, el);
        console.log(`  Classes: ${classes}`);
        buttons.push(el);
      }
    });

    // Strategy 2: Look for elements with "Pokaż" text specifically
    if (buttons.length === 0) {
      console.log('⚠️ No buttons found with Strategy 1, trying Strategy 2...');

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim().toLowerCase();
        if ((text.includes('pokaz') || text.includes('pokaż')) && text.includes('kontakt')) {
          textNodes.push(node);
        }
      }

      console.log(`Found ${textNodes.length} text nodes with "Pokaż kontakt"`);

      textNodes.forEach(textNode => {
        let parent = textNode.parentElement;
        let depth = 0;

        // Go up 5 levels to find clickable parent
        while (parent && depth < 5) {
          const isClickable = parent.onclick ||
                            parent.tagName === 'BUTTON' ||
                            parent.tagName === 'A' ||
                            parent.getAttribute('role') === 'button' ||
                            parent.classList.toString().includes('button') ||
                            parent.classList.toString().includes('btn');

          if (isClickable) {
            console.log(`✓ Found button via text node search:`, parent);
            buttons.push(parent);
            break;
          }

          parent = parent.parentElement;
          depth++;
        }
      });
    }

    console.log(`\n✅ Total buttons found: ${buttons.length}`);

    if (buttons.length === 0) {
      console.warn('❌ No contact buttons found! Tips:');
      console.warn('  1. Make sure you are on a page with property listings');
      console.warn('  2. The page might use different text than "Pokaż kontakt"');
      console.warn('  3. Try running in console: document.querySelectorAll("*")');
    }

    return buttons;
  }

  // Extract data from a single listing element
  extractListingData(listingElement) {
    const data = {
      title: '',
      location: '',
      price: '',
      area: '',
      description: '',
      phone: '',
      email: '',
      url: window.location.href,
      extractedAt: new Date().toISOString()
    };

    try {
      console.log('🔍 Finding listing container...');

      // Try to find the parent listing container
      let container = listingElement.closest('[class*="listing"]') ||
                     listingElement.closest('[class*="offer"]') ||
                     listingElement.closest('[class*="item"]') ||
                     listingElement.closest('[class*="card"]') ||
                     listingElement.closest('article') ||
                     listingElement.closest('[class*="result"]') ||
                     listingElement.closest('li') ||
                     listingElement.parentElement;

      // Go up more levels to find the main container
      let attempts = 0;
      while (container && attempts < 10) {
        // Look for common listing indicators
        const hasTitle = container.querySelector('h1, h2, h3, h4, h5, a[href*="oferta"], a[href*="offer"], [class*="title"]');
        const hasPrice = container.querySelector('[class*="price"], [class*="cena"]') ||
                        /\d+\s*(?:zł|PLN|EUR)/.test(container.textContent);

        if (hasTitle || hasPrice) {
          console.log('✓ Found listing container:', container.className || container.tagName);
          break;
        }

        container = container.parentElement;
        attempts++;
      }

      if (container) {
        console.log('📦 Extracting from container:', container.className);

        // Extract title - try multiple strategies
        let titleEl = container.querySelector('h1, h2, h3, h4, h5') ||
                     container.querySelector('[class*="title"]') ||
                     container.querySelector('a[class*="title"]') ||
                     container.querySelector('a[href*="oferta"]') ||
                     container.querySelector('a[href*="offer"]');

        if (titleEl) {
          data.title = titleEl.textContent.trim();
          console.log(`  Title: ${data.title.substring(0, 50)}...`);
        }

        // Extract location - multiple strategies
        let locationEl = container.querySelector('[class*="location"]') ||
                        container.querySelector('[class*="miejsce"]') ||
                        container.querySelector('[class*="address"]') ||
                        container.querySelector('[class*="lokalizacja"]');

        if (locationEl) {
          data.location = locationEl.textContent.trim();
          console.log(`  Location: ${data.location}`);
        }

        // Extract price - multiple strategies
        let priceEl = container.querySelector('[class*="price"]') ||
                     container.querySelector('[class*="cena"]') ||
                     container.querySelector('[class*="kwota"]');

        if (priceEl) {
          data.price = priceEl.textContent.trim();
          console.log(`  Price: ${data.price}`);
        } else {
          // Try regex if no element found
          const priceMatch = container.textContent.match(/(\d+[\s,.]?\d*)\s*(zł|PLN|EUR)/);
          if (priceMatch) {
            data.price = priceMatch[0];
            console.log(`  Price (regex): ${data.price}`);
          }
        }

        // Extract area/size - multiple strategies
        let areaEl = container.querySelector('[class*="area"]') ||
                    container.querySelector('[class*="powierzchnia"]') ||
                    container.querySelector('[class*="size"]') ||
                    container.querySelector('[class*="metr"]');

        if (areaEl) {
          data.area = areaEl.textContent.trim();
          console.log(`  Area: ${data.area}`);
        } else {
          // Try regex for m² or m2
          const areaMatch = container.textContent.match(/(\d+[\s,.]?\d*)\s*m[²2]/);
          if (areaMatch) {
            data.area = areaMatch[0];
            console.log(`  Area (regex): ${data.area}`);
          }
        }

        // Extract description
        let descEl = container.querySelector('[class*="description"]') ||
                    container.querySelector('[class*="opis"]') ||
                    container.querySelector('p');

        if (descEl) {
          data.description = descEl.textContent.trim().substring(0, 500);
          console.log(`  Description: ${data.description.substring(0, 50)}...`);
        }

        // Extract phone numbers - improved regex patterns
        const containerText = container.textContent;

        // Multiple phone patterns for Polish numbers
        const phonePatterns = [
          /(\+48\s?)?(\d{3}[\s\-]?\d{3}[\s\-]?\d{3})/g,  // 123 456 789 or 123-456-789
          /(\+48\s?)?(\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/g,  // 12 345 67 89
          /(\+48\s?)?(\d{9})/g,  // 123456789
          /(\d{3}[\s\-]\d{3}[\s\-]\d{3})/g  // Just the digits
        ];

        let allPhones = [];
        phonePatterns.forEach(pattern => {
          const matches = containerText.match(pattern);
          if (matches) {
            allPhones = allPhones.concat(matches);
          }
        });

        if (allPhones.length > 0) {
          // Remove duplicates and clean up
          const uniquePhones = [...new Set(allPhones.map(p => p.trim()))];
          data.phone = uniquePhones.join(', ');
          console.log(`  Phone: ${data.phone}`);
        }

        // Extract emails - improved regex
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = containerText.match(emailRegex);
        if (emails) {
          data.email = [...new Set(emails)].join(', ');
          console.log(`  Email: ${data.email}`);
        }

        // Try to find ID - multiple strategies
        const idEl = container.querySelector('[class*="id"]') ||
                    container.querySelector('[id*="id"]');

        if (idEl) {
          const idMatch = idEl.textContent.match(/\d+/);
          if (idMatch) {
            data.id = idMatch[0];
            console.log(`  ID: ${data.id}`);
          }
        } else {
          // Try to find ID in URL or attributes
          const linkEl = container.querySelector('a[href*="id="], a[href*="/id/"], a[href*="oferta"], a[href*="offer"]');
          if (linkEl && linkEl.href) {
            const urlIdMatch = linkEl.href.match(/(?:id=|\/id\/|\/oferta\/|\/offer\/)(\d+)/);
            if (urlIdMatch) {
              data.id = urlIdMatch[1];
              console.log(`  ID (from URL): ${data.id}`);
            }
          }
        }
      } else {
        console.warn('⚠️ Could not find listing container');
      }
    } catch (error) {
      console.error('❌ Error extracting listing data:', error);
    }

    return data;
  }

  // Wait for contact info to appear after clicking button
  async waitForContactInfo(button, timeout = 3000) {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Look for phone numbers or emails that appeared near the button
        const parent = button.closest('[class*="listing"], [class*="offer"], article') || button.parentElement;
        const text = parent?.textContent || '';

        const hasPhone = /\d{3}[\s-]?\d{3}[\s-]?\d{3}/.test(text);
        const hasEmail = /@/.test(text);

        if (hasPhone || hasEmail || (Date.now() - startTime > timeout)) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
    });
  }

  // Main extraction function
  async extractAllContacts() {
    if (this.isExtracting) {
      console.log('⚠️ Extraction already in progress');
      return;
    }

    console.log('\n🚀 Starting Contact Extraction...\n');
    this.isExtracting = true;
    this.extractedData = [];

    try {
      const buttons = this.findContactButtons();
      console.log(`\n📋 Summary: Found ${buttons.length} contact buttons to process\n`);

      if (buttons.length === 0) {
        console.error('❌ No buttons found! Cannot proceed.');
        console.log('\n💡 DEBUG TIP: Open browser console (F12) and run:');
        console.log('   extractor.findContactButtons()');
        console.log('   to see detailed search results\n');

        // Send empty result
        chrome.runtime.sendMessage({
          action: 'downloadContacts',
          data: []
        });

        return [];
      }

      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];

        console.log(`\n--- Processing button ${i + 1}/${buttons.length} ---`);

        // Scroll button into view
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.sleep(500);

        // Click the button
        try {
          console.log(`🖱️ Clicking button...`);
          button.click();

          // Wait for contact info to appear
          console.log(`⏳ Waiting for contact info to load...`);
          await this.waitForContactInfo(button, 5000); // Increased timeout to 5s

          // Extract data from this listing
          console.log(`📊 Extracting data...`);
          const listingData = this.extractListingData(button);

          // Only add if we have some meaningful data
          if (listingData.title || listingData.phone || listingData.email) {
            this.extractedData.push(listingData);
            console.log(`✅ Extracted data:`, {
              title: listingData.title?.substring(0, 50) + '...',
              phone: listingData.phone || 'none',
              email: listingData.email || 'none',
              location: listingData.location || 'none'
            });
          } else {
            console.warn(`⚠️ No useful data found for this listing`);
          }

          // Small delay between clicks
          await this.sleep(800);
        } catch (error) {
          console.error(`❌ Error processing button ${i + 1}:`, error);
        }
      }

      console.log(`\n\n🎉 Extraction complete!`);
      console.log(`📊 Results: ${this.extractedData.length} listings with data extracted`);
      console.log(`📥 Downloading file...\n`);

      // Send data to background script for download
      if (this.extractedData.length > 0) {
        chrome.runtime.sendMessage({
          action: 'downloadContacts',
          data: this.extractedData
        });
      } else {
        console.warn('⚠️ No data to download');
      }

    } catch (error) {
      console.error('❌ Fatal error during extraction:', error);
    } finally {
      this.isExtracting = false;
    }

    return this.extractedData;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate markdown from extracted data
  generateMarkdown() {
    let markdown = `# Wyciągnięte kontakty\n\n`;
    markdown += `Data wyciągnięcia: ${new Date().toLocaleString('pl-PL')}\n`;
    markdown += `Liczba ofert: ${this.extractedData.length}\n\n`;
    markdown += `---\n\n`;

    this.extractedData.forEach((item, index) => {
      markdown += `## ${index + 1}. ${item.title || 'Bez tytułu'}\n\n`;

      if (item.location) {
        markdown += `**Lokalizacja:** ${item.location}\n\n`;
      }

      if (item.price) {
        markdown += `**Cena:** ${item.price}\n\n`;
      }

      if (item.area) {
        markdown += `**Powierzchnia:** ${item.area}\n\n`;
      }

      if (item.phone) {
        markdown += `**Telefon:** ${item.phone}\n\n`;
      }

      if (item.email) {
        markdown += `**Email:** ${item.email}\n\n`;
      }

      if (item.description) {
        markdown += `**Opis:**\n${item.description}\n\n`;
      }

      if (item.id) {
        markdown += `**ID:** ${item.id}\n\n`;
      }

      markdown += `**URL:** ${item.url}\n\n`;
      markdown += `---\n\n`;
    });

    return markdown;
  }
}

// Create global instance
const extractor = new ContactExtractor();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startExtraction') {
    extractor.extractAllContacts().then(data => {
      sendResponse({ success: true, count: data.length });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'getStatus') {
    sendResponse({
      isExtracting: extractor.isExtracting,
      count: extractor.extractedData.length
    });
  }
});

// Auto-inject indicator when page loads
console.log('✅ Contact Extractor loaded!');
console.log('💡 Use popup to start extraction, or test in console with:');
console.log('   extractor.findContactButtons() - to see what buttons are found');
console.log('   extractor.testExtraction() - to do a quick test');

// Add test function for debugging
ContactExtractor.prototype.testExtraction = function() {
  console.log('\n🧪 Running TEST mode...\n');

  // Test 1: Find buttons
  console.log('TEST 1: Finding buttons...');
  const buttons = this.findContactButtons();

  if (buttons.length === 0) {
    console.error('❌ TEST FAILED: No buttons found');
    console.log('\n🔍 Let\'s try some manual searches:');

    // Manual search suggestions
    console.log('\n1. Search for all buttons:');
    const allButtons = document.querySelectorAll('button');
    console.log(`   Found ${allButtons.length} <button> elements`);
    if (allButtons.length > 0) {
      console.log('   First few buttons:');
      Array.from(allButtons).slice(0, 5).forEach((btn, i) => {
        console.log(`   ${i + 1}. "${btn.textContent.trim().substring(0, 60)}" - classes: ${btn.className}`);
      });
    }

    console.log('\n2. Search for all links:');
    const allLinks = document.querySelectorAll('a');
    console.log(`   Found ${allLinks.length} <a> elements`);

    console.log('\n3. Search for text "Pokaż":');
    const bodyText = document.body.textContent;
    const hasPokazText = bodyText.toLowerCase().includes('pokaż');
    const hasKontaktText = bodyText.toLowerCase().includes('kontakt');
    console.log(`   Page contains "pokaż": ${hasPokazText}`);
    console.log(`   Page contains "kontakt": ${hasKontaktText}`);

    console.log('\n4. Manual selector test:');
    console.log('   Try this in console:');
    console.log('   document.querySelectorAll(\'*\').forEach(el => {');
    console.log('     if (el.textContent.includes("Pokaż")) console.log(el);');
    console.log('   });');

    return;
  }

  console.log(`✅ TEST 1 PASSED: Found ${buttons.length} buttons`);

  // Test 2: Try clicking first button
  console.log('\n TEST 2: Testing first button click...');
  const firstButton = buttons[0];
  console.log('Button element:', firstButton);
  console.log('Button text:', firstButton.textContent.trim());
  console.log('Button classes:', firstButton.className);

  // Test 3: Extract data
  console.log('\nTEST 3: Testing data extraction...');
  const data = this.extractListingData(firstButton);
  console.log('Extracted data:', data);

  console.log('\n✅ Test complete! You can now run the full extraction with:');
  console.log('   extractor.extractAllContacts()');
};
