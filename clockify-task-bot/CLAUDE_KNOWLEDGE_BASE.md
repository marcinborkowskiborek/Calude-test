# Task Bot - Biblia Wiedzy dla Claude

Ten dokument zawiera kompletną wiedzę o Clockify Task Bot potrzebną do wprowadzania zmian w przyszłości.

---

## 1. Cel aplikacji

**Task Bot** to asystent AI dla firmy **We Are Future**, który pomaga pracownikom klasyfikować zadania w Clockify. Pracownik wpisuje co robił (np. "przygotowywałem prezentację dla Henkel"), a bot:
- Znajduje odpowiedni **Task** z bazy wiedzy
- Przypisuje **PROJECT ID** (dla klienta lub internal)
- Sugeruje **tagi**

Bot używa **Claude AI z extended thinking** do semantycznego rozumowania - nie szuka tylko słów kluczowych, ale rozumie kontekst.

---

## 2. Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                        STACK                                     │
├─────────────────────────────────────────────────────────────────┤
│  Frontend:    HTML/CSS/JS (public/index.html)                   │
│  Backend:     Node.js + Express + TypeScript                    │
│  AI:          Claude API (Anthropic) z extended thinking        │
│  Dane:        Google Sheets API                                 │
│  Hosting:     Vercel                                            │
│  Integracja:  CAKE.com Marketplace (Clockify Add-on)           │
└─────────────────────────────────────────────────────────────────┘
```

### Flow działania:
1. Pracownik wpisuje opis w UI
2. Frontend wysyła POST `/api/classify`
3. Backend pobiera dane z Google Sheets (cache 5 min)
4. Claude AI analizuje opis i dopasowuje task
5. Wynik wraca do UI

---

## 3. Struktura plików

```
clockify-task-bot/
├── src/
│   ├── api/
│   │   ├── routes.ts           # Główne API: /classify, /health, /knowledge-base
│   │   └── clockifyAddon.ts    # CAKE.com lifecycle hooks: /installed, /deleted
│   ├── services/
│   │   ├── classifier.ts       # Claude AI - SYSTEM_PROMPT i logika klasyfikacji
│   │   ├── clockify.ts         # Clockify API (opcjonalne)
│   │   └── googleSheets.ts     # Pobieranie danych z Google Sheets
│   ├── types/
│   │   └── index.ts            # TypeScript typy i konfiguracja kategorii
│   └── index.ts                # Express server, middleware
├── public/
│   ├── index.html              # UI panelu (HTML/CSS/JS w jednym pliku)
│   ├── manifest.json           # Manifest dla CAKE.com Marketplace
│   └── icon.svg                # Ikona add-ona
├── dist/                       # Skompilowany JS (generowany przez tsc)
├── .env                        # Zmienne środowiskowe (NIE COMMITOWAĆ!)
├── .env.example                # Przykład zmiennych (bez prawdziwych kluczy)
├── package.json
├── tsconfig.json
└── vercel.json                 # Konfiguracja Vercel
```

---

## 4. Konfiguracja środowiska

### Zmienne środowiskowe (Vercel):

| Zmienna | Opis |
|---------|------|
| `ANTHROPIC_API_KEY` | Klucz API Claude (sk-ant-...) |
| `GOOGLE_SHEETS_ID` | ID arkusza Google Sheets |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email konta usługi Google |
| `GOOGLE_PRIVATE_KEY` | Klucz prywatny (z \n między liniami) |
| `PROJECTS_SHEET_NAME` | Nazwa zakładki z projektami: `Matryca` |
| `TASKS_SHEET_NAME` | Nazwa zakładki z taskami: `NAZWY TASKOW` |
| `SHEETS_CACHE_TTL` | Czas cache w sekundach (domyślnie 300) |

### Gdzie zmieniać:
- **Vercel**: https://vercel.com/ → Project → Settings → Environment Variables
- **NIE** w plikach w repo (bezpieczeństwo!)

---

## 5. Struktura Google Sheets

### Zakładka "Matryca" (PROJECT IDs):

| Kolumna | Index | Zawartość |
|---------|-------|-----------|
| B | 1 | Dział (np. "1004 - AI Adoption") |
| D | 3 | Nazwa Klienta (np. "Henkel") |
| F | 5 | PROJECT ID (np. "1004.26.002.Henkel") |

**Uwaga**: Kolumny A, C, E są puste lub zawierają inne dane - kod czyta tylko B, D, F!

### Zakładka "NAZWY TASKOW" (Tasks):

| Kolumna | Index | Zawartość |
|---------|-------|-----------|
| A | 0 | NAZWA PROJEKTU / Kategoria |
| B | 1 | TASK_ID (np. "1102") |
| C | 2 | NAZWA TASKU (np. "Przygotowywanie materiałów") |
| D | 3 | SŁOWA KLUCZOWE (np. "Slajdy, PDF, wideo") |
| E | 4 | TAGI SPECJALNE (np. "#NazwaKlienta") |

### Logika kategorii:

| Kategoria w arkuszu | PROJECT ID | Kiedy |
|---------------------|------------|-------|
| `ACADEMY (Klient)` | Z tabeli Matryca | Praca dla klienta z umową |
| `1000.26.000 ACADEMY INTERNAL` | `1000.26.000` | Wewnętrzne Academy |
| `8000.26.000 Sales & Business Development` | `8000.26.000` | Sprzedaż |
| `9000.26.000 INTERNAL / OPERACJE` | `9000.26.000` | HR, admin, operacje |

---

## 6. Logika AI (classifier.ts)

### SYSTEM_PROMPT - kluczowe zasady:

1. **Myślenie semantyczne** - AI rozumie kontekst, nie tylko słowa kluczowe
2. **Zawsze znajdź dopasowanie** - nawet przy niepewności zaproponuj najbardziej prawdopodobny task
3. **Podaj alternatywy** - jeśli jest kilka możliwości
4. **Uzasadnij** - wyjaśnij dlaczego to dopasowanie

### Przykład rozumowania:
```
Input: "konfiguracja clockify"
AI myśli: "Clockify to narzędzie PM → pasuje do PM i Koordynacja Wewn."
Output: Task 9102, Project 9000.26.000
```

### Gdzie edytować prompt:
`src/services/classifier.ts` → zmienna `SYSTEM_PROMPT`

---

## 7. API Endpoints

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/classify` | POST | Klasyfikacja zadania |
| `/api/health` | GET | Health check |
| `/api/knowledge-base` | GET | Pobierz bazę wiedzy |
| `/api/knowledge-base/refresh` | POST | Odśwież cache |
| `/api/clockify/installed` | POST | CAKE.com lifecycle |
| `/api/clockify/deleted` | POST | CAKE.com lifecycle |

### Przykład request /api/classify:
```json
{
  "description": "przygotowywałem prezentację dla Henkel",
  "clientHint": "Henkel"
}
```

### Przykład response:
```json
{
  "success": true,
  "data": {
    "success": true,
    "confidence": "high",
    "task": {
      "taskId": "1102",
      "taskName": "Przygotowywanie materiałów",
      "projectCategory": "ACADEMY (Klient)"
    },
    "projectId": "1004.26.002.Henkel",
    "tags": ["#Henkel"],
    "reasoning": "Słowo 'prezentację' pasuje do 'Slajdy, PDF, wideo'..."
  }
}
```

---

## 8. Deployment

### Lokalne testowanie:
```bash
cd clockify-task-bot
npm install
npm run dev    # Development z hot reload
```

### Deploy na Vercel:
```bash
npm run build
vercel --prod
```

### Po zmianach w Google Sheets:
Cache odświeża się automatycznie co 5 minut. Aby wymusić:
```bash
curl -X POST https://clockify-task-bot.vercel.app/api/knowledge-base/refresh
```

---

## 9. CAKE.com Marketplace

### Manifest (public/manifest.json):
- `schemaVersion`: "1.3"
- `baseUrl`: https://clockify-task-bot.vercel.app
- `components`: sidebar z width=420, height=650
- `minimalSubscriptionPlan`: FREE

### Aktualizacja add-ona:
1. Zmień kod → commit → push
2. `vercel --prod`
3. W CAKE.com → "Create new version" (jeśli zmienił się manifest)

### Workspace ID właściciela:
`68ec1f58f78d45743df6165c`

---

## 10. Typowe problemy i rozwiązania

### "Nie udało się dopasować tasku"
- Sprawdź czy słowa kluczowe w Google Sheets pokrywają opis
- AI myśli semantycznie, ale potrzebuje wskazówek w słowach kluczowych

### "Tabela jest pusta"
- Sprawdź mapowanie kolumn w `googleSheets.ts` (B=1, D=3, F=5)
- Sprawdź czy konto usługi ma dostęp do arkusza

### "invalid x-api-key"
- Klucz Anthropic nieprawidłowy lub wygasł
- Zaktualizuj w Vercel → Environment Variables

### "DECODER routines::unsupported"
- Problem z formatem GOOGLE_PRIVATE_KEY
- Upewnij się że \n są poprawne (nie \\n)

### Przyciski/zmiany nie widoczne
- Zrób `vercel --prod` po zmianach
- Hard refresh w przeglądarce (Ctrl+Shift+R)

---

## 11. Bezpieczeństwo

### NIGDY nie commituj:
- Prawdziwych kluczy API
- Pliku `.env`
- Private keys

### Jeśli wyciek klucza:
1. Natychmiast unieważnij stary klucz w konsoli (Google/Anthropic)
2. Wygeneruj nowy
3. Zaktualizuj w Vercel
4. `vercel --prod`

---

## 12. Kontakt i zasoby

- **Google Cloud Console**: https://console.cloud.google.com/
- **Anthropic Console**: https://console.anthropic.com/
- **Vercel Dashboard**: https://vercel.com/
- **CAKE.com Developer**: https://marketplace.cake.com/
- **Clockify**: https://app.clockify.me/

---

## 13. Changelog

| Data | Zmiana |
|------|--------|
| 2026-01-31 | Utworzenie bota, deployment na Vercel |
| 2026-01-31 | Integracja z CAKE.com Marketplace |
| 2026-01-31 | Poprawa semantic reasoning w AI |
| 2026-01-31 | Usunięcie przycisków Kopiuj/Użyj |

---

*Ostatnia aktualizacja: 2026-01-31*
