/**
 * Hub task IPC handlers — `hub.tasks.*` channels.
 *
 * These proxy directly to the Hub API without status/type transformation.
 */

import type { HubApiClient } from '../../../services/hub/hub-api-client';
import type { IpcRouter } from '../../router';

export function registerHubTaskHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient,
): void {
  router.handle('hub.tasks.list', async ({ projectId, workspaceId }) => {
    const query: Record<string, string> = {};
    if (projectId) {
      query.project_id = projectId;
    }
    if (workspaceId) {
      query.workspace_id = workspaceId;
    }

    const result = await hubApiClient.listTasks(query);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to fetch tasks');
    }

    return result.data;
  });

  router.handle('hub.tasks.get', async ({ taskId }) => {
    const result = await hubApiClient.getTask(taskId);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to fetch task ${taskId}`);
    }

    return result.data;
  });

  router.handle('hub.tasks.create', async ({ projectId, workspaceId, title, description, priority, metadata }) => {
    const result = await hubApiClient.createTask({
      title,
      description: description ?? '',
      projectId,
      priority,
      metadata: {
        ...metadata,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to create task');
    }

    return result.data;
  });

  router.handle('hub.tasks.update', async ({ taskId, title, description, status, priority, metadata }) => {
    const result = await hubApiClient.updateTask(taskId, {
      title,
      description,
      status,
      priority,
      metadata,
    });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to update task ${taskId}`);
    }

    return result.data;
  });

  router.handle('hub.tasks.updateStatus', async ({ taskId, status }) => {
    const result = await hubApiClient.updateTaskStatus(taskId, status);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to update task status ${taskId}`);
    }

    return result.data;
  });

  router.handle('hub.tasks.delete', async ({ taskId }) => {
    const result = await hubApiClient.deleteTask(taskId);

    if (!result.ok) {
      throw new Error(result.error ?? `Failed to delete task ${taskId}`);
    }

    return { success: true };
  });

  router.handle('hub.tasks.execute', async ({ taskId }) => {
    const result = await hubApiClient.executeTask(taskId);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to execute task ${taskId}`);
    }

    return result.data;
  });

  router.handle('hub.tasks.cancel', async ({ taskId, reason }) => {
    const result = await hubApiClient.cancelTask(taskId, reason);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to cancel task ${taskId}`);
    }

    return result.data;
  });
}
