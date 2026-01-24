/**
 * SADS CRM Automation - Popup Script
 * v2.0.6 - Two-step automation
 */

document.addEventListener('DOMContentLoaded', function() {
    const step1Btn = document.getElementById('step1Btn');
    const step2Btn = document.getElementById('step2Btn');
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
    function setButtonState(btn, loading) {
        btn.disabled = loading;
        if (loading) {
            btn.style.opacity = '0.7';
        } else {
            btn.style.opacity = '1';
        }
    }

    /**
     * Wysyła akcję do content script
     */
    async function sendAction(action, config = {}) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('Nie można pobrać aktywnej karty');
            }

            return new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action, config }, function(response) {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Odśwież stronę i spróbuj ponownie'));
                        return;
                    }
                    resolve(response);
                });
            });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Etap 1: Wyszukaj oferty
     */
    async function runStep1() {
        const schemaName = schemaInput.value.trim();

        if (!schemaName) {
            showStatus('Wpisz nazwę schematu!', 'error');
            return;
        }

        setButtonState(step1Btn, true);
        showStatus('Etap 1: Szukam i klikam "Wyszukaj"...', 'info');

        try {
            const response = await sendAction('runStep1', { schemaName });

            if (response && response.success) {
                showStatus(response.message, 'success');
            } else {
                showStatus(response?.message || 'Wystąpił błąd', 'error');
            }
        } catch (error) {
            showStatus(`Błąd: ${error.message}`, 'error');
        } finally {
            setButtonState(step1Btn, false);
        }
    }

    /**
     * Etap 2: Zaznacz i dodaj do koszyka
     */
    async function runStep2() {
        setButtonState(step2Btn, true);
        showStatus('Etap 2: Zmieniam na 100, zaznaczam, dodaję...', 'info');

        try {
            const response = await sendAction('runStep2');

            if (response && response.success) {
                showStatus(response.message, 'success');
            } else {
                showStatus(response?.message || 'Wystąpił błąd', 'error');
            }
        } catch (error) {
            showStatus(`Błąd: ${error.message}`, 'error');
        } finally {
            setButtonState(step2Btn, false);
        }
    }

    // Event listeners
    step1Btn.addEventListener('click', runStep1);
    step2Btn.addEventListener('click', runStep2);

    // Enter w polu input uruchamia etap 1
    schemaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            runStep1();
        }
    });
});
