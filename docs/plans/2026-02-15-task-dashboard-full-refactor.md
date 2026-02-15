# Task Dashboard Full Refactor — Design & Implementation Plan

**Date**: 2026-02-15
**Status**: PENDING APPROVAL
**Scope**: Full platform refactor — AG-Grid table, auth, workspaces, devices, Hub-first execution, progress watchers
**Dependencies**: AG-Grid Community v35.1.0 (evaluated at `docs/research/2026-02-14-ag-grid-evaluation.md`)

---

## Design Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Auth model | Full user auth (email/password, JWT, refresh tokens) |
| Task execution | Hub dispatches to workspace host device |
| Progress tracking | File-based: `.claude/progress/<feature>/<task>/` watched by chokidar |
| Row interaction | Expandable rows (DIY master/detail, full-width detail renderer) |
| Table library | AG-Grid Community (MIT, free) |
| Columns | Status, Title, Project, Workspace, Agent, Progress, Activity sparkline, PR Status, Cost, Updated, Priority, Actions |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ANY DEVICE (Client)                          │
│                                                                     │
│  AG-Grid Task Table ← WebSocket ← Hub broadcasts                   │
│  ├── Custom cell renderers (progress, sparkline, status, agent)     │
│  ├── Expandable detail rows (subtasks, logs, PR, controls)          │
│  ├── applyTransactionAsync() for live streaming updates             │
│  └── Auth context (JWT in memory, refresh token in httpOnly cookie) │
│                                                                     │
│  User clicks "Run" → API call → Hub                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          HUB SERVER                                  │
│                                                                     │
│  Auth: JWT issue/verify/refresh, bcrypt passwords, sessions table    │
│  API:  /auth/*, /workspaces/*, /projects/*, /tasks/*, /devices/*    │
│  WS:   Broadcast task updates to all authenticated clients           │
│  DB:   SQLite with migration versioning                              │
│  Dispatch: Route "execute" commands to workspace host device         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKSPACE HOST (Desktop App)                      │
│                                                                     │
│  Task Launcher: Receives dispatch → spawns `claude` CLI process      │
│  Progress Watcher: chokidar watches .claude/progress/**/*            │
│  Progress Parser: Reads YAML frontmatter + markdown body             │
│  Progress Syncer: Pushes parsed updates to Hub via API               │
│  Device Heartbeat: Pings Hub every 30s with online status            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Hub Database Schema (New/Modified Tables)

```sql
-- New: User accounts
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  settings TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- New: Auth sessions (JWT refresh tokens)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_id TEXT REFERENCES devices(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- New: Physical devices
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop',  -- desktop | laptop | phone | tablet
  capabilities TEXT DEFAULT '{}',  -- { canExecute: true, hasClaude: true }
  is_online INTEGER DEFAULT 0,
  last_seen TEXT,
  app_version TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- New: Logical workspaces
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  host_device_id TEXT REFERENCES devices(id),
  settings TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Modified: Projects (now workspace-scoped)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  root_path TEXT NOT NULL,
  git_url TEXT,
  repo_structure TEXT DEFAULT 'single',  -- single | monorepo | multi-repo
  default_branch TEXT DEFAULT 'main',
  settings TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- New: Sub-projects (for monorepo/multi-repo)
CREATE TABLE sub_projects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  git_url TEXT,
  default_branch TEXT DEFAULT 'main'
);

-- Modified: Tasks (workspace-aware, enhanced tracking)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  sub_project_id TEXT REFERENCES sub_projects(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'medium',  -- low | medium | high | critical
  agent_name TEXT,
  progress INTEGER DEFAULT 0,
  phase TEXT DEFAULT 'idle',
  activity_history TEXT DEFAULT '[]',  -- JSON array of recent progress snapshots
  cost_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  pr_number INTEGER,
  pr_state TEXT,  -- open | closed | merged
  pr_ci_status TEXT,  -- pending | success | failure
  pr_url TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- New: Task execution sessions
CREATE TABLE task_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id),
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'running',  -- running | completed | failed | cancelled
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  token_usage INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  error_message TEXT
);
```

### Progress File Format

```yaml
---
task_id: abc-123
phase: coding
progress: 45
status: in_progress
agent: claude-opus
subtask: "Implementing user service"
tokens_used: 12500
cost_usd: 0.38
---

## Current Activity
Working on user registration endpoint. Password hashing with bcrypt.

## Completed
- [x] Database schema migration
- [x] User model types

## Next
- [ ] Login endpoint
- [ ] JWT token generation
```

---

## AG-Grid Table Design

### Column Definitions

| Column | Field | Width | Cell Renderer | Sortable | Filterable |
|--------|-------|-------|---------------|----------|------------|
| ▶ | (expand toggle) | 40px | ExpandToggleCell | No | No |
| Status | `status` | 130px | StatusBadgeCell | Yes | Multi-select |
| Title | `title` | flex | TitleCell (truncated, bold) | Yes | Text search |
| Project | `project.name` | 150px | Text | Yes | Multi-select |
| Workspace | `workspace.name` | 130px | WorkspaceCell (with online dot) | Yes | Multi-select |
| Agent | `agent_name` | 140px | AgentCell (avatar + name) | Yes | Multi-select |
| Progress | `progress` | 180px | ProgressBarCell (bar + phase label) | Yes | No |
| Activity | `activity_history` | 150px | ActivitySparklineCell (SVG) | No | No |
| Priority | `priority` | 100px | PriorityCell (icon + label) | Yes | Multi-select |
| PR | `pr_state` | 100px | PRStatusCell (badge + CI dot) | Yes | Multi-select |
| Cost | `cost_usd` | 90px | CostCell (formatted $X.XX) | Yes | No |
| Updated | `updated_at` | 110px | RelativeTimeCell ("2m ago") | Yes | No |
| Actions | — | 120px | ActionsCell (Run/Stop/Delete) | No | No |

### Expandable Detail Row (DIY Master/Detail)

When a row is expanded, a full-width detail row renders below it containing:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────────────────────┐ ┌────────────────┐   │
│ │  Subtasks     │ │  Execution Log (scrollable)  │ │  PR Status     │   │
│ │  ☑ Schema     │ │  > Planning phase complete   │ │  #42 Open      │   │
│ │  ☑ Types      │ │  > Coding: user-service.ts   │ │  CI: ✓ passing │   │
│ │  ◻ Endpoints  │ │  > Test: 3/5 passing         │ │  Reviews: 0    │   │
│ │  ◻ Tests      │ │  > ...                       │ │  [View PR →]   │   │
│ └──────────────┘ └──────────────────────────────┘ └────────────────┘   │
│                                                                         │
│ ┌──────────────────────────────────────────────────────────────────┐    │
│ │  Controls: [Pause] [Stop] [Retry] [Assign Agent ▼] [Delete]    │    │
│ └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Real-Time Update Flow

```typescript
// 1. Progress watcher detects file change
chokidar.watch('.claude/progress/**/*.md')

// 2. Parser extracts YAML frontmatter
const { taskId, phase, progress, status, tokens, cost } = parseProgress(content)

// 3. Syncer pushes to Hub
await hubApi.post(`/tasks/${taskId}/progress`, { phase, progress, tokens, cost })

// 4. Hub broadcasts via WebSocket
ws.broadcast({ type: 'task:progress', taskId, data: { phase, progress, ... } })

// 5. Client receives, updates AG-Grid
gridApi.applyTransactionAsync({ update: [{ id: taskId, progress, phase, ... }] })
```

---

## Implementation Phases

### Phase 1: Auth & Database Foundation
**Scope**: User registration/login, JWT auth, database migrations, Hub API updates
**Effort**: ~8 hours

#### Tasks
1. **Hub migration system** — Create `migration-runner.ts`, move schema to `migrations/001_initial.sql`
2. **Auth schema** — Migration `002_auth.sql`: users, sessions tables
3. **Auth service** — `hub/src/services/auth-service.ts`: register, login, verify, refresh
4. **Auth routes** — `hub/src/routes/auth.ts`: POST /register, /login, /logout, /refresh, GET /me
5. **Auth middleware** — JWT verification middleware for all protected routes
6. **Login UI** — `src/renderer/features/auth/components/LoginPage.tsx`: email/password form
7. **Auth context** — JWT storage in memory, refresh token handling, auth state in Zustand
8. **Protected routes** — Redirect to login if not authenticated

#### Files
```
CREATE  hub/src/db/migration-runner.ts
CREATE  hub/src/db/migrations/001_initial_schema.sql
CREATE  hub/src/db/migrations/002_auth.sql
CREATE  hub/src/services/auth-service.ts
MODIFY  hub/src/routes/auth.ts (rewrite for user auth)
CREATE  hub/src/middleware/auth-middleware.ts
CREATE  src/renderer/features/auth/components/LoginPage.tsx
CREATE  src/renderer/features/auth/components/RegisterPage.tsx
CREATE  src/renderer/features/auth/store.ts
CREATE  src/renderer/features/auth/api/useAuth.ts
MODIFY  src/renderer/app/router.tsx (add auth routes, guards)
MODIFY  src/shared/ipc-contract.ts (auth channels)
```

---

### Phase 2: Devices & Workspaces
**Scope**: Device registration, workspace CRUD, heartbeat system
**Effort**: ~8 hours

#### Tasks
1. **Schema migration** — `003_devices_workspaces.sql`: devices, workspaces tables
2. **Device service** — `src/main/services/device/device-service.ts`: register device, generate machine ID, heartbeat
3. **Workspace service** — `src/main/services/workspace/workspace-service.ts`: CRUD, host assignment
4. **Hub API routes** — `/api/devices/*`, `/api/workspaces/*`
5. **Device heartbeat** — 30s interval ping to Hub with online status
6. **Workspace settings UI** — `WorkspacesTab.tsx` in Settings page
7. **First-run flow update** — After auth, prompt to name workspace + add first project

#### Files
```
CREATE  hub/src/db/migrations/003_devices_workspaces.sql
CREATE  hub/src/routes/devices.ts
CREATE  hub/src/routes/workspaces.ts
CREATE  hub/src/services/device-service.ts
CREATE  hub/src/services/workspace-service.ts
CREATE  src/main/services/device/device-service.ts
CREATE  src/main/services/device/heartbeat.ts
CREATE  src/main/services/workspace/workspace-service.ts
CREATE  src/main/ipc/handlers/device-handlers.ts
CREATE  src/main/ipc/handlers/workspace-handlers.ts
CREATE  src/renderer/features/settings/components/WorkspacesTab.tsx
CREATE  src/renderer/features/settings/components/WorkspaceCard.tsx
MODIFY  src/renderer/features/onboarding/ (workspace setup step)
MODIFY  src/shared/ipc-contract.ts
MODIFY  src/shared/types/ (device, workspace types)
```

---

### Phase 3: Project Enhancements (Multi-Repo)
**Scope**: Project model upgrade, sub-project support, repo detection
**Effort**: ~6 hours

#### Tasks
1. **Schema migration** — `004_projects_enhanced.sql`: update projects table, add sub_projects
2. **Project service update** — Detect repo structure (single/monorepo/multi-repo), manage sub-projects
3. **Hub API routes** — Enhanced `/api/projects/*`, `/api/projects/:id/sub-projects`
4. **Project init wizard** — Multi-step: select folder → detect git → choose structure → confirm sub-projects
5. **Sub-project selector** — Dropdown in task creation for targeting specific sub-repo

#### Files
```
CREATE  hub/src/db/migrations/004_projects_enhanced.sql
MODIFY  hub/src/routes/projects.ts
CREATE  hub/src/services/project-service.ts (Hub-side)
MODIFY  src/main/services/project/project-service.ts (detection logic)
CREATE  src/renderer/features/projects/components/ProjectInitWizard.tsx
CREATE  src/renderer/features/projects/components/RepoTypeSelector.tsx
CREATE  src/renderer/features/projects/components/SubProjectSelector.tsx
MODIFY  src/shared/types/project.ts
MODIFY  src/shared/ipc-contract.ts
```

---

### Phase 4: AG-Grid Task Table
**Scope**: Replace hand-built TaskTable with AG-Grid, custom cell renderers, expandable detail rows
**Effort**: ~10 hours

#### Tasks
1. **Install AG-Grid** — `ag-grid-community` + `ag-grid-react` v35.1.0
2. **Module registration** — Selective imports for tree shaking
3. **AG-Grid theme** — Custom CSS theme using CSS custom properties (matches Tailwind v4 theme vars)
4. **Custom cell renderers** — StatusBadgeCell, ProgressBarCell, ActivitySparklineCell, AgentCell, PRStatusCell, CostCell, PriorityCell, ActionsCell, ExpandToggleCell, RelativeTimeCell, WorkspaceCell, TitleCell
5. **TaskDataGrid component** — Main AG-Grid wrapper with column definitions, getRowId, event handlers
6. **Expandable detail row** — Full-width row renderer with subtasks, logs, PR status, controls
7. **Task filters toolbar** — Search, status multi-select, workspace filter, project filter, priority filter, saved views
8. **Task creation** — Quick-create row or modal with project/sub-project/priority selection
9. **Bulk actions** — Multi-row select with bulk status change, bulk delete, bulk assign
10. **Remove old TaskTable** — Delete TaskTable, TaskTableRow, TaskTableHeader, TaskTableFilters

#### Files
```
npm install ag-grid-community@^35.1.0 ag-grid-react@^35.1.0

CREATE  src/renderer/features/tasks/components/grid/TaskDataGrid.tsx
CREATE  src/renderer/features/tasks/components/grid/ag-grid-modules.ts
CREATE  src/renderer/features/tasks/components/grid/ag-grid-theme.css
CREATE  src/renderer/features/tasks/components/cells/StatusBadgeCell.tsx
CREATE  src/renderer/features/tasks/components/cells/ProgressBarCell.tsx
CREATE  src/renderer/features/tasks/components/cells/ActivitySparklineCell.tsx
CREATE  src/renderer/features/tasks/components/cells/AgentCell.tsx
CREATE  src/renderer/features/tasks/components/cells/PRStatusCell.tsx
CREATE  src/renderer/features/tasks/components/cells/CostCell.tsx
CREATE  src/renderer/features/tasks/components/cells/PriorityCell.tsx
CREATE  src/renderer/features/tasks/components/cells/ActionsCell.tsx
CREATE  src/renderer/features/tasks/components/cells/ExpandToggleCell.tsx
CREATE  src/renderer/features/tasks/components/cells/WorkspaceCell.tsx
CREATE  src/renderer/features/tasks/components/cells/TitleCell.tsx
CREATE  src/renderer/features/tasks/components/cells/RelativeTimeCell.tsx
CREATE  src/renderer/features/tasks/components/detail/TaskDetailRow.tsx
CREATE  src/renderer/features/tasks/components/detail/SubtaskList.tsx
CREATE  src/renderer/features/tasks/components/detail/ExecutionLog.tsx
CREATE  src/renderer/features/tasks/components/detail/PRStatusPanel.tsx
CREATE  src/renderer/features/tasks/components/detail/TaskControls.tsx
CREATE  src/renderer/features/tasks/components/TaskFiltersToolbar.tsx
CREATE  src/renderer/features/tasks/components/TaskQuickCreate.tsx
DELETE  src/renderer/features/tasks/components/TaskTable.tsx
DELETE  src/renderer/features/tasks/components/TaskTableRow.tsx
DELETE  src/renderer/features/tasks/components/TaskTableHeader.tsx
DELETE  src/renderer/features/tasks/components/TaskTableFilters.tsx
MODIFY  src/renderer/features/tasks/store.ts (add grid state, expanded rows)
MODIFY  src/renderer/features/tasks/api/useTasks.ts (return data shaped for AG-Grid)
MODIFY  src/renderer/features/tasks/hooks/useTaskEvents.ts (use gridApi.applyTransactionAsync)
MODIFY  src/renderer/features/tasks/index.ts (update exports)
MODIFY  src/renderer/app/router.tsx (TaskDataGrid as route component)
MODIFY  src/renderer/styles/globals.css (AG-Grid theme overrides)
```

---

### Phase 5: Hub-First Task Operations
**Scope**: Migrate all task CRUD to Hub API, update IPC layer, enhanced task schema
**Effort**: ~6 hours

#### Tasks
1. **Schema migration** — `005_tasks_enhanced.sql`: add workspace_id, sub_project_id, priority, activity_history, cost fields, PR fields
2. **Hub task routes update** — Full CRUD with workspace/project filtering, pagination, sorting
3. **Hub task progress endpoint** — `POST /tasks/:id/progress` for progress watcher updates
4. **IPC contract update** — All task channels point to Hub, remove local-only task channels
5. **React Query hooks update** — Point to Hub channels, add workspace/project filtering params
6. **WebSocket task events** — Hub broadcasts create/update/delete/progress to all clients

#### Files
```
CREATE  hub/src/db/migrations/005_tasks_enhanced.sql
MODIFY  hub/src/routes/tasks.ts (enhanced CRUD + progress endpoint)
MODIFY  src/shared/ipc-contract.ts (consolidate task channels)
MODIFY  src/renderer/features/tasks/api/useTasks.ts
MODIFY  src/renderer/features/tasks/api/useTaskMutations.ts
MODIFY  src/renderer/features/tasks/hooks/useTaskEvents.ts
```

---

### Phase 6: Progress Watcher & Task Launcher
**Scope**: File-based progress watching, parsing, Hub sync, task execution dispatch
**Effort**: ~8 hours

#### Tasks
1. **Progress watcher** — `src/main/services/workflow/progress-watcher.ts`: chokidar watches `.claude/progress/**/*.md`
2. **Progress parser** — `src/main/services/workflow/progress-parser.ts`: YAML frontmatter extraction
3. **Progress syncer** — `src/main/services/workflow/progress-syncer.ts`: pushes parsed data to Hub API
4. **Task launcher** — `src/main/services/workflow/task-launcher.ts`: receives dispatch from Hub, spawns `claude` CLI with task spec
5. **Hub dispatch system** — Hub receives "execute" request, routes to workspace host via WebSocket
6. **Execution session tracking** — Track spawned processes, handle completion/failure/cancellation
7. **Cost tracking integration** — Parse token usage from Claude CLI output, include in progress updates

#### Files
```
CREATE  src/main/services/workflow/progress-watcher.ts
CREATE  src/main/services/workflow/progress-parser.ts
CREATE  src/main/services/workflow/progress-syncer.ts
CREATE  src/main/services/workflow/task-launcher.ts
CREATE  src/main/ipc/handlers/workflow-handlers.ts
MODIFY  hub/src/ws/broadcaster.ts (add dispatch routing)
CREATE  hub/src/services/dispatch-service.ts
MODIFY  src/shared/ipc-contract.ts (workflow channels)
MODIFY  src/shared/types/task.ts (progress file types)
```

---

### Phase 7: Cleanup & Polish
**Scope**: Remove dead code, update all docs, final integration testing
**Effort**: ~4 hours

#### Tasks
1. **Remove dead code** — Delete old agent-service.ts (PTY spawner), agent-queue.ts, token-parser.ts
2. **Remove unused IPC channels** — Clean up local-only task channels that are now Hub-only
3. **Update all documentation** — FEATURES-INDEX, ARCHITECTURE, DATA-FLOW, PROGRESS
4. **P5 polish items** — Hub connection indicator, background settings wiring (from P5 plan)
5. **Test suite updates** — Update unit/integration tests for new services and handlers

#### Files
```
DELETE  src/main/services/agent/agent-service.ts (if PTY-based)
DELETE  src/main/services/agent/agent-queue.ts (if exists)
DELETE  src/main/services/agent/token-parser.ts (if exists)
MODIFY  ai-docs/FEATURES-INDEX.md
MODIFY  ai-docs/ARCHITECTURE.md
MODIFY  ai-docs/DATA-FLOW.md
MODIFY  doc-history/PROGRESS.md
CREATE  tests/unit/services/workflow/*.test.ts
CREATE  tests/integration/ipc-handlers/workflow-handlers.test.ts
```

---

## Phase Dependency Graph

```
Phase 1 (Auth + DB) ──────────────────┐
                                       │
Phase 2 (Devices + Workspaces) ────────┤ (depends on Phase 1 auth)
                                       │
Phase 3 (Projects Enhanced) ───────────┤ (depends on Phase 2 workspaces)
                                       │
Phase 4 (AG-Grid Table) ──────────────┤ (can start after Phase 1, parallel with 2-3)
                                       │
Phase 5 (Hub-First Tasks) ────────────┤ (depends on Phases 2, 3, 4)
                                       │
Phase 6 (Progress Watcher + Launcher) ─┤ (depends on Phase 5)
                                       │
Phase 7 (Cleanup + Polish) ────────────┘ (depends on all above)
```

**Parallelization opportunities:**
- Phase 4 (AG-Grid) can run in parallel with Phases 2-3 (they touch different files)
- Phase 1 must complete first (everything depends on auth + migrations)

---

## Estimated Total Effort

| Phase | Effort | Parallel Group |
|-------|--------|----------------|
| 1. Auth & DB | ~8 hrs | Sequential (first) |
| 2. Devices & Workspaces | ~8 hrs | Group A |
| 3. Projects Enhanced | ~6 hrs | Group A |
| 4. AG-Grid Table | ~10 hrs | Group B (parallel with A) |
| 5. Hub-First Tasks | ~6 hrs | Sequential (after A+B) |
| 6. Progress Watcher | ~8 hrs | Sequential (after 5) |
| 7. Cleanup & Polish | ~4 hrs | Sequential (last) |
| **Total** | **~50 hrs** | **~35 hrs with parallelization** |

---

## Success Criteria

- [ ] User can register and login from any device
- [ ] Workspaces and devices are registered and show online/offline status
- [ ] Projects support single/monorepo/multi-repo structures
- [ ] AG-Grid task table with all 12 columns and custom cell renderers
- [ ] Expandable detail rows with subtasks, logs, PR status, controls
- [ ] Live streaming updates via WebSocket → AG-Grid applyTransactionAsync
- [ ] Click "Run" from any device → Hub dispatches to workspace host
- [ ] Workspace host spawns Claude CLI, writes progress files
- [ ] Progress watcher detects changes, parses, syncs to Hub
- [ ] All devices see real-time progress (bar, phase, sparkline, cost)
- [ ] PR status tracked and displayed per task
- [ ] Token/cost tracking per task execution
- [ ] Zero kanban code remaining
- [ ] Zero dead agent-service/PTY code
- [ ] `npm run lint` — 0 violations
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run test` — all passing
- [ ] `npm run build` — passes clean

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| AG-Grid Community lacks master/detail | DIY full-width detail rows — proven pattern, just more code |
| AG-Grid Community lacks sparklines | DIY SVG sparkline — 30 lines, already designed |
| chokidar file watching on Windows | chokidar v4 has improved Windows support; fallback to polling mode |
| JWT security | httpOnly refresh cookies, short-lived access tokens (15min), bcrypt with cost factor 12 |
| Hub SQLite concurrent access | WAL mode enabled, write serialization via Fastify request queue |
| Large progress file writes | Debounce watcher (500ms), parse only YAML frontmatter on change |
| WebSocket reconnection | Auto-reconnect with exponential backoff (already exists in hub-connection.ts) |
