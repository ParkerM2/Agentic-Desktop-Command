/**
 * Hub task IPC handlers — `hub.tasks.*` channels.
 *
 * These proxy to the TaskRepository (local-first with Hub mirror).
 */

import { HUB_TASKS } from '@shared/ipc/tasks/channels';

import type { TaskRepository } from './types';
import type { IpcRouter } from '../../ipc/router';


export function registerHubTaskHandlers(
  router: IpcRouter,
  taskRepository: TaskRepository,
): void {
  router.handle(HUB_TASKS.LIST.ALL, async ({ projectId, workspaceId }) => {
    return await taskRepository.listTasks({ projectId, workspaceId });
  });

  router.handle(HUB_TASKS.GET.TASK, async ({ taskId }) => {
    return await taskRepository.getTask(taskId);
  });

  router.handle(HUB_TASKS.CREATE.TASK, async ({ projectId, workspaceId, title, description, priority, metadata }) => {
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

  router.handle(HUB_TASKS.UPDATE.TASK, async ({ taskId, title, description, status, priority, metadata }) => {
    return await taskRepository.updateTask(taskId, {
      title,
      description,
      status,
      priority,
      metadata,
    });
  });

  router.handle(HUB_TASKS.UPDATE.STATUS, async ({ taskId, status }) => {
    return await taskRepository.updateTaskStatus(taskId, status);
  });

  router.handle(HUB_TASKS.DELETE.TASK, async ({ taskId }) => {
    return await taskRepository.deleteTask(taskId);
  });

  router.handle(HUB_TASKS.EXECUTE.TASK, async ({ taskId }) => {
    return await taskRepository.executeTask(taskId);
  });

  router.handle(HUB_TASKS.CANCEL.TASK, async ({ taskId, reason }) => {
    return await taskRepository.cancelTask(taskId, reason);
  });
}
