/**
 * Hub ↔ Device Communication Protocol Types
 *
 * THIS FILE IS THE SOURCE OF TRUTH.
 * Both Hub server and all clients MUST import from here.
 * DO NOT duplicate these types elsewhere.
 *
 * @see docs/contracts/hub-device-protocol.md for full specification
 * @version 2.0.0
 */

// ─── Enums & Literals ─────────────────────────────────────────

export type TaskStatus = 'backlog' | 'queued' | 'running' | 'paused' | 'review' | 'done' | 'error';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type DeviceType = 'desktop' | 'mobile' | 'web';

export type RepoStructure = 'single' | 'monorepo' | 'multi-repo';

// ─── User & Auth ──────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  lastLoginAt?: string;
}

// ─── Device ───────────────────────────────────────────────────

export interface DeviceCapabilities {
  canExecute: boolean;
  repos: string[];
}

export interface Device {
  id: string;
  machineId?: string;
  userId: string;
  deviceType: DeviceType;
  deviceName: string;
  capabilities: DeviceCapabilities;
  isOnline: boolean;
  lastSeen?: string;
  appVersion?: string;
  createdAt: string;
}

// ─── Workspace ────────────────────────────────────────────────

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

// ─── Project & Sub-Project ────────────────────────────────────

export interface Project {
  id: string;
  workspaceId?: string;
  name: string;
  description?: string;
  rootPath: string;
  gitUrl?: string;
  repoStructure: RepoStructure;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubProject {
  id: string;
  projectId: string;
  name: string;
  relativePath: string;
  gitUrl?: string;
  defaultBranch: string;
  createdAt: string;
}

// ─── Legacy Compatibility (deprecated) ────────────────────────

/** @deprecated Use DeviceCapabilities instead */
export interface ComputerCapabilities {
  canExecute: boolean;
  repos: string[];
}

/** @deprecated Use Device instead */
export interface Computer {
  id: string;
  machineId: string;
  machineName: string;
  deviceType: DeviceType;
  capabilities: ComputerCapabilities;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

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
  /** @deprecated Use assignedDeviceId instead */
  assignedComputerId?: string | null;
  createdByDeviceId: string;
  priority: TaskPriority;
  executionSessionId?: string;
  progress?: TaskProgress;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── REST API: Auth Requests ──────────────────────────────────

export interface AuthRegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
  deviceInfo?: {
    machineId?: string;
    deviceName: string;
    deviceType: DeviceType;
    capabilities?: DeviceCapabilities;
    appVersion?: string;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  device?: Device;
}

export interface AuthRefreshRequest {
  refreshToken: string;
}

export interface AuthRefreshResponse {
  accessToken: string;
  expiresAt: string;
}

// ─── REST API: Device Requests ────────────────────────────────

export interface DeviceRegisterRequest {
  machineId?: string;
  deviceName: string;
  deviceType: DeviceType;
  capabilities: DeviceCapabilities;
  appVersion?: string;
}

export interface DeviceUpdateRequest {
  deviceName?: string;
  capabilities?: Partial<DeviceCapabilities>;
  isOnline?: boolean;
  appVersion?: string;
}

export interface DeviceListResponse {
  devices: Device[];
}

/** @deprecated Use DeviceRegisterRequest instead */
export interface DeviceAuthRequest {
  machineId: string;
  machineName: string;
  deviceType: DeviceType;
  capabilities: ComputerCapabilities;
  appVersion: string;
}

/** @deprecated Use AuthResponse instead */
export interface DeviceAuthResponse {
  deviceId: string;
  token: string;
  expiresAt: string;
  hubVersion: string;
}

// ─── REST API: Workspace Requests ─────────────────────────────

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

// ─── REST API: Project Requests ───────────────────────────────

export interface ProjectCreateRequest {
  workspaceId: string;
  name: string;
  description?: string;
  rootPath: string;
  gitUrl?: string;
  repoStructure: RepoStructure;
  defaultBranch?: string;
  subProjects?: Array<{
    name: string;
    relativePath: string;
    gitUrl?: string;
    defaultBranch?: string;
  }>;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  gitUrl?: string;
  defaultBranch?: string;
}

export interface SubProjectCreateRequest {
  name: string;
  relativePath: string;
  gitUrl?: string;
  defaultBranch?: string;
}

// ─── REST API: Task Requests ──────────────────────────────────

export interface ComputerUpdateRequest {
  machineName?: string;
  capabilities?: Partial<ComputerCapabilities>;
  isOnline?: boolean;
}

export interface ComputerListResponse {
  computers: Computer[];
}

export interface TaskCreateRequest {
  title: string;
  description: string;
  projectId: string;
  assignedComputerId?: string | null;
  priority?: TaskPriority;
  metadata?: Record<string, unknown>;
}

export interface TaskListQuery {
  status?: TaskStatus;
  projectId?: string;
  assignedComputerId?: string;
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
  assignedComputerId?: string | null;
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

// ─── REST API: Errors ─────────────────────────────────────────

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

// ─── WebSocket: Events ────────────────────────────────────────

// Connection
export interface WsConnectedEvent {
  type: 'connected';
  deviceId: string;
  connectedDevices: number;
}

// Heartbeat
export interface WsHeartbeatPing {
  type: 'ping';
  timestamp: string;
}

export interface WsHeartbeatPong {
  type: 'pong';
  timestamp: string;
}

// Task Events (Hub → Device)
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

// Device Events (Hub → Device)
export interface WsDeviceOnlineEvent {
  type: 'device:online';
  device: Device;
}

export interface WsDeviceOfflineEvent {
  type: 'device:offline';
  deviceId: string;
  lastSeen: string;
}

// Workspace Events (Hub → Device)
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

// Project Events (Hub → Device)
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

/** @deprecated Use WsDeviceOnlineEvent instead */
export interface WsComputerOnlineEvent {
  type: 'computer:online';
  computer: Computer;
}

/** @deprecated Use WsDeviceOfflineEvent instead */
export interface WsComputerOfflineEvent {
  type: 'computer:offline';
  computerId: string;
  lastSeen: string;
}

// Execution Commands (Hub → Assigned Computer)
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

// Execution Acknowledgments (Device → Hub)
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

// Errors
export interface WsErrorEvent {
  type: 'error';
  code: string;
  message: string;
  relatedTo?: string;
}

// ─── Union Types ──────────────────────────────────────────────

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
  | WsErrorEvent
  // Deprecated
  | WsComputerOnlineEvent
  | WsComputerOfflineEvent;

export type WsEventFromDevice = WsHeartbeatPing | WsExecutionStartedEvent | WsExecutionAckEvent;

export type WsEvent = WsEventFromHub | WsEventFromDevice;

// ─── Type Guards ──────────────────────────────────────────────

export function isWsTaskEvent(
  event: WsEvent,
): event is
  | WsTaskCreatedEvent
  | WsTaskUpdatedEvent
  | WsTaskDeletedEvent
  | WsTaskProgressEvent
  | WsTaskCompletedEvent {
  return event.type.startsWith('task:');
}

export function isWsDeviceEvent(
  event: WsEvent,
): event is WsDeviceOnlineEvent | WsDeviceOfflineEvent {
  return event.type.startsWith('device:');
}

export function isWsWorkspaceEvent(
  event: WsEvent,
): event is WsWorkspaceCreatedEvent | WsWorkspaceUpdatedEvent | WsWorkspaceDeletedEvent {
  return event.type.startsWith('workspace:');
}

export function isWsProjectEvent(
  event: WsEvent,
): event is WsProjectCreatedEvent | WsProjectUpdatedEvent | WsProjectDeletedEvent {
  return event.type.startsWith('project:');
}

/** @deprecated Use isWsDeviceEvent instead */
export function isWsComputerEvent(
  event: WsEvent,
): event is WsComputerOnlineEvent | WsComputerOfflineEvent {
  return event.type.startsWith('computer:');
}

export function isWsCommandEvent(
  event: WsEvent,
): event is WsExecuteCommandEvent | WsCancelCommandEvent {
  return event.type.startsWith('command:');
}

export function isWsExecutionEvent(
  event: WsEvent,
): event is WsExecutionStartedEvent | WsExecutionAckEvent {
  return event.type.startsWith('execution:');
}

// ─── Status Transition Validation ─────────────────────────────

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['queued', 'running'],
  queued: ['backlog', 'running'],
  running: ['paused', 'done', 'error', 'review'],
  paused: ['running', 'queued'],
  review: ['done', 'error'],
  done: [], // Terminal state
  error: ['queued', 'backlog'],
};

export function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true; // No-op is always valid
  return VALID_TRANSITIONS[from].includes(to);
}

export function getValidNextStatuses(current: TaskStatus): TaskStatus[] {
  return VALID_TRANSITIONS[current];
}
