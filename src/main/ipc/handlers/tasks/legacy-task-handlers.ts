/**
 * Legacy task IPC handlers — `tasks.*` channels.
 *
 * Forward to TaskRepository (local-first with Hub mirror).
 * Responses are augmented with `subtasks: []` to match TaskSchema.
 *
 * Decompose and GitHub import use dedicated local services.
 */

import type { Task as HubTask, TaskUpdateRequest } from '@shared/types/hub-protocol';

import type { GithubTaskImporter } from '../../../services/tasks/github-importer';
import type { TaskDecomposer } from '../../../services/tasks/task-decomposer';
import type { TaskRepository } from '../../../services/tasks/types';
import type { IpcRouter } from '../../router';

/** Augment a HubTask with the `subtasks` field required by TaskSchema. */
function toLegacyTask(hubTask: HubTask): HubTask & { subtasks: never[] } {
  return { ...hubTask, subtasks: [] };
}

export function registerLegacyTaskHandlers(
  router: IpcRouter,
  taskRepository: TaskRepository,
  taskDecomposer?: TaskDecomposer,
  githubImporter?: GithubTaskImporter,
): void {
  router.handle('tasks.list', async ({ projectId }) => {
    const result = await taskRepository.listTasks({ projectId });
    return result.tasks.map(toLegacyTask);
  });

  router.handle('tasks.get', async ({ projectId: _projectId, taskId }) => {
    const hubTask = await taskRepository.getTask(taskId);
    return toLegacyTask(hubTask);
  });

  router.handle('tasks.create', async ({ title, description, projectId, complexity }) => {
    const hubTask = await taskRepository.createTask({
      projectId,
      title,
      description,
      metadata: complexity ? { complexity } : undefined,
    });
    return toLegacyTask(hubTask);
  });

  router.handle('tasks.update', async ({ taskId, updates }) => {
    const hubTask = await taskRepository.updateTask(
      taskId,
      updates as TaskUpdateRequest,
    );
    return toLegacyTask(hubTask);
  });

  router.handle('tasks.updateStatus', async ({ taskId, status }) => {
    const hubTask = await taskRepository.updateTaskStatus(taskId, status);
    return toLegacyTask(hubTask);
  });

  router.handle('tasks.delete', async ({ taskId, projectId: _projectId }) => {
    await taskRepository.deleteTask(taskId);
    return { success: true };
  });

  router.handle('tasks.execute', async ({ taskId, projectId: _projectId }) => {
    const result = await taskRepository.executeTask(taskId);
    return { agentId: result.sessionId };
  });

  router.handle('tasks.listAll', async () => {
    const result = await taskRepository.listTasks();
    return result.tasks.map(toLegacyTask);
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
