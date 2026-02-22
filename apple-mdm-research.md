# Apple MDM Research - Zarządzanie urządzeniami Apple w organizacji

## Przegląd systemów MDM dla Apple

### 1. Jamf Pro / Jamf Now
**Najlepszy dla: Dużych przedsiębiorstw, zaawansowanych potrzeb**

- Ponad 71 000 klientów globalnie, zarządza 30+ mln urządzeń Apple
- Rozbudowane REST API z setkami endpointów
- Oficjalny serwer MCP: `https://developer.jamf.com/mcp`
- Wsparcie dla CIS benchmarks, NIST, DISA STIG (Compliance Reporter)
- Jamf Protect – add-on EDR (endpoint detection & response)
- Cena: ~$5.75/mies. urządzenie mobilne, ~$10/mies. Mac

### 2. Kandji
**Najlepszy dla: Firm średniej wielkości, małych zespołów IT**

- 200+ gotowych automatyzacji (no-code)
- Wbudowany EDR bez dodatkowych kosztów
- Automatyczne remediacje, monitoring compliance
- Szablony: CIS, SOC 2, HIPAA, ISO 27001
- Rozwijające się API z dobrą dokumentacją
- Cena: kontakt handlowy (~$5,000–$70,000/rok)

### 3. Mosyle
**Najlepszy dla: Szkół, małych firm, organizacji z ograniczonym budżetem**

- Darmowy tier dla do 30 urządzeń
- Wbudowany antywirus nowej generacji dla Mac
- AI-powered Zero Trust dla Mac
- Integracje: Okta, Azure AD, Google Workspace
- Mosyle Auth 2 – pełne zarządzanie tożsamością i SSO
- Cena: od ~$1/urządzenie/mies.

### Tabela porównawcza

| Kryterium | Jamf | Kandji | Mosyle |
|---|---|---|---|
| Głębokość API | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Łatwość użycia | Wymaga wiedzy | Przyjazny | Prosty |
| Wbudowany EDR | Add-on | ✅ | ✅ |
| Integracja z Claude | ✅ Najlepsza | Ograniczona | Ograniczona |
| Cena | Umiarkowana | Wysoka | Niska |

---

## Integracja Claude z systemami MDM

### Model Context Protocol (MCP)

MCP (Model Context Protocol) to otwarty standard umożliwiający asystentom AI (jak Claude) bezpieczny dostęp do zewnętrznych danych i narzędzi.

#### Opcja A: Oficjalny Jamf MCP Server

Jamf udostępnia oficjalny serwer MCP:
- URL: `https://developer.jamf.com/mcp`
- Obsługiwane narzędzia: Claude Code, GitHub Copilot, AWS Q Developer, Google Gemini

**Przykłady zapytań w języku naturalnym:**
- "Jakie urządzenia nie mają włączonego FileVault?"
- "Wdróż profil WiFi na wszystkie MacBooki w dziale sprzedaży"
- "Pokaż urządzenia bez aktualizacji systemu od ponad 30 dni"
- "Generuj raport compliance dla SOC 2"

#### Opcja B: Community MCP Server

Projekt: https://github.com/dbankscard/jamf-mcp-server

**Możliwości:**
- 106 narzędzi zarządzania
- 12 zasobów i workflow prompts
- Architektura: `Claude Desktop → MCP Server (stdio) → Jamf Pro API`
- Obsługa Jamf Pro API i Classic API z automatycznym fallbackiem
- Uwierzytelnianie: Bearer Token (Client ID + Secret)

**Funkcje:**
- Wyszukiwanie i zarządzanie urządzeniami
- Wdrażanie polityk i profili konfiguracyjnych
- Wykonywanie skryptów zdalnie
- Zarządzanie aplikacjami
- Generowanie raportów compliance

### Konfiguracja dla administratora

1. Zainstaluj i skonfiguruj Jamf Pro lub wybrany system MDM
2. Wygeneruj API Client ID i Secret w konsoli MDM
3. Podłącz serwer MCP do Claude Desktop lub Claude Code
4. Admin może zadawać pytania po polsku lub angielsku w języku naturalnym

---

## Rekomendacja dla organizacji

### Mała firma (do 50 urządzeń)
→ **Mosyle** (darmowy tier lub niski koszt) + niestandardowe skrypty API

### Średnia firma (50-500 urządzeń)
→ **Kandji** (nowoczesne UI, automatyzacje) lub **Jamf Now**

### Duże przedsiębiorstwo (500+ urządzeń)
→ **Jamf Pro** + oficjalny MCP dla integracji z Claude

### Chcesz AI-assisted administration od zaraz
→ **Jamf Pro** z `jamf-mcp-server` – najlepszy ekosystem integracji z Claude

---

## Źródła

- [Jamf Pro API Developer Resources](https://developer.jamf.com/jamf-pro/docs/jamf-pro-api-developer-resources)
- [Jamf MCP Server (oficjalny)](https://developer.jamf.com/platform-api/docs/start-building-with-ai)
- [Community jamf-mcp-server (GitHub)](https://github.com/dbankscard/jamf-mcp-server)
- [JumpCloud: Best Apple MDM Solutions 2025](https://jumpcloud.com/blog/the-best-apple-mdm-solutions-in-2025-comprehensive-guide)
- [Workwize: Top Apple MDM Solutions 2026](https://www.goworkwize.com/blog/best-apple-mdm-solutions)
