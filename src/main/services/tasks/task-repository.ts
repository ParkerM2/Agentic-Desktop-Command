/**
 * Task Repository — Local-first with Hub mirror
 *
 * All reads and writes go through TaskService (local .adc/specs/ files).
 * Mutations are additionally mirrored to Hub when the connection is available.
 * Execute and Cancel are Hub-only operations.
 */

import type { Task as HubTask } from '@shared/types/hub-protocol';
import type { Task as LocalTask } from '@shared/types/task';

import type { TaskRepository, TaskRepositoryDeps } from './types';

// ── Conversion ─────────────────────────────────────────────────

function localToHubTask(local: LocalTask): HubTask {
  return {
    id: local.id,
    title: local.title,
    description: local.description,
    status: local.status,
    projectId: local.projectId ?? (local.metadata?.projectId as string | undefined) ?? '',
    priority: local.priority ?? 'normal',
    createdByDeviceId: '',
    createdAt: local.createdAt,
    updatedAt: local.updatedAt,
    metadata: local.metadata as Record<string, unknown> | undefined,
  };
}

// ── Factory ────────────────────────────────────────────────────

export function createTaskRepository(deps: TaskRepositoryDeps): TaskRepository {
  const { taskService, hubApiClient, hubConnectionManager } = deps;

  /** Fire-and-forget mirror to Hub. Logs warnings on failure. */
  function mirrorToHub(action: () => Promise<unknown>): void {
    if (!hubConnectionManager.isAvailable()) return;
    void action().catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('[TaskRepository] Hub mirror failed:', msg);
    });
  }

  /**
   * Find the projectId for a given task by scanning all tasks.
   * The TaskService caches taskId -> projectPath internally, but we need
   * the projectId (not path) for Hub operations. We scan listAllTasks
   * to build the mapping.
   */
  function resolveProjectIdForTask(taskId: string): string | undefined {
    const allTasks = taskService.listAllTasks();
    const match = allTasks.find((t) => t.id === taskId);
    return match?.metadata?.projectId as string | undefined;
  }

  return {
    listTasks(query) {
      const tasks =
        query?.projectId === undefined
          ? taskService.listAllTasks()
          : taskService.listTasks(query.projectId);

      return Promise.resolve({ tasks: tasks.map(localToHubTask) });
    },

    getTask(taskId) {
      // Warm the internal cache so resolveByTaskId works
      const allTasks = taskService.listAllTasks();
      const match = allTasks.find((t) => t.id === taskId);
      if (!match) {
        return Promise.reject(new Error(`Task ${taskId} not found`));
      }
      return Promise.resolve(localToHubTask(match));
    },

    createTask(body) {
      const local = taskService.createTask({
        title: body.title,
        description: body.description ?? '',
        projectId: body.projectId,
        complexity: undefined,
      });

      const hubTask = localToHubTask(local);
      hubTask.projectId = body.projectId;

      mirrorToHub(() =>
        hubApiClient.createTask({
          title: body.title,
          description: body.description ?? '',
          projectId: body.projectId,
          priority: body.priority,
          metadata: body.metadata,
        }),
      );

      return Promise.resolve(hubTask);
    },

    updateTask(taskId, body) {
      const local = taskService.updateTask(taskId, body);
      const hubTask = localToHubTask(local);

      mirrorToHub(() => hubApiClient.updateTask(taskId, body));

      return Promise.resolve(hubTask);
    },

    updateTaskStatus(taskId, status) {
      const local = taskService.updateTaskStatus(taskId, status);
      const hubTask = localToHubTask(local);

      mirrorToHub(() => hubApiClient.updateTaskStatus(taskId, status));

      return Promise.resolve(hubTask);
    },

    deleteTask(taskId) {
      const projectId = resolveProjectIdForTask(taskId);
      if (!projectId) {
        return Promise.reject(
          new Error(`Cannot resolve project for task ${taskId} — list tasks first`),
        );
      }

      taskService.deleteTask(projectId, taskId);

      mirrorToHub(() => hubApiClient.deleteTask(taskId));

      return Promise.resolve({ success: true });
    },

    async executeTask(taskId) {
      if (!hubConnectionManager.isAvailable()) {
        throw new Error('Hub not connected — use agent.startExecution for local execution');
      }

      const result = await hubApiClient.executeTask(taskId);
      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Failed to execute task ${taskId}`);
      }
      return result.data;
    },

    async cancelTask(taskId, reason) {
      if (!hubConnectionManager.isAvailable()) {
        throw new Error('Hub not connected — cannot cancel remotely');
      }

      const result = await hubApiClient.cancelTask(taskId, reason);
      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Failed to cancel task ${taskId}`);
      }
      return result.data;
    },
  };
}
