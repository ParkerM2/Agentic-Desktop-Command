# Team Beta: Frontend + UI Implementation

> Tracker Key: `team-beta-frontend` | Status: **IN_PROGRESS** | Created: 2026-02-14

**Branch**: `feature/team-beta-frontend`
**Base**: `master`
**Coordination**: `docs/plans/2026-02-14-parallel-implementation-plan.md`

---

## Your Mission

You are Team Beta. You own the frontend UI, React components, and desktop app integration. Team Alpha (running in another terminal) is building the Hub backend simultaneously.

**Your file ownership:**
- `src/renderer/features/tasks/` — Task table dashboard
- `src/renderer/features/settings/` — Workspaces tab
- `src/renderer/features/projects/` — Project init wizard
- `src/renderer/features/auth/` — Login/register UI
- `src/main/services/project/` — Project detection
- `src/main/services/workflow/` — Progress watcher, launcher

---

## Setup

```bash
cd Claude-UI
git checkout master && git pull origin master
git checkout -b feature/team-beta-frontend

# Create your progress file
mkdir -p docs/progress
touch docs/progress/team-beta-progress.md
```

---

## Wave 1: Task Table & Project Detection

### 1.1 Task Table Components

Create `src/renderer/features/tasks/components/`:

**TaskTable.tsx**
```typescript
// Main table component
// - Renders table with sortable headers
// - Pagination controls
// - Bulk action toolbar (when rows selected)
// - Uses TanStack Table for sorting/filtering

interface TaskTableProps {
  tasks: Task[];
  isLoading: boolean;
  onTaskClick: (taskId: string) => void;
  onExecute: (taskId: string) => void;
}
```

**TaskTableRow.tsx**
```typescript
// Individual row
// - Checkbox for selection
// - Status badge
// - Title (clickable)
// - Project name
// - Workspace name
// - Sub-project (if applicable)
// - Progress indicator (if running)
// - Action buttons (Execute, Stop, Delete)
```

**TaskTableHeader.tsx**
```typescript
// Sortable column headers
// - Click to sort
// - Sort indicator (asc/desc)
```

**TaskTableFilters.tsx**
```typescript
// Filter controls
// - Status dropdown (multi-select)
// - Workspace dropdown
// - Project dropdown
// - Search input
// - Date range picker (optional)
```

### 1.2 Project Detection Service

Create `src/main/services/project/project-detector.ts`:

```typescript
export interface RepoDetectionResult {
  isGitRepo: boolean;
  repoType: 'single' | 'monorepo' | 'multi-repo' | 'none';
  gitUrl?: string;
  defaultBranch?: string;
  childRepos: Array<{
    name: string;
    path: string;
    relativePath: string;
    gitUrl?: string;
  }>;
}

export function detectRepoStructure(rootPath: string): RepoDetectionResult {
  // 1. Check if rootPath has .git
  // 2. If yes, check for child directories with .git
  // 3. Determine type:
  //    - No .git at root, has children with .git → multi-repo
  //    - Has .git at root, has children with .git → also multi-repo
  //    - Has .git, no child .git → check for monorepo indicators
  //    - No .git anywhere → not a repo
}
```

### 1.3 Stub IPC Handlers

Update `src/main/ipc/handlers/` with temporary local storage:

```typescript
// tasks.list → return from local storage
// tasks.create → save to local storage
// This will be replaced with Hub API calls in Wave 3
```

### Wave 1 Checklist

- [ ] TaskTable component renders
- [ ] Columns are sortable
- [ ] Filters work (status, search)
- [ ] Row actions visible (execute, delete)
- [ ] Project detector identifies repo types
- [ ] Project detector finds child repos

**When complete**: Update `docs/progress/team-beta-progress.md` and wait for Sync Point 1.

---

## Sync Point 1

**Wait for Team Alpha** to share API endpoints.

Actions:
1. Review API contract from Team Alpha
2. Verify `hub-protocol.ts` types are compatible
3. Plan frontend API client structure

---

## Wave 2: Auth UI & Settings

### 2.1 Authentication UI

Create `src/renderer/features/auth/`:

**LoginPage.tsx**
```typescript
// Login form
// - Email input
// - Password input
// - "Remember me" checkbox
// - Submit button
// - Link to register page
// - Error display

// On submit:
// 1. Call auth.login IPC
// 2. Store token securely
// 3. Navigate to dashboard
```

**RegisterPage.tsx**
```typescript
// Registration form
// - Display name input
// - Email input
// - Password input
// - Confirm password input
// - Submit button
// - Link to login page
```

**useAuth.ts**
```typescript
// Auth hook
// - user state
// - isAuthenticated
// - login(email, password)
// - register(data)
// - logout()
// - Token refresh logic
```

**auth-store.ts**
```typescript
// Zustand store for auth state
// - user: User | null
// - token: string | null
// - isLoading: boolean
```

### 2.2 Settings → Workspaces Tab

Create `src/renderer/features/settings/components/`:

**WorkspacesTab.tsx**
```typescript
// Main workspaces settings panel
// - List of user's workspaces
// - "Add Workspace" button
// - Each workspace shows: name, host device, status, project count
```

**WorkspaceCard.tsx**
```typescript
// Individual workspace in list
// - Online/offline indicator
// - Name (editable)
// - Host device name
// - Project count
// - Edit button → opens WorkspaceEditor
// - Delete button (with confirmation)
```

**WorkspaceEditor.tsx**
```typescript
// Modal for editing workspace
// - Name input
// - Description textarea
// - Host device dropdown (DeviceSelector)
// - Settings:
//   - Auto-start queued tasks
//   - Max concurrent agents
//   - Default branch
// - Save/Cancel buttons
```

**DeviceSelector.tsx**
```typescript
// Dropdown to select host device
// - Lists user's desktop devices
// - Shows online/offline status
// - Current host highlighted
// - Warning if changing host
```

### 2.3 Project Initialization Wizard

Create `src/renderer/features/projects/components/`:

**ProjectInitWizard.tsx**
```typescript
// Multi-step wizard
// Step 1: Select folder (native dialog)
// Step 2: Show detection results (RepoTypeSelector)
// Step 3: If multi-repo, select sub-projects (SubRepoSelector)
// Step 4: Configure project settings
// Step 5: Confirm and create
```

**RepoTypeSelector.tsx**
```typescript
// Shows detected repo type
// - Icon for type (single, monorepo, multi-repo)
// - Description of what was detected
// - Option to override if detection wrong
```

**SubRepoDetector.tsx**
```typescript
// Shows detected child repos
// - List of found .git directories
// - Path relative to root
// - Checkbox to include/exclude
```

**SubRepoSelector.tsx**
```typescript
// Checkboxes for selecting sub-projects
// - All detected child repos
// - Name, path, git URL (if available)
// - Select all / Deselect all
```

### Wave 2 Checklist

- [ ] Login page works (calls IPC)
- [ ] Register page works
- [ ] Auth state persists across refresh
- [ ] Workspaces tab shows workspace list
- [ ] Can edit workspace name
- [ ] Can change workspace host device
- [ ] Project wizard opens folder dialog
- [ ] Project wizard detects repo type
- [ ] Sub-project selection works

**When complete**: Update progress file, proceed to Sync Point 2.

---

## Sync Point 2

**Integration test with Team Alpha**:

1. Team Alpha starts Hub server
2. Point frontend to Hub URL
3. Test full flow:
   - Register new account
   - Login
   - Create workspace
   - Create project with sub-projects
4. Verify WebSocket events received
5. Fix issues before proceeding

---

## Wave 3: Wire to Hub APIs

### 3.1 Update Task Hooks

Update `src/renderer/features/tasks/api/`:

**useTasks.ts**
```typescript
// Update to call Hub API instead of local IPC
// GET /api/tasks with query params
// Subscribe to WebSocket task events
// Invalidate query on WebSocket update
```

**useTaskMutations.ts**
```typescript
// Update mutations to call Hub API
// POST /api/tasks
// PATCH /api/tasks/:id
// DELETE /api/tasks/:id
```

### 3.2 Progress Watcher Service

Create `src/main/services/workflow/`:

**progress-watcher.ts**
```typescript
import chokidar from 'chokidar';

// Watch docs/progress/*.md
// Parse YAML frontmatter for status
// Emit IPC events on change
```

**progress-syncer.ts**
```typescript
// When progress file changes:
// 1. Parse file
// 2. POST /api/tasks/:id/progress
// 3. Hub broadcasts to all devices
```

### 3.3 Sub-Project in Task Creation

Update task creation form:

```typescript
// If project has sub-projects:
// - Show "Target" dropdown
// - Options: "Entire project" + each sub-project
// - Selected sub_project_id included in task creation
```

### Wave 3 Checklist

- [ ] Tasks fetch from Hub API
- [ ] Task mutations call Hub API
- [ ] WebSocket updates refresh task list
- [ ] Progress watcher detects file changes
- [ ] Progress syncs to Hub
- [ ] Task creation includes sub-project selector

---

## Wave 4: Launcher & Cleanup

### 4.1 Workflow Launcher

Create `src/main/services/workflow/task-launcher.ts`:

```typescript
import { spawn } from 'child_process';

export interface LaunchResult {
  sessionId: string;
  pid: number;
}

export function launchWorkflow(
  taskDescription: string,
  projectPath: string,
  subProjectPath?: string
): LaunchResult {
  const workDir = subProjectPath
    ? join(projectPath, subProjectPath)
    : projectPath;

  const prompt = `
Use /implement-feature to execute this task:

${taskDescription}

Project path: ${workDir}
Write progress to: docs/progress/
`;

  const child = spawn('claude', ['-p', prompt], {
    cwd: workDir,
    detached: true,
    stdio: 'ignore',
  });

  child.unref();

  return {
    sessionId: `workflow-${Date.now()}`,
    pid: child.pid!,
  };
}
```

### 4.2 Wire Execute Button

Update TaskTable execute action:

```typescript
async function handleExecute(taskId: string) {
  // 1. Call Hub: POST /api/tasks/:id/execute
  // 2. Hub sends command:execute to workspace host
  // 3. Host receives via WebSocket
  // 4. Host calls launchWorkflow()
  // 5. Host sends execution:started back to Hub
}
```

### 4.3 Kanban Removal -- COMPLETED

The Kanban board has been removed. The `src/renderer/features/kanban/` directory no longer exists.
The router uses `TaskTable` from `@features/tasks` as the main task view component.
Route `/projects/$projectId/tasks` renders the task table dashboard.

### 4.4 Archive Old Agent Code

Move to `doc-history/deprecated-agent-code/`:
- `src/main/services/agent/agent-service.ts`
- `src/main/services/agent/agent-queue.ts`
- `src/main/services/agent/token-parser.ts`

Update imports in `src/main/index.ts` to remove agent service.

### Wave 4 Checklist

- [ ] Execute button triggers workflow launch
- [ ] Claude spawns with correct prompt
- [x] Kanban components deleted (completed)
- [ ] Router updated to task table
- [ ] Old agent code archived
- [ ] App builds without errors
- [ ] App runs correctly

---

## Final Merge

1. Wait for Team Alpha to merge first
2. Rebase on master: `git fetch origin && git rebase origin/master`
3. Resolve any conflicts
4. Run full verification:
   ```bash
   npm run lint && npx tsc --noEmit && npm run build
   ```
5. Merge to master
6. Update progress file to COMPLETE

---

## Key Files You'll Create/Modify

```
src/renderer/features/
├── auth/                        # NEW
│   ├── index.ts
│   ├── components/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   └── store.ts
├── tasks/
│   ├── components/
│   │   ├── TaskTable.tsx        # NEW
│   │   ├── TaskTableRow.tsx     # NEW
│   │   ├── TaskTableHeader.tsx  # NEW
│   │   ├── TaskTableFilters.tsx # NEW
│   │   └── TaskDetailModal.tsx  # Keep
│   └── api/
│       ├── useTasks.ts          # Modified
│       └── useTaskMutations.ts  # Modified
├── settings/
│   └── components/
│       ├── WorkspacesTab.tsx    # NEW
│       ├── WorkspaceCard.tsx    # NEW
│       ├── WorkspaceEditor.tsx  # NEW
│       └── DeviceSelector.tsx   # NEW
├── projects/
│   └── components/
│       ├── ProjectInitWizard.tsx    # NEW
│       ├── RepoTypeSelector.tsx     # NEW
│       ├── SubRepoDetector.tsx      # NEW
│       └── SubRepoSelector.tsx      # NEW
└── kanban/                      # DELETED (already removed)

src/main/services/
├── project/
│   └── project-detector.ts      # NEW
└── workflow/
    ├── progress-watcher.ts      # NEW
    ├── progress-syncer.ts       # NEW
    └── task-launcher.ts         # NEW

src/main/services/agent/         # ARCHIVE (move to doc-history/)

docs/progress/
└── team-beta-progress.md        # Your progress
```

---

## Design System Reminders

When building UI components, remember:

- Use Tailwind CSS v4 with CSS custom properties
- Use `color-mix()` for opacity, not hardcoded RGBA
- Import from `@ui/*` for base components
- Follow existing patterns in `src/renderer/features/`
- See `CLAUDE.md` for full design system rules
