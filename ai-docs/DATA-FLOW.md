# Data Flow Reference

> Complete data flow diagrams for every system in Claude-UI.
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
| Contract | `src/shared/ipc-contract.ts` | Defines channel name, input Zod schema, output Zod schema |
| Renderer helper | `src/renderer/shared/lib/ipc.ts` | Typed wrapper: `ipc(channel, input) -> Promise<Output>` |
| Preload bridge | `src/preload/index.ts` | Context bridge: `api.invoke()`, `api.on()` |
| Router | `src/main/ipc/router.ts` | Routes channel to handler, validates input with Zod |
| Handlers | `src/main/ipc/handlers/*.ts` | Thin layer: calls service, wraps in `Promise.resolve()` |
| Services | `src/main/services/*/*.ts` | Business logic, returns sync values |

### Type Flow (Compile-Time)

```
ipc-contract.ts defines:
  ipcInvokeContract['projects.list'].input  -> z.object({})
  ipcInvokeContract['projects.list'].output -> z.array(ProjectSchema)

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
// Defined in ipc-contract.ts
ipcEventContract['event:task.statusChanged'] = {
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

## 6. Agent Execution Flow

```
User clicks "Execute Task"
  |
  v
ipc('tasks.execute', { taskId, projectId })
  |
  v
AgentService.spawnAgent(taskId, projectId)   agent-service.ts
  |
  v
Create PTY with Claude CLI command
  |  Shell: claude --task-file <spec-path>
  v
PTY starts running
  |
  +--> Parse stdout for status patterns
  |     |
  |     v
  |   router.emit('event:agent.statusChanged', ...)
  |   router.emit('event:agent.log', ...)
  |
  +--> On completion/error:
        |
        v
      Update agent session status
      router.emit('event:agent.statusChanged', { status: 'completed' })
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

```
/ (RootLayout)
├── /dashboard              -> DashboardPage
├── /my-work                -> MyWorkPage
├── /alerts                 -> AlertsPage
├── /briefing               -> BriefingPage
├── /communications         -> CommunicationsPage
├── /fitness                -> FitnessPage
├── /notes                  -> NotesPage
├── /planner                -> PlannerPage
├── /planner/weekly         -> WeeklyReviewPage
├── /productivity           -> ProductivityPage
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
└── /settings               -> SettingsPage
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

---

## 12. Hub-First Task Execution Flow (UI -> Hub -> Dispatch -> Device -> Progress -> UI)

```
User clicks "Execute" on task
  |
  v
useExecuteTask().mutate(taskId)
  |
  v
ipc('hub.tasks.execute', { taskId })
  |
  v
                              hub-handlers.ts
                                |
                                v
                              hubApiClient.executeTask(taskId)
                                |
                                v
                              POST /api/tasks/:id/execute
                                                                  |
                                                                  v
                                                              Hub dispatches to target device
                                                              WS: { type: 'task.executing', taskId }
                                                                  |
                              <---- WS event --------<-----------+
                                |
                                v
                              workflowService.launch({ taskId, projectPath })
                                |
                                v
                              Spawn Claude CLI as PTY process
                                |
                                v
                              progressWatcher.start(projectPath)
                                |
                                +--> Parse progress files every 2s
                                |     |
                                |     v
                                |   progressSyncer.push(taskId, progress)
                                |     |
                                |     v
                                |   PUT /api/tasks/:id/progress
                                |                                   |
                                |                                   v
                                |                               WS broadcast: task.progress
                                |                                   |
                              router.emit('event:hub.tasks.progress')
                                |
                                v
                              React receives progress events
                                |
                                v
                              queryClient.setQueryData() patches task cache
                                |
                                v
                              AG-Grid ProgressBarCell re-renders
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
