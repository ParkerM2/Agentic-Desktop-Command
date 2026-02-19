/**
 * Hub task IPC handlers — `hub.tasks.*` channels.
 *
 * These proxy to the TaskRepository (local-first with Hub mirror).
 */

import type { TaskRepository } from '../../../services/tasks/types';
import type { IpcRouter } from '../../router';

export function registerHubTaskHandlers(
  router: IpcRouter,
  taskRepository: TaskRepository,
): void {
  router.handle('hub.tasks.list', async ({ projectId, workspaceId }) => {
    return await taskRepository.listTasks({ projectId, workspaceId });
  });

  router.handle('hub.tasks.get', async ({ taskId }) => {
    return await taskRepository.getTask(taskId);
  });

  router.handle('hub.tasks.create', async ({ projectId, workspaceId, title, description, priority, metadata }) => {
    return await taskRepository.createTask({
      projectId,
      workspaceId,
      title,
      description: description ?? '',
      priority,
      metadata: {
        ...metadata,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });
  });

  router.handle('hub.tasks.update', async ({ taskId, title, description, status, priority, metadata }) => {
    return await taskRepository.updateTask(taskId, {
      title,
      description,
      status,
      priority,
      metadata,
    });
  });

  router.handle('hub.tasks.updateStatus', async ({ taskId, status }) => {
    return await taskRepository.updateTaskStatus(taskId, status);
  });

  router.handle('hub.tasks.delete', async ({ taskId }) => {
    return await taskRepository.deleteTask(taskId);
  });

  router.handle('hub.tasks.execute', async ({ taskId }) => {
    return await taskRepository.executeTask(taskId);
  });

  router.handle('hub.tasks.cancel', async ({ taskId, reason }) => {
    return await taskRepository.cancelTask(taskId, reason);
  });
}
