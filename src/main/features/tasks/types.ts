/**
 * Task Repository — Types & Interface
 *
 * The TaskRepository sits between IPC handlers and TaskService/HubApiClient.
 * It ALWAYS reads/writes locally via TaskService, and mirrors mutations to
 * Hub when connected (fire-and-forget).
 */

import type { TaskPriority, TaskStatus } from '@shared/types/hub/enums';
import type { Task as HubTask, TaskCancelResponse, TaskExecuteResponse } from '@shared/types/hub-protocol';

import type { HubApiClient } from '../hub/hub-api-client';
import type { HubConnectionManager } from '../hub/hub-connection';
import type { ProjectService } from '../project/project-service';
import type { TaskService } from '../project/task-service';

export interface TaskRepositoryDeps {
  taskService: TaskService;
  hubApiClient: HubApiClient;
  hubConnectionManager: HubConnectionManager;
  projectService: ProjectService;
}

export interface TaskRepository {
  listTasks: (query?: {
    projectId?: string;
    workspaceId?: string;
  }) => Promise<{ tasks: HubTask[] }>;

  getTask: (taskId: string) => Promise<HubTask>;

  createTask: (body: {
    projectId: string;
    workspaceId?: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    metadata?: Record<string, unknown>;
  }) => Promise<HubTask>;

  updateTask: (
    taskId: string,
    body: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      metadata?: Record<string, unknown>;
    },
  ) => Promise<HubTask>;

  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<HubTask>;

  deleteTask: (taskId: string) => Promise<{ success: boolean }>;

  executeTask: (taskId: string) => Promise<TaskExecuteResponse>;

  cancelTask: (taskId: string, reason?: string) => Promise<TaskCancelResponse>;
}
