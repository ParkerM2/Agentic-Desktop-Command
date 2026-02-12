/**
 * App-Level IPC Handlers (settings, dialogs, shell, tab state)
 */
import { dialog, shell, app } from 'electron';
import type { IpcRouter } from '../router';

export function registerAppHandlers(router: IpcRouter) {
  router.handle('settings.get', async () => {
    // TODO: Load from persistent store
    return {
      theme: 'system' as const,
      language: 'en',
      maxConcurrentAgents: 3,
      autoSave: true,
      telemetryEnabled: false,
      defaultBranch: 'main',
    };
  });

  router.handle('settings.save', async (_input) => {
    // TODO: Persist settings
    throw new Error('Not implemented');
  });

  router.handle('dialog.selectDirectory', async (input) => {
    const result = await dialog.showOpenDialog({
      title: input.title ?? 'Select Directory',
      properties: ['openDirectory'],
    });
    return { path: result.filePaths[0] ?? null };
  });

  router.handle('app.version', async () => {
    return { version: app.getVersion() };
  });

  router.handle('shell.openExternal', async (input) => {
    await shell.openExternal(input.url);
    return { success: true };
  });

  router.handle('tabState.get', async () => {
    // TODO: Load from persistent store
    return {};
  });

  router.handle('tabState.save', async (_input) => {
    // TODO: Persist tab state
    return { success: true };
  });
}
