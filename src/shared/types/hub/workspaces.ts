/**
 * Hub Protocol — Workspace Types
 */

// ─── Workspace Models ────────────────────────────────────────

export interface WorkspaceSettings {
  autoStartQueuedTasks?: boolean;
  maxConcurrentAgents?: number;
  defaultBranch?: string;
}

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description?: string;
  hostDeviceId?: string;
  settings?: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

// ─── Workspace Requests & Responses ──────────────────────────

export interface WorkspaceCreateRequest {
  name: string;
  description?: string;
  hostDeviceId?: string;
  settings?: WorkspaceSettings;
}

export interface WorkspaceUpdateRequest {
  name?: string;
  description?: string;
  hostDeviceId?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
}
