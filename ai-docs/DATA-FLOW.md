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
                    |   layout-store:       |
                    |     sidebarCollapsed  |
                    |     activeProjectId   |
                    |     projectTabs       |
                    |                       |
                    |   theme-store:        |
                    |     mode (light/dark) |
                    |     colorTheme        |
                    |     uiScale           |
                    |                       |
                    |   feature stores:     |
                    |     selectedTaskId    |
                    |     activeTerminalId  |
                    |     dragState         |
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

## 9. Routing Data Flow

```
User clicks sidebar nav item
  |
  v
handleNav(path)                            Sidebar.tsx
  |
  v
navigate({ to: projectViewPath(id, path) })
  |  e.g., '/projects/abc-123/kanban'
  v
TanStack Router matches route pattern
  |  ROUTE_PATTERNS.PROJECT_KANBAN = '/projects/$projectId/kanban'
  v
Route component renders                   router.tsx
  |  component: KanbanBoard
  v
KanbanBoard mounts
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
Tasks returned, KanbanBoard renders columns
```

### Route Hierarchy

```
/ (RootLayout)
├── /dashboard              -> DashboardPage
├── /projects               -> ProjectListPage
├── /projects/$projectId    -> redirect to /kanban
│   ├── /kanban             -> KanbanBoard
│   ├── /tasks              -> TaskListView
│   ├── /terminals          -> TerminalGrid
│   ├── /agents             -> AgentDashboard
│   ├── /roadmap            -> RoadmapPage
│   ├── /ideation           -> IdeationPage
│   ├── /github             -> GitHubPage
│   ├── /changelog          -> ChangelogPage
│   └── /insights           -> InsightsPage
└── /settings               -> SettingsPage
```
