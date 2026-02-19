# Parallel Implementation Plan — Two-Team Execution

> Tracker Key: `parallel-plan` | Status: **IMPLEMENTED** | Created: 2026-02-14

**Teams**: Team Alpha (Hub/Backend), Team Beta (Frontend/UI)
**Base Branch**: master
**Source Plans**:
- `2026-02-13-kanban-workflow-refactor.md`
- `2026-02-14-workspace-project-management.md`

---

## Overview

This plan splits the workflow refactor into two parallel workstreams that can be executed by separate Claude Code instances in different terminals. Each team works on a dedicated branch, coordinating at defined sync points.

```
                    master
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
    feature/team-alpha        feature/team-beta
    (Hub + Backend)           (Frontend + UI)
          │                         │
          │    ◄── Sync Point 1 ──► │
          │                         │
          │    ◄── Sync Point 2 ──► │
          │                         │
          ▼                         ▼
       Merge to master (coordinated)
```

---

## Team Assignments

### Team Alpha: Hub + Backend
**Branch**: `feature/team-alpha-hub`
**Focus**: Hub server, authentication, database, API endpoints

**File Ownership:**
- `hub/` — Full ownership
- `src/shared/types/hub-protocol.ts` — Shared (coordinate with Beta)
- `src/main/services/device/` — New service
- `src/main/services/workspace/` — New service
- `docs/contracts/` — Protocol specification

### Team Beta: Frontend + UI
**Branch**: `feature/team-beta-frontend`
**Focus**: React components, UI flows, desktop app integration

**File Ownership:**
- `src/renderer/features/tasks/` — Table UI
- `src/renderer/features/settings/` — Workspace settings tab
- `src/renderer/features/projects/` — Project init wizard
- `src/main/services/project/` — Project detection
- `src/main/services/workflow/` — Progress watcher, task launcher

---

## Execution Waves

### Wave 1: Foundation (Parallel)

Both teams start simultaneously on independent work.

#### Team Alpha — Wave 1
**Duration**: ~2-3 hours
**Deliverables**:

1. **Hub Database Schema**
   - Add tables: `users`, `sessions`, `devices`, `workspaces`, `projects`, `sub_projects`
   - Update `tasks` table with new foreign keys
   - Run migrations

2. **Authentication Endpoints**
   ```
   POST /api/auth/register
   POST /api/auth/login
   POST /api/auth/logout
   POST /api/auth/refresh
   GET  /api/auth/me
   ```

3. **Device Endpoints**
   ```
   POST /api/devices
   GET  /api/devices
   PATCH /api/devices/:id
   DELETE /api/devices/:id
   ```

4. **Update Protocol Types**
   - Add User, Device types to `hub-protocol.ts`
   - Add auth request/response types

**Success Criteria**:
- [ ] Can register a new user via API
- [ ] Can login and receive JWT
- [ ] Can register a device
- [ ] All new tables exist with correct schema

#### Team Beta — Wave 1
**Duration**: ~2-3 hours
**Deliverables**:

1. **Task Table UI Components**
   - `TaskTable.tsx` — Main table component
   - `TaskTableRow.tsx` — Row with actions
   - `TaskTableHeader.tsx` — Sortable headers
   - `TaskTableFilters.tsx` — Filter controls

2. **Project Detection Service**
   - `src/main/services/project/project-detector.ts`
   - Detect repo type (single, monorepo, multi-repo)
   - Find child git repos

3. **Stub IPC Handlers** (local-only, to be wired to Hub later)
   - Tasks CRUD against local storage temporarily
   - Project detection IPC

**Success Criteria**:
- [ ] Task table renders with mock data
- [ ] Columns are sortable
- [ ] Filters work (status, search)
- [ ] Project detector identifies repo types

---

### Sync Point 1: API Contract Verification

**When**: After Wave 1 complete
**Duration**: 30 minutes
**Actions**:

1. **Team Alpha** publishes final API endpoints to `hub-device-protocol.md`
2. **Team Beta** reviews and confirms frontend can consume APIs
3. Both teams sync `hub-protocol.ts` types
4. Resolve any contract mismatches before proceeding

---

### Wave 2: Core Features (Parallel)

#### Team Alpha — Wave 2
**Duration**: ~3-4 hours
**Deliverables**:

1. **Workspace Endpoints**
   ```
   GET    /api/workspaces
   POST   /api/workspaces
   GET    /api/workspaces/:id
   PATCH  /api/workspaces/:id
   DELETE /api/workspaces/:id
   POST   /api/workspaces/:id/host
   ```

2. **Project Endpoints**
   ```
   GET    /api/workspaces/:wid/projects
   POST   /api/workspaces/:wid/projects
   POST   /api/projects/detect
   GET    /api/projects/:id
   PATCH  /api/projects/:id
   DELETE /api/projects/:id
   ```

3. **Sub-Project Endpoints**
   ```
   GET    /api/projects/:id/sub-projects
   POST   /api/projects/:id/sub-projects
   DELETE /api/projects/:pid/sub-projects/:sid
   ```

4. **WebSocket Events**
   - workspace:created, workspace:updated, workspace:deleted
   - project:created, project:updated
   - device:online, device:offline

**Success Criteria**:
- [ ] Can create/update/delete workspaces
- [ ] Can create projects with sub-projects
- [ ] WebSocket broadcasts workspace changes
- [ ] Device online/offline status tracked

#### Team Beta — Wave 2
**Duration**: ~3-4 hours
**Deliverables**:

1. **Login/Register UI**
   - Login page component
   - Register page component
   - Auth context/store
   - Token storage (secure)

2. **Settings → Workspaces Tab**
   - `WorkspacesTab.tsx`
   - `WorkspaceCard.tsx`
   - `WorkspaceEditor.tsx` (modal)
   - `DeviceSelector.tsx` (host dropdown)

3. **Project Initialization Wizard**
   - `ProjectInitWizard.tsx` (multi-step)
   - `RepoTypeSelector.tsx`
   - `SubRepoDetector.tsx`
   - `SubRepoSelector.tsx`

4. **Wire Task Table to IPC** (still local storage)

**Success Criteria**:
- [ ] Can login/register in app
- [ ] Workspaces tab shows workspace list
- [ ] Can rename workspace, change host
- [ ] Project wizard detects and creates multi-repo projects

---

### Sync Point 2: Integration Test

**When**: After Wave 2 complete
**Duration**: 1 hour
**Actions**:

1. **Start Hub server** with Team Alpha changes
2. **Team Beta** points frontend to Hub APIs
3. Test full flows:
   - Register → Login → Create Workspace → Create Project
   - Verify WebSocket receives events
4. Fix any integration issues
5. Both teams merge latest from each other's branch

---

### Wave 3: Data Migration & Sync (Sequential)

**Note**: This wave has dependencies, so teams coordinate closely.

#### Team Alpha — Wave 3 (First)
**Duration**: ~2 hours
**Deliverables**:

1. **Task Endpoints Update**
   - Add `workspace_id`, `sub_project_id` to task endpoints
   - Task list filtered by workspace/project

2. **Progress Endpoints**
   ```
   POST /api/tasks/:id/progress
   POST /api/tasks/:id/complete
   ```

3. **Hub-First Task Storage**
   - All tasks stored in Hub database
   - WebSocket broadcasts task changes

**Success Criteria**:
- [ ] Tasks have workspace_id and sub_project_id
- [ ] Progress updates stored and broadcast
- [ ] Task list filters by workspace

#### Team Beta — Wave 3 (After Alpha)
**Duration**: ~2 hours
**Deliverables**:

1. **Wire Frontend to Hub APIs**
   - Update `useTasks` hooks to call Hub
   - Update task mutations to call Hub
   - Subscribe to WebSocket task events

2. **Progress Watcher Service**
   - `progress-watcher.ts` — Watch `docs/progress/*.md`
   - `progress-syncer.ts` — Push to Hub API

3. **Sub-Project Selector in Task Creation**
   - Task form shows sub-project dropdown for multi-repo

**Success Criteria**:
- [ ] Tasks sync through Hub
- [ ] Real-time updates via WebSocket
- [ ] Progress files sync to Hub
- [ ] Can create task targeting sub-project

---

### Wave 4: Execution & Polish (Parallel)

#### Team Alpha — Wave 4
**Duration**: ~2 hours
**Deliverables**:

1. **Execution Command Endpoints**
   ```
   POST /api/tasks/:id/execute
   POST /api/tasks/:id/cancel
   ```

2. **WebSocket Execution Commands**
   - command:execute (Hub → Host Device)
   - command:cancel
   - execution:started, execution:ack (Device → Hub)

3. **Final Protocol Documentation**
   - Update `hub-device-protocol.md` with all endpoints
   - Ensure types match implementation

**Success Criteria**:
- [ ] Execute command routes to correct workspace host
- [ ] Cancel broadcasts to executing device
- [ ] Protocol doc is complete and accurate

#### Team Beta — Wave 4
**Duration**: ~2 hours
**Deliverables**:

1. **Workflow Launcher**
   - `task-launcher.ts` — Spawn Claude with workflow skill
   - Wire to execute button in task table

2. **Kanban Removal -- COMPLETED**
   - Kanban components already deleted
   - Router already uses `TaskTable` from `@features/tasks`

3. **Remove Broken Agent Service**
   - Archive `agent-service.ts`, `agent-queue.ts`, `token-parser.ts`
   - Update imports

**Success Criteria**:
- [ ] Execute button launches Claude workflow
- [x] Kanban components removed (completed)
- [ ] Old agent code archived
- [ ] App builds and runs

---

### Final Sync: Merge to Master

**When**: All waves complete
**Duration**: 1-2 hours
**Actions**:

1. **Team Alpha** merges `feature/team-alpha-hub` to master
2. **Team Beta** rebases `feature/team-beta-frontend` on master
3. **Team Beta** resolves any merge conflicts
4. **Team Beta** merges to master
5. Run full verification:
   ```bash
   npm run lint && npx tsc --noEmit && npm run build
   ```
6. Create release PR with combined changes

---

## File Ownership Matrix

| Path | Team Alpha | Team Beta | Shared |
|------|------------|-----------|--------|
| `hub/**` | ✓ | | |
| `src/shared/types/hub-protocol.ts` | | | ✓ |
| `src/shared/ipc-contract.ts` | | | ✓ |
| `src/main/services/device/**` | ✓ | | |
| `src/main/services/workspace/**` | ✓ | | |
| `src/main/services/project/**` | | ✓ | |
| `src/main/services/workflow/**` | | ✓ | |
| `src/main/ipc/handlers/**` | | | ✓ |
| `src/renderer/features/tasks/**` | | ✓ | |
| `src/renderer/features/settings/**` | | ✓ | |
| `src/renderer/features/projects/**` | | ✓ | |
| `src/renderer/features/auth/**` | | ✓ | |
| `docs/contracts/**` | ✓ | | |
| `docs/plans/**` | | | ✓ |

---

## Communication Protocol

### Between Teams

1. **Slack/Discord channel** for real-time coordination
2. **Sync points are blocking** — don't proceed until both teams ready
3. **Shared files** require notification before editing
4. **API changes** must be communicated immediately

### Progress Tracking

Each team maintains a progress file:
- `docs/progress/team-alpha-progress.md`
- `docs/progress/team-beta-progress.md`

Update after each wave with:
- Completed tasks
- Blockers encountered
- Files modified
- Ready for sync point (yes/no)

---

## Quick Start Commands

### Team Alpha
```bash
cd Claude-UI
git checkout master && git pull
git checkout -b feature/team-alpha-hub
# Start work on Wave 1
```

### Team Beta
```bash
cd Claude-UI
git checkout master && git pull
git checkout -b feature/team-beta-frontend
# Start work on Wave 1
```

---

## Rollback Plan

If integration fails at any sync point:

1. Both teams stop work
2. Identify breaking change
3. Revert problematic commit(s)
4. Re-sync protocol types
5. Resume from last good state

---

## Estimated Timeline

| Wave | Duration | Team Alpha | Team Beta |
|------|----------|------------|-----------|
| Wave 1 | 2-3 hours | Auth + Devices | Task Table + Detection |
| Sync 1 | 30 min | API Contract Review | |
| Wave 2 | 3-4 hours | Workspaces + Projects | UI + Settings |
| Sync 2 | 1 hour | Integration Test | |
| Wave 3 | 2+2 hours | Tasks API | Wire Frontend |
| Wave 4 | 2 hours | Execution | Launcher + Cleanup |
| Final | 1-2 hours | Merge | |

**Total**: ~14-18 hours of parallel work

---

## Success Criteria (Final)

- [ ] User can register/login from any device
- [ ] Workspaces configurable in Settings
- [ ] Projects support multi-repo with sub-projects
- [x] Task table replaces Kanban (completed)
- [ ] Tasks sync through Hub in real-time
- [ ] Execute launches Claude workflow on workspace host
- [x] Kanban removed (completed); old agent code still to be archived
- [ ] `npm run lint && npx tsc --noEmit && npm run build` passes
