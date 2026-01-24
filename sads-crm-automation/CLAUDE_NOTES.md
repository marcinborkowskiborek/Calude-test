# SADS CRM Automation - Notatki dla Claude

## Podsumowanie projektu

Wtyczka Chrome do automatyzacji pracy w systemie SADS CRM. Wykonuje sekwencję kroków automatycznie, bez udziału użytkownika.

**Autor**: Marcin Borkowski
**Aktualna wersja**: 2.1.3
**Data ostatniej aktualizacji**: Styczeń 2026

---

## Co robi wtyczka (pełny flow)

1. **Klika "Powiadomienia i schematy"** - przycisk z ikoną `glyphicon-floppy-disk`
2. **Wybiera schemat i klika "Wyszukaj"** - szuka w modal wiersza z nazwą schematu (domyślnie "Marcin Borkowski Nowe") w kontenerze `.patternRecord`, klika przycisk `.btn-success`
3. **[PRZEŁADOWANIE STRONY]** - strona się przeładowuje, wtyczka kontynuuje z zapisanego stanu
4. **Zmienia ilość ofert na 100** - dropdown z "50 ofert" na "100 ofert"
5. **Zaznacza wszystkie oferty** - checkbox `.checkAll` lub `input[data-scope="list"]`
6. **Dodaje do koszyka** - ikona `.glyphicon-shopping-cart` przy ofercie
7. **Otwiera koszyk** - przycisk `button.basket` w nagłówku
8. **Pobiera CSV** - dropdown "Brak" → opcja "Pobierz CSV"

---

## Struktura plików

```
sads-crm-automation/
├── manifest.json          # Konfiguracja Chrome Extension (Manifest V3)
├── popup.html             # UI wtyczki (popup)
├── popup.js               # Logika popup (wysyłanie wiadomości do content script)
├── scripts/
│   └── content.js         # Główna logika automatyzacji
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── CLAUDE_NOTES.md        # Ten plik
```

---

## Kluczowe rozwiązania techniczne

### 1. Problem przeładowania strony

**Problem**: Po kliknięciu "Wyszukaj" strona CRM się przeładowuje, co powoduje utratę stanu skryptu.

**Rozwiązanie**: Użycie `chrome.storage.local` do zapisywania stanu automatyzacji:

```javascript
// Stany
const STEPS = {
    IDLE: 'idle',
    AFTER_SEARCH: 'after_search',      // Po kliknięciu Wyszukaj
    AFTER_100_OFFERS: 'after_100'      // Po zmianie na 100 ofert
};

// Zapis stanu przed akcją powodującą przeładowanie
saveState(STEPS.AFTER_SEARCH, { schemaName: CONFIG.schemaName });

// Po załadowaniu strony - sprawdzenie czy kontynuować
checkAndContinue();
```

Stan wygasa po 60 sekundach dla bezpieczeństwa.

### 2. Selektory elementów

| Element | Selektor |
|---------|----------|
| Przycisk "Powiadomienia i schematy" | `.glyphicon-floppy-disk` (ikona) |
| Wiersz schematu | `.patternRecord` (kontener) |
| Przycisk "Wyszukaj" | `.patternRecord .btn-success` |
| Dropdown ilości ofert | `.filter-option-inner-inner` z tekstem "50 ofert" |
| Checkbox "zaznacz wszystkie" | `.checkAll`, `#checkAll`, `input[data-scope="list"]` |
| Koszyk (przy ofercie) | `.glyphicon-shopping-cart` |
| Przycisk koszyka (nagłówek) | `button.basket` |
| Dropdown w koszyku | `.filter-option-inner-inner` z tekstem "Brak" |
| Opcja "Pobierz CSV" | `span.text` z tekstem "Pobierz CSV" |

### 3. Komunikacja Popup ↔ Content Script

```javascript
// popup.js - wysyłanie
chrome.tabs.sendMessage(tab.id, {
    action: 'runAutomation',
    config: { schemaName }
}, (response) => { ... });

// content.js - odbieranie
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runAutomation') {
        runFullAutomation().then(result => sendResponse(result));
        return true; // async response
    }
});
```

### 4. Klikanie elementów

Funkcja `clickElement()` symuluje pełne kliknięcie:
- `scrollIntoView` - przewija do elementu
- `mousedown` + `mouseup` + `click` - pełna sekwencja zdarzeń myszy

```javascript
function clickElement(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.click();
}
```

---

## Manifest V3 - uprawnienia

```json
{
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["scripts/content.js"],
    "run_at": "document_idle"
  }]
}
```

- `storage` - do zapisywania stanu między przeładowaniami
- `<all_urls>` - bo SADS może być na różnych domenach/portach

---

## Historia wersji

| Wersja | Zmiany |
|--------|--------|
| 2.0.0 | Początkowa wersja |
| 2.0.1 | Poprawka selektora przycisku (glyphicon-floppy-disk) |
| 2.0.2 | Dodanie selektora .patternRecord dla schematu |
| 2.0.3 | Dodanie kroków: 100 ofert, zaznacz wszystkie, koszyk |
| 2.0.4 | Rozszerzenie uprawnień na <all_urls> |
| 2.0.5 | Zwiększenie opóźnień i retry logic |
| 2.0.6 | Podział na dwa przyciski (przed/po przeładowaniu) |
| 2.0.7 | Auto-continue z chrome.storage |
| 2.0.8 | Uproszczenie - sekwencyjne podejście z opóźnieniami |
| 2.0.9 | Fire and forget - popup nie czeka na odpowiedź |
| 2.1.0 | Poprawka numerów wersji |
| 2.1.1 | Dodane logowanie wiadomości |
| 2.1.2 | Pełna obsługa przeładowania strony z state persistence |
| 2.1.3 | Dodanie kroków: otwórz koszyk, pobierz CSV |

---

## Debugowanie

### Konsola strony (F12)
Wszystkie logi wtyczki mają prefix `[SADS CRM Auto]`:
- niebieski = info
- zielony = success
- czerwony = error
- pomarańczowy = warning

### Sprawdzenie wersji
W konsoli po załadowaniu strony pojawi się:
```
[SADS CRM Auto] Content script v2.1.3 załadowany
```

### Sprawdzenie zapisanego stanu
```javascript
chrome.storage.local.get('automationState', console.log)
```

### Czyszczenie stanu ręcznie
```javascript
chrome.storage.local.remove('automationState')
```

---

## Znane problemy i rozwiązania

1. **Wtyczka nie reaguje na kliknięcie** - przeładuj rozszerzenie w chrome://extensions
2. **Stara wersja w konsoli** - sprawdź czy przeładowałeś rozszerzenie
3. **Błąd "Odśwież stronę"** - strona się przeładowała i utraciła kontekst (rozwiązane w v2.1.2)
4. **Dropdown nie działa** - bootstrap-select wymaga kliknięcia w button, nie w tekst

---

## Potencjalne rozszerzenia

- [ ] Obsługa wielu schematów jednocześnie
- [ ] Harmonogram automatycznego uruchamiania
- [ ] Powiadomienia po zakończeniu
- [ ] Logowanie do pliku
- [ ] Konfiguracja opóźnień w UI

---

## Kontekst dla kontynuacji

Jeśli użytkownik chce kontynuować rozwój wtyczki:
1. Główna logika jest w `scripts/content.js`
2. UI popup w `popup.html` + `popup.js`
3. Konfiguracja w `manifest.json`
4. Wszystkie selektory są w sekcji "Selektory elementów" powyżej
5. Przy dodawaniu nowych kroków - dodaj je do `executeFinalSteps()` lub stwórz nową funkcję
6. Pamiętaj o aktualizacji wersji we WSZYSTKICH plikach (manifest, content.js, popup.html)
