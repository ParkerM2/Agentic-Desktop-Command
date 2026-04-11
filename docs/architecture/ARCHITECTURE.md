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
│  │ Zustand      │   │ EventBridge   │◁─ events ──┤              │
│  │ stores       │   │ (invalidation)│            │              │
│  └──────────────┘   └───────────────┘            │              │
│  ┌──────────────┐                    ◁─ MessagePort (streams) ──┤
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
│  │ event-wiring │                        ├─ AgentHostClient     │
│  └──────────────┘                        │   (proxy to utility) │
│                                          ├─ AssistantService    │
│                                          │   ├─ tool-definitions│
│                                          │   ├─ tool-executor   │
│                                          │   └─ tool-handlers/  │
│                                          ├─ HubService (9)     │
│                                          ├─ ProjectService (6)  │
│                                          ├─ DataMgmtService (7) │
│                                          ├─ CommandBus (3)      │
│                                          ├─ Database (SQLite)    │
│                                          └─ ... (35 total)      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  AGENT HOST (Electron utilityProcess)                            │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │ ProcessMgr   │──▷│ StreamJSON    │──▷│ AgentManagerSvc    │  │
│  │ (spawn PTY)  │   │ Parser        │   │ (session lifecycle) │  │
│  └──────────────┘   └───────────────┘   └────────────────────┘  │
│  MessagePort RPC (correlation-ID request/response)               │
│  Direct MessagePort to renderer for stream events                │
│  Auto-restart with exponential backoff (5 retries / 60s)         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ IPC Contract: src/shared/ipc/ (28 domain folders)            ││
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

The IPC contract was refactored from a single ~2600-line `ipc-contract.ts` into 28 domain-specific folders under `src/shared/ipc/`. Each domain folder contains:

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
| `service-registry.ts` | Instantiates all service factories with dependency injection. Creates ErrorCollector + HealthRegistry early for crash resilience. Wraps non-critical services in `initNonCritical()` for graceful degradation. Initializes CommandBus + SQLite database. Creates `ProgressService` (SQLite-backed task management via `progress_tasks` table). Wires AgentWatchdog (process monitoring), QaTrigger (automatic QA on session completion), and HealthRegistry enrollment (hubHeartbeat, hubWebSocket). Exposes `hubApiClient`, `progressService`, `commandBus`, and `oauthManager` in registry result for use by event-wiring, IPC handlers, and OAuth handler registration. |
| `ipc-wiring.ts` | Registers all IPC handlers (connects handler files to router). Includes OAuth handlers (`oauth-handlers.ts`) for `oauth.authorize`, `oauth.isAuthenticated`, and `oauth.revoke` channels. |
| `event-wiring.ts` | Sets up service event → renderer forwarding. Includes planning completion detection: when a planning-phase agent completes, scans the project for plan files and transitions the task to `plan_ready` via `progressService`. |
| `index.ts` | Barrel re-export |

### Bootstrap Resilience Features

- **ErrorCollector** — Created first in `service-registry.ts`. Captures service errors to file-based log with capacity alerts. Reports errors via `event:app.error` IPC event. Used by `initNonCritical()` to record initialization failures.
- **HealthRegistry** — Created early. Monitors service liveness via periodic pulses. Services call `healthRegistry.pulse(name)` during normal operation; the registry emits `event:app.serviceUnhealthy` when pulses are missed.
- **initNonCritical()** — Wrapper function in `service-registry.ts`. Non-essential services (milestones, ideas, changelog, fitness, spotify, calendar, voice) are wrapped so that if their factory throws, the app continues running with `null` for that service. Failures are reported to ErrorCollector.
- **AgentWatchdog** — Created after the command bus. Monitors active agent sessions for dead/stale processes (30s interval, PID checks, heartbeat age thresholds). Alerts are forwarded to the renderer via `event:bus.watchdogAlert`.
- **QaTrigger** — Created after QA runner. Listens for task status changes to `review` and automatically starts quiet QA sessions. Disposed in `lifecycle.ts` during shutdown.

This replaces the previous monolithic `index.ts` where all initialization lived in a single file.

## Data Persistence

### User-Scoped vs Global Data

Data is separated into **user-scoped** (per-Hub-account) and **global** (device-level):

```
{appData}/adc/
├── settings.json          # Global — device preferences
├── hub-config.json        # Global — needed before login
├── oauth-tokens.json      # Global — device OAuth tokens
├── error-log.json         # Global — diagnostics
└── users/
    └── {userId}/          # User-scoped directory
        ├── notes.json
        ├── captures.json
        ├── briefings.json
        ├── assistant-history.json
        ├── alerts.json
        ├── ideas.json
        ├── milestones.json
        ├── changelog.json
        ├── planner/       # Daily plans
        └── fitness/       # Workouts, measurements, goals
```

**Session lifecycle:**
- On login: `UserSessionManager.setSession()` → services reinitialize with user-scoped paths
- On logout: `UserSessionManager.clearSession()` → services clear state and reset to global paths
- First login: `UserDataMigrator` copies existing global data to user folder

Key modules:
- `src/main/services/auth/user-session-manager.ts` — Tracks logged-in user, emits session change events
- `src/main/services/data-management/user-data-resolver.ts` — Computes user-scoped paths
- `src/main/services/data-management/user-data-migrator.ts` — Migrates data on first login
- `src/main/services/data-management/reinitializable-service.ts` — Interface for user-scoped services

### Data Locations

| Data | Storage | Location |
|------|---------|----------|
| Projects | JSON file | `{appData}/adc/projects.json` |
| Settings | SQLite table | `settings_kv` in `adc.db` |
| Tasks | SQLite table | `progress_tasks` in `adc.db` |
| Briefings | SQLite table | `briefings` in `adc.db` |
| Changelog | SQLite table | `changelog_entries` in `adc.db` |
| Planner | SQLite table | `planner_entries` in `adc.db` |
| OAuth Tokens | SQLite table | `oauth_tokens` in `adc.db` |
| Notes | JSON file | `{appData}/adc/users/{userId}/notes.json` |
| Captures | JSON file | `{appData}/adc/users/{userId}/captures.json` |
| Terminals | In-memory only | PTY processes managed by TerminalService |
| Agents | In-memory + utility process | Managed by AgentHostClient → AgentManagerService |

### UUID / Client-Generated IDs

Every persistable entity has a UUID `id` column. IDs can be generated on either side:

- **Server-side**: `generateId()` (calls `randomUUID()` from `node:crypto`)
- **Client-side**: `crypto.randomUUID()` in the renderer (valuable for future offline-first sync)
- **Bus**: Uses `randomUUID()` for command and session IDs (replaced ULID)
- All create methods accept an optional client-provided `id` parameter

Tables with UUID `id` columns: `progress_tasks`, `briefings`, `changelog_entries`, `oauth_tokens`, `settings_kv`, `planner_entries`, `sessions`, `commands`.

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
- **project/** — 2 files: detector, codebase-analyzer
- **progress/** — 4 files: progress-service, task-file-io, schema (Drizzle ORM), progress-handlers
- **qa/** — 7 files: poller, prompt, report-parser, session-store, trigger, types

## React Query Integration (3-Layer Caching Architecture)

Data freshness follows a 3-layer architecture: **EventBridge → React Query → UI Stores**.

1. **EventBridge** (`src/renderer/shared/components/EventBridge.tsx`) — mounted once in RootLayout. Subscribes to all IPC `event:*` channels and calls `queryClient.invalidateQueries()` with the correct query keys. This is the single place where IPC events drive cache invalidation.
2. **React Query** — feature hooks in `api/` directories define queries and mutations against `ipc()`. Query key factories enable targeted invalidation by EventBridge.
3. **Zustand stores** — hold UI-only state (selections, toggles, layout). Never domain data.

For the full recipe (5-step checklist, anti-patterns, examples), see `docs/patterns/CACHING-LAYER-QUICKGUIDE.md`.

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
- `queryKeys.ts` defines a factory for cache keys (enables targeted invalidation by EventBridge)
- `use<Feature>.ts` defines query hooks (read operations)
- `useTaskMutations.ts` defines mutation hooks (write operations with simple `onSuccess` invalidation)
- EventBridge handles IPC event → query invalidation centrally (no per-feature event wiring needed)

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

## Agent Host Utility Process

Agent session management runs in an Electron `utilityProcess` for process isolation:

- **AgentManagerService** (`src/main/agent-host/index.ts`) — Runs inside the utility process. Manages `ProcessManager` (PTY spawning), `StreamJsonParser` (output parsing), and session lifecycle.
- **AgentHostClient** (`src/main/agent-host/agent-host-client.ts`) — Main process proxy. Implements the shared `AgentManager` interface backed by MessagePort RPC (correlation-ID request/response).
- **AgentManager interface** — Shared interface satisfied by both `AgentManagerService` (direct, sync spawn) and `AgentHostClient` (async spawn via RPC). Callers always `await` spawn methods.
- **Direct MessagePort** — Stream events (agent output, status changes) flow directly from utility process to renderer, bypassing the main process for lower latency.
- **Crash Recovery** — Auto-restart with exponential backoff (5 retries within a 60-second window). On utility process crash, `AgentHostClient` re-establishes MessagePort connections.

Key files:
- `src/main/agent-host/agent-host-client.ts` — Main process proxy + `AgentManager` interface definition
- `src/main/agent-host/index.ts` — Utility process entry point
- `src/main/agent-host/host-protocol.ts` — MessagePort protocol types (`ControlRequest`, `ControlReply`, `AgentManagerEvent`)

## Command Bus + SQLite Layer (Primary)

The Command Bus is the primary system for agent lifecycle and session management.
It replaces the former Agent Orchestrator with a unified, SQLite-backed architecture.

### Core Components

- **CommandBus** (`src/main/bus/command-bus.ts`) — Central dispatch: accepts commands, routes to handlers, persists state to SQLite
- **SessionManager** (`src/main/bus/session-manager.ts`) — Session lifecycle: spawn, kill, list, crash recovery on boot. All sessions stored in SQLite via Drizzle ORM
- **Dispatcher** (`src/main/bus/dispatcher.ts`) — Command routing and execution coordination
- **Database** (`src/main/db/`) — SQLite via better-sqlite3 + Drizzle ORM. Schema: `schema.ts`, connection: `connection.ts`

### Session Lifecycle

```
dispatch(spawn) → 'spawned' → 'active' → 'completed' | 'error' | 'killed'
```

### IPC Channels

- `bus.dispatch` — Dispatch a command to the bus
- `bus.query` — Query bus state (sessions, commands)
- `bus.listSessions` — List active/recent sessions
- `bus.getSession` — Get session details
- `bus.killSession` — Kill a session by ID
- `bus.subscribe` — Subscribe to bus events

### Event Channels

- `event:bus.sessionStarted` — Session spawned
- `event:bus.sessionCompleted` — Session completed
- `event:bus.sessionFailed` — Session error
- `event:bus.commandDispatched` — Command accepted by bus

### Database Schema (SQLite)

Sessions, commands, and events are persisted to a local SQLite database, enabling crash recovery, session history, and token/tool usage tracking across restarts.

### Renderer Integration

- **useAgentMutations** — Mutation hooks wired to `bus.dispatch` / `bus.killSession`
- **useAgentEvents** — Event listeners for `event:bus.*` → cache invalidation
- **useTaskEvents** — orchestrates useAgentEvents + useQaEvents, called by ProgressTaskGrid
- **ActionsCell** — context-sensitive buttons wired to mutations
- **StatusBadgeCell** — supports all statuses including `planning`, `plan_ready` with pulsing indicators
- **TaskDetailRow** — expandable row with PlanViewer (approve/request changes/reject), PlanFeedbackDialog, QaReportViewer, SubtaskList, ExecutionLog, PRStatusPanel

## Agent Dashboard — Layer 1: Agent Visibility (ADC v2)

Three services provide Layer 1 agent visibility, independent of workflow tracking (Layer 2) and the dashboard (Layer 3). These services are registered in `service-registry.ts` and returned in `ServiceRegistryResult`.

### TmuxBridge (`src/main/services/tmux-bridge/`)

Manages tmux sessions for Team Lead and interactive agents:
- **tmux-commands.ts** — Low-level tmux CLI wrapper (execSync). Functions: `isTmuxInstalled`, `tmuxNewSession`, `tmuxSendKeys`, `tmuxCapturePane`, `tmuxKillSession`, `tmuxListSessions`, `tmuxHasSession`
- **tmux-bridge-service.ts** — Factory `createTmuxBridgeService()`. Caches tmux availability check. Methods: `createSession`, `sendKeys`, `capturePane`, `listSessions`, `killSession`, `isAvailable`, `hasSession`

Graceful degradation: If tmux is not installed, `isAvailable()` returns false and `listSessions()` returns empty. Methods that require tmux throw with an install hint.

### TeamWatcher (`src/main/services/team-watcher/`)

Watches `~/.claude/teams/<teamName>/config.json` for membership changes:
- **team-watcher-service.ts** — Factory `createTeamWatcherService()`. Uses `fs.watch` on the team directory with 300ms debounce. Diffs against known members set to detect joins and leaves.
- Event handlers: `onTeammateJoined(handler)`, `onTeammateLeft(handler)` — return unsubscribe functions
- Lifecycle: `startWatching(teamName)`, `stopWatching(teamName)`, `dispose()`

### SessionJSONLReader (`src/main/services/session-jsonl/`)

Tail-follows session JSONL files for structured agent output:
- **jsonl-parser.ts** — Factory `createJsonlTailReader(filePath, onEvent)`. Tracks byte offset for incremental reads. Handles truncation, partial writes, and rapid appends.
- **session-jsonl-reader.ts** — Factory `createSessionJSONLReaderService()`. Manages multiple concurrent readers (one per session). Methods: `startReading`, `stopReading`, `isReading`, `getOffset`, `onEvent`, `dispose`

Types used by all three: `TmuxSession`, `TeamMember`, `StreamJsonEvent` from `@shared/types/agent-dashboard`.

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

## Task System (SQLite-Backed — Sole Source of Truth)

Tasks are stored exclusively in the `progress_tasks` SQLite table (Drizzle ORM), managed by `ProgressService`. The old filesystem-based `.adc/specs/` task system has been completely removed. There is no `TaskService`, `TaskRepository`, `TaskDecomposer`, or `GithubImporter` — all task operations go through `ProgressService`.

**Key files:**
- `src/main/features/progress/progress-service.ts` — SQLite-backed task CRUD (sole task authority)
- `src/main/features/progress/schema.ts` — Drizzle schema (`progress_tasks` table with UUID `id` column)
- `src/main/features/progress/task-file-io.ts` — File I/O utilities
- `src/main/features/progress/progress-handlers.ts` — IPC handlers
- `src/shared/ipc/progress/channels.ts` — `PROGRESS` channel constants

**Consumers (all read from `progress_tasks` via ProgressService):**
- My Work page — cross-project task view
- Workflow Pipeline — visual task journey diagram
- Assistant tool-handlers — task CRUD via natural language
- Briefing service — daily task summaries
- QA trigger — auto-starts QA on task status change
- Insights service — task analytics

**Rules:**
- All task CRUD (list, get, create, update, delete) goes through `ProgressService` backed by SQLite
- `TaskStatus` values: `backlog`, `planning`, `plan_ready`, `queued`, `running`, `paused`, `review`, `done`, `error`
- No filesystem task storage — SQLite is the single source of truth

The Task Table displays tasks in a filterable, sortable TanStack Table view using shadcn Table primitives (`ProgressTaskGrid`).

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
| Profile OAuth tokens | `<userData>/settings.json` | `settings-encryption.ts` (via `PROFILE_SECRET_KEYS`) |
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

1. **Login**: `auth.login` → Hub validates → returns access + refresh tokens
2. **Token Storage**: Tokens encrypted with `safeStorage` in `token-store.ts` (provider: 'hub')
3. **Session Restore**: `auth.restore` → checks TokenStore for stored refresh token → refreshes via Hub → returns user + tokens (discriminated union: `{ restored: true, user, tokens }` or `{ restored: false }`)
4. **Proactive Refresh**: `useTokenRefresh()` hook sets timer 2 min before `expiresAt`, refreshes automatically
5. **Device Registration**: On startup, registers device with Hub + 30s heartbeat
6. **WebSocket Auth**: First message after connect is `{ type: "auth", apiKey }`, validated within 5s

---

## SQLite-Backed Task Operations

Task CRUD operations route through `ProgressService`, which reads/writes the `progress_tasks` SQLite table:

```
RENDERER                          MAIN PROCESS
========                          ============

useProgress() hook
  |
  v
ipc(PROGRESS.LIST.ALL, { projectId })
  |
  v
                              progress-handlers.ts
                                |
                                v
                              progressService.listTasks(projectId)
                                |  queries progress_tasks table (SQLite)
                                v
                              Return ProgressTask[] (always works, even offline)

--- On mutation (create, update, delete): ---

                              progressService.createTask(draft)
                                |  inserts into progress_tasks table
                                v
                              router.emit('event:progress.task.created', task)
                                |
                                v
                              EventBridge invalidates React Query cache
```

The renderer uses `PROGRESS.*` channel constants for all task operations.

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

### Task Table (TanStack Table + shadcn)

The task dashboard uses TanStack Table (`@tanstack/react-table`) with shadcn `Table` primitives from `@ui`:

- **ProgressTaskGrid** — TanStack Table instance with `useReactTable`, column defs with inline cell rendering via `flexRender`, rendered through `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell` from `@ui`
- **Column defs** — Status (Badge), Title, Priority, Progress (inline bar), Cost, Updated (relative time), Expand toggle
- **Detail rows** — Expandable via store `expandedRowIds` Set, renders `ProgressTaskDetailRow` in a full-width `TableCell`
- **TaskFiltersToolbar** — Filter controls in the PageHeader actions area
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
| `RootLayout` | `src/renderer/app/layouts/RootLayout.tsx` | Root shell: renders TitleBar at top, then `react-resizable-panels` (Group/Panel/Separator) for resizable sidebar + content layout. Sidebar panel is collapsible (syncs with layout store). Layout persists to localStorage via `useDefaultLayout`. |
| `TitleBar` | `src/renderer/app/layouts/TitleBar.tsx` | Custom frameless window title bar (32px). Drag region for window movement, utility buttons (screenshot, health, hub status) separated by vertical divider from minimize/maximize/close window controls via `window.*` IPC channels. |
| `Sidebar` | `src/renderer/app/layouts/Sidebar.tsx` | Navigation sidebar (fills its parent panel container) |
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
# Run before ANY completion claim. All 6 must pass.
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All tests pass
npm run build        # Builds successfully
npm run test:e2e     # E2E tests pass (playwright + electron — requires build)
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
│       ├── hub-token-store.test.ts
│       └── ... (40+ service test files)
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

See the test suite design document for the full testing strategy.
