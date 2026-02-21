# Data Flow Reference

> Complete data flow diagrams for every system in ADC.
> Reference this when designing new features or debugging data issues.

---

## 1. IPC Request/Response Flow

```
RENDERER                          PRELOAD                        MAIN PROCESS
========                          =======                        ============

React Component
  |
  v
useQuery / useMutation hook
  |
  v
ipc(channel, input)               window.api.invoke(ch, input)
  |  src/renderer/shared/          |  src/preload/index.ts
  |  lib/ipc.ts                    |
  v                                v
                              ipcRenderer.invoke(ch, input)
                                   |
                                   v
                              IpcRouter.handle(ch, handler)
                                   |  src/main/ipc/router.ts
                                   v
                              Zod validation (input schema)
                                   |
                                   v
                              Handler function
                                   |  src/main/ipc/handlers/*
                                   v
                              Service method (sync)
                                   |  src/main/services/*
                                   v
                              Return value
                                   |
                                   v
                              { success: true, data }
                                   |
                                   v
                              ipcRenderer resolves
                                   |
                                   v
React Query cache updated    <-----+
  |
  v
Component re-renders with new data
```

### Key Files in This Flow

| Step | File | Purpose |
|------|------|---------|
| Domain contracts | `src/shared/ipc/<domain>/contract.ts` | Domain-specific channel definitions with Zod schemas |
| Domain schemas | `src/shared/ipc/<domain>/schemas.ts` | Zod schemas for the domain |
| Root barrel | `src/shared/ipc/index.ts` | Merges all 23 domain contracts into unified objects |
| Compat re-export | `src/shared/ipc-contract.ts` | Thin re-export from `src/shared/ipc/` (backward compat) |
| Renderer helper | `src/renderer/shared/lib/ipc.ts` | Typed wrapper: `ipc(channel, input) -> Promise<Output>` |
| Preload bridge | `src/preload/index.ts` | Context bridge: `api.invoke()`, `api.on()` |
| Router | `src/main/ipc/router.ts` | Routes channel to handler, validates input with Zod |
| Handlers | `src/main/ipc/handlers/*.ts` | Thin layer: calls service, wraps in `Promise.resolve()` |
| Services | `src/main/services/*/*.ts` | Business logic, returns sync values |

### Type Flow (Compile-Time)

```
Domain contract (src/shared/ipc/projects/contract.ts) defines:
  projectsInvoke['projects.list'].input  -> z.object({})
  projectsInvoke['projects.list'].output -> z.array(ProjectSchema)

Root barrel (src/shared/ipc/index.ts) merges:
  ipcInvokeContract = { ...projectsInvoke, ...tasksInvoke, ... }

Type utilities (src/shared/ipc/types.ts) derive:
  InvokeInput<'projects.list'>  = {}
  InvokeOutput<'projects.list'> = Project[]

ipc('projects.list', {})  -> Promise<Project[]>   // Fully typed, no manual wiring
```

---

## 2. IPC Event Flow (Main -> Renderer)

```
MAIN PROCESS                      PRELOAD                        RENDERER
============                      =======                        ========

Service detects change
  |
  v
router.emit(channel, payload)
  |  src/main/ipc/router.ts
  v
BrowserWindow.webContents.send(ch, payload)
  |
  v
                              ipcRenderer.on(ch, listener)
                                   |  src/preload/index.ts
                                   v
                              api.on(ch, handler)
                                   |
                                   v
                                                          useIpcEvent(ch, handler)
                                                            |  src/renderer/shared/
                                                            |  hooks/useIpcEvent.ts
                                                            v
                                                          Handler invalidates queries
                                                            |
                                                            v
                                                          queryClient.invalidateQueries()
                                                            |
                                                            v
                                                          React Query refetches
                                                            |
                                                            v
                                                          Components re-render
```

### Event Contract

```typescript
// Defined in src/shared/ipc/tasks/contract.ts (merged into ipcEventContract by root barrel)
tasksEvents['event:task.statusChanged'] = {
  payload: z.object({
    taskId: z.string(),
    status: TaskStatusSchema,
    projectId: z.string(),
  }),
};

// Emitted from service
router.emit('event:task.statusChanged', { taskId, status, projectId });

// Consumed in renderer
useIpcEvent('event:task.statusChanged', ({ taskId, projectId }) => {
  void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
});
```

---

## 3. Feature Module Data Flow

```
Feature: tasks
=============

index.ts (barrel export)
  exports: useTasks, useTaskMutations, useTaskEvents, TaskCard, ...

api/queryKeys.ts
  taskKeys = {
    all:    ['tasks'] as const,
    lists:  () => [...taskKeys.all, 'list'],
    list:   (projectId) => [...taskKeys.lists(), projectId],
    details: () => [...taskKeys.all, 'detail'],
    detail: (taskId) => [...taskKeys.details(), taskId],
  }

api/useTasks.ts
  useTasks(projectId)     -> useQuery  -> ipc('tasks.list', { projectId })
  useTask(projectId, id)  -> useQuery  -> ipc('tasks.get', { projectId, taskId })

api/useTaskMutations.ts
  useCreateTask()     -> useMutation -> ipc('tasks.create', draft)
  useUpdateTask()     -> useMutation -> ipc('tasks.update', { taskId, updates })
  useUpdateStatus()   -> useMutation -> ipc('tasks.updateStatus', { taskId, status })
  useDeleteTask()     -> useMutation -> ipc('tasks.delete', { taskId, projectId })

hooks/useTaskEvents.ts
  useTaskEvents()
    -> useIpcEvent('event:task.statusChanged', ...)
    -> useIpcEvent('event:task.progressUpdated', ...)
    -> useIpcEvent('event:task.logAppended', ...)
    -> invalidates relevant query keys

store.ts (Zustand — UI state only)
  selectedTaskId: string | null
  expandedSections: Set<string>
  // NO server data in Zustand — that's React Query's job

components/
  TaskCard.tsx        -> uses useTasks() for data
  TaskStatusBadge.tsx -> pure presentational
```

---

## 4. State Management Boundaries

```
                    +-----------------------+
                    |   REACT QUERY         |
                    |   (Server State)      |
                    |                       |
                    |   - Projects list     |
                    |   - Tasks per project |
                    |   - Agent sessions    |
                    |   - Terminal sessions |
                    |   - Settings          |
                    |   - Profiles          |
                    +-----------+-----------+
                                |
                    ipc() calls via hooks
                                |
                    +-----------+-----------+
                    |   ZUSTAND             |
                    |   (UI State Only)     |
                    |                       |
                    |   Shared stores:      |
                    |   layout-store:       |
                    |     sidebarCollapsed  |
                    |     activeProjectId   |
                    |     projectTabs       |
                    |   theme-store:        |
                    |     mode (light/dark) |
                    |     colorTheme        |
                    |     uiScale           |
                    |   toast-store:        |
                    |     toasts queue      |
                    |   assistant-widget:   |
                    |     isOpen (toggle)   |
                    |   command-bar-store:  |
                    |     isProcessing      |
                    |     inputHistory      |
                    |                       |
                    |   Feature stores:     |
                    |     selectedTaskId    |
                    |     activeTerminalId  |
                    |     dragState         |
                    |     assistantStore:   |
                    |       responseHistory |
                    |       isThinking      |
                    |       unreadCount     |
                    +-----------------------+

RULE: Zustand stores NEVER contain data from the server.
      Server data lives in React Query cache ONLY.
      Zustand stores contain UI state: selections, toggles, layout.
```

---

## 5. Terminal Data Flow

```
User types in xterm.js
  |
  v
xterm.onData(data)                         TerminalInstance.tsx
  |
  v
ipc('terminals.sendInput', { sessionId, data })
  |
  v
TerminalService.sendInput(sessionId, data)  terminal-service.ts
  |
  v
ptyProcess.write(data)                     node-pty
  |
  v
PTY executes command, produces output
  |
  v
ptyProcess.onData(output)                 terminal-service.ts
  |
  v
router.emit('event:terminal.output', { sessionId, data })
  |
  v
useIpcEvent('event:terminal.output', ...)   useTerminalEvents.ts
  |
  v
xterm.write(data)                          TerminalInstance.tsx
```

---

## 6. Agent Orchestrator Execution Flow

Two agent systems coexist: the legacy PTY-based `AgentService` and the newer headless `AgentOrchestrator`.
The orchestrator is the primary system for task planning and execution.

```
User clicks "Start Planning" / "Implement Feature" (ActionsCell)
  |
  v
useStartPlanning / useStartExecution mutation     useAgentMutations.ts
  |
  v
ipc('agent.startPlanning', { taskId, projectPath, taskDescription })
  |
  v
hubApiClient.updateTaskStatus(taskId, 'planning')   agent-orchestrator-handlers.ts
  |
  v
agentOrchestrator.spawn({ taskId, projectPath, prompt, phase })
  |
  v
child_process.spawn('claude', ['-p', prompt])     agent-orchestrator.ts
  |  Detached, stdio: 'pipe', stdout/stderr piped to log files
  |  Claude hooks config installed for progress tracking
  v
Agent runs (writes JSONL progress to {dataDir}/progress/{taskId}.jsonl)
  |
  +--> onSessionEvent('spawned')
  |      |
  |      v
  |    router.emit('event:agent.orchestrator.heartbeat')   index.ts
  |      |
  |      v
  |    useAgentEvents → optimistic cache update             useAgentEvents.ts
  |
  +--> JSONL entries written by Claude hooks
  |      |
  |      v
  |    jsonlProgressWatcher.onProgress({ taskId, entries })   index.ts
  |      |
  |      +--> tool_use → router.emit('event:agent.orchestrator.progress')
  |      +--> phase_change → router.emit('event:agent.orchestrator.progress')
  |      +--> plan_ready → router.emit('event:agent.orchestrator.planReady')
  |      +--> heartbeat → router.emit('event:agent.orchestrator.heartbeat')
  |      +--> error → router.emit('event:agent.orchestrator.error')
  |      +--> agent_stopped → router.emit('event:agent.orchestrator.stopped')
  |
  +--> agentWatchdog checks every 30s                        agent-watchdog.ts
  |      |
  |      +--> PID alive check (process.kill(pid, 0))
  |      +--> Heartbeat age > 5min → warning alert
  |      +--> Heartbeat age > 15min → stale alert
  |      +--> PID dead → dead alert
  |      |
  |      v
  |    router.emit('event:agent.orchestrator.watchdogAlert')   index.ts
  |      |
  |      v
  |    useAgentEvents → invalidate task caches                 useAgentEvents.ts
  |
  +--> On completion/error:
        |
        v
      onSessionEvent('completed' | 'error')
        |
        v
      router.emit('event:agent.orchestrator.stopped' | 'error')
        |
        v
      useAgentEvents → full task cache invalidation
```

### QA Auto-Trigger Flow

```
Agent execution completes (orchestrator session event):
  |
  v
qaTrigger listens for session completion              qa-trigger.ts
  where event.type === 'completed'
  and event.session.phase === 'executing'
  |
  v
Wait 2 seconds (status propagation delay)
  |
  v
Check: task status === 'review'?
  Yes → qaRunner.startQuiet(taskId, context)
  No  → skip (task may have been manually updated)
  |
  (guards: skip if already triggered for this taskId,
   skip if QA session already active)
```

### QA Runner Flow

```
After agent completion (or manual trigger via UI):
  |
  v
useStartQuietQa / useStartFullQa mutation         useQaMutations.ts
  |
  v
ipc('qa.startQuiet', { taskId })                   qa-handlers.ts
  |
  v
qaRunner.startQuiet(taskId, context)                qa-runner.ts
  |
  v
orchestrator.spawn({ taskId: 'qa-{taskId}', prompt, phase: 'qa' })
  |
  v
QA agent runs (lint, typecheck, test, build, check:docs)
  |
  +--> qaRunner emits session events
  |      |
  |      v
  |    router.emit('event:qa.started')              qa-handlers.ts
  |    router.emit('event:qa.progress')
  |    router.emit('event:qa.completed')
  |      |
  |      v
  |    useQaEvents → invalidate QA caches + toast   useQaEvents.ts
  |
  +--> On completion:
        |
        v
      Parse QA report JSON from agent log file
        |
        v
      Store report in memory (qaRunner.getReportForTask)
        |
        +--> If fail: notificationManager.onNotification()
```

---

## 7. Theme System Flow

```
User selects theme in Settings
  |
  v
useUpdateSettings().mutate({ colorTheme: 'ocean' })
  |
  v
ipc('settings.update', { colorTheme: 'ocean' })
  |
  v
SettingsService writes to settings.json
  |
  v
React Query cache updated (onSuccess)
  |
  v
SettingsPage re-renders
  |
  v
useThemeStore.setColorTheme('ocean')
  |  src/renderer/shared/stores/theme-store.ts
  v
document.documentElement.setAttribute('data-theme', 'ocean')
  |
  v
CSS [data-theme="ocean"] variables activate
  |  src/renderer/styles/globals.css
  v
All Tailwind classes (bg-primary, text-foreground, etc.)
now reference the ocean theme's CSS custom property values
  |
  v
color-mix() expressions automatically use new values
```

---

## 8. Hub Server Data Flow (Phase 2 — Multi-Device)

```
ELECTRON CLIENT A                 HUB SERVER                    ELECTRON CLIENT B
(Windows Desktop)                 (Docker Container)            (MacBook)
=================                 ==============                =================

User creates task
  |
  v
POST /api/tasks
  |
  v
                              Fastify handler
                                |
                                v
                              SQLite INSERT
                                |
                                v
                              WebSocket broadcast
                              { type: 'task.created', data: {...} }
                                |
                                +--------------------------->
                                                            |
                                                            v
                                                         WebSocket listener
                                                            |
                                                            v
                                                         Update local cache
                                                            |
                                                            v
                                                         React Query invalidation
                                                            |
                                                            v
                                                         UI updates instantly
```

### Hub API Structure

```
hub/
├── src/
│   ├── server.ts           # Fastify instance + plugin registration
│   ├── routes/
│   │   ├── projects.ts     # CRUD /api/projects
│   │   ├── tasks.ts        # CRUD /api/tasks
│   │   ├── settings.ts     # GET/PUT /api/settings
│   │   ├── agents.ts       # Agent management endpoints
│   │   ├── planner.ts      # Daily planner endpoints
│   │   ├── health.ts       # GET /api/health
│   │   └── sync.ts         # Bulk sync endpoint
│   ├── db/
│   │   ├── schema.sql      # SQLite table definitions
│   │   └── connection.ts   # Database connection + migrations
│   ├── ws/
│   │   └── broadcaster.ts  # WebSocket event broadcasting
│   └── auth/
│       └── api-key.ts      # API key validation middleware
└── Dockerfile
```

### Sync Protocol

```
Client connects to hub:
  1. Send last-sync timestamp
  2. Hub returns all changes since that timestamp
  3. Client applies changes to local cache
  4. Client sends any local mutations queued while offline
  5. Hub applies mutations, broadcasts to other clients
  6. Steady-state: WebSocket push for real-time updates
```

---

## 9. MCP Tool Call Flow

```
User clicks action button in Communications panel
  |
  v
SlackActionModal / DiscordActionModal opens
  |
  v
ipc('mcp.listConnected', {})           Check which MCP servers are connected
  |
  v
ipc('mcp.getConnectionState', {})      Get detailed connection state
  |
  v
User fills in action form (channel, message, etc.)
  |
  v
ipc('mcp.callTool', { serverId, toolName, args })
  |
  v
McpManager.callTool(serverId, toolName, args)    mcp-manager.ts
  |
  v
MCP Client sends tool call request               mcp-client.ts
  |
  v
MCP Server executes tool (Slack API, Discord API, etc.)
  |
  v
Result returned to renderer
  |
  v
Toast notification shows success/failure
```

### MCP IPC Channels

| Channel | Purpose |
|---------|---------|
| `mcp.callTool` | Execute a tool on a connected MCP server |
| `mcp.listConnected` | List all connected MCP server IDs |
| `mcp.getConnectionState` | Get connection state for all MCP servers |

---

## 10. Routing Data Flow

```
User clicks sidebar nav item
  |
  v
handleNav(path)                            Sidebar.tsx
  |
  v
navigate({ to: projectViewPath(id, path) })
  |  e.g., '/projects/abc-123/tasks'
  v
TanStack Router matches route pattern
  |  ROUTE_PATTERNS.PROJECT_TASKS = '/projects/$projectId/tasks'
  v
Route component renders                   router.tsx
  |  component: TaskTable
  v
TaskTable mounts
  |
  v
useTasks(projectId) fires query
  |
  v
ipc('tasks.list', { projectId })
  |
  v
TaskService.listTasks(projectId)
  |
  v
Tasks returned, TaskTable renders filterable/sortable rows
```

### Route Hierarchy

Routes are defined across 8 route group files in `src/renderer/app/routes/` and assembled in `routes/index.ts`.

```
/ (RootLayout)
├── /dashboard              -> DashboardPage          (dashboard.routes.ts)
├── /my-work                -> MyWorkPage
├── /alerts                 -> AlertsPage (also accessible via Productivity > Alerts tab)
├── /briefing               -> BriefingPage (also accessible via Productivity > Briefing tab)
├── /communications         -> CommunicationsPage (also accessible via Productivity > Comms tab)
├── /fitness                -> FitnessPage
├── /notes                  -> NotesPage (also accessible via Productivity > Notes tab)
├── /planner                -> PlannerPage (also accessible via Productivity > Planner tab)
├── /planner/weekly         -> WeeklyReviewPage
├── /productivity           -> ProductivityPage (8 tabs: Overview, Calendar, Spotify, Briefing, Notes, Planner, Alerts, Comms)
├── /projects               -> ProjectListPage
├── /projects/$projectId    -> redirect to /tasks
│   ├── /tasks              -> TaskDataGrid
│   ├── /terminals          -> TerminalGrid
│   ├── /agents             -> AgentDashboard
│   ├── /roadmap            -> RoadmapPage
│   ├── /ideation           -> IdeationPage
│   ├── /github             -> GitHubPage
│   ├── /changelog          -> ChangelogPage
│   └── /insights           -> InsightsPage
├── /login                  -> LoginPage (unauthenticated)
├── /register               -> RegisterPage (unauthenticated)
└── /settings               -> SettingsPage (6-tab layout: Display, Profile, Hub, Integrations, Storage, Advanced)
```

---

## 11. Auth Flow (Login -> JWT -> Refresh -> IPC)

```
User submits login form
  |
  v
useLogin().mutate({ email, password })
  |
  v
ipc('auth.login', { email, password })
  |
  v
                              auth-handlers.ts
                                |
                                v
                              hubAuthService.login(email, password)
                                |  src/main/services/hub/hub-auth-service.ts
                                v
                              POST /api/auth/login
                                { email, password }
                                                                  |
                                                                  v
                                                              Validate credentials
                                                              Generate JWT access + refresh tokens
                                                                  |
                                                                  v
                              <---- { accessToken, refreshToken, user } ---
                                |
                                v
                              tokenStore.setTokens({ accessToken, refreshToken })
                                |  Encrypted via safeStorage
                                v
                              Return { user } to renderer
                                |
                                v
useAuthStore.setUser(user)
  |
  v
AuthGuard allows navigation to protected routes
```

### Token Refresh

```
API call returns 401 Unauthorized
  |
  v
hubApiClient interceptor detects expired token
  |
  v
hubAuthService.refreshToken()
  |
  v
POST /api/auth/refresh { refreshToken }
  |
  v
New { accessToken, refreshToken } returned
  |
  v
tokenStore.setTokens(newTokens)
  |
  v
Original API call retried with new token
```

### Session Restore (on app startup)

```
App starts / renderer mounts AuthGuard
  |
  v
ipc('auth.restore', {})
  |
  v
                              auth-handlers.ts
                                |
                                v
                              hubAuthService.restoreSession()
                                |  Reads encrypted tokens from tokenStore
                                v
                              Has stored refreshToken?
                                |
                           NO --+-- YES
                           |         |
                           v         v
                    Return       POST /api/auth/refresh { refreshToken }
                    { restored:    |
                      false }      v
                                 Valid? Return { restored: true, user, tokens }
                                 Invalid? Clear tokens, return { restored: false }
```

---

## 12. Local-First Task CRUD Flow

All task operations go through `TaskRepository`, which always reads/writes locally first and mirrors mutations to Hub when connected.

### Read Flow (list/get)

```
User views task dashboard
  |
  v
useTasks(projectId) → ipc('hub.tasks.list', { projectId })
  |
  v
                              hub-task-handlers.ts
                                |
                                v
                              taskRepository.listTasks({ projectId })
                                |  src/main/services/tasks/task-repository.ts
                                v
                              taskService.listTasks(projectId)
                                |  reads .adc/specs/ directories (always local)
                                v
                              localToHubTask() converts local → HubTask shape
                                |
                                v
                              Return { tasks: HubTask[] }
```

### Write Flow (create/update/delete)

```
User creates a task (CreateTaskDialog)
  |
  v
useCreateTask().mutate({ projectId, title, description, priority })
  |
  v
ipc('hub.tasks.create', { ... })
  |
  v
                              hub-task-handlers.ts
                                |
                                v
                              taskRepository.createTask(body)
                                |
                                +→ taskService.createTask(draft)    ← ALWAYS (local .adc/specs/)
                                |    Creates UUID-based task dir
                                |    Writes requirements.json + task_metadata.json
                                |
                                +→ mirrorToHub(() =>                ← OPTIONAL (fire-and-forget)
                                |    hubApiClient.createTask(body))
                                |    Only runs when Hub is connected
                                |    Logs warnings on failure
                                |
                                v
                              Return HubTask (from local data, immediate)
```

### Hub-Only Operations (execute/cancel)

```
User clicks "Execute" (remote dispatch)
  |
  v
ipc('hub.tasks.execute', { taskId })
  |
  v
                              taskRepository.executeTask(taskId)
                                |
                                +-→ Hub not connected? → throw Error
                                |
                                +-→ hubApiClient.executeTask(taskId)
                                     |
                                     v
                                   POST /api/tasks/:id/execute
                                     → Hub dispatches to target device
```

### Reverse Flow (Hub WebSocket → Local Update)

```
HUB SERVER                      MAIN PROCESS                    RENDERER
==========                      ============                    ========

WebSocket broadcast
  { type: 'task.updated', ... }
                              hub-connection.ts receives
                                |
                                v
                              event-wiring: taskRepository.updateTask()
                                |  Updates local .adc/specs/ files
                                v
                              router.emit('event:hub.tasks.updated', payload)
                                |
                                v
                              BrowserWindow.webContents.send(...)
                                                                  |
                                                                  v
                                                              useHubEvent('event:hub.tasks.updated')
                                                                  |
                                                                  v
                                                              queryClient.invalidateQueries()
                                                                  |
                                                                  v
                                                              React Query refetches from TaskRepository (local)
```

---

## 13. Device Heartbeat Flow

```
APP STARTUP
  |
  v
app.whenReady()
  |
  v
deviceService.registerDevice({
  machineId, deviceName, deviceType, capabilities, appVersion
})
  |
  v
POST /api/devices/register
  |
  v
Hub returns { deviceId }
Hub broadcasts: { type: 'device.online', deviceId, name }
  |
  v
heartbeatService.start(deviceId)
  |
  v
setInterval(tick, 30_000)
  |
  v (every 30 seconds)
  +--- deviceService.sendHeartbeat(deviceId)
  |      |
  |      v
  |    POST /api/devices/:id/heartbeat
  |      |
  |      v
  |    Hub updates last_seen_at
  |
  +--- On error: log warning, continue heartbeat timer
  |
  v (on app quit)
heartbeatService.stop()
  |
  v
clearInterval(timer)
```

---

## 14. Proactive Token Refresh Flow

```
AuthGuard mounts
  |
  v
useTokenRefresh()                              useTokenRefresh.ts
  |
  v
Read expiresAt from useAuthStore
  |
  v
Calculate: timeUntilRefresh = expiresAt - Date.now() - REFRESH_BUFFER_MS (2 min)
  |
  v
setTimeout(refreshCallback, timeUntilRefresh)
  |
  v (timer fires)
useRefreshToken().mutate()
  |
  v
ipc('auth.refreshToken', { refreshToken })
  |
  v
                              auth-handlers.ts → hubAuthService.refreshToken()
                                |
                                v
                              POST /api/auth/refresh
                                |
                                v
                              New { accessToken, refreshToken, expiresIn }
                                |
                                v
                              tokenStore.setTokens(newTokens)
  |
  v
onSuccess:
  setExpiresAt(Date.now() + expiresIn * 1000)    auth store
  updateTokens(newTokens)                          auth store
  → Effect re-runs → new setTimeout scheduled
  |
  v
onError:
  clearAuth()                                     auth store
  → Redirect to /login
```

### Key Files
| File | Purpose |
|------|---------|
| `src/renderer/features/auth/hooks/useTokenRefresh.ts` | Timer hook, mounts in AuthGuard |
| `src/renderer/features/auth/store.ts` | `expiresAt` field, `setExpiresAt` action |
| `src/renderer/features/auth/api/useAuth.ts` | Sets `expiresAt` on login/register/refresh |

---

## 15. Mutation Error Toast Flow

```
React mutation fires
  |
  v
useMutation({ onError: onError('create task') })
  |
  v
Mutation fails (Hub disconnect, network error, server error)
  |
  v
onError callback fires                         useMutationErrorToast.ts
  |
  v
Extract error message from Error object
  |
  v
console.error('[Mutation Error]', action, error)
  |
  v
useToastStore.getState().addToast({
  id: crypto.randomUUID(),
  message: `Failed to ${action}: ${errorMessage}`,
  type: 'error'
})
  |
  v
toast-store.ts (Zustand)                       toast-store.ts
  |
  +--> Cap at 3 visible toasts (remove oldest if over)
  |
  +--> Schedule auto-dismiss: setTimeout(removeToast, 5000)
  |
  v
MutationErrorToast component re-renders         MutationErrorToast.tsx
  |  (mounted in RootLayout.tsx, fixed bottom-right)
  v
Renders toast with:
  - AlertTriangle icon
  - Error message text
  - Dismiss (X) button
  - role="alert" aria-live="assertive"
  |
  v (after 5s)
Toast auto-removes from store → component re-renders → toast fades
```

### Key Files
| File | Purpose |
|------|---------|
| `src/renderer/shared/hooks/useMutationErrorToast.ts` | `onError(action)` factory hook |
| `src/renderer/shared/stores/toast-store.ts` | Zustand store: addToast, removeToast |
| `src/renderer/shared/components/MutationErrorToast.tsx` | Toast renderer in RootLayout |

---

## 16. Delete Confirmation Flow

```
User clicks delete button (task or project)
  |
  v
Component sets confirmOpen = true              TaskControls.tsx / ActionsCell.tsx
  |
  v
<ConfirmDialog
  open={confirmOpen}
  title="Delete Task"
  description="Are you sure? This cannot be undone."
  variant="destructive"
  onConfirm={handleDelete}
  loading={deleteMutation.isPending}
/>
  |
  v
ConfirmDialog renders modal overlay            ConfirmDialog.tsx
  |
  +--> Escape key → onOpenChange(false) → dialog closes, no action
  +--> Backdrop click → onOpenChange(false) → dialog closes, no action
  +--> Cancel button → onOpenChange(false) → dialog closes, no action
  |
  +--> Confirm button clicked:
       |
       v
     onConfirm() fires
       |
       v
     useDeleteTask().mutate({ taskId, projectId })
       |
       v
     ipc('hub.tasks.delete', { taskId })
       |
       v
     Loading spinner shown (loading={isPending})
       |
       v
     onSuccess: setConfirmOpen(false) → dialog closes
     onError: toast shown via useMutationErrorToast
```

### Key Files
| File | Purpose |
|------|---------|
| `src/renderer/shared/components/ConfirmDialog.tsx` | Reusable confirmation dialog |
| `src/renderer/features/tasks/components/detail/TaskControls.tsx` | Task detail panel delete |
| `src/renderer/features/tasks/components/cells/ActionsCell.tsx` | Grid row delete action |
| `src/renderer/features/projects/components/ProjectEditDialog.tsx` | Project delete (nested confirm) |

---

## 17. Task Creation Dialog Flow

```
User clicks "New Task" button                  TaskFiltersToolbar.tsx
  |
  v
useTaskStore.setCreateDialogOpen(true)         tasks/store.ts
  |
  v
<CreateTaskDialog />                           CreateTaskDialog.tsx
  |
  v
Dialog renders form:
  - Title (required, text input)
  - Description (optional, textarea)
  - Priority (select: low/normal/high/urgent, default: normal)
  |
  v
User fills form and clicks "Create Task"
  |
  v
Validate: title is non-empty
  |
  v
useCreateTask().mutate({
  projectId: activeProjectId,
  title, description, priority
})
  |
  v
ipc('hub.tasks.create', { projectId, title, description, priority })
  |
  v
                              task-handlers.ts → hubApiClient.createTask(...)
                                |
                                v
                              POST /api/tasks
                                |
                                v
                              Hub creates task, WS broadcasts task.created
  |
  v
onSuccess:
  Reset form fields
  setCreateDialogOpen(false)
  React Query cache invalidated → grid refreshes → new task visible
  |
  v
onError:
  Show error message in dialog (inline, not toast)
```

### Key Files
| File | Purpose |
|------|---------|
| `src/renderer/features/tasks/components/CreateTaskDialog.tsx` | Task creation form dialog |
| `src/renderer/features/tasks/components/TaskFiltersToolbar.tsx` | "New Task" button |
| `src/renderer/features/tasks/store.ts` | `createDialogOpen` state |
| `src/renderer/features/tasks/api/useTasks.ts` | `useCreateTask()` mutation |

---

## 18. Assistant Widget Data Flow

```
USER INPUT                        RENDERER                           MAIN PROCESS
==========                        ========                           ============

Types in WidgetInput
  |
  v
handleSubmit(input)
  |
  v
useSendCommand().mutate({ input })
  |
  v
onMutate:
  setIsThinking(true)
  clearCurrentResponse()
  |
  v
ipc('assistant.sendCommand', {
  input,
  context: { activeProjectId, currentPage, todayDate }
})
                                                                      |
                                                                      v
                                                                    assistant-handlers.ts
                                                                      → assistantService.sendCommand()
                                                                      → Intent classification
                                                                      → Command execution
                                                                      → Returns { content, type, intent }
  |
  v
onSuccess:
  setCurrentResponse(data.content)
  addResponseEntry({ input, response, type, intent })
  invalidateQueries(assistantKeys.history())
  |
  v
onSettled:
  setIsThinking(false)
  |
  v
WidgetMessageArea re-renders with new entry
```

### Unread Tracking Flow

```
MAIN PROCESS                      RENDERER
============                      ========

event:assistant.response fires
  |
  v
                                  useAssistantEvents() receives
                                    |
                                    v
                                  Is widget open? (useAssistantWidgetStore)
                                    |
                                    ├─ YES → no action (user sees response live)
                                    |
                                    └─ NO → incrementUnread()
                                              |
                                              v
                                            WidgetFab shows badge with count
                                              |
                                              v
                                            User opens widget (click or Ctrl+J)
                                              |
                                              v
                                            resetUnread()
                                              |
                                              v
                                            Badge disappears
```

### Key Files
| File | Purpose |
|------|---------|
| `src/renderer/features/assistant/components/AssistantWidget.tsx` | Orchestrator: FAB + Panel + keyboard shortcuts |
| `src/renderer/features/assistant/components/WidgetFab.tsx` | FAB button with unread badge |
| `src/renderer/features/assistant/components/WidgetPanel.tsx` | Chat panel with header, messages, quick actions, input |
| `src/renderer/features/assistant/components/WidgetMessageArea.tsx` | Message display with auto-scroll |
| `src/renderer/features/assistant/components/WidgetInput.tsx` | Textarea input with send button |
| `src/renderer/features/assistant/store.ts` | Response history, isThinking, unreadCount |
| `src/renderer/shared/stores/assistant-widget-store.ts` | Widget open/close state |
| `src/renderer/features/assistant/hooks/useAssistantEvents.ts` | IPC event → store updates + unread tracking |
| `src/renderer/features/assistant/api/useAssistant.ts` | useSendCommand, useHistory, useClearHistory |

---

## 19. Agent Orchestrator Lifecycle Flow

```
User triggers agent spawn (via ActionsCell → useAgentMutations)
  |
  v
ipc('agent.startPlanning' | 'agent.startExecution', { taskId, ... })
  |
  v
agent-orchestrator-handlers.ts → taskRepository.updateTaskStatus() → orchestrator.spawn()
  |  src/main/services/agent-orchestrator/agent-orchestrator.ts
  v
child_process.spawn('claude', ['-p', prompt], { detached: true, stdio: 'pipe' })
  |  Claude hooks config installed (PostToolUse + Stop hooks write JSONL)
  v
Session state: 'spawned' → 'active'
  |
  +--> onSessionEvent('spawned') fires
  |     |
  |     v
  |   index.ts wiring → router.emit('event:agent.orchestrator.heartbeat')
  |
  +--> JSONL Progress Watcher monitors {dataDir}/progress/{taskId}.jsonl
  |     |  src/main/services/agent-orchestrator/jsonl-progress-watcher.ts
  |     v
  |   Debounced tail parser reads new lines (100ms debounce)
  |     |
  |     +--> type: 'tool_use' → emit progress + heartbeat events
  |     +--> type: 'phase_change' → emit progress event
  |     +--> type: 'plan_ready' → emit planReady event
  |     +--> type: 'agent_stopped' → emit stopped event
  |     +--> type: 'error' → emit error event
  |     +--> type: 'heartbeat' → emit heartbeat event
  |
  +--> Agent Watchdog checks every 30s        agent-watchdog.ts
  |     |
  |     +--> process.kill(pid, 0) — PID alive check
  |     +--> heartbeatAge > 5min → 'warning' alert
  |     +--> heartbeatAge > 15min → 'stale' alert
  |     +--> PID dead → 'dead' alert
  |     +--> exitCode 2 + autoRestart → restart from checkpoint
  |     |
  |     v
  |   index.ts wiring → router.emit('event:agent.orchestrator.watchdogAlert')
  |     → useAgentEvents → invalidate task caches → StatusBadgeCell shows alert
  |
  +--> On process exit:
        |
        +--> exitCode === 0: session state → 'completed'
        |     router.emit('event:agent.orchestrator.stopped', { reason: 'completed' })
        |
        +--> exitCode !== 0: session state → 'error'
              router.emit('event:agent.orchestrator.error', { error: '...' })
```

### Renderer Event Subscription Chain

```
TaskDataGrid mounts
  → useTaskEvents()
    → useAgentEvents()    — subscribes to 6 orchestrator event channels
    → useQaEvents()       — subscribes to 3 QA event channels
```

### Key Files
| File | Purpose |
|------|---------|
| `src/main/services/agent-orchestrator/agent-orchestrator.ts` | Session lifecycle (spawn, kill, getSession, listActive) |
| `src/main/services/agent-orchestrator/jsonl-progress-watcher.ts` | Incremental JSONL tail parser (100ms debounce) |
| `src/main/services/agent-orchestrator/agent-watchdog.ts` | Health monitoring (30s interval, PID + heartbeat checks) |
| `src/main/services/agent-orchestrator/hooks-template.ts` | Claude hooks config generator (PostToolUse + Stop). Merges hooks into `.claude/settings.local.json` (saves original content for restoration on cleanup) |
| `src/main/services/agent-orchestrator/types.ts` | AgentSession (incl. `originalSettingsContent`), SpawnOptions, ProgressEntry types |
| `src/main/ipc/handlers/agent-orchestrator-handlers.ts` | 7 IPC channels (startPlanning/startExecution/replanWithFeedback/kill/restart/get/list) |
| `src/main/index.ts` | Event forwarding + watchdog wiring |
| `src/main/bootstrap/event-wiring.ts` | Event forwarding setup; includes plan file detection on planning completion |
| `src/renderer/features/tasks/hooks/useAgentEvents.ts` | 6 orchestrator event listeners → cache updates |
| `src/renderer/features/tasks/api/useAgentMutations.ts` | 5 mutation hooks (planning/execution/replanWithFeedback/kill/restart) |
| `src/renderer/features/tasks/components/detail/PlanFeedbackDialog.tsx` | Feedback dialog for requesting changes to a plan |
| `src/renderer/features/tasks/components/detail/PlanViewer.tsx` | Plan display with Approve, Request Changes buttons |

---

## 19.5. Task Planning Pipeline Flow (Local-First)

The complete planning pipeline: idea → plan → review → approve/reject/request changes → execute.
All status transitions go through `TaskRepository` (local-first with Hub mirror).

```
User creates task (idea/backlog)
  |
  v
User clicks "Start Planning" (ActionsCell)
  |
  v
useStartPlanning().mutate({ taskId, projectPath, taskDescription })
  |
  v
ipc('agent.startPlanning', { ... })
  |
  v
taskRepository.updateTaskStatus(taskId, 'planning')    ← local + Hub mirror
  → orchestrator.spawn({ phase: 'planning', prompt: '/plan-feature ...' })
    → Hooks config merged into .claude/settings.local.json
    → Agent writes JSONL progress to {dataDir}/progress/{taskId}.jsonl
  |
  v
Agent completes planning (process exits)
  |
  v
event-wiring.ts: onSessionEvent('completed') + phase === 'planning'
  → Scan project for plan files (PLAN.md, plan.md, etc.)
  → If plan file found:
      taskRepository.updateTaskStatus(taskId, 'plan_ready')      ← local + Hub mirror
      taskRepository.updateTask(taskId, { metadata: { planContent, planFilePath } })
      router.emit('event:agent.orchestrator.planReady', { taskId, planSummary, planFilePath })
  → Restore original .claude/settings.local.json content
  |
  v
Renderer: useAgentEvents receives planReady event
  → Task status shows "plan_ready" with pulsing indicator
  → TaskDetailRow expands PlanViewer with plan content
  |
  v
User reviews plan in PlanViewer
  |
  ├── "Approve & Execute" clicked:
  |     |
  |     v
  |   useStartExecution().mutate({ taskId, projectPath, taskDescription, planRef })
  |     → planRef points to the plan file path for the execution agent to follow
  |     → Task transitions: plan_ready → executing
  |
  ├── "Request Changes" clicked:
  |     |
  |     v
  |   PlanFeedbackDialog opens
  |     → User types feedback (what to change in the plan)
  |     → Submit calls useReplanWithFeedback().mutate({ taskId, feedback, ... })
  |       |
  |       v
  |     ipc('agent.replanWithFeedback', { taskId, feedback, previousPlanPath })
  |       → Spawns new planning agent with feedback context
  |       → Task transitions: plan_ready → planning
  |       → Cycle repeats until approved
  |
  └── "Reject" (or manual status change):
        → Task returns to backlog/todo
```

### CLI Commands

| Command | File | Purpose |
|---------|------|---------|
| `/plan-feature` | `.claude/commands/plan-feature.md` | Planning agent prompt — creates a feature plan file |
| `/resume-feature` | `.claude/commands/resume-feature.md` | Resume a previously started feature |

---

## 20. QA Runner Flow

```
User triggers QA (via QaReportViewer or automatic after agent completion)
  |
  v
useStartQuietQa / useStartFullQa mutation      useQaMutations.ts
  |
  v
ipc('qa.startQuiet', { taskId })                qa-handlers.ts
  |
  v
qaRunner.startQuiet(taskId, context)             qa-runner.ts
  |  Spawns a Claude agent via orchestrator.spawn({ phase: 'qa' })
  v
QA agent runs verification suite:
  |  npm run lint && npm run typecheck && npm run test && npm run build && npm run check:docs
  |
  +--> router.emit('event:qa.started', { taskId, mode })
  |      → useQaEvents → invalidate session cache
  |
  +--> router.emit('event:qa.progress', { taskId, step, total, current })
  |      → useQaEvents → invalidate session cache
  |
  +--> On completion:
        |
        v
      Parse QA report JSON from agent log file
        |
        v
      router.emit('event:qa.completed', { taskId, result, issueCount })
        → useQaEvents → invalidate report + session + task caches + toast
        |
        +--> If fail: notificationManager.onNotification()
              → WidgetFab shows unread badge
```

### Key Files
| File | Purpose |
|------|---------|
| `src/main/services/qa/qa-runner.ts` | QA session orchestration (quiet + full modes) |
| `src/main/services/qa/qa-report-parser.ts` | Parse QA report JSON from agent output |
| `src/main/services/qa/qa-types.ts` | QaRunner, QaSession, QaReport types |
| `src/main/ipc/handlers/qa-handlers.ts` | 5 IPC channels + event wiring |
| `src/renderer/features/tasks/api/useQaMutations.ts` | Query + mutation hooks (report, session, start, cancel) |
| `src/renderer/features/tasks/hooks/useQaEvents.ts` | 3 QA event listeners → cache + toast updates |
| `src/renderer/features/tasks/components/detail/QaReportViewer.tsx` | QA report display + trigger buttons |

---

## 21. Watch Subscription Flow

```
User says "tell me when task 123 is done"
  |
  v
Assistant classifies intent: type='subscription', action='watch_create'
  |
  v
Command executor calls watchStore.add({
  type: 'task_completed',
  targetId: '123',
  condition: { field: 'status', operator: 'equals', value: 'done' },
  action: 'notify'
})
  |  src/main/services/assistant/watch-store.ts
  v
Watch persisted to userData/assistant-watches.json
  |
  v
WatchEvaluator is already listening to IPC events:
  - event:hub.tasks.updated
  - event:hub.tasks.completed
  - event:task.statusChanged
  - event:hub.devices.online/offline
  - event:agent.orchestrator.error/stopped
  |  src/main/services/assistant/watch-evaluator.ts
  v
When matching event fires:
  |
  v
watchStore.markTriggered(watchId)
  |
  v
onTrigger callback fires (registered in index.ts)
  |
  v
router.emit('event:assistant.proactive', {
  content: 'Watch triggered: task_completed watch on 123',
  source: 'watch',
  taskId: '123'
})
  |
  v
Renderer: WidgetFab unread badge + WidgetMessageArea proactive entry
```

### Key Files
| File | Purpose |
|------|---------|
| `src/main/services/assistant/watch-store.ts` | JSON persistence for watches |
| `src/main/services/assistant/watch-evaluator.ts` | IPC event matching engine |
| `src/main/index.ts` (lines 450-460) | Trigger → proactive event wiring |
| `src/shared/types/assistant-watch.ts` | Watch type definitions |

---

## 22. Cross-Device Query Flow

```
User asks "what's running on my MacBook?"
  |
  v
Assistant classifies intent: type='cross_device'
  |
  v
Command executor calls crossDeviceQuery.query('MacBook')
  |  src/main/services/assistant/cross-device-query.ts
  v
hubApiClient.hubGet('/devices')
  |
  v
Filter devices by name match (case-insensitive)
  |
  v
For each online device:
  hubApiClient.hubGet('/tasks?assignedDeviceId={id}')
  |
  v
Format response:
  "[online] MacBook Pro (last seen just now)
      - Implement auth [in_progress]
      - Fix sidebar bug [completed]"
  |
  v
Return formatted string as assistant response
```

---

## 23. Insights Data Wiring Flow

```
Renderer requests metrics
  |
  v
ipc('insights.getMetrics', { projectId })
  |
  v
insightsService.getMetrics(projectId)
  |  src/main/services/insights/insights-service.ts
  v
┌───────────────────────────────┐
│ Aggregate from multiple sources│
│                               │
│ taskService.listTasks()       │─── totalTasks, completedTasks, completionRate
│ agentService.listAgents()     │─── agentRunCount, agentSuccessRate, activeAgents
│ agentOrchestrator?.getSessions│─── orchestratorSessionsToday, orchestratorSuccessRate
│                               │    averageAgentDuration
│ qaRunner?.getReports()        │─── qaPassRate
│                               │
└───────────────┬───────────────┘
                |
                v
Return InsightMetrics {
  totalTasks, completedTasks, completionRate,
  agentRunCount, agentSuccessRate, activeAgents,
  orchestratorSessionsToday?,    // NEW — from orchestrator
  orchestratorSuccessRate?,       // NEW — from orchestrator
  averageAgentDuration?,          // NEW — from orchestrator
  qaPassRate?,                    // NEW — from QA runner
  totalTokenCost?                 // NEW — from orchestrator
}
```

## 24. Merge Diff Flow

```
WorktreeManager → MergeConfirmModal → MergePreviewPanel
  → useMergeDiff() → merge.previewDiff → mergeService.previewDiff()
  → [user clicks file] → useFileDiff() → merge.getFileDiff → mergeService.getFileDiff()
  → @git-diff-view/react renders unified/split diff with ADC theme overrides
```

### Component Wiring

```
MergeConfirmModal.tsx (near-fullscreen, tabs, loading states)
  |
  v
MergePreviewPanel.tsx (file list + inline diff viewer)
  |
  +--> useMergeDiff(projectId, sourceBranch, targetBranch)
  |      → ipc('merge.previewDiff', { projectId, sourceBranch, targetBranch })
  |      → Returns { files: MergeDiffFile[], conflicts: string[] }
  |
  +--> [user selects file from list]
  |      → useFileDiff(projectId, filePath, sourceBranch, targetBranch)
  |        → ipc('merge.getFileDiff', { projectId, filePath, sourceBranch, targetBranch })
  |        → Returns raw unified diff string
  |
  +--> FileDiffViewer.tsx
         → @git-diff-view/react DiffView component
         → Theme integration via .diff-viewer-adc-theme CSS class (globals.css)
         → Supports unified and split view modes

ConflictResolver.tsx
  → Inline diff display for conflicting files
  → Accept Ours / Accept Theirs buttons per conflict
```

### Key Files
| File | Purpose |
|------|---------|
| `src/renderer/features/merge/components/MergeConfirmModal.tsx` | Near-fullscreen merge dialog with tabs and loading states |
| `src/renderer/features/merge/components/MergePreviewPanel.tsx` | File list + diff viewer orchestration |
| `src/renderer/features/merge/components/FileDiffViewer.tsx` | @git-diff-view/react wrapper with ADC theme |
| `src/renderer/features/merge/components/ConflictResolver.tsx` | Inline diff + accept ours/theirs |
| `src/renderer/features/merge/api/useMerge.ts` | useFileDiff hook |
| `src/renderer/features/merge/api/queryKeys.ts` | fileDiff cache key |
| `src/main/services/merge/merge-service.ts` | getFileDiff method |
| `src/main/ipc/handlers/merge-handlers.ts` | merge.getFileDiff handler |
| `src/shared/ipc/misc/merge.contract.ts` | merge.getFileDiff contract |
| `src/renderer/styles/globals.css` | .diff-viewer-adc-theme CSS overrides |

---

## 25. OAuth Authorization Flow

```
Settings → OAuthProviderSettings → OAuthConnectionStatus
  → useOAuthStatus() → oauth.isAuthenticated → oauthManager.isAuthenticated()
  → [user clicks Connect] → useOAuthAuthorize() → oauth.authorize → oauthManager.authorize()
    → BrowserWindow opens consent page → code exchange → token stored
  → [user clicks Disconnect] → useOAuthRevoke() → oauth.revoke → oauthManager.revoke()
```

### Component Wiring

```
SettingsPage.tsx
  |
  v
OAuthProviderSettings.tsx (client ID/secret configuration)
  |
  v
OAuthConnectionStatus.tsx (Connect/Disconnect buttons per provider)
  |
  +--> useOAuthStatus(provider)
  |      → ipc('oauth.isAuthenticated', { provider })
  |      → Returns { authenticated: boolean }
  |
  +--> [user clicks "Connect"]
  |      → useOAuthAuthorize().mutate({ provider })
  |        → ipc('oauth.authorize', { provider })
  |        → oauthManager.authorize(provider)
  |          → Opens BrowserWindow with provider consent URL
  |          → User grants access → redirect with auth code
  |          → Code exchanged for tokens → stored in tokenStore
  |        → Returns { success: true }
  |        → Query invalidation → status refreshes to "Connected"
  |
  +--> [user clicks "Disconnect"]
         → useOAuthRevoke().mutate({ provider })
           → ipc('oauth.revoke', { provider })
           → oauthManager.revoke(provider)
             → Clears stored tokens for provider
           → Query invalidation → status refreshes to "Disconnected"
```

### IPC Channels

| Channel | Input | Output | Purpose |
|---------|-------|--------|---------|
| `oauth.authorize` | `{ provider: string }` | `{ success: boolean }` | Trigger OAuth consent flow in BrowserWindow |
| `oauth.isAuthenticated` | `{ provider: string }` | `{ authenticated: boolean }` | Check if provider has valid tokens |
| `oauth.revoke` | `{ provider: string }` | `{ success: boolean }` | Revoke/clear stored tokens |

### Key Files
| File | Purpose |
|------|---------|
| `src/shared/ipc/oauth/schemas.ts` | Zod schemas for OAuth channels |
| `src/shared/ipc/oauth/contract.ts` | OAuth IPC contract (3 channels) |
| `src/shared/ipc/oauth/index.ts` | OAuth barrel export |
| `src/main/ipc/handlers/oauth-handlers.ts` | OAuth handler registration |
| `src/renderer/features/settings/api/useOAuth.ts` | React Query hooks (useOAuthStatus, useOAuthAuthorize, useOAuthRevoke) |
| `src/renderer/features/settings/components/OAuthConnectionStatus.tsx` | Connect/Disconnect UI per provider |
| `src/renderer/features/settings/components/OAuthProviderSettings.tsx` | Provider configuration + OAuthConnectionStatus |

---

## 26. Error & Health Monitoring Flow

### Error Collection Flow

```
Service throws error (or initNonCritical catches factory failure)
  |
  v
errorCollector.report({ severity, tier, category, message, stack? })
  |  src/main/services/health/error-collector.ts
  v
Append entry to in-memory log + persist to {userData}/error-log.json
  |
  +--> Prune entries older than 7 days on load
  |
  +--> router.emit('event:app.error', entry)
  |      |
  |      v
  |    Renderer receives via useIpcEvent → error dashboard / notification
  |
  +--> If log count > capacity threshold:
        |
        v
      router.emit('event:app.capacityAlert', { count, message })
        |
        v
      Renderer receives → capacity warning notification
```

### Health Registry Flow

```
Service performs periodic work (e.g., Hub heartbeat, WebSocket message)
  |
  v
healthRegistry.pulse('hubHeartbeat')
  |  src/main/services/health/health-registry.ts
  v
Updates lastPulse timestamp for the named service
  |
  v
Background sweep (runs on interval):
  |
  +--> For each registered service:
  |      Check: Date.now() - lastPulse > expectedInterval
  |      |
  |      +--> Within threshold → healthy, reset missedCount
  |      |
  |      +--> Exceeds threshold → increment missedCount
  |           |
  |           v
  |         onUnhealthy(serviceName, missedCount)
  |           |
  |           v
  |         router.emit('event:app.serviceUnhealthy', { serviceName, missedCount })
  |           |
  |           v
  |         Renderer receives → service health dashboard / alert
  |
  v
Renderer queries status via ipc('app.getHealthStatus', {})
  |
  v
Returns HealthStatus: { services: ServiceHealth[], overall: 'healthy' | 'degraded' | 'unhealthy' }
```

### Agent Watchdog Flow

```
agentWatchdog.start()                      agent-watchdog.ts
  |  Created in service-registry.ts, started immediately
  v
setInterval(checkNow, 30_000)
  |
  v (every 30 seconds)
  +--- For each active session in orchestrator.listActive():
  |      |
  |      +--> process.kill(pid, 0) — PID alive check
  |      |      |
  |      |      +--> Throws → 'dead' alert (process exited unexpectedly)
  |      |      |
  |      |      +--> OK → check heartbeat age
  |      |             |
  |      |             +--> heartbeatAge > 15min → 'stale' alert
  |      |             +--> heartbeatAge > 5min → 'warning' alert
  |      |             +--> Otherwise → healthy
  |      |
  |      +--> exitCode === 2 + autoRestart enabled → restart from checkpoint
  |
  v
onAlert callback fires (registered in service-registry.ts):
  |
  v
router.emit('event:agent.orchestrator.watchdogAlert', {
  type: 'dead' | 'stale' | 'warning',
  sessionId, taskId, message, suggestedAction
})
  |
  v
useAgentEvents → invalidate task caches → StatusBadgeCell shows alert
```

### IPC Invoke Channels

| Channel | Input | Output | Purpose |
|---------|-------|--------|---------|
| `app.getErrorLog` | `{ since?: string }` | `{ entries: ErrorEntry[] }` | Fetch error log entries |
| `app.getErrorStats` | `{}` | `ErrorStats` | Aggregated error statistics |
| `app.clearErrorLog` | `{}` | `{ success: boolean }` | Clear the error log |
| `app.reportRendererError` | `{ severity, tier, category, message, stack?, route?, routeHistory?, projectId? }` | `{ success: boolean }` | Report an error from the renderer process |
| `app.getHealthStatus` | `{}` | `HealthStatus` | Get health status of all services |

### IPC Event Channels

| Channel | Payload | When |
|---------|---------|------|
| `event:app.error` | `ErrorEntry` | New error collected |
| `event:app.dataRecovery` | `{ store, recoveredFrom, message }` | JSON store recovered from backup or defaults |
| `event:app.capacityAlert` | `{ count, message }` | Error log nearing capacity |
| `event:app.serviceUnhealthy` | `{ serviceName, missedCount }` | Service missed health pulses |

### Types

Defined in `src/shared/types/health.ts`:
- `ErrorSeverity`, `ErrorTier`, `ErrorCategory` — union type enums
- `ErrorContext` — route, project, task, and agent context at time of error
- `ErrorEntry` — single error log entry with id, timestamp, severity, tier, category, message, stack, context
- `ErrorStats` — aggregated counts by tier, severity, and last 24h
- `ServiceHealthStatus`, `ServiceHealth`, `HealthStatus` — service pulse monitoring

### Key Files
| File | Purpose |
|------|---------|
| `src/main/services/health/error-collector.ts` | Error log persistence + pruning + capacity alerts |
| `src/main/services/health/health-registry.ts` | Service pulse monitoring + unhealthy callbacks |
| `src/main/services/agent-orchestrator/agent-watchdog.ts` | Agent process health (PID + heartbeat) |
| `src/main/services/qa/qa-trigger.ts` | Automatic QA on task status change to review |
| `src/main/bootstrap/service-registry.ts` | Wires all monitoring services + initNonCritical wrapper |
| `src/main/bootstrap/lifecycle.ts` | Graceful shutdown (disposes health + error last) |
| `src/shared/ipc/health/contract.ts` | IPC contract for error/health channels |
| `src/shared/ipc/health/schemas.ts` | Zod schemas for error/health payloads |

---

## 27. Data Management & Cleanup Flow

### Storage Inspection Flow

```
Settings → Storage Management section
  |
  v
useDataRegistry() → ipc('dataManagement.getRegistry', {})
  → data-management-handlers.ts → DATA_STORE_REGISTRY (static)
  → Returns: DataStoreEntry[] (22+ stores with lifecycle, retention metadata)

useDataUsage() → ipc('dataManagement.getUsage', {})
  → data-management-handlers.ts → storageInspector.getUsage()
  → For each store: statSync file/dir → sizeBytes, itemCount
  → Returns: DataStoreUsage[]

StorageUsageBar renders proportional segments by lifecycle category
RetentionControl cards render per-store with usage stats
```

### Cleanup Service Flow

```
App starts
  → lifecycle.ts → crashRecovery.recover()
    → Detect orphaned hooks in .claude/settings.local.json
    → Remove stale progress files (>24h, no active session)
    → Remove stale QA dirs (>7 days)
    → Returns: { fixed: number, details: string[] }
  → cleanupService.start()
    → 30s delay → initial cleanup run
    → setInterval(cleanupIntervalHours) → periodic runs

Each cleanup run:
  → Read DATA_STORE_REGISTRY
  → Get user retention overrides from settings
  → For each store with cleanup function:
    → Merge default + user retention
    → Run store-specific cleaner (prune by age/count)
    → Sum cleaned items + freed bytes
  → router.emit('event:dataManagement.cleanupComplete', { cleaned, freedBytes })
    → Renderer: useDataManagementEvents()
      → invalidate usage + retention queries
      → UI refreshes automatically
```

### Data Export/Import Flow

```
Export:
  User clicks "Export Data" → useExportData().mutate()
  → ipc('dataManagement.exportData', {})
  → data-export.ts: exportData(dataDir)
    → Electron save dialog
    → Read all exportable stores (canExport && !sensitive)
    → Write JSON archive { version, exportedAt, appVersion, stores }

Import:
  User clicks "Import Data" → useImportData().mutate({ filePath })
  → ipc('dataManagement.importData', { filePath })
  → data-export.ts: importData(dataDir, filePath)
    → Validate archive version
    → Merge each store's data into existing
    → Returns { success, imported }
```

### IPC Invoke Channels

| Channel | Input | Output | Purpose |
|---------|-------|--------|---------|
| `dataManagement.getRegistry` | `{}` | `DataStoreEntry[]` | Static registry of all data stores |
| `dataManagement.getUsage` | `{}` | `DataStoreUsage[]` | Current disk usage per store |
| `dataManagement.getRetention` | `{}` | `DataRetentionSettings` | User retention config |
| `dataManagement.updateRetention` | `Partial<DataRetentionSettings>` | `DataRetentionSettings` | Update retention settings |
| `dataManagement.clearStore` | `{ storeId }` | `{ success, message }` | Clear a specific store |
| `dataManagement.runCleanup` | `{}` | `{ cleaned, freedBytes }` | Trigger manual cleanup |
| `dataManagement.exportData` | `{}` | `{ filePath }` | Export data archive |
| `dataManagement.importData` | `{ filePath }` | `{ success, imported }` | Import data archive |

### IPC Event Channels

| Channel | Payload | When |
|---------|---------|------|
| `event:dataManagement.cleanupComplete` | `{ cleaned, freedBytes }` | After periodic or manual cleanup |

### Types

Defined in `src/shared/types/data-management.ts`:
- `DataLifecycle` — `'transient' | 'session' | 'short-lived' | 'persistent' | 'synced'`
- `RetentionPolicy` — maxAgeDays, maxItems, enabled
- `DataStoreEntry` — store metadata (id, label, filePath, lifecycle, retention, flags)
- `DataStoreUsage` — runtime usage (sizeBytes, itemCount, oldestEntry)
- `DataRetentionSettings` — user-configured overrides + auto-cleanup settings
- `DataExportArchive` — export file format

### Key Files

| File | Purpose |
|------|---------|
| `src/main/services/data-management/store-registry.ts` | Static DATA_STORE_REGISTRY (22+ store entries) |
| `src/main/services/data-management/store-cleaners.ts` | Per-store cleanup functions |
| `src/main/services/data-management/cleanup-service.ts` | Periodic cleanup orchestrator |
| `src/main/services/data-management/storage-inspector.ts` | Disk usage calculator |
| `src/main/services/data-management/crash-recovery.ts` | Startup orphan detection |
| `src/main/services/data-management/data-export.ts` | Export/import archive functions |
| `src/main/ipc/handlers/data-management-handlers.ts` | IPC handler registration |
| `src/shared/ipc/data-management/contract.ts` | IPC contract (8 invoke + 1 event) |
| `src/shared/ipc/data-management/schemas.ts` | Zod schemas for all payloads |
| `src/renderer/features/settings/api/useDataManagement.ts` | React Query hooks (8 hooks) |
| `src/renderer/features/settings/hooks/useDataManagementEvents.ts` | Event subscription |
| `src/renderer/features/settings/components/StorageManagementSection.tsx` | Main settings section |
| `src/renderer/features/settings/components/StorageUsageBar.tsx` | Visual usage bar |
| `src/renderer/features/settings/components/RetentionControl.tsx` | Per-store retention editor |
| `src/shared/types/health.ts` | TypeScript types for error entries + service health |

---

## 28. Git Operations Flow

### Commit / Push / Resolve Conflict

```
User triggers git action (TaskResultView action buttons, CreatePrDialog, etc.)
  |
  v
ipc('git.commit' | 'git.push' | 'git.resolveConflict', input)
  |
  v
                              git-handlers.ts
                                |
                                v
                              gitService.commit(projectPath, message, files?)
                              gitService.push(projectPath, remote?, branch?)
                              gitService.resolveConflict(projectPath, filePath, strategy)
                                |  src/main/services/git/git-service.ts
                                |  Uses simple-git library (async)
                                v
                              Return { hash, message } | { success, remote, branch } | { success, filePath }
                                |
                                v
                              IPC response flows back to renderer
```

### PR Creation Flow

```
User completes task → clicks "Create PR" in TaskResultView
  |
  v
CreatePrDialog opens
  → User fills title, body, base branch, head branch
  |
  v
ipc('git.createPr', { projectPath, title, body, baseBranch, headBranch })
  |
  v
                              git-handlers.ts
                                |
                                v
                              gitService.createPr(projectPath, title, body, baseBranch, headBranch)
                                |  src/main/services/git/git-service.ts
                                |  Uses `gh pr create` CLI command (execFile)
                                v
                              Return { url, number, title }
                                |
                                v
                              Renderer shows PR link in success toast
```

### Git Status in Project List

```
ProjectList mounts
  |
  v
For each project with a repoPath:
  ipc('git.status', { repoPath })
  |
  v
                              git-handlers.ts → gitService.getStatus(repoPath)
                                |  simple-git: status(), branch()
                                v
                              Return GitStatus { branch, isClean, modified, staged, ... }
  |
  v
GitStatusIndicator renders:
  - Branch name badge (e.g., "main")
  - Clean/changed indicator (green dot vs orange dot)
```

### IPC Channels (Sprint 1 additions)

| Channel | Input | Output | Purpose |
|---------|-------|--------|---------|
| `git.commit` | `{ projectPath, message, files? }` | `{ hash, message }` | Stage and commit files |
| `git.push` | `{ projectPath, remote?, branch? }` | `{ success, remote, branch }` | Push commits to remote |
| `git.resolveConflict` | `{ projectPath, filePath, strategy }` | `{ success, filePath }` | Resolve merge conflict (ours/theirs) |
| `git.createPr` | `{ projectPath, title, body, baseBranch, headBranch }` | `{ url, number, title }` | Create GitHub PR via `gh` CLI |

### Key Files
| File | Purpose |
|------|---------|
| `src/shared/ipc/git/contract.ts` | Git IPC contract (11 invoke channels + 1 event) |
| `src/shared/ipc/git/schemas.ts` | Zod schemas for git operations |
| `src/main/ipc/handlers/git-handlers.ts` | Git handler registration |
| `src/main/services/git/git-service.ts` | Git operations via simple-git + `gh` CLI |
| `src/renderer/features/tasks/components/detail/TaskResultView.tsx` | Execution results display with commit/push/PR action buttons |
| `src/renderer/features/tasks/components/CreatePrDialog.tsx` | PR creation dialog (title, body, branch selection) |
| `src/renderer/features/projects/components/ProjectList.tsx` | GitStatusIndicator (branch + clean/changed badge) |
| `src/renderer/features/auth/api/useAuth.ts` | useForceLogout hook (IPC logout on token refresh failure) |
