/**
 * SADS CRM Automation - Content Script
 * v2.0.7 - Automatyczne kontynuowanie po przeładowaniu strony
 */

(function() {
    'use strict';

    // Konfiguracja
    const CONFIG = {
        schemaName: 'Marcin Borkowski Nowe',
        delays: {
            afterButtonClick: 1000,
            betweenActions: 500,
            waitForModal: 2000,
            waitForPageLoad: 3000
        }
    };

    // Status
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
     * Zapisuje stan automatyzacji
     */
    function saveState(step, data = {}) {
        const state = {
            step,
            schemaName: CONFIG.schemaName,
            timestamp: Date.now(),
            ...data
        };
        chrome.storage.local.set({ automationState: state });
        log(`Zapisano stan: krok ${step}`, 'info');
    }

    /**
     * Pobiera stan automatyzacji
     */
    function getState() {
        return new Promise(resolve => {
            chrome.storage.local.get(['automationState'], result => {
                resolve(result.automationState || null);
            });
        });
    }

    /**
     * Czyści stan automatyzacji
     */
    function clearState() {
        chrome.storage.local.remove(['automationState']);
        log('Wyczyszczono stan automatyzacji', 'info');
    }

    /**
     * Znajduje przycisk "Powiadomienia i schematy"
     */
    function findNotificationsButton() {
        const floppyIcon = document.querySelector('.glyphicon-floppy-disk');
        if (floppyIcon) {
            const clickable = floppyIcon.closest('button, a, [role="button"], .btn, div[onclick]') || floppyIcon.parentElement;
            if (clickable) {
                log('Znaleziono przycisk przez ikonę glyphicon-floppy-disk', 'success');
                return clickable;
            }
        }

        const allElements = document.querySelectorAll('button, a, div[role="button"], span, div');
        for (const el of allElements) {
            const text = el.textContent || el.innerText || '';
            if (text.includes('Powiadomienia i schematy') ||
                (text.includes('Powiadomienia') && text.includes('schematy'))) {
                return el;
            }
        }

        const byTitle = document.querySelector('[title*="Powiadomienia"], [title*="schematy"]');
        if (byTitle) return byTitle;

        return null;
    }

    /**
     * Znajduje przycisk "Wyszukaj" dla konkretnego schematu
     */
    function findSearchButtonForSchema(schemaName) {
        log(`Szukam przycisku "Wyszukaj" dla: "${schemaName}"`, 'info');

        const patternRecords = document.querySelectorAll('.patternRecord');
        log(`Znaleziono ${patternRecords.length} wierszy .patternRecord`, 'info');

        for (const record of patternRecords) {
            const recordText = record.textContent || '';
            if (recordText.includes(schemaName)) {
                log(`Znaleziono wiersz zawierający "${schemaName}"`, 'success');
                const searchBtn = record.querySelector('button.btn-success');
                if (searchBtn) {
                    return searchBtn;
                }
            }
        }

        const allSearchButtons = document.querySelectorAll('.patternButtons button.btn-success');
        for (const btn of allSearchButtons) {
            const record = btn.closest('.patternRecord');
            if (record && record.textContent.includes(schemaName)) {
                return btn;
            }
        }

        return null;
    }

    /**
     * Zmienia ilość ofert na stronie (z 50 na 100)
     */
    async function changeOffersCount() {
        log('Zmieniam ilość ofert na 100...', 'info');

        // Znajdź dropdown - szukamy elementu zawierającego "50 ofert"
        const allElements = document.querySelectorAll('.filter-option-inner-inner, button, .dropdown-toggle');
        let dropdownBtn = null;

        for (const el of allElements) {
            const text = (el.textContent || '').trim();
            if (text.includes('50 ofert') || text === '50 ofert') {
                dropdownBtn = el.closest('button, .dropdown-toggle, .bootstrap-select') || el;
                break;
            }
        }

        if (!dropdownBtn) {
            // Fallback: szukaj .filter-option-inner-inner
            const trigger = document.querySelector('.filter-option-inner-inner');
            if (trigger) {
                dropdownBtn = trigger.closest('button, .dropdown-toggle, .bootstrap-select') || trigger;
            }
        }

        if (dropdownBtn) {
            clickElement(dropdownBtn);
            await wait(800);

            // Znajdź opcję "100 ofert"
            const options = document.querySelectorAll('span.text, li a, .dropdown-item, .dropdown-menu li, option');
            for (const opt of options) {
                const text = (opt.textContent || '').trim();
                if (text === '100 ofert') {
                    clickElement(opt.closest('a, li') || opt);
                    log('Wybrano 100 ofert', 'success');
                    return true;
                }
            }
        }

        log('Nie znaleziono opcji zmiany ilości ofert', 'warning');
        return false;
    }

    /**
     * Zaznacza wszystkie oferty na stronie
     */
    function selectAllOffers() {
        log('Zaznaczam wszystkie oferty...', 'info');

        const checkAllBox = document.querySelector('input.checkAll, input#checkAll, input[data-scope="list"]');

        if (checkAllBox) {
            if (!checkAllBox.checked) {
                checkAllBox.click();
                log('Zaznaczono wszystkie oferty', 'success');
            } else {
                log('Wszystkie oferty już zaznaczone', 'info');
            }
            return true;
        }

        log('Nie znaleziono checkboxa "checkAll"', 'warning');
        return false;
    }

    /**
     * Dodaje zaznaczone oferty do koszyka
     */
    function addToCart() {
        log('Dodaję do koszyka...', 'info');

        const cartIcon = document.querySelector('.glyphicon-shopping-cart');

        if (cartIcon) {
            const cartButton = cartIcon.closest('button, a, [role="button"], .btn') || cartIcon.parentElement;
            if (cartButton) {
                clickElement(cartButton);
                log('Kliknięto przycisk koszyka', 'success');
                return true;
            }
        }

        const buttons = document.querySelectorAll('button, a.btn');
        for (const btn of buttons) {
            const text = (btn.textContent || btn.title || '').toLowerCase();
            if (text.includes('koszyk') || text.includes('cart')) {
                clickElement(btn);
                log('Kliknięto przycisk koszyka', 'success');
                return true;
            }
        }

        log('Nie znaleziono przycisku koszyka', 'warning');
        return false;
    }

    /**
     * Kliknięcie elementu
     */
    function clickElement(element) {
        if (!element) {
            log('Element do kliknięcia nie istnieje', 'error');
            return false;
        }

        try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
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
     * KROK 1: Otwórz schematy i kliknij "Wyszukaj"
     */
    async function executeStep1() {
        log('=== KROK 1: Otwieram schematy i klikam Wyszukaj ===', 'info');

        const notifButton = findNotificationsButton();
        if (!notifButton) {
            throw new Error('Nie znaleziono przycisku "Powiadomienia i schematy"');
        }

        clickElement(notifButton);
        log('Kliknięto "Powiadomienia i schematy"', 'success');

        await wait(CONFIG.delays.afterButtonClick);
        await wait(CONFIG.delays.waitForModal);

        const searchButton = findSearchButtonForSchema(CONFIG.schemaName);
        if (!searchButton) {
            throw new Error(`Nie znaleziono schematu "${CONFIG.schemaName}"`);
        }

        await wait(CONFIG.delays.betweenActions);

        // Zapisz stan PRZED kliknięciem (strona się przeładuje)
        saveState(2);

        clickElement(searchButton);
        log('Kliknięto "Wyszukaj" - strona się przeładuje...', 'success');
    }

    /**
     * KROK 2: Zmień na 100 ofert
     */
    async function executeStep2() {
        log('=== KROK 2: Zmieniam ilość ofert na 100 ===', 'info');

        // Zapisz stan PRZED zmianą (strona się przeładuje)
        saveState(3);

        const changed = await changeOffersCount();
        if (changed) {
            log('Zmiana na 100 ofert - strona się przeładuje...', 'success');
        } else {
            // Jeśli nie udało się zmienić, przejdź do kroku 3
            log('Nie zmieniono ilości ofert, kontynuuję...', 'warning');
            await executeStep3();
        }
    }

    /**
     * KROK 3: Zaznacz wszystko i dodaj do koszyka
     */
    async function executeStep3() {
        log('=== KROK 3: Zaznaczam i dodaję do koszyka ===', 'info');

        // Zaznacz wszystkie oferty
        let checkboxFound = selectAllOffers();
        if (!checkboxFound) {
            await wait(2000);
            checkboxFound = selectAllOffers();
        }

        if (!checkboxFound) {
            clearState();
            throw new Error('Nie znaleziono checkboxa');
        }

        await wait(1000);

        // Dodaj do koszyka
        let cartClicked = addToCart();
        if (!cartClicked) {
            await wait(2000);
            cartClicked = addToCart();
        }

        // Wyczyść stan - automatyzacja zakończona
        clearState();

        if (cartClicked) {
            log('=== AUTOMATYZACJA ZAKOŃCZONA! Oferty w koszyku. ===', 'success');
        } else {
            throw new Error('Nie znaleziono przycisku koszyka');
        }
    }

    /**
     * Główna funkcja - uruchamia pełną automatyzację
     */
    async function runFullAutomation() {
        if (isRunning) {
            return { success: false, message: 'Automatyzacja już działa' };
        }

        isRunning = true;
        log('=== ROZPOCZYNAM PEŁNĄ AUTOMATYZACJĘ ===', 'info');

        try {
            await executeStep1();
            // Po kliknięciu Wyszukaj strona się przeładuje
            // Kontynuacja nastąpi automatycznie po załadowaniu

            isRunning = false;
            return {
                success: true,
                message: 'Etap 1 rozpoczęty. Automatyzacja będzie kontynuowana po przeładowaniu.'
            };
        } catch (error) {
            log(`Błąd: ${error.message}`, 'error');
            clearState();
            isRunning = false;
            return { success: false, message: error.message };
        }
    }

    /**
     * Kontynuuje automatyzację od zapisanego stanu
     */
    async function continueAutomation(state) {
        log(`Kontynuuję automatyzację od kroku ${state.step}...`, 'info');
        CONFIG.schemaName = state.schemaName;

        // Sprawdź czy stan nie jest za stary (max 5 minut)
        const age = Date.now() - state.timestamp;
        if (age > 5 * 60 * 1000) {
            log('Stan automatyzacji wygasł (>5 min)', 'warning');
            clearState();
            return;
        }

        isRunning = true;

        try {
            if (state.step === 2) {
                // Po kliknięciu "Wyszukaj" - zmień na 100 ofert
                await wait(CONFIG.delays.waitForPageLoad);
                await executeStep2();
            } else if (state.step === 3) {
                // Po zmianie na 100 - zaznacz i dodaj do koszyka
                await wait(CONFIG.delays.waitForPageLoad);
                await executeStep3();
            }
        } catch (error) {
            log(`Błąd kontynuacji: ${error.message}`, 'error');
            clearState();
        }

        isRunning = false;
    }

    /**
     * Aktualizuje konfigurację
     */
    function updateConfig(newConfig) {
        if (newConfig.schemaName) {
            CONFIG.schemaName = newConfig.schemaName;
            log(`Nazwa schematu: ${CONFIG.schemaName}`, 'info');
        }
    }

    // Nasłuchiwanie wiadomości z popup
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

        if (request.action === 'cancelAutomation') {
            clearState();
            isRunning = false;
            sendResponse({ success: true, message: 'Automatyzacja anulowana' });
            return true;
        }
    });

    // ============================================
    // AUTOMATYCZNE KONTYNUOWANIE PO ZAŁADOWANIU
    // ============================================
    async function checkAndContinue() {
        const state = await getState();
        if (state && state.step) {
            log(`Znaleziono zapisany stan: krok ${state.step}`, 'info');
            await continueAutomation(state);
        } else {
            log('Content script załadowany i gotowy', 'success');
        }
    }

    // Uruchom sprawdzanie stanu po załadowaniu strony
    if (document.readyState === 'complete') {
        checkAndContinue();
    } else {
        window.addEventListener('load', checkAndContinue);
    }

})();
