/**
 * SADS CRM Automation - Content Script
 * v2.1.2 - Kontynuacja po przeładowaniu strony
 */

(function() {
    'use strict';

    // Konfiguracja
    const CONFIG = {
        schemaName: 'Marcin Borkowski Nowe',
        delays: {
            afterClick: 1000,
            waitForModal: 2000,
            waitForResults: 3000,
            waitForOfferChange: 3000,
            betweenActions: 1000
        }
    };

    let isRunning = false;

    // Stany automatyzacji
    const STEPS = {
        IDLE: 'idle',
        AFTER_SEARCH: 'after_search',      // Po kliknięciu Wyszukaj - czekamy na wyniki
        AFTER_100_OFFERS: 'after_100'      // Po zmianie na 100 ofert
    };

    /**
     * Zapisz stan do storage
     */
    function saveState(step, config = null) {
        const state = { step, timestamp: Date.now() };
        if (config) state.config = config;
        chrome.storage.local.set({ automationState: state });
        log(`Stan zapisany: ${step}`, 'info');
    }

    /**
     * Wyczyść stan
     */
    function clearState() {
        chrome.storage.local.remove('automationState');
        log('Stan wyczyszczony', 'info');
    }

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
     * Wykonaj kroki po przeładowaniu strony (zmiana ofert, zaznaczenie, koszyk)
     */
    async function executePostReloadSteps() {
        log('>>> Kontynuuję po przeładowaniu strony...', 'info');

        await wait(CONFIG.delays.waitForResults);

        // KROK 3: Zmień na 100 ofert
        log('KROK 3: Zmieniam ilość ofert na 100...', 'info');
        const changed = await changeOffersCount();
        if (changed) {
            log('KROK 3: OK - zmieniono na 100 ofert', 'success');
            // Zapisz stan - strona może się przeładować
            saveState(STEPS.AFTER_100_OFFERS);
            log('Czekam na załadowanie 100 ofert...', 'info');
            await wait(CONFIG.delays.waitForOfferChange);
        } else {
            log('KROK 3: SKIP - nie zmieniono (może już jest 100?)', 'warning');
        }

        // Kontynuuj z finalnymi krokami
        await executeFinalSteps();
    }

    /**
     * Wykonaj finalne kroki (zaznaczenie i koszyk)
     */
    async function executeFinalSteps() {
        await wait(2000);

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

        clearState();
        isRunning = false;
    }

    /**
     * GŁÓWNA FUNKCJA - wykonuje kroki 1-2 (przed przeładowaniem)
     */
    async function runFullAutomation() {
        if (isRunning) {
            return { success: false, message: 'Już działa' };
        }

        isRunning = true;
        log('========================================', 'info');
        log('=== ROZPOCZYNAM AUTOMATYZACJĘ v2.1.2 ===', 'info');
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

            // ZAPISZ STAN PRZED KLIKNIĘCIEM (strona się przeładuje!)
            saveState(STEPS.AFTER_SEARCH, { schemaName: CONFIG.schemaName });

            clickElement(searchButton);
            log('KROK 2: OK - kliknięto "Wyszukaj" (strona się przeładuje)', 'success');

            return { success: true, message: 'Automatyzacja uruchomiona, strona się przeładuje...' };

        } catch (error) {
            log(`BŁĄD: ${error.message}`, 'error');
            clearState();
            isRunning = false;
            return { success: false, message: error.message };
        }
    }

    /**
     * Sprawdź czy kontynuować automatyzację po przeładowaniu
     */
    async function checkAndContinue() {
        const result = await chrome.storage.local.get('automationState');
        const state = result.automationState;

        if (!state) return;

        // Sprawdź czy stan nie jest za stary (max 60 sekund)
        if (Date.now() - state.timestamp > 60000) {
            log('Stan automatyzacji za stary, czyszczę...', 'warning');
            clearState();
            return;
        }

        log(`>>> Znaleziono zapisany stan: ${state.step}`, 'info');

        if (state.config && state.config.schemaName) {
            CONFIG.schemaName = state.config.schemaName;
        }

        isRunning = true;

        if (state.step === STEPS.AFTER_SEARCH) {
            // Strona przeładowana po kliknięciu "Wyszukaj"
            await executePostReloadSteps();
        } else if (state.step === STEPS.AFTER_100_OFFERS) {
            // Strona przeładowana po zmianie na 100 ofert
            await executeFinalSteps();
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
        log('>>> Otrzymano wiadomość: ' + JSON.stringify(request), 'info');

        if (request.action === 'runAutomation') {
            log('>>> Akcja runAutomation - uruchamiam...', 'info');
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

    log('Content script v2.1.2 załadowany', 'success');

    // Sprawdź czy kontynuować automatyzację po przeładowaniu strony
    checkAndContinue();

})();
