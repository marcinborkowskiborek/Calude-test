// Popup script for Contact Extractor

let isExtracting = false;

// Get DOM elements
const extractBtn = document.getElementById('extractBtn');
const refreshBtn = document.getElementById('refreshBtn');
const statusText = document.getElementById('statusText');
const contactCount = document.getElementById('contactCount');
const statusMessage = document.getElementById('statusMessage');

// Show status message
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.style.display = 'block';

  if (type !== 'loading') {
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 5000);
  }
}

// Update UI state
function updateUI(status) {
  if (status.isExtracting) {
    statusText.textContent = '🔄 Wyciąganie...';
    extractBtn.disabled = true;
    extractBtn.textContent = '⏳ Przetwarzanie...';
  } else {
    statusText.textContent = '✅ Gotowy';
    extractBtn.disabled = false;
    extractBtn.textContent = '🚀 Start Extraction';
  }

  contactCount.textContent = status.count || 0;
}

// Get current tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Start extraction
async function startExtraction() {
  try {
    isExtracting = true;
    updateUI({ isExtracting: true, count: 0 });
    showStatus('Rozpoczynam wyciąganie kontaktów...', 'loading');

    const tab = await getCurrentTab();

    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'startExtraction' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Błąd: ' + chrome.runtime.lastError.message, 'error');
        isExtracting = false;
        updateUI({ isExtracting: false, count: 0 });
        return;
      }

      if (response && response.success) {
        showStatus(`✅ Zakończono! Znaleziono ${response.count} kontaktów. Plik zostanie pobrany automatycznie.`, 'success');
        isExtracting = false;
        updateUI({ isExtracting: false, count: response.count });
      } else {
        showStatus('Nie znaleziono żadnych kontaktów', 'error');
        isExtracting = false;
        updateUI({ isExtracting: false, count: 0 });
      }
    });

  } catch (error) {
    console.error('Extraction error:', error);
    showStatus('Wystąpił błąd: ' + error.message, 'error');
    isExtracting = false;
    updateUI({ isExtracting: false, count: 0 });
  }
}

// Refresh status
async function refreshStatus() {
  try {
    const tab = await getCurrentTab();

    chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        updateUI({ isExtracting: false, count: 0 });
        return;
      }

      if (response) {
        updateUI(response);
        showStatus('Status zaktualizowany', 'success');
      }
    });

  } catch (error) {
    console.error('Refresh error:', error);
    showStatus('Błąd odświeżania: ' + error.message, 'error');
  }
}

// Event listeners
extractBtn.addEventListener('click', startExtraction);
refreshBtn.addEventListener('click', refreshStatus);

// Initialize on popup open
document.addEventListener('DOMContentLoaded', () => {
  refreshStatus();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractionComplete') {
    isExtracting = false;
    updateUI({ isExtracting: false, count: request.count });
    showStatus(`✅ Wyciągnięto ${request.count} kontaktów!`, 'success');
  }
});
