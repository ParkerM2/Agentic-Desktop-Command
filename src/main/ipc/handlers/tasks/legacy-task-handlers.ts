/**
 * Legacy task IPC handlers — `tasks.*` channels.
 *
 * Forward to Hub API where possible, falling back to local services
 * for decompose/GitHub import. Responses are transformed from Hub
 * shape to the local (legacy) Task shape.
 */

import type { TaskUpdateRequest } from '@shared/types/hub-protocol';

import { mapLocalStatusToHub } from './status-mapping';
import { transformHubTask, transformHubTaskList } from './task-transform';

import type { HubApiClient } from '../../../services/hub/hub-api-client';
import type { GithubTaskImporter } from '../../../services/tasks/github-importer';
import type { TaskDecomposer } from '../../../services/tasks/task-decomposer';
import type { IpcRouter } from '../../router';

export function registerLegacyTaskHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient,
  taskDecomposer?: TaskDecomposer,
  githubImporter?: GithubTaskImporter,
): void {
  router.handle('tasks.list', async ({ projectId }) => {
    const result = await hubApiClient.listTasks({ project_id: projectId });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to fetch tasks');
    }

    return transformHubTaskList(result.data.tasks);
  });

  router.handle('tasks.get', async ({ projectId: _projectId, taskId }) => {
    const result = await hubApiClient.getTask(taskId);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to fetch task ${taskId}`);
    }

    return transformHubTask(result.data);
  });

  router.handle('tasks.create', async ({ title, description, projectId, complexity }) => {
    const result = await hubApiClient.createTask({
      title,
      description,
      projectId,
      metadata: complexity ? { complexity } : undefined,
    });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to create task');
    }

    return transformHubTask(result.data);
  });

  router.handle('tasks.update', async ({ taskId, updates }) => {
    const result = await hubApiClient.updateTask(taskId, updates as TaskUpdateRequest);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to update task ${taskId}`);
    }

    return transformHubTask(result.data);
  });

  router.handle('tasks.updateStatus', async ({ taskId, status }) => {
    const hubStatus = mapLocalStatusToHub(status);
    const result = await hubApiClient.updateTaskStatus(taskId, hubStatus);

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to update task status ${taskId}`);
    }

    return transformHubTask(result.data);
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

    return transformHubTaskList(result.data.tasks);
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
