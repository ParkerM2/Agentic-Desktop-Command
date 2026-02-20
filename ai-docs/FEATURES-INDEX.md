# Features Index

> Quick reference for all features, services, and file locations in ADC.
> Use this as a starting point to understand what exists and where.

---

## Quick Stats

| Category | Count |
|----------|-------|
| Renderer Features | 29 |
| Main Process Services | 33 |
| IPC Handler Files | 42 |
| IPC Domain Folders | 27 |
| Hub Type Modules | 9 |
| Bootstrap Modules | 5 |
| FEATURE.md Files | 16 |

---

## 1. Renderer Features

Location: `src/renderer/features/`

| Feature | Purpose | Key Components | IPC Channels |
|---------|---------|----------------|--------------|
| **agents** | Agent process management | AgentDashboard, AgentControls, AgentLogs | `agents.*` |
| **alerts** | Reminder/alert system | AlertsPage, AlertForm, AlertList | `alerts.*` |
| **assistant** | Built-in Claude assistant | AssistantWidget (WidgetFab, WidgetPanel, WidgetInput, WidgetMessageArea), CommandBar (TopBar) | `assistant.*` |
| **auth** | User authentication | LoginPage (TanStack Form + Zod), RegisterPage (TanStack Form + Zod), AuthGuard, UserMenu (in layouts); **Hooks**: useForceLogout (IPC-driven logout on token refresh failure) | `auth.*` |
| **changelog** | Project changelog viewer | ChangelogPage, ChangelogEntry | `changelog.*` |
| **communications** | Slack/Discord integration | SlackPanel, DiscordPanel | MCP tools |
| **dashboard** | Home dashboard | DashboardPage, TodayView, DailyStats, ActiveAgents | multiple |
| **fitness** | Health/fitness tracking | FitnessPage, WorkoutLog, MetricsChart | `fitness.*` |
| **github** | GitHub integration | GitHubPage, GitHubConnectionStatus, PRList, IssueList, NotificationList, PrDetailModal, IssueCreateForm; **Hooks**: useGitHubAuthStatus, useGitHubRepos, useGitHubPrs, useGitHubIssues, useGitHubNotifications, useCreateIssue, useGitHubEvents | `github.*` |
| **hub-setup** | Pre-auth Hub configuration wizard | HubSetupPage, validateHubUrl | `hub.getConfig`, `hub.connect` |
| **ideation** | Idea capture & tracking | IdeationPage, IdeaEditForm | `ideas.*` |
| **insights** | Analytics dashboard | InsightsPage, MetricsCards, Charts | `insights.*` |
| **notes** | Note-taking | NotesPage, NoteEditor, NoteList | `notes.*` |
| **planner** | Daily planner | PlannerPage, TimeBlockGrid, TimeBlockCard | `planner.*` |
| **productivity** | Productivity widgets | CalendarWidget, SpotifyWidget | `calendar.*`, `spotify.*` |
| **projects** | Project management | ProjectListPage, ProjectSettings, WorktreeManager, ProjectEditDialog, GitStatusIndicator (branch name + clean/changed badge in project list) | `projects.*`, `git.status` |
| **roadmap** | Project roadmap | RoadmapPage, MilestoneCard | `milestones.*` |
| **settings** | App settings | SettingsPage, ProfileFormModal (TanStack Form + Zod + FormSelect), HubSettings (ConnectionForm uses TanStack Form + Zod), OAuthProviderSettings, OAuthConnectionStatus, WebhookSettings (SlackForm + GitHubForm use TanStack Form + Zod), StorageManagementSection, StorageUsageBar, RetentionControl | `settings.*`, `oauth.*`, `dataManagement.*` |
| **tasks** | Task management (AG-Grid dashboard) | TaskDataGrid (AG-Grid v35 wrapped in `<Card>` from `@ui`; themed via compound `.ag-theme-quartz.ag-theme-claude` CSS class with design-system token overrides in `ag-grid-theme.css`), TaskFiltersToolbar, TaskDetailRow (subtasks use `?? []` fallback for Hub data), TaskStatusBadge, CreateTaskDialog, PlanFeedbackDialog, TaskResultView (status/duration/cost/log summary for completed tasks), CreatePrDialog (GitHub PR creation post-task-completion); **Hooks**: useTaskEvents (→ useAgentEvents + useQaEvents), useAgentMutations (useStartPlanning, useStartExecution, useReplanWithFeedback, useKillAgent, useRestartFromCheckpoint), useQaMutations, QaReportViewer | `hub.tasks.*`, `tasks.*`, `agent.*` (incl. `agent.replanWithFeedback`), `qa.*`, `git.createPr`, `event:agent.orchestrator.*`, `event:qa.*` |
| **terminals** | Terminal emulator | TerminalGrid, TerminalInstance | `terminals.*` |
| **briefing** | Daily briefing & suggestions | BriefingPage, SuggestionCard | `briefing.*` |
| **merge** | Branch merge workflow | MergeConfirmModal, MergePreviewPanel, ConflictResolver, FileDiffViewer (`@git-diff-view/react`) | `merge.*` |
| **my-work** | Cross-project task view | MyWorkPage | `tasks.*` |
| **onboarding** | First-run setup wizard | OnboardingWizard, ClaudeCliStep, ApiKeyStep | `app.*`, `settings.*` |
| **voice** | Voice interface (STT/TTS) | VoiceButton, VoiceSettings (mounted in SettingsPage) | `voice.*` |
| **screen** | Screen capture | ScreenshotButton (mounted in TopBar), ScreenshotViewer | `screen.*` |
| **devices** | Device registration & heartbeat | DeviceCard, DeviceSelector | `devices.*` |
| **workflow-pipeline** | Visual workflow pipeline showing task journey as connected diagram | WorkflowPipelinePage, PipelineDiagram, PipelineStepNode, PipelineConnector, TaskSelector, MarkdownRenderer, MarkdownEditor, 8 step panels | `hub.tasks.*` |
| **workspaces** | Workspace management | WorkspaceCard, WorkspacesTab, WorkspaceEditor | `workspaces.*` |

### Feature Module Structure

Every feature follows this pattern:

```
feature/
├── index.ts              # Barrel exports
├── api/
│   ├── queryKeys.ts      # React Query key factory
│   ├── use<Feature>.ts   # Query hooks
│   └── use<Feature>Mutations.ts
├── components/
│   └── <Feature>Page.tsx
├── hooks/
│   └── use<Feature>Events.ts
└── store.ts              # Zustand (UI state only)
```

---

## 2. Main Process Services

Location: `src/main/services/`

| Service | Purpose | Key Methods | Events Emitted |
|---------|---------|-------------|----------------|
| **agent** | Claude CLI process management. Sub-modules: `agent-spawner.ts`, `agent-output-parser.ts`, `agent-queue.ts`, `token-parser.ts` | spawnAgent, stopAgent, pauseAgent, resumeAgent | `event:agent.*` |
| **alerts** | Reminder/alert CRUD + scheduling | list, create, update, delete, startChecking | `event:alert.changed` |
| **assistant** | Built-in assistant (intent → action). Sub-modules: `executors/` (22 domain executors), `intent-classifier/` (classifier + 13 pattern files) | sendCommand, getHistory | `event:assistant.*` |
| **app-update** | Electron auto-updater | checkForUpdates, downloadUpdate, quitAndInstall, getStatus | `event:app.updateAvailable`, `event:app.updateDownloaded` |
| **calendar** | Google Calendar integration | listEvents, createEvent | - |
| **changelog** | Project changelog CRUD | list, addEntry | - |
| **fitness** | Health metrics (manual) | getMetrics, logWorkout | - |
| **git** | Git operations (simple-git + `gh` CLI for PRs) | getStatus, listBranches, createBranch, commit, push, resolveConflict, createPr, listWorktrees, detectStructure | `event:git.*` |
| **github** | GitHub API integration (gh CLI) | listPRs, listIssues, getRepo, authStatus, getRepos | - |
| **hub** | Hub server connection. Sub-modules: `hub-api-client.ts`, `hub-auth-service.ts`, `hub-client.ts`, `hub-config-store.ts`, `hub-connection.ts`, `hub-event-mapper.ts`, `hub-sync.ts`, `hub-ws-client.ts`, `webhook-relay.ts` | connect, disconnect, sync | `event:hub.*` |
| **ideas** | Idea CRUD | list, create, update, delete | - |
| **insights** | Analytics aggregation | getMetrics, getTimeSeries | - |
| **merge** | Branch merge operations | previewDiff, checkConflicts, mergeBranch, getFileDiff | - |
| **milestones** | Milestone CRUD | list, create, update, delete | - |
| **notes** | Note CRUD | list, create, update, delete | - |
| **planner** | Daily time blocks | listBlocks, createBlock, updateBlock | `event:planner.*` |
| **project** | Project management. Sub-modules: `project-detector.ts`, `task-service.ts` (UUID support, metadata persistence), `task-slug.ts`, `task-spec-parser.ts`, `task-store.ts` (reads metadata, maps legacy statuses via `LEGACY_STATUS_MAP`), `codebase-analyzer.ts` (tech stack detection: languages, frameworks, package managers, build tools, test frameworks, linters, TypeScript, Tailwind, Node version, monorepo tools — sync, max 3 levels deep) | list, add, remove, selectDirectory, analyzeCodebase | `event:project.*` |
| **settings** | App settings persistence. Sub-modules: `settings-defaults.ts`, `settings-encryption.ts`, `settings-store.ts` | get, update | `event:settings.changed` |
| **spotify** | Spotify integration | getCurrentTrack, play, pause, skip | - |
| **terminal** | PTY terminal management | create, sendInput, resize, kill | `event:terminal.*` |
| **briefing** | Daily briefing & suggestions. Sub-modules: `briefing-cache.ts`, `briefing-config.ts`, `briefing-generator.ts`, `briefing-summary.ts`, `suggestion-engine.ts` | generateBriefing, getSuggestions | - |
| **claude** | Persistent Claude sessions (Anthropic SDK) | sendMessage, getConversation, listConversations | `event:claude.*` |
| **email** | Email sending (SMTP). Sub-modules: `email-config.ts`, `email-encryption.ts`, `email-queue.ts`, `email-store.ts`, `smtp-transport.ts` (barrel: `index.ts`) | sendEmail, getConfig, testConnection | - |
| **notifications** | Background Slack/GitHub watchers. Sub-modules: `slack-watcher.ts`, `github-watcher.ts`, `notification-filter.ts`, `notification-manager.ts`, `notification-store.ts` (barrel: `index.ts`) | startWatching, stopWatching, getNotifications | `event:notification.*` |
| **tasks** | Smart task creation + local-first repository. Sub-modules: `types.ts` (TaskRepository interface + deps), `task-repository.ts` (local-first impl with Hub mirror), `task-decomposer.ts`, `github-importer.ts` (barrel: `index.ts`) | listTasks, getTask, createTask, updateTask, updateTaskStatus, deleteTask, executeTask, cancelTask, decompose, importFromGithub | - |
| **time-parser** | Natural language time parsing | parseTimeExpression | - |
| **voice** | Voice interface (Web Speech API) | startListening, stopListening, speak | `event:voice.*` |
| **device** | Device registration & heartbeat via Hub API | registerDevice, updateDevice, sendHeartbeat | `event:hub.devices.*` |
| **agent-orchestrator** | Headless Claude agent lifecycle management. Hooks config merges into `.claude/settings.local.json` (restored on cleanup). Planning completion auto-detects plan files and transitions to `plan_ready`. Security hardened: taskId sanitization (regex allowlist), environment scrubbing (glob-based blocklist/allowlist), working directory validation (existsSync + restricted paths). | spawnSession, stopSession, listSessions, onSessionEvent | `event:agent.orchestrator.*` |
| **agent-orchestrator/jsonl-progress-watcher** | JSONL progress file watcher (debounced tail parsing) | start, stop, onProgress | `event:agent.orchestrator.progress`, `event:agent.orchestrator.planReady` |
| **agent-orchestrator/agent-watchdog** | Health monitoring for active agent sessions (PID checks, heartbeat age, auto-restart on overflow) | start, stop, checkNow, onAlert, dispose | `event:agent.orchestrator.watchdogAlert` (wired in index.ts) |
| **qa** | Two-tier automated QA system (quiet + full) | startQuiet, startFull, getSession, getReportForTask, cancel, onSessionEvent | `event:qa.started`, `event:qa.progress`, `event:qa.completed` |
| **assistant/watch-store** | Persistent watch subscription storage (JSON file) | add, remove, getActive, getAll, markTriggered, clear | - |
| **assistant/watch-evaluator** | Evaluates IPC events against active watches | start, stop, onTrigger | `event:assistant.proactive` (via index.ts wiring) |
| **assistant/cross-device-query** | Query other ADC instances via Hub API | query | - |
| **data-management** | Storage lifecycle auditing, cleanup, inspection. Sub-modules: `store-registry.ts` (22+ data store entries), `store-cleaners.ts` (per-store cleanup functions), `cleanup-service.ts` (periodic orchestrator), `storage-inspector.ts` (disk usage calculator), `crash-recovery.ts` (orphan detection), `data-export.ts` (archive export/import), `index.ts` (barrel) | runCleanup, getUsage, getRegistry, getRetention, updateRetention, clearStore, exportData, importData | `event:dataManagement.cleanupComplete` |

### Main Process Libraries

Location: `src/main/lib/`

| Library | Purpose | Key Exports |
|---------|---------|-------------|
| **logger** | Structured logging via electron-log. Scoped loggers with rotation, level control, and file output. All main-process code uses scoped loggers instead of `console.*`. | `initLogger`, `setLogLevel`, `createScopedLogger`, `getLogFilePath`, pre-built scoped loggers: `appLogger`, `ipcLogger`, `hubLogger`, `agentLogger`, `serviceLogger`, `watcherLogger`, `authLogger`, `mcpLogger`, `fsLogger` |

---

## 3. IPC Handler Files

Location: `src/main/ipc/handlers/`

| Handler File | Domains Covered |
|--------------|-----------------|
| `agent-handlers.ts` | agents.* |
| `alert-handlers.ts` | alerts.* |
| `app-handlers.ts` | app.* (version, auth checks, openAtLogin) |
| `app-update-handlers.ts` | app.checkForUpdates, app.downloadUpdate, app.quitAndInstall, app.getUpdateStatus |
| `assistant-handlers.ts` | assistant.* |
| `calendar-handlers.ts` | calendar.* |
| `changelog-handlers.ts` | changelog.* |
| `fitness-handlers.ts` | fitness.* |
| `git-handlers.ts` | git.* |
| `github-handlers.ts` | github.* |
| `hub-handlers.ts` | hub.* |
| `ideas-handlers.ts` | ideas.* |
| `insights-handlers.ts` | insights.* |
| `merge-handlers.ts` | merge.* |
| `milestones-handlers.ts` | milestones.* |
| `notes-handlers.ts` | notes.* |
| `oauth-handlers.ts` | oauth.authorize, oauth.isAuthenticated, oauth.revoke |
| `planner-handlers.ts` | planner.* |
| `project-handlers.ts` | projects.* |
| `settings-handlers.ts` | settings.* |
| `spotify-handlers.ts` | spotify.* |
| `tasks/` (directory) | tasks.* — Split into: `hub-task-handlers.ts`, `legacy-task-handlers.ts`, `status-mapping.ts`, `task-transform.ts`, `index.ts` (barrel) |
| `task-handlers.ts` | tasks.* (single-file handler, coexists with `tasks/` split handlers) |
| `terminal-handlers.ts` | terminals.* |
| `error-handlers.ts` | app.getErrorLog, app.getErrorStats, etc. |
| `hotkey-handlers.ts` | hotkeys.get, hotkeys.update, hotkeys.reset |
| `webhook-settings-handlers.ts` | webhooks.* |
| `briefing-handlers.ts` | briefing.* |
| `claude-handlers.ts` | claude.* |
| `email-handlers.ts` | email.* |
| `mcp-handlers.ts` | mcp.* |
| `notification-handlers.ts` | notifications.* |
| `time-handlers.ts` | time.* |
| `voice-handlers.ts` | voice.* |
| `workspace-handlers.ts` | workspace.* |
| `auth-handlers.ts` | auth.* |
| `device-handlers.ts` | devices.* |
| `orchestrator-handlers.ts` | orchestrator.* (spawn, stop, replan with feedback, list sessions, get progress) |
| `qa-handlers.ts` | qa.* (run quiet, run full, get reports) |
| `data-management-handlers.ts` | dataManagement.* (registry, usage, retention, cleanup, export/import) |
| `security-handlers.ts` | security.getSettings, security.updateSettings, security.exportAudit |
| `agent-orchestrator-handlers.ts` | agent.startPlanning, agent.startExecution, agent.replanWithFeedback, agent.killSession, agent.restartFromCheckpoint, agent.getOrchestratorSession, agent.listOrchestratorSessions |
| `window-handlers.ts` | window.minimize, window.maximize, window.close, window.isMaximized |

### IPC Utilities (`src/main/ipc/`)

| File | Purpose |
|------|---------|
| `throttle.ts` | `createThrottle(windowMs)` — rate-limiter for expensive IPC handlers (agent spawn: 5s, email send: 2s, full QA: 10s) |
| `router.ts` | IPC router with typed handle/emit |
| `index.ts` | Handler registration barrel |

---

## 4. Shared Code

### Types (`src/shared/types/`)

| File | Types Defined |
|------|---------------|
| `agent.ts` | AgentSession, AgentStatus, AgentLog |
| `alert.ts` | Alert, AlertType, AlertPriority |
| `assistant.ts` | AssistantCommand, AssistantResponse, IntentType (16 types), AssistantAction (30+ actions), AssistantContext |
| `assistant-watch.ts` | AssistantWatch, WatchType, WatchOperator, WatchAction, WatchCondition |
| `agent-orchestrator.ts` | OrchestratorSession, SessionEvent, SessionStatus (if exists) |
| `qa.ts` | QaReport, QaResult, QaTier (if exists) |
| `fitness.ts` | FitnessMetrics, Workout, HealthData |
| `ideas.ts` | Idea, IdeaCategory |
| `insights.ts` | InsightMetrics (with orchestrator/QA fields), InsightTimeSeries, TaskDistribution, ProjectInsights |
| `milestones.ts` | Milestone, MilestoneStatus |
| `notes.ts` | Note, NoteFolder |
| `planner.ts` | TimeBlock, PlannerDay |
| `project.ts` | Project, ProjectSettings |
| `settings.ts` | AppSettings, HubConfig, OAuthProvider |
| `task.ts` | Task, TaskStatus, TaskSpec |
| `terminal.ts` | TerminalSession |
| `briefing.ts` | DailyBriefing, Suggestion, SuggestionType |
| `claude.ts` | ClaudeConversation, ClaudeMessage, ClaudeConfig |
| `email.ts` | EmailConfig, EmailMessage, SmtpSettings |
| `notifications.ts` | Notification, NotificationSource, WatcherConfig |
| `voice.ts` | VoiceConfig, SpeechResult, VoiceState |
| `workspace.ts` | Workspace, WorkspaceConfig |
| `hub-connection.ts` | HubConnection types |
| `hub-events.ts` | Hub event payload types |
| `hub-protocol.ts` | Hub protocol contract types |
| `auth.ts` | AuthUser, LoginCredentials, RegisterData, AuthTokens |
| `health.ts` | ErrorEntry, ErrorStats, ErrorSeverity, ErrorTier, ErrorCategory, ErrorContext, ServiceHealth, ServiceHealthStatus, HealthStatus |
| `data-management.ts` | DataLifecycle, RetentionPolicy, DataStoreEntry, DataStoreUsage, DataRetentionSettings, DataExportArchive |
| `security.ts` | SecuritySettings, SecurityMode, CspMode, SecurityAuditExport, DEFAULT_SECURITY_SETTINGS |

### Route Groups (`src/renderer/app/routes/`)

The router has been split from a single `router.tsx` into **8 route group files**:

| File | Routes Covered | Pending Skeleton |
|------|----------------|------------------|
| `auth.routes.tsx` | `/login`, `/register` | none (eagerly loaded) |
| `communication.routes.ts` | `/communications` | `GenericPageSkeleton` |
| `dashboard.routes.ts` | `/dashboard`, `/my-work` | `DashboardSkeleton` |
| `misc.routes.ts` | `/briefing`, `/fitness` | `GenericPageSkeleton` |
| `productivity.routes.ts` | `/alerts`, `/notes`, `/planner`, `/planner/weekly`, `/productivity` | `GenericPageSkeleton` |
| `project.routes.ts` | `/projects`, `/projects/$projectId/**` (tasks, terminals, agents, etc.) | `ProjectSkeleton` |
| `settings.routes.ts` | `/settings` | `SettingsSkeleton` |
| `index.ts` | Barrel that assembles all route groups into the router | — |

Route-group-specific loading skeletons live in `src/renderer/app/components/route-skeletons.tsx`. Each route sets a `pendingComponent` that matches its page layout (card grid, data table, form sections, etc.).

### Bootstrap Modules (`src/main/bootstrap/`)

The main process `index.ts` has been split into **5 focused bootstrap modules**:

| File | Purpose |
|------|---------|
| `lifecycle.ts` | App lifecycle (ready, quit, window creation) |
| `service-registry.ts` | Service factory instantiation and dependency wiring |
| `ipc-wiring.ts` | IPC handler registration (connects handlers to router) |
| `event-wiring.ts` | Event forwarding setup (service events → renderer) |
| `index.ts` | Barrel re-export |

### Constants (`src/shared/constants/`)

| File | Constants |
|------|-----------|
| `routes.ts` | ROUTES, ROUTE_PATTERNS, projectViewPath() |
| `themes.ts` | COLOR_THEMES, COLOR_THEME_LABELS |
| `agent-patterns.ts` | Agent output parsing patterns |
| `index.ts` | Barrel exports for all constants |

### IPC Contract (Domain-Based Structure)

The IPC contract has been split from a single monolithic file into **27 domain folders** under `src/shared/ipc/`. The root barrel at `src/shared/ipc/index.ts` merges all domain contracts back into the unified `ipcInvokeContract` and `ipcEventContract` objects. The original `src/shared/ipc-contract.ts` is now a thin backward-compatible re-export.

**Domain folders** (`src/shared/ipc/<domain>/`):

| Domain | Contents |
|--------|----------|
| `agents` | Agent + orchestrator invoke/event contracts |
| `app` | App lifecycle, update, version |
| `assistant` | Assistant commands, responses, rate limits |
| `auth` | Login, register, refresh token |
| `briefing` | Daily briefing, suggestions |
| `claude` | Persistent Claude sessions, streaming |
| `common` | Shared schemas (SuccessResponse, TokenUsage) |
| `email` | SMTP email sending, queue |
| `fitness` | Workouts, body measurements, goals |
| `git` | Git status, branches, worktrees, commit, push, resolveConflict, createPr |
| `github` | GitHub PRs, issues, notifications, auth status, repos |
| `hub` | Hub connection, sync, config |
| `misc` | Alerts, calendar, changelog, devices, hotkeys, ideas, insights, merge, milestones, notes, screen, time, voice, webhooks, workspaces (18 contract files) |
| `oauth` | OAuth authorization, authentication status, token revocation (3 channels) |
| `notifications` | Notification watchers (Slack, GitHub) |
| `planner` | Time blocks, daily plans, weekly review |
| `projects` | Project CRUD, sub-projects, repo detection |
| `qa` | QA runner, reports, sessions |
| `settings` | App settings, profiles, webhook config |
| `spotify` | Spotify playback |
| `tasks` | Local tasks + Hub tasks (invoke + events) |
| `terminals` | Terminal session management |
| `health` | Error collection, health registry invoke/event contracts |
| `data-management` | Data store registry, retention settings, cleanup, usage, export/import (8 invoke + 1 event) |
| `security` | Security settings, audit export (3 channels) |
| `window` | Window controls (minimize, maximize, close, isMaximized) |
| `workflow` | Workflow execution |

Each domain folder contains:
```
<domain>/
├── contract.ts   # ipcInvokeContract + ipcEventContract entries
├── schemas.ts    # Zod schemas for the domain
└── index.ts      # Barrel export
```

Additional files: `src/shared/ipc/types.ts` (type utilities: `InvokeInput`, `InvokeOutput`, `EventPayload`, etc.), `src/shared/ipc/FEATURE.md` (split rationale).

### Hub Type Modules (`src/shared/types/hub/`)

Hub protocol types have been split from a single `hub-protocol.ts` into **9 focused modules**:

| File | Types Defined |
|------|---------------|
| `auth.ts` | Hub auth token types, credentials |
| `devices.ts` | Device registration, heartbeat types |
| `enums.ts` | Hub-specific enums (status, priority) |
| `errors.ts` | Hub error types |
| `events.ts` | Hub WebSocket event payload types |
| `index.ts` | Barrel re-export |
| `projects.ts` | Hub project types |
| `tasks.ts` | Hub task types |
| `workspaces.ts` | Hub workspace types |

### FEATURE.md Documentation Files

Each split directory contains a `FEATURE.md` documenting its purpose, public API, and file inventory. There are **16 FEATURE.md files** across the codebase:

| Location | Scope |
|----------|-------|
| `src/main/bootstrap/FEATURE.md` | Bootstrap module architecture |
| `src/main/ipc/handlers/tasks/FEATURE.md` | Split task handler files |
| `src/main/services/agent-orchestrator/FEATURE.md` | Agent orchestrator lifecycle, watchdog, progress watcher |
| `src/main/services/assistant/FEATURE.md` | Assistant service: intent classification + command execution |
| `src/main/services/assistant/executors/FEATURE.md` | 22 domain executor files |
| `src/main/services/assistant/intent-classifier/FEATURE.md` | Classifier + 13 pattern files |
| `src/main/services/briefing/FEATURE.md` | Briefing generation, cache, config, scheduling |
| `src/main/services/email/FEATURE.md` | SMTP email, queue, encryption, store |
| `src/main/services/hub/FEATURE.md` | Hub connection layer: API client, auth, WebSocket, sync |
| `src/main/services/notifications/FEATURE.md` | Slack/GitHub watchers, notification manager, filter |
| `src/renderer/app/routes/FEATURE.md` | 8 route group files |
| `src/renderer/features/planner/FEATURE.md` | Planner components: weekly review, day compact, stats |
| `src/renderer/features/settings/FEATURE.md` | Settings page: OAuth, webhooks, appearance sections |
| `src/renderer/features/tasks/FEATURE.md` | Task dashboard: AG-Grid, cell renderers, detail rows |
| `src/shared/ipc/FEATURE.md` | Domain-based IPC contract structure |
| `src/shared/types/hub/FEATURE.md` | Hub protocol type modules |

---

## 5. Hub Server

Location: `hub/`

The Hub is a separate Fastify server that enables multi-device sync.

```
hub/
├── src/
│   ├── app.ts              # Fastify app setup
│   ├── server.ts           # Server startup
│   ├── db/
│   │   ├── schema.sql      # SQLite schema
│   │   └── connection.ts   # Database connection
│   ├── routes/
│   │   ├── auth.ts         # API key management
│   │   ├── projects.ts     # Project sync
│   │   ├── tasks.ts        # Task sync
│   │   ├── agents.ts       # Agent run history
│   │   ├── planner.ts      # Time block sync
│   │   ├── health.ts       # Health check
│   │   ├── sync.ts         # Bulk sync endpoint
│   │   └── webhooks/       # Slack/GitHub webhook receivers
│   ├── ws/
│   │   └── broadcaster.ts  # WebSocket real-time updates
│   └── lib/
│       ├── types.ts        # Hub-specific types
│       └── webhook-validator.ts
└── Dockerfile
```

---

## 6. App Layouts

Location: `src/renderer/app/layouts/`

| Layout | Purpose |
|--------|---------|
| `RootLayout.tsx` | Root shell: renders TitleBar at top, then `react-resizable-panels` (Group/Panel/Separator) for sidebar + content layout with localStorage persistence. Sidebar panel is collapsible (collapses to 56px, minSize 160px so labels are visible when expanded, maxSize 300px) and syncs with layout store. |
| `TitleBar.tsx` | Custom frameless window title bar (32px). Drag region for window movement + minimize/maximize/close controls. Uses `window.*` IPC channels. |
| `Sidebar.tsx` | Navigation sidebar (fills its parent panel, collapse state driven by layout store). Uses `bg-sidebar text-sidebar-foreground` theme variables. |
| `TopBar.tsx` | Top bar with assistant command input |
| `CommandBar.tsx` | Global command palette (Cmd+K) |
| `ProjectTabBar.tsx` | Horizontal tab bar for switching between open projects |
| `UserMenu.tsx` | Avatar + logout dropdown in sidebar footer |

---

## 6.5 Shared UI Components

Location: `src/renderer/shared/components/`

| Component | Purpose |
|-----------|---------|
| `AppUpdateNotification.tsx` | App update available notification banner |
| `AuthNotification.tsx` | Auth error/expiry notification |
| `ConfirmDialog.tsx` | Reusable confirmation dialog for destructive actions. Props: `open`, `onOpenChange`, `title`, `description`, `variant`, `onConfirm`, `loading` |
| `HubConnectionIndicator.tsx` | Hub connected/disconnected dot indicator |
| `HubNotification.tsx` | Hub connection event notifications |
| `HubStatus.tsx` | Hub status display component |
| `IntegrationRequired.tsx` | Placeholder for features requiring external integration |
| `MutationErrorToast.tsx` | Error toast renderer, mounted in RootLayout. Reads from `useToastStore`, renders fixed bottom-right |
| `WebhookNotification.tsx` | Webhook execution result notifications |

### Design System Primitives (`src/renderer/shared/components/ui/`)

Barrel export: `import { Button, Card, Input, ... } from '@ui'`

All primitives follow the **shadcn/ui pattern**: CVA variants, `data-slot` attributes, React 19 `ComponentProps` (no forwardRef), `cn()` merging. Feature code uses **props, not className strings**.

| Tier | Component | File | Key Exports |
|------|-----------|------|-------------|
| **1: Form** | Button | `ui/button.tsx` | `Button`, `buttonVariants` — variants: primary, secondary, destructive, ghost, outline, link; sizes: sm, md, lg, icon; `asChild` via Radix Slot |
| **1: Form** | Input | `ui/input.tsx` | `Input`, `inputVariants` — variants: default, error; sizes: sm, md, lg |
| **1: Form** | Textarea | `ui/textarea.tsx` | `Textarea`, `textareaVariants` — variants: default, error; resize: none, vertical, both |
| **1: Form** | Label | `ui/label.tsx` | `Label`, `labelVariants` — variants: default, required (red asterisk), error |
| **1: Display** | Badge | `ui/badge.tsx` | `Badge`, `badgeVariants` — variants: default, secondary, destructive, outline, success, warning, info, error |
| **1: Display** | Card | `ui/card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` — compound component, variants: default, interactive, elevated |
| **1: Display** | Skeleton | `ui/skeleton.tsx` | `Skeleton` — pulse-animated placeholder, variants: line, circle, card |
| **1: Display** | Spinner | `ui/spinner.tsx` | `Spinner`, `spinnerVariants` — wraps Lucide Loader2, sizes: sm, md, lg |
| **1: Display** | EmptyState | `ui/empty-state.tsx` | `EmptyState`, `emptyStateVariants` — centered icon + title + description + action slot, sizes: sm, md, lg |
| **1: Layout** | PageLayout | `ui/page-layout.tsx` | `PageLayout`, `PageHeader`, `PageContent` — consistent full-width page shell, mobile responsive |
| **1: Layout** | Typography | `ui/typography.tsx` | `Heading` (h1-h4 via `as` prop), `Text` (default/muted/error/success), `Code` |
| **1: Layout** | Grid | `ui/grid.tsx` | `Grid` — responsive CSS Grid, cols 1-12, gap variants, mobile-first |
| **1: Layout** | Stack | `ui/stack.tsx` | `Stack` — flex column, gap/align/justify |
| **1: Layout** | Flex | `ui/flex.tsx` | `Flex` — flex row, wraps by default, gap/align/justify |
| **1: Layout** | Container | `ui/container.tsx` | `Container` — max-width wrapper: sm/md/lg/xl/full |
| **1: Layout** | Separator | `ui/separator.tsx` | `Separator` — wraps Radix, horizontal/vertical |
| **2: Radix** | Dialog | `ui/dialog.tsx` | Full compound: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, etc. |
| **2: Radix** | AlertDialog | `ui/alert-dialog.tsx` | Full compound with action/cancel button styling |
| **2: Radix** | Select | `ui/select.tsx` | SelectTrigger, SelectContent, SelectItem, scroll buttons |
| **2: Radix** | DropdownMenu | `ui/dropdown-menu.tsx` | Full compound with sub-menus, checkbox/radio items, shortcuts |
| **2: Radix** | Tooltip | `ui/tooltip.tsx` | TooltipProvider, Tooltip, TooltipTrigger, TooltipContent |
| **2: Radix** | Tabs | `ui/tabs.tsx` | Tabs, TabsList, TabsTrigger, TabsContent |
| **2: Radix** | Switch | `ui/switch.tsx` | Switch with CVA sizes (sm, md) |
| **2: Radix** | Checkbox | `ui/checkbox.tsx` | Checkbox with check indicator, CVA sizes |
| **2: Radix** | Toast | `ui/toast.tsx` | Toast, ToastProvider, ToastViewport — variants: default, destructive, success, info |
| **2: Radix** | ScrollArea | `ui/scroll-area.tsx` | ScrollArea, ScrollBar |
| **2: Radix** | Popover | `ui/popover.tsx` | Popover, PopoverTrigger, PopoverContent |
| **2: Radix** | Progress | `ui/progress.tsx` | Progress bar with CVA sizes |
| **2: Radix** | Slider | `ui/slider.tsx` | Slider with track/range/thumb |
| **2: Radix** | Collapsible | `ui/collapsible.tsx` | Collapsible, CollapsibleTrigger, CollapsibleContent |
| **3: Form** | Form System | `ui/form.tsx` | `Form`, `FormField`, `FormInput`, `FormTextarea`, `FormSelect`, `FormCheckbox`, `FormSwitch` — TanStack Form + Zod v4 integration. `Form` and field components exported from `@ui` barrel. Import `useForm` from `@tanstack/react-form` directly. |

## 6.6 Shared Hooks

Location: `src/renderer/shared/hooks/`

| Hook | Purpose |
|------|---------|
| `useClaudeAuth.ts` | Check Claude CLI installation and authentication status |
| `useHubEvents.ts` | Subscribe to Hub-specific IPC events (`useHubEvent`) |
| `useIpcEvent.ts` | Subscribe to IPC events from main process |
| `useMutationErrorToast.ts` | `onError(action)` factory for React Query mutation error handling → toast notifications |
| `useLooseParams.ts` | Loose route params hook — reads `$projectId` without strict route context |
| `useOAuthStatus.ts` | Check OAuth provider configuration status |

## 6.7 Shared Stores

Location: `src/renderer/shared/stores/`

| Store | Purpose |
|-------|---------|
| `assistant-widget-store.ts` | Floating assistant widget open/close state (`useAssistantWidgetStore`) |
| `command-bar-store.ts` | CommandBar processing state, input history, toast visibility |
| `layout-store.ts` | Sidebar state, active project, project tabs, resizable panel layout (persisted via `react-resizable-panels` `useDefaultLayout`) |
| `theme-store.ts` | Dark/light mode, color theme, UI scale |
| `toast-store.ts` | Toast notification queue (max 3, auto-dismiss 5s) |
| `ThemeHydrator.tsx` | Component that hydrates theme CSS vars on `<html>` (co-located with theme-store) |

---

## 7. File Tree Summary

```
ADC/
├── CLAUDE.md                    # AI agent guidelines
├── ai-docs/                     # Documentation for AI agents
│   ├── ARCHITECTURE.md          # System architecture
│   ├── PATTERNS.md              # Code conventions
│   ├── DATA-FLOW.md             # Data flow diagrams
│   ├── CODEBASE-GUARDIAN.md     # Structural rules
│   ├── LINTING.md               # ESLint rules
│   ├── FEATURES-INDEX.md        # THIS FILE
│   ├── user-interface-flow.md   # UX flow map + gap analysis
│   └── prompts/implementing-features/
├── docs/
│   ├── plans/                   # Design documents
│   └── progress/                # Feature progress tracking
├── hub/                         # Hub server (Fastify + SQLite)
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry (delegates to bootstrap/)
│   │   ├── bootstrap/           # App initialization modules (5 files)
│   │   │   ├── index.ts         # Barrel re-export
│   │   │   ├── lifecycle.ts     # App lifecycle (ready, quit, window)
│   │   │   ├── service-registry.ts  # Service factory instantiation
│   │   │   ├── ipc-wiring.ts    # IPC handler registration
│   │   │   └── event-wiring.ts  # Event forwarding setup
│   │   ├── auth/                # OAuth manager + providers
│   │   ├── ipc/                 # IPC router + handlers
│   │   │   └── handlers/tasks/  # Split task handlers (5 files)
│   │   ├── mcp/                 # MCP client framework
│   │   ├── mcp-servers/         # MCP server definitions
│   │   ├── services/            # Business logic (32 services)
│   │   │   ├── agent/           # 5 files (spawner, parser, queue, tokens)
│   │   │   ├── assistant/       # Intent classifier (16 files), executors (22 files)
│   │   │   ├── briefing/        # 6 files (cache, config, generator, summary, suggestions)
│   │   │   ├── email/           # 7 files (config, encryption, queue, store, smtp)
│   │   │   ├── hub/             # 9 files (api-client, auth, ws, sync, events)
│   │   │   ├── notifications/   # 7 files (slack, github, filter, manager, store)
│   │   │   ├── project/         # 6 files (detector, tasks, slug, spec-parser, store)
│   │   │   ├── qa/              # 7 files (poller, prompt, parser, session, trigger, types)
│   │   │   ├── settings/        # 4 files (defaults, encryption, store)
│   │   │   ├── tasks/           # 4 files (types, task-repository, decomposer, github-importer)
│   │   │   └── ...              # Other service directories
│   │   └── tray/                # System tray + hotkeys
│   ├── preload/                 # Context bridge
│   ├── renderer/                # React app
│   │   ├── app/                 # Router, providers, layouts
│   │   │   └── routes/          # Route groups (8 files)
│   │   ├── features/            # Feature modules (27 features)
│   │   │   ├── changelog/components/  # 7 files (split from monolithic)
│   │   │   ├── planner/components/    # 12 files (split from monolithic)
│   │   │   ├── projects/components/   # 10+ files + wizard-steps/ (6 files)
│   │   │   └── settings/components/   # 28 files (split from monolithic)
│   │   ├── shared/              # Shared hooks, stores, lib, components
│   │   │   ├── components/      # 9 shared UI components
│   │   │   │   └── ui/          # 30 design system primitives (shadcn/ui pattern, barrel: @ui)
│   │   │   ├── hooks/           # 6 shared hooks (+ useLooseParams)
│   │   │   ├── lib/             # Utilities (cn, ipc helper)
│   │   │   └── stores/          # 5 Zustand stores + ThemeHydrator
│   │   └── styles/globals.css   # Theme tokens + Tailwind
│   └── shared/                  # Shared between main + renderer
│       ├── ipc-contract.ts      # Thin re-export from ipc/ barrel
│       ├── ipc/                 # Domain-based IPC contracts (23 folders)
│       │   ├── <domain>/        # contract.ts + schemas.ts + index.ts
│       │   ├── index.ts         # Root barrel (merges all domains)
│       │   └── types.ts         # Type utilities
│       ├── constants/           # Routes, themes
│       └── types/               # Domain types
│           └── hub/             # Hub protocol types (9 modules)
├── .claude/agents/              # Agent prompt definitions
└── .claude/commands/            # Claude CLI slash commands (plan-feature, resume-feature)
```

---

## 8. Quick Command Reference

```bash
npm run dev          # Start dev mode
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Run tests (vitest)
npm run format       # Prettier format
```

---

## 9. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Desktop | Electron | 39 |
| Build | electron-vite | 5 |
| UI | React | 19 |
| Types | TypeScript (strict) | 5.9 |
| Routing | TanStack Router | 1.95 |
| Data | React Query | 5.62 |
| State | Zustand | 5 |
| Styling | Tailwind CSS | 4 |
| Validation | Zod | 4 |
| Terminal | xterm.js | 6 |
| DnD | dnd-kit | 6 |
| UI Primitives | Radix UI | latest |
| PTY | @lydell/node-pty | 1.1 |
| Hub Server | Fastify | 5 |
| Hub DB | better-sqlite3 | 11 |

---

## 10. Plan Lifecycle Tracker

| Component | Path | Description |
|-----------|------|-------------|
| Tracker Registry | `docs/tracker.json` | Single source of truth for all plan/progress lifecycle |
| Validation Script | `scripts/validate-tracker.mjs` | 5-check validator (schema, existence, orphans, staleness, archive candidates) |
| NPM Script | `npm run validate:tracker` | Runs the validation script |

### Status Enum

| Status | Meaning |
|--------|---------|
| `DRAFT` | Initial write-up, not yet approved |
| `APPROVED` | Design approved, ready for implementation |
| `IN_PROGRESS` | Currently being implemented |
| `BLOCKED` | Implementation blocked by external dependency |
| `IMPLEMENTED` | Code merged and working |
| `SUPERSEDED` | Replaced by a newer plan (see `supersededBy` field) |
| `ABANDONED` | Decided not to implement |
| `ARCHIVED` | Completed and moved to `doc-history/` |
| `TRACKING` | Living document (roadmap, etc.) — no implementation phase |

### File Organization

- **Active plans**: `docs/plans/` — plans currently in backlog or in progress
- **Active progress**: `docs/progress/` — crash-recovery files for active features
- **Archived plans**: `doc-history/plans/` — completed/superseded plans
- **Archived progress**: `doc-history/progress/` — progress files for completed features

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System diagram and data flow
- **[PATTERNS.md](./PATTERNS.md)** — Code conventions and examples
- **[DATA-FLOW.md](./DATA-FLOW.md)** — Detailed data flow diagrams
- **[CODEBASE-GUARDIAN.md](./CODEBASE-GUARDIAN.md)** — Structural integrity rules
- **[LINTING.md](./LINTING.md)** — ESLint rules and fix patterns
- **[CLAUDE.md](../CLAUDE.md)** — Main AI agent guidelines
