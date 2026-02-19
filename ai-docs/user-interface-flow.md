# User Interface Flow — Complete Application Map

> Every screen, every click, every process chain — documented from a brand new user's perspective.
> Designed for: automated MCP-based testing, gap analysis, and investor demo readiness.

**Last Updated**: 2026-02-18

---

## Table of Contents

1. [Application Launch Sequence](#1-application-launch-sequence)
2. [Authentication Flow](#2-authentication-flow)
3. [Onboarding Wizard](#3-onboarding-wizard)
4. [App Shell & Navigation](#4-app-shell--navigation)
5. [Dashboard (Home)](#5-dashboard-home)
6. [Projects](#6-projects)
7. [Task Management (AG-Grid)](#7-task-management-ag-grid)
8. [Terminals](#8-terminals)
9. [Agents](#9-agents)
10. [GitHub Integration](#10-github-integration)
11. [Roadmap](#11-roadmap)
12. [Ideation](#12-ideation)
13. [Changelog](#13-changelog)
14. [Insights](#14-insights)
15. [My Work](#15-my-work)
16. [Briefing](#16-briefing)
17. [Planner](#17-planner)
18. [Notes](#18-notes)
19. [Fitness](#19-fitness)
20. [Productivity](#20-productivity)
21. [Alerts](#21-alerts)
22. [Communications](#22-communications)
23. [Settings](#23-settings)
24. [Hub Connection & Real-Time](#24-hub-connection--real-time)
25. [Workflow System](#25-workflow-system)
26. [IPC Channel Reference](#26-ipc-channel-reference)
27. [Gap Analysis](#27-gap-analysis)

---

## 1. Application Launch Sequence

**What happens when a user double-clicks the app icon:**

```
Electron main process starts
  → src/main/index.ts
    → Creates BrowserWindow
    → Initializes services (settings, hub, auth, agents, projects, tasks, terminals...)
    → Registers all IPC handlers via src/main/ipc/index.ts
    → Hub connection auto-attempts if config exists
    → Device heartbeat starts (30s interval) if device registered
    → Loads renderer: src/renderer/index.html → src/renderer/main.tsx
```

### Process Chain

| Step | File | What Happens |
|------|------|--------------|
| 1 | `src/main/index.ts` | Electron `app.whenReady()` → creates window, initializes services |
| 2 | `src/main/ipc/index.ts` | `registerAllHandlers()` wires 200+ IPC channels to service methods |
| 3 | `src/main/services/hub/hub-connection.ts` | Auto-loads saved hub config from `userData/hub-config.json` |
| 4 | `src/main/services/device/` | Starts 30s heartbeat if device previously registered |
| 5 | `src/renderer/main.tsx` | React app mounts with QueryClientProvider + AppRouter |
| 6 | `src/renderer/app/router.tsx` | TanStack Router resolves `/` → redirects to `/dashboard` |
| 7 | `src/renderer/features/auth/components/AuthGuard.tsx` | Intercepts — checks `isAuthenticated` from store |

### Key Files
- `src/main/index.ts` — App lifecycle, window creation
- `src/main/ipc/index.ts` — Handler registration
- `src/preload/index.ts` — Context bridge
- `src/renderer/main.tsx` — React entry point

---

## 2. Authentication Flow

### Route Structure

| Path | Component | Auth Required | File |
|------|-----------|---------------|------|
| `/hub-setup` | `HubSetupPage` | No (redirects to /login if hub already configured) | `src/renderer/features/hub-setup/components/HubSetupPage.tsx` |
| `/login` | `LoginPage` | No (redirects to /hub-setup if hub not configured) | `src/renderer/features/auth/components/LoginPage.tsx` |
| `/register` | `RegisterPage` | No (redirects to /hub-setup if hub not configured) | `src/renderer/features/auth/components/RegisterPage.tsx` |
| All other routes | Wrapped by `AuthGuard` | Yes | `src/renderer/features/auth/components/AuthGuard.tsx` |

### 2.1 First Launch (No Stored Session)

```
User opens app
  → Router resolves / → redirect to /dashboard
  → AuthGuard.tsx renders (wraps all authenticated routes)
  → useAuthInit() runs (src/renderer/features/auth/hooks/useAuthEvents.ts)
    → Checks localStorage for stored auth (key: "adc-auth")
    → Nothing found → setInitializing(false)
  → isAuthenticated = false, isInitializing = false
  → AuthGuard redirects to /login
  → /login beforeLoad: async hub check via ipc('hub.getConfig', {})
    → If hubUrl is empty → redirect to /hub-setup
    → HubSetupPage renders (Docker instructions, URL + API key form)
    → User connects → redirects to /login
  → LoginPage renders (full-page centered form)
```

**User sees**: If Hub not configured, the Hub Setup page with Docker quick-start instructions, Hub URL/API key form, and connectivity validation. After connecting, the Login page with email/password form, "Sign In" button, link to Register, and "Change Hub server" link.

### 2.2 Registration Flow

```
User clicks "Sign up" link on login page
  → Router navigates to /register
  → RegisterPage renders
```

**Form fields**: Display Name, Email, Password

**On submit**:

| Step | Component/Service | IPC Channel | What Happens |
|------|-------------------|-------------|--------------|
| 1 | `RegisterPage.tsx` | — | Form validation (all fields required) |
| 2 | `useRegister()` hook | `auth.register` | Calls IPC with `{ email, password, displayName }` |
| 3 | `auth-handlers.ts` | — | Forwards to `hubAuthService.register()` |
| 4 | `hub-auth-service.ts` | — | POST to Hub `/api/auth/register` |
| 5 | Hub `auth.ts` route | — | bcrypt hash password, create user, generate JWT |
| 6 | Response flows back | — | `{ user, accessToken, refreshToken, expiresAt }` |
| 7 | `auth-handlers.ts` | — | Converts `expiresAt` to `expiresIn` (seconds) |
| 8 | `useRegister()` | — | Calls `setAuth(user, tokens)` on auth store |
| 9 | `auth/store.ts` | — | Persists to localStorage, sets `isAuthenticated = true` |
| 10 | `router.tsx` | — | `onSuccess` → navigates to `/dashboard` |

**Key files**:
- `src/renderer/features/auth/components/RegisterPage.tsx`
- `src/renderer/features/auth/api/useAuth.ts` → `useRegister()`
- `src/main/ipc/handlers/auth-handlers.ts` → `auth.register` handler
- `src/main/services/hub/hub-auth-service.ts` → `register()`
- `hub/src/routes/auth.ts` → POST `/api/auth/register`
- `hub/src/services/auth-service.ts` → `registerUser()`
- `src/renderer/features/auth/store.ts` → `setAuth()`, `persistAuth()`

### 2.3 Login Flow

Same as registration but with `auth.login` channel, POST to `/api/auth/login`, and only email/password fields.

**Key files**: Same as registration, using `useLogin()` instead of `useRegister()`.

### 2.4 Session Restoration (Returning User)

```
User opens app with stored session
  → AuthGuard renders, isInitializing = true (stored tokens found)
  → Shows loading spinner
  → useAuthInit() runs:
    → Calls ipc('auth.me', {}) to validate access token
    → SUCCESS → setUser(), setInitializing(false) → AuthGuard renders <Outlet />
    → FAIL → attempts ipc('auth.refresh', { refreshToken })
      → SUCCESS → updateTokens(), retry auth.me, setInitializing(false)
      → FAIL → clearAuth() → redirect to /login
```

**IPC channels**: `auth.me`, `auth.refresh`
**Hub endpoints**: GET `/api/auth/me`, POST `/api/auth/refresh`

### 2.5 Token Refresh

- Access tokens expire after 15 minutes
- **Proactive refresh**: `useTokenRefresh()` hook sets a `setTimeout` that fires 2 minutes before `expiresAt`
- On timer fire: calls `useRefreshToken().mutate()` → updates `expiresAt` → timer reschedules
- On refresh failure: `clearAuth()` → redirect to login
- Hook mounted in `AuthGuard.tsx` (runs for all authenticated pages)
- Fallback: `useAuthInit()` handles refresh on app start for expired tokens
- Main process is authoritative token owner (stores in TokenStore via `hub-auth-service.ts`)
- Renderer stores copy in localStorage for quick startup check

**Key files**:
- `src/renderer/features/auth/hooks/useTokenRefresh.ts` — proactive timer hook
- `src/renderer/features/auth/store.ts` — `expiresAt` field, `setExpiresAt` action

### 2.6 Logout

```
User clicks avatar in sidebar footer → UserMenu dropdown opens
  → Clicks "Log out" (destructive button with LogOut icon)
  → useLogout().mutate()
  → ipc('auth.logout', {}) → hubAuthService.logout()
  → clearAuth() → clears localStorage + expiresAt
  → queryClient.clear() → wipes all React Query cache
  → onSuccess → navigate to /login
```

**Key files**:
- `src/renderer/app/layouts/UserMenu.tsx` → avatar + logout dropdown in sidebar footer
- `src/renderer/features/auth/api/useAuth.ts` → `useLogout()`
- `src/main/ipc/handlers/auth-handlers.ts` → `auth.logout`
- `src/renderer/features/auth/store.ts` → `clearAuth()`

---

## 3. Onboarding Wizard

**Triggers**: After successful auth, if `settings.onboardingCompleted === false`

```
AuthGuard passes → RootLayout renders
  → useSettings() fetches settings via ipc('settings.get')
  → settings.onboardingCompleted === false
  → OnboardingWizard renders (full-page, no sidebar)
```

### Steps

| Step | Component | What It Does |
|------|-----------|--------------|
| 1. Welcome | `WelcomeStep.tsx` | Welcome message, "Get Started" button |
| 2. Claude CLI | `ClaudeCliStep.tsx` | Checks if Claude CLI is installed + authenticated via `app.checkClaudeAuth` IPC |
| 3. API Key | `ApiKeyStep.tsx` | Configure Anthropic API key for profiles |
| 4. Integrations | `IntegrationsStep.tsx` | GitHub, Jira, etc. OAuth setup (skippable) |
| 5. Complete | `CompleteStep.tsx` | "You're all set!" + calls `onComplete()` |

**On completion**:
- `onComplete()` sets `onboardingJustCompleted = true` in RootLayout
- Updates settings: `settings.update({ onboardingCompleted: true })`
- RootLayout re-renders → shows Sidebar + Outlet (normal app)

**Key files**:
- `src/renderer/features/onboarding/components/OnboardingWizard.tsx`
- `src/renderer/features/onboarding/store.ts` — step state management
- `src/renderer/features/onboarding/components/ClaudeCliStep.tsx`
- `src/renderer/features/onboarding/components/ApiKeyStep.tsx`
- `src/renderer/features/onboarding/components/IntegrationsStep.tsx`
- `src/renderer/features/onboarding/components/CompleteStep.tsx`

**IPC channels used**:
- `settings.get` — check onboarding status
- `settings.update` — mark onboarding complete
- `app.checkClaudeAuth` — verify CLI installation
- `app.getOAuthStatus` — check integration status

---

## 4. App Shell & Navigation

After auth + onboarding, the user sees the main app shell:

```
┌─────────────────────────────────────────────────────┐
│  TopBar: [Project Tabs] [+] ─ [📷] [Health] [Hub] [⌘K] │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │  Main Content Area (<Outlet />)          │
│          │                                          │
│ Dashboard│  (Route-specific page component)         │
│ My Work  │                                          │
│ Notes    │                                          │
│ Fitness  │                                          │
│ Planner  │                                          │
│ Producty │                                          │
│ Alerts   │                                          │
│ Comms    │                                          │
│ ──────── │                                          │
│ Tasks    │  (Project-scoped, disabled without       │
│ Terminals│   active project)                        │
│ Agents   │                                          │
│ Roadmap  │                                          │
│ Ideation │                                          │
│ GitHub   │                                          │
│ Changelog│                                          │
│ Insights │                                          │
│ ──────── │                                          │
│ 👤 User  │  (UserMenu: avatar + logout dropdown)    │
│ 🟢 Hub   │                                          │
│ Settings │                                          │
└──────────┴──────────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `RootLayout` | `src/renderer/app/layouts/RootLayout.tsx` | Shell: sidebar + topbar + outlet + notifications |
| `Sidebar` | `src/renderer/app/layouts/Sidebar.tsx` | Nav items (top-level + project-scoped), collapsible |
| `TopBar` | `src/renderer/app/layouts/TopBar.tsx` | Project tabs + add button + ScreenshotButton + Health + Hub status + command bar |
| `CommandBar` | `src/renderer/app/layouts/CommandBar.tsx` | Global assistant input (Cmd+K) |
| `ProjectTabBar` | `src/renderer/app/layouts/ProjectTabBar.tsx` | Horizontal tab bar for switching between open projects |
| `UserMenu` | `src/renderer/app/layouts/UserMenu.tsx` | Avatar + logout dropdown in sidebar footer (above HubConnectionIndicator) |
| `AssistantWidget` | `src/renderer/features/assistant/components/AssistantWidget.tsx` | Floating chat widget (Ctrl+J toggle), renders WidgetFab + WidgetPanel |
| `HubConnectionIndicator` | `src/renderer/shared/components/HubConnectionIndicator.tsx` | Shows connected/disconnected dot |
| `ThemeHydrator` | `src/renderer/shared/stores/ThemeHydrator.tsx` | Applies theme class + data attributes to `<html>` |

### Hub Disconnected Banner

If `hubStatus.status === 'disconnected' || 'error'`:
- Destructive-styled banner (`bg-destructive/10 text-destructive`): "Hub disconnected. Some features may be unavailable."
- Rendered inside RootLayout above the main content

### Notification Toasts

Five notification components render in RootLayout:
- `AppUpdateNotification` — new version available
- `AuthNotification` — auth errors/expiry
- `HubNotification` — hub connection events
- `WebhookNotification` — webhook execution results
- `MutationErrorToast` — error toasts for failed mutations (fixed bottom-right, auto-dismiss 5s)

### Floating Assistant Widget

A floating chat widget (Intercom/Drift style) is mounted in RootLayout after all notification components:

- **`AssistantWidget`** (`src/renderer/features/assistant/components/AssistantWidget.tsx`) — Orchestrator that renders the FAB + conditional panel
- **`WidgetFab`** — Fixed-position circular button (bottom-right, z-40). Icon morphs between MessageSquare and X. Unread badge with pulse animation.
- **`WidgetPanel`** — Expandable chat panel (380px wide, max 70vh tall, z-50). Contains header, message area, quick action chips, and input.

**Keyboard shortcuts**:
| Shortcut | Action |
|----------|--------|
| `Ctrl+J` (or `Cmd+J`) | Toggle widget open/closed |
| `Escape` | Close panel (when open) |
| `Enter` | Send message (in widget input) |
| `Shift+Enter` | New line (in widget input) |

**Quick action chips**: New Note, New Task, Run Agent, Remind Me

**Unread tracking**: When `event:assistant.response` fires while the widget is closed, `incrementUnread()` is called. Opening the widget calls `resetUnread()`.

**Key files**:
- `src/renderer/features/assistant/components/AssistantWidget.tsx` — Orchestrator
- `src/renderer/features/assistant/components/WidgetFab.tsx` — FAB button
- `src/renderer/features/assistant/components/WidgetPanel.tsx` — Chat panel
- `src/renderer/features/assistant/components/WidgetMessageArea.tsx` — Message display
- `src/renderer/features/assistant/components/WidgetInput.tsx` — Chat input
- `src/renderer/shared/stores/assistant-widget-store.ts` — Widget open/close state
- `src/renderer/features/assistant/store.ts` — Response history, unread count

**IPC channels used**:
- `assistant.sendCommand` — Send a command to the assistant
- `assistant.getHistory` — Fetch command history
- `assistant.clearHistory` — Clear history

**Events consumed**:
- `event:assistant.response` — New response from assistant
- `event:assistant.thinking` — Assistant processing state
- `event:assistant.commandCompleted` — Command execution finished

**Proactive notification events**:
- `event:assistant.proactive` — Watch trigger, QA failure, or agent alert. Shown as proactive entry in WidgetMessageArea (Bell icon, info style). Source types: `'watch'`, `'qa'`, `'agent'`.

---

## 5. Dashboard (Home)

**Route**: `/dashboard`
**Component**: `DashboardPage`
**File**: `src/renderer/features/dashboard/components/DashboardPage.tsx`

### Widgets

| Widget | Component | What It Shows | Data Source |
|--------|-----------|---------------|-------------|
| Greeting | `GreetingHeader.tsx` | Time-based greeting + user name | Auth store |
| Today View | `TodayView.tsx` | Today's planned tasks, time blocks | `planner.getDay` IPC |
| Recent Projects | `RecentProjects.tsx` | Last accessed projects with quick open | `projects.list` IPC |
| Active Agents | `ActiveAgents.tsx` | Running AI agents with status | `agents.listAll` IPC |
| Quick Capture | `QuickCapture.tsx` | Fast note/task creation input | `notes.create` / `tasks.create` IPC |
| Daily Stats | `DailyStats.tsx` | Tasks completed, tokens used, costs | `insights.getMetrics` IPC |

**Key files**: `src/renderer/features/dashboard/components/`

---

## 6. Projects

### 6.1 Project List

**Route**: `/projects`
**Component**: `ProjectListPage`
**File**: `src/renderer/features/projects/components/ProjectListPage.tsx`

**What user sees**:
- List of all projects with name, path, repo structure badge (single/monorepo/multi-repo)
- Sub-project count per project
- Last updated timestamp
- "+" button to create new project
- "Wand" button to open init wizard
- **Pencil icon** per project to open `ProjectEditDialog` (edit name/description/branch/gitUrl, or delete with confirmation)
- Trash icon per project to delete

**Data flow**:
- `useProjects()` → `ipc('projects.list')` → `project-handlers.ts` → `projectService.listProjects()` → Hub API GET `/api/projects`
- `useSubProjects(projectId)` → `ipc('projects.getSubProjects')` → Hub API

### 6.2 Creating a Project (Init Wizard)

**Component**: `ProjectInitWizard`
**File**: `src/renderer/features/projects/components/ProjectInitWizard.tsx`

**Steps**:

| Step | What Happens | IPC Channels |
|------|--------------|--------------|
| 1. Select Folder | Native OS folder picker | `projects.selectDirectory` (async — Electron dialog) |
| 2. Detection | Auto-detects git repo type | `projects.detectRepo` → `git.detectStructure` |
| 3. Sub-Repos | If monorepo/multi-repo, select child repos | (local state only) |
| 4. Configure | Name, description, workspace selection | `workspaces.list` for dropdown |
| 5. Confirm | Creates project + sub-projects | `projects.add`, `projects.createSubProject` |

**On project creation**:
1. `useAddProject()` → `ipc('projects.add', { path })` → Hub API POST `/api/projects`
2. If sub-repos selected: `useCreateSubProject()` for each → `ipc('projects.createSubProject')`
3. On success: `onComplete(projectId)` → sets active project → navigates to tasks view

### 6.3 Opening a Project

```
User clicks a project row on ProjectListPage
  → setActiveProject(projectId) in layout store
  → addProjectTab(projectId) in layout store
  → navigate to /projects/$projectId/tasks
  → TopBar shows project tab
  → Sidebar project-scoped items become enabled
```

### 6.4 Project-Scoped Views

Once a project is active, these routes become available:

| Route | Component | File |
|-------|-----------|------|
| `/projects/$projectId/tasks` | `TaskDataGrid` | `src/renderer/features/tasks/components/grid/TaskDataGrid.tsx` |
| `/projects/$projectId/terminals` | `TerminalGrid` | `src/renderer/features/terminals/` |
| `/projects/$projectId/agents` | `AgentDashboard` | `src/renderer/features/agents/` |
| `/projects/$projectId/github` | `GitHubPage` | `src/renderer/features/github/` |
| `/projects/$projectId/roadmap` | `RoadmapPage` | `src/renderer/features/roadmap/` |
| `/projects/$projectId/ideation` | `IdeationPage` | `src/renderer/features/ideation/` |
| `/projects/$projectId/changelog` | `ChangelogPage` | `src/renderer/features/changelog/` |
| `/projects/$projectId/insights` | `InsightsPage` | `src/renderer/features/insights/` |

### 6.5 Editing a Project

**Component**: `ProjectEditDialog`
**File**: `src/renderer/features/projects/components/ProjectEditDialog.tsx`

```
User clicks pencil icon on project card
  → ProjectEditDialog opens (pre-filled with current project data)
  → Form fields: Name (required), Description, Default Branch, Git URL
  → "Save" sends only changed fields via useUpdateProject().mutate()
  → "Delete" button at bottom → opens nested ConfirmDialog
    → On confirm: useRemoveProject().mutate() → project removed from list
```

**Key files**:
- `src/renderer/features/projects/` — project list, init wizard, sub-project selector, edit dialog
- `src/renderer/features/projects/api/useProjects.ts` — all project hooks (7 mutations with onError)
- `src/renderer/features/projects/api/queryKeys.ts` — cache keys
- `src/main/services/project/project-service.ts` — Hub API proxy service
- `src/main/ipc/handlers/project-handlers.ts` — IPC handlers

---

## 7. Task Management (AG-Grid)

**Route**: `/projects/$projectId/tasks`
**Component**: `TaskDataGrid`
**File**: `src/renderer/features/tasks/components/grid/TaskDataGrid.tsx`

### 7.1 Grid Columns (12 Cell Renderers)

| Column | Cell Renderer | File | What It Shows |
|--------|--------------|------|---------------|
| Expand | `ExpandToggleCell` | `cells/ExpandToggleCell.tsx` | Chevron to expand detail row |
| Status | `StatusBadgeCell` | `cells/StatusBadgeCell.tsx` | Color-coded status badge (queue/in_progress/completed/failed) |
| Title | `TitleCell` | `cells/TitleCell.tsx` | Task title text |
| Priority | `PriorityCell` | `cells/PriorityCell.tsx` | Priority level with colored indicator |
| Agent | `AgentCell` | `cells/AgentCell.tsx` | Assigned agent name + status dot |
| Progress | `ProgressBarCell` | `cells/ProgressBarCell.tsx` | Progress percentage bar |
| Activity | `ActivitySparklineCell` | `cells/ActivitySparklineCell.tsx` | Mini activity chart |
| Workspace | `WorkspaceCell` | `cells/WorkspaceCell.tsx` | Workspace assignment |
| Cost | `CostCell` | `cells/CostCell.tsx` | Token cost estimate ($) |
| PR | `PrStatusCell` | `cells/PrStatusCell.tsx` | Pull request status with link |
| Updated | `RelativeTimeCell` | `cells/RelativeTimeCell.tsx` | "2m ago", "1h ago" timestamps |
| Actions | `ActionsCell` | `cells/ActionsCell.tsx` | Play/Stop/Delete action buttons (delete opens `ConfirmDialog`) |

### 7.2 Task Filter Toolbar

**Component**: `TaskFiltersToolbar`
**File**: `src/renderer/features/tasks/components/TaskFiltersToolbar.tsx`

- **"New Task" button** (primary, Plus icon) — opens `CreateTaskDialog` for task creation
- Text search input (filters across all columns)
- Status filter chips (queue, in_progress, completed, failed)
- State stored in Zustand: `src/renderer/features/tasks/store.ts`

### 7.3 Expanding a Task Row (Detail Panel)

```
User clicks expand chevron
  → toggleRowExpansion(taskId) in task store
  → Synthetic detail row inserted below task row
  → TaskDetailRow renders with 4 panels
```

**Detail Row Panels**:

| Panel | Component | File | What It Shows |
|-------|-----------|------|---------------|
| Subtasks | `SubtaskList` | `detail/SubtaskList.tsx` | Checklist of subtasks with completion status |
| Execution Log | `ExecutionLog` | `detail/ExecutionLog.tsx` | Agent output/activity history |
| PR Status | `PrStatusPanel` | `detail/PrStatusPanel.tsx` | Pull request details, review status |
| Controls | `TaskControls` | `detail/TaskControls.tsx` | Start/Stop/Cancel/Delete buttons (delete opens `ConfirmDialog`) |

### 7.4 Creating a Task

**UI**: Click "New Task" in `TaskFiltersToolbar` → opens `CreateTaskDialog`
**Dialog fields**: Title (required), Description (optional textarea), Priority (select: low/normal/high/urgent)
**Component**: `src/renderer/features/tasks/components/CreateTaskDialog.tsx`
**Dialog state**: `createDialogOpen` in `src/renderer/features/tasks/store.ts`

**Process**:
1. User fills form in `CreateTaskDialog`, clicks "Create Task"
2. `useMutation` → `ipc('hub.tasks.create', { title, description, projectId, priority })`
3. Handler: `task-handlers.ts` → Hub API POST `/api/tasks`
4. Hub creates task → broadcasts WebSocket event `task:created`
5. Electron main receives WS → emits IPC event `event:hub.taskUpdated`
6. `useTaskEvents()` hook → `queryClient.invalidateQueries()` → grid refreshes

**IPC channels**: `tasks.create`, `hub.tasks.create`
**Hub endpoint**: POST `/api/tasks`

### 7.5 Task Status Transitions

```
queue → in_progress → completed
                   → failed
                   → cancelled
```

**Status mapping** (local ↔ Hub):

| Local Status | Hub Status |
|-------------|------------|
| `queue` | `queued` |
| `in_progress` | `running` |
| `completed` | `completed` |
| `failed` | `failed` |
| `cancelled` | `cancelled` |

Functions: `mapLocalStatusToHub()`, `mapHubStatusToLocal()` in `task-handlers.ts`

### 7.6 Real-Time Task Updates

```
Hub broadcasts WebSocket event
  → src/main/services/hub/hub-connection.ts receives message
  → Parses event type, emits entity-specific IPC event:
    - task:created → 'event:hub.taskUpdated'
    - task:updated → 'event:hub.taskUpdated'
    - task:deleted → 'event:hub.taskUpdated'
  → src/renderer/features/tasks/hooks/useTaskEvents.ts
    → useIpcEvent('event:hub.taskUpdated', ...)
    → queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
  → AG-Grid re-renders with fresh data
```

**Key files**:
- `src/renderer/features/tasks/` — complete feature module
- `src/renderer/features/tasks/api/useTasks.ts` — query hooks
- `src/renderer/features/tasks/api/useTaskMutations.ts` — mutation hooks
- `src/renderer/features/tasks/hooks/useTaskEvents.ts` — WebSocket event handling
- `src/renderer/features/tasks/store.ts` — UI state (expanded rows, filters)
- `src/main/ipc/handlers/task-handlers.ts` — all task IPC handlers + transforms
- `src/renderer/features/tasks/components/grid/ag-grid-modules.ts` — AG-Grid module registration
- `src/renderer/features/tasks/components/grid/ag-grid-theme.css` — custom theme

---

## 8. Terminals

**Route**: `/projects/$projectId/terminals`
**Component**: `TerminalGrid`
**Feature**: `src/renderer/features/terminals/`

### User Actions

| Action | IPC Channel | Handler | Service |
|--------|-------------|---------|---------|
| View terminals | `terminals.list` | `terminal-handlers.ts` | `terminalService.listSessions()` |
| Create terminal | `terminals.create` | `terminal-handlers.ts` | `terminalService.createSession()` |
| Close terminal | `terminals.close` | `terminal-handlers.ts` | `terminalService.closeSession()` |
| Type in terminal | `terminals.sendInput` | `terminal-handlers.ts` | `terminalService.sendInput()` |
| Resize terminal | `terminals.resize` | `terminal-handlers.ts` | `terminalService.resize()` |
| Launch Claude CLI | `terminals.invokeClaudeCli` | `terminal-handlers.ts` | `terminalService.invokeClaudeCli()` |

**Tech**: xterm.js v6 for rendering, `@lydell/node-pty` for PTY backend

---

## 9. Agents

**Route**: `/projects/$projectId/agents`
**Component**: `AgentDashboard`
**Feature**: `src/renderer/features/agents/`

### User Actions

| Action | IPC Channel | What Happens |
|--------|-------------|--------------|
| View agents | `agents.list` / `agents.listAll` | Lists running Claude CLI agents |
| Stop agent | `agents.stop` | Terminates agent process |
| Pause agent | `agents.pause` | Sends SIGSTOP (Unix only, no-op on Windows) |
| Resume agent | `agents.resume` | Sends SIGCONT (Unix only) |
| Queue status | `agents.getQueueStatus` | Shows pending/running/completed counts |
| Token usage | `agents.getTokenUsage` | Aggregated token counts per model |

---

## 10. GitHub Integration

**Route**: `/projects/$projectId/github`
**Feature**: `src/renderer/features/github/`

### User Actions

| Action | IPC Channel | Hub/API |
|--------|-------------|---------|
| List PRs | `github.listPrs` | GitHub API via OAuth |
| View PR | `github.getPr` | GitHub API |
| List issues | `github.listIssues` | GitHub API |
| Create issue | `github.createIssue` | GitHub API |
| Notifications | `github.getNotifications` | GitHub API |

**Requires**: GitHub OAuth configured in Settings → OAuth Providers

---

## 11. Roadmap

**Route**: `/projects/$projectId/roadmap`
**Feature**: `src/renderer/features/roadmap/`

### User Actions

| Action | IPC Channel |
|--------|-------------|
| List milestones | `milestones.list` |
| Create milestone | `milestones.create` |
| Update milestone | `milestones.update` |
| Delete milestone | `milestones.delete` |
| Add task to milestone | `milestones.addTask` |
| Toggle milestone task | `milestones.toggleTask` |

---

## 12. Ideation

**Route**: `/projects/$projectId/ideation`
**Feature**: `src/renderer/features/ideation/`

### User Actions

| Action | IPC Channel |
|--------|-------------|
| List ideas | `ideas.list` |
| Create idea | `ideas.create` |
| Update idea | `ideas.update` |
| Delete idea | `ideas.delete` |
| Vote on idea | `ideas.vote` |

---

## 13. Changelog

**Route**: `/projects/$projectId/changelog`
**Feature**: `src/renderer/features/changelog/`

### User Actions

| Action | IPC Channel |
|--------|-------------|
| List entries | `changelog.list` |
| Add entry | `changelog.addEntry` |
| Auto-generate from git | `changelog.generate` |

---

## 14. Insights

**Route**: `/projects/$projectId/insights`
**Feature**: `src/renderer/features/insights/`

### User Actions

| Action | IPC Channel | What It Shows |
|--------|-------------|---------------|
| Get metrics | `insights.getMetrics` | Task counts, completion rate, avg time |
| Time series | `insights.getTimeSeries` | Activity over time chart |
| Task distribution | `insights.getTaskDistribution` | By status, by priority |
| Project breakdown | `insights.getProjectBreakdown` | Cross-project comparison |

**Enhanced metrics (from agent orchestrator + QA runner)**:
| Metric | Source | Description |
|--------|--------|-------------|
| `orchestratorSessionsToday` | AgentOrchestrator | Number of orchestrator sessions today |
| `orchestratorSuccessRate` | AgentOrchestrator | Percentage of sessions completed successfully |
| `averageAgentDuration` | AgentOrchestrator | Average session duration in seconds |
| `qaPassRate` | QaRunner | Percentage of QA runs that passed |
| `totalTokenCost` | AgentOrchestrator | Aggregated token cost across all sessions |

---

## 15. My Work

**Route**: `/my-work`
**Component**: `MyWorkPage`
**Feature**: `src/renderer/features/my-work/`

Shows the user's assigned tasks across all projects with `TaskStatusBadge` indicators.

---

## 16. Briefing

**Route**: `/briefing`
**Feature**: `src/renderer/features/briefing/`

### User Actions

| Action | IPC Channel |
|--------|-------------|
| View daily briefing | `briefing.getDaily` |
| Generate new briefing | `briefing.generate` |
| Get config | `briefing.getConfig` |
| Update config | `briefing.updateConfig` |
| Get suggestions | `briefing.getSuggestions` |

**Service**: `src/main/services/briefing/briefing-service.ts`

**Enhanced briefing data sources**:
The briefing service now aggregates data from the agent orchestrator (session counts, success rates) in addition to the existing task/agent/notification sources. This provides orchestrator activity summaries in daily briefings.

---

## 17. Planner

**Route**: `/planner` and `/planner/weekly`
**Feature**: `src/renderer/features/planner/`

### User Actions

| Action | IPC Channel |
|--------|-------------|
| View day plan | `planner.getDay` |
| Update day | `planner.updateDay` |
| Add time block | `planner.addTimeBlock` |
| Update time block | `planner.updateTimeBlock` |
| Remove time block | `planner.removeTimeBlock` |
| View week | `planner.getWeek` |
| Generate weekly review | `planner.generateWeeklyReview` |
| Update reflection | `planner.updateWeeklyReflection` |

---

## 18. Notes

**Route**: `/notes`
**Feature**: `src/renderer/features/notes/`

### User Actions

| Action | IPC Channel |
|--------|-------------|
| List notes | `notes.list` |
| Create note | `notes.create` |
| Update note | `notes.update` |
| Delete note | `notes.delete` |
| Search notes | `notes.search` |

---

## 19. Fitness

**Route**: `/fitness`
**Feature**: `src/renderer/features/fitness/`

### User Actions

| Action | IPC Channel |
|--------|-------------|
| Log workout | `fitness.logWorkout` |
| List workouts | `fitness.listWorkouts` |
| Delete workout | `fitness.deleteWorkout` |
| Log measurement | `fitness.logMeasurement` |
| Get measurements | `fitness.getMeasurements` |
| Get stats | `fitness.getStats` |
| Set goal | `fitness.setGoal` |
| List goals | `fitness.listGoals` |
| Update goal progress | `fitness.updateGoalProgress` |
| Delete goal | `fitness.deleteGoal` |

---

## 20. Productivity

**Route**: `/productivity`
**Feature**: `src/renderer/features/productivity/`

Spotify integration for focus music:

| Action | IPC Channel |
|--------|-------------|
| Get playback | `spotify.getPlayback` |
| Play | `spotify.play` |
| Pause | `spotify.pause` |
| Next track | `spotify.next` |
| Previous track | `spotify.previous` |
| Search | `spotify.search` |
| Set volume | `spotify.setVolume` |
| Add to queue | `spotify.addToQueue` |

**Requires**: Spotify OAuth configured in Settings → OAuth Providers

---

## 21. Alerts

**Route**: `/alerts`
**Feature**: `src/renderer/features/alerts/`

| Action | IPC Channel |
|--------|-------------|
| List alerts | `alerts.list` |
| Create alert | `alerts.create` |
| Dismiss alert | `alerts.dismiss` |
| Delete alert | `alerts.delete` |

---

## 22. Communications

**Route**: `/communications`
**Feature**: `src/renderer/features/communications/`

Email integration:

| Action | IPC Channel |
|--------|-------------|
| Send email | `email.send` |
| Get config | `email.getConfig` |
| Update config | `email.updateConfig` |
| Test connection | `email.testConnection` |
| View queue | `email.getQueue` |
| Retry failed | `email.retryQueued` |
| Remove from queue | `email.removeFromQueue` |

---

## 23. Settings

**Route**: `/settings`
**Component**: `SettingsPage`
**File**: `src/renderer/features/settings/components/SettingsPage.tsx`

### Settings Sections (Top to Bottom)

| Section | Component | IPC Channel(s) | What It Controls |
|---------|-----------|----------------|------------------|
| **Appearance** | inline in `SettingsPage` | `settings.update` | Light/Dark/System mode |
| **Background & Startup** | `BackgroundSettings.tsx` | `settings.update`, `app.setOpenAtLogin` | Open at login, minimize to tray |
| **Profiles** | `ProfileSection.tsx` | `settings.getProfiles`, `settings.createProfile`, `settings.updateProfile`, `settings.deleteProfile`, `settings.setDefaultProfile` | Claude API profiles (name, API key, model) |
| **Workspaces** | `WorkspacesTab.tsx` | `workspaces.list`, `workspaces.create`, `workspaces.update`, `workspaces.delete` | Workspace CRUD |
| **Color Theme** | inline in `SettingsPage` | `settings.update` | 7 color themes (default, dusk, lime, ocean, retro, neo, forest) |
| **UI Scale** | inline in `SettingsPage` | `settings.update` | 75%–150% scaling slider |
| **Font Family** | inline in `SettingsPage` | `settings.update` | System/Inter/JetBrains Mono/Fira Code/SF Mono |
| **Font Size** | inline in `SettingsPage` | `settings.update` | 12px–20px slider |
| **Language** | inline in `SettingsPage` | — | English only (static) |
| **OAuth Providers** | `OAuthProviderSettings.tsx` | `settings.getOAuthProviders`, `settings.setOAuthProvider` | GitHub, Spotify client ID/secret |
| **Hub Connection** | `HubSettings.tsx` | `hub.connect`, `hub.disconnect`, `hub.getStatus`, `hub.sync`, `hub.removeConfig` | Hub URL + API key, connect/disconnect, sync |
| **Webhooks** | `WebhookSettings.tsx` | `settings.getWebhookConfig`, `settings.updateWebhookConfig` | Webhook URL + events |
| **Hotkeys** | `HotkeySettings.tsx` | `hotkeys.get`, `hotkeys.update`, `hotkeys.reset` | Keyboard shortcuts customization |
| **Voice** | `VoiceSettings` (from `@features/voice`) | `voice.getConfig`, `voice.updateConfig`, `voice.checkPermission` | Enable/disable voice, language, input mode, synthesis test |
| **About** | inline | — | Version number (v0.1.0) |

### 23.1 Profile Save Flow (When User Clicks "Save" on a Profile)

```
User fills Profile form (name, API key, model) → clicks Save
  → ProfileFormModal.tsx calls onSave(data)
  → ProfileSection.tsx handleSave(data)
    → If new: useCreateProfile().mutate(data)
    → If edit: useUpdateProfile().mutate({ id, updates })
  → ipc('settings.createProfile', { name, apiKey, model })
    → settings-handlers.ts → settingsService.createProfile(data)
    → Saves to settings JSON file in userData
  → React Query invalidates profile cache → list refreshes
```

**Key files**:
- `src/renderer/features/settings/components/ProfileFormModal.tsx`
- `src/renderer/features/settings/components/ProfileSection.tsx`
- `src/renderer/features/settings/api/useSettings.ts` — all settings hooks
- `src/main/ipc/handlers/settings-handlers.ts` — settings IPC handlers
- `src/main/services/settings/settings-service.ts` — persistence to JSON file

### 23.2 Hub Connection Save Flow

```
User enters Hub URL + API Key → clicks Connect
  → HubSetupPage.tsx or HubSettings.tsx validates URL (pings /api/health via shared validateHubUrl)
  → If reachable: useHubConnect().mutate({ url, apiKey })
  → ipc('hub.connect', { url, apiKey })
    → hub-handlers.ts → hubConnectionManager.configure(url, apiKey)
    → API key encrypted via Electron safeStorage
    → Saved to userData/hub-config.json
    → hubConnectionManager.connect()
      → HTTP health check to Hub
      → WebSocket connection established
      → Device registration (if first time)
      → Heartbeat starts (30s interval)
  → IPC event 'event:hub.connectionChanged' emitted
  → UI updates: green status dot, "Connected" label, sync/disconnect buttons
```

### 23.3 Workspace CRUD

```
Create:
  → WorkspaceEditor.tsx form → useCreateWorkspace().mutate({ name, description })
  → ipc('workspaces.create') → workspace-handlers.ts → Hub API POST /api/workspaces
  → transformHubWorkspace() normalizes field names → returns Workspace
  → React Query invalidates → WorkspacesTab refreshes

Update:
  → WorkspaceCard.tsx edit → useUpdateWorkspace().mutate({ id, name, description })
  → ipc('workspaces.update') → Hub API PUT /api/workspaces/:id

Delete:
  → WorkspaceCard.tsx delete → useDeleteWorkspace().mutate(id)
  → ipc('workspaces.delete') → Hub API DELETE /api/workspaces/:id
```

**Key files**:
- `src/renderer/features/settings/components/WorkspacesTab.tsx`
- `src/renderer/features/settings/components/WorkspaceCard.tsx`
- `src/renderer/features/settings/components/WorkspaceEditor.tsx`
- `src/renderer/features/workspaces/api/useWorkspaces.ts`
- `src/main/ipc/handlers/workspace-handlers.ts`

### 23.4 Device Management

```
Device registration happens automatically on Hub connect.
DeviceCard.tsx (in settings) shows: device name, status (online/offline), last seen.
DeviceSelector.tsx lets user switch between registered devices.
```

**IPC channels**: `devices.list`, `devices.register`, `devices.heartbeat`, `devices.update`
**Key files**:
- `src/renderer/features/settings/components/DeviceCard.tsx`
- `src/renderer/features/settings/components/DeviceSelector.tsx`
- `src/renderer/features/devices/api/useDevices.ts`
- `src/main/services/device/device-service.ts`

---

## 24. Hub Connection & Real-Time

### Connection Lifecycle

```
App starts → loads hub-config.json → auto-connect if enabled
  → HTTP health check: GET {hubUrl}/api/health
  → WebSocket: ws://{hubUrl}/ws (with API key or JWT bearer token)
  → On success: status = 'connected', emit event:hub.connectionChanged
  → On fail: status = 'error', retry in 30s
```

### WebSocket Event Pipeline

```
Hub server broadcasts event (e.g., task:updated)
  → hub-connection.ts WebSocket onMessage handler
  → Parses event type from message
  → Emits entity-specific IPC event to renderer:
    - task:created/updated/deleted → 'event:hub.taskUpdated'
    - workspace:* → 'event:hub.workspaceUpdated'
    - device:* → 'event:hub.deviceUpdated'
    - project:* → 'event:hub.projectUpdated'
  → Renderer event hooks (useTaskEvents, useWorkspaceEvents, etc.)
    → queryClient.invalidateQueries() → React re-renders
```

### Key Files

| File | Purpose |
|------|---------|
| `src/main/services/hub/hub-connection.ts` | Connection manager, WebSocket, auto-reconnect |
| `src/main/services/hub/hub-api-client.ts` | HTTP client for Hub API calls |
| `src/main/services/hub/hub-auth-service.ts` | Auth API (login, register, refresh, logout) |
| `src/main/services/hub/hub-client.ts` | Low-level HTTP client factory |
| `src/main/services/device/` | Device service + heartbeat |
| `src/shared/types/hub-protocol.ts` | Hub API response types |
| `hub/src/app.ts` | Hub Fastify server + WebSocket setup |
| `hub/src/middleware/api-key.ts` | API key auth middleware |

---

## 25. Workflow System

### Progress Watcher

```
User starts progress watcher for a project
  → ipc('workflow.watchProgress', { projectPath })
  → workflow-handlers.ts creates fs.watch() on .claude/progress/**/*.md
  → On file change: parses progress, emits 'event:workflow.progressUpdate'
  → Renderer hook useWorkflowEvents() receives update → UI reflects
```

### Task Launcher

```
User launches a task
  → ipc('workflow.launch', { taskDescription, projectPath, subProjectPath })
  → Spawns Claude CLI session in project directory
  → Returns sessionId for tracking
```

### Session Management

| Action | IPC Channel |
|--------|-------------|
| Start progress watcher | `workflow.watchProgress` |
| Stop progress watcher | `workflow.stopWatching` |
| Launch task | `workflow.launch` |
| Check session running | `workflow.isRunning` |
| Stop session | `workflow.stop` |

**Key files**:
- `src/main/ipc/handlers/workflow-handlers.ts`
- `src/main/services/workflow/workflow-service.ts`

---

## 26. IPC Channel Reference

Complete list of all registered IPC channels by domain:

### Auth (5 channels)
`auth.login` · `auth.register` · `auth.me` · `auth.logout` · `auth.refresh`

### Agents (7)
`agents.list` · `agents.listAll` · `agents.stop` · `agents.pause` · `agents.resume` · `agents.getQueueStatus` · `agents.getTokenUsage`

### Alerts (4)
`alerts.list` · `alerts.create` · `alerts.dismiss` · `alerts.delete`

### App (5)
`app.checkClaudeAuth` · `app.getOAuthStatus` · `app.setOpenAtLogin` · `app.getOpenAtLogin` · `app.getVersion`

### App Update (4)
`app.checkForUpdates` · `app.downloadUpdate` · `app.quitAndInstall` · `app.getUpdateStatus`

### Agent Orchestrator (6)
`orchestrator.spawn` · `orchestrator.stop` · `orchestrator.list` · `orchestrator.getSession` · `orchestrator.getProgress` · `orchestrator.approvePlan`

### Assistant (3)
`assistant.sendCommand` · `assistant.getHistory` · `assistant.clearHistory`

### Briefing (5)
`briefing.getDaily` · `briefing.generate` · `briefing.getConfig` · `briefing.updateConfig` · `briefing.getSuggestions`

### Calendar (3)
`calendar.listEvents` · `calendar.createEvent` · `calendar.deleteEvent`

### Changelog (3)
`changelog.list` · `changelog.addEntry` · `changelog.generate`

### Claude (5)
`claude.isConfigured` · `claude.createConversation` · `claude.listConversations` · `claude.getMessages` · `claude.clearConversation`

### Devices (4)
`devices.list` · `devices.register` · `devices.heartbeat` · `devices.update`

### Email (7)
`email.send` · `email.getConfig` · `email.updateConfig` · `email.testConnection` · `email.getQueue` · `email.retryQueued` · `email.removeFromQueue`

### Fitness (10)
`fitness.logWorkout` · `fitness.listWorkouts` · `fitness.deleteWorkout` · `fitness.logMeasurement` · `fitness.getMeasurements` · `fitness.getStats` · `fitness.setGoal` · `fitness.listGoals` · `fitness.updateGoalProgress` · `fitness.deleteGoal`

### Git (7)
`git.status` · `git.branches` · `git.createBranch` · `git.createWorktree` · `git.removeWorktree` · `git.listWorktrees` · `git.detectStructure`

### GitHub (5)
`github.listPrs` · `github.getPr` · `github.listIssues` · `github.createIssue` · `github.getNotifications`

### Hotkeys (3)
`hotkeys.get` · `hotkeys.update` · `hotkeys.reset`

### Hub (6)
`hub.connect` · `hub.disconnect` · `hub.getStatus` · `hub.sync` · `hub.getConfig` · `hub.removeConfig`

### Hub Tasks (8)
`hub.tasks.list` · `hub.tasks.get` · `hub.tasks.create` · `hub.tasks.update` · `hub.tasks.updateStatus` · `hub.tasks.delete` · `hub.tasks.execute` · `hub.tasks.cancel`

### Ideas (5)
`ideas.list` · `ideas.create` · `ideas.update` · `ideas.delete` · `ideas.vote`

### Insights (4)
`insights.getMetrics` · `insights.getTimeSeries` · `insights.getTaskDistribution` · `insights.getProjectBreakdown`

### MCP (3)
`mcp.callTool` · `mcp.listConnected` · `mcp.getConnectionState`

### Merge (5)
`merge.previewDiff` · `merge.getFileDiff` · `merge.checkConflicts` · `merge.mergeBranch` · `merge.abort`

### OAuth (3)
`oauth.authorize` · `oauth.isAuthenticated` · `oauth.revoke`

### Milestones (6)
`milestones.list` · `milestones.create` · `milestones.update` · `milestones.delete` · `milestones.addTask` · `milestones.toggleTask`

### Notes (5)
`notes.list` · `notes.create` · `notes.update` · `notes.delete` · `notes.search`

### QA (3)
`qa.runQuiet` · `qa.runFull` · `qa.getReports`

### Notifications (7)
`notifications.list` · `notifications.markRead` · `notifications.markAllRead` · `notifications.getConfig` · `notifications.updateConfig` · `notifications.startWatching` · `notifications.stopWatching` · `notifications.getWatcherStatus`

### Planner (8)
`planner.getDay` · `planner.updateDay` · `planner.addTimeBlock` · `planner.updateTimeBlock` · `planner.removeTimeBlock` · `planner.getWeek` · `planner.generateWeeklyReview` · `planner.updateWeeklyReflection`

### Projects (9)
`projects.list` · `projects.add` · `projects.remove` · `projects.initialize` · `projects.selectDirectory` · `projects.detectRepo` · `projects.update` · `projects.getSubProjects` · `projects.createSubProject` · `projects.deleteSubProject`

### Screen (3)
`screen.listSources` · `screen.capture` · `screen.checkPermission`

### Settings (12)
`settings.get` · `settings.update` · `settings.getProfiles` · `settings.createProfile` · `settings.updateProfile` · `settings.deleteProfile` · `settings.setDefaultProfile` · `settings.getOAuthProviders` · `settings.setOAuthProvider` · `settings.getAgentSettings` · `settings.setAgentSettings` · `settings.getWebhookConfig` · `settings.updateWebhookConfig`

### Spotify (8)
`spotify.getPlayback` · `spotify.play` · `spotify.pause` · `spotify.next` · `spotify.previous` · `spotify.search` · `spotify.setVolume` · `spotify.addToQueue`

### Tasks (12)
`tasks.list` · `tasks.get` · `tasks.create` · `tasks.update` · `tasks.updateStatus` · `tasks.delete` · `tasks.execute` · `tasks.listAll` · `tasks.decompose` · `tasks.importFromGithub` · `tasks.listGithubIssues`

### Terminals (6)
`terminals.list` · `terminals.create` · `terminals.close` · `terminals.sendInput` · `terminals.resize` · `terminals.invokeClaudeCli`

### Time (1)
`time.parse`

### Voice (3)
`voice.getConfig` · `voice.updateConfig` · `voice.checkPermission`

### Workflow (5)
`workflow.watchProgress` · `workflow.stopWatching` · `workflow.launch` · `workflow.isRunning` · `workflow.stop`

### Workspaces (4)
`workspaces.list` · `workspaces.create` · `workspaces.update` · `workspaces.delete`

**Total**: ~200 IPC channels

### Event Channels — Agent Orchestrator
| Channel | Payload | When |
|---------|---------|------|
| `event:agent.orchestrator.heartbeat` | `{ taskId, timestamp }` | Session activity detected |
| `event:agent.orchestrator.stopped` | `{ taskId, reason, exitCode }` | Session completed or killed |
| `event:agent.orchestrator.error` | `{ taskId, error }` | Session encountered error |
| `event:agent.orchestrator.progress` | `{ taskId, type, data, timestamp }` | Tool use, phase change |
| `event:agent.orchestrator.planReady` | `{ taskId, planSummary, planFilePath }` | Plan file detected |

### Event Channels — Assistant Proactive
| Channel | Payload | When |
|---------|---------|------|
| `event:assistant.proactive` | `{ content, source, taskId?, followUp? }` | Watch triggered, QA failed, or agent alert |

---

## 27. Gap Analysis

### Identified Gaps for Testing

| # | Gap | Severity | Area | Details |
|---|-----|----------|------|---------|
| G-1 | ~~No visible logout button~~ | High | Auth | **RESOLVED** (2026-02-15) — UserMenu with logout added to Sidebar footer |
| G-2 | ~~No task creation dialog~~ | High | Tasks | **RESOLVED** (2026-02-15) — CreateTaskDialog + "New Task" button added to TaskFiltersToolbar |
| G-3 | ~~Duplicate task handlers~~ | Medium | Tasks | **RESOLVED** (2026-02-15) — Removed 8 duplicate hub.tasks.* registrations from hub-handlers.ts |
| G-4 | ~~No error UI for Hub disconnect during operation~~ | Medium | Hub | **RESOLVED** (2026-02-15) — Toast notification system + onError handlers on 11 mutations |
| G-5 | ~~Token refresh not proactive~~ | Medium | Auth | **RESOLVED** (2026-02-15) — useTokenRefresh hook with 2-min pre-expiry timer in AuthGuard |
| G-6 | ~~Hub config chicken-and-egg~~ | High | Auth/Hub | **RESOLVED** (2026-02-18) — HubSetupPage (`/hub-setup`) added as pre-auth screen. Login/register `beforeLoad` checks `hub.getConfig` and redirects to `/hub-setup` if no Hub URL configured. Docker quick-start instructions + connectivity validation included. |
| G-6b | Onboarding API key step disconnected | Low | Onboarding | `ApiKeyStep.tsx` collects API key but unclear if it's wired to `settings.createProfile` |
| G-7 | Project delete confirmation | Low | Projects | Delete button exists but confirmation UX not verified — could accidentally delete |
| G-8 | Workspace assignment in project wizard | Low | Projects | Workspace dropdown shown in wizard but may not persist `workspaceId` to project on create |
| G-9 | Device selector unused | Low | Settings | `DeviceSelector.tsx` exists but unclear when/where users would switch devices |
| G-10 | CommandBar not wired | Low | Navigation | `CommandBar.tsx` renders in TopBar but may not be connected to assistant functionality |
| G-11 | ~~Calendar feature no OAuth~~ | Low | Calendar | **RESOLVED** (2026-02-18) — OAuth IPC channels added (`oauth.authorize`, `oauth.isAuthenticated`, `oauth.revoke`). OAuthConnectionStatus component provides Connect/Disconnect buttons per provider in Settings → OAuth Providers. |
| G-12 | ~~Voice feature no UI~~ | Low | Voice | **RESOLVED** (2026-02-18) — VoiceSettings mounted in Settings page (after Hotkeys, before About). ScreenshotButton mounted in TopBar. |
| G-13 | ~~`/assistant` route defined but not wired~~ | Low | Navigation | **RESOLVED** (2026-02-15) — Assistant is now globally accessible via floating `AssistantWidget` (Ctrl+J toggle). Route constant remains for potential future full-page view. |
| G-14 | ~~`/briefing` not in sidebar~~ | Low | Navigation | **RESOLVED** (2026-02-18) — Briefing added to Sidebar `topLevelItems` array (second item, with Newspaper icon). |
| G-15 | ~~No project edit/settings page~~ | Medium | Projects | **RESOLVED** (2026-02-15) — ProjectEditDialog with edit buttons on project cards |
| G-16 | ~~No delete confirmation dialogs~~ | Medium | Projects | **RESOLVED** (2026-02-15) — ConfirmDialog component + wired to task/project deletes |
| G-17 | `projects.initialize` is a skeleton | Low | Projects | Handler returns hardcoded `{ success: true }` — not wired to any real initialization logic |
| G-18 | No project description field in wizard | Low | Projects | Project type supports `description` but the init wizard never asks for one |
| G-19 | Workspace assignment not editable | Low | Projects | Workspace set during creation but no UI to change it afterward |
| G-20 | Profile API keys stored in plaintext | Medium | Settings/Security | Profile `apiKey` saved as plaintext in `userData/settings.json` while webhook secrets use Electron `safeStorage` encryption — inconsistent security posture |

### Recommended MCP Test Scenarios

```
Test 1: Full Auth Flow
  → Launch app → see login → register → see dashboard → close/reopen → auto-login

Test 2: Project Lifecycle
  → Login → create project (wizard) → see project in list → open → see tasks → delete

Test 3: Task CRUD via Hub
  → Connect Hub → create task → see in grid → expand → view detail → change status → delete

Test 4: Settings Persistence
  → Change theme → change font → create profile → close/reopen → settings persisted

Test 5: Hub Connect/Disconnect
  → Open settings → enter Hub URL/key → connect → see green dot → disconnect → see banner

Test 6: Real-Time Updates
  → Connect Hub → create task via API → see WebSocket update → grid refreshes

Test 7: Multi-Device
  → Login on device A → login on device B → create task on A → see on B

Test 8: Onboarding Complete Flow
  → Fresh user → register → complete all 5 wizard steps → see dashboard
```
