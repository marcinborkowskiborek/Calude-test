# 🐛 Przewodnik Debugowania - Contact Extractor

Ten przewodnik pomoże Ci rozwiązać problemy z wtyczką Contact Extractor.

## Krok 1: Sprawdź czy wtyczka się załadowała

1. Otwórz konsolę deweloperską (F12 lub Ctrl+Shift+I)
2. Przejdź do zakładki **Console**
3. Odśwież stronę (F5)
4. Powinno pojawić się:
   ```
   ✅ Contact Extractor loaded!
   💡 Use popup to start extraction, or test in console with:
      extractor.findContactButtons() - to see what buttons are found
      extractor.testExtraction() - to do a quick test
   ```

**Jeśli nie widzisz tej wiadomości:**
- Sprawdź czy wtyczka jest włączona w `chrome://extensions/`
- Upewnij się, że content script się załadował
- Sprawdź czy nie ma błędów w konsoli

## Krok 2: Uruchom test wyszukiwania przycisków

W konsoli wpisz:
```javascript
extractor.testExtraction()
```

To uruchomi test który:
1. Poszuka przycisków "Pokaż kontakt"
2. Wyświetli szczegółowe informacje o znalezionych elementach
3. Zasugeruje alternatywne metody wyszukiwania

### Przykładowy output sukcesu:

```
🧪 Running TEST mode...

TEST 1: Finding buttons...
🔍 Starting button search...
Found 156 clickable elements to check
✓ Found potential button #1: "Pokaż kontakt" (text contains "pokaz")
  Element: <button class="contact-btn">...</button>
  Classes: contact-btn show-phone
✓ Found potential button #2: "Pokaż kontakt" (text contains "pokaz")
...

✅ Total buttons found: 3

✅ TEST 1 PASSED: Found 3 buttons
```

### Przykładowy output niepowodzenia:

```
🧪 Running TEST mode...

TEST 1: Finding buttons...
🔍 Starting button search...
Found 156 clickable elements to check

✅ Total buttons found: 0

❌ TEST FAILED: No buttons found

🔍 Let's try some manual searches:

1. Search for all buttons:
   Found 23 <button> elements
   First few buttons:
   1. "Szukaj" - classes: search-btn
   2. "Filtruj" - classes: filter-btn
   ...
```

## Krok 3: Ręczne wyszukiwanie przycisków

Jeśli test nie znalazł przycisków, możesz ręcznie poszukać w konsoli:

### Metoda 1: Znajdź wszystkie elementy z tekstem "Pokaż"

```javascript
document.querySelectorAll('*').forEach(el => {
  if (el.textContent.includes('Pokaż') && el.textContent.includes('kontakt')) {
    console.log(el);
  }
});
```

### Metoda 2: Znajdź wszystkie przyciski

```javascript
document.querySelectorAll('button').forEach(btn => {
  console.log(btn.textContent.trim(), btn);
});
```

### Metoda 3: Znajdź wszystkie linki

```javascript
document.querySelectorAll('a').forEach(link => {
  if (link.textContent.includes('Pokaż') || link.textContent.includes('kontakt')) {
    console.log(link);
  }
});
```

### Metoda 4: Użyj inspektora elementów

1. Kliknij prawym przyciskiem na przycisk "Pokaż kontakt" na stronie
2. Wybierz "Zbadaj element" (Inspect)
3. Spójrz na:
   - Tag name (button, a, div, span?)
   - Classes
   - ID
   - onclick handler

Przykład:
```html
<button class="btn-show-contact" onclick="showPhone(123)">
  Pokaż kontakt
</button>
```

## Krok 4: Dodaj własny selektor

Jeśli znalazłeś elementy ręcznie, możesz dodać własny selektor w pliku `scripts/content.js`.

1. Otwórz plik `chrome-contact-extractor/scripts/content.js`
2. Znajdź funkcję `findContactButtons()` (około linii 10)
3. Dodaj swój selektor do listy `patterns`

Przykład - jeśli przycisk ma klasę `btn-show-contact`:

```javascript
// W linii ~16, dodaj do querySelector:
const allClickableElements = document.querySelectorAll(
  'button, a, div[onclick], span[onclick], div[role="button"], ' +
  '[class*="button"], [class*="btn"], ' +
  '.btn-show-contact' // <-- TWÓJ SELEKTOR
);
```

Lub dodaj wzorzec do listy patterns (linia ~25):

```javascript
const patterns = [
  'pokaz',
  'pokaż',
  'kontakt',
  'phone',
  'telefon',
  'contact',
  'show',
  'btn-show-contact' // <-- TWÓJ WZORZEC
];
```

4. Zapisz plik
5. Przejdź do `chrome://extensions/`
6. Kliknij ikonę odświeżania przy rozszerzeniu
7. Odśwież stronę z ofertami
8. Spróbuj ponownie

## Krok 5: Sprawdź czy dane są wyciągane

Jeśli przyciski są znajdowane ale dane nie są wyciągane:

1. Uruchom pełną ekstrakcję:
```javascript
extractor.extractAllContacts()
```

2. Obserwuj output w konsoli:
```
🚀 Starting Contact Extraction...

🔍 Starting button search...
...
📋 Summary: Found 3 contact buttons to process

--- Processing button 1/3 ---
🖱️ Clicking button...
⏳ Waiting for contact info to load...
📊 Extracting data...
🔍 Finding listing container...
✓ Found listing container: listing-card offer-item
📦 Extracting from container: listing-card offer-item
  Title: DOM W CENIE MIESZKANIA w Wawrze bezpośrednio...
  Location: Warszawa, Wawer / Aleksandrów
  Price: 869 000 zł
  Area: 94 m²
  Phone: 514 044 601
  Description: DOM W CENIE MIESZKANIA OSIEDLE ŚPIEWAJĄCYCH PTAKÓW...
✅ Extracted data: {...}
```

## Krok 6: Sprawdź uprawnienia

1. Przejdź do `chrome://extensions/`
2. Znajdź "ADS Search Contact Extractor"
3. Kliknij "Szczegóły"
4. Sprawdź uprawnienia:
   - ✅ Odczytywanie i modyfikowanie danych na wszystkich stronach
   - ✅ Dostęp do pamięci
   - ✅ Pobieranie plików

## Częste problemy i rozwiązania

### Problem: "Found 0 clickable elements to check"

**Przyczyna**: Content script załadował się zbyt wcześnie, zanim strona się w pełni załadowała.

**Rozwiązanie**:
1. Odśwież stronę (F5)
2. Poczekaj aż strona się w pełni załaduje
3. Spróbuj ponownie

### Problem: "No useful data found for this listing"

**Przyczyna**: Kontener z danymi nie został znaleziony lub ma inną strukturę.

**Rozwiązanie**:
1. Sprawdź w konsoli jakie kontenery są znajdowane
2. Użyj inspektora elementów aby zobaczyć strukturę DOM
3. Zmodyfikuj selektory w `extractListingData()` funkcji

### Problem: Nie wszystkie numery telefonu są wyciągane

**Przyczyna**: Numer telefonu ma niestandardowy format.

**Rozwiązanie**:
Dodaj własny wzorzec w `scripts/content.js` około linii 250:

```javascript
const phonePatterns = [
  /(\+48\s?)?(\d{3}[\s\-]?\d{3}[\s\-]?\d{3})/g,
  /(\+48\s?)?(\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/g,
  /(\+48\s?)?(\d{9})/g,
  /(\d{3}[\s\-]\d{3}[\s\-]\d{3})/g,
  /TWÓJ_WZORZEC_TUTAJ/g  // <-- Dodaj własny
];
```

### Problem: Plik się nie pobiera

**Przyczyna**: Brak uprawnień lub zablokowane pobieranie.

**Rozwiązanie**:
1. Sprawdź ustawienia pobierania w Chrome
2. Sprawdź czy nie pytał o pozwolenie na pobieranie
3. Sprawdź folder Downloads

### Problem: Wtyczka klika niewłaściwe przyciski

**Przyczyna**: Zbyt szerokie wzorce wyszukiwania.

**Rozwiązanie**:
Zawęź wzorce w funkcji `findContactButtons()`:

```javascript
// Zamień:
if (text.includes('pokaz')) {

// Na bardziej restrykcyjne:
if (text.includes('pokaż kontakt') || text === 'pokaz kontakt') {
```

## Logi debugowania

Wszystkie ważne operacje są logowane do konsoli z ikonami:

- 🔍 = Wyszukiwanie
- ✅ = Sukces
- ❌ = Błąd
- ⚠️ = Ostrzeżenie
- 🖱️ = Klikanie
- ⏳ = Oczekiwanie
- 📊 = Ekstrakcja danych
- 📦 = Przetwarzanie kontenera
- 🎉 = Zakończenie

Obserwuj te ikony w konsoli aby śledzić postęp.

## Kontakt i pomoc

Jeśli nadal masz problemy:

1. Skopiuj output z konsoli
2. Zrób screenshot struktury DOM przycisków
3. Opisz dokładnie co się dzieje
4. Zgłoś issue z tymi informacjami

---

**Powodzenia! 🚀**
