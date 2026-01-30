import { Router, Request, Response } from 'express';
import { getKnowledgeBase, invalidateCache } from '../services/googleSheets.js';
import { classifyTask, quickMatch } from '../services/classifier.js';
import {
  resolveProjectId,
  resolveTagIds,
  createTimeEntry,
  getCurrentUser,
  healthCheck,
} from '../services/clockify.js';
import { ClassificationRequest, ApiResponse, ClassificationResult } from '../types/index.js';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', async (_req: Request, res: Response) => {
  const response: ApiResponse<{ status: string; clockify: boolean }> = {
    success: true,
    data: {
      status: 'ok',
      clockify: false,
    },
    timestamp: new Date().toISOString(),
  };

  // Check Clockify connection if API key is configured
  if (process.env.CLOCKIFY_API_KEY) {
    response.data!.clockify = await healthCheck({ apiKey: process.env.CLOCKIFY_API_KEY });
  }

  res.json(response);
});

/**
 * Classify task based on description
 * POST /api/classify
 * Body: { description: string, clientHint?: string, projectHint?: string }
 */
router.post('/classify', async (req: Request, res: Response) => {
  try {
    const request: ClassificationRequest = {
      description: req.body.description,
      clientHint: req.body.clientHint,
      projectHint: req.body.projectHint,
    };

    if (!request.description || request.description.trim().length < 3) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: 'Opis musi mieć co najmniej 3 znaki',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Get knowledge base
    const kb = await getKnowledgeBase();

    // Try quick match first (for obvious cases)
    let result = quickMatch(request.description, kb);

    // If no quick match, use full AI classification
    if (!result) {
      result = await classifyTask(request, kb);
    }

    const response: ApiResponse<ClassificationResult> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Classification error:', error);
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * Get knowledge base (for debugging/display)
 * GET /api/knowledge-base
 */
router.get('/knowledge-base', async (_req: Request, res: Response) => {
  try {
    const kb = await getKnowledgeBase();
    const response: ApiResponse<typeof kb> = {
      success: true,
      data: kb,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    console.error('Knowledge base error:', error);
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * Refresh knowledge base cache
 * POST /api/knowledge-base/refresh
 */
router.post('/knowledge-base/refresh', async (_req: Request, res: Response) => {
  try {
    invalidateCache();
    const kb = await getKnowledgeBase(true);
    const response: ApiResponse<{ message: string; projectCount: number; taskCount: number }> = {
      success: true,
      data: {
        message: 'Cache odświeżony',
        projectCount: kb.projects.length,
        taskCount: kb.tasks.length,
      },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    console.error('Refresh error:', error);
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * Create time entry in Clockify
 * POST /api/time-entry
 * Body: { description, projectId, tags, start, end?, apiKey/addonToken }
 */
router.post('/time-entry', async (req: Request, res: Response) => {
  try {
    const {
      description,
      projectId,
      tags,
      start,
      end,
      apiKey,
      addonToken,
      workspaceId,
    } = req.body;

    const auth = { apiKey, addonToken };

    if (!apiKey && !addonToken) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: 'Wymagany API key lub Addon token',
        timestamp: new Date().toISOString(),
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Get user info
    const user = await getCurrentUser(auth);
    const wsId = workspaceId || user.activeWorkspace;

    // Resolve project ID from name to Clockify ID
    const clockifyProjectId = await resolveProjectId(wsId, projectId, auth);
    if (!clockifyProjectId) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: `Nie znaleziono projektu: ${projectId} w Clockify. Upewnij się, że projekt istnieje.`,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(errorResponse);
      return;
    }

    // Resolve tags
    const tagIds = tags && tags.length > 0 ? await resolveTagIds(wsId, tags, auth) : [];

    // Create time entry
    const entry = await createTimeEntry(wsId, user.id, {
      description,
      projectId: clockifyProjectId,
      tagIds,
      start: start || new Date().toISOString(),
      end,
    }, auth);

    const response: ApiResponse<{ entryId: string; message: string }> = {
      success: true,
      data: {
        entryId: entry.id,
        message: 'Wpis dodany do Clockify',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Time entry error:', error);
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * Combined: Classify and optionally create time entry
 * POST /api/classify-and-log
 * Body: { description, clientHint?, createEntry: boolean, start?, end?, apiKey/addonToken }
 */
router.post('/classify-and-log', async (req: Request, res: Response) => {
  try {
    const {
      description,
      clientHint,
      projectHint,
      createEntry,
      start,
      end,
      apiKey,
      addonToken,
      workspaceId,
    } = req.body;

    // First, classify the task
    const kb = await getKnowledgeBase();
    let classification = quickMatch(description, kb);
    if (!classification) {
      classification = await classifyTask({ description, clientHint, projectHint }, kb);
    }

    // If createEntry is true and classification successful, create time entry
    let entryId: string | null = null;

    if (createEntry && classification.success && classification.projectId) {
      const auth = { apiKey, addonToken };

      if (!apiKey && !addonToken) {
        const errorResponse: ApiResponse<null> = {
          success: false,
          error: 'Wymagany API key lub Addon token do tworzenia wpisów',
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(errorResponse);
        return;
      }

      const user = await getCurrentUser(auth);
      const wsId = workspaceId || user.activeWorkspace;

      const clockifyProjectId = await resolveProjectId(wsId, classification.projectId, auth);
      if (clockifyProjectId) {
        const tagIds = classification.tags.length > 0
          ? await resolveTagIds(wsId, classification.tags, auth)
          : [];

        const entry = await createTimeEntry(wsId, user.id, {
          description,
          projectId: clockifyProjectId,
          tagIds,
          start: start || new Date().toISOString(),
          end,
        }, auth);

        entryId = entry.id;
      }
    }

    const response: ApiResponse<ClassificationResult & { entryId?: string | null }> = {
      success: true,
      data: {
        ...classification,
        entryId,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Classify and log error:', error);
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(errorResponse);
  }
});

export default router;
