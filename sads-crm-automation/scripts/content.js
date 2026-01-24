/**
 * SADS CRM Automation - Content Script
 * v2.1.0 - Proste podejście z długimi opóźnieniami
 */

(function() {
    'use strict';

    // Konfiguracja
    const CONFIG = {
        schemaName: 'Marcin Borkowski Nowe',
        delays: {
            afterClick: 1000,
            waitForModal: 2000,
            waitForResults: 5000,      // Po kliknięciu "Wyszukaj"
            waitForOfferChange: 5000,  // Po zmianie na 100 ofert
            betweenActions: 1000
        }
    };

    let isRunning = false;

    /**
     * Logowanie
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
     * Znajduje przycisk "Powiadomienia i schematy"
     */
    function findNotificationsButton() {
        const floppyIcon = document.querySelector('.glyphicon-floppy-disk');
        if (floppyIcon) {
            const clickable = floppyIcon.closest('button, a, [role="button"], .btn, div[onclick]') || floppyIcon.parentElement;
            if (clickable) {
                return clickable;
            }
        }
        return null;
    }

    /**
     * Znajduje przycisk "Wyszukaj" dla schematu
     */
    function findSearchButtonForSchema(schemaName) {
        const patternRecords = document.querySelectorAll('.patternRecord');
        for (const record of patternRecords) {
            if ((record.textContent || '').includes(schemaName)) {
                const searchBtn = record.querySelector('button.btn-success');
                if (searchBtn) {
                    return searchBtn;
                }
            }
        }
        return null;
    }

    /**
     * Zmienia ilość ofert na 100
     */
    async function changeOffersCount() {
        log('Szukam dropdown z ilością ofert...', 'info');

        // Szukaj elementu zawierającego "50 ofert"
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            const text = (el.textContent || '').trim();
            if (text === '50 ofert' && el.children.length === 0) {
                const dropdown = el.closest('button, .dropdown-toggle, .bootstrap-select, [data-toggle="dropdown"]');
                if (dropdown) {
                    log('Znaleziono dropdown, klikam...', 'info');
                    clickElement(dropdown);
                    await wait(1000);

                    // Szukaj opcji "100 ofert"
                    const options = document.querySelectorAll('li a, .dropdown-item, span.text');
                    for (const opt of options) {
                        if ((opt.textContent || '').trim() === '100 ofert') {
                            log('Znaleziono opcję 100 ofert, klikam...', 'info');
                            clickElement(opt);
                            return true;
                        }
                    }
                }
            }
        }

        // Fallback: szukaj .filter-option-inner-inner
        const trigger = document.querySelector('.filter-option-inner-inner');
        if (trigger && (trigger.textContent || '').includes('50')) {
            const dropdown = trigger.closest('button, .bootstrap-select');
            if (dropdown) {
                clickElement(dropdown);
                await wait(1000);

                const options = document.querySelectorAll('li a span.text');
                for (const opt of options) {
                    if ((opt.textContent || '').trim() === '100 ofert') {
                        clickElement(opt.closest('a') || opt);
                        return true;
                    }
                }
            }
        }

        log('Nie znaleziono dropdown z ilością ofert', 'warning');
        return false;
    }

    /**
     * Zaznacza wszystkie oferty
     */
    function selectAllOffers() {
        const checkAllBox = document.querySelector('input.checkAll, input#checkAll, input[data-scope="list"]');
        if (checkAllBox) {
            if (!checkAllBox.checked) {
                checkAllBox.click();
                log('Zaznaczono wszystkie oferty', 'success');
            } else {
                log('Oferty już zaznaczone', 'info');
            }
            return true;
        }
        log('Nie znaleziono checkboxa', 'warning');
        return false;
    }

    /**
     * Dodaje do koszyka
     */
    function addToCart() {
        const cartIcon = document.querySelector('.glyphicon-shopping-cart');
        if (cartIcon) {
            const cartButton = cartIcon.closest('button, a, .btn') || cartIcon.parentElement;
            if (cartButton) {
                clickElement(cartButton);
                log('Kliknięto koszyk', 'success');
                return true;
            }
        }
        log('Nie znaleziono koszyka', 'warning');
        return false;
    }

    /**
     * Kliknięcie elementu
     */
    function clickElement(element) {
        if (!element) return false;
        try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            element.click();
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * GŁÓWNA FUNKCJA - wykonuje wszystko sekwencyjnie
     */
    async function runFullAutomation() {
        if (isRunning) {
            return { success: false, message: 'Już działa' };
        }

        isRunning = true;
        log('========================================', 'info');
        log('=== ROZPOCZYNAM AUTOMATYZACJĘ v2.1.0 ===', 'info');
        log('========================================', 'info');

        try {
            // KROK 1: Kliknij "Powiadomienia i schematy"
            log('KROK 1: Szukam przycisku "Powiadomienia i schematy"...', 'info');
            const notifButton = findNotificationsButton();
            if (!notifButton) {
                throw new Error('Nie znaleziono przycisku "Powiadomienia i schematy"');
            }
            clickElement(notifButton);
            log('KROK 1: OK - kliknięto', 'success');

            // Czekaj na modal
            await wait(CONFIG.delays.waitForModal);

            // KROK 2: Znajdź i kliknij "Wyszukaj"
            log(`KROK 2: Szukam schematu "${CONFIG.schemaName}"...`, 'info');
            const searchButton = findSearchButtonForSchema(CONFIG.schemaName);
            if (!searchButton) {
                throw new Error(`Nie znaleziono schematu "${CONFIG.schemaName}"`);
            }
            clickElement(searchButton);
            log('KROK 2: OK - kliknięto "Wyszukaj"', 'success');

            // CZEKAJ na załadowanie wyników (5 sekund)
            log(`Czekam ${CONFIG.delays.waitForResults/1000}s na załadowanie wyników...`, 'info');
            await wait(CONFIG.delays.waitForResults);

            // KROK 3: Zmień na 100 ofert
            log('KROK 3: Zmieniam ilość ofert na 100...', 'info');
            const changed = await changeOffersCount();
            if (changed) {
                log('KROK 3: OK - zmieniono na 100 ofert', 'success');
                // CZEKAJ na przeładowanie (5 sekund)
                log(`Czekam ${CONFIG.delays.waitForOfferChange/1000}s na załadowanie 100 ofert...`, 'info');
                await wait(CONFIG.delays.waitForOfferChange);
            } else {
                log('KROK 3: SKIP - nie zmieniono (może już jest 100?)', 'warning');
                await wait(2000);
            }

            // KROK 4: Zaznacz wszystkie
            log('KROK 4: Zaznaczam wszystkie oferty...', 'info');
            let selected = selectAllOffers();
            if (!selected) {
                await wait(2000);
                selected = selectAllOffers();
            }
            if (selected) {
                log('KROK 4: OK - zaznaczono', 'success');
            } else {
                log('KROK 4: FAIL - nie zaznaczono', 'error');
            }

            await wait(CONFIG.delays.betweenActions);

            // KROK 5: Dodaj do koszyka
            log('KROK 5: Dodaję do koszyka...', 'info');
            let carted = addToCart();
            if (!carted) {
                await wait(2000);
                carted = addToCart();
            }
            if (carted) {
                log('KROK 5: OK - dodano do koszyka', 'success');
            } else {
                log('KROK 5: FAIL - nie dodano', 'error');
            }

            log('========================================', 'success');
            log('=== AUTOMATYZACJA ZAKOŃCZONA! ===', 'success');
            log('========================================', 'success');

            isRunning = false;
            return { success: true, message: 'Gotowe! Oferty dodane do koszyka.' };

        } catch (error) {
            log(`BŁĄD: ${error.message}`, 'error');
            isRunning = false;
            return { success: false, message: error.message };
        }
    }

    /**
     * Aktualizuje konfigurację
     */
    function updateConfig(newConfig) {
        if (newConfig.schemaName) {
            CONFIG.schemaName = newConfig.schemaName;
            log(`Schemat: ${CONFIG.schemaName}`, 'info');
        }
    }

    // Nasłuchiwanie wiadomości
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'runAutomation') {
            if (request.config) {
                updateConfig(request.config);
            }
            runFullAutomation().then(result => {
                sendResponse(result);
            });
            return true;
        }

        if (request.action === 'getStatus') {
            sendResponse({ isRunning, config: CONFIG });
            return true;
        }
    });

    log('Content script v2.1.0 załadowany', 'success');

})();
