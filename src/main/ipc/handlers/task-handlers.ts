/**
 * Task IPC handlers
 *
 * Hub task channels (`hub.tasks.*`) proxy directly to the Hub API.
 * Legacy channels (`tasks.*`) forward to Hub where possible,
 * falling back to local services for decompose/GitHub import.
 */

import type { InvokeOutput } from '@shared/ipc-contract';
import type { TaskStatus as HubTaskStatus, TaskUpdateRequest } from '@shared/types/hub-protocol';

import type { HubApiClient } from '../../services/hub/hub-api-client';
import type { GithubTaskImporter } from '../../services/tasks/github-importer';
import type { TaskDecomposer } from '../../services/tasks/task-decomposer';
import type { IpcRouter } from '../router';

// Hub API Task shape differs from the legacy local TaskSchema.
// Legacy channels cast Hub responses through unknown at this boundary.
type LegacyTask = InvokeOutput<'tasks.get'>;
type LegacyTaskList = InvokeOutput<'tasks.list'>;

export interface TaskHandlerDeps {
  hubApiClient: HubApiClient;
  taskDecomposer?: TaskDecomposer;
  githubImporter?: GithubTaskImporter;
}

export function registerTaskHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient,
  taskDecomposer?: TaskDecomposer,
  githubImporter?: GithubTaskImporter,
): void {
  // ── Hub Task Channels ───────────────────────────────────────

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

  // ── Legacy Task Channels (forward to Hub) ───────────────────

  router.handle('tasks.list', async ({ projectId }) => {
    const result = await hubApiClient.listTasks({ project_id: projectId });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to fetch tasks');
    }

    return result.data.tasks as unknown as LegacyTaskList;
  });

  router.handle('tasks.get', async ({ projectId: _projectId, taskId }) => {
    const result = await hubApiClient.getTask(taskId);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to fetch task ${taskId}`);
    }

    return result.data as unknown as LegacyTask;
  });

  router.handle('tasks.create', async ({ title, description, projectId }) => {
    const result = await hubApiClient.createTask({
      title,
      description,
      projectId,
    });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to create task');
    }

    return result.data as unknown as LegacyTask;
  });

  router.handle('tasks.update', async ({ taskId, updates }) => {
    const result = await hubApiClient.updateTask(taskId, updates as TaskUpdateRequest);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to update task ${taskId}`);
    }

    return result.data as unknown as LegacyTask;
  });

  router.handle('tasks.updateStatus', async ({ taskId, status }) => {
    // Legacy status values may differ from Hub — cast at boundary
    const result = await hubApiClient.updateTaskStatus(taskId, status as HubTaskStatus);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to update task status ${taskId}`);
    }

    return result.data as unknown as LegacyTask;
  });

  router.handle('tasks.delete', async ({ taskId, projectId: _projectId }) => {
    const result = await hubApiClient.deleteTask(taskId);

    if (!result.ok) {
      throw new Error(result.error ?? `Failed to delete task ${taskId}`);
    }

    return { success: true };
  });

  router.handle('tasks.execute', async ({ taskId, projectId: _projectId }) => {
    const result = await hubApiClient.executeTask(taskId);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to execute task ${taskId}`);
    }

    return { agentId: result.data.sessionId };
  });

  router.handle('tasks.listAll', async () => {
    const result = await hubApiClient.listTasks();

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to fetch tasks');
    }

    return result.data.tasks as unknown as LegacyTaskList;
  });

  // ── Smart Task Creation (local services) ────────────────────

  router.handle('tasks.decompose', async ({ description }) => {
    if (!taskDecomposer) {
      throw new Error('Task decomposer is not available');
    }
    return await taskDecomposer.decompose(description);
  });

  router.handle('tasks.importFromGithub', async ({ url, projectId }) => {
    if (!githubImporter) {
      throw new Error('GitHub importer is not available');
    }
    return await githubImporter.importFromUrl(url, projectId);
  });

  router.handle('tasks.listGithubIssues', async ({ owner, repo }) => {
    if (!githubImporter) {
      throw new Error('GitHub importer is not available');
    }
    return await githubImporter.listImportableIssues(owner, repo);
  });
}
