/**
 * SADS CRM Automation - Popup Script
 * v2.1.1 - Dodane logowanie
 */

document.addEventListener('DOMContentLoaded', function() {
    const runBtn = document.getElementById('runBtn');
    const btnText = document.getElementById('btnText');
    const playIcon = document.getElementById('playIcon');
    const loadingIcon = document.getElementById('loadingIcon');
    const statusDiv = document.getElementById('status');
    const schemaInput = document.getElementById('schemaName');

    // Wczytaj zapisaną nazwę schematu
    chrome.storage.local.get(['schemaName'], function(result) {
        if (result.schemaName) {
            schemaInput.value = result.schemaName;
        }
    });

    // Zapisz nazwę schematu przy zmianie
    schemaInput.addEventListener('change', function() {
        chrome.storage.local.set({ schemaName: schemaInput.value });
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status show ${type}`;
    }

    async function runAutomation() {
        const schemaName = schemaInput.value.trim();

        if (!schemaName) {
            showStatus('Wpisz nazwę schematu!', 'error');
            return;
        }

        chrome.storage.local.set({ schemaName });

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                showStatus('Nie można pobrać aktywnej karty', 'error');
                return;
            }

            console.log('[Popup] Tab ID:', tab.id, 'URL:', tab.url);
            console.log('[Popup] Wysyłam wiadomość do tab:', tab.id);

            // Wyślij wiadomość i czekaj na callback
            chrome.tabs.sendMessage(tab.id, {
                action: 'runAutomation',
                config: { schemaName }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[Popup] Błąd wysyłania:', chrome.runtime.lastError.message);
                    showStatus('Błąd: ' + chrome.runtime.lastError.message, 'error');
                } else {
                    console.log('[Popup] Odpowiedź:', response);
                }
            });

            // Od razu pokaż sukces - skrypt działa w tle
            showStatus('Automatyzacja uruchomiona! Obserwuj stronę i konsolę (F12).', 'success');

            // Zamknij popup po 2 sekundach
            setTimeout(() => {
                window.close();
            }, 2000);

        } catch (error) {
            showStatus(`Błąd: ${error.message}`, 'error');
        }
    }

    runBtn.addEventListener('click', runAutomation);

    schemaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            runAutomation();
        }
    });
});
