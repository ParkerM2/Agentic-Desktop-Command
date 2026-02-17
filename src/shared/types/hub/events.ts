/**
 * Hub Protocol — WebSocket Event Types
 */

import type { Device } from './devices';
import type { Project, SubProject } from './projects';
import type { Task, TaskProgress } from './tasks';
import type { Workspace } from './workspaces';

// ─── Connection ──────────────────────────────────────────────

export interface WsConnectedEvent {
  type: 'connected';
  deviceId: string;
  connectedDevices: number;
}

// ─── Heartbeat ───────────────────────────────────────────────

export interface WsHeartbeatPing {
  type: 'ping';
  timestamp: string;
}

export interface WsHeartbeatPong {
  type: 'pong';
  timestamp: string;
}

// ─── Task Events (Hub -> Device) ─────────────────────────────

export interface WsTaskCreatedEvent {
  type: 'task:created';
  task: Task;
  createdByDeviceId: string;
}

export interface WsTaskUpdatedEvent {
  type: 'task:updated';
  taskId: string;
  changes: Partial<Task>;
  updatedByDeviceId: string;
}

export interface WsTaskDeletedEvent {
  type: 'task:deleted';
  taskId: string;
  deletedByDeviceId: string;
}

export interface WsTaskProgressEvent {
  type: 'task:progress';
  taskId: string;
  progress: TaskProgress;
}

export interface WsTaskCompletedEvent {
  type: 'task:completed';
  taskId: string;
  result: 'success' | 'error';
  prUrl?: string;
  summary?: string;
}

// ─── Device Events (Hub -> Device) ───────────────────────────

export interface WsDeviceOnlineEvent {
  type: 'device:online';
  device: Device;
}

export interface WsDeviceOfflineEvent {
  type: 'device:offline';
  deviceId: string;
  lastSeen: string;
}

// ─── Workspace Events (Hub -> Device) ────────────────────────

export interface WsWorkspaceCreatedEvent {
  type: 'workspace:created';
  workspace: Workspace;
}

export interface WsWorkspaceUpdatedEvent {
  type: 'workspace:updated';
  workspaceId: string;
  changes: Partial<Workspace>;
}

export interface WsWorkspaceDeletedEvent {
  type: 'workspace:deleted';
  workspaceId: string;
}

// ─── Project Events (Hub -> Device) ──────────────────────────

export interface WsProjectCreatedEvent {
  type: 'project:created';
  project: Project;
  subProjects?: SubProject[];
}

export interface WsProjectUpdatedEvent {
  type: 'project:updated';
  projectId: string;
  changes: Partial<Project>;
}

export interface WsProjectDeletedEvent {
  type: 'project:deleted';
  projectId: string;
}

// ─── Execution Commands (Hub -> Assigned Device) ─────────────

export interface WsExecuteCommandEvent {
  type: 'command:execute';
  taskId: string;
  task: Task;
}

export interface WsCancelCommandEvent {
  type: 'command:cancel';
  taskId: string;
  reason?: string;
}

// ─── Execution Acknowledgments (Device -> Hub) ───────────────

export interface WsExecutionStartedEvent {
  type: 'execution:started';
  taskId: string;
  sessionId: string;
  pid?: number;
}

export interface WsExecutionAckEvent {
  type: 'execution:ack';
  taskId: string;
  action: 'started' | 'cancelled' | 'failed';
  error?: string;
}

// ─── Errors ──────────────────────────────────────────────────

export interface WsErrorEvent {
  type: 'error';
  code: string;
  message: string;
  relatedTo?: string;
}

// ─── Union Types ─────────────────────────────────────────────

export type WsEventFromHub =
  | WsConnectedEvent
  | WsHeartbeatPong
  // Task events
  | WsTaskCreatedEvent
  | WsTaskUpdatedEvent
  | WsTaskDeletedEvent
  | WsTaskProgressEvent
  | WsTaskCompletedEvent
  // Device events
  | WsDeviceOnlineEvent
  | WsDeviceOfflineEvent
  // Workspace events
  | WsWorkspaceCreatedEvent
  | WsWorkspaceUpdatedEvent
  | WsWorkspaceDeletedEvent
  // Project events
  | WsProjectCreatedEvent
  | WsProjectUpdatedEvent
  | WsProjectDeletedEvent
  // Execution commands
  | WsExecuteCommandEvent
  | WsCancelCommandEvent
  // Errors
  | WsErrorEvent;

export type WsEventFromDevice = WsHeartbeatPing | WsExecutionStartedEvent | WsExecutionAckEvent;

export type WsEvent = WsEventFromHub | WsEventFromDevice;
