# Hub ↔ Device Communication Protocol

**Version**: 1.1.0
**Status**: DRAFT — PENDING MAJOR UPDATE
**Last Updated**: 2026-02-14
**Updated By**: Claude + Parker

> **⚠️ MAJOR UPDATE REQUIRED**: This protocol is being expanded to support:
> - **User Authentication** (register, login, sessions)
> - **Workspaces** (replaces "Computers" as logical execution environments)
> - **Devices** (physical machines, separate from workspaces)
> - **Projects** (with multi-repo support)
> - **Sub-Projects** (child repos in multi-repo structures)
>
> See `docs/plans/2026-02-14-workspace-project-management.md` for the new data model.
> The sections below will be updated to reflect this new architecture.

> **ENFORCEMENT**: This document is the source of truth. All Hub routes and client calls MUST match this spec exactly. Run `npm run validate:protocol` to verify compliance.

---

## Overview

```
┌─────────────┐                              ┌─────────────┐
│   DEVICE    │                              │     HUB     │
│  (Desktop/  │◄────── WebSocket ──────────►│   (Server)  │
│   Mobile)   │◄────── REST API ───────────►│             │
└─────────────┘                              └─────────────┘
```

**Transport Layers:**
- **REST API**: CRUD operations, authentication, initial data fetch
- **WebSocket**: Real-time events, broadcasts, heartbeats

---

## Table of Contents

1. [Authentication](#1-authentication) — **UPDATE: Add user auth (register, login)**
2. [Devices](#2-devices) — **NEW: Physical device management**
3. [Workspaces](#3-workspaces) — **NEW: Replaces "Computers"**
4. [Projects](#4-projects) — **NEW: With multi-repo support**
5. [Tasks](#5-tasks) — **UPDATE: Add workspace_id, sub_project_id**
6. [Progress Updates](#6-progress-updates)
7. [WebSocket Events](#7-websocket-events) — **UPDATE: New event types**
8. [Error Handling](#8-error-handling)

---

## New Endpoints Summary (To Be Implemented)

### Authentication
```
POST   /api/auth/register          # Create user account
POST   /api/auth/login             # Login, returns JWT
POST   /api/auth/logout            # Invalidate session
POST   /api/auth/refresh           # Refresh JWT
GET    /api/auth/me                # Get current user
```

### Devices
```
POST   /api/devices                # Register device
GET    /api/devices                # List user's devices
PATCH  /api/devices/:id            # Update device
DELETE /api/devices/:id            # Remove device
```

### Workspaces
```
GET    /api/workspaces             # List user's workspaces
POST   /api/workspaces             # Create workspace
GET    /api/workspaces/:id         # Get workspace
PATCH  /api/workspaces/:id         # Update workspace (incl. rename)
DELETE /api/workspaces/:id         # Delete workspace
POST   /api/workspaces/:id/host    # Change host device
```

### Projects
```
GET    /api/workspaces/:wid/projects    # List projects in workspace
POST   /api/workspaces/:wid/projects    # Create project
POST   /api/projects/detect             # Detect repo type from path
GET    /api/projects/:id                # Get project
PATCH  /api/projects/:id                # Update project
DELETE /api/projects/:id                # Delete project
```

### Sub-Projects
```
GET    /api/projects/:id/sub-projects        # List sub-projects
POST   /api/projects/:id/sub-projects        # Add sub-project
DELETE /api/projects/:pid/sub-projects/:sid  # Remove sub-project
```

### Tasks (Updated)
```
# Same CRUD endpoints, but with:
# - workspace_id in task body
# - optional sub_project_id for multi-repo targeting
```

---

## 1. Authentication

### 1.1 Device → Hub: Register/Login

```
POST /api/auth/device
```

**Request:**
```typescript
interface DeviceAuthRequest {
  machineId: string;      // UUID generated on first run, stored locally
  machineName: string;    // User-friendly name: "Work Laptop"
  deviceType: 'desktop' | 'mobile' | 'web';
  capabilities: {
    canExecute: boolean;  // Has Claude CLI installed
    repos: string[];      // List of repo paths (desktop only)
  };
  appVersion: string;     // "1.2.3"
}
```

**Response:**
```typescript
interface DeviceAuthResponse {
  deviceId: string;       // Hub-assigned ID
  token: string;          // JWT for subsequent requests
  expiresAt: string;      // ISO timestamp
  hubVersion: string;     // Hub server version
}
```

**Errors:**
| Code | Meaning |
|------|---------|
| 400 | Invalid request body |
| 409 | Machine already registered with different name |

---

## 2. Computer Registration

### 2.1 Device → Hub: Update Capabilities

```
PATCH /api/computers/:deviceId
Authorization: Bearer <token>
```

**Request:**
```typescript
interface ComputerUpdateRequest {
  machineName?: string;
  capabilities?: {
    canExecute?: boolean;
    repos?: string[];
  };
  isOnline?: boolean;
}
```

**Response:**
```typescript
interface Computer {
  id: string;
  machineId: string;
  machineName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  capabilities: {
    canExecute: boolean;
    repos: string[];
  };
  isOnline: boolean;
  lastSeen: string;       // ISO timestamp
  createdAt: string;
}
```

### 2.2 Hub → Device: Computer List

```
GET /api/computers
Authorization: Bearer <token>
```

**Response:**
```typescript
interface ComputerListResponse {
  computers: Computer[];
}
```

---

## 3. Tasks

### 3.1 Device → Hub: Create Task

```
POST /api/tasks
Authorization: Bearer <token>
```

**Request:**
```typescript
interface TaskCreateRequest {
  title: string;
  description: string;
  projectId: string;            // Which project/repo
  assignedComputerId?: string;  // Target execution machine (null = unassigned)
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}
```

**Response:**
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  assignedComputerId: string | null;
  createdByDeviceId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  executionSessionId: string | null;
  progress: TaskProgress | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type TaskStatus =
  | 'backlog'       // Not started, not queued
  | 'queued'        // Ready to execute
  | 'running'       // Currently executing
  | 'paused'        // Execution paused
  | 'review'        // Awaiting human review
  | 'done'          // Completed successfully
  | 'error';        // Failed

interface TaskProgress {
  phase: string;              // Current phase name
  phaseIndex: number;         // 0-based
  totalPhases: number;
  currentAgent: string | null;
  filesChanged: number;
  lastActivity: string;       // ISO timestamp
  logs: string[];             // Recent log lines (last 20)
}
```

### 3.2 Device → Hub: List Tasks

```
GET /api/tasks
Authorization: Bearer <token>
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | TaskStatus | Filter by status |
| projectId | string | Filter by project |
| assignedComputerId | string | Filter by assigned computer |
| createdAfter | ISO date | Created after timestamp |
| updatedAfter | ISO date | Updated after timestamp |
| limit | number | Max results (default 100) |
| offset | number | Pagination offset |

**Response:**
```typescript
interface TaskListResponse {
  tasks: Task[];
  total: number;
  limit: number;
  offset: number;
}
```

### 3.3 Device → Hub: Get Single Task

```
GET /api/tasks/:taskId
Authorization: Bearer <token>
```

**Response:** `Task`

### 3.4 Device → Hub: Update Task

```
PATCH /api/tasks/:taskId
Authorization: Bearer <token>
```

**Request:**
```typescript
interface TaskUpdateRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignedComputerId?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}
```

**Response:** `Task`

**Errors:**
| Code | Meaning |
|------|---------|
| 400 | Invalid status transition |
| 403 | Cannot modify task owned by another device |
| 404 | Task not found |

### 3.5 Device → Hub: Delete Task

```
DELETE /api/tasks/:taskId
Authorization: Bearer <token>
```

**Response:**
```typescript
interface DeleteResponse {
  success: boolean;
}
```

### 3.6 Device → Hub: Start Task Execution

```
POST /api/tasks/:taskId/execute
Authorization: Bearer <token>
```

**Request:**
```typescript
interface TaskExecuteRequest {
  // Empty - execution happens on the assigned computer
}
```

**Response:**
```typescript
interface TaskExecuteResponse {
  sessionId: string;          // Execution session ID
  status: 'started' | 'queued';
}
```

**Preconditions:**
- Task must be in `backlog` or `queued` status
- Requesting device must be the `assignedComputerId`
- Device must have `canExecute: true`

### 3.7 Device → Hub: Cancel Task Execution

```
POST /api/tasks/:taskId/cancel
Authorization: Bearer <token>
```

**Response:**
```typescript
interface TaskCancelResponse {
  success: boolean;
  previousStatus: TaskStatus;
}
```

---

## 4. Progress Updates

### 4.1 Device → Hub: Push Progress

```
POST /api/tasks/:taskId/progress
Authorization: Bearer <token>
```

**Request:**
```typescript
interface ProgressPushRequest {
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  currentAgent: string | null;
  filesChanged: number;
  logLines: string[];         // New log lines to append
  status?: TaskStatus;        // Optionally update status
}
```

**Response:**
```typescript
interface ProgressPushResponse {
  received: boolean;
  taskId: string;
  broadcastedTo: number;      // Number of connected devices notified
}
```

### 4.2 Device → Hub: Mark Task Complete

```
POST /api/tasks/:taskId/complete
Authorization: Bearer <token>
```

**Request:**
```typescript
interface TaskCompleteRequest {
  result: 'success' | 'error';
  prUrl?: string;             // If PR was created
  errorMessage?: string;      // If result is 'error'
  summary?: string;           // Completion summary
}
```

**Response:** `Task` (with updated status)

---

## 5. WebSocket Events

### 5.1 Connection

```
WS /ws?token=<jwt>
```

**On Connect - Hub sends:**
```typescript
interface WsConnectedEvent {
  type: 'connected';
  deviceId: string;
  connectedDevices: number;
}
```

### 5.2 Heartbeat (Both Directions)

**Device → Hub (every 30s):**
```typescript
interface WsHeartbeatPing {
  type: 'ping';
  timestamp: string;
}
```

**Hub → Device:**
```typescript
interface WsHeartbeatPong {
  type: 'pong';
  timestamp: string;
}
```

### 5.3 Hub → Device: Task Events

**Task Created:**
```typescript
interface WsTaskCreatedEvent {
  type: 'task:created';
  task: Task;
  createdByDeviceId: string;
}
```

**Task Updated:**
```typescript
interface WsTaskUpdatedEvent {
  type: 'task:updated';
  taskId: string;
  changes: Partial<Task>;
  updatedByDeviceId: string;
}
```

**Task Deleted:**
```typescript
interface WsTaskDeletedEvent {
  type: 'task:deleted';
  taskId: string;
  deletedByDeviceId: string;
}
```

**Task Progress:**
```typescript
interface WsTaskProgressEvent {
  type: 'task:progress';
  taskId: string;
  progress: TaskProgress;
}
```

**Task Completed:**
```typescript
interface WsTaskCompletedEvent {
  type: 'task:completed';
  taskId: string;
  result: 'success' | 'error';
  prUrl?: string;
  summary?: string;
}
```

### 5.4 Hub → Device: Computer Events

**Computer Online:**
```typescript
interface WsComputerOnlineEvent {
  type: 'computer:online';
  computer: Computer;
}
```

**Computer Offline:**
```typescript
interface WsComputerOfflineEvent {
  type: 'computer:offline';
  computerId: string;
  lastSeen: string;
}
```

### 5.5 Hub → Device: Execution Commands

**Start Execution (sent to assigned computer only):**
```typescript
interface WsExecuteCommandEvent {
  type: 'command:execute';
  taskId: string;
  task: Task;
}
```

**Cancel Execution (sent to executing computer only):**
```typescript
interface WsCancelCommandEvent {
  type: 'command:cancel';
  taskId: string;
  reason?: string;
}
```

### 5.6 Device → Hub: Acknowledgments

**Execution Started:**
```typescript
interface WsExecutionStartedEvent {
  type: 'execution:started';
  taskId: string;
  sessionId: string;
  pid?: number;
}
```

**Execution Acknowledged:**
```typescript
interface WsExecutionAckEvent {
  type: 'execution:ack';
  taskId: string;
  action: 'started' | 'cancelled' | 'failed';
  error?: string;
}
```

---

## 6. Error Handling

### 6.1 REST API Errors

All errors follow this format:

```typescript
interface ApiError {
  error: {
    code: string;           // Machine-readable: "TASK_NOT_FOUND"
    message: string;        // Human-readable: "Task with ID xyz not found"
    details?: unknown;      // Additional context
  };
}
```

**Standard Error Codes:**

| HTTP | Code | Description |
|------|------|-------------|
| 400 | INVALID_REQUEST | Malformed request body |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Action not allowed for this device |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | State conflict (e.g., task already running) |
| 422 | INVALID_TRANSITION | Invalid status transition |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### 6.2 WebSocket Errors

```typescript
interface WsErrorEvent {
  type: 'error';
  code: string;
  message: string;
  relatedTo?: string;       // taskId, computerId, etc.
}
```

---

## 7. Type Definitions (Shared)

These types MUST be kept in `src/shared/types/hub-protocol.ts` and imported by both Hub and clients.

```typescript
// ─── Core Types ───────────────────────────────────────────

export type TaskStatus =
  | 'backlog'
  | 'queued'
  | 'running'
  | 'paused'
  | 'review'
  | 'done'
  | 'error';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type DeviceType = 'desktop' | 'mobile' | 'web';

// ─── Entities ─────────────────────────────────────────────

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

export interface ComputerCapabilities {
  canExecute: boolean;
  repos: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  assignedComputerId: string | null;
  createdByDeviceId: string;
  priority: TaskPriority;
  executionSessionId: string | null;
  progress: TaskProgress | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

// ─── WebSocket Event Union ────────────────────────────────

export type WsEvent =
  | WsConnectedEvent
  | WsHeartbeatPing
  | WsHeartbeatPong
  | WsTaskCreatedEvent
  | WsTaskUpdatedEvent
  | WsTaskDeletedEvent
  | WsTaskProgressEvent
  | WsTaskCompletedEvent
  | WsComputerOnlineEvent
  | WsComputerOfflineEvent
  | WsExecuteCommandEvent
  | WsCancelCommandEvent
  | WsExecutionStartedEvent
  | WsExecutionAckEvent
  | WsErrorEvent;

// Full interface definitions in src/shared/types/hub-protocol.ts
```

---

## 8. State Machine: Task Status Transitions

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│ backlog │───▶│ queued  │───▶│ running │───▶│  done   │ │
└─────────┘    └─────────┘    └─────────┘    └─────────┘ │
     │              │              │                      │
     │              │              ├─────────────────────►│
     │              │              │                      │
     │              │              ▼                      │
     │              │         ┌─────────┐                 │
     │              │         │ paused  │─────────────────┤
     │              │         └─────────┘                 │
     │              │              │                      │
     │              │              ▼                      │
     │              │         ┌─────────┐    ┌─────────┐  │
     │              └────────▶│  error  │◄───│ review  │◄─┘
     │                        └─────────┘    └─────────┘
     │                             ▲              ▲
     └─────────────────────────────┴──────────────┘
```

**Valid Transitions:**

| From | To | Trigger |
|------|----|---------|
| backlog | queued | User queues task |
| backlog | running | Direct execute |
| queued | running | Execution starts |
| queued | backlog | User moves back |
| running | paused | User pauses |
| running | done | Execution completes successfully |
| running | error | Execution fails |
| running | review | Execution needs human review |
| paused | running | User resumes |
| paused | queued | User re-queues |
| review | done | Human approves |
| review | error | Human rejects |
| error | queued | User retries |
| error | backlog | User moves back |

---

## 9. Enforcement

### 9.1 Validation Script

Create `scripts/validate-protocol.ts`:

```typescript
// Validates that:
// 1. Hub routes match this spec
// 2. Client API calls match this spec
// 3. WebSocket handlers match event types
// 4. Type definitions are in sync
```

### 9.2 Pre-Commit Hook

Add to `.husky/pre-commit`:

```bash
npm run validate:protocol
```

### 9.3 CI Check

Add to GitHub Actions:

```yaml
- name: Validate Hub Protocol
  run: npm run validate:protocol
```

---

## 10. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-13 | Initial draft |

---

## Appendix: Sequence Diagrams

### A.1 Task Creation from Mobile

```
Mobile              Hub                 Desktop
  │                  │                     │
  │──POST /tasks────▶│                     │
  │◄─────Task────────│                     │
  │                  │──WS task:created───▶│
  │                  │                     │
```

### A.2 Task Execution

```
Mobile              Hub                 Desktop
  │                  │                     │
  │─POST execute────▶│                     │
  │◄───queued────────│                     │
  │                  │──WS command:execute▶│
  │                  │                     │──spawn claude
  │                  │◄─WS execution:started│
  │◄─WS task:updated─│                     │
  │                  │                     │
  │                  │◄─POST /progress─────│ (periodic)
  │◄─WS task:progress│                     │
  │                  │                     │
  │                  │◄─POST /complete─────│
  │◄─WS task:complete│                     │
```

### A.3 Computer Goes Offline

```
Desktop             Hub                 Mobile
  │                  │                     │
  │──(disconnect)───▶│                     │
  │                  │──WS computer:offline▶│
  │                  │                     │
  │                  │  (30s timeout)      │
  │                  │──mark offline───────│
```
