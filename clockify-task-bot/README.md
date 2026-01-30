# Clockify Task Bot

AI-powered task classification bot for Clockify. Helps employees select the correct task and project based on their work description using Claude AI with extended thinking.

## Features

- **Intelligent Task Matching** - Uses Claude AI to analyze work descriptions and match them to tasks from your knowledge base
- **Extended Thinking** - Claude uses step-by-step reasoning to ensure accurate classification without hallucination
- **Google Sheets Integration** - Reads projects and tasks from your existing Google Sheets knowledge base
- **Clockify Integration** - Works as a CAKE.com Marketplace add-on or standalone API
- **No Hallucination** - AI strictly uses only data from your knowledge base, never invents tasks

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLOCKIFY TASK BOT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  UI Panel    │───▶│  Backend API │───▶│ Google Sheets│     │
│  │  (Clockify)  │    │  (Node.js)   │    │ (Knowledge)  │     │
│  └──────────────┘    └──────┬───────┘    └──────────────┘     │
│                             │                                   │
│                     ┌───────▼───────┐                          │
│                     │  Claude AI    │                          │
│                     │  (Extended    │                          │
│                     │   Thinking)   │                          │
│                     └───────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Anthropic API key
- Google Cloud service account with Sheets API access
- Clockify workspace (optional, for full integration)

### 2. Installation

```bash
cd clockify-task-bot
npm install
```

### 3. Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Google Sheets
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Sheet names
PROJECTS_SHEET_NAME=PROJECT IDs
TASKS_SHEET_NAME=Taski
```

### 4. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Server will start on `http://localhost:3000`

## Google Sheets Structure

### Sheet 1: PROJECT IDs

| Dział | Nazwa Klienta | PROJECT ID |
|-------|---------------|------------|
| 1009 - SAR Partnership | SAR100_2 | 1009.26.001.SAR100_2 |
| 1004 - AI Adoption | Henkel | 1004.26.002.Henkel |

### Sheet 2: Tasks

| NAZWA PROJEKTU | TASK_ID | NAZWA TASKU | SŁOWA KLUCZOWE | TAGI SPECJALNE |
|----------------|---------|-------------|----------------|----------------|
| ACADEMY (Klient) | 1101 | Realizacja szkolenia | Warsztaty live, wykład | #NazwaKlienta |
| 8000.26.000 Sales | 8005 | Admin & HubSpot | CRM, statusy | #8005-Statusy |

## API Endpoints

### POST /api/classify

Classify a task description.

**Request:**
```json
{
  "description": "przygotowywałem prezentację dla Henkel",
  "clientHint": "Henkel"
}
```

**Response:**
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
    "reasoning": "Dopasowano na podstawie słów kluczowych: prezentację → Slajdy, PDF, wideo"
  }
}
```

### POST /api/classify-and-log

Classify and optionally create a Clockify time entry.

### GET /api/knowledge-base

Get the current knowledge base (projects and tasks).

### POST /api/knowledge-base/refresh

Force refresh the knowledge base cache.

### GET /api/health

Health check endpoint.

## Clockify Add-on Deployment

### 1. Create CAKE.com Developer Account

Go to [dev-docs.marketplace.cake.com](https://dev-docs.marketplace.cake.com/) and create an account.

### 2. Host Your Backend

Deploy to a hosting provider (Vercel, Railway, Heroku, etc.):

```bash
# Vercel
vercel deploy

# Railway
railway up
```

### 3. Update Manifest

Update URLs in `manifest.json` to point to your hosted backend.

### 4. Submit for Review

Upload your add-on to the CAKE.com Marketplace for review.

## Project Category Logic

| Category | PROJECT ID | When to use |
|----------|------------|-------------|
| ACADEMY (Klient) | From PROJECT IDs table | Work for specific client |
| 1000.26.000 ACADEMY INTERNAL | 1000.26.000 | Internal Academy work |
| 8000.26.000 Sales | 8000.26.000 | Sales & Business Dev |
| 9000.26.000 INTERNAL | 9000.26.000 | Operations, HR, Admin |

## Anti-Hallucination Measures

The bot is designed to NEVER hallucinate:

1. **Strict Knowledge Base** - Only uses tasks from your Google Sheets
2. **Extended Thinking** - Claude reasons step-by-step before answering
3. **Confidence Levels** - Returns high/medium/low confidence
4. **Alternatives** - Suggests multiple options when uncertain
5. **Clarification** - Asks for more info when needed
6. **Source Citation** - Shows which keywords matched

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## License

MIT

## Support

For issues and feature requests, contact: support@wearefuture.pl
