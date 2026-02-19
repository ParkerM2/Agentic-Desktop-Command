# Task Dashboard & Multi-Device Workflow

> Tracker Key: `kanban-workflow` | Status: **SUPERSEDED** | Created: 2026-02-13

---

## Problem Statement

The current Kanban automated workflow has three competing systems:

1. **Python Orchestration** (`ai-docs/`) — Standalone, well-built, but creates coupling
2. **Electron PTY Wrapper** — Broken `claude --task` invocation, no real execution
3. **Claude Workflow Skills** (`.claude/`) — Native Claude Code integration, team-based

Additionally:
- Kanban board is visually nice but information-sparse
- No mobile access for monitoring/managing tasks
- No multi-computer coordination
- Hub server exists but isn't fully utilized

---

## Goal

Replace the Kanban board with a **Jira-style task dashboard** that:

1. Displays all tasks in a filterable/sortable table
2. Syncs across devices via Hub server (local network or hosted)
3. Allows any authenticated device to view, create, and assign tasks
4. Executes tasks on the workspace host device
5. Uses Claude Workflow skills for orchestration (not internal PTY)
6. Supports complex project structures (monorepo, multi-repo)

**Pipeline**: `Any Device (authenticated) → Hub Sync → Workspace Host (execute) → Progress Files → Hub Sync → All Devices Updated`

---

## Related Documents

- **Workspace & Project Management**: `docs/plans/2026-02-14-workspace-project-management.md`
- **Hub Protocol Contract**: `docs/contracts/hub-device-protocol.md`
- **Protocol Types**: `src/shared/types/hub-protocol.ts`

---

## Architecture

### Current (Broken)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Kanban UI  │────▶│ agent-service│────▶│ PTY Process │
│             │     │ (TypeScript) │     │ claude --task│ ← BROKEN
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Python Specs │ ← Not actually called
                    └──────────────┘
```

### Proposed: Multi-Device Architecture

```
                                    ┌─────────────────────────────────┐
                                    │           HUB SERVER            │
                                    │     (Local Network or Hosted)   │
                                    │                                 │
                                    │  ┌─────────┐ ┌───────────────┐  │
                                    │  │ SQLite  │ │   WebSocket   │  │
                                    │  │   DB    │ │   Broadcast   │  │
                                    │  └─────────┘ └───────────────┘  │
                                    │                                 │
                                    │  Users, Devices, Workspaces,    │
                                    │  Projects, Tasks, Sessions      │
                                    └─────────────────────────────────┘
                                                 ▲
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
     ┌──────────────┴──────────────┐  ┌─────────┴─────────┐  ┌───────────────┴───────────────┐
     │      DESKTOP DEVICES        │  │  MOBILE DEVICES   │  │        WEB CLIENTS            │
     │   (can host workspaces)     │  │  (view & manage)  │  │   (friend's computer, etc.)   │
     └──────────────┬──────────────┘  └───────────────────┘  └───────────────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     │              │              │
     ▼              ▼              ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│WORKSPACE│   │WORKSPACE│   │WORKSPACE│
│"Work PC"│   │"Home PC"│   │"Laptop" │
│         │   │         │   │         │
│Projects:│   │Projects:│   │Projects:│
│• company│   │• claude │   │• blog   │
│• infra  │   │• dotfile│   │• learn  │
└─────────┘   └─────────┘   └─────────┘
```

### Key Concepts

**User** (authenticated account):
- Can sign in from ANY device (phone, friend's laptop, tablet)
- Owns workspaces, sees all their data across devices
- Single account, multiple devices

**Device** (physical machine):
- Desktop: Can host workspaces, execute tasks
- Mobile/Web: View and manage only, cannot execute
- Registered to a user, has capabilities

**Workspace** (logical execution environment):
- User-named: "Work PC", "Home Desktop", "Personal Laptop"
- Hosted on a specific desktop device
- Contains projects
- Configurable in Settings → Workspaces tab

**Project** (git repository within workspace):
- Three types: `single` | `monorepo` | `multi-repo`
- Multi-repo: Parent folder containing child git repos
- Sub-projects: Child repos in multi-repo (e.g., /frontend, /backend)
- Tasks can target entire project or specific sub-project

**Hub Server**:
- Central database: Users, Devices, Workspaces, Projects, Tasks
- Authentication (JWT)
- WebSocket for real-time sync
- Self-hosted (local network) or cloud-hosted

> **Full Details**: See `docs/plans/2026-02-14-workspace-project-management.md`

### Execution Flow

```
1. USER (on mobile, or friend's laptop, etc.) creates task:
   "Add dark mode to settings page"
   Workspace: "Home Desktop"
   Project: claude-ui
   Target: (entire project)  ← or specific sub-project for multi-repo

2. HUB validates user auth, broadcasts task to all user's connected devices

3. HOME DESKTOP (workspace host) sees new task in dashboard
   - Status: QUEUED
   - Workspace: this machine hosts it

4. USER (from any device) or AUTO starts task
   - Workspace host receives command
   - Launches: claude -p "Use /implement-feature for: Add dark mode..."
   - Claude Workflow takes over

5. PROGRESS FILES written locally on workspace host
   - Progress watcher syncs to Hub
   - Hub broadcasts to ALL user's devices

6. USER (on mobile, anywhere) sees real-time updates:
   - Task: IN_PROGRESS
   - Current agent: component-engineer
   - Files changed: 3

7. WORKFLOW COMPLETES
   - PR created
   - Task status: REVIEW
   - All devices see final state
   - Notification sent to mobile
```

### Multi-Repo Example

```
USER creates task in "company-monolith" project (multi-repo):
   Title: "Add auth middleware"
   Target: backend (sub-project)  ← only this sub-repo

Claude executes in: /work/company-monolith/backend/
   - Only touches backend code
   - PR scoped to backend repo
```

---

---

## Task Dashboard (Replaces Kanban)

### Why Table Over Kanban

| Aspect | Kanban Board | Task Table |
|--------|--------------|------------|
| Information density | Low (card-based) | High (rows with columns) |
| Filtering | Limited | Full (status, project, computer, date) |
| Sorting | None | Any column |
| Bulk actions | Awkward | Natural (checkbox select) |
| Completed tasks | Clutters board | Filter out, still queryable |
| Mobile-friendly | Poor (horizontal scroll) | Good (responsive columns) |
| Scale | 20-30 tasks max | Hundreds with pagination |

### Table Columns

| Column | Description | Sortable | Filterable |
|--------|-------------|----------|------------|
| Status | Backlog, Queued, Running, Review, Done, Error | ✓ | ✓ |
| Title | Task name (clickable for details) | ✓ | Search |
| Workspace | Which workspace | ✓ | ✓ |
| Project | Which project | ✓ | ✓ |
| Target | Sub-project if multi-repo (e.g., "frontend") | - | ✓ |
| Agent | Current active agent (if running) | - | - |
| Progress | Progress bar or phase indicator | - | - |
| Created | Timestamp | ✓ | Date range |
| Updated | Last activity | ✓ | Date range |
| Actions | Start, Stop, Delete buttons | - | - |

### Views / Filters

- **My Work**: Tasks on current workspace (if viewing from host)
- **All Tasks**: Full table across all workspaces
- **By Workspace**: Filter by specific workspace
- **Active**: Currently running tasks
- **Review**: Awaiting human review
- **History**: Completed tasks (last 30 days)

### Quick Actions

- **New Task**: Modal with title, description, project, target computer
- **Bulk Start**: Start multiple queued tasks
- **Bulk Archive**: Archive completed tasks

---

## Communication Protocol

### Progress File Format

Agents write structured progress to `docs/progress/<feature>-progress.md`:

```markdown
---
feature: my-feature
status: IN_PROGRESS
started: 2026-02-13T10:00:00Z
updated: 2026-02-13T10:15:00Z
team_lead: session-abc123
---

# Feature: My Feature

## Tasks

| ID | Task | Status | Agent | Worktree |
|----|------|--------|-------|----------|
| 1 | Schema types | COMPLETE | schema-eng | audit/schema |
| 2 | Service impl | IN_PROGRESS | service-eng | audit/service |
| 3 | IPC handlers | BLOCKED | - | - |

## Active Agents

- `service-eng` (session-xyz789): Working on task #2
  - Last activity: 2026-02-13T10:14:32Z
  - Current file: src/main/services/foo.ts

## Logs

- 10:00:00 — Team initialized
- 10:02:15 — Task #1 assigned to schema-eng
- 10:08:42 — Task #1 COMPLETE, QA PASS
- 10:09:00 — Task #2 assigned to service-eng
```

### UI File Watcher

The Electron app watches progress files using `chokidar`:

```typescript
// src/main/services/workflow/progress-watcher.ts
import chokidar from 'chokidar';
import { parse as parseYaml } from 'yaml';

interface ProgressUpdate {
  feature: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'ERROR';
  tasks: TaskProgress[];
  agents: AgentProgress[];
  logs: string[];
}

export function createProgressWatcher(router: IpcRouter) {
  const watcher = chokidar.watch('docs/progress/*.md', {
    persistent: true,
    ignoreInitial: false,
  });

  watcher.on('change', (path) => {
    const content = readFileSync(path, 'utf-8');
    const progress = parseProgressFile(content);
    router.emit('event:workflow.progress', progress);
  });

  return { dispose: () => watcher.close() };
}
```

### Task Launcher

Minimal launcher that starts a Claude session with the workflow skill:

```typescript
// src/main/services/workflow/task-launcher.ts
import { spawn } from 'child_process';

export function launchWorkflow(taskDescription: string, projectPath: string) {
  const prompt = `
Use /implement-feature to execute this task:

${taskDescription}

Project path: ${projectPath}
Write progress to: docs/progress/
`;

  // Spawn detached Claude session
  const child = spawn('claude', ['-p', prompt], {
    cwd: projectPath,
    detached: true,
    stdio: 'ignore',
  });

  child.unref(); // Don't wait for it
  return { sessionId: `workflow-${Date.now()}` };
}
```

---

## What to Keep

### From Current App
- `TaskDetailModal.tsx` — Task details view (adapt for table row click)
- `task-service.ts` — Task CRUD (but sync to Hub instead of local-only)
- `useTasks.ts`, `useTaskMutations.ts` — React Query hooks (point to Hub API)
- `hub/` — Hub server (SQLite, WebSocket, REST API) — **Core infrastructure**
- `hub-connection.ts`, `hub-sync.ts` — Client-side Hub integration

### From Claude Workflow Skills
- `/implement-feature` — Team orchestration
- Agent definitions (`.claude/agents/`)
- Progress file format (`PROGRESS-FILE-TEMPLATE.md`)
- QA checklist templates
- Worktree management

---

## What to Remove/Replace

### Remove
- `KanbanBoard.tsx`, `KanbanColumn.tsx`, `KanbanCard.tsx` — Replace with table
- `agent-service.ts` — PTY-based agent spawning (broken)
- `agent-queue.ts` — Internal queue (let Claude handle parallelism)
- `token-parser.ts` — PTY output parsing
- Python orchestration (`ai-docs/agents/`, `ai-docs/spec/`, etc.) — Archive to `doc-history/`

### Replace
- `tasks.execute` IPC handler → Call `launchWorkflow()` instead
- Local task storage → Hub database (SQLite)
- Agent status tracking → Progress files synced to Hub
- Kanban view → Task table with filters

---

## New Components

### 1. Task Table UI
```
src/renderer/features/tasks/
├── components/
│   ├── TaskTable.tsx          # Main table component
│   ├── TaskTableRow.tsx       # Individual row with actions
│   ├── TaskTableFilters.tsx   # Status, project, computer filters
│   ├── TaskTableHeader.tsx    # Sortable column headers
│   ├── TaskQuickCreate.tsx    # Inline task creation
│   └── TaskDetailPanel.tsx    # Side panel for task details
├── hooks/
│   └── useTaskFilters.ts      # Filter/sort state management
└── store.ts                   # UI state (selected rows, view mode)
```

### 2. Device & Workspace Services
```
src/main/services/device/
├── device-service.ts          # Register this device with Hub
├── device-identity.ts         # Unique machine ID generation
└── heartbeat.ts               # Periodic "I'm online" ping to Hub

src/main/services/workspace/
├── workspace-service.ts       # Workspace CRUD, host assignment
└── workspace-sync.ts          # Sync workspace state to Hub
```

### 2b. Project Initialization
```
src/main/services/project/
├── project-detector.ts        # Detect repo type, child repos
├── project-initializer.ts     # Create project with sub-projects
└── sub-project-service.ts     # Manage sub-projects
```

### 2c. Workspace Settings UI
```
src/renderer/features/settings/
├── components/
│   ├── WorkspacesTab.tsx      # Settings → Workspaces
│   ├── WorkspaceCard.tsx      # Individual workspace in list
│   ├── WorkspaceEditor.tsx    # Edit workspace modal
│   └── DeviceSelector.tsx     # Host device dropdown
```

### 2d. Project Initialization UI
```
src/renderer/features/projects/
├── components/
│   ├── ProjectInitWizard.tsx  # Multi-step init flow
│   ├── RepoTypeSelector.tsx   # Single/Monorepo/Multi-repo
│   ├── SubRepoDetector.tsx    # Shows detected child repos
│   └── SubRepoSelector.tsx    # Checkboxes for sub-projects
```

### 3. Progress Sync Service
```
src/main/services/workflow/
├── progress-watcher.ts        # chokidar watches docs/progress/
├── progress-parser.ts         # YAML frontmatter + markdown parser
├── progress-syncer.ts         # Push progress updates to Hub
└── task-launcher.ts           # Spawn Claude with workflow skill
```

### 4. Hub Enhancements
```
hub/src/
├── routes/
│   ├── computers.ts           # Computer registration endpoints
│   └── progress.ts            # Progress update endpoints
├── db/
│   └── schema.sql             # Add: computers table, task.computer_id
└── ws/
    └── handlers.ts            # Add: computer online/offline broadcasts
```

### 5. Mobile/Web Client (Future)
```
mobile/                        # React Native or PWA
├── src/
│   ├── screens/
│   │   ├── TaskList.tsx       # Table view
│   │   ├── TaskDetail.tsx     # Task details
│   │   └── CreateTask.tsx     # New task form
│   └── api/
│       └── hub-client.ts      # REST + WebSocket to Hub
```

### 6. New IPC Channels
```typescript
// src/shared/ipc-contract.ts additions

// Authentication
'auth.login': { input: { email: string; password: string }; output: AuthResult }
'auth.logout': { input: void; output: void }
'auth.me': { input: void; output: User }

// Device management
'devices.register': { input: { name: string }; output: Device }
'devices.list': { input: void; output: Device[] }

// Workspace management
'workspaces.list': { input: void; output: Workspace[] }
'workspaces.create': { input: CreateWorkspaceInput; output: Workspace }
'workspaces.update': { input: UpdateWorkspaceInput; output: Workspace }
'workspaces.delete': { input: { id: string }; output: void }

// Project management
'projects.detect': { input: { path: string }; output: ProjectDetectionResult }
'projects.create': { input: CreateProjectInput; output: Project }
'projects.addSubProject': { input: AddSubProjectInput; output: SubProject }

// Workflow execution
'workflow.launch': {
  input: { taskId: string; workspaceId: string };
  output: { sessionId: string }
}
'workflow.cancel': { input: { sessionId: string }; output: { success: boolean } }

// Events
'event:workflow.progress': { taskId: string; progress: ProgressUpdate }
'event:workspace.online': { workspaceId: string }
'event:workspace.offline': { workspaceId: string }
'event:device.online': { deviceId: string }
'event:device.offline': { deviceId: string }
```

---

## Hub Database Schema Changes

> **Full Schema**: See `docs/plans/2026-02-14-workspace-project-management.md` for complete schema

```sql
-- Summary of new tables:
-- users          — Authentication accounts
-- devices        — Physical devices (desktop, mobile, web)
-- workspaces     — Logical execution environments (host_device_id)
-- projects       — Git repos within workspaces (repo_structure)
-- sub_projects   — Child repos in multi-repo projects
-- tasks          — Updated with workspace_id, project_id, sub_project_id
-- sessions       — JWT session management

-- Key relationships:
-- User 1:N Devices
-- User 1:N Workspaces
-- Workspace 1:1 Host Device
-- Workspace 1:N Projects
-- Project 1:N Sub-Projects (for multi-repo)
-- Project 1:N Tasks
-- Task N:1 Sub-Project (optional targeting)
```

---

## Migration Path

### Phase 0: User Authentication
1. Add `users`, `sessions` tables to Hub
2. Implement login/register endpoints
3. Add login UI to desktop app
4. JWT-based auth for all Hub requests
5. **Result**: Authenticated access from any device

### Phase 1: Devices + Workspaces
1. Add `devices`, `workspaces` tables to Hub
2. Create `device-service.ts` for machine identity
3. Desktop registers as device on login
4. Auto-create workspace for new desktop users
5. Add Settings → Workspaces tab
6. **Result**: Workspaces configurable, devices tracked

### Phase 2: Project Enhancements
1. Add `repo_structure` to projects
2. Add `sub_projects` table
3. Create `project-detector.ts` for auto-detection
4. Add Project Initialization Wizard UI
5. **Result**: Multi-repo projects supported

### Phase 3: Task Table UI
1. Create `TaskTable.tsx` and related components
2. Replace Kanban route with Table route
3. Add filters (status, workspace, project)
4. Add sub-project selector in task creation
5. **Result**: New table UI with multi-repo support

### Phase 4: Hub-First Data
1. Migrate all storage from local to Hub database
2. Update services to use Hub API
3. WebSocket broadcasts all changes
4. **Result**: Full sync across devices

### Phase 5: Progress Watcher + Sync
1. Create `progress-watcher.ts` (chokidar)
2. Create `progress-syncer.ts` (push to Hub)
3. Hub broadcasts progress updates
4. Table shows real-time agent/phase status
5. **Result**: Live execution visibility everywhere

### Phase 6: Workflow Launcher
1. Create `task-launcher.ts` with `launchWorkflow()`
2. Update `tasks.execute` to use new launcher
3. Only workspace hosts can execute
4. Remove broken PTY agent spawning
5. **Result**: Working execution via Claude Workflow

### Phase 7: Mobile/Web Client
1. Create PWA (simpler than native)
2. Login UI, connect to Hub
3. View workspaces, projects, tasks
4. Create/edit tasks, assign to workspaces
5. Real-time progress updates
6. **Result**: Full multi-device experience

### Phase 8: Cleanup
1. Archive Python orchestration to `doc-history/`
2. Remove Kanban components
3. Remove `agent-service.ts`, `agent-queue.ts`
4. Update documentation
5. **Result**: Clean codebase

---

## Open Questions

1. **Cancel mechanism**: How should the UI cancel a running workflow?
   - Option A: Write `CANCELLED` to progress file, agents check periodically
   - Option B: Store PID and send SIGTERM from workspace host
   - Option C: Hub broadcasts cancel, workspace host handles it
   - **Recommendation**: Option C — Hub-mediated for multi-device consistency

2. **Device identification**: How to uniquely identify machines?
   - Option A: UUID generated on first run, stored in userData
   - Option B: Hardware fingerprint (MAC address hash + hostname)
   - **Recommendation**: Option A with user-friendly name

3. **Offline execution**: What if workspace host loses Hub connection?
   - Task continues locally (progress files still written)
   - Re-sync when connection restored
   - Other devices see "offline" indicator

4. **Authentication provider**: How do users sign in?
   - Option A: Email/password only (simpler)
   - Option B: OAuth (GitHub, Google) + email fallback
   - **Recommendation**: Email/password for MVP, OAuth later

5. **Hub hosting options**:
   - Local network (mDNS/Bonjour discovery?)
   - Self-hosted VPS (requires domain/SSL)
   - Cloud-hosted SaaS (future monetization?)
   - **MVP**: Local network with manual IP/port config

6. **Mobile app approach**:
   - PWA (works everywhere, easier to build)
   - React Native (better native feel, more work)
   - **Recommendation**: PWA first, native later if needed

7. **Multi-repo detection**: How to detect child repos?
   - Scan for `.git` folders in immediate children
   - Ask user to confirm which are "real" sub-projects
   - Allow manual add later

8. **Workspace migration**: Can user move workspace to new host?
   - Projects are local paths, not trivially portable
   - Option: Re-point paths on new host
   - Option: Future "clone to new host" feature

---

## Success Criteria

### Phase 0-1 (Authentication + Workspaces)
- [ ] User can register/login from any device
- [ ] Device registers with Hub on login
- [ ] Workspaces visible in Settings tab
- [ ] User can rename workspaces
- [ ] User can change workspace host device

### Phase 2-3 (Projects + Task Table)
- [ ] Project initialization detects repo type
- [ ] Multi-repo projects show sub-projects
- [ ] Tasks displayed in table view (not Kanban)
- [ ] Sub-project selector in task creation
- [ ] Filter/sort by status, workspace, project

### Phase 4-6 (Sync + Execution)
- [ ] All data synced through Hub
- [ ] Real-time updates via WebSocket
- [ ] Progress files watched and synced
- [ ] Workflow launches via Claude Workflow skills
- [ ] PR created on workflow completion

### Phase 7 (Mobile)
- [ ] PWA connects to Hub with login
- [ ] View workspaces, projects, tasks
- [ ] Create/edit tasks from mobile
- [ ] Real-time progress updates
- [ ] Works from any device (friend's phone, etc.)

### Cleanup
- [ ] No PTY parsing or broken CLI flags
- [ ] Python orchestration archived
- [ ] Kanban components removed

---

## Dependencies

- **Claude Workflow Skills Package**: Must be finalized with `/implement-feature`
- **Progress File Format**: Standardize YAML frontmatter schema
- **Agent Definitions**: Ensure `.claude/agents/` are complete
- **Hub Server**: Already exists, needs schema updates
- **Hub Protocol Contract**: `docs/contracts/hub-device-protocol.md` (enforced)

---

## Protocol Contract

**CRITICAL**: All Hub ↔ Device communication is governed by:

- **Specification**: `docs/contracts/hub-device-protocol.md`
- **Types**: `src/shared/types/hub-protocol.ts`

### Enforcement Rules

1. **Single Source of Truth**: Types live ONLY in `hub-protocol.ts`
2. **Hub imports from shared**: `import { Task, WsEvent } from '@shared/types'`
3. **Clients import from shared**: Same import path
4. **Validation script**: `npm run validate:protocol` checks compliance
5. **Pre-commit hook**: Blocks commits if protocol violated
6. **CI check**: PR cannot merge if protocol mismatched

### Updating the Protocol

1. Update `docs/contracts/hub-device-protocol.md` first (spec)
2. Update `src/shared/types/hub-protocol.ts` to match (types)
3. Update Hub routes to match new spec
4. Update client API calls to match new spec
5. Run `npm run validate:protocol` to verify
6. Bump version number in both files

---

## Timeline

| Phase | Scope | Blocked By | Effort |
|-------|-------|------------|--------|
| Phase 0 | User Authentication | None | Medium |
| Phase 1 | Devices + Workspaces | Phase 0 | Medium |
| Phase 2 | Project Enhancements | None | Medium |
| Phase 3 | Task Table UI | Phase 2 | Medium |
| Phase 4 | Hub-First Data | Phase 1, 3 | Medium |
| Phase 5 | Progress Watcher + Sync | Phase 4 | Medium |
| Phase 6 | Workflow Launcher | Skills package | Small |
| Phase 7 | Mobile/Web Client | Phase 4, 5 | Large |
| Phase 8 | Cleanup | Phase 6 stable | Small |

---

## Notes

- **Execution is always on workspace host** — any device can manage, only host executes
- **Hub is the source of truth** — all data synced through Hub
- **Workspaces are logical, devices are physical** — workspace can change host
- **Orchestration lives in prompts** — Claude Workflow skills, not app code
- **Work/Personal separation** — different workspaces, different projects, same account
- **Multi-repo native** — create task for specific sub-project in complex repos
- **Any device access** — log in from friend's phone to check task status
