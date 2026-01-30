import Anthropic from '@anthropic-ai/sdk';
import {
  ClassificationRequest,
  ClassificationResult,
  KnowledgeBase,
  PROJECT_CATEGORY_CONFIG,
  ProjectCategoryType,
} from '../types/index.js';
import { formatKnowledgeBaseForAI, findProjectByClient } from './googleSheets.js';

const anthropic = new Anthropic();

/**
 * System prompt for the classifier
 * Semantic understanding with reasoning
 */
const SYSTEM_PROMPT = `Jesteś inteligentnym asystentem do klasyfikacji zadań w systemie Clockify dla firmy We Are Future.
Twoim zadaniem jest MYŚLEĆ i WNIOSKOWAĆ na podstawie opisu pracownika, aby dopasować odpowiedni TASK i PROJECT ID.

## TWÓJ SPOSÓB MYŚLENIA:

1. **ROZUMIEJ KONTEKST** - Nie szukaj tylko dokładnych słów. Rozumiej CO pracownik robił:
   - "konfiguracja clockify" → to praca administracyjna/PM → prawdopodobnie "PM i Koordynacja Wewn." lub "Administracja i Biuro"
   - "spotkanie z klientem" → to może być "Discovery & Solution Design" lub "Sales Execution"
   - "pisałem maile" → to "PM / komunikacja" lub "Lead Gen & Outreach" (zależnie od kontekstu)

2. **ANALIZUJ SEMANTYCZNIE** - Słowa kluczowe to WSKAZÓWKI, nie ograniczenia:
   - Jeśli opis pasuje logicznie do tasku - dopasuj go, nawet bez dokładnego słowa
   - Myśl o KATEGORII działania: sprzedaż, szkolenie, administracja, rozwój, komunikacja

3. **WNIOSKUJ LOGICZNIE**:
   - Czy to praca DLA KLIENTA czy WEWNĘTRZNA?
   - Czy to SPRZEDAŻ, SZKOLENIE, ADMINISTRACJA, czy ROZWÓJ?
   - Jaki DZIAŁ najlepiej pasuje?

## ZASADY DOPASOWANIA:

1. **ZAWSZE ZNAJDŹ NAJLEPSZE DOPASOWANIE** - Nawet przy niepewności, zaproponuj najbardziej prawdopodobny task
2. **PODAJ ALTERNATYWY** - Jeśli jest kilka możliwości, pokaż 2-3 najlepsze
3. **UZASADNIJ** - Wyjaśnij DLACZEGO to dopasowanie ma sens

## LOGIKA PROJECT ID:
- **(Klient)** w kategorii → znajdź PROJECT ID klienta z tabeli PROJEKTY
- Numer jak "8000.26.000" w kategorii → użyj tego numeru jako PROJECT ID
- "ACADEMY INTERNAL" → 1000.26.000
- "Sales & Business Development" → 8000.26.000
- "INTERNAL / OPERACJE" → 9000.26.000

## LOGIKA TAGÓW:
- Gdy jest klient → #NazwaKlienta
- Opcjonalnie tag czynności z kolumny TAGI

## FORMAT ODPOWIEDZI - ZAWSZE JSON:
{
  "success": true/false,
  "confidence": "high"/"medium"/"low",
  "task": {
    "taskId": "NUMER",
    "taskName": "NAZWA",
    "projectCategory": "KATEGORIA"
  },
  "projectId": "NUMER.XX.XXX.KLIENT lub NUMER.XX.XXX",
  "tags": ["#tag1", "#tag2"],
  "reasoning": "Szczegółowe wyjaśnienie DLACZEGO to dopasowanie - opisz swój tok myślenia",
  "alternatives": [
    {"task": {...}, "projectId": "...", "reasoning": "dlaczego to też może pasować"}
  ]
}`;

/**
 * Determine project category type from category string
 */
function determineProjectCategoryType(category: string): ProjectCategoryType {
  for (const [type, config] of Object.entries(PROJECT_CATEGORY_CONFIG)) {
    for (const pattern of config.patterns) {
      if (category.includes(pattern)) {
        return type as ProjectCategoryType;
      }
    }
  }
  return 'INTERNAL'; // Default fallback
}

/**
 * Classify user input using Claude with extended thinking
 */
export async function classifyTask(
  request: ClassificationRequest,
  knowledgeBase: KnowledgeBase
): Promise<ClassificationResult> {
  const kbContext = formatKnowledgeBaseForAI(knowledgeBase);

  const userMessage = `## OPIS PRACOWNIKA:
"${request.description}"

${request.clientHint ? `\nWskazówka o kliencie: ${request.clientHint}` : ''}
${request.projectHint ? `\nWskazówka o projekcie: ${request.projectHint}` : ''}

${kbContext}

## ZADANIE:
Na podstawie opisu pracownika i bazy wiedzy:
1. Znajdź najlepiej pasujący TASK (na podstawie słów kluczowych)
2. Określ odpowiedni PROJECT ID
3. Zasugeruj tagi
4. Wyjaśnij swoje rozumowanie

Odpowiedz TYLKO w formacie JSON zgodnym ze specyfikacją.`;

  try {
    // Use Claude with extended thinking for better reasoning
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000, // Allow substantial thinking for complex classification
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract thinking and response
    let thinkingContent = '';
    let responseText = '';

    for (const block of response.content) {
      if (block.type === 'thinking') {
        thinkingContent = block.thinking;
      } else if (block.type === 'text') {
        responseText = block.text;
      }
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse JSON from response:', responseText);
      return {
        success: false,
        confidence: 'low',
        task: null,
        projectId: null,
        tags: [],
        reasoning: 'Nie udało się przetworzyć odpowiedzi AI',
        noMatchReason: 'Błąd parsowania odpowiedzi',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and enhance the result
    const result: ClassificationResult = {
      success: parsed.success ?? false,
      confidence: parsed.confidence ?? 'low',
      task: parsed.task ?? null,
      projectId: parsed.projectId ?? null,
      tags: parsed.tags ?? [],
      reasoning: parsed.reasoning ?? thinkingContent,
      alternatives: parsed.alternatives,
      clarificationNeeded: parsed.clarificationNeeded,
      noMatchReason: parsed.noMatchReason,
    };

    // If task requires client project, validate it exists
    if (result.task && result.success) {
      const categoryType = determineProjectCategoryType(result.task.projectCategory);
      const config = PROJECT_CATEGORY_CONFIG[categoryType];

      if (config.requiresClientProject && !result.projectId) {
        // Try to find client from description
        const clientMatch = findClientInDescription(request.description, knowledgeBase);
        if (clientMatch) {
          result.projectId = clientMatch.projectId;
          if (!result.tags.includes(`#${clientMatch.clientName}`)) {
            result.tags.push(`#${clientMatch.clientName}`);
          }
        } else {
          result.clarificationNeeded = 'Dla tego tasku potrzebuję znać nazwę klienta. Podaj klienta.';
          result.confidence = 'low';
        }
      } else if (!config.requiresClientProject && !result.projectId) {
        // Use default project ID for internal tasks
        result.projectId = config.defaultProjectId;
      }
    }

    console.log('Classification result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('Classification error:', error);
    return {
      success: false,
      confidence: 'low',
      task: null,
      projectId: null,
      tags: [],
      reasoning: `Błąd podczas klasyfikacji: ${error instanceof Error ? error.message : 'Unknown error'}`,
      noMatchReason: 'Wystąpił błąd podczas przetwarzania',
    };
  }
}

/**
 * Try to find client name in the description
 */
function findClientInDescription(description: string, kb: KnowledgeBase): { clientName: string; projectId: string } | null {
  const words = description.toLowerCase().split(/[\s,.-]+/);

  for (const project of kb.projects) {
    const clientLower = project.clientName.toLowerCase().replace(/_/g, '');
    for (const word of words) {
      if (word.length > 2 && (clientLower.includes(word) || word.includes(clientLower))) {
        return {
          clientName: project.clientName,
          projectId: project.projectId,
        };
      }
    }
  }

  return null;
}

/**
 * Quick validation without full AI classification
 * Used for simple, obvious cases
 */
export function quickMatch(
  description: string,
  knowledgeBase: KnowledgeBase
): ClassificationResult | null {
  const descLower = description.toLowerCase();

  // Check for exact keyword matches
  for (const task of knowledgeBase.tasks) {
    const keywords = task.keywords.toLowerCase().split(/[,\s]+/);
    const matchedKeywords = keywords.filter(
      (kw) => kw.length > 3 && descLower.includes(kw)
    );

    // If we match multiple keywords with high confidence
    if (matchedKeywords.length >= 2) {
      const categoryType = determineProjectCategoryType(task.projectCategory);
      const config = PROJECT_CATEGORY_CONFIG[categoryType];

      const result: ClassificationResult = {
        success: true,
        confidence: 'high',
        task: {
          taskId: task.taskId,
          taskName: task.taskName,
          projectCategory: task.projectCategory,
        },
        projectId: config.defaultProjectId,
        tags: [],
        reasoning: `Szybkie dopasowanie na podstawie słów kluczowych: ${matchedKeywords.join(', ')}`,
      };

      // Try to find client for client tasks
      if (config.requiresClientProject) {
        const clientMatch = findClientInDescription(description, knowledgeBase);
        if (clientMatch) {
          result.projectId = clientMatch.projectId;
          result.tags.push(`#${clientMatch.clientName}`);
        } else {
          // Need clarification for client
          return null; // Fall back to full AI classification
        }
      }

      // Add special tags if defined
      if (task.specialTags && !task.specialTags.includes('#NazwaKlienta')) {
        const tagMatch = task.specialTags.match(/#[\w-]+/);
        if (tagMatch) {
          result.tags.push(tagMatch[0]);
        }
      }

      return result;
    }
  }

  return null; // No quick match, need full AI classification
}
