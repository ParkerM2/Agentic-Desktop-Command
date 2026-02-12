/**
 * Project IPC Handlers
 *
 * Thin layer: validate input (done by router) → call service → return result
 */
import type { IpcRouter } from '../router';

export function registerProjectHandlers(router: IpcRouter) {
  router.handle('projects.list', async () => {
    // TODO: Call project service
    return [];
  });

  router.handle('projects.add', async (input) => {
    // TODO: Call project service
    return {
      id: crypto.randomUUID(),
      name: input.name,
      path: input.path,
      createdAt: new Date().toISOString(),
    };
  });

  router.handle('projects.remove', async (_input) => {
    // TODO: Call project service
    return { success: true };
  });

  router.handle('projects.updateSettings', async (_input) => {
    // TODO: Call project service
    throw new Error('Not implemented');
  });

  router.handle('projects.initialize', async (_input) => {
    // TODO: Call project service
    return { success: true };
  });
}
