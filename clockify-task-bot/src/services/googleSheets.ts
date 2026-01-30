import { google, sheets_v4 } from 'googleapis';
import { Project, Task, KnowledgeBase } from '../types/index.js';

// Cache for knowledge base
let cachedKnowledgeBase: KnowledgeBase | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = parseInt(process.env.SHEETS_CACHE_TTL || '300') * 1000; // Convert to ms

/**
 * Parse private key - handles both escaped \n and real newlines
 */
function parsePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;

  // If key contains literal \n (escaped), replace with real newlines
  if (key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }

  // If key is already properly formatted, return as-is
  return key;
}

/**
 * Initialize Google Sheets API client
 */
function getGoogleSheetsClient(): sheets_v4.Sheets {
  const privateKey = parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Fetch projects from the PROJECT IDs sheet
 */
async function fetchProjects(sheets: sheets_v4.Sheets): Promise<Project[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const sheetName = process.env.PROJECTS_SHEET_NAME || 'PROJECT IDs';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:F`, // Columns A to F
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    console.warn('No project data found in Google Sheets');
    return [];
  }

  // Skip header row
  const projects: Project[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] && row[1] && row[2]) { // Ensure we have department, client name, and project ID
      projects.push({
        department: String(row[0]).trim(),
        clientName: String(row[1]).trim(),
        projectId: String(row[2]).trim(),
      });
    }
  }

  console.log(`Loaded ${projects.length} projects from Google Sheets`);
  return projects;
}

/**
 * Fetch tasks from the Tasks sheet
 */
async function fetchTasks(sheets: sheets_v4.Sheets): Promise<Task[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const sheetName = process.env.TASKS_SHEET_NAME || 'Taski';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:E`, // Columns A to E
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    console.warn('No task data found in Google Sheets');
    return [];
  }

  // Skip header row
  const tasks: Task[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] && row[1] && row[2]) { // Ensure we have project category, task ID, and task name
      tasks.push({
        projectCategory: String(row[0]).trim(),
        taskId: String(row[1]).trim(),
        taskName: String(row[2]).trim(),
        keywords: row[3] ? String(row[3]).trim() : '',
        specialTags: row[4] ? String(row[4]).trim() : '',
      });
    }
  }

  console.log(`Loaded ${tasks.length} tasks from Google Sheets`);
  return tasks;
}

/**
 * Fetch complete knowledge base from Google Sheets
 * Uses caching to avoid excessive API calls
 */
export async function getKnowledgeBase(forceRefresh = false): Promise<KnowledgeBase> {
  const now = Date.now();

  // Return cached data if still valid
  if (!forceRefresh && cachedKnowledgeBase && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('Returning cached knowledge base');
    return cachedKnowledgeBase;
  }

  console.log('Fetching fresh knowledge base from Google Sheets...');
  const sheets = getGoogleSheetsClient();

  const [projects, tasks] = await Promise.all([
    fetchProjects(sheets),
    fetchTasks(sheets),
  ]);

  cachedKnowledgeBase = {
    projects,
    tasks,
    lastUpdated: new Date(),
  };
  cacheTimestamp = now;

  return cachedKnowledgeBase;
}

/**
 * Format knowledge base as context string for Claude
 */
export function formatKnowledgeBaseForAI(kb: KnowledgeBase): string {
  let context = `## BAZA WIEDZY - PROJEKTY I TASKI

### PROJEKTY KLIENTÓW (używaj gdy praca dla konkretnego klienta)
Lista dostępnych projektów z ich ID:

| Dział | Klient | PROJECT ID |
|-------|--------|------------|
`;

  for (const project of kb.projects) {
    context += `| ${project.department} | ${project.clientName} | ${project.projectId} |\n`;
  }

  context += `

### TASKI I ICH KATEGORIE
Lista wszystkich tasków z ich słowami kluczowymi:

| KATEGORIA | TASK_ID | NAZWA | SŁOWA KLUCZOWE | TAGI |
|-----------|---------|-------|----------------|------|
`;

  for (const task of kb.tasks) {
    context += `| ${task.projectCategory} | ${task.taskId} | ${task.taskName} | ${task.keywords} | ${task.specialTags} |\n`;
  }

  context += `

### ZASADY PRZYPISYWANIA PROJECT ID:
1. **ACADEMY (Klient)** lub **(Klient)** → WYMAGANY konkretny PROJECT ID z tabeli PROJEKTY KLIENTÓW
2. **1000.26.000 ACADEMY INTERNAL** → Użyj PROJECT ID: 1000.26.000
3. **8000.26.000 Sales & Business Development** → Użyj PROJECT ID: 8000.26.000
4. **9000.26.000 INTERNAL / OPERACJE** → Użyj PROJECT ID: 9000.26.000

### ZASADY TAGÓW:
- Gdy jest klient → zawsze dodaj tag #NazwaKlienta (np. #Henkel, #Orange)
- Opcjonalnie dodaj tag czynności jeśli jest w kolumnie TAGI (np. #8005-Statusy)
`;

  return context;
}

/**
 * Search for a project by client name (fuzzy matching)
 */
export function findProjectByClient(kb: KnowledgeBase, clientName: string): Project | null {
  const normalizedSearch = clientName.toLowerCase().replace(/[_\s-]/g, '');

  for (const project of kb.projects) {
    const normalizedClient = project.clientName.toLowerCase().replace(/[_\s-]/g, '');
    const normalizedDept = project.department.toLowerCase().replace(/[_\s-]/g, '');

    if (
      normalizedClient.includes(normalizedSearch) ||
      normalizedSearch.includes(normalizedClient) ||
      normalizedDept.includes(normalizedSearch)
    ) {
      return project;
    }
  }

  return null;
}

/**
 * Get all unique project categories
 */
export function getProjectCategories(kb: KnowledgeBase): string[] {
  const categories = new Set<string>();
  for (const task of kb.tasks) {
    categories.add(task.projectCategory);
  }
  return Array.from(categories);
}

/**
 * Invalidate cache (e.g., when manual refresh requested)
 */
export function invalidateCache(): void {
  cachedKnowledgeBase = null;
  cacheTimestamp = 0;
  console.log('Knowledge base cache invalidated');
}
