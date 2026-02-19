# Gap Remediation Plan — High & Medium Priority

> Tracker Key: `gap-remediation` | Status: **IMPLEMENTED** | Created: 2026-02-15

> Fill in the gaps identified in `ai-docs/user-interface-flow.md` (G-1 through G-20).
> Focus: High and Medium severity only. Low items deferred to future sprints.

**Source**: `ai-docs/user-interface-flow.md` Gap Analysis (20 gaps total)

---

## Scope

### In Scope (7 gaps)

| Gap | Severity | Domain | Summary | Existing Infrastructure |
|-----|----------|--------|---------|------------------------|
| G-1 | High | Auth | No visible logout button | `useLogout()` hook, `auth.logout` IPC, `clearAuth()` store method — all exist, needs UI |
| G-2 | High | Tasks | No task creation dialog | `useCreateTask()` hook, `hub.tasks.create` IPC — all exist, needs modal + button |
| G-3 | Medium | Tasks | Duplicate task handlers | Both `hub-handlers.ts` and `task-handlers.ts` register `hub.tasks.*` channels |
| G-4 | Medium | Hub | No error UI for Hub disconnect during operation | `HubNotification.tsx` exists; mutations lack `onError` callbacks |
| G-5 | Medium | Auth | Token refresh not proactive | `useRefreshToken()` exists; no timer-based auto-refresh before expiry |
| G-15 | Medium | Projects | No project edit/settings page | `useUpdateProject()` hook, `projects.update` IPC — all exist, needs form UI |
| G-16 | Medium | Projects | No delete confirmation dialogs | No `ConfirmDialog` component; deletes fire immediately |

### Already Resolved

| Gap | Status | Notes |
|-----|--------|-------|
| G-20 | DONE | Profile API keys encryption implemented 2026-02-13 (Full Codebase Audit P0) |

### Deferred (Separate Feature)

| Gap | Notes |
|-----|-------|
| G-13 | `/assistant` route — Full feature epic. TODO: Create dedicated design doc |

### Deferred (Low Priority)

G-6, G-7, G-8, G-9, G-10, G-11, G-12, G-14, G-17, G-18, G-19

---

## Architecture Approach

**Key principle**: These are all _wiring gaps_, not architectural problems. The backend infrastructure (IPC channels, services, hooks) already exists. Each gap needs a UI component or connection layer added.

**No new IPC channels needed.** All channels exist in `ipc-contract.ts`.
**No new services needed.** All services are implemented.
**No new types needed.** All types are defined.

---

## Phase 1: Shared Infrastructure (No Blockers)

### Task 1.1: Create ConfirmDialog Component

**Agent**: component-engineer
**Files to Create**:
- `src/renderer/shared/components/ConfirmDialog.tsx`

**Files to Read**:
- `src/renderer/features/merge/components/MergeConfirmModal.tsx` (existing pattern)
- Radix UI AlertDialog documentation

**Specification**:
```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;      // default: "Delete"
  cancelLabel?: string;       // default: "Cancel"
  variant?: 'destructive' | 'default';
  onConfirm: () => void;
  loading?: boolean;
}
```

- Use Radix UI `AlertDialog` primitives (already in deps)
- Destructive variant: red confirm button
- Default variant: primary confirm button
- Focus trap, Escape to close, overlay click to close
- Accessible: proper ARIA roles, focus management

**Acceptance Criteria**:
- [ ] Component renders with title, description, two buttons
- [ ] `onConfirm` only fires when user clicks confirm
- [ ] Escape / overlay click closes without confirming
- [ ] Destructive variant shows red button
- [ ] Loading state disables buttons + shows spinner
- [ ] Passes lint, typecheck, build

---

## Phase 2: Auth Hardening (No Blockers, Parallel with Phase 1)

### Task 2.1: Proactive Token Refresh (G-5)

**Agent**: hook-engineer
**Files to Create**:
- `src/renderer/features/auth/hooks/useTokenRefresh.ts`

**Files to Modify**:
- `src/renderer/features/auth/store.ts` — Add `expiresAt` field
- `src/renderer/features/auth/api/useAuth.ts` — Store `expiresAt` on login/refresh
- `src/renderer/features/auth/components/AuthGuard.tsx` — Call `useTokenRefresh()`

**Specification**:
- On login/register response: store `expiresAt = Date.now() + (expiresIn * 1000)` in auth store
- `useTokenRefresh()` hook:
  - Runs a `setTimeout` that fires 2 minutes before `expiresAt`
  - Calls `useRefreshToken().mutate()` on timer
  - On refresh success: update `expiresAt` with new value, reschedule timer
  - On refresh failure: `clearAuth()` + redirect to login
  - Cleanup on unmount (clear timeout)
- Call `useTokenRefresh()` in `AuthGuard` (runs for all authenticated pages)

**Acceptance Criteria**:
- [ ] `expiresAt` stored in auth store on login
- [ ] Timer fires before token expires
- [ ] Successful refresh extends the timer
- [ ] Failed refresh logs out the user
- [ ] Timer cleaned up on logout/unmount
- [ ] Passes lint, typecheck, build

### Task 2.2: Logout Button + User Menu (G-1)

**Agent**: component-engineer
**Depends on**: Task 2.1 (auth store changes)
**Files to Create**:
- `src/renderer/app/layouts/UserMenu.tsx`

**Files to Modify**:
- `src/renderer/app/layouts/Sidebar.tsx` — Add UserMenu above footer

**Specification**:
- `UserMenu` component placed in Sidebar footer, above HubConnectionIndicator
- Shows user avatar (initials fallback) + display name (when expanded)
- Collapsed sidebar: avatar only
- Click opens dropdown with:
  - User display name + email (header)
  - "Log out" button (destructive, with `LogOut` icon)
- On logout click: call `useLogout().mutate()`
- `useLogout()` already clears auth store + query cache
- After logout: TanStack Router `redirect()` to `/login`

**Acceptance Criteria**:
- [ ] Avatar + name visible in sidebar footer
- [ ] Dropdown opens on click
- [ ] Logout clears auth and redirects to login
- [ ] Works in both expanded and collapsed sidebar
- [ ] Keyboard accessible (Enter/Space to open, Escape to close)
- [ ] Passes lint, typecheck, build

---

## Phase 3: Task Dashboard Completion (Depends on Phase 1)

### Task 3.1: Create Task Dialog (G-2)

**Agent**: component-engineer
**Depends on**: Task 1.1 (ConfirmDialog pattern reference, not direct dep)
**Files to Create**:
- `src/renderer/features/tasks/components/CreateTaskDialog.tsx`

**Files to Modify**:
- `src/renderer/features/tasks/components/TaskFiltersToolbar.tsx` — Add "New Task" button
- `src/renderer/features/tasks/store.ts` — Add `createDialogOpen` state

**Specification**:
- "New Task" button added to TaskFiltersToolbar (left of search, primary style)
- Button click opens dialog (Radix Dialog)
- Dialog form fields:
  - Title (required, text input)
  - Description (optional, textarea, 3 rows)
  - Priority (optional, select: low/normal/high/urgent, default: normal)
- Submit calls `useCreateTask().mutate({ projectId, title, description, priority })`
- `projectId` from `useLayoutStore().activeProjectId`
- On success: close dialog, show success (task appears in grid via query invalidation)
- On error: show error message in dialog
- Keyboard: Enter submits (when not in textarea), Escape closes

**Acceptance Criteria**:
- [ ] "New Task" button visible in toolbar
- [ ] Dialog opens with form fields
- [ ] Title validation (required, non-empty)
- [ ] Successful creation closes dialog + task appears in grid
- [ ] Error state shows message in dialog
- [ ] Keyboard accessible
- [ ] Passes lint, typecheck, build

### Task 3.2: Consolidate Duplicate Task Handlers (G-3)

**Agent**: service-engineer
**Files to Modify**:
- `src/main/ipc/handlers/hub-handlers.ts` — Remove `hub.tasks.*` channel registrations
- `src/main/ipc/index.ts` — Verify registration order

**Files to Read**:
- `src/main/ipc/handlers/task-handlers.ts` — The authoritative handler file
- `src/main/ipc/handlers/hub-handlers.ts` — Find duplicates to remove

**Specification**:
- `task-handlers.ts` is the authoritative source for ALL task channels (`hub.tasks.*` and `tasks.*`)
- Remove ALL `hub.tasks.*` handler registrations from `hub-handlers.ts`
- Keep non-task Hub handlers in `hub-handlers.ts` (connection, sync, config, auth, etc.)
- Verify `task-handlers.ts` is registered AFTER `hub-handlers.ts` in `index.ts` (or order doesn't matter after dedup)
- Run tests to confirm no breakage

**Acceptance Criteria**:
- [ ] `hub-handlers.ts` has zero `hub.tasks.*` registrations
- [ ] `task-handlers.ts` is the single source for all task channels
- [ ] All existing task IPC calls still work
- [ ] All task-related tests pass
- [ ] Passes lint, typecheck, test, build

---

## Phase 4: Project & Hub Polish (Depends on Phase 1)

### Task 4.1: Project Edit Page (G-15)

**Agent**: component-engineer
**Depends on**: Task 1.1 (uses ConfirmDialog for delete)
**Files to Create**:
- `src/renderer/features/projects/components/ProjectEditDialog.tsx`

**Files to Modify**:
- `src/renderer/features/projects/components/ProjectListPage.tsx` — Add edit button per project

**Specification**:
- Each project card in `ProjectListPage` gets an "Edit" icon button (Pencil icon)
- Click opens `ProjectEditDialog` (Radix Dialog)
- Dialog form fields (pre-filled from project data):
  - Name (text input, required)
  - Description (textarea, optional)
  - Default Branch (text input, optional)
  - Git URL (text input, optional)
- Save calls `useUpdateProject().mutate({ projectId, ...fields })`
- Delete button at bottom of dialog opens ConfirmDialog
  - On confirm: calls `useRemoveProject().mutate({ projectId })`
  - On success: close both dialogs, project removed from list
- On save success: close dialog, project list refreshes

**Acceptance Criteria**:
- [ ] Edit button visible on project cards
- [ ] Dialog pre-fills current project data
- [ ] Save updates project via IPC
- [ ] Delete with confirmation removes project
- [ ] All fields optional except name
- [ ] Passes lint, typecheck, build

### Task 4.2: Delete Confirmation Wiring (G-16)

**Agent**: component-engineer
**Depends on**: Task 1.1 (ConfirmDialog component)
**Files to Modify**:
- `src/renderer/features/tasks/components/detail/TaskControls.tsx` — Wrap delete in confirm
- `src/renderer/features/tasks/components/cells/ActionsCell.tsx` — Wrap delete in confirm

**Specification**:
- Task delete (both in detail panel and grid actions) now shows ConfirmDialog first
- Title: "Delete Task"
- Description: "Are you sure you want to delete '{task.title}'? This action cannot be undone."
- Variant: destructive
- On confirm: call existing `useDeleteTask().mutate()`
- Loading state while mutation is pending
- Sub-project delete (if UI exists) also uses ConfirmDialog

**Acceptance Criteria**:
- [ ] Clicking delete shows confirmation dialog
- [ ] Task only deleted after user confirms
- [ ] Escape/cancel closes without deleting
- [ ] Loading spinner during deletion
- [ ] Works in both grid action cell and detail panel
- [ ] Passes lint, typecheck, build

### Task 4.3: Hub Disconnect Error Handling (G-4)

**Agent**: hook-engineer
**Files to Create**:
- `src/renderer/shared/hooks/useMutationErrorToast.ts`

**Files to Modify**:
- `src/renderer/features/tasks/api/useTaskMutations.ts` — Add `onError` to all mutations
- `src/renderer/features/projects/api/useProjects.ts` — Add `onError` to mutations

**Specification**:
- Create `useMutationErrorToast()` custom hook:
  - Returns an `onError` callback factory
  - Shows toast notification via existing notification system or simple toast state
  - Message format: "Failed to {action}: {error.message}"
  - Auto-dismiss after 5 seconds
- Wire into all task mutations:
  - `useCreateTask` → "Failed to create task"
  - `useUpdateTaskStatus` → "Failed to update task status"
  - `useDeleteTask` → "Failed to delete task"
  - `useExecuteTask` → "Failed to execute task"
  - `useCancelTask` → "Failed to cancel task"
- Wire into project mutations:
  - `useRemoveProject` → "Failed to remove project"
  - `useUpdateProject` → "Failed to update project"

**Acceptance Criteria**:
- [ ] All task/project mutations have `onError` handlers
- [ ] Error toast visible when mutation fails
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Error message includes the action that failed
- [ ] No console-only errors for user-facing operations
- [ ] Passes lint, typecheck, build

---

## Dependency Graph

```
Phase 1                    Phase 2                     Phase 3                    Phase 4
────────                   ────────                    ────────                   ────────
Task 1.1                   Task 2.1                    Task 3.1                   Task 4.1
ConfirmDialog ─────┐       Token Refresh               Create Task Dialog         Project Edit ◀── 1.1
                   │            │                           │                          │
                   │       Task 2.2 ◀── 2.1            Task 3.2                   Task 4.2 ◀── 1.1
                   │       User Menu                    Dedup Handlers             Delete Confirms
                   │                                                                   │
                   └──────────────────────────────────────────────────────────── Task 4.3
                                                                                Error Toasts
```

**Parallel opportunities:**
- Phase 1 and Phase 2 run simultaneously (no shared files)
- Tasks 3.1 + 3.2 can run in parallel (different files)
- Tasks 4.1 + 4.2 + 4.3 can run in parallel (different files)

---

## Wave Execution Plan

| Wave | Tasks | Agents | Est. Time |
|------|-------|--------|-----------|
| 1 | 1.1 (ConfirmDialog) + 2.1 (Token Refresh) | 2 parallel | ~1 hour |
| 2 | 2.2 (User Menu) + 3.1 (Create Task) + 3.2 (Dedup Handlers) | 3 parallel | ~1 hour |
| 3 | 4.1 (Project Edit) + 4.2 (Delete Confirms) + 4.3 (Error Toasts) | 3 parallel | ~1 hour |
| 4 | Documentation update + Integration test | 1 agent | ~30 min |

---

## Files Summary

### Files to Create (5 new)
1. `src/renderer/shared/components/ConfirmDialog.tsx`
2. `src/renderer/features/auth/hooks/useTokenRefresh.ts`
3. `src/renderer/app/layouts/UserMenu.tsx`
4. `src/renderer/features/tasks/components/CreateTaskDialog.tsx`
5. `src/renderer/features/projects/components/ProjectEditDialog.tsx`
6. `src/renderer/shared/hooks/useMutationErrorToast.ts`

### Files to Modify (9 existing)
1. `src/renderer/features/auth/store.ts` — Add `expiresAt`
2. `src/renderer/features/auth/api/useAuth.ts` — Store expiry on login
3. `src/renderer/features/auth/components/AuthGuard.tsx` — Call `useTokenRefresh()`
4. `src/renderer/app/layouts/Sidebar.tsx` — Add UserMenu
5. `src/renderer/features/tasks/components/TaskFiltersToolbar.tsx` — Add "New Task" button
6. `src/renderer/features/tasks/store.ts` — Add dialog state
7. `src/main/ipc/handlers/hub-handlers.ts` — Remove duplicate task handlers
8. `src/renderer/features/tasks/api/useTaskMutations.ts` — Add `onError`
9. `src/renderer/features/projects/api/useProjects.ts` — Add `onError`
10. `src/renderer/features/projects/components/ProjectListPage.tsx` — Add edit button
11. `src/renderer/features/tasks/components/detail/TaskControls.tsx` — Wrap delete
12. `src/renderer/features/tasks/components/cells/ActionsCell.tsx` — Wrap delete

### No Changes Needed
- `src/shared/ipc-contract.ts` — All channels already exist
- `src/shared/types/` — All types already defined
- `src/main/services/` — All services already implemented
- Hub backend — No backend changes

---

## Test Gate

After ALL tasks complete:
```bash
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All tests pass
npm run build        # Builds successfully
```

## Post-Implementation

1. Update `ai-docs/user-interface-flow.md` — Mark gaps as RESOLVED
2. Update `ai-docs/ARCHITECTURE.md` if new patterns introduced
3. Commit, push, create PR
