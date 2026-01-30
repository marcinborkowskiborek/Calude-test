// Project from Google Sheets - PROJECT IDs tab
export interface Project {
  department: string;        // "Dział, którego dotyczy usługa" e.g., "1009 - SAR Partnership"
  clientName: string;        // "Nazwa Klienta" e.g., "SAR100_2"
  projectId: string;         // "PROJECT ID" e.g., "1009.26.001.SAR100_2"
}

// Task from Google Sheets - Tasks tab
export interface Task {
  projectCategory: string;   // "NAZWA PROJEKTU" e.g., "ACADEMY (Klient)" or "9000.26.000 INTERNAL / OPERACJE"
  taskId: string;            // "TASK_ID" e.g., "1101"
  taskName: string;          // "NAZWA TASKU" e.g., "Realizacja szkolenia"
  keywords: string;          // "SŁOWA KLUCZOWE" e.g., "Warsztaty live, wykład"
  specialTags: string;       // "TAGI SPECJALNE" e.g., "#NazwaKlienta" or "#8005-HubSpot-Admin"
}

// Knowledge base containing all data from Google Sheets
export interface KnowledgeBase {
  projects: Project[];
  tasks: Task[];
  lastUpdated: Date;
}

// Classification result from Claude AI
export interface ClassificationResult {
  success: boolean;
  confidence: 'high' | 'medium' | 'low';

  // Primary suggestion
  task: {
    taskId: string;
    taskName: string;
    projectCategory: string;
  } | null;

  projectId: string | null;      // e.g., "1004.26.002.Henkel" or "9000.26.000"
  tags: string[];                // e.g., ["#Henkel", "#8005-Statusy"]

  // AI reasoning (from extended thinking)
  reasoning: string;

  // Alternative suggestions if confidence is not high
  alternatives?: {
    task: {
      taskId: string;
      taskName: string;
    };
    projectId: string | null;
    confidence: number;
  }[];

  // If no match found
  noMatchReason?: string;

  // Questions if clarification needed
  clarificationNeeded?: string;
}

// User input for classification
export interface ClassificationRequest {
  description: string;         // What the employee did, e.g., "przygotowywałem prezentację dla Henkel"
  clientHint?: string;         // Optional hint about client name
  projectHint?: string;        // Optional hint about project type
}

// Clockify time entry structure
export interface ClockifyTimeEntry {
  description: string;
  projectId: string;
  taskId?: string;
  tagIds?: string[];
  start: string;
  end?: string;
  billable?: boolean;
}

// API Response structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Project category types for logic
export type ProjectCategoryType =
  | 'CLIENT'           // ACADEMY (Klient) - requires specific project ID
  | 'ACADEMY_INTERNAL' // 1000.26.000 ACADEMY INTERNAL
  | 'SALES'            // 8000.26.000 Sales & Business Development
  | 'INTERNAL';        // 9000.26.000 INTERNAL / OPERACJE

// Mapping of category patterns to types and default project IDs
export const PROJECT_CATEGORY_CONFIG: Record<ProjectCategoryType, {
  patterns: string[];
  defaultProjectId: string | null;
  requiresClientProject: boolean;
}> = {
  CLIENT: {
    patterns: ['(Klient)', '(Client)'],
    defaultProjectId: null,  // Must be selected from PROJECT IDs
    requiresClientProject: true
  },
  ACADEMY_INTERNAL: {
    patterns: ['1000.26.000', 'ACADEMY INTERNAL'],
    defaultProjectId: '1000.26.000',
    requiresClientProject: false
  },
  SALES: {
    patterns: ['8000.26.000', 'Sales & Business Development'],
    defaultProjectId: '8000.26.000',
    requiresClientProject: false
  },
  INTERNAL: {
    patterns: ['9000.26.000', 'INTERNAL / OPERACJE', 'INTERNAL/OPERACJE'],
    defaultProjectId: '9000.26.000',
    requiresClientProject: false
  }
};
