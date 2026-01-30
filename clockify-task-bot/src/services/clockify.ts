import { ClockifyTimeEntry } from '../types/index.js';

const CLOCKIFY_API_BASE = 'https://api.clockify.me/api/v1';

interface ClockifyProject {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  billable: boolean;
}

interface ClockifyTask {
  id: string;
  name: string;
  projectId: string;
}

interface ClockifyTag {
  id: string;
  name: string;
  workspaceId: string;
}

/**
 * Make authenticated request to Clockify API
 */
async function clockifyRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  apiKey?: string,
  addonToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Support both API key (user) and Addon token (marketplace addon)
  if (addonToken) {
    headers['X-Addon-Token'] = addonToken;
  } else if (apiKey) {
    headers['X-Api-Key'] = apiKey;
  } else {
    throw new Error('Either API key or Addon token is required');
  }

  const response = await fetch(`${CLOCKIFY_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clockify API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Get all projects in a workspace
 */
export async function getProjects(
  workspaceId: string,
  auth: { apiKey?: string; addonToken?: string }
): Promise<ClockifyProject[]> {
  return clockifyRequest<ClockifyProject[]>(
    `/workspaces/${workspaceId}/projects?page-size=500`,
    { method: 'GET' },
    auth.apiKey,
    auth.addonToken
  );
}

/**
 * Find project by name (PROJECT ID from Google Sheets)
 */
export async function findProjectByName(
  workspaceId: string,
  projectName: string,
  auth: { apiKey?: string; addonToken?: string }
): Promise<ClockifyProject | null> {
  const projects = await getProjects(workspaceId, auth);
  return projects.find((p) => p.name === projectName) || null;
}

/**
 * Get all tasks for a project
 */
export async function getProjectTasks(
  workspaceId: string,
  projectId: string,
  auth: { apiKey?: string; addonToken?: string }
): Promise<ClockifyTask[]> {
  return clockifyRequest<ClockifyTask[]>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
    { method: 'GET' },
    auth.apiKey,
    auth.addonToken
  );
}

/**
 * Get all tags in a workspace
 */
export async function getTags(
  workspaceId: string,
  auth: { apiKey?: string; addonToken?: string }
): Promise<ClockifyTag[]> {
  return clockifyRequest<ClockifyTag[]>(
    `/workspaces/${workspaceId}/tags`,
    { method: 'GET' },
    auth.apiKey,
    auth.addonToken
  );
}

/**
 * Find or create a tag
 */
export async function findOrCreateTag(
  workspaceId: string,
  tagName: string,
  auth: { apiKey?: string; addonToken?: string }
): Promise<ClockifyTag> {
  const tags = await getTags(workspaceId, auth);
  const normalizedName = tagName.replace(/^#/, ''); // Remove # prefix if present

  const existing = tags.find(
    (t) => t.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  // Create new tag
  return clockifyRequest<ClockifyTag>(
    `/workspaces/${workspaceId}/tags`,
    {
      method: 'POST',
      body: JSON.stringify({ name: normalizedName }),
    },
    auth.apiKey,
    auth.addonToken
  );
}

/**
 * Create a time entry in Clockify
 */
export async function createTimeEntry(
  workspaceId: string,
  userId: string,
  entry: ClockifyTimeEntry,
  auth: { apiKey?: string; addonToken?: string }
): Promise<{ id: string }> {
  return clockifyRequest<{ id: string }>(
    `/workspaces/${workspaceId}/user/${userId}/time-entries`,
    {
      method: 'POST',
      body: JSON.stringify({
        description: entry.description,
        projectId: entry.projectId,
        taskId: entry.taskId,
        tagIds: entry.tagIds,
        start: entry.start,
        end: entry.end,
        billable: entry.billable,
      }),
    },
    auth.apiKey,
    auth.addonToken
  );
}

/**
 * Get current user info
 */
export async function getCurrentUser(
  auth: { apiKey?: string; addonToken?: string }
): Promise<{ id: string; email: string; name: string; activeWorkspace: string }> {
  return clockifyRequest<{ id: string; email: string; name: string; activeWorkspace: string }>(
    '/user',
    { method: 'GET' },
    auth.apiKey,
    auth.addonToken
  );
}

/**
 * Resolve PROJECT ID from Google Sheets to Clockify project ID
 * In Clockify, project names should match the PROJECT IDs from Google Sheets
 */
export async function resolveProjectId(
  workspaceId: string,
  projectIdFromSheets: string,
  auth: { apiKey?: string; addonToken?: string }
): Promise<string | null> {
  const project = await findProjectByName(workspaceId, projectIdFromSheets, auth);
  return project?.id || null;
}

/**
 * Resolve multiple tags to their Clockify IDs
 */
export async function resolveTagIds(
  workspaceId: string,
  tagNames: string[],
  auth: { apiKey?: string; addonToken?: string }
): Promise<string[]> {
  const tagIds: string[] = [];

  for (const tagName of tagNames) {
    try {
      const tag = await findOrCreateTag(workspaceId, tagName, auth);
      tagIds.push(tag.id);
    } catch (error) {
      console.error(`Failed to resolve tag ${tagName}:`, error);
    }
  }

  return tagIds;
}

/**
 * Health check for Clockify API connection
 */
export async function healthCheck(
  auth: { apiKey?: string; addonToken?: string }
): Promise<boolean> {
  try {
    await getCurrentUser(auth);
    return true;
  } catch {
    return false;
  }
}
