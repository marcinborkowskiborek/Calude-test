# SADS CRM Automation v2.0

Rozszerzenie Chrome do automatyzacji wyszukiwania w systemie SADS CRM.

## Funkcjonalność

Wtyczka automatycznie wykonuje następujące kroki:

1. **Klikanie "Powiadomienia i schematy"** - znajduje i klika przycisk otwierający modal CRM
2. **Oczekiwanie na modal** - czeka na załadowanie interfejsu CRM
3. **Wyszukiwanie schematu** - znajduje wiersz z wybraną nazwą schematu (domyślnie "Marcin Borkowski Nowe")
4. **Klikanie "Wyszukaj"** - klika zielony przycisk wyszukiwania w znalezionym wierszu

## Instalacja

1. Otwórz Chrome i przejdź do `chrome://extensions/`
2. Włącz **Tryb dewelopera** (prawy górny róg)
3. Kliknij **Załaduj rozpakowane**
4. Wybierz folder `sads-crm-automation`

## Użycie

1. Otwórz stronę SADS (sfrm.pl lub sads.pl)
2. Kliknij ikonę rozszerzenia w pasku narzędzi
3. Wpisz nazwę schematu (lub zostaw domyślną)
4. Kliknij **Uruchom automatyzację**

## Struktura projektu

```
sads-crm-automation/
├── manifest.json       # Konfiguracja rozszerzenia Chrome (v3)
├── popup.html          # Interfejs użytkownika
├── popup.js            # Logika interfejsu
├── scripts/
│   └── content.js      # Główny skrypt automatyzacji
├── icons/              # Ikony rozszerzenia
└── README.md           # Dokumentacja
```

## Konfiguracja

Nazwa schematu jest zapisywana w local storage przeglądarki i zostanie zapamiętana przy kolejnym użyciu.

## Wymagania

- Google Chrome w wersji 88+
- Dostęp do strony SADS (sfrm.pl lub sads.pl)

## Autor

Marcin Borkowski

## Wersja

2.0.0 - Pierwsza wersja z podstawową automatyzacją
