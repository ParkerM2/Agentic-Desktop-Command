# Team Alpha Progress — Hub Connection Layer

**Status**: NOT STARTED
**Branch**: `feature/alpha-hub-connection`
**Plan**: `docs/plans/2026-02-14-hub-frontend-integration.md`
**Started**: —
**Last Updated**: 2026-02-14
**Updated By**: —

---

## Wave 1: WebSocket Foundation

### 1.1 WebSocket Connection Manager
- [ ] Create `src/main/services/hub/hub-websocket.ts`
- [ ] Connect with API key auth (first-message protocol)
- [ ] Auto-reconnect with exponential backoff
- [ ] Parse WsBroadcastMessage format
- [ ] Emit typed IPC events to renderer

### 1.2 Hub Event Types
- [ ] Create `src/shared/types/hub-events.ts`
- [ ] Define all 18 event types (tasks, devices, workspaces, projects)
- [ ] Type-safe payloads matching Hub protocol v2.0.0

### 1.3 IPC Event Channels
- [ ] Update `src/shared/ipc-contract.ts` with hub event channels
- [ ] Add `event:hub.tasks.*` (created, updated, deleted, progress, completed)
- [ ] Add `event:hub.devices.*` (created, updated, deleted)
- [ ] Add `event:hub.workspaces.*` (created, updated, deleted)
- [ ] Add `event:hub.projects.*` (created, updated, deleted)

### 1.4 Connection Lifecycle
- [ ] Start connection when Hub configured
- [ ] Expose `hub.ws.status` IPC channel
- [ ] Handle graceful shutdown

---

## Wave 2: Task Hub Integration

### 2.1 Expand Hub API Client
- [ ] Add `createTask(data)`
- [ ] Add `updateTask(id, data)`
- [ ] Add `updateTaskStatus(id, status)`
- [ ] Add `executeTask(id)`
- [ ] Add `cancelTask(id)`
- [ ] Add `pushProgress(id, data)`
- [ ] Add `completeTask(id, result)`

### 2.2 Hub Task IPC Handlers
- [ ] Add `hub.tasks.list` handler
- [ ] Add `hub.tasks.create` handler
- [ ] Add `hub.tasks.update` handler
- [ ] Add `hub.tasks.updateStatus` handler
- [ ] Add `hub.tasks.execute` handler
- [ ] Add `hub.tasks.delete` handler

### 2.3 Workspace Context
- [ ] Get current workspace from settings
- [ ] Include workspace_id in task operations

---

## Wave 3: Auth & Device Integration

### 3.1 Auth API Client
- [ ] Add `register(email, password, displayName)`
- [ ] Add `login(email, password, device?)`
- [ ] Add `logout()`
- [ ] Add `refreshToken(token)`
- [ ] Add `getCurrentUser()`

### 3.2 Token Storage
- [ ] Create `src/main/services/hub/hub-token-store.ts`
- [ ] Secure storage (electron-store or keytar)
- [ ] Auto-refresh before expiry
- [ ] Clear on logout

### 3.3 Auth IPC Handlers
- [ ] Add `hub.auth.register`
- [ ] Add `hub.auth.login`
- [ ] Add `hub.auth.logout`
- [ ] Add `hub.auth.refresh`
- [ ] Add `hub.auth.me`

### 3.4 Device Registration
- [ ] Register device on first login
- [ ] Heartbeat every 30s
- [ ] Update capabilities on change

---

## Wave 4: Cleanup

### 4.1 Remove Mocks
- [ ] Delete MOCK_USER, MOCK_TOKEN
- [ ] Remove mock fallbacks from handlers

### 4.2 Error Handling
- [ ] Standardize error responses
- [ ] Add retry logic

### 4.3 Logging
- [ ] Log connection events
- [ ] Add debug mode

---

## Files Created/Modified

*(Update as work progresses)*

---

## Blockers

None.
