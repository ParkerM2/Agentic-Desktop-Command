# Task Management

Task dashboard with TanStack Table + shadcn Table primitives, real-time agent/QA updates, and expandable detail rows.

## Key Files

- **`store.ts`** — Zustand UI state: selection, filters, row expansion, search, create dialog
- **`api/queryKeys.ts`** — React Query key factory for task lists and details
- **`api/useTasks.ts`** — Query hooks for task listing and creation
- **`api/useTaskMutations.ts`** — Mutations: update status, delete, execute, cancel
- **`api/useAgentMutations.ts`** — Agent lifecycle: start planning/execution, kill, restart from checkpoint
- **`api/useQaMutations.ts`** — QA operations: start quiet/full QA, cancel, fetch report/session
- **`hooks/useTaskEvents.ts`** — Bridges task + Hub entity events to React Query cache invalidation
- **`hooks/useAgentEvents.ts`** — Agent session events to cache; **`hooks/useQaEvents.ts`** — QA session events to cache

## Components

- **`components/grid/ProgressTaskGrid.tsx`** — TanStack Table with shadcn `Table`/`TableRow`/`TableCell` primitives, column defs with inline cell rendering, expandable detail rows
- **`components/TaskFiltersToolbar.tsx`** — Status filter chips and search; **`components/TaskStatusBadge.tsx`** — Status pill; **`components/CreateTaskDialog.tsx`** — New task modal
- Detail panels (in `detail/`): **`TaskDetailRow`**, **`ExecutionLog`**, **`PlanViewer`**, **`PrStatusPanel`**, **`QaReportViewer`**, **`SubtaskList`**, **`TaskControls`**

## How It Connects

- IPC channels: `tasks.*`, `agents.*`, `qa.*` for all CRUD and lifecycle operations
- Real-time updates via IPC events and Hub WebSocket entity events
- Consumes project context from `@features/projects` for scoped task queries
