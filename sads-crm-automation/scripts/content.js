/**
 * SADS CRM Automation - Content Script
 * Automatyzacja wyszukiwania w schematach CRM
 */

(function() {
    'use strict';

    // Konfiguracja
    const CONFIG = {
        schemaName: 'Marcin Borkowski Nowe', // Nazwa schematu do wyszukania
        delays: {
            afterButtonClick: 1000,  // Opóźnienie po kliknięciu przycisku
            betweenActions: 500,     // Opóźnienie między akcjami
            waitForModal: 2000       // Maksymalny czas oczekiwania na modal
        }
    };

    // Status automatyzacji
    let isRunning = false;

    /**
     * Logowanie z prefixem
     */
    function log(message, type = 'info') {
        const prefix = '[SADS CRM Auto]';
        const styles = {
            info: 'color: #2196F3',
            success: 'color: #4CAF50',
            error: 'color: #f44336',
            warning: 'color: #FF9800'
        };
        console.log(`%c${prefix} ${message}`, styles[type] || styles.info);
    }

    /**
     * Czeka określony czas
     */
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Czeka na pojawienie się elementu w DOM
     */
    function waitForElement(selector, timeout = 5000, parent = document) {
        return new Promise((resolve, reject) => {
            const element = parent.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const el = parent.querySelector(selector);
                if (el) {
                    obs.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout: Element "${selector}" nie został znaleziony`));
            }, timeout);
        });
    }

    /**
     * Znajduje przycisk "Powiadomienia i schematy"
     */
    function findNotificationsButton() {
        // Szukamy ikony glyphicon-floppy-disk (przycisk "Powiadomienia i schematy")
        const floppyIcon = document.querySelector('.glyphicon-floppy-disk');
        if (floppyIcon) {
            // Zwracamy rodzica - klikalny element (button, a, div)
            const clickable = floppyIcon.closest('button, a, [role="button"], .btn, div[onclick]') || floppyIcon.parentElement;
            if (clickable) {
                log('Znaleziono przycisk przez ikonę glyphicon-floppy-disk', 'success');
                return clickable;
            }
        }

        // Alternatywnie szukamy po tekście
        const allElements = document.querySelectorAll('button, a, div[role="button"], span, div');
        for (const el of allElements) {
            const text = el.textContent || el.innerText || '';
            if (text.includes('Powiadomienia i schematy') ||
                (text.includes('Powiadomienia') && text.includes('schematy'))) {
                log(`Znaleziono przycisk po tekście: "${text.trim().substring(0, 50)}..."`, 'success');
                return el;
            }
        }

        // Szukamy po atrybutach title
        const byTitle = document.querySelector('[title*="Powiadomienia"], [title*="schematy"]');
        if (byTitle) {
            log('Znaleziono przycisk po atrybucie title', 'success');
            return byTitle;
        }

        return null;
    }

    /**
     * Znajduje modal CRM
     */
    function findCRMModal() {
        // Szukamy modala po nagłówku "CRM"
        const modals = document.querySelectorAll('.modal, [role="dialog"], .popup, .dialog, div[class*="modal"]');

        for (const modal of modals) {
            if (modal.textContent.includes('CRM') &&
                (modal.textContent.includes('Schematy') || modal.textContent.includes('Teczki'))) {
                return modal;
            }
        }

        // Szukamy po widoczności
        const visibleModals = document.querySelectorAll('.modal.show, .modal.active, .modal[style*="display: block"]');
        for (const modal of visibleModals) {
            if (modal.textContent.includes('Schematy')) {
                return modal;
            }
        }

        return null;
    }

    /**
     * Znajduje przycisk "Wyszukaj" dla konkretnego schematu
     * Nowe podejście: szukamy przycisku "Wyszukaj" którego kontener zawiera nazwę schematu
     */
    function findSearchButtonForSchema(schemaName) {
        log(`Szukam przycisku "Wyszukaj" dla schematu: "${schemaName}"`, 'info');

        // Znajdź wszystkie przyciski zawierające tekst "Wyszukaj"
        const allButtons = document.querySelectorAll('button, a.btn, .btn, [role="button"]');
        const searchButtons = [];

        for (const btn of allButtons) {
            const text = btn.textContent || btn.title || '';
            if (text.includes('Wyszukaj')) {
                searchButtons.push(btn);
            }
        }

        log(`Znaleziono ${searchButtons.length} przycisków "Wyszukaj"`, 'info');

        // Dla każdego przycisku "Wyszukaj" sprawdź czy jego kontener zawiera nazwę schematu
        for (const btn of searchButtons) {
            // Szukamy w górę drzewa DOM kontenera który zawiera nazwę schematu
            let container = btn.parentElement;

            // Przechodzimy maksymalnie 10 poziomów w górę
            for (let i = 0; i < 10 && container; i++) {
                const containerText = container.textContent || '';

                // Sprawdzamy czy kontener zawiera nazwę schematu
                if (containerText.includes(schemaName)) {
                    // Upewniamy się że to nie jest zbyt duży kontener (np. cały modal)
                    // Kontener nie powinien zawierać więcej niż kilka przycisków "Wyszukaj"
                    const buttonsInContainer = container.querySelectorAll('button, .btn');
                    const searchButtonsInContainer = Array.from(buttonsInContainer).filter(b =>
                        (b.textContent || '').includes('Wyszukaj')
                    );

                    // Jeśli kontener ma tylko 1 przycisk "Wyszukaj" - to nasz wiersz!
                    if (searchButtonsInContainer.length === 1) {
                        log(`Znaleziono przycisk "Wyszukaj" dla "${schemaName}" (kontener: ${container.tagName}.${container.className})`, 'success');
                        return btn;
                    }
                }

                container = container.parentElement;
            }
        }

        // Alternatywna metoda: znajdź element z tekstem schematu i szukaj przycisku w pobliżu
        log('Próbuję alternatywnej metody...', 'info');

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (node.textContent.includes(schemaName)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let textNode;
        while (textNode = walker.nextNode()) {
            // Znaleźliśmy tekst, teraz szukamy najbliższego przycisku "Wyszukaj"
            let element = textNode.parentElement;

            for (let i = 0; i < 15 && element; i++) {
                const searchBtn = element.querySelector('button.btn-success, .btn-success, button:has(.glyphicon-search)');
                if (searchBtn && (searchBtn.textContent || '').includes('Wyszukaj')) {
                    log(`Znaleziono przycisk alternatywną metodą`, 'success');
                    return searchBtn;
                }

                // Szukamy też po tekście
                const btns = element.querySelectorAll('button, .btn');
                for (const b of btns) {
                    if ((b.textContent || '').includes('Wyszukaj')) {
                        // Sprawdź czy to nie jest przycisk z innego wiersza
                        const parentText = b.closest('div, tr, li')?.textContent || '';
                        if (parentText.includes(schemaName)) {
                            log(`Znaleziono przycisk "Wyszukaj" alternatywną metodą`, 'success');
                            return b;
                        }
                    }
                }

                element = element.parentElement;
            }
        }

        return null;
    }

    /**
     * Kliknięcie z symulacją naturalnego zachowania
     */
    function clickElement(element) {
        if (!element) {
            log('Element do kliknięcia nie istnieje', 'error');
            return false;
        }

        try {
            // Scroll do elementu
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Symulacja hover
            element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

            // Kliknięcie
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            element.click();

            return true;
        } catch (error) {
            log(`Błąd kliknięcia: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Główna funkcja automatyzacji
     */
    async function runAutomation() {
        if (isRunning) {
            log('Automatyzacja już działa', 'warning');
            return { success: false, message: 'Automatyzacja już działa' };
        }

        isRunning = true;
        log('Rozpoczynam automatyzację...', 'info');

        try {
            // KROK 1: Znajdź i kliknij "Powiadomienia i schematy"
            log('Krok 1: Szukam przycisku "Powiadomienia i schematy"...', 'info');
            const notifButton = findNotificationsButton();

            if (!notifButton) {
                throw new Error('Nie znaleziono przycisku "Powiadomienia i schematy"');
            }

            clickElement(notifButton);
            log('Kliknięto przycisk "Powiadomienia i schematy"', 'success');

            // Czekamy na otwarcie modala
            await wait(CONFIG.delays.afterButtonClick);

            // KROK 2: Poczekaj na modal CRM
            log('Krok 2: Czekam na modal CRM...', 'info');
            await wait(CONFIG.delays.waitForModal);

            const modal = findCRMModal();
            if (!modal) {
                log('Modal CRM może nie być widoczny, kontynuuję...', 'warning');
            } else {
                log('Modal CRM otwarty', 'success');
            }

            // KROK 3: Znajdź przycisk "Wyszukaj" dla konkretnego schematu
            log(`Krok 3: Szukam przycisku "Wyszukaj" dla "${CONFIG.schemaName}"...`, 'info');
            await wait(CONFIG.delays.betweenActions);

            const searchButton = findSearchButtonForSchema(CONFIG.schemaName);

            if (!searchButton) {
                throw new Error(`Nie znaleziono przycisku "Wyszukaj" dla schematu "${CONFIG.schemaName}"`);
            }

            // KROK 4: Kliknij przycisk "Wyszukaj"
            log('Krok 4: Klikam przycisk "Wyszukaj"...', 'info');

            await wait(CONFIG.delays.betweenActions);
            clickElement(searchButton);
            log('Kliknięto przycisk "Wyszukaj"!', 'success');

            isRunning = false;
            return {
                success: true,
                message: 'Automatyzacja zakończona pomyślnie! Kliknięto przycisk Wyszukaj.'
            };

        } catch (error) {
            log(`Błąd: ${error.message}`, 'error');
            isRunning = false;
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Aktualizuje konfigurację
     */
    function updateConfig(newConfig) {
        if (newConfig.schemaName) {
            CONFIG.schemaName = newConfig.schemaName;
            log(`Zmieniono nazwę schematu na: ${CONFIG.schemaName}`, 'info');
        }
        if (newConfig.delays) {
            Object.assign(CONFIG.delays, newConfig.delays);
        }
    }

    // Nasłuchiwanie wiadomości z popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'runAutomation') {
            // Aktualizuj config jeśli przesłano
            if (request.config) {
                updateConfig(request.config);
            }

            runAutomation().then(result => {
                sendResponse(result);
            });
            return true; // Async response
        }

        if (request.action === 'getStatus') {
            sendResponse({
                isRunning,
                config: CONFIG
            });
            return true;
        }

        if (request.action === 'updateConfig') {
            updateConfig(request.config);
            sendResponse({ success: true, config: CONFIG });
            return true;
        }
    });

    log('Content script załadowany i gotowy', 'success');

})();
