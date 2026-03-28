# Workspaces Management UI

> Tracker Key: `workspace-ui` | Status: **DRAFT** | Priority: **P1** | Created: 2026-02-26

---

## Problem

Workspace backend is fully wired (IPC channels `workspace.*`, Hub API proxy, Zustand store, React Query hooks) but has **zero UI components**. Users can't see, create, or manage workspaces.

## Goals

- Dedicated workspaces page accessible from sidebar navigation
- List workspaces with name, member count, project count
- Create, edit, rename, delete workspaces
- View workspace members and projects
- Switch active workspace context

## Approach

### Route

- Add `/workspaces` route under personal navigation section
- Add to `shared-nav.ts` personal items

### Components

| Component | Purpose |
|-----------|---------|
| `WorkspaceList.tsx` | Card grid or table listing all workspaces |
| `WorkspaceCard.tsx` | Individual workspace card with name, stats, actions |
| `CreateWorkspaceDialog.tsx` | Modal form for creating a new workspace |
| `EditWorkspaceDialog.tsx` | Modal form for editing workspace details |
| `WorkspaceDetail.tsx` | Detail view showing members + projects |

### Data Flow

Uses existing hooks in `src/renderer/features/workspaces/`:
- `useWorkspaces()` — list query
- `useCreateWorkspace()` — mutation
- `useUpdateWorkspace()` — mutation
- `useDeleteWorkspace()` — mutation

All IPC channels already wired in `src/shared/ipc/hub/`.

## Estimated Effort

~1 day (backend complete, just UI components needed)
