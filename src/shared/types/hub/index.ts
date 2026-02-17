/**
 * Hub Protocol — Barrel Export
 *
 * Re-exports all hub domain types from their respective files.
 * Import from here or from '@shared/types/hub-protocol'.
 */

// Enums & literals
export type { DeviceType, RepoStructure, TaskPriority, TaskStatus } from './enums';

// Auth & users
export type {
  AuthLoginRequest,
  AuthRefreshRequest,
  AuthRefreshResponse,
  AuthRegisterRequest,
  AuthResponse,
  User,
} from './auth';

// Devices
export type {
  Device,
  DeviceCapabilities,
  DeviceListResponse,
  DeviceRegisterRequest,
  DeviceUpdateRequest,
} from './devices';

// Workspaces
export type {
  Workspace,
  WorkspaceCreateRequest,
  WorkspaceListResponse,
  WorkspaceSettings,
  WorkspaceUpdateRequest,
} from './workspaces';

// Projects
export type {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  SubProject,
  SubProjectCreateRequest,
} from './projects';

// Tasks
export type {
  DeleteResponse,
  ProgressPushRequest,
  ProgressPushResponse,
  Task,
  TaskCancelResponse,
  TaskCompleteRequest,
  TaskCreateRequest,
  TaskExecuteResponse,
  TaskListQuery,
  TaskListResponse,
  TaskProgress,
  TaskUpdateRequest,
} from './tasks';

// WebSocket events
export type {
  WsCancelCommandEvent,
  WsConnectedEvent,
  WsDeviceOfflineEvent,
  WsDeviceOnlineEvent,
  WsErrorEvent,
  WsEvent,
  WsEventFromDevice,
  WsEventFromHub,
  WsExecuteCommandEvent,
  WsExecutionAckEvent,
  WsExecutionStartedEvent,
  WsHeartbeatPing,
  WsHeartbeatPong,
  WsProjectCreatedEvent,
  WsProjectDeletedEvent,
  WsProjectUpdatedEvent,
  WsTaskCompletedEvent,
  WsTaskCreatedEvent,
  WsTaskDeletedEvent,
  WsTaskProgressEvent,
  WsTaskUpdatedEvent,
  WsWorkspaceCreatedEvent,
  WsWorkspaceDeletedEvent,
  WsWorkspaceUpdatedEvent,
} from './events';

// API errors
export type { ApiError, ApiErrorCode } from './errors';

// Type guards
export {
  isWsCommandEvent,
  isWsDeviceEvent,
  isWsExecutionEvent,
  isWsProjectEvent,
  isWsTaskEvent,
  isWsWorkspaceEvent,
} from './guards';

// Status transitions
export { getValidNextStatuses, isValidStatusTransition } from './transitions';

/* eslint-disable @typescript-eslint/no-deprecated -- barrel must re-export deprecated types */
export type {
  Computer,
  ComputerCapabilities,
  ComputerListResponse,
  ComputerUpdateRequest,
  DeviceAuthRequest,
  DeviceAuthResponse,
  WsComputerOfflineEvent,
  WsComputerOnlineEvent,
} from './legacy';
export { isWsComputerEvent } from './legacy';
/* eslint-enable @typescript-eslint/no-deprecated */
