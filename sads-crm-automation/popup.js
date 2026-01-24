/**
 * SADS CRM Automation - Popup Script
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

    /**
     * Pokazuje status
     */
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status show ${type}`;
    }

    /**
     * Ustawia stan przycisku
     */
    function setButtonState(loading) {
        runBtn.disabled = loading;
        playIcon.style.display = loading ? 'none' : 'block';
        loadingIcon.style.display = loading ? 'block' : 'none';
        btnText.textContent = loading ? 'Pracuję...' : 'Uruchom automatyzację';
    }

    /**
     * Uruchamia automatyzację
     */
    async function runAutomation() {
        const schemaName = schemaInput.value.trim();

        if (!schemaName) {
            showStatus('Wpisz nazwę schematu!', 'error');
            return;
        }

        setButtonState(true);
        showStatus('Uruchamiam automatyzację...', 'info');

        try {
            // Pobierz aktywną kartę
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('Nie można pobrać aktywnej karty');
            }

            // Sprawdź czy jesteśmy na stronie SADS
            if (!tab.url.includes('sfrm.pl') && !tab.url.includes('sads.pl')) {
                showStatus('Otwórz stronę SADS aby uruchomić automatyzację!', 'error');
                setButtonState(false);
                return;
            }

            // Wyślij wiadomość do content script
            chrome.tabs.sendMessage(tab.id, {
                action: 'runAutomation',
                config: {
                    schemaName: schemaName
                }
            }, function(response) {
                setButtonState(false);

                if (chrome.runtime.lastError) {
                    showStatus('Błąd: Odśwież stronę i spróbuj ponownie', 'error');
                    return;
                }

                if (response && response.success) {
                    showStatus(response.message, 'success');
                } else {
                    showStatus(response?.message || 'Wystąpił nieznany błąd', 'error');
                }
            });

        } catch (error) {
            setButtonState(false);
            showStatus(`Błąd: ${error.message}`, 'error');
        }
    }

    // Event listener na przycisk
    runBtn.addEventListener('click', runAutomation);

    // Enter w polu input
    schemaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            runAutomation();
        }
    });
});
