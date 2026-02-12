/**
 * Task IPC Handlers
 */
import type { IpcRouter } from '../router';

export function registerTaskHandlers(router: IpcRouter) {
  router.handle('tasks.list', async (_input) => {
    // TODO: Call task service
    return [];
  });

  router.handle('tasks.create', async (input) => {
    // TODO: Call task service
    return {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status: 'pending' as const,
      priority: input.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  router.handle('tasks.update', async (_input) => {
    throw new Error('Not implemented');
  });

  router.handle('tasks.updateStatus', async (_input) => {
    throw new Error('Not implemented');
  });

  router.handle('tasks.delete', async (_input) => {
    return { success: true };
  });

  router.handle('tasks.start', async (_input) => {
    throw new Error('Not implemented');
  });

  router.handle('tasks.stop', async (_input) => {
    throw new Error('Not implemented');
  });

  router.handle('tasks.archive', async (_input) => {
    return { success: true };
  });
}
