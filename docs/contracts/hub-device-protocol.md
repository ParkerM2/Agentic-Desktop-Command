# Hub ↔ Device Communication Protocol

**Version**: 2.0.0
**Status**: IMPLEMENTED
**Last Updated**: 2026-02-14
**Updated By**: Team Alpha (Claude)

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

1. [Authentication](#1-authentication)
2. [Devices](#2-devices)
3. [Workspaces](#3-workspaces)
4. [Projects](#4-projects)
5. [Sub-Projects](#5-sub-projects)
6. [Tasks](#6-tasks)
7. [Progress Updates](#7-progress-updates)
8. [WebSocket Events](#8-websocket-events)
9. [Error Handling](#9-error-handling)

---

## 1. Authentication

All auth endpoints use JWT tokens. Access tokens expire in 15 minutes. Refresh tokens expire in 7 days.

### 1.1 Register

```
POST /api/auth/register
```

**Request:**
```typescript
interface AuthRegisterRequest {
  email: string;
  password: string;           // Min 8 characters
  displayName: string;
}
```

**Response:**
```typescript
interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;          // ISO timestamp
}

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
  lastLoginAt: string | null;
}
```

**Errors:**
| Code | Meaning |
|------|---------|
| 400 | Invalid request body |
| 409 | Email already registered |

### 1.2 Login

```
POST /api/auth/login
```

**Request:**
```typescript
interface AuthLoginRequest {
  email: string;
  password: string;
  device?: {                  // Optional: register device on login
    machineId: string;
    deviceType: 'desktop' | 'mobile' | 'web';
    deviceName: string;
    capabilities: DeviceCapabilities;
    appVersion?: string;
  };
}
```

**Response:** `AuthResponse` (same as register)

**Errors:**
| Code | Meaning |
|------|---------|
| 400 | Invalid request body |
| 401 | Invalid email or password |

### 1.3 Logout

```
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ success: true }
```

### 1.4 Refresh Token

```
POST /api/auth/refresh
```

**Request:**
```typescript
interface AuthRefreshRequest {
  refreshToken: string;
}
```

**Response:**
```typescript
interface AuthRefreshResponse {
  accessToken: string;
  expiresAt: string;
}
```

**Errors:**
| Code | Meaning |
|------|---------|
| 400 | Invalid request body |
| 401 | Invalid or expired refresh token |

### 1.5 Get Current User

```
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**Response:** `User`

---

## 2. Devices

Physical machines that can connect to the Hub. Desktops can execute tasks.

### 2.1 Register Device

```
POST /api/devices
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface DeviceRegisterRequest {
  machineId?: string;         // UUID generated on first run
  deviceType: 'desktop' | 'mobile' | 'web';
  deviceName: string;
  capabilities: DeviceCapabilities;
  appVersion?: string;
}

interface DeviceCapabilities {
  canExecute: boolean;        // Has Claude CLI installed
  repos: string[];            // List of repo paths (desktop only)
}
```

**Response:**
```typescript
interface Device {
  id: string;
  machineId: string | null;
  userId: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  deviceName: string;
  capabilities: DeviceCapabilities;
  isOnline: boolean;
  lastSeen: string | null;
  appVersion: string | null;
  createdAt: string;
}
```

### 2.2 List Devices

```
GET /api/devices
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ devices: Device[] }
```

### 2.3 Get Device

```
GET /api/devices/:id
Authorization: Bearer <accessToken>
```

**Response:** `Device`

### 2.4 Update Device

```
PATCH /api/devices/:id
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface DeviceUpdateRequest {
  deviceName?: string;
  capabilities?: Partial<DeviceCapabilities>;
  appVersion?: string;
}
```

**Response:** `Device`

### 2.5 Delete Device

```
DELETE /api/devices/:id
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ success: true }
```

### 2.6 Device Heartbeat

```
POST /api/devices/:id/heartbeat
Authorization: Bearer <accessToken>
```

Updates `isOnline` to true and `lastSeen` to current timestamp.

**Response:** `Device`

---

## 3. Workspaces

Logical execution environments. Each workspace has a host device responsible for execution.

### 3.1 List Workspaces

```
GET /api/workspaces
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ workspaces: Workspace[] }

interface Workspace {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  hostDeviceId: string | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Create Workspace

```
POST /api/workspaces
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface WorkspaceCreateRequest {
  name: string;
  description?: string;
  hostDeviceId?: string;      // Must be a desktop device
  settings?: Record<string, unknown>;
}
```

**Response:** `Workspace`

### 3.3 Get Workspace

```
GET /api/workspaces/:id
Authorization: Bearer <accessToken>
```

**Response:** `Workspace`

### 3.4 Update Workspace

```
PATCH /api/workspaces/:id
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface WorkspaceUpdateRequest {
  name?: string;
  description?: string;
  settings?: Record<string, unknown>;
}
```

**Response:** `Workspace`

### 3.5 Delete Workspace

```
DELETE /api/workspaces/:id
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ success: true }
```

### 3.6 Change Host Device

```
POST /api/workspaces/:id/host
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface WorkspaceHostRequest {
  hostDeviceId: string | null;  // Must be a desktop device, or null to clear
}
```

**Response:** `Workspace`

**Errors:**
| Code | Meaning |
|------|---------|
| 400 | Device not found or not a desktop |
| 404 | Workspace not found |

---

## 4. Projects

Projects belong to workspaces. Support single repo, monorepo, or multi-repo structures.

### 4.1 List Projects in Workspace

```
GET /api/workspaces/:wid/projects
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ projects: Project[] }

interface Project {
  id: string;
  name: string;
  path: string;
  workspaceId: string | null;
  gitUrl: string | null;
  repoStructure: 'single' | 'monorepo' | 'multi-repo';
  defaultBranch: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Create Project in Workspace

```
POST /api/workspaces/:wid/projects
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface ProjectCreateRequest {
  name: string;
  path: string;
  gitUrl?: string;
  repoStructure?: 'single' | 'monorepo' | 'multi-repo';
  defaultBranch?: string;
  description?: string;
  subProjects?: SubProjectCreateRequest[];  // For multi-repo
}

interface SubProjectCreateRequest {
  name: string;
  relativePath: string;
  gitUrl?: string;
  defaultBranch?: string;
}
```

**Response:** `Project`

### 4.3 Get Project

```
GET /api/projects/:id
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
interface ProjectWithSubProjects extends Project {
  subProjects: SubProject[];
}
```

### 4.4 Update Project

```
PATCH /api/projects/:id
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface ProjectUpdateRequest {
  name?: string;
  path?: string;
  gitUrl?: string;
  repoStructure?: 'single' | 'monorepo' | 'multi-repo';
  defaultBranch?: string;
  description?: string;
}
```

**Response:** `Project`

### 4.5 Delete Project

```
DELETE /api/projects/:id
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ success: true }
```

---

## 5. Sub-Projects

Child repositories within a multi-repo project.

### 5.1 List Sub-Projects

```
GET /api/projects/:id/sub-projects
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ subProjects: SubProject[] }

interface SubProject {
  id: string;
  projectId: string;
  name: string;
  relativePath: string;
  gitUrl: string | null;
  defaultBranch: string | null;
  createdAt: string;
}
```

### 5.2 Add Sub-Project

```
POST /api/projects/:id/sub-projects
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface SubProjectCreateRequest {
  name: string;
  relativePath: string;
  gitUrl?: string;
  defaultBranch?: string;
}
```

**Response:** `SubProject`

### 5.3 Delete Sub-Project

```
DELETE /api/projects/:pid/sub-projects/:sid
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ success: true }
```

---

## 6. Tasks

Tasks support workspace and sub-project targeting for multi-device, multi-repo execution.

### 6.1 List Tasks

```
GET /api/tasks
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| workspace_id | string | Filter by workspace |
| project_id | string | Filter by project |
| status | TaskStatus | Filter by status |
| limit | number | Max results (default 100) |
| offset | number | Pagination offset |

**Response:**
```typescript
{ tasks: Task[] }

interface Task {
  id: string;
  projectId: string;
  workspaceId: string | null;
  subProjectId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  assignedDeviceId: string | null;
  createdByDeviceId: string | null;
  executionSessionId: string | null;
  progress: TaskProgress | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

type TaskStatus =
  | 'backlog'
  | 'queued'
  | 'running'
  | 'paused'
  | 'review'
  | 'done'
  | 'error';

interface TaskProgress {
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  currentAgent: string | null;
  filesChanged: number;
  lastActivity: string;
  logs: string[];
}
```

### 6.2 Create Task

```
POST /api/tasks
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface TaskCreateRequest {
  projectId: string;
  workspaceId?: string;
  subProjectId?: string;
  title: string;
  description: string;
  status?: TaskStatus;
  priority?: number;
  assignedDeviceId?: string;
  metadata?: Record<string, unknown>;
}
```

**Response:** `Task`

### 6.3 Get Task

```
GET /api/tasks/:id
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
interface TaskWithSubtasks extends Task {
  subtasks: Subtask[];
}

interface Subtask {
  id: string;
  taskId: string;
  title: string;
  description: string;
  status: string;
  sortOrder: number;
}
```

### 6.4 Update Task

```
PUT /api/tasks/:id
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface TaskUpdateRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  workspaceId?: string;
  subProjectId?: string;
  assignedDeviceId?: string | null;
  metadata?: Record<string, unknown>;
}
```

**Response:** `Task`

### 6.5 Delete Task

```
DELETE /api/tasks/:id
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{ success: true }
```

### 6.6 Update Task Status

```
PATCH /api/tasks/:id/status
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
{ status: TaskStatus }
```

**Response:** `Task`

---

## 7. Progress Updates

### 7.1 Push Progress

```
POST /api/tasks/:id/progress
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface ProgressPushRequest {
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  currentAgent?: string;
  filesChanged?: number;
  logLines?: string[];
}
```

**Response:**
```typescript
{
  received: true;
  taskId: string;
}
```

Broadcasts `task:progress` WebSocket event to all connected clients.

### 7.2 Mark Task Complete

```
POST /api/tasks/:id/complete
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface TaskCompleteRequest {
  result: 'success' | 'error';
  prUrl?: string;
  errorMessage?: string;
  summary?: string;
}
```

**Response:** `Task` (with status updated to `done` or `error`)

Broadcasts `task:completed` WebSocket event.

### 7.3 Request Task Execution

```
POST /api/tasks/:id/execute
Authorization: Bearer <accessToken>
```

Requests execution of a task. The workspace's host device must be online.

**Response:**
```typescript
{
  queued: true;
  taskId: string;
  hostDeviceId: string;
}
```

**Errors:**
| Code | Meaning |
|------|---------|
| 400 | Task not in workspace |
| 400 | No host device assigned to workspace |
| 400 | Host device is offline |
| 404 | Task not found |

Broadcasts `command:execute` WebSocket event to the host device.

### 7.4 Cancel Task Execution

```
POST /api/tasks/:id/cancel
Authorization: Bearer <accessToken>
```

**Response:**
```typescript
{
  cancelled: true;
  taskId: string;
}
```

Broadcasts `command:cancel` WebSocket event.

---

## 8. WebSocket Events

### 8.1 Connection

```
WS /ws
```

**First Message (Authentication):**
```typescript
{
  type: 'auth';
  apiKey: string;     // API key for authentication
}
```

**Close Codes:**
| Code | Meaning |
|------|---------|
| 4001 | Invalid API key |
| 4002 | Auth timeout (5 seconds) |

### 8.2 Event Format

All events follow this structure:

```typescript
interface WsBroadcastMessage {
  type: 'mutation';
  entity: string;               // 'tasks', 'devices', 'workspaces', etc.
  action: 'created' | 'updated' | 'deleted' | 'progress' | 'completed' | 'execute' | 'cancel';
  id: string;                   // Entity ID
  data: unknown;                // Entity data or event payload
  timestamp: string;            // ISO timestamp
}
```

### 8.3 Task Events

| Entity | Action | When |
|--------|--------|------|
| tasks | created | Task created |
| tasks | updated | Task updated |
| tasks | deleted | Task deleted |
| tasks | progress | Progress pushed |
| tasks | completed | Task marked complete |
| tasks | execute | Execution requested (command:execute) |
| tasks | cancel | Execution cancelled (command:cancel) |

### 8.4 Device Events

| Entity | Action | When |
|--------|--------|------|
| devices | created | Device registered |
| devices | updated | Device updated/heartbeat |
| devices | deleted | Device removed |

### 8.5 Workspace Events

| Entity | Action | When |
|--------|--------|------|
| workspaces | created | Workspace created |
| workspaces | updated | Workspace updated |
| workspaces | deleted | Workspace deleted |

### 8.6 Project Events

| Entity | Action | When |
|--------|--------|------|
| projects | created | Project created |
| projects | updated | Project updated |
| projects | deleted | Project deleted |
| sub_projects | created | Sub-project added |
| sub_projects | deleted | Sub-project removed |

---

## 9. Error Handling

### 9.1 REST API Errors

All errors follow this format:

```typescript
interface ApiError {
  error: string;              // Human-readable message
}
```

**Standard HTTP Codes:**

| HTTP | Code | Description |
|------|------|-------------|
| 400 | BAD_REQUEST | Invalid request body or parameters |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Action not allowed |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | State conflict (e.g., email already exists) |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### 9.2 Rate Limits

- **Global**: 100 requests/minute per IP
- **Auth endpoints**: 10 requests/minute per IP

---

## 10. State Machine: Task Status Transitions

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

## Appendix: Sequence Diagrams

### A.1 Task Creation from Mobile

```
Mobile              Hub                 Desktop
  │                  │                     │
  │──POST /tasks────▶│                     │
  │◄─────Task────────│                     │
  │                  │──WS tasks:created──▶│
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
  │                  │◄─POST /progress─────│
  │◄─WS task:progress│                     │
  │                  │                     │
  │                  │◄─POST /complete─────│
  │◄─WS task:complete│                     │
```

### A.3 Multi-Device Setup

```
User                Hub                 Desktop 1       Desktop 2
  │                  │                     │               │
  │─register────────▶│                     │               │
  │◄─user/tokens─────│                     │               │
  │                  │                     │               │
  │─POST /devices───▶│                     │               │
  │◄─device 1────────│──WS devices:created▶│               │
  │                  │                     │               │
  │─POST /workspaces▶│                     │               │
  │◄─workspace───────│                     │               │
  │                  │                     │               │
  │─POST /host──────▶│ (set Desktop 1)     │               │
  │◄─workspace───────│──WS workspaces:updated─────────────▶│
  │                  │                     │               │
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-02-14 | Major update: Added user auth, devices, workspaces, sub-projects, task execution |
| 1.1.0 | 2026-02-14 | Draft for new architecture |
| 1.0.0 | 2026-02-13 | Initial draft |
