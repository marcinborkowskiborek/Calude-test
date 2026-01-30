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
 * Strict instructions to prevent hallucination
 */
const SYSTEM_PROMPT = `Jesteś asystentem do klasyfikacji zadań w systemie Clockify dla firmy We Are Future.
Twoim zadaniem jest na podstawie opisu pracownika dopasować odpowiedni TASK i PROJECT ID z bazy wiedzy.

## BEZWZGLĘDNE ZASADY - NIGDY ICH NIE ŁAM:

1. **ZERO HALUCYNACJI** - Możesz TYLKO używać tasków i projektów z dostarczonej bazy wiedzy. NIGDY nie wymyślaj nowych.

2. **DOPASOWANIE NA PODSTAWIE SŁÓW KLUCZOWYCH** - Analizuj kolumnę "SŁOWA KLUCZOWE" i dopasowuj do opisu pracownika.

3. **LOGIKA PROJECT ID**:
   - Gdy task ma kategorię "(Klient)" → MUSISZ znaleźć PROJECT ID klienta z tabeli PROJEKTY
   - Gdy task ma kategorię z numerem (np. "8000.26.000") → użyj tego numeru jako PROJECT ID

4. **LOGIKA TAGÓW**:
   - Gdy jest klient → ZAWSZE dodaj #NazwaKlienta
   - Opcjonalnie dodaj tag z kolumny TAGI jeśli pasuje

5. **GDY NIE JESTEŚ PEWIEN**:
   - Podaj kilka możliwych opcji z poziomem pewności
   - Jeśli brak dopasowania → powiedz wprost "Nie znalazłem pasującego tasku"
   - Jeśli potrzebujesz więcej info → zadaj pytanie

6. **FORMAT ODPOWIEDZI** - ZAWSZE odpowiadaj w formacie JSON:
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
  "reasoning": "Twoje rozumowanie dlaczego to dopasowanie",
  "alternatives": [...],  // opcjonalne, gdy pewność < high
  "clarificationNeeded": "..." // opcjonalne, gdy potrzebujesz więcej info
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
