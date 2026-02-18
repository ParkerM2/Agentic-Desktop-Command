# Architecture Reference

## System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  RENDERER (Browser)                                              │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │ React        │──▷│ React Query   │──▷│ ipc() helper       │  │
│  │ Components   │   │ hooks         │   │ (window.api.invoke) │  │
│  └──────────────┘   └───────────────┘   └────────┬───────────┘  │
│  ┌──────────────┐   ┌───────────────┐            │              │
│  │ Zustand      │   │ useIpcEvent() │◁─ events ──┤              │
│  │ stores       │   │ hooks         │            │              │
│  └──────────────┘   └───────────────┘            │              │
│  ┌──────────────┐                                │              │
│  │ Route Groups │  (8 route group files)         │              │
│  └──────────────┘                                │              │
├──────────────────────────────────────────────────┼──────────────┤
│  PRELOAD (Context Bridge)                        │              │
│  ┌─────────────────────────────────────────────┐ │              │
│  │ api.invoke(channel, input) → Promise<T>     │─┤              │
│  │ api.on(channel, handler) → unsubscribe      │◁┘              │
│  └─────────────────────────────────────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│  MAIN PROCESS (Node.js)                                         │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │ Bootstrap    │──▷│ IPC Router    │──▷│ Services           │  │
│  │ (5 modules)  │   │ (Zod valid.)  │   │ (business logic)   │  │
│  │              │   │               │   │                    │  │
│  │ lifecycle    │   │ Handlers      │   │ Each service has   │  │
│  │ svc-registry │   │ (thin layer)  │   │ focused sub-modules│  │
│  │ ipc-wiring   │   └───────────────┘   └────────────────────┘  │
│  │ event-wiring │                        ├─ AgentService (5)    │
│  └──────────────┘                        ├─ AssistantService    │
│                                          │   ├─ executors/ (22) │
│                                          │   └─ classifier/(16) │
│                                          ├─ HubService (9)     │
│                                          ├─ ProjectService (6)  │
│                                          └─ ... (32 total)      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ IPC Contract: src/shared/ipc/ (23 domain folders)            ││
│  │ Each folder: contract.ts + schemas.ts + index.ts             ││
│  │ Root barrel merges all into ipcInvokeContract/ipcEventContract││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## IPC Flow (Request/Response)

1. **Renderer** calls `ipc('projects.list', {})` via the shared helper
2. Helper calls `window.api.invoke('projects.list', {})` (preload bridge)
3. Preload forwards via `ipcRenderer.invoke(channel, input)`
4. **Main** `IpcRouter.handle()` receives the call:
   - Validates input against Zod schema from `ipc-contract.ts`
   - Calls the registered handler function
   - Wraps result in `{ success: true, data }` or `{ success: false, error }`
5. Result returns to renderer as `{ success: true, data: T }` or `{ success: false, error }`

## IPC Flow (Events — Main → Renderer)

1. **Main** service calls `router.emit('event:terminal.output', payload)`
2. Router calls `BrowserWindow.webContents.send(channel, payload)`
3. Preload listener fires via `ipcRenderer.on(channel, listener)`
4. **Renderer** `useIpcEvent('event:terminal.output', handler)` hook receives payload
5. Handler typically calls `queryClient.invalidateQueries()` to refetch data

## Domain-Based IPC Structure

The IPC contract was refactored from a single ~2600-line `ipc-contract.ts` into 23 domain-specific folders under `src/shared/ipc/`. Each domain folder contains:

- `schemas.ts` — Zod schemas for the domain
- `contract.ts` — Invoke and event contract entries using those schemas
- `index.ts` — Barrel export

The root barrel at `src/shared/ipc/index.ts` spreads all domain contracts into the unified `ipcInvokeContract` and `ipcEventContract` objects. The original `src/shared/ipc-contract.ts` is now a thin re-export that maintains backward compatibility — existing imports from `@shared/ipc-contract` continue to work.

**To add a new IPC channel**: Add it to the appropriate domain folder's `contract.ts` and `schemas.ts`. The root barrel automatically picks it up. The `health` domain folder was the most recent addition (error collection + health monitoring channels).

## Bootstrap Module Pattern

The main process entry point (`src/main/index.ts`) delegates to 5 bootstrap modules in `src/main/bootstrap/`:

| Module | Responsibility |
|--------|---------------|
| `lifecycle.ts` | Electron app lifecycle events, BrowserWindow creation, graceful shutdown (disposes all services including HealthRegistry + ErrorCollector last) |
| `service-registry.ts` | Instantiates all service factories with dependency injection. Creates ErrorCollector + HealthRegistry early for crash resilience. Wraps non-critical services in `initNonCritical()` for graceful degradation. Wires AgentWatchdog (process monitoring), QaTrigger (automatic QA on session completion), and HealthRegistry enrollment (hubHeartbeat, hubWebSocket). |
| `ipc-wiring.ts` | Registers all IPC handlers (connects handler files to router) |
| `event-wiring.ts` | Sets up service event → renderer forwarding |
| `index.ts` | Barrel re-export |

### Bootstrap Resilience Features

- **ErrorCollector** — Created first in `service-registry.ts`. Captures service errors to file-based log with capacity alerts. Reports errors via `event:app.error` IPC event. Used by `initNonCritical()` to record initialization failures.
- **HealthRegistry** — Created early. Monitors service liveness via periodic pulses. Services call `healthRegistry.pulse(name)` during normal operation; the registry emits `event:app.serviceUnhealthy` when pulses are missed.
- **initNonCritical()** — Wrapper function in `service-registry.ts`. Non-essential services (milestones, ideas, changelog, fitness, spotify, calendar, voice) are wrapped so that if their factory throws, the app continues running with `null` for that service. Failures are reported to ErrorCollector.
- **AgentWatchdog** — Created after the orchestrator. Monitors active agent sessions for dead/stale processes (30s interval, PID checks, heartbeat age thresholds). Alerts are forwarded to the renderer via `event:agent.orchestrator.watchdogAlert`.
- **QaTrigger** — Created after QA runner. Listens for task status changes to `review` and automatically starts quiet QA sessions. Disposed in `lifecycle.ts` during shutdown.

This replaces the previous monolithic `index.ts` where all initialization lived in a single file.

## Data Persistence

| Data | Storage | Location |
|------|---------|----------|
| Projects | JSON file | `{appData}/adc/projects.json` |
| Settings | JSON file | `{appData}/adc/settings.json` |
| Tasks | File directories | `{projectPath}/.adc/specs/{taskId}/` |
| Task specs | JSON files | `requirements.json`, `implementation_plan.json`, `task_metadata.json` |
| Terminals | In-memory only | PTY processes managed by TerminalService |
| Agents | In-memory only | PTY processes managed by AgentService |

## Service Architecture

All main process services follow the factory pattern:

```typescript
// Interface defines the public API
export interface ProjectService {
  listProjects: () => Project[];
  addProject: (path: string) => Project;
  // ...
}

// Factory creates the service instance with dependencies
export function createProjectService(/* deps */): ProjectService {
  // Private state (closures)
  return {
    listProjects() { /* ... */ },
    addProject(path) { /* ... */ },
  };
}
```

Key rules:
- **Local** services return **synchronous values** (not Promises)
- **Hub API proxy** services ARE async (they call the Hub REST API via `hubApiClient`)
- IPC handlers wrap sync returns with `Promise.resolve()`, or directly return the Promise from async Hub calls
- Electron-specific async exception: `selectDirectory()` uses Electron dialog
- Services emit events via `router.emit()` for real-time updates

### Refactored Multi-File Services

Large services have been split into focused sub-modules within their directory. The main service file remains the public API; sub-files are internal implementation details.

Key refactored services:
- **assistant/** — 22 domain executors in `executors/`, 16 intent classifier files in `intent-classifier/`
- **agent/** — `agent-spawner.ts`, `agent-output-parser.ts`, `agent-queue.ts`, `token-parser.ts`
- **hub/** — 9 files: api-client, auth, ws-client, connection, sync, events, config, webhook-relay
- **briefing/** — 6 files: cache, config, generator, summary, suggestion-engine
- **email/** — 7 files: config, encryption, queue, store, smtp-transport
- **notifications/** — 7 files: slack-watcher, github-watcher, filter, manager, store
- **settings/** — 4 files: defaults, encryption, store
- **project/** — 6 files: detector, task-service, slug, spec-parser, store
- **qa/** — 7 files: poller, prompt, report-parser, session-store, trigger, types

## React Query Integration

Each feature module provides query hooks that wrap `ipc()`:

```typescript
export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: taskKeys.list(projectId ?? ''),
    queryFn: () => ipc('tasks.list', { projectId: projectId ?? '' }),
    enabled: projectId !== null,
    staleTime: 30_000,
  });
}
```

Pattern:
- `queryKeys.ts` defines a factory for cache keys (enables targeted invalidation)
- `use<Feature>.ts` defines query hooks (read operations)
- `useTaskMutations.ts` defines mutation hooks (write operations with optimistic updates)
- `use<Feature>Events.ts` subscribes to IPC events and invalidates relevant queries

## Mutation Error Handling

All task and project mutations use `onError` callbacks to show user-facing error toasts:

```typescript
import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';

export function useCreateTask() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input) => ipc('hub.tasks.create', input),
    onError: onError('create task'),
  });
}
```

The toast system uses a Zustand store (`src/renderer/shared/stores/toast-store.ts`) with auto-dismiss (5s) and max 3 visible toasts. The `MutationErrorToast` component renders in `RootLayout.tsx`.

### Wired Mutations (11 total)
- **Tasks**: createTask, updateTaskStatus, deleteTask, executeTask, cancelTask
- **Projects**: addProject, removeProject, updateProject, createSubProject, deleteSubProject, selectDirectory (error only)

## Proactive Token Refresh

The auth system proactively refreshes JWT tokens before expiry rather than waiting for 401 responses:

```
AuthGuard mounts → useTokenRefresh() starts
  → Reads expiresAt from auth store
  → Sets setTimeout for (expiresAt - 2 minutes)
  → On timer fire: calls useRefreshToken().mutate()
    → Success: updates expiresAt, timer reschedules via effect
    → Failure: clearAuth() → redirect to login
  → Cleanup: clearTimeout on unmount/logout
```

Key files:
- `src/renderer/features/auth/hooks/useTokenRefresh.ts` — Timer hook
- `src/renderer/features/auth/store.ts` — `expiresAt` field + `setExpiresAt` action
- `src/renderer/features/auth/components/AuthGuard.tsx` — Calls `useTokenRefresh()`

## Terminal System

- **TerminalService** spawns real PTY processes via `@lydell/node-pty`
- **TerminalInstance.tsx** renders xterm.js with WebGL renderer
- Data flows: PTY stdout → `event:terminal.output` IPC event → xterm.write()
- Input flows: xterm.onData() → `terminals.sendInput` IPC call → PTY stdin
- Resize syncs between xterm FitAddon and PTY process

## Agent System (Legacy)

- **AgentService** spawns Claude CLI as PTY processes (legacy, still active for basic agent management)
- Parses CLI output for status indicators (starting, completed, error)
- Emits `event:agent.statusChanged` and `event:agent.log` events
- Agents are linked to tasks via `taskId` and projects via `projectId`

## Agent Orchestrator System (Primary)

The Agent Orchestrator is the primary system for task planning and execution.
It manages headless Claude agent sessions via `child_process.spawn`:

- **AgentOrchestrator** (`agent-orchestrator.ts`) — Session lifecycle: spawn, kill, getSession, listActive, dispose
- **JsonlProgressWatcher** (`jsonl-progress-watcher.ts`) — Watches `{dataDir}/progress/*.jsonl` files using incremental tail parsing (100ms debounce)
- **AgentWatchdog** (`agent-watchdog.ts`) — Health monitoring: 30s check interval, PID alive checks, heartbeat age thresholds (5min warn, 15min stale), auto-restart on context overflow (exit code 2)
- **HooksTemplate** (`hooks-template.ts`) — Generates Claude hooks config (PostToolUse writes tool_use entries, Stop writes agent_stopped entries to JSONL)
- **Types** (`types.ts`) — AgentSession, SpawnOptions, ProgressEntry (6 entry types)

### Session Lifecycle

```
spawn() → 'spawned' → 'active' → 'completed' | 'error' | 'killed'
```

### IPC Event Channels (6 events)

- `event:agent.orchestrator.heartbeat` — Session activity heartbeat (from spawn, JSONL heartbeat, tool_use)
- `event:agent.orchestrator.stopped` — Session completed or killed (with reason + exitCode)
- `event:agent.orchestrator.error` — Session error (with error message)
- `event:agent.orchestrator.progress` — Tool use or phase change data
- `event:agent.orchestrator.planReady` — Plan file detected (with summary + path)
- `event:agent.orchestrator.watchdogAlert` — Watchdog alert (type, sessionId, taskId, message, suggestedAction)

### Wiring Chain (index.ts)

1. `createAgentOrchestrator(dataDir, milestonesService)` — creates orchestrator
2. `createAgentWatchdog(orchestrator, {}, notificationManager)` — creates watchdog
3. `agentWatchdog.onAlert()` → `router.emit('event:agent.orchestrator.watchdogAlert')` — alert forwarding
4. `agentWatchdog.start()` — starts 30s health check loop
5. `agentOrchestrator.onSessionEvent()` → `router.emit(...)` — event forwarding
6. `createJsonlProgressWatcher(progressDir)` → `onProgress()` → typed `router.emit(...)` — progress forwarding
7. `jsonlProgressWatcher.start()` — starts file watching
8. Both cleaned up in `before-quit` handler

### Renderer Integration

- **useAgentMutations** — 4 mutation hooks (startPlanning, startExecution, killAgent, restartFromCheckpoint)
- **useAgentEvents** — 6 event listeners → optimistic cache updates + full invalidation
- **useTaskEvents** — orchestrates useAgentEvents + useQaEvents, called by TaskDataGrid
- **ActionsCell** — context-sensitive buttons wired to mutations
- **StatusBadgeCell** — supports all statuses including `planning`, `plan_ready` with pulsing indicators
- **TaskDetailRow** — expandable row with PlanViewer, QaReportViewer, SubtaskList, ExecutionLog, PRStatusPanel

## QA System

Two-tier automated QA system that spawns Claude agents via the orchestrator:
- **Quiet mode**: Fast automated checks (lint, typecheck, tests, build, check:docs)
- **Full mode**: Interactive Claude-powered review with screenshots and accessibility testing

### Architecture

- **QaRunner** (`qa-runner.ts`) — Session management, uses `orchestrator.spawn()` with `phase: 'qa'`
- **QaReportParser** (`qa-report-parser.ts`) — Parses structured JSON report from agent output
- **QaHandlers** (`qa-handlers.ts`) — 5 IPC channels (startQuiet, startFull, getReport, getSession, cancel)
- **QaTrigger** (`qa-trigger.ts`) — Auto-starts quiet QA when an execution agent completes; listens for orchestrator session completion events where `phase === 'executing'`, waits 2s for status propagation, then starts quiet QA if task is in 'review' status. Guards against re-triggering via taskId tracking.

### IPC Event Channels (3 events)

- `event:qa.started` — QA session started (taskId, mode)
- `event:qa.progress` — QA progress step (taskId, step, total, current)
- `event:qa.completed` — QA completed (taskId, result, issueCount)

### Renderer Integration

- **useQaMutations** — Query hooks (useQaReport, useQaSession) + mutation hooks (startQuietQa, startFullQa, cancelQa)
- **useQaEvents** — 3 event listeners → cache invalidation + toast notifications
- **QaReportViewer** — Displays QA report with trigger buttons, shown in TaskDetailRow for review/done tasks

QA failures trigger `notificationManager.onNotification()` for proactive alerts.

## Assistant Watch System

Persistent subscription system for proactive notifications:
- **WatchStore** (`watch-store.ts`) — JSON persistence at `userData/assistant-watches.json`
- **WatchEvaluator** (`watch-evaluator.ts`) — Subscribes to IPC events, matches against active watches
- **CrossDeviceQuery** (`cross-device-query.ts`) — Queries other ADC instances via Hub API

Watch types: task_status, task_completed, agent_error, qa_result, device_status
Operators: equals, changes, any

When a watch triggers, the evaluator fires a callback that emits `event:assistant.proactive`
with source 'watch', enabling the assistant widget to show proactive notifications.

## Task System

Tasks are stored as file-system directories under `{project}/.adc/specs/`:

```
specs/
├── 1-implement-login/
│   ├── requirements.json       # Task description, workflow type
│   ├── implementation_plan.json # Status, phases, execution state
│   └── task_metadata.json      # Model config, complexity
└── 2-fix-sidebar-bug/
    └── ...
```

The TaskService reads/writes these files. The Task Table displays tasks in a filterable, sortable dashboard view.

## Design System & Theme Architecture

```
globals.css @theme block
  ├── Registers CSS vars as Tailwind tokens (--color-primary: var(--primary))
  ├── Defines fonts, radius scale, animations, keyframes
  └── Tailwind generates utility classes (bg-primary, text-foreground, etc.)

Theme variable blocks (in globals.css)
  ├── :root            — Default light theme
  ├── .dark            — Default dark theme (Oscura Midnight)
  ├── [data-theme="X"]       — Named theme light variant
  └── [data-theme="X"].dark  — Named theme dark variant

theme-store.ts (Zustand)
  ├── setMode('dark')       → adds class="dark" to <html>
  ├── setColorTheme('ocean') → sets data-theme="ocean" on <html>
  └── setUiScale(110)       → sets data-ui-scale="110" on <html>

Constants (src/shared/constants/themes.ts)
  ├── COLOR_THEMES — ['default', 'dusk', 'lime', 'ocean', 'retro', 'neo', 'forest']
  ├── ColorTheme type
  └── COLOR_THEME_LABELS — human-readable names
```

Key rules:
- **`color-mix(in srgb, var(--token) XX%, transparent)`** for all semi-transparent theme colors
- Raw color values ONLY in theme variable definitions, never in utility classes
- `postcss.config.mjs` is required for Tailwind v4 processing via `@tailwindcss/postcss`

## Security — Secret Storage

All sensitive credentials are encrypted using Electron's `safeStorage` API, which provides OS-level encryption:
- **macOS**: Keychain
- **Windows**: DPAPI (Data Protection API)
- **Linux**: libsecret

### What's Encrypted

| Secret Type | Storage Location | Service |
|-------------|-----------------|---------|
| OAuth client credentials | `<userData>/oauth-providers.json` | `provider-config.ts` |
| Webhook secrets (Slack, GitHub) | `<userData>/settings.json` | `settings-service.ts` |

### Encryption Pattern

```typescript
import { safeStorage } from 'electron';

// Encrypt before saving
function encryptSecret(value: string): EncryptedSecretEntry {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = safeStorage.encryptString(value);
    return { encrypted: buffer.toString('base64'), useSafeStorage: true };
  }
  // Fallback for CI/testing environments
  return { encrypted: Buffer.from(value, 'utf-8').toString('base64'), useSafeStorage: false };
}

// Decrypt on read
function decryptSecret(entry: EncryptedSecretEntry): string {
  if (entry.useSafeStorage) {
    const buffer = Buffer.from(entry.encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }
  return Buffer.from(entry.encrypted, 'base64').toString('utf-8');
}
```

### Migration

Both services automatically migrate plaintext secrets to encrypted format on first read. The `useSafeStorage` flag tracks whether real encryption was used, enabling graceful fallback in environments where safeStorage is unavailable.

## Security — Hub API

The Hub server (`hub/`) includes security hardening for its REST API.

### Bootstrap Secret

The `POST /api/auth/generate-key` endpoint (used to create the first API key) requires the `HUB_BOOTSTRAP_SECRET` environment variable:

```bash
# .env
HUB_BOOTSTRAP_SECRET=your-random-secret-here
```

Clients must include the secret in the `X-Bootstrap-Secret` header. The server validates using `crypto.timingSafeEqual()` to prevent timing attacks.

### Rate Limiting

All Hub endpoints are protected by `@fastify/rate-limit`:

| Scope | Limit | Window |
|-------|-------|--------|
| Global (all endpoints) | 100 requests | 1 minute |
| Auth routes (`/api/auth/*`) | 10 requests | 1 minute |

Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included in responses.

### CORS Validation

CORS is configured via the `HUB_ALLOWED_ORIGINS` environment variable (comma-separated list of allowed origins). If not set, defaults to `origin: true` for development mode.

```bash
# .env
HUB_ALLOWED_ORIGINS=https://example.com,http://localhost:5173
```

### WebSocket First-Message Authentication

WebSocket connections use first-message authentication instead of query parameters (which can be logged by proxies):

1. Client connects to `/ws` without API key in URL
2. Server expects an auth message within 5 seconds:
   ```json
   { "type": "auth", "apiKey": "your-api-key" }
   ```
3. Server validates the API key against the database
4. On success: client is upgraded to `addAuthenticatedClient()` and receives broadcasts
5. On failure: connection is closed with code 4001 (Unauthorized)

The client implementation (`hub-connection.ts`) sends the auth message immediately upon WebSocket open.

---

## Hub Connection Layer

The Electron client connects to a self-hosted Hub server for multi-device sync.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  ELECTRON CLIENT                                                     │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │ React Hooks     │──▷│ IPC Handlers     │──▷│ Hub Services     │  │
│  │ (useTasks, etc) │   │ (hub-handlers)   │   │                  │  │
│  └─────────────────┘   └──────────────────┘   │  ┌────────────┐  │  │
│          ▲                                     │  │ API Client │  │  │
│          │                                     │  └─────┬──────┘  │  │
│  ┌───────┴─────────┐                          │        │         │  │
│  │ useHubEvent     │◁─────── events ──────────│  ┌─────▼──────┐  │  │
│  │ hub-query-sync  │                          │  │ WebSocket  │  │  │
│  └─────────────────┘                          │  └─────┬──────┘  │  │
│                                               │        │         │  │
│                                               │  ┌─────▼──────┐  │  │
│                                               │  │ Token Store│  │  │
│                                               │  │ Auth Svc   │  │  │
│                                               │  └────────────┘  │  │
│                                               └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │ REST + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  HUB SERVER (Docker)                                                 │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │ Fastify Routes  │──▷│ SQLite Database  │   │ WS Broadcaster   │  │
│  │ /api/tasks/*    │   │ (tasks, devices) │   │ (real-time push) │  │
│  │ /api/auth/*     │   └──────────────────┘   └──────────────────┘  │
│  └─────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Services

| Service | Location | Purpose |
|---------|----------|---------|
| `hub-api-client.ts` | `src/main/services/hub/` | REST API calls (tasks, auth, devices) |
| `hub-auth-service.ts` | `src/main/services/hub/` | Login/register/logout + token refresh |
| `hub-token-store.ts` | `src/main/services/hub/` | safeStorage encrypted token persistence |
| `hub-websocket.ts` | `src/main/services/hub/` | WebSocket with auto-reconnect |

### IPC Channels

| Channel | Purpose |
|---------|---------|
| `hub.tasks.list` | List tasks from Hub |
| `hub.tasks.get` | Get single task |
| `hub.tasks.create` | Create task on Hub |
| `hub.tasks.update` | Update task |
| `hub.tasks.updateStatus` | Update task status only |
| `hub.tasks.delete` | Delete task |
| `hub.tasks.execute` | Start task execution |
| `hub.tasks.cancel` | Cancel running task |

### Event Channels (WebSocket → Renderer)

| Channel | Payload | When |
|---------|---------|------|
| `event:hub.tasks.created` | `{ taskId, projectId }` | Task created on another device |
| `event:hub.tasks.updated` | `{ taskId, projectId }` | Task updated on another device |
| `event:hub.tasks.deleted` | `{ taskId, projectId }` | Task deleted on another device |
| `event:hub.tasks.progress` | `{ taskId, progress, phase }` | Task progress update |
| `event:hub.tasks.completed` | `{ taskId, projectId, result }` | Task execution completed |
| `event:hub.devices.online` | `{ deviceId, name }` | Device came online |
| `event:hub.devices.offline` | `{ deviceId }` | Device went offline |

### Authentication Flow

1. **Login**: `hub.auth.login` → Hub validates → returns access + refresh tokens
2. **Token Storage**: Tokens encrypted with `safeStorage` in `hub-token-store.ts`
3. **Proactive Refresh**: `useTokenRefresh()` hook sets timer 2 min before `expiresAt`, refreshes automatically
4. **Device Registration**: On startup, registers device with Hub + 30s heartbeat
5. **WebSocket Auth**: First message after connect is `{ type: "auth", apiKey }`, validated within 5s

---

## Hub-First Task Operations

Task CRUD operations now route through the Hub API rather than local file storage:

```
RENDERER                          MAIN PROCESS                    HUB SERVER
========                          ============                    ==========

useTasks() hook
  |
  v
ipc('hub.tasks.list', { projectId })
  |
  v
                              hub-handlers.ts
                                |
                                v
                              hubApiClient.listTasks(projectId)
                                |  src/main/services/hub/hub-api-client.ts
                                v
                              GET /api/tasks?projectId=...
                                                                  |
                                                                  v
                                                              SQLite query
                                                                  |
                                                                  v
                                                              JSON response
                              <---------------------------------+
```

Local `tasks.*` channels still exist for backward-compatible access and are used internally by services (insights, briefing, assistant). The renderer exclusively uses `hub.tasks.*` channels.

### WebSocket Event Forwarding (Hub -> Electron -> React)

Real-time updates from the Hub server are forwarded through the Electron main process to React:

```
HUB SERVER                      MAIN PROCESS                    RENDERER
==========                      ============                    ========

WebSocket broadcast
  { type: 'task.updated', ... }
                              hub-connection.ts receives
                                |
                                v
                              router.emit('event:hub.tasks.updated', payload)
                                |
                                v
                              BrowserWindow.webContents.send(...)
                                                                  |
                                                                  v
                                                              useHubEvent('event:hub.tasks.updated', ...)
                                                                  |
                                                                  v
                                                              queryClient.invalidateQueries()
                                                                  |
                                                                  v
                                                              React Query refetches from Hub
```

### Device Heartbeat System

Each Electron client registers as a device with the Hub and sends periodic heartbeats:

```
APP STARTUP                     MAIN PROCESS                    HUB SERVER
===========                     ============                    ==========

index.ts (app ready)
  |
  v
deviceService.registerDevice()
  |
  v
                              POST /api/devices/register
                                { machineId, deviceName, ... }
                                                                  |
                                                                  v
                                                              INSERT/UPDATE devices
                                                              WS broadcast: device.online
                              <---- { deviceId } ---------------+
                                |
                                v
heartbeatService.start(deviceId)
  |
  v
Every 30s: deviceService.sendHeartbeat(deviceId)
  |
  v
                              POST /api/devices/:id/heartbeat
                                                                  |
                                                                  v
                                                              UPDATE last_seen_at
```

### AG-Grid Task Table

The task dashboard uses AG-Grid Community v35.1.0 for the main data grid:

- **TaskDataGrid** — Main grid component with column definitions, row selection, and sorting
- **Cell renderers** — 12 custom cell renderers (StatusBadge, ProgressBar, ActivitySparkline, Agent, PrStatus, Cost, Priority, Actions, ExpandToggle, Workspace, Title, RelativeTime)
- **Detail rows** — DIY master/detail via `isFullWidthRow` + `fullWidthCellRenderer` (Community workaround for Enterprise-only feature)
- **TaskFiltersToolbar** — Filter controls above the grid
- **TaskDetailRow** — Expanded row showing subtasks, execution log, PR status, and task controls

### Shared UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppUpdateNotification` | `src/renderer/shared/components/` | App update available notification banner |
| `AuthNotification` | `src/renderer/shared/components/` | Auth error/expiry notification |
| `ConfirmDialog` | `src/renderer/shared/components/` | Reusable destructive-action confirmation (task delete, project delete) |
| `HubConnectionIndicator` | `src/renderer/shared/components/` | Hub connected/disconnected dot indicator |
| `HubNotification` | `src/renderer/shared/components/` | Hub connection event notifications |
| `HubStatus` | `src/renderer/shared/components/` | Hub status display component |
| `IntegrationRequired` | `src/renderer/shared/components/` | Placeholder for features requiring external integration |
| `MutationErrorToast` | `src/renderer/shared/components/` | Fixed bottom-right error toast renderer |
| `WebhookNotification` | `src/renderer/shared/components/` | Webhook execution result notifications |

### App Layout Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `RootLayout` | `src/renderer/app/layouts/RootLayout.tsx` | Root shell: sidebar + TopBar + content + notification overlays + AssistantWidget |
| `Sidebar` | `src/renderer/app/layouts/Sidebar.tsx` | Navigation sidebar |
| `TopBar` | `src/renderer/app/layouts/TopBar.tsx` | Top bar with CommandBar trigger |
| `CommandBar` | `src/renderer/app/layouts/CommandBar.tsx` | Global command palette (Cmd+K) |
| `ProjectTabBar` | `src/renderer/app/layouts/ProjectTabBar.tsx` | Horizontal tab bar for switching between open projects |
| `UserMenu` | `src/renderer/app/layouts/UserMenu.tsx` | Avatar + logout dropdown in sidebar footer |

### RootLayout Overlay Mount Order

Components mounted after the main content area, in order:

1. `AppUpdateNotification`
2. `AuthNotification`
3. `HubNotification`
4. `MutationErrorToast` (fixed bottom-right, z-50)
5. `WebhookNotification`
6. `AssistantWidget` (FAB z-40 bottom-right, panel z-50)

The `AssistantWidget` provides a floating chat interface accessible from any page via Ctrl+J (or Cmd+J on Mac). It complements the CommandBar (Cmd+K) with persistent conversational history.

## Build System

- **electron-vite** handles three separate builds:
  - Main: CJS output for Electron main process
  - Preload: ESM output for context bridge
  - Renderer: Bundled SPA with Vite + React plugin
- Path aliases are configured in both `tsconfig.json` and `electron.vite.config.ts`
- Tailwind v4 uses `@theme` directive in `globals.css` to register design tokens
- PostCSS pipeline: `postcss.config.mjs` → `@tailwindcss/postcss` + `autoprefixer`

---

## Testing — MANDATORY VERIFICATION GATE

> **⚠️ ALL code changes require passing the test suite. This is non-negotiable.**

### Verification Commands (ALL MUST PASS)

```bash
# Run before ANY completion claim. All 5 must pass.
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All tests pass
npm run build        # Builds successfully
npm run check:docs   # Documentation updated for source changes
```

**Skipping tests = work rejected. No exceptions.**

---

The project uses a 4-layer test pyramid for comprehensive coverage:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ADC TEST PYRAMID                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │   AI QA AGENT   │  ← Claude + MCP Electron        │
│                         │  (Exploratory)  │    Visual verification          │
│                         └────────┬────────┘                                 │
│                                  │                                          │
│                    ┌─────────────┴─────────────┐                            │
│                    │      E2E TESTS            │  ← Playwright + Electron   │
│                    │   (Critical Journeys)     │    Scripted, deterministic │
│                    └─────────────┬─────────────┘                            │
│                                  │                                          │
│          ┌───────────────────────┴───────────────────────┐                  │
│          │              INTEGRATION TESTS                 │  ← Vitest       │
│          └───────────────────────┬───────────────────────┘                  │
│                                  │                                          │
│  ┌───────────────────────────────┴───────────────────────────────────────┐  │
│  │                         UNIT TESTS                                     │  │
│  │        (Services, Utilities, Zod Schemas, Pure Functions)              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Layers

| Layer | Tool | Purpose | When to Run |
|-------|------|---------|-------------|
| Unit | Vitest | Services, utilities, pure functions | Every save, pre-commit |
| Integration | Vitest | IPC handlers, React Query hooks | Pre-commit |
| E2E | Playwright + Electron | Critical user journeys | Pre-push, CI |
| AI QA | Claude + MCP Electron | Exploratory visual testing | PR review |

### Test Directory Structure

```
tests/
├── setup/
│   ├── vitest.setup.ts          # Global test setup
│   └── mocks/
│       ├── electron.ts          # Mock app, dialog, safeStorage
│       ├── node-fs.ts           # Mock file system (memfs)
│       ├── node-pty.ts          # Mock PTY spawning
│       └── ipc.ts               # Mock window.api.invoke
│
├── unit/                        # Unit tests (vitest.config.ts)
│   └── services/
│       ├── project-service.test.ts
│       ├── task-service.test.ts
│       └── hub-token-store.test.ts
│
├── integration/                 # Integration tests (vitest.integration.config.ts)
│   └── ipc-handlers/
│       ├── project-handlers.test.ts
│       └── task-handlers.test.ts
│
├── e2e/                         # E2E tests (playwright.config.ts)
│   ├── electron.setup.ts        # Electron launch fixtures
│   ├── app-launch.spec.ts
│   └── navigation.spec.ts
│
└── qa-scenarios/                # AI QA agent test scenarios
    ├── README.md
    ├── task-creation.md
    └── project-management.md
```

### Test Commands

```bash
npm run test              # Run unit + integration tests
npm run test:unit         # Unit tests only (fast, <1s)
npm run test:unit:watch   # Unit tests in watch mode
npm run test:integration  # Integration tests only (<10s)
npm run test:e2e          # E2E tests with Playwright (<60s)
npm run test:e2e:ui       # E2E tests with Playwright UI
npm run test:coverage     # Unit tests with V8 coverage report
```

### Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Unit test configuration |
| `vitest.integration.config.ts` | Integration test configuration |
| `playwright.config.ts` | E2E test configuration |

### AI QA Agent

For exploratory testing, the AI QA agent uses MCP Electron tools to interact with the running app:

- Takes screenshots for visual verification
- Navigates UI elements via `send_command_to_electron`
- Reads console logs for error detection
- Follows natural language test scenarios in `tests/qa-scenarios/`

See `docs/plans/2026-02-14-test-suite-design.md` for the full testing strategy.
