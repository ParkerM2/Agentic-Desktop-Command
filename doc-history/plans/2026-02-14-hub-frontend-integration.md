# Hub-Frontend Integration Plan — Parallel Execution

> Tracker Key: `hub-frontend` | Status: **IMPLEMENTED** | Created: 2026-02-14

**Teams**: Team Alpha (Hub/WebSocket), Team Beta (Frontend Integration)
**Base Branch**: master
**Audit Reference**: Post-merge audit 2026-02-14

---

## Problem Statement

The Hub API backend is 100% complete, but frontend integration is only 40%. Critical gaps:

1. **Zero WebSocket listeners** — Real-time sync unavailable
2. **Tasks use local IPC** — Not routed through Hub API
3. **Auth uses mocks** — Can't test real user flows
4. **Incomplete Hub API client** — Only task methods exist

---

## Architecture Target

```
┌─────────────────────────────────────────────────────────────────┐
│                         RENDERER                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │  TaskTable  │   │ Workspaces  │   │   Auth (Login/Reg)  │   │
│  └──────┬──────┘   └──────┬──────┘   └──────────┬──────────┘   │
│         │                 │                      │               │
│         └────────────┬────┴──────────────────────┘               │
│                      ▼                                           │
│              ┌──────────────┐                                    │
│              │  React Query │ ◄─── invalidateQueries on WS events│
│              └──────┬───────┘                                    │
└─────────────────────┼───────────────────────────────────────────┘
                      │ ipc()
┌─────────────────────┼───────────────────────────────────────────┐
│                     ▼              MAIN PROCESS                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    IPC Router                             │   │
│  │  hub.* handlers ──► HubApiClient ──► HTTP to Hub         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              WebSocket Connection Manager                 │   │
│  │  Connect to ws://hub/ws ──► Parse events ──► IPC emit    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                      │
                      ▼ HTTP + WebSocket
┌──────────────────────────────────────────────────────────────────┐
│                           HUB SERVER                              │
│  REST API (35 endpoints) + WebSocket Broadcaster                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Team Assignments

### Team Alpha: Hub Connection Layer
**Branch**: `feature/alpha-hub-connection`
**Focus**: WebSocket client, connection management, event relay

**File Ownership:**
- `src/main/services/hub/` — Full ownership
- `src/main/ipc/handlers/hub-handlers.ts` — Expand handlers
- `src/shared/types/hub-events.ts` — New file for WS event types

### Team Beta: Frontend Integration
**Branch**: `feature/beta-frontend-integration`
**Focus**: Hook updates, query invalidation, UI wiring

**File Ownership:**
- `src/renderer/features/*/api/` — Update hooks to use Hub
- `src/renderer/features/*/hooks/` — Add event listeners
- `src/renderer/shared/hooks/useHubEvents.ts` — New event hook

---

## Wave 1: WebSocket Foundation (Parallel)

### Team Alpha — Wave 1
**Deliverables:**

1. **WebSocket Connection Manager**
   ```
   src/main/services/hub/hub-websocket.ts
   ```
   - Connect to Hub WebSocket with API key auth
   - Auto-reconnect with exponential backoff
   - Parse incoming broadcast messages
   - Emit typed IPC events to renderer

2. **Hub Event Types**
   ```
   src/shared/types/hub-events.ts
   ```
   - Define all 18 WebSocket event types
   - Type-safe event payloads matching Hub protocol

3. **IPC Event Channels**
   ```
   src/shared/ipc-contract.ts (update ipcEventContract)
   ```
   - Add hub event channels:
     - `event:hub.tasks.created`
     - `event:hub.tasks.updated`
     - `event:hub.tasks.deleted`
     - `event:hub.tasks.progress`
     - `event:hub.tasks.completed`
     - `event:hub.devices.*`
     - `event:hub.workspaces.*`
     - `event:hub.projects.*`

4. **Connection Lifecycle**
   - Start connection when Hub is configured
   - Stop on disconnect
   - Expose connection status via IPC

**Success Criteria:**
- [ ] WebSocket connects to Hub with auth
- [ ] Reconnects automatically on disconnect
- [ ] Events parsed and emitted via IPC
- [ ] TypeScript types for all events

### Team Beta — Wave 1
**Deliverables:**

1. **Hub Event Hook**
   ```
   src/renderer/shared/hooks/useHubEvents.ts
   ```
   - Subscribe to hub IPC events
   - Generic hook: `useHubEvent('hub.tasks.updated', callback)`
   - Cleanup on unmount

2. **Query Invalidation Setup**
   ```
   src/renderer/shared/lib/hub-query-sync.ts
   ```
   - Map hub events to React Query invalidations:
     - `hub.tasks.*` → invalidate `['tasks']`
     - `hub.workspaces.*` → invalidate `['workspaces']`
     - etc.

3. **Connection Status UI**
   ```
   src/renderer/shared/components/HubStatus.tsx
   ```
   - Show connected/disconnected/reconnecting
   - Add to TopBar or StatusBar

**Success Criteria:**
- [ ] Event hook works for all hub events
- [ ] Query keys invalidated on relevant events
- [ ] Connection status visible in UI

---

## Sync Point 1: WebSocket Verification

**When**: After Wave 1 complete
**Duration**: 30 minutes
**Actions:**

1. Start Hub server
2. Connect Electron app
3. Verify WebSocket auth succeeds
4. Create task via Hub API (curl)
5. Verify frontend receives event and invalidates query
6. Fix any event mapping issues

---

## Wave 2: Task Hub Integration (Parallel)

### Team Alpha — Wave 2
**Deliverables:**

1. **Expand Hub API Client**
   ```
   src/main/services/hub/hub-api-client.ts
   ```
   Add methods:
   - `createTask(data)` → POST /api/tasks
   - `updateTask(id, data)` → PUT /api/tasks/:id
   - `updateTaskStatus(id, status)` → PATCH /api/tasks/:id/status
   - `executeTask(id)` → POST /api/tasks/:id/execute
   - `cancelTask(id)` → POST /api/tasks/:id/cancel
   - `pushProgress(id, data)` → POST /api/tasks/:id/progress
   - `completeTask(id, result)` → POST /api/tasks/:id/complete

2. **Hub Task IPC Handlers**
   ```
   src/main/ipc/handlers/hub-handlers.ts
   ```
   Add handlers:
   - `hub.tasks.list` → hubClient.listTasks()
   - `hub.tasks.create` → hubClient.createTask()
   - `hub.tasks.update` → hubClient.updateTask()
   - `hub.tasks.updateStatus` → hubClient.updateTaskStatus()
   - `hub.tasks.execute` → hubClient.executeTask()
   - `hub.tasks.delete` → hubClient.deleteTask()

3. **Workspace Context**
   - Get current workspace from settings
   - Include workspace_id in task operations

**Success Criteria:**
- [ ] All task CRUD operations available via IPC
- [ ] Task execution routes through Hub
- [ ] Workspace context included

### Team Beta — Wave 2
**Deliverables:**

1. **Update Task Hooks**
   ```
   src/renderer/features/tasks/api/useTasks.ts
   ```
   - Change from `ipc('tasks.list')` to `ipc('hub.tasks.list')`
   - Add workspace_id filter parameter
   - Keep local fallback for offline mode (optional)

2. **Update Task Mutations**
   ```
   src/renderer/features/tasks/api/useTaskMutations.ts
   ```
   - Route through hub.tasks.* channels
   - Remove optimistic updates (let WebSocket handle)
   - Add error handling for hub errors

3. **Task Event Listeners**
   ```
   src/renderer/features/tasks/hooks/useTaskEvents.ts
   ```
   - Listen for hub task events
   - Invalidate task queries on any task event
   - Show toast on task completion

4. **Progress Display**
   - Show real-time progress from WebSocket events
   - Update TaskTableRow progress bar live

**Success Criteria:**
- [ ] Tasks load from Hub API
- [ ] Create/update/delete sync to Hub
- [ ] Execute sends to Hub, progress updates live
- [ ] Multi-device: changes on one device appear on others

---

## Sync Point 2: Task Flow Verification

**When**: After Wave 2 complete
**Duration**: 1 hour
**Actions:**

1. Open app on two devices (or two instances)
2. Create task on Device A
3. Verify appears on Device B within 1 second
4. Execute task on Device A
5. Verify progress updates on Device B
6. Complete task, verify both update

---

## Wave 3: Auth & Workspace Integration (Parallel)

### Team Alpha — Wave 3
**Deliverables:**

1. **Auth API Client Methods**
   ```
   src/main/services/hub/hub-api-client.ts
   ```
   - `register(email, password, displayName)`
   - `login(email, password, device?)`
   - `logout()`
   - `refreshToken(token)`
   - `getCurrentUser()`

2. **Token Storage**
   ```
   src/main/services/hub/hub-token-store.ts
   ```
   - Secure storage for access/refresh tokens
   - Auto-refresh before expiry
   - Clear on logout

3. **Auth IPC Handlers**
   - `hub.auth.register`
   - `hub.auth.login`
   - `hub.auth.logout`
   - `hub.auth.refresh`
   - `hub.auth.me`

4. **Device Registration**
   - Register device on first login
   - Send heartbeat every 30s when connected
   - Update capabilities on change

**Success Criteria:**
- [ ] Can register new user via app
- [ ] Can login and receive tokens
- [ ] Tokens persist across restart
- [ ] Auto-refresh works
- [ ] Device registered and sending heartbeats

### Team Beta — Wave 3
**Deliverables:**

1. **Update Auth Store**
   ```
   src/renderer/features/auth/store.ts
   ```
   - Remove mock user
   - Store real user from Hub
   - Track auth state (loading, authenticated, error)

2. **Update Auth Hooks**
   ```
   src/renderer/features/auth/api/useAuth.ts
   ```
   - `useLogin()` → `ipc('hub.auth.login')`
   - `useRegister()` → `ipc('hub.auth.register')`
   - `useLogout()` → `ipc('hub.auth.logout')`
   - `useCurrentUser()` → `ipc('hub.auth.me')`

3. **Auth Flow UI**
   - Redirect to login if not authenticated
   - Show loading state during auth
   - Handle auth errors gracefully

4. **Workspace Hooks Update**
   ```
   src/renderer/features/settings/api/useWorkspaces.ts
   ```
   - Route through hub.workspaces.* channels
   - Add device selection for host

**Success Criteria:**
- [ ] Login/register works with real Hub
- [ ] User persists across restart
- [ ] Logout clears state
- [ ] Workspaces load from Hub

---

## Wave 4: Cleanup & Polish (Parallel)

### Team Alpha — Wave 4
**Deliverables:**

1. **Remove Mock Auth**
   - Delete MOCK_USER, MOCK_TOKEN from handlers
   - Remove mock fallbacks

2. **Offline Mode (Optional)**
   - Queue operations when Hub unreachable
   - Sync when reconnected

3. **Error Handling**
   - Standardize error responses
   - Add retry logic for transient failures

4. **Logging & Diagnostics**
   - Log connection events
   - Add debug mode for troubleshooting

### Team Beta — Wave 4
**Deliverables:**

1. **Remove Unused Local Handlers**
   - Identify IPC handlers that are now Hub-routed
   - Archive or remove dead code

2. **Loading & Error States**
   - Add skeletons for loading
   - Show meaningful errors
   - Retry buttons where appropriate

3. **Connection Lost Handling**
   - Show banner when Hub disconnected
   - Disable mutations (or queue them)
   - Re-enable when reconnected

4. **Testing**
   - Test all flows end-to-end
   - Verify multi-device sync

---

## Final Sync: Integration Test

**When**: All waves complete
**Duration**: 2 hours
**Actions:**

1. Fresh install test (register → login → create workspace → create project → create task → execute)
2. Multi-device test (same user, two devices)
3. Offline/reconnect test
4. Load test (many tasks, rapid updates)
5. Fix any issues found
6. Merge to master

---

## File Ownership Matrix

| Path | Alpha | Beta | Shared |
|------|-------|------|--------|
| `src/main/services/hub/*` | ✓ | | |
| `src/main/ipc/handlers/hub-handlers.ts` | ✓ | | |
| `src/shared/types/hub-events.ts` | ✓ | | |
| `src/shared/ipc-contract.ts` | | | ✓ |
| `src/renderer/features/*/api/*` | | ✓ | |
| `src/renderer/features/*/hooks/*` | | ✓ | |
| `src/renderer/shared/hooks/useHubEvents.ts` | | ✓ | |
| `src/renderer/shared/lib/hub-query-sync.ts` | | ✓ | |

---

## Quick Start

### Team Alpha
```bash
git checkout master && git pull
git checkout -b feature/alpha-hub-connection
# Start Wave 1
```

### Team Beta
```bash
git checkout master && git pull
git checkout -b feature/beta-frontend-integration
# Start Wave 1
```

---

## Success Criteria (Final)

- [ ] WebSocket connects and receives all event types
- [ ] Tasks sync through Hub in real-time
- [ ] User can register/login with real credentials
- [ ] Workspaces and devices managed via Hub
- [ ] Multi-device: changes propagate within 1 second
- [ ] Offline mode handles disconnection gracefully
- [ ] `npm run lint && npx tsc --noEmit && npm run build` passes

---

## Estimated Timeline

| Wave | Duration | Alpha | Beta |
|------|----------|-------|------|
| Wave 1 | 3-4 hours | WebSocket + Events | Event hooks + Query sync |
| Sync 1 | 30 min | Verify WS flow | |
| Wave 2 | 3-4 hours | Task API client | Task hooks update |
| Sync 2 | 1 hour | Multi-device test | |
| Wave 3 | 3-4 hours | Auth + Tokens | Auth UI + Workspace hooks |
| Wave 4 | 2-3 hours | Cleanup + Offline | Polish + Testing |
| Final | 2 hours | Integration test | |

**Total**: ~16-20 hours parallel work
