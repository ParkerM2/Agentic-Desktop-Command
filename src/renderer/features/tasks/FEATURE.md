# Task Management

Task dashboard with TanStack Table + shadcn Table primitives, real-time agent/QA updates, and expandable detail rows. All task data lives in the `progress_tasks` SQLite table (sole source of truth) — the old `.adc/specs/` filesystem system has been fully removed.

## Key Files

- **`store.ts`** — Zustand UI state: selection, filters, row expansion, search, create dialog
- **`api/queryKeys.ts`** — React Query key factory for task lists and details
- **`api/useProgress.ts`** — Query hooks for task listing via `PROGRESS.*` channels
- **`api/useProgressMutations.ts`** — Mutations: create, update, delete (simple `onSuccess` invalidation, no optimistic updates)
- **`api/useTaskMutations.ts`** — Hub task mutations (status, execute, cancel)
- **`api/useAgentMutations.ts`** — Agent lifecycle: start planning/execution, kill, restart from checkpoint
- **`api/useQaMutations.ts`** — QA operations: start quiet/full QA, cancel, fetch report/session
- **`hooks/useTaskEvents.ts`** — Orchestrates useAgentEvents + useQaEvents; EventBridge handles progress.task.* invalidation
- **`hooks/useAgentEvents.ts`** — Agent session events to cache; **`hooks/useQaEvents.ts`** — QA session events to cache

## Components

- **`components/grid/ProgressTaskGrid.tsx`** — TanStack Table with shadcn `Table`/`TableRow`/`TableCell` primitives, column defs with inline cell rendering, expandable detail rows. Columns include done stage badge and completed priority badge.
- **`components/TaskFiltersToolbar.tsx`** — Status filter chips and search; **`components/TaskStatusBadge.tsx`** — Status pill; **`components/CreateTaskDialog.tsx`** — New task modal
- Detail panels (in `detail/`): **`TaskDetailRow`**, **`ExecutionLog`**, **`PlanViewer`**, **`PrStatusPanel`**, **`QaReportViewer`**, **`SubtaskList`**, **`TaskControls`**

## How It Connects

- IPC channels: `progress.*` (via `PROGRESS` channel constants), `agents.*`, `qa.*` for all CRUD and lifecycle operations
- All task data reads from `ProgressService` backed by SQLite `progress_tasks` table
- Real-time updates via EventBridge (progress events) and Hub WebSocket entity events
- Mutations use simple `onSuccess` invalidation (no optimistic updates — IPC is <1ms)
- Consumes project context from `@features/projects` for scoped task queries
- Client can pre-generate UUIDs via `crypto.randomUUID()` for task creation
