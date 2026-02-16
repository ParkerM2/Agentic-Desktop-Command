/**
 * Task IPC handlers
 *
 * Hub task channels (`hub.tasks.*`) proxy directly to the Hub API.
 * Legacy channels (`tasks.*`) forward to Hub where possible,
 * falling back to local services for decompose/GitHub import.
 */

import type { InvokeOutput } from '@shared/ipc-contract';
import type { Task as HubTask, TaskStatus as HubTaskStatus, TaskUpdateRequest } from '@shared/types/hub-protocol';

import type { HubApiClient } from '../../services/hub/hub-api-client';
import type { GithubTaskImporter } from '../../services/tasks/github-importer';
import type { TaskDecomposer } from '../../services/tasks/task-decomposer';
import type { IpcRouter } from '../router';

// Hub API Task shape differs from the legacy local TaskSchema.
// Legacy channels cast Hub responses through unknown at this boundary.
type LegacyTask = InvokeOutput<'tasks.get'>;
type LegacyTaskList = InvokeOutput<'tasks.list'>;

// ─── Status Mapping ─────────────────────────────────────────────

/** Maps Hub task statuses to local (legacy) task statuses */
const HUB_TO_LOCAL_STATUS: Partial<Record<string, string>> = {
  backlog: 'backlog',
  planning: 'in_progress',
  plan_ready: 'ai_review',
  queued: 'queue',
  running: 'in_progress',
  paused: 'in_progress',
  review: 'ai_review',
  done: 'done',
  error: 'error',
};

/** Maps local task statuses to Hub task statuses */
const LOCAL_TO_HUB_STATUS: Partial<Record<string, HubTaskStatus>> = {
  backlog: 'backlog',
  queue: 'queued',
  in_progress: 'running',
  ai_review: 'review',
  human_review: 'review',
  done: 'done',
  pr_created: 'done',
  error: 'error',
};

function mapHubStatusToLocal(hubStatus: string): string {
  return HUB_TO_LOCAL_STATUS[hubStatus] ?? hubStatus;
}

function mapLocalStatusToHub(localStatus: string): HubTaskStatus {
  return LOCAL_TO_HUB_STATUS[localStatus] ?? (localStatus as HubTaskStatus);
}

// ─── Hub → Local Task Transform ─────────────────────────────────

/**
 * Transforms a Hub API task response into the local (legacy) Task shape.
 * Hub returns flat fields; local expects nested structures.
 */
function transformHubTask(hubTask: HubTask): LegacyTask {
  const metadata: Record<string, unknown> = {
    ...(hubTask.metadata ?? {}),
  };

  // Map Hub flat cost fields into metadata
  const hubRaw = hubTask as unknown as Record<string, unknown>;
  if (hubRaw.costUsd !== undefined) {
    metadata.costUsd = hubRaw.costUsd;
  }
  if (hubRaw.costTokens !== undefined) {
    metadata.costTokens = hubRaw.costTokens;
  }
  if (hubRaw.agentName !== undefined) {
    metadata.agentName = hubRaw.agentName;
  }

  // Map Hub flat PR fields into prStatus-like metadata
  if (hubRaw.prNumber !== undefined || hubRaw.prUrl !== undefined) {
    metadata.prUrl = hubRaw.prUrl;
    metadata.prNumber = hubRaw.prNumber;
    metadata.prState = hubRaw.prState;
    metadata.prCiStatus = hubRaw.prCiStatus;
  }

  return {
    id: hubTask.id,
    title: hubTask.title,
    description: hubTask.description,
    status: mapHubStatusToLocal(hubTask.status) as LegacyTask['status'],
    subtasks: [],
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    createdAt: hubTask.createdAt,
    updatedAt: hubTask.updatedAt,
  };
}

function transformHubTaskList(hubTasks: HubTask[]): LegacyTaskList {
  return hubTasks.map(transformHubTask);
}

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
