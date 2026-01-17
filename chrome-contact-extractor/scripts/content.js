// Content script for extracting contacts from real estate listings

class ContactExtractor {
  constructor() {
    this.extractedData = [];
    this.isExtracting = false;
  }

  // Find all "Pokaż kontakt" buttons on the page
  findContactButtons() {
    const buttons = [];

    // Search for buttons with text containing "Pokaż kontakt" or "kontakt"
    const allButtons = document.querySelectorAll('button, a, div[role="button"]');

    allButtons.forEach(btn => {
      const text = btn.textContent.trim().toLowerCase();
      if (text.includes('pokaz') && text.includes('kontakt') ||
          text.includes('pokaż kontakt') ||
          btn.classList.toString().toLowerCase().includes('kontakt')) {
        buttons.push(btn);
      }
    });

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
      // Try to find the parent listing container
      let container = listingElement.closest('[class*="listing"]') ||
                     listingElement.closest('[class*="offer"]') ||
                     listingElement.closest('[class*="item"]') ||
                     listingElement.closest('article') ||
                     listingElement.parentElement;

      // Go up a few levels to find the main container
      for (let i = 0; i < 5; i++) {
        if (container && container.querySelector('h1, h2, h3, h4, [class*="title"]')) {
          break;
        }
        container = container?.parentElement;
      }

      if (container) {
        // Extract title
        const titleEl = container.querySelector('h1, h2, h3, h4, [class*="title"]');
        if (titleEl) {
          data.title = titleEl.textContent.trim();
        }

        // Extract price
        const priceEl = container.querySelector('[class*="price"], [class*="cena"]');
        if (priceEl) {
          data.price = priceEl.textContent.trim();
        }

        // Extract location
        const locationEl = container.querySelector('[class*="location"], [class*="miejsce"], [class*="address"]');
        if (locationEl) {
          data.location = locationEl.textContent.trim();
        }

        // Extract area/size
        const areaEl = container.querySelector('[class*="area"], [class*="powierzchnia"], [class*="size"]');
        if (areaEl) {
          data.area = areaEl.textContent.trim();
        }

        // Extract description
        const descEl = container.querySelector('[class*="description"], [class*="opis"], p');
        if (descEl) {
          data.description = descEl.textContent.trim().substring(0, 500); // Limit to 500 chars
        }

        // Extract phone numbers (look for patterns)
        const phoneRegex = /(\+?48\s?)?(\d{3}[\s-]?\d{3}[\s-]?\d{3}|\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/g;
        const containerText = container.textContent;
        const phones = containerText.match(phoneRegex);
        if (phones) {
          data.phone = [...new Set(phones)].join(', ');
        }

        // Extract emails
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = containerText.match(emailRegex);
        if (emails) {
          data.email = [...new Set(emails)].join(', ');
        }

        // Try to find ID
        const idEl = container.querySelector('[class*="id"]');
        if (idEl) {
          const idMatch = idEl.textContent.match(/\d+/);
          if (idMatch) {
            data.id = idMatch[0];
          }
        }
      }
    } catch (error) {
      console.error('Error extracting listing data:', error);
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
      console.log('Extraction already in progress');
      return;
    }

    this.isExtracting = true;
    this.extractedData = [];

    try {
      const buttons = this.findContactButtons();
      console.log(`Found ${buttons.length} contact buttons`);

      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];

        // Scroll button into view
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.sleep(500);

        // Click the button
        try {
          button.click();
          console.log(`Clicked button ${i + 1}/${buttons.length}`);

          // Wait for contact info to appear
          await this.waitForContactInfo(button);

          // Extract data from this listing
          const listingData = this.extractListingData(button);

          // Only add if we have some meaningful data
          if (listingData.title || listingData.phone || listingData.email) {
            this.extractedData.push(listingData);
            console.log('Extracted:', listingData);
          }

          // Small delay between clicks
          await this.sleep(800);
        } catch (error) {
          console.error(`Error processing button ${i + 1}:`, error);
        }
      }

      console.log(`Extraction complete! Found ${this.extractedData.length} listings with data`);

      // Send data to background script for download
      chrome.runtime.sendMessage({
        action: 'downloadContacts',
        data: this.extractedData
      });

    } catch (error) {
      console.error('Error during extraction:', error);
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
console.log('Contact Extractor loaded! Use popup to start extraction.');
