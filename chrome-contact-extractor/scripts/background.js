// Background service worker for handling downloads and data processing

// Generate markdown from extracted data
function generateMarkdown(data) {
  let markdown = `# Wyciągnięte kontakty\n\n`;
  markdown += `Data wyciągnięcia: ${new Date().toLocaleString('pl-PL')}\n`;
  markdown += `Liczba ofert: ${data.length}\n\n`;
  markdown += `---\n\n`;

  data.forEach((item, index) => {
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
      markdown += `📞 **Telefon:** ${item.phone}\n\n`;
    }

    if (item.email) {
      markdown += `📧 **Email:** ${item.email}\n\n`;
    }

    if (item.description) {
      markdown += `**Opis:**\n\n${item.description}\n\n`;
    }

    if (item.id) {
      markdown += `**ID oferty:** ${item.id}\n\n`;
    }

    if (item.offerUrl) {
      markdown += `**Link do oferty:** ${item.offerUrl}\n\n`;
    }

    if (item.url) {
      markdown += `**Źródło:** ${item.url}\n\n`;
    }

    if (item.extractedAt) {
      markdown += `*Wyciągnięto: ${new Date(item.extractedAt).toLocaleString('pl-PL')}*\n\n`;
    }

    markdown += `---\n\n`;
  });

  return markdown;
}

// Download markdown file
function downloadMarkdown(data) {
  const markdown = generateMarkdown(data);

  // Use data URL instead of blob URL (Manifest v3 service workers don't support URL.createObjectURL)
  const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `kontakty_${timestamp}.md`;

  console.log('Starting download...');

  chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download error:', chrome.runtime.lastError);
    } else {
      console.log('✅ Download started with ID:', downloadId);
    }
  });
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadContacts') {
    console.log('Received data for download:', request.data);

    if (request.data && request.data.length > 0) {
      downloadMarkdown(request.data);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No data to download' });
    }
  }

  return true;
});

// Log when extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Contact Extractor installed!');
  } else if (details.reason === 'update') {
    console.log('Contact Extractor updated to version', chrome.runtime.getManifest().version);
  }
});
