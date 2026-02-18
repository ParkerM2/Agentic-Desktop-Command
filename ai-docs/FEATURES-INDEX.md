# Features Index

> Quick reference for all features, services, and file locations in ADC.
> Use this as a starting point to understand what exists and where.

---

## Quick Stats

| Category | Count |
|----------|-------|
| Renderer Features | 27 |
| Main Process Services | 32 |
| IPC Handler Files | 40 |
| IPC Domain Folders | 23 |
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
| **auth** | User authentication | LoginPage, RegisterPage, AuthGuard, UserMenu (in layouts) | `auth.*` |
| **changelog** | Project changelog viewer | ChangelogPage, ChangelogEntry | `changelog.*` |
| **communications** | Slack/Discord integration | SlackPanel, DiscordPanel | MCP tools |
| **dashboard** | Home dashboard | DashboardPage, TodayView, DailyStats, ActiveAgents | multiple |
| **fitness** | Health/fitness tracking | FitnessPage, WorkoutLog, MetricsChart | `fitness.*` |
| **github** | GitHub integration | GitHubPage, PRList, IssueList | `github.*` |
| **ideation** | Idea capture & tracking | IdeationPage, IdeaForm | `ideas.*` |
| **insights** | Analytics dashboard | InsightsPage, MetricsCards, Charts | `insights.*` |
| **notes** | Note-taking | NotesPage, NoteEditor, NoteList | `notes.*` |
| **planner** | Daily planner | PlannerPage, TimeBlockGrid, TimeBlockCard | `planner.*` |
| **productivity** | Productivity widgets | CalendarWidget, SpotifyWidget | `calendar.*`, `spotify.*` |
| **projects** | Project management | ProjectListPage, ProjectSettings, WorktreeManager, ProjectEditDialog | `projects.*` |
| **roadmap** | Project roadmap | RoadmapPage, MilestoneCard | `milestones.*` |
| **settings** | App settings | SettingsPage, HubSettings, OAuthProviderSettings, WebhookSettings | `settings.*` |
| **tasks** | Task management (AG-Grid dashboard) | TaskDataGrid, TaskFiltersToolbar, TaskDetailRow, TaskStatusBadge, CreateTaskDialog; **Hooks**: useTaskEvents (→ useAgentEvents + useQaEvents), useAgentMutations, useQaMutations, QaReportViewer | `hub.tasks.*`, `tasks.*`, `agent.*`, `qa.*`, `event:agent.orchestrator.*`, `event:qa.*` |
| **terminals** | Terminal emulator | TerminalGrid, TerminalInstance | `terminals.*` |
| **briefing** | Daily briefing & suggestions | BriefingPage, SuggestionCard | `briefing.*` |
| **merge** | Branch merge workflow | MergeConfirmModal | `merge.*` |
| **my-work** | Cross-project task view | MyWorkPage | `tasks.*` |
| **onboarding** | First-run setup wizard | OnboardingWizard, ClaudeCliStep, ApiKeyStep | `app.*`, `settings.*` |
| **voice** | Voice interface (STT/TTS) | VoiceButton, VoiceSettings | `voice.*` |
| **devices** | Device registration & heartbeat | DeviceCard, DeviceSelector | `devices.*` |
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
| **git** | Git operations | getStatus, commit, listBranches, listWorktrees | `event:git.*` |
| **github** | GitHub API integration | listPRs, listIssues, getRepo | - |
| **hub** | Hub server connection. Sub-modules: `hub-api-client.ts`, `hub-auth-service.ts`, `hub-client.ts`, `hub-config-store.ts`, `hub-connection.ts`, `hub-event-mapper.ts`, `hub-sync.ts`, `hub-ws-client.ts`, `webhook-relay.ts` | connect, disconnect, sync | `event:hub.*` |
| **ideas** | Idea CRUD | list, create, update, delete | - |
| **insights** | Analytics aggregation | getMetrics, getTimeSeries | - |
| **merge** | Branch merge operations | previewDiff, checkConflicts, mergeBranch | - |
| **milestones** | Milestone CRUD | list, create, update, delete | - |
| **notes** | Note CRUD | list, create, update, delete | - |
| **planner** | Daily time blocks | listBlocks, createBlock, updateBlock | `event:planner.*` |
| **project** | Project management. Sub-modules: `project-detector.ts`, `task-service.ts`, `task-slug.ts`, `task-spec-parser.ts`, `task-store.ts` | list, add, remove, selectDirectory | `event:project.*` |
| **settings** | App settings persistence. Sub-modules: `settings-defaults.ts`, `settings-encryption.ts`, `settings-store.ts` | get, update | `event:settings.changed` |
| **spotify** | Spotify integration | getCurrentTrack, play, pause, skip | - |
| **terminal** | PTY terminal management | create, sendInput, resize, kill | `event:terminal.*` |
| **briefing** | Daily briefing & suggestions. Sub-modules: `briefing-cache.ts`, `briefing-config.ts`, `briefing-generator.ts`, `briefing-summary.ts`, `suggestion-engine.ts` | generateBriefing, getSuggestions | - |
| **claude** | Persistent Claude sessions (Anthropic SDK) | sendMessage, getConversation, listConversations | `event:claude.*` |
| **email** | Email sending (SMTP). Sub-modules: `email-config.ts`, `email-encryption.ts`, `email-queue.ts`, `email-store.ts`, `smtp-transport.ts` (barrel: `index.ts`) | sendEmail, getConfig, testConnection | - |
| **notifications** | Background Slack/GitHub watchers. Sub-modules: `slack-watcher.ts`, `github-watcher.ts`, `notification-filter.ts`, `notification-manager.ts`, `notification-store.ts` (barrel: `index.ts`) | startWatching, stopWatching, getNotifications | `event:notification.*` |
| **tasks** | Smart task creation. Sub-modules: `task-decomposer.ts`, `github-importer.ts` (barrel: `index.ts`) | decompose, importFromGithub | - |
| **time-parser** | Natural language time parsing | parseTimeExpression | - |
| **voice** | Voice interface (Web Speech API) | startListening, stopListening, speak | `event:voice.*` |
| **device** | Device registration & heartbeat via Hub API | registerDevice, updateDevice, sendHeartbeat | `event:hub.devices.*` |
| **agent-orchestrator** | Headless Claude agent lifecycle management | spawnSession, stopSession, listSessions, onSessionEvent | `event:agent.orchestrator.*` |
| **agent-orchestrator/jsonl-progress-watcher** | JSONL progress file watcher (debounced tail parsing) | start, stop, onProgress | `event:agent.orchestrator.progress`, `event:agent.orchestrator.planReady` |
| **agent-orchestrator/agent-watchdog** | Health monitoring for active agent sessions (PID checks, heartbeat age, auto-restart on overflow) | start, stop, checkNow, onAlert, dispose | `event:agent.orchestrator.watchdogAlert` (wired in index.ts) |
| **qa** | Two-tier automated QA system (quiet + full) | startQuiet, startFull, getSession, getReportForTask, cancel, onSessionEvent | `event:qa.started`, `event:qa.progress`, `event:qa.completed` |
| **assistant/watch-store** | Persistent watch subscription storage (JSON file) | add, remove, getActive, getAll, markTriggered, clear | - |
| **assistant/watch-evaluator** | Evaluates IPC events against active watches | start, stop, onTrigger | `event:assistant.proactive` (via index.ts wiring) |
| **assistant/cross-device-query** | Query other ADC instances via Hub API | query | - |

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
| `orchestrator-handlers.ts` | orchestrator.* (spawn, stop, list sessions, get progress) |
| `qa-handlers.ts` | qa.* (run quiet, run full, get reports) |

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

### Route Groups (`src/renderer/app/routes/`)

The router has been split from a single `router.tsx` into **8 route group files**:

| File | Routes Covered |
|------|----------------|
| `auth.routes.tsx` | `/login`, `/register` |
| `communication.routes.ts` | `/communications` |
| `dashboard.routes.ts` | `/dashboard`, `/my-work` |
| `misc.routes.ts` | `/alerts`, `/briefing`, `/fitness`, `/notes`, `/planner`, `/planner/weekly` |
| `productivity.routes.ts` | `/productivity` |
| `project.routes.ts` | `/projects`, `/projects/$projectId/**` (tasks, terminals, agents, etc.) |
| `settings.routes.ts` | `/settings` |
| `index.ts` | Barrel that assembles all route groups into the router |

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

The IPC contract has been split from a single monolithic file into **23 domain folders** under `src/shared/ipc/`. The root barrel at `src/shared/ipc/index.ts` merges all domain contracts back into the unified `ipcInvokeContract` and `ipcEventContract` objects. The original `src/shared/ipc-contract.ts` is now a thin backward-compatible re-export.

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
| `git` | Git status, branches, worktrees |
| `github` | GitHub PRs, issues, notifications |
| `hub` | Hub connection, sync, config |
| `misc` | Alerts, calendar, changelog, devices, hotkeys, ideas, insights, merge, milestones, notes, screen, time, voice, webhooks, workspaces (18 contract files) |
| `notifications` | Notification watchers (Slack, GitHub) |
| `planner` | Time blocks, daily plans, weekly review |
| `projects` | Project CRUD, sub-projects, repo detection |
| `qa` | QA runner, reports, sessions |
| `settings` | App settings, profiles, webhook config |
| `spotify` | Spotify playback |
| `tasks` | Local tasks + Hub tasks (invoke + events) |
| `terminals` | Terminal session management |
| `health` | Error collection, health registry invoke/event contracts |
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
| `RootLayout.tsx` | Root shell: sidebar + content area + notifications + AssistantWidget |
| `Sidebar.tsx` | Navigation sidebar |
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
| `layout-store.ts` | Sidebar state, active project, project tabs |
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
│   │   │   ├── tasks/           # 3 files (decomposer, github-importer)
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
└── .claude/agents/              # Agent prompt definitions
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

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System diagram and data flow
- **[PATTERNS.md](./PATTERNS.md)** — Code conventions and examples
- **[DATA-FLOW.md](./DATA-FLOW.md)** — Detailed data flow diagrams
- **[CODEBASE-GUARDIAN.md](./CODEBASE-GUARDIAN.md)** — Structural integrity rules
- **[LINTING.md](./LINTING.md)** — ESLint rules and fix patterns
- **[CLAUDE.md](../CLAUDE.md)** — Main AI agent guidelines
