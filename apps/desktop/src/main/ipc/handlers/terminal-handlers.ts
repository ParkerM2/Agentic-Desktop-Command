/**
 * Terminal IPC Handlers
 */
import type { IpcRouter } from '../router';

export function registerTerminalHandlers(router: IpcRouter) {
  router.handle('terminals.create', async (input) => {
    // TODO: Call terminal service (PTY creation)
    return {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: 'Terminal',
      cwd: input.cwd,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  });

  router.handle('terminals.destroy', async (_input) => {
    return { success: true };
  });

  router.handle('terminals.getSessions', async (_input) => {
    return [];
  });

  router.handle('terminals.restoreSession', async (_input) => {
    throw new Error('Not implemented');
  });

  router.handle('terminals.input', async (_input) => {
    return { success: true };
  });

  router.handle('terminals.resize', async (_input) => {
    return { success: true };
  });

  router.handle('terminals.setTitle', async (_input) => {
    return { success: true };
  });

  router.handle('terminals.generateName', async (_input) => {
    return { name: 'Terminal' };
  });

  router.handle('terminals.updateDisplayOrders', async (_input) => {
    return { success: true };
  });
}
