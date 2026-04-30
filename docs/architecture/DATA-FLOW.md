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
                                   |  src/main/features/<domain>/<domain>-handlers.ts
                                   v
                              Service method (sync or async)
                                   |  src/main/features/<domain>/<domain>-service.ts
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
| Domain channels | `src/shared/ipc/<domain>/channels.ts` | `domain()` / `events()` channel constants |
| Domain contracts | `src/shared/ipc/<domain>/contract.ts` | Invoke + event Zod input/output schemas |
| Domain schemas | `src/shared/ipc/<domain>/schemas.ts` (or `contract.ts`) | Zod payload schemas |
| Root barrel | `src/shared/ipc/index.ts` | Merges every domain's `*Invoke` and `*Events` into `ipcInvokeContract` / `ipcEventContract` |
| Compat re-export | `src/shared/ipc-contract.ts` | Thin re-export from `src/shared/ipc/` (backward compat) |
| Renderer helper | `src/renderer/shared/lib/ipc.ts` | Typed wrapper: `ipc(channel, input) -> Promise<Output>` |
| Preload bridge | `src/preload/index.ts` | Context bridge: `api.invoke()`, `api.on()` |
| Router | `src/main/ipc/router.ts` | `IpcRouter.handle()` registers handler with Zod validation; optional `CommandBus` dispatch for SQLite tracking |
| Handlers | `src/main/features/<domain>/<domain>-handlers.ts` | Thin layer: validates input via Zod, calls service, returns `{ success, data }` |
| Services | `src/main/features/<domain>/<domain>-service.ts` | Business logic, returns sync or async values |

### Router Behavior

`IpcRouter` (`src/main/ipc/router.ts`) wraps every handler with:

1. `ipcInvokeContract[channel].input.parse(rawInput)` — Zod validation before the handler runs
2. Optional `CommandBus.dispatch()` — when `setBus()` has been called, every invoke is tracked through `src/main/features/bus/` and persisted to SQLite (sessions table)
3. Uniform response envelope: success path returns `{ success: true, data }`; thrown errors are caught and returned as `{ success: false, error: message }`

`router.emit(channel, payload)` mirrors the bus log (if attached) and calls `webContents.send(channel, payload)` on the active main window.

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
                                                          EventBridge subscribes once
                                                            |  src/renderer/shared/
                                                            |  components/EventBridge.tsx
                                                            v
                                                          Match channel → EVENT_REGISTRY entry
                                                            |
                                                            +-- handler: 'invalidate' (default)
                                                            |     queryClient.invalidateQueries({ queryKey: keys })
                                                            |     React Query refetches → components re-render
                                                            |
                                                            +-- handler: 'append'
                                                                  queryClient.setQueryData(key, mutator)
                                                                  Cache patched in-place, no refetch
                                                                  Components re-render from new cache value
```

### EventBridge — single source of truth for IPC → cache wiring

`src/renderer/shared/components/EventBridge.tsx` is mounted once in `RootLayout` and renders `null`. It owns a declarative `EVENT_REGISTRY: Partial<Record<EventChannel, RegistryEntry>>` mapping every IPC event channel that affects cached data to either:

- `keys: [...queryKeys]` with `handler: 'invalidate'` (default) — invalidates each prefix on event, React Query refetches via the IPC handler
- `handler: 'append'` — routes the payload through `handleAppend(queryClient, event, payload)` which calls `setQueryData` directly, mutating the cached value without a re-fetch

Append handlers exist for:

- `peers.discovery.changed` → overwrites `peerKeys.discovered()` with the latest discovered-peer list
- `agent-dashboard.message.received` → appends a 200-char preview to `['agent-messages', agentId]` (capped at 50 entries, deduplicated by id)
- `bus.session.{spawned,active,completed,error,killed}` → patches the matching task node inside `['visualization', 'agents', projectId]` so the visualization tree updates without a full refetch

### Event Contract

```typescript
// Defined in src/shared/ipc/progress/contract.ts (merged into ipcEventContract by root barrel)
progressEvents['event:progress.task.updated'] = {
  payload: z.object({
    taskId: z.string(),
    projectId: z.string(),
  }),
};

// Emitted from progressService
router.emit(PROGRESS_EVENTS.TASK.UPDATED, { taskId, projectId });

// Consumed via EventBridge registry:
[PROGRESS_EVENTS.TASK.UPDATED]: { keys: [PROGRESS_LIST, ['progress', 'detail']] },
```

---

## 3. Feature Module Data Flow

```
Feature: tasks (SQLite-backed via ProgressService)
==================================================

index.ts (barrel export)
  exports: useProgress, useProgressMutations, ProgressTaskGrid, ...

api/queryKeys.ts
  progressKeys = {
    all:    ['progress'] as const,
    lists:  () => [...progressKeys.all, 'list'],
    list:   (projectId) => [...progressKeys.lists(), projectId],
    details: () => [...progressKeys.all, 'detail'],
    detail: (taskId) => [...progressKeys.details(), taskId],
  }

api/useProgress.ts
  useProgress(projectId)     -> useQuery  -> ipc(PROGRESS.LIST.TASKS, { projectId })
  useProgressTask(taskId)    -> useQuery  -> ipc(PROGRESS.GET.TASK, { taskId })

api/useProgressMutations.ts
  useCreateTask()     -> useMutation -> ipc(PROGRESS.CREATE.TASK, draft)
                         onSuccess: invalidateQueries (no optimistic updates)
  useUpdateTask()     -> useMutation -> ipc(PROGRESS.UPDATE.TASK, { taskId, updates })
  useDeleteTask()     -> useMutation -> ipc(PROGRESS.DELETE.TASK, { taskId })

  Mutation pattern: simple onSuccess invalidation.
  IPC is <1ms so optimistic updates are unnecessary overhead.

hooks/useTaskEvents.ts
  useTaskEvents()
    -> orchestrates useAgentEvents + useQaEvents
    -> EventBridge handles progress.task.* events → query invalidation

store.ts (Zustand — UI state only)
  selectedTaskId: string | null
  expandedRowIds: Set<string>
  filterStatus: string | null
  searchQuery: string
  // NO server data in Zustand — that's React Query's job

components/
  ProgressTaskGrid.tsx  -> TanStack Table with @ui Table primitives
  TaskStatusBadge.tsx   -> pure presentational
  TaskDetailRow.tsx     -> expandable row with pipeline controls
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
                    |     sidebarLayout     |
                    |     activeProjectId   |
                    |     projectTabOrder   |
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

## 6. Agent Host Execution Flow

ADC spawns Claude CLI sessions inside an Electron utility process — not the main process. The utility process is the "agent host." There is no longer a `services/agent-orchestrator/` module — agent lifecycle is owned by `AgentManagerService` running inside the utility process and proxied to the main process via `AgentHostClient`.

```
RENDERER                       MAIN PROCESS                    AGENT HOST (utility)
========                       ============                    =======================

useSpawn().mutate({...})
  |
  v
ipc('agent-dashboard.spawnProjectOwner', config)
                               |
                               v
                              agent-dashboard-handlers.ts
                                src/main/features/
                                agent-dashboard/
                                agent-dashboard-handlers.ts
                               |
                               v
                              agentHostClient.spawnProjectOwner(config)
                                src/main/agent-host/
                                agent-host-client.ts
                               |
                               | ControlRequest { type, id, config }
                               | (correlation-ID RPC over MessagePort)
                               |---------------------------------> agent-host/index.ts
                               |                                        |
                               |                                        v
                               |                                   AgentManagerService
                               |                                   (process-manager +
                               |                                    stream-json-parser)
                               |                                        |
                               |                                        v
                               |                                   child_process.spawn(
                               |                                     'claude',
                               |                                     ['-p',
                               |                                      '--input-format',
                               |                                      'stream-json', ...])
                               |                                        |
                               |                                        v
                               |                                   stdout NDJSON →
                               |                                   StreamJsonParser →
                               |                                   AgentManagerEvent
                               |                                        |
                               | ControlReply { id, result }            |
                               |<---------------------------------------+
                               |   (resolves the spawn promise)         |
                               |                                        |
                               | AgentManagerEvent (event port)         |
                               |<---------------------------------------+
                               |   - session.started
                               |   - session.ended
                               |   - status.changed
                               |   - message.received
                               |   - stream.event
                               |
                               v
                              Local session cache updated in agent-host-client.ts
                               |
                               v
                              router.emit(AGENT_DASHBOARD_EVENTS.*) for affected events
                               |
                               v
                              webContents.send(...)
                                                                         RENDERER
                                                                         ========
                                                                         EventBridge
                                                                         invalidates
                                                                         ['agent-dashboard',
                                                                          'sessions']
                                                                         (or appends to
                                                                          ['agent-messages',
                                                                           agentId] for
                                                                          message.received)
```

### Channels

- **MessagePort: main ↔ agent-host** — two ports transferred at fork:
  - `controlPort`: correlation-ID RPC (`spawn-project-owner`, `spawn-team-lead`, `stop-session`, `send-message`, `list-sessions`, `get-session`, `get-messages`, `get-session-project-path`, `dispose`). `host-protocol.ts` defines the `ControlRequest` / `ControlReply` discriminated unions; `agent-host-client.ts` matches replies to a `pendingRequests` Map keyed by `randomUUID()`.
  - `eventPort`: one-way push of `AgentManagerEvent` from host to main. `agent-host-client.ts` updates its in-memory caches (`sessions`, `messageStore`, `projectPaths`) and forwards each event to handlers registered via `onEvent()`.
- **MessagePort bypass to renderer** — `bus` events for sessions and `event:agent-dashboard.*` events flow main → renderer over standard IPC; the renderer never owns the agent-host MessagePort directly.

### Two Agent Process Types

`AgentManagerService` supports two spawn shapes:

- **Project Owner (headless stream-json)** — `spawn('claude', ['-p', '--input-format', 'stream-json', ...])`. stdin receives JSON user messages from the renderer, stdout emits NDJSON `system`/`assistant`/`stream_event`/`result` events.
- **Team Lead (tmux interactive)** — `tmux new-session` runs `claude --name team-lead --teammate-mode tmux`. Output is consumed by tailing the session JSONL file under `~/.claude/projects/<cwd>/<sessionId>.jsonl`. Input is sent via `tmux send-keys`.

### Teammate detection

`src/main/ipc/team-watcher/` watches `~/.claude/teams/<teamName>/config.json`. Diffs against the known members set produce `event:agent-dashboard.teammateJoined` / `teammateLeft` events.

### QA Auto-Trigger Flow

```
Task status transitions to 'review' (via progressService.updateTask):
  |
  v
qaTrigger watches PROGRESS_EVENTS.TASK.UPDATED   src/main/features/qa/qa-trigger.ts
  |
  v
Check: task.status === 'review' AND not already triggered AND no active QA session
  |
  v
qaRunner.startQuiet(taskId, context)
  |
  (guards: skip if already triggered for this taskId,
   skip if QA session already active)
```

### QA Runner Flow

```
After task review (or manual trigger via UI):
  |
  v
useStartQuietQa / useStartFullQa mutation       useQaMutations.ts
  |
  v
ipc('qa.startQuiet', { taskId })                src/main/features/qa/qa-handlers.ts
  |
  v
qaRunner.startQuiet(taskId, context)            src/main/features/qa/qa-runner.ts
  |
  v
agentHostClient.spawnProjectOwner({ phase: 'qa', prompt: qaPrompt(...) })
  |
  v
QA agent runs lint, typecheck, test, build via stream-json
  |
  +--> qaAgentPoller polls session messages    src/main/features/qa/qa-agent-poller.ts
  |      |
  |      v
  |    router.emit('event:qa.started' | 'event:qa.progress' | 'event:qa.completed')
  |      |
  |      v
  |    useQaEvents → invalidate QA caches + toast   useQaEvents.ts
  |
  +--> On completion:
        |
        v
      qa-report-parser.ts parses QA report JSON from agent output
        |
        v
      qa-session-store.ts persists the report
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

## 8. Peer-to-Peer Sync Flow (LAN, TLS-pinned)

ADC peers replicate SQLite state directly between Electron clients on the local network. There is no central hub server — each instance runs a unified TLS server that hosts pairing HTTP endpoints **and** the WebSocket sync transport on a single port advertised over mDNS.

```
ELECTRON CLIENT A                                       ELECTRON CLIENT B
(Windows Desktop)                                       (MacBook)
=================                                       =================

mDNS broadcast: _adc-peer._tcp                          mDNS browse → discovers A
  + TXT { peerId, fingerprint, displayName }              |
  |                                                       v
  v                                                     PEERS_EVENTS.DISCOVERY.CHANGED
peer-mdns.ts → discoveryChanged                           emitted to renderer A
                                                          (EventBridge: setQueryData
                                                           on peerKeys.discovered())

Pairing PIN ritual (one-time, out-of-band):
  A: ipc(PEERS.PAIR.INIT, { host, port, fingerprint })
     → POST https://B/pair/init {peerId, pubkey, fingerprint}
     → B: pair-server.ts generates 6-digit PIN + challenge
     → router.emit(PEERS_EVENTS.PIN.ISSUED) on B (toast on B's screen)
     → returns { sessionId, challenge }
  A: shows entry field, user types PIN displayed on B
  A: ipc(PEERS.PAIR.CONFIRM, { sessionId, pin, challenge, ... })
     → computes pinHmac = HMAC(pin, challenge)
     → POST https://B/pair/confirm
     → B verifies HMAC (timing-safe), max 3 attempts per session, 5min TTL
     → both sides persist PairedPeer { peerId, pubkey, certFingerprint, ... }
     → router.emit(PEERS_EVENTS.TRUST.CHANGED) on both sides
     → EventBridge invalidates peerKeys.paired()

Steady-state replication:
  A connects out: wss://B:port
    |
    v
  Outbound TLS — node:tls checkServerIdentity overridden by
  pinnedCheckServerIdentity(expectedFingerprintHex)
    src/main/features/peers/peer-tls-pin.ts
    |
    +-- SHA-256(cert.raw) timing-safe compared to stored certFingerprint
    +-- mismatch → Error returned from checkServerIdentity → handshake aborted
    |   BEFORE any application data exchanged
    |
    v
  WebSocket open
    |
    v
  HELLO frame (signed):
    { type: 'HELLO', peerId, schemaHash, nonce, sig: ed25519(nonce + peerId) }
    src/main/features/peers/wire-schema.ts (Zod-validated)
    |
    v
  Receiver: hello-verify.ts looks up sender's pubkey in peerStore,
  verifies Ed25519 signature, then exchanges OPS frames
    |
    v
  OPS frame: { type: 'OPS', ops: Op[] } — replication-engine.ts applies
  via LWW merge (lww-merge.ts) keyed by HLC timestamps; op-log.ts persists
    |
    v
  Each client emits local entity-changed events that EventBridge
  routes to query invalidation → UI updates on both peers
```

### Wire Frame Discriminated Union

`src/main/features/peers/wire-schema.ts` defines:

| Type | Schema | Purpose |
|------|--------|---------|
| `HELLO` | `{ peerId, schemaHash, nonce, sig }` | Identity exchange + Ed25519 nonce sig |
| `OPS` | `{ ops: unknown[] }` (max 1000 per frame) | Replication ops, schema-validated downstream |
| `PING` | `{}` | Liveness ping |

`parseWireFrame()` is the single hostile-boundary parser. On JSON or schema failure, callers close the socket with WS code `4003` (malformed frame).

### Peers IPC Surface

| Channel | Input | Output |
|---------|-------|--------|
| `peers.list.paired` | `{}` | `PairedPeer[]` |
| `peers.list.discovered` | `{}` | `DiscoveredPeer[]` |
| `peers.identity.get` | `{}` | `SelfIdentity` |
| `peers.pair.init` | `{ host, port, fingerprint, displayName }` | `{ sessionId, challenge }` |
| `peers.pair.confirm` | `{ host, port, fingerprint, sessionId, challenge, pin, displayName }` | `{ peerId, pubkey, fingerprint }` |
| `peers.revoke.peer` | `{ peerId }` | `{ revoked }` |

### Peers Event Surface

| Channel | Payload | Trigger |
|---------|---------|---------|
| `event:peers.pin.issued` | `{ sessionId, pin, initiatorPeerId, initiatorDisplayName, issuedAt }` | Inbound `/pair/init` request received |
| `event:peers.discovery.changed` | `{ peers: DiscoveredPeer[] }` | mDNS browse list mutated |
| `event:peers.trust.changed` | `{ peerId, action: 'added' \| 'revoked' \| 'updated' }` | Pair confirm / revoke completed |

### Key Files

| File | Purpose |
|------|---------|
| `src/main/features/peers/peers-service.ts` | Public façade — owns identity, store, pairing, mDNS, server lifecycle |
| `src/main/features/peers/peer-server.ts` | Single `https.Server` hosting `/pair/*` + WebSocket upgrade |
| `src/main/features/peers/peer-tls.ts` | Self-signed cert + key generation, persisted under userData |
| `src/main/features/peers/peer-tls-pin.ts` | `pinnedCheckServerIdentity` — timing-safe SHA-256 fingerprint comparison |
| `src/main/features/peers/peer-pairing.ts` | PIN HMAC ritual, 5min TTL, 3-attempt lockout, soft 100-session cap |
| `src/main/features/peers/pair-server.ts` | Fastify-style `/pair/init` and `/pair/confirm` handlers |
| `src/main/features/peers/peer-mdns.ts` | mDNS advertise + browse, debounced discovery emit |
| `src/main/features/peers/ws-transport.ts` | WebSocketServer + outbound dialer + HELLO/OPS handling |
| `src/main/features/peers/wire-schema.ts` | Zod discriminated union for HELLO / OPS / PING frames |
| `src/main/features/peers/hello-verify.ts` | Ed25519 sign / verify for HELLO nonce |
| `src/main/features/peers/replication-engine.ts` | Op application, LWW merge, op-log persistence |
| `src/main/features/peers/peer-store.ts` | SQLite-backed paired-peer store |
| `src/main/features/peers/peers-handlers.ts` | IPC handler registration |

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
handleNav(path)                            SidebarLayoutXX.tsx (via shared-nav.ts)
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
ProgressService.listTasks(projectId)
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
├── /agents                 -> AgentDashboard (top-level, cross-project)
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
│   ├── /tasks              -> ProgressTaskGrid
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

## 11. Auth Flow (Login -> Local Session Token -> IPC)

> Note: ADC no longer ships a remote Hub auth server. The flow below describes the local session-manager backed by `src/main/features/auth/user-session-manager.ts` and `src/main/auth/oauth-manager.ts`. References to `hubAuthService` / `POST /api/auth/*` describe the legacy remote path that may still be present in some renderer hooks; treat as transitional.

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

## 12. SQLite-Backed Task CRUD Flow

All task operations go through `ProgressService`, which reads/writes to the `progress_tasks` SQLite table.

### Read Flow (list/get)

```
User views task dashboard
  |
  v
useProgress(projectId) → ipc(PROGRESS.LIST.ALL, { projectId })
  |
  v
                              progress-handlers.ts
                                |
                                v
                              progressService.listTasks(projectId)
                                |  queries progress_tasks table (SQLite)
                                v
                              Return ProgressTask[]
```

### Write Flow (create/update/delete)

```
User creates a task (CreateTaskDialog)
  |
  v
useCreateProgress().mutate({ projectId, title, description, priority })
  |
  v
ipc(PROGRESS.CREATE.TASK, { ... })
  |
  v
                              progress-handlers.ts
                                |
                                v
                              progressService.createTask(draft)
                                |  Inserts into progress_tasks table
                                v
                              Return ProgressTask (from SQLite, immediate)
```

### Event Flow (Updates → Renderer)

```
MAIN PROCESS                                        RENDERER
============                                        ========

progressService.updateTask()
  |  Updates progress_tasks row
  v
router.emit('event:progress.task.updated', payload)
  |
  v
BrowserWindow.webContents.send(...)
                                                      |
                                                      v
                                                  EventBridge registry
                                                      |
                                                      v
                                                  queryClient.invalidateQueries()
                                                      |
                                                      v
                                                  React Query refetches from ProgressService
```

---

## 13. Device Heartbeat Flow (Legacy — Hub-mode only)

> Note: With peers replacing the Hub (Section 8), device heartbeats are no longer required for steady-state sync. This flow only runs when an ADC instance is configured against a remote Hub server. The peer transport uses mDNS browsing for liveness.

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

## 19. Agent Lifecycle (see Section 6)

The legacy `agent-orchestrator` service has been removed. All Claude CLI sessions are now spawned inside the agent-host utility process via `AgentManagerService` and proxied through `AgentHostClient`. See **Section 6 — Agent Host Execution Flow** for the full lifecycle, including:

- Spawn / stop via correlation-ID RPC over the control MessagePort
- `AgentManagerEvent` push over the event MessagePort
- Local cache mirror in `agent-host-client.ts`
- `event:agent-dashboard.*` and `event:bus.session.*` projection to the renderer

Task-level planning that previously lived under `agent.startPlanning` is now driven by progress workflows (see Section 12) and Workflow Engine runs (see `src/main/features/workflow-engine/` and `src/shared/ipc/workflow-engine/`).

---

## 20. QA Runner Flow

```
User triggers QA (via QaReportViewer or automatic via qa-trigger.ts)
  |
  v
useStartQuietQa / useStartFullQa mutation      useQaMutations.ts
  |
  v
ipc('qa.startQuiet', { taskId })                src/main/features/qa/qa-handlers.ts
  |
  v
qaRunner.startQuiet(taskId, context)             src/main/features/qa/qa-runner.ts
  |  Spawns a Claude session via agentHostClient.spawnProjectOwner({ phase: 'qa' })
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
| `src/main/features/qa/qa-runner.ts` | QA session orchestration (quiet + full modes) |
| `src/main/features/qa/qa-agent-poller.ts` | Polls agent-host session messages for QA progress |
| `src/main/features/qa/qa-prompt.ts` | QA prompt template generator |
| `src/main/features/qa/qa-report-parser.ts` | Parse QA report JSON from agent output |
| `src/main/features/qa/qa-session-store.ts` | Persisted QA session + report storage |
| `src/main/features/qa/qa-trigger.ts` | Auto-trigger on task transition to `review` |
| `src/main/features/qa/qa-types.ts` | QaRunner, QaSession, QaReport types |
| `src/main/features/qa/qa-handlers.ts` | IPC channels + event wiring |
| `src/renderer/features/tasks/api/useQaMutations.ts` | Query + mutation hooks (report, session, start, cancel) |
| `src/renderer/features/tasks/hooks/useQaEvents.ts` | QA event listeners → cache + toast updates |
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
  |  src/main/features/assistant/watch-store.ts
  v
Watch persisted to userData/assistant-watches.json
  |
  v
WatchEvaluator is already listening to IPC events:
  - event:hub.tasks.updated
  - event:hub.tasks.completed
  - event:task.statusChanged
  - event:hub.devices.online/offline
  - event:bus.session.error / event:bus.session.completed
  |  src/main/features/assistant/watch-evaluator.ts
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
| `src/main/features/assistant/watch-store.ts` | JSON persistence for watches |
| `src/main/features/assistant/watch-evaluator.ts` | IPC event matching engine |
| `src/main/bootstrap/event-wiring.ts` | Trigger → `event:assistant.proactive` wiring |
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
  |  src/main/features/assistant/cross-device-query.ts
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
  |  src/main/features/insights/insights-service.ts
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
| `src/main/features/merge/merge-service.ts` | getFileDiff method |
| `src/main/features/merge/merge-handlers.ts` | merge.getFileDiff handler |
| `src/shared/ipc/merge/contract.ts` | merge.getFileDiff contract |
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
| `src/main/features/oauth/oauth-handlers.ts` | OAuth handler registration |
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
  |  src/main/features/app/health/error-collector.ts (or health-service.ts)
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
  |  src/main/features/app/health/health-service.ts
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

### Agent Process Health

The dedicated `agent-watchdog` service has been removed. Agent process health is now observable through:

- `AgentManagerService` inside the agent-host utility process — emits `session.ended` with the child exit code through the event MessagePort.
- `event:agent-dashboard.sessionEnded` — surfaced to renderer; EventBridge invalidates `['agent-dashboard', 'sessions']`.
- `event:bus.session.{completed,error,killed}` — emitted by the `bus` feature for any tracked agent session, projected into the visualization tree by EventBridge's append handler.
- The general `health-service` (`src/main/features/app/health/health-service.ts`) tracks pulses for long-lived services (peer transport, mDNS, etc.) and emits `event:app.serviceUnhealthy` when missed.

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
| `src/main/features/app/health/error-collector.ts` | Error log persistence + pruning + capacity alerts |
| `src/main/features/app/health/error-handlers.ts` | IPC handlers for error log queries and reports |
| `src/main/features/app/health/health-service.ts` | Service pulse monitoring + unhealthy callbacks |
| `src/main/features/app/health.ts` | Wiring barrel for health feature |
| `src/main/features/qa/qa-trigger.ts` | Automatic QA on task status change to review |
| `src/main/bootstrap/service-registry.ts` | Wires all monitoring services + `initNonCritical` wrapper |
| `src/main/bootstrap/lifecycle.ts` | Graceful shutdown (disposes health + error last) |
| `src/shared/ipc/app/contract.ts` | IPC contract for error/health channels (under `app.*` domain) |
| `src/shared/ipc/app/schemas.ts` | Zod schemas for error/health payloads |

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
| `src/main/features/data-management/data-management-handlers.ts` | IPC handler registration |
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
                                |  src/main/features/git/git-service.ts
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
                                |  src/main/features/git/git-service.ts
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
| `src/main/features/git/git-handlers.ts` | Git handler registration |
| `src/main/features/git/git-service.ts` | Git operations via simple-git + `gh` CLI |
| `src/renderer/features/tasks/components/detail/TaskResultView.tsx` | Execution results display with commit/push/PR action buttons |
| `src/renderer/features/tasks/components/CreatePrDialog.tsx` | PR creation dialog (title, body, branch selection) |
| `src/renderer/features/projects/components/ProjectList.tsx` | GitStatusIndicator (branch + clean/changed badge) |
| `src/renderer/features/auth/api/useAuth.ts` | useForceLogout hook (IPC logout on token refresh failure) |

---

## 29. Agent Dashboard Data Flow (ADC v2)

Three-layer architecture: agent visibility, workflow tracking, and dashboard correlation.

```
Layer 1: Agent Visibility (always on)
═══════════════════════════════════════

Project Owner (headless stream-json)
  spawn('claude', ['-p', '--input-format', 'stream-json', ...])
    stdin  ← JSON user messages from React input
    stdout → NDJSON: system, assistant, stream_event, result

  IPC invoke:  agent-dashboard.spawnProjectOwner
  IPC events:  event:agent-dashboard.sessionStarted
               event:agent-dashboard.messageReceived
               event:agent-dashboard.streamEvent

Team Lead (tmux, interactive, agent teams)
  tmux new-session → claude --name team-lead --teammate-mode tmux
    Output: watch session JSONL
    Input:  tmux send-keys

  IPC invoke:  agent-dashboard.spawnTeamLead
               agent-dashboard.sendMessage

Teammates (auto-detected)
  fs.watch(team config.json) → detect joins/leaves
    Each teammate's session JSONL → parse → IPC

  IPC events:  event:agent-dashboard.teammateJoined
               event:agent-dashboard.teammateLeft

Common:
  IPC invoke:  agent-dashboard.listSessions
               agent-dashboard.getSession
               agent-dashboard.stopSession
               agent-dashboard.getFilesChanged
  IPC events:  event:agent-dashboard.sessionEnded
               event:agent-dashboard.statusChanged
```

### IPC Channels

| Channel | Direction | Input | Output | Purpose |
|---------|-----------|-------|--------|---------|
| `agent-dashboard.spawnProjectOwner` | invoke | `{ projectPath, prompt, model?, name? }` | `{ sessionId, status }` | Spawn headless stream-json session |
| `agent-dashboard.spawnTeamLead` | invoke | `{ projectPath, teamName, prompt, model?, name? }` | `{ sessionId, tmuxSessionName, status }` | Spawn tmux team-lead session |
| `agent-dashboard.listSessions` | invoke | `{ type?, teamName? }` | `AgentSession[]` | List active sessions |
| `agent-dashboard.getSession` | invoke | `{ sessionId }` | `AgentSession \| null` | Get session details |
| `agent-dashboard.sendMessage` | invoke | `{ sessionId, message }` | `{ success }` | Send message to agent |
| `agent-dashboard.stopSession` | invoke | `{ sessionId }` | `{ success }` | Stop agent session |
| `agent-dashboard.getFilesChanged` | invoke | `{ sessionId, branch? }` | `FileChange[]` | Get git diff for agent's branch |
| `event:agent-dashboard.sessionStarted` | event | - | `AgentSession` | New session detected |
| `event:agent-dashboard.sessionEnded` | event | - | `{ sessionId, status, exitCode? }` | Session ended |
| `event:agent-dashboard.messageReceived` | event | - | `AgentChatMessage` | New chat message |
| `event:agent-dashboard.statusChanged` | event | - | `{ sessionId, previousStatus, newStatus }` | Status change |
| `event:agent-dashboard.teammateJoined` | event | - | `TeamMember` | Teammate detected |
| `event:agent-dashboard.teammateLeft` | event | - | `{ agentId, teamName }` | Teammate left |
| `event:agent-dashboard.streamEvent` | event | - | `{ sessionId, event }` | Token-level streaming |

### Key Files

| File | Purpose |
|------|---------|
| `src/shared/types/agent-dashboard.ts` | TypeScript types for all three layers |
| `src/shared/ipc/agent-dashboard/schemas.ts` | Zod schemas mirroring the TS types |
| `src/shared/ipc/agent-dashboard/contract.ts` | 7 invoke + 7 event channel definitions |
| `src/shared/ipc/agent-dashboard/index.ts` | Domain barrel export |
| `src/main/services/agent-manager/agent-manager-service.ts` | AgentManager factory — session lifecycle, event emission, message routing (runs **inside the agent-host utility process**) |
| `src/main/services/agent-manager/stream-json-parser.ts` | NDJSON parser — buffers partial lines, validates event types, extracts chat messages |
| `src/main/services/agent-manager/process-manager.ts` | Child process spawn/kill — `child_process.spawn('claude', [...stream-json flags])` |
| `src/main/services/agent-manager/agent-connection-strategy.ts` | Strategy selection between subprocess and tmux modes |
| `src/main/services/agent-manager/subprocess-strategy.ts` | Headless `-p --input-format stream-json` strategy |
| `src/main/services/agent-manager/index.ts` | Service barrel export |
| `src/main/agent-host/index.ts` | Utility-process entry — wires AgentManagerService to control + event MessagePorts |
| `src/main/agent-host/agent-host-client.ts` | Main-process proxy with local cache + correlation-ID RPC |
| `src/main/agent-host/host-protocol.ts` | `ControlRequest` / `ControlReply` discriminated unions |
| `src/main/features/agent-dashboard/agent-dashboard-handlers.ts` | IPC handlers — translates renderer requests into `agentHostClient` calls |
| `src/main/ipc/team-watcher/` | `fs.watch` for team config.json — emits teammateJoined/teammateLeft |
| `src/main/ipc/session-jsonl/` | Tail-follow session JSONL files for tmux team-lead output |

---

## 30. Runners Flow (Long-Running Project Processes)

The Runners feature manages long-running project processes (dev servers, watchers, workers). Profiles are persisted in SQLite and instances are scoped by `ScopeRef` (project or worktree).

```
User opens Runners panel for a project
  |
  v
useRunnerProfiles(projectId) → ipc('runners.profile.list', { projectId })
  → runners-service.listProfiles(projectId)  → Drizzle select on runner_profiles
  → returns RunnerProfile[]

User clicks "Start" on a profile
  |
  v
useStartRunner().mutate({ profileId, scope })
  |
  v
ipc('runners.instance.start', { profileId, scope })
  |
  v
runners-service.startInstance(profileId, scope)
  |  src/main/features/runners/runners-service.ts
  +-- ProcessSupervisor.spawn(profile.command, profile.args, { cwd, env })
  |     src/main/features/runners/process-supervisor.ts
  |
  +-- Insert into runner_instances (status: 'starting', pid, scope, ...)
  |
  +-- router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, { instanceId, status: 'starting' })
  |       → EventBridge invalidates runner queries
  |
  +-- supervisor.on('output', ({ id, stream, chunk }) =>
  |       router.emit(RUNNERS_EVENTS.INSTANCE.OUTPUT, { instanceId: id, stream, chunk })
  |     ) — every stdout/stderr line streams to renderer terminal pane
  |
  +-- pollUntilHealthy(profile.healthCheck, abortSignal)
  |     src/main/features/runners/health-check.ts
  |     |
  |     +-- on first healthy response:
  |     |     router.emit(RUNNERS_EVENTS.INSTANCE.HEALTH, { instanceId, healthy: true, ... })
  |     |     router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, { instanceId, status: 'ready' })
  |     |
  |     +-- on health failure:
  |           router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, { instanceId, status: 'unhealthy' })
  |
  +-- supervisor.on('exit', ({ id, code }) =>
        router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, { instanceId, status: code === 0 ? 'stopped' : 'crashed' })
      )
```

### IPC Surface

| Channel | Input | Output |
|---------|-------|--------|
| `runners.profile.list` | `{ projectId }` | `RunnerProfile[]` |
| `runners.profile.save` | `{ profile }` | `RunnerProfile` |
| `runners.profile.delete` | `{ profileId }` | `{ success }` |
| `runners.instance.list` | `{ scope: ScopeRef }` | `RunnerInstance[]` |
| `runners.instance.start` | `{ profileId, scope }` | `RunnerInstance` |
| `runners.instance.stop` | `{ instanceId }` | `{ success }` |
| `runners.instance.restart` | `{ instanceId }` | `RunnerInstance` |

### Event Surface

| Channel | Payload |
|---------|---------|
| `event:runners.instance.status` | `{ instanceId, status: 'starting' \| 'running' \| 'ready' \| 'stopping' \| 'stopped' \| 'crashed' \| 'unhealthy' }` |
| `event:runners.instance.output` | `{ instanceId, stream: 'stdout' \| 'stderr', chunk }` |
| `event:runners.instance.health` | `{ instanceId, healthy, latencyMs?, error? }` |

### Key Files

| File | Purpose |
|------|---------|
| `src/shared/ipc/runners/channels.ts` | `RUNNERS` invoke + `RUNNERS_EVENTS` event constants |
| `src/shared/ipc/runners/contract.ts` | Zod invoke + event contracts |
| `src/shared/ipc/runners/schemas.ts` | `RunnerProfile`, `RunnerInstance`, `ScopeRef`, event payload schemas |
| `src/main/features/runners/runners-service.ts` | Profile + instance CRUD, supervisor + health wiring |
| `src/main/features/runners/process-supervisor.ts` | EventEmitter-based child-process supervisor (spawn/kill, stdout/stderr stream) |
| `src/main/features/runners/health-check.ts` | `pollUntilHealthy(spec, signal)` — HTTP / port / log-pattern probes |
| `src/main/features/runners/runners-handlers.ts` | IPC handlers (thin) |
| `src/main/features/runners/schema.ts` | Drizzle tables: `runner_profiles`, `runner_instances` |
| `src/renderer/features/runners/api/` | React Query hooks |
| `src/renderer/features/runners/runners-store.ts` | UI store (selected profile, output buffer) |

---

## 31. Test Suite Flow (Recorder → Generate → Run → Results)

The Test Suite feature is a browser-based test recorder + Playwright runner. Records user interactions inside an embedded WebContentsView, generates `.spec.ts` files using locator preference (`getByTestId` > `getByLabel` > `getByRole` > `getByText` > CSS), runs via `npx playwright test`, persists per-step results in SQLite.

```
RECORD PHASE
============

User clicks "Record" → BrowserViewManager creates WebContentsView attached to renderer
  |  src/main/features/test-suite/browser-view-manager.ts
  |
  v
WebContentsView preload captures DOM events (click, input, navigate, ...)
  |
  v
For each captured action:
  router.emit(TEST_SUITE_EVENTS.RECORDER.STEP, { step })
  |  emitted from src/main/features/test-suite/handlers/browser-view-handlers.ts
  v
EventBridge → invalidate ['test-suite', 'recorded-steps']
Renderer renders step list with assertion suggestions

User clicks "Save Script"
  |
  v
ipc(TEST_SUITE.SAVE.SCRIPT, { script: { id, name, projectId, steps, tags, ... } })
  → script-service.ts persists to test_suite_scripts table
  → script-writer.ts generates .spec.ts under projectPath/tests/<name>.spec.ts

GENERATE PHASE
==============

playwright-config-writer.ts ensures playwright.config.ts has the project's
TestSuiteConfig (browsers, workers, retries, viewport, screenshot mode,
storageStatePath, environments via BASE_URL env)

readme-writer.ts updates the project's tests/README.md with the script index

RUN PHASE
=========

User clicks "Run" (single, batch, or by tag)
  |
  v
useRunScript().mutate({ scriptId, env? })
  |
  v
ipc(TEST_SUITE.RUN.SCRIPT, { scriptId, environment? })
  |
  v
src/main/features/test-suite/handlers/run-handlers.ts
  → router.emit(TEST_SUITE_EVENTS.RUN.STARTED, { runId, scriptId })
  → src/main/features/test-suite/runner.ts: spawn('npx', ['playwright', 'test', ...])
    cwd = projectPath
    env = { ...process.env, BASE_URL: envProfile.baseUrl }
    --reporter=json,html --workers=N --retries=N
  |
  +-- on stdout line:
  |     router.emit(TEST_SUITE_EVENTS.OUTPUT.LINE, { runId, line, timestamp })
  |     test-suite-handlers.ts also matches step boundaries → emit RUN.STEP
  |
  +-- on screenshot generated:
  |     router.emit(TEST_SUITE_EVENTS.RUN.SCREENSHOT, { runId, path, stepIndex })
  |
  +-- on Playwright HTML report path emitted:
  |     test_suite_runs row updated with reportPath
  |
  +-- on process exit:
        Parse JSON reporter output → stepsPassed, stepsFailed, durationMs
        Update test_suite_runs row (status, completedAt, ...)
        router.emit(TEST_SUITE_EVENTS.RUN.COMPLETED, { runId, status, ... })

ANALYTICS / DIFF / SCHEDULE
============================

analytics.ts        → run history, top failures, slowest, error patterns, flaky scores
baseline-service.ts → set/list/delete visual baselines per script step
diff-engine.ts      → pixel-diff a fresh screenshot against the baseline
scheduler.ts        → cron-style triggers, fires RUN.STARTED via schedule-handlers.ts
watcher.ts          → file-system watch for scripts; fires WATCH.TRIGGERED
data-runner.ts      → CSV/JSON `{{key}}` substitution per row, runs the script N times
shared-steps-service.ts → reusable step groups, expanded inline at run time
workflow-exporter.ts    → emit GitHub Actions YAML for CI
```

### IPC Surface

The `test-suite` domain exposes 24 invoke channel groups (see `src/shared/ipc/test-suite/channels.ts`) covering: LIST, GET, SAVE, DELETE, RUN, TASK, EXPORT, BROWSER-VIEW, CONFIG, SCREENSHOT, ANALYTICS, WATCH, BASELINE, DIFF, SHARED-STEPS, SCHEDULE, DATA-RUN, OPEN, AUTH, BATCH, SETUP. Inputs and outputs are all Zod-validated through `testSuiteInvoke`.

### Event Surface

| Channel | Payload | Trigger |
|---------|---------|---------|
| `event:test-suite.output.line` | `{ runId, line, timestamp }` | Each stdout/stderr line from `playwright test` |
| `event:test-suite.run.started` | `{ runId, scriptId, triggeredBy }` | Run kicked off (manual, scheduled, batch, watcher) |
| `event:test-suite.run.step` | `{ runId, stepIndex, label, status }` | Step boundary parsed from reporter |
| `event:test-suite.run.screenshot` | `{ runId, stepIndex, path }` | Screenshot captured |
| `event:test-suite.run.completed` | `{ runId, status, stepsPassed, stepsFailed, durationMs, reportPath }` | Process exit |
| `event:test-suite.recorder.step` | `{ step }` | New action captured by the recorder preload |
| `event:test-suite.recorder.stopped` | `{ scriptDraft }` | Recording session ended |
| `event:test-suite.config.changed` | `{ config }` | Active TestSuiteConfig updated |
| `event:test-suite.watch.triggered` | `{ scriptId, file }` | File watcher fired a re-run |

### Key Files

| File | Purpose |
|------|---------|
| `src/shared/ipc/test-suite/channels.ts` | All `TEST_SUITE.*` and `TEST_SUITE_EVENTS.*` constants |
| `src/shared/ipc/test-suite/contract.ts` | Zod invoke + event contracts |
| `src/main/features/test-suite/test-suite-service.ts` | Orchestrator façade |
| `src/main/features/test-suite/test-suite-handlers.ts` | Top-level run-event projection |
| `src/main/features/test-suite/handlers/` | Per-domain IPC handler modules (analytics, auth, baseline, browser-view, config, data-run, export, run, schedule, screenshot, script, setup, shared-steps, watch) |
| `src/main/features/test-suite/runner.ts` | `spawn('npx', ['playwright', 'test', ...])` lifecycle |
| `src/main/features/test-suite/script-service.ts` | Script CRUD against `test_suite_scripts` |
| `src/main/features/test-suite/script-writer.ts` | Generates `.spec.ts` from recorded steps |
| `src/main/features/test-suite/browser-view-manager.ts` | WebContentsView for the recorder |
| `src/main/features/test-suite/playwright-config-writer.ts` | Writes/updates `playwright.config.ts` from TestSuiteConfig |
| `src/main/features/test-suite/readme-writer.ts` | Maintains `tests/README.md` script index |
| `src/main/features/test-suite/baseline-service.ts` | Visual baseline storage |
| `src/main/features/test-suite/diff-engine.ts` | Pixel-diff against baseline |
| `src/main/features/test-suite/analytics.ts` | Aggregations: top failures, slowest, flaky |
| `src/main/features/test-suite/scheduler.ts` | Cron-style run scheduler |
| `src/main/features/test-suite/watcher.ts` | File-watch triggered re-runs |
| `src/main/features/test-suite/data-runner.ts` | CSV/JSON parameterized batch runs |
| `src/main/features/test-suite/shared-steps-service.ts` | Reusable step groups |
| `src/main/features/test-suite/workflow-exporter.ts` | GitHub Actions YAML export |
| `src/main/features/test-suite/screenshot-service.ts` | Screenshot indexing + zip export |
| `src/main/features/test-suite/config-service.ts` | Per-project TestSuiteConfig CRUD |
| `src/main/features/test-suite/schema.ts` | Drizzle tables (`test_suite_scripts`, `test_suite_runs` declared in `db/schema.ts`) |
| `src/renderer/features/test-suite/test-suite-store.ts` | Single Zustand store for the 7-tab page |
| `src/renderer/features/test-suite/api/` | React Query hooks per domain group |

---

## 32. CommandBus + Sessions Tracking (bus feature)

`IpcRouter.setBus(bus)` attaches the optional `CommandBus` (`src/main/features/bus/`). Once attached, every invoke is dispatched through `bus.dispatch(channel, parsed, { type: 'ui' })` which records a `SessionRecord` to SQLite and emits `event:bus.session.{spawned,active,completed,error,killed}` events. Those events are consumed by EventBridge's append handler to update visualization data without a refetch (see Section 2).

The bus also logs `router.emit(...)` calls when configured, providing a unified audit trail of every IPC interaction in the app.

| File | Purpose |
|------|---------|
| `src/main/features/bus/` | CommandBus implementation + SQLite session tracking |
| `src/shared/ipc/bus/channels.ts` | `BUS_EVENTS` constants for session lifecycle events |
| `src/shared/ipc/bus/schemas.ts` | `sessionRecordSchema` |
