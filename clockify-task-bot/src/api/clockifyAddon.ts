import { Router, Request, Response } from 'express';

const router = Router();

// Store addon installations (in production, use a database)
const installations = new Map<string, {
  workspaceId: string;
  addonToken: string;
  installedAt: Date;
  settings: Record<string, unknown>;
}>();

/**
 * Addon installed callback
 * Called by Clockify when the addon is installed in a workspace
 */
router.post('/installed', async (req: Request, res: Response) => {
  try {
    const { workspaceId, addonToken } = req.body;

    console.log(`Addon installed for workspace: ${workspaceId}`);

    installations.set(workspaceId, {
      workspaceId,
      addonToken,
      installedAt: new Date(),
      settings: {},
    });

    res.status(200).json({
      success: true,
      message: 'Addon installed successfully',
    });
  } catch (error) {
    console.error('Installation error:', error);
    res.status(500).json({
      success: false,
      error: 'Installation failed',
    });
  }
});

/**
 * Addon uninstalled callback
 * Called by Clockify when the addon is removed from a workspace
 */
router.post('/uninstalled', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;

    console.log(`Addon uninstalled from workspace: ${workspaceId}`);

    installations.delete(workspaceId);

    res.status(200).json({
      success: true,
      message: 'Addon uninstalled successfully',
    });
  } catch (error) {
    console.error('Uninstallation error:', error);
    res.status(500).json({
      success: false,
      error: 'Uninstallation failed',
    });
  }
});

/**
 * Get addon settings page
 */
router.get('/settings', async (req: Request, res: Response) => {
  const { workspaceId } = req.query;

  const installation = installations.get(workspaceId as string);

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Task Bot Settings</title>
      <style>
        body { font-family: system-ui; padding: 20px; max-width: 600px; margin: 0 auto; }
        h1 { color: #03A9F4; }
        .setting { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; }
        input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #03A9F4; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; }
        button:hover { background: #0288D1; }
        .info { background: #E3F2FD; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h1>Task Bot Settings</h1>

      <div class="info">
        <strong>Workspace ID:</strong> ${workspaceId || 'Not available'}<br>
        <strong>Status:</strong> ${installation ? 'Installed' : 'Not installed'}
      </div>

      <form id="settingsForm">
        <div class="setting">
          <label for="sheetsId">Google Sheets ID</label>
          <input type="text" id="sheetsId" placeholder="Your Google Sheets document ID" />
          <small>Find this in your Google Sheets URL: docs.google.com/spreadsheets/d/<strong>[THIS-ID]</strong>/edit</small>
        </div>

        <div class="setting">
          <label for="projectsSheet">Projects Sheet Name</label>
          <input type="text" id="projectsSheet" value="PROJECT IDs" />
        </div>

        <div class="setting">
          <label for="tasksSheet">Tasks Sheet Name</label>
          <input type="text" id="tasksSheet" value="Taski" />
        </div>

        <button type="submit">Save Settings</button>
      </form>

      <script>
        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          alert('Settings saved! (In production, this would save to the server)');
        });
      </script>
    </body>
    </html>
  `);
});

/**
 * Get addon token for a workspace (internal use)
 */
export function getAddonToken(workspaceId: string): string | null {
  return installations.get(workspaceId)?.addonToken || null;
}

export default router;
