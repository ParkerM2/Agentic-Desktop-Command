/**
 * Hub <-> Device Communication Protocol Types
 *
 * THIS FILE IS A THIN RE-EXPORT.
 * All types have been split into domain-specific files under ./hub/
 *
 * @see ./hub/enums.ts — TaskStatus, TaskPriority, DeviceType, RepoStructure
 * @see ./hub/auth.ts — User, Auth requests/responses
 * @see ./hub/devices.ts — Device, DeviceCapabilities, Device requests
 * @see ./hub/workspaces.ts — Workspace, Workspace requests
 * @see ./hub/projects.ts — Project, SubProject, Project requests
 * @see ./hub/tasks.ts — Task, TaskProgress, Task requests/responses
 * @see ./hub/events.ts — WebSocket event types, WsEvent unions
 * @see ./hub/errors.ts — ApiError, ApiErrorCode
 * @see ./hub/guards.ts — Type guard functions
 * @see ./hub/transitions.ts — Status transition validation
 * @see ./hub/legacy.ts — Deprecated compatibility types
 */

export type {
  // Enums
  TaskStatus,
  TaskPriority,
  DeviceType,
  RepoStructure,
  // Auth
  User,
  AuthRegisterRequest,
  AuthLoginRequest,
  AuthResponse,
  AuthRefreshRequest,
  AuthRefreshResponse,
  // Devices
  DeviceCapabilities,
  Device,
  DeviceRegisterRequest,
  DeviceUpdateRequest,
  DeviceListResponse,
  // Workspaces
  WorkspaceSettings,
  Workspace,
  WorkspaceCreateRequest,
  WorkspaceUpdateRequest,
  WorkspaceListResponse,
  // Projects
  Project,
  SubProject,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  SubProjectCreateRequest,
  // Tasks
  TaskProgress,
  Task,
  TaskCreateRequest,
  TaskListQuery,
  TaskListResponse,
  TaskUpdateRequest,
  TaskExecuteResponse,
  TaskCancelResponse,
  ProgressPushRequest,
  ProgressPushResponse,
  TaskCompleteRequest,
  DeleteResponse,
  // Errors
  ApiError,
  ApiErrorCode,
  // WebSocket events
  WsConnectedEvent,
  WsHeartbeatPing,
  WsHeartbeatPong,
  WsTaskCreatedEvent,
  WsTaskUpdatedEvent,
  WsTaskDeletedEvent,
  WsTaskProgressEvent,
  WsTaskCompletedEvent,
  WsDeviceOnlineEvent,
  WsDeviceOfflineEvent,
  WsWorkspaceCreatedEvent,
  WsWorkspaceUpdatedEvent,
  WsWorkspaceDeletedEvent,
  WsProjectCreatedEvent,
  WsProjectUpdatedEvent,
  WsProjectDeletedEvent,
  WsExecuteCommandEvent,
  WsCancelCommandEvent,
  WsExecutionStartedEvent,
  WsExecutionAckEvent,
  WsErrorEvent,
  WsEventFromHub,
  WsEventFromDevice,
  WsEvent,
} from './hub';

/* eslint-disable @typescript-eslint/no-deprecated -- re-export deprecated types for backward compatibility */
export type {
  ComputerCapabilities,
  Computer,
  DeviceAuthRequest,
  DeviceAuthResponse,
  ComputerUpdateRequest,
  ComputerListResponse,
  WsComputerOnlineEvent,
  WsComputerOfflineEvent,
} from './hub';
export { isWsComputerEvent } from './hub';
/* eslint-enable @typescript-eslint/no-deprecated */

export {
  // Guards
  isWsTaskEvent,
  isWsDeviceEvent,
  isWsWorkspaceEvent,
  isWsProjectEvent,
  isWsCommandEvent,
  isWsExecutionEvent,
  // Transitions
  isValidStatusTransition,
  getValidNextStatuses,
} from './hub';
