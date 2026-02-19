/**
 * Hub Protocol — Task Types
 */

import type { TaskPriority, TaskStatus } from './enums';

// ─── Task Models ─────────────────────────────────────────────

export interface TaskProgress {
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  currentAgent: string | null;
  filesChanged: number;
  lastActivity: string;
  logs: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  workspaceId?: string;
  subProjectId?: string;
  assignedDeviceId?: string;
  createdByDeviceId: string;
  priority: TaskPriority;
  executionSessionId?: string;
  progress?: TaskProgress;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── Task Requests & Responses ───────────────────────────────

export interface TaskCreateRequest {
  title: string;
  description: string;
  projectId: string;
  priority?: TaskPriority;
  metadata?: Record<string, unknown>;
}

export interface TaskListQuery {
  status?: TaskStatus;
  projectId?: string;
  createdAfter?: string;
  updatedAfter?: string;
  limit?: number;
  offset?: number;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  metadata?: Record<string, unknown>;
}

export interface TaskExecuteResponse {
  sessionId: string;
  status: 'started' | 'queued';
}

export interface TaskCancelResponse {
  success: boolean;
  previousStatus: TaskStatus;
}

export interface ProgressPushRequest {
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  currentAgent: string | null;
  filesChanged: number;
  logLines: string[];
  status?: TaskStatus;
}

export interface ProgressPushResponse {
  received: boolean;
  taskId: string;
  broadcastedTo: number;
}

export interface TaskCompleteRequest {
  result: 'success' | 'error';
  prUrl?: string;
  errorMessage?: string;
  summary?: string;
}

export interface DeleteResponse {
  success: boolean;
}
