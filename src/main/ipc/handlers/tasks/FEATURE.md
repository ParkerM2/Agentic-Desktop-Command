# Task IPC Handlers

Handles all task-related IPC channels, split into Hub-first and legacy handler groups with shared transformation utilities.

## Key Files

- **`hub-task-handlers.ts`** — Registers `hub.tasks.*` channels that proxy directly to the Hub REST API without status/type transformation
- **`legacy-task-handlers.ts`** — Registers `tasks.*` channels that call the Hub API but transform responses into the legacy local Task shape (camelCase, local status enum)
- **`status-mapping.ts`** — Bidirectional mapping between Hub statuses (`backlog`, `planning`, `plan_ready`, `queued`, `running`, `paused`, `review`, `done`, `error`) and local statuses (`backlog`, `queue`, `in_progress`, `ai_review`, `human_review`, `done`, `pr_created`, `error`)
- **`task-transform.ts`** — Converts Hub API task responses into the local Task shape expected by the renderer
- **`index.ts`** — Barrel export of `registerTaskHandlers()` plus re-exports of mapping/transform utilities

## How It Connects

- Called by `ipc-wiring` during bootstrap to register task channels on the IPC router
- Both handler groups call `HubApiClient` for data, but legacy handlers apply transforms at the boundary
- Renderer features use `tasks.*` (transformed) channels; admin views may use `hub.tasks.*` (raw) channels
