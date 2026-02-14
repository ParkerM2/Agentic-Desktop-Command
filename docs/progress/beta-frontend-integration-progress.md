# Team Beta Progress — Frontend Integration

**Status**: NOT STARTED
**Branch**: `feature/beta-frontend-integration`
**Plan**: `docs/plans/2026-02-14-hub-frontend-integration.md`
**Started**: —
**Last Updated**: 2026-02-14
**Updated By**: —

---

## Wave 1: Event Infrastructure

### 1.1 Hub Event Hook
- [ ] Create `src/renderer/shared/hooks/useHubEvents.ts`
- [ ] Generic: `useHubEvent(eventName, callback)`
- [ ] Cleanup on unmount
- [ ] Type-safe with hub-events.ts types

### 1.2 Query Invalidation Setup
- [ ] Create `src/renderer/shared/lib/hub-query-sync.ts`
- [ ] Map hub events to query keys
- [ ] Auto-invalidate on relevant events
- [ ] Wire into app initialization

### 1.3 Connection Status UI
- [ ] Create `src/renderer/shared/components/HubStatus.tsx`
- [ ] Show connected/disconnected/reconnecting
- [ ] Add to TopBar or create StatusBar

---

## Wave 2: Task Integration

### 2.1 Update Task Hooks
- [ ] Change `useTasks` to use `hub.tasks.list`
- [ ] Add workspace_id filter parameter
- [ ] Handle loading/error states

### 2.2 Update Task Mutations
- [ ] Change `useCreateTask` to `hub.tasks.create`
- [ ] Change `useUpdateTaskStatus` to `hub.tasks.updateStatus`
- [ ] Change `useDeleteTask` to `hub.tasks.delete`
- [ ] Change `useExecuteTask` to `hub.tasks.execute`
- [ ] Remove optimistic updates (WebSocket handles)

### 2.3 Task Event Listeners
- [ ] Update `useTaskEvents.ts` for hub events
- [ ] Invalidate queries on task events
- [ ] Show toast on task completion

### 2.4 Progress Display
- [ ] Listen for `hub.tasks.progress` events
- [ ] Update TaskTableRow progress bar live
- [ ] Show current phase/agent info

---

## Wave 3: Auth & Workspace Integration

### 3.1 Update Auth Store
- [ ] Remove mock user from store
- [ ] Store real user from Hub
- [ ] Track auth state (loading, authenticated, error)

### 3.2 Update Auth Hooks
- [ ] Change `useLogin` to `hub.auth.login`
- [ ] Change `useRegister` to `hub.auth.register`
- [ ] Change `useLogout` to `hub.auth.logout`
- [ ] Add `useCurrentUser` with `hub.auth.me`

### 3.3 Auth Flow UI
- [ ] Redirect to login if not authenticated
- [ ] Show loading during auth check
- [ ] Handle auth errors with user feedback

### 3.4 Workspace Hooks
- [ ] Update `useWorkspaces` to use hub channels
- [ ] Add device selection for host assignment
- [ ] Handle workspace switching

---

## Wave 4: Polish

### 4.1 Remove Unused Code
- [ ] Identify dead IPC handlers
- [ ] Archive or delete unused code
- [ ] Clean up imports

### 4.2 Loading & Error States
- [ ] Add skeleton loaders
- [ ] Meaningful error messages
- [ ] Retry buttons

### 4.3 Connection Lost Handling
- [ ] Show banner when disconnected
- [ ] Disable/queue mutations
- [ ] Re-enable on reconnect

### 4.4 Testing
- [ ] Test all flows end-to-end
- [ ] Verify multi-device sync
- [ ] Test offline/reconnect

---

## Files Created/Modified

*(Update as work progresses)*

---

## Blockers

None.
