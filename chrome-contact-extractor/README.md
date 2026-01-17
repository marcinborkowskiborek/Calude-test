# 📇 Chrome Contact Extractor

Wtyczka do przeglądarki Chrome automatycznie wyciągająca kontakty z ofert nieruchomości. Kliknij przycisk i wszystkie ukryte za "Pokaż kontakt" dane (telefony, emaile) zostaną zebrane i zapisane w pliku Markdown.

## 🚀 Funkcje

- ✅ Automatyczne wykrywanie przycisków "Pokaż kontakt"
- ✅ Klikanie wszystkich przycisków na stronie
- ✅ Wyciąganie numerów telefonów
- ✅ Wyciąganie adresów email
- ✅ Zbieranie opisów ofert (tytuł, lokalizacja, cena, powierzchnia)
- ✅ Eksport do pliku Markdown (.md)
- ✅ Intuicyjny interfejs użytkownika

## 📋 Wymagania

- Google Chrome lub Chromium (wersja 88+)
- System operacyjny: Windows, macOS, Linux

## 🔧 Instalacja

### Krok 1: Pobierz rozszerzenie

```bash
# Sklonuj repozytorium lub pobierz folder chrome-contact-extractor
git clone <repository-url>
cd chrome-contact-extractor
```

### Krok 2: Zainstaluj w Chrome

1. Otwórz przeglądarkę Chrome
2. Wpisz w pasku adresu: `chrome://extensions/`
3. Włącz **Tryb dewelopera** (przełącznik w prawym górnym rogu)
4. Kliknij przycisk **"Załaduj rozpakowane"**
5. Wybierz folder `chrome-contact-extractor`
6. Rozszerzenie zostanie zainstalowane! 🎉

### Krok 3: Przypnij do paska narzędzi (opcjonalnie)

1. Kliknij ikonę puzzla w prawym górnym rogu Chrome
2. Znajdź "ADS Search Contact Extractor"
3. Kliknij ikonę pinezki, aby przypiąć do paska narzędzi

## 📖 Jak używać

### Podstawowe użycie

1. **Przejdź na stronę z ofertami** (np. serwis z ogłoszeniami nieruchomości)
2. **Kliknij ikonę rozszerzenia** w pasku narzędzi
3. **Kliknij przycisk "🚀 Start Extraction"**
4. **Poczekaj** - rozszerzenie automatycznie:
   - Znajdzie wszystkie przyciski "Pokaż kontakt"
   - Kliknie każdy z nich
   - Poczeka na załadowanie danych kontaktowych
   - Wyciągnie telefony, emaile i opisy ofert
5. **Pobierz plik** - po zakończeniu automatycznie pobierze się plik `.md`

### Interface

Po otwarciu rozszerzenia zobaczysz:

- **Status**: Czy rozszerzenie jest gotowe czy pracuje
- **Znalezione kontakty**: Liczba wyciągniętych kontaktów
- **Start Extraction**: Przycisk uruchamiający proces
- **Odśwież status**: Aktualizuje informacje o statusie

### Format pliku wyjściowego

Plik Markdown zawiera:

```markdown
# Wyciągnięte kontakty

Data wyciągnięcia: 17.01.2026, 20:00:00
Liczba ofert: 3

---

## 1. DOM W CENIE MIESZKANIA w Wawrze bezpośrednio

**Lokalizacja:** Warszawa, Wawer / Aleksandrów

**Cena:** 869 000 zł

**Powierzchnia:** 94 m²

📞 **Telefon:** 514 044 601

📧 **Email:** kontakt@example.com

**Opis:**
DOM W CENIE MIESZKANIA OSIEDLE ŚPIEWAJĄCYCH PTAKÓW- WARSZAWA WAWER
Oferta bezpośrednio od dewelopera DomPark Inwestycja zostanie ukończona
w ciągu kilku miesięcy...

**ID oferty:** 7625298

**Źródło:** https://example.com/oferta/123

*Wyciągnięto: 17.01.2026, 20:00:15*

---

## 2. [Kolejna oferta...]

...
```

## 🛠️ Rozwiązywanie problemów

### Rozszerzenie nie znajduje przycisków

**Problem**: Licznik kontaktów pozostaje na 0

**Rozwiązanie**:
- Upewnij się, że jesteś na stronie z ofertami
- Sprawdź czy przyciski "Pokaż kontakt" są widoczne
- Niektóre strony mogą używać innych nazw przycisków - skontaktuj się z developerem w celu dostosowania

### Nie wszystkie kontakty zostały wyciągnięte

**Problem**: Brakuje niektórych danych

**Rozwiązanie**:
- Strona może ładować dane asynchronicznie
- Spróbuj przewinąć stronę w dół, aby załadować więcej ofert
- Poczekaj kilka sekund przed uruchomieniem ekstrakcji

### Błąd "chrome.runtime.lastError"

**Problem**: Wyświetla się błąd w konsoli

**Rozwiązanie**:
- Odśwież stronę (F5)
- Wyłącz i włącz ponownie rozszerzenie w `chrome://extensions/`
- Upewnij się, że masz najnowszą wersję Chrome

### Plik nie pobiera się automatycznie

**Problem**: Po ekstrakcji plik nie jest pobierany

**Rozwiązanie**:
- Sprawdź uprawnienia rozszerzenia w `chrome://extensions/`
- Upewnij się, że Chrome ma uprawnienia do pobierania plików
- Sprawdź ustawienia blokowania wyskakujących okienek

## 🔒 Bezpieczeństwo i prywatność

- ✅ Rozszerzenie działa **lokalnie** w przeglądarce
- ✅ **Nie wysyła** żadnych danych na zewnętrzne serwery
- ✅ Dane są zapisywane **bezpośrednio na dysku**
- ✅ Kod źródłowy jest **otwarty** i możesz go przejrzeć
- ✅ Minimalne uprawnienia (tylko `activeTab`, `storage`, `downloads`)

## 📝 Struktura plików

```
chrome-contact-extractor/
├── manifest.json           # Konfiguracja rozszerzenia
├── popup.html             # Interfejs użytkownika
├── popup.js               # Logika interfejsu
├── scripts/
│   ├── content.js         # Skrypt wyciągający dane ze strony
│   ├── background.js      # Obsługa pobierania plików
│   ├── generate-icons.js  # Generator ikon (pomocniczy)
│   └── create-placeholder-icons.js
├── icons/
│   ├── icon.svg          # Źródłowa ikona SVG
│   ├── icon16.png        # Ikona 16x16
│   ├── icon48.png        # Ikona 48x48
│   ├── icon128.png       # Ikona 128x128
│   └── ICON_INSTRUCTIONS.md
└── README.md             # Ten plik
```

## 🎨 Dostosowywanie

### Zmiana wzorców wyszukiwania

Możesz dostosować sposób wykrywania przycisków kontaktowych w pliku `scripts/content.js`:

```javascript
// Linia ~15
allButtons.forEach(btn => {
  const text = btn.textContent.trim().toLowerCase();
  if (text.includes('pokaz') && text.includes('kontakt') ||
      text.includes('pokaż kontakt') ||
      text.includes('twoja-fraza')) {  // Dodaj własną frazę
    buttons.push(btn);
  }
});
```

### Zmiana czasu oczekiwania

Jeśli strona ładuje się wolno, zwiększ timeout w `scripts/content.js`:

```javascript
// Linia ~116
await this.waitForContactInfo(button, 5000); // Zmień z 3000 na 5000ms
```

### Dostosowanie stylu popup

Edytuj plik `popup.html` aby zmienić wygląd interfejsu.

## 🤝 Wsparcie

Jeśli napotkasz problemy lub masz pytania:

1. Sprawdź sekcję "Rozwiązywanie problemów" powyżej
2. Otwórz konsolę deweloperską (F12) i sprawdź błędy
3. Zgłoś issue na GitHubie (jeśli dotyczy)

## 📄 Licencja

MIT License - możesz swobodnie używać i modyfikować to rozszerzenie.

## 🔄 Aktualizacje

### Wersja 1.0.0 (2026-01-17)
- ✨ Pierwsza wersja publiczna
- ✅ Podstawowa funkcjonalność ekstrakcji kontaktów
- ✅ Export do Markdown
- ✅ Interfejs popup

## 💡 Pomysły na przyszłość

- [ ] Export do CSV
- [ ] Eksport do JSON
- [ ] Filtrowanie duplikatów
- [ ] Zaawansowane wzorce wyszukiwania
- [ ] Automatyczne wykrywanie typu strony
- [ ] Historia wyciągniętych kontaktów
- [ ] Import/export ustawień

---

**Autor**: Marcin Borkowski
**Data**: Styczeń 2026
**Wersja**: 1.0.0

Miłego korzystania! 🚀
