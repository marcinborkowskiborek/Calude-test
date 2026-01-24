/**
 * SADS CRM Automation - Popup Script
 * v2.0.7 - Auto-continue after page reload
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

        // Zapisz nazwę schematu
        chrome.storage.local.set({ schemaName });

        setButtonState(true);
        showStatus('Uruchamiam automatyzację...', 'info');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('Nie można pobrać aktywnej karty');
            }

            chrome.tabs.sendMessage(tab.id, {
                action: 'runAutomation',
                config: { schemaName }
            }, function(response) {
                setButtonState(false);

                if (chrome.runtime.lastError) {
                    showStatus('Odśwież stronę SADS i spróbuj ponownie', 'error');
                    return;
                }

                if (response && response.success) {
                    showStatus(response.message, 'success');
                } else {
                    showStatus(response?.message || 'Wystąpił błąd', 'error');
                }
            });

        } catch (error) {
            setButtonState(false);
            showStatus(`Błąd: ${error.message}`, 'error');
        }
    }

    // Event listeners
    runBtn.addEventListener('click', runAutomation);

    schemaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            runAutomation();
        }
    });
});
