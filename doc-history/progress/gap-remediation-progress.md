# Feature: Gap Remediation (High + Medium Priority)

**Status**: COMPLETE
**Team**: gap-remediation
**Base Branch**: master
**Feature Branch**: master (direct, small wiring changes)
**Design Doc**: docs/plans/2026-02-15-gap-remediation.md
**Started**: 2026-02-15 18:00
**Last Updated**: 2026-02-15 19:00
**Updated By**: team-lead
**Commit**: b160ad2

---

## Agent Registry

| Agent Name | Role | Task ID | Status | QA Round | Notes |
|------------|------|---------|--------|----------|-------|
| wave1-confirm-dialog | Component Engineer | #1 | COMPLETE | 0/3 | ConfirmDialog created, lint/test/build pass |
| wave1-token-refresh | Hook Engineer | #2 | COMPLETE | 0/3 | expiresAt + useTokenRefresh, all 4 checks pass |
| wave2-user-menu | Component Engineer | #3 | COMPLETE | 0/3 | UserMenu.tsx + Sidebar wired, tests pass |
| wave2-create-task | Component Engineer | #4 | COMPLETE | 0/3 | CreateTaskDialog + New Task button, all checks pass |
| wave2-dedup-handlers | Service Engineer | #5 | COMPLETE | 0/3 | Removed 8 duplicate hub.tasks.* from hub-handlers.ts |
| wave3-project-edit | Component Engineer | #6 | COMPLETE | 0/3 | ProjectEditDialog + edit buttons, tests pass |
| wave3-delete-confirms | Component Engineer | #7 | COMPLETE | 0/3 | ConfirmDialog wired to TaskControls + ActionsCell |
| wave3-error-toasts | Hook Engineer | #8 | COMPLETE | 0/3 | Toast store + 11 mutations wired, tests pass |

---

## Dependency Graph

```
Wave 1 (parallel):
  #1 ConfirmDialog  ──┬──▶ #7 Delete Confirms
                      └──▶ #6 Project Edit (uses ConfirmDialog for delete)
  #2 Token Refresh  ──▶ #3 User Menu (auth store changes needed first)

Wave 2 (parallel, after Wave 1):
  #3 User Menu
  #4 Create Task Dialog
  #5 Dedup Handlers

Wave 3 (parallel, after Wave 1):
  #6 Project Edit
  #7 Delete Confirms
  #8 Error Toasts

#9 Documentation ◀── all above
```

---

## Task Progress

### Task #1: Create ConfirmDialog Component [PENDING]
- **Agent**: wave1-confirm-dialog
- **Gap**: G-16 (infrastructure)
- **Files Created**: `src/renderer/shared/components/ConfirmDialog.tsx`

### Task #2: Proactive Token Refresh [PENDING]
- **Agent**: wave1-token-refresh
- **Gap**: G-5
- **Files Created**: `src/renderer/features/auth/hooks/useTokenRefresh.ts`
- **Files Modified**: auth/store.ts, auth/api/useAuth.ts, auth/components/AuthGuard.tsx

### Task #3: Logout Button + User Menu [PENDING]
- **Agent**: wave2-user-menu
- **Gap**: G-1
- **Blocked By**: Task #2
- **Files Created**: `src/renderer/app/layouts/UserMenu.tsx`
- **Files Modified**: Sidebar.tsx

### Task #4: Create Task Dialog [PENDING]
- **Agent**: wave2-create-task
- **Gap**: G-2
- **Files Created**: `src/renderer/features/tasks/components/CreateTaskDialog.tsx`
- **Files Modified**: TaskFiltersToolbar.tsx, tasks/store.ts

### Task #5: Consolidate Duplicate Task Handlers [PENDING]
- **Agent**: wave2-dedup-handlers
- **Gap**: G-3
- **Files Modified**: hub-handlers.ts

### Task #6: Project Edit Dialog [PENDING]
- **Agent**: wave3-project-edit
- **Gap**: G-15
- **Blocked By**: Task #1
- **Files Created**: `src/renderer/features/projects/components/ProjectEditDialog.tsx`
- **Files Modified**: ProjectListPage.tsx

### Task #7: Delete Confirmation Wiring [PENDING]
- **Agent**: wave3-delete-confirms
- **Gap**: G-16
- **Blocked By**: Task #1
- **Files Modified**: TaskControls.tsx, ActionsCell.tsx

### Task #8: Hub Disconnect Error Handling [PENDING]
- **Agent**: wave3-error-toasts
- **Gap**: G-4
- **Files Created**: `src/renderer/shared/hooks/useMutationErrorToast.ts`
- **Files Modified**: useTaskMutations.ts, useProjects.ts

---

## Blockers

| Blocker | Affected Task | Reported By | Status | Resolution |
|---------|---------------|-------------|--------|------------|
| None | | | | |

---

## Recovery Notes

If this feature is resumed by a new session:

1. Read this file for current state
2. Run `git status` to check uncommitted work
3. Resume from the first non-COMPLETE task
4. Update "Last Updated" and "Updated By" fields
