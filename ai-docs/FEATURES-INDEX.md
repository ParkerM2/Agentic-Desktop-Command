# Features Index

> Quick reference for all features, services, and file locations in Claude-UI.
> Use this as a starting point to understand what exists and where.

---

## Quick Stats

| Category | Count |
|----------|-------|
| Renderer Features | 28 |
| Main Process Services | 30 |
| IPC Handler Files | 35 |
| IPC Contract Lines | ~2500 |

---

## 1. Renderer Features

Location: `src/renderer/features/`

| Feature | Purpose | Key Components | IPC Channels |
|---------|---------|----------------|--------------|
| **agents** | Agent process management | AgentDashboard, AgentControls, AgentLogs | `agents.*` |
| **alerts** | Reminder/alert system | AlertsPage, AlertForm, AlertList | `alerts.*` |
| **assistant** | Built-in Claude assistant | CommandBar (TopBar) | `assistant.*` |
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
| **tasks** | Task management (AG-Grid dashboard) | TaskDataGrid, TaskFiltersToolbar, TaskDetailRow, TaskStatusBadge, CreateTaskDialog | `hub.tasks.*`, `tasks.*` |
| **terminals** | Terminal emulator | TerminalGrid, TerminalInstance | `terminals.*` |
| **briefing** | Daily briefing & suggestions | BriefingPage, SuggestionCard | `briefing.*` |
| **merge** | Branch merge workflow | ConflictResolver, MergeConfirmModal, MergePreviewPanel | `merge.*` |
| **my-work** | Cross-project task view | MyWorkPage | `tasks.*` |
| **onboarding** | First-run setup wizard | OnboardingWizard, ClaudeCliStep, ApiKeyStep | `app.*`, `settings.*` |
| **screen** | Screen capture | ScreenshotButton, ScreenshotViewer | `screen.*` |
| **voice** | Voice interface (STT/TTS) | VoiceButton, VoiceSettings | `voice.*` |
| **workflow** | Task execution & progress watching | (hooks only — no UI components) | `workflow.*` |
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
| **agent** | Claude CLI process management | spawnAgent, stopAgent, pauseAgent, resumeAgent | `event:agent.*` |
| **alerts** | Reminder/alert CRUD + scheduling | list, create, update, delete, startChecking | `event:alert.changed` |
| **assistant** | Built-in assistant (intent → action) | sendCommand, getHistory | `event:assistant.*` |
| **app-update** | Electron auto-updater | checkForUpdates, downloadUpdate, quitAndInstall, getStatus | `event:app.updateAvailable`, `event:app.updateDownloaded` |
| **calendar** | Google Calendar integration | listEvents, createEvent | - |
| **changelog** | Project changelog CRUD | list, addEntry | - |
| **fitness** | Health metrics (manual) | getMetrics, logWorkout | - |
| **git** | Git operations | getStatus, commit, listBranches, listWorktrees | `event:git.*` |
| **github** | GitHub API integration | listPRs, listIssues, getRepo | - |
| **hub** | Hub server connection | connect, disconnect, sync, listTasks, createTask, executeTask | `event:hub.*` |
| **hub/api-client** | Hub REST API client | listTasks, getTask, createTask, updateTask, deleteTask, executeTask, cancelTask | - |
| **hub/auth-service** | Hub authentication | register, login, logout, refreshToken, getCurrentUser | - |
| **hub/token-store** | Secure token storage | getTokens, setTokens, clearTokens, getAccessToken | - |
| **hub/websocket** | Hub WebSocket client | connect, disconnect, send, onMessage | `event:hub.tasks.*`, `event:hub.devices.*` |
| **ideas** | Idea CRUD | list, create, update, delete | - |
| **insights** | Analytics aggregation | getMetrics, getTimeSeries | - |
| **merge** | Branch merge operations | previewDiff, checkConflicts, mergeBranch | - |
| **milestones** | Milestone CRUD | list, create, update, delete | - |
| **nlp** | Natural language parsing | parseTimeExpression, extractEntities | - |
| **notes** | Note CRUD | list, create, update, delete | - |
| **planner** | Daily time blocks | listBlocks, createBlock, updateBlock | `event:planner.*` |
| **project** | Project management | list, add, remove, selectDirectory | `event:project.*` |
| **settings** | App settings persistence | get, update | `event:settings.changed` |
| **spotify** | Spotify integration | getCurrentTrack, play, pause, skip | - |
| **terminal** | PTY terminal management | create, sendInput, resize, kill | `event:terminal.*` |
| **briefing** | Daily briefing & suggestions | generateBriefing, getSuggestions | - |
| **claude** | Persistent Claude sessions (Anthropic SDK) | sendMessage, getConversation, listConversations | `event:claude.*` |
| **email** | Email sending (SMTP) | sendEmail, getConfig, testConnection | - |
| **notifications** | Background Slack/GitHub watchers | startWatching, stopWatching, getNotifications | `event:notification.*` |
| **screen** | Screen capture (desktopCapturer) | captureScreen, getSources | - |
| **tasks** | Smart task creation | decompose, importFromGithub | - |
| **time-parser** | Natural language time parsing | parseTimeExpression | - |
| **voice** | Voice interface (Web Speech API) | startListening, stopListening, speak | `event:voice.*` |
| **workflow** | Workflow execution & progress | launchWorkflow, watchProgress | `event:workflow.*` |
| **device** | Device registration & heartbeat via Hub API | registerDevice, updateDevice, sendHeartbeat | `event:hub.devices.*` |
| **device/heartbeat** | Periodic heartbeat pings to Hub | start, stop | - |

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
| `task-handlers.ts` | tasks.* |
| `terminal-handlers.ts` | terminals.* |
| `hotkey-handlers.ts` | hotkeys.get, hotkeys.update, hotkeys.reset |
| `webhook-settings-handlers.ts` | webhooks.* |
| `briefing-handlers.ts` | briefing.* |
| `claude-handlers.ts` | claude.* |
| `email-handlers.ts` | email.* |
| `mcp-handlers.ts` | mcp.* |
| `notification-handlers.ts` | notifications.* |
| `screen-handlers.ts` | screen.* |
| `time-handlers.ts` | time.* |
| `voice-handlers.ts` | voice.* |
| `workflow-handlers.ts` | workflow.* |
| `workspace-handlers.ts` | workspace.* |
| `auth-handlers.ts` | auth.* |
| `device-handlers.ts` | devices.* |

---

## 4. Shared Code

### Types (`src/shared/types/`)

| File | Types Defined |
|------|---------------|
| `agent.ts` | AgentSession, AgentStatus, AgentLog |
| `alert.ts` | Alert, AlertType, AlertPriority |
| `assistant.ts` | AssistantCommand, AssistantResponse, Intent |
| `fitness.ts` | FitnessMetrics, Workout, HealthData |
| `ideas.ts` | Idea, IdeaCategory |
| `insights.ts` | InsightsMetrics, TimeSeriesData |
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
| `screen.ts` | ScreenCapture, ScreenSource |
| `voice.ts` | VoiceConfig, SpeechResult, VoiceState |
| `workspace.ts` | Workspace, WorkspaceConfig |
| `hub-connection.ts` | HubConnection types |
| `hub-events.ts` | Hub event payload types |
| `hub-protocol.ts` | Hub protocol contract types |
| `auth.ts` | AuthUser, LoginCredentials, RegisterData, AuthTokens |

### Constants (`src/shared/constants/`)

| File | Constants |
|------|-----------|
| `routes.ts` | ROUTES, ROUTE_PATTERNS, projectViewPath() |
| `themes.ts` | COLOR_THEMES, COLOR_THEME_LABELS |
| `agent-patterns.ts` | Agent output parsing patterns |
| `index.ts` | Barrel exports for all constants |

### IPC Contract (`src/shared/ipc-contract.ts`)

Single source of truth for all IPC channels. Contains:
- `ipcInvokeContract` — Request/response channels with Zod schemas
- `ipcEventContract` — Event channels with Zod schemas
- Type utilities: `InvokeInput<T>`, `InvokeOutput<T>`, `EventPayload<T>`

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
| `RootLayout.tsx` | Root shell: sidebar + content area |
| `Sidebar.tsx` | Navigation sidebar |
| `TopBar.tsx` | Top bar with assistant command input |
| `CommandBar.tsx` | Global command palette (Cmd+K) |
| `UserMenu.tsx` | Avatar + logout dropdown in sidebar footer |

---

## 6.5 Shared UI Components

Location: `src/renderer/shared/components/`

| Component | Purpose |
|-----------|---------|
| `ConfirmDialog.tsx` | Reusable confirmation dialog for destructive actions (delete task, delete project). Props: `open`, `onOpenChange`, `title`, `description`, `variant` ('destructive' | 'default'), `onConfirm`, `loading` |
| `MutationErrorToast.tsx` | Error toast renderer, mounted in RootLayout. Reads from `useToastStore`, renders fixed bottom-right |

## 6.6 Shared Hooks

Location: `src/renderer/shared/hooks/`

| Hook | Purpose |
|------|---------|
| `useIpcEvent.ts` | Subscribe to IPC events from main process |
| `useMutationErrorToast.ts` | `onError(action)` factory for React Query mutation error handling → toast notifications |

## 6.7 Shared Stores

Location: `src/renderer/shared/stores/`

| Store | Purpose |
|-------|---------|
| `layout-store.ts` | Sidebar state, active project, project tabs |
| `theme-store.ts` | Dark/light mode, color theme, UI scale |
| `toast-store.ts` | Toast notification queue (max 3, auto-dismiss 5s) |

---

## 7. File Tree Summary

```
Claude-UI/
├── CLAUDE.md                    # AI agent guidelines
├── ai-docs/                     # Documentation for AI agents
│   ├── ARCHITECTURE.md          # System architecture
│   ├── PATTERNS.md              # Code conventions
│   ├── DATA-FLOW.md             # Data flow diagrams
│   ├── CODEBASE-GUARDIAN.md     # Structural rules
│   ├── LINTING.md               # ESLint rules
│   ├── FEATURES-INDEX.md        # THIS FILE
│   └── prompts/implementing-features/
├── docs/
│   ├── plans/                   # Design documents
│   └── progress/                # Feature progress tracking
├── hub/                         # Hub server (Fastify + SQLite)
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App lifecycle, window creation
│   │   ├── auth/                # OAuth manager + providers
│   │   ├── ipc/                 # IPC router + handlers
│   │   ├── mcp/                 # MCP client framework
│   │   ├── mcp-servers/         # MCP server definitions
│   │   ├── services/            # Business logic (30 services)
│   │   └── tray/                # System tray + hotkeys
│   ├── preload/                 # Context bridge
│   ├── renderer/                # React app
│   │   ├── app/                 # Router, providers, layouts
│   │   ├── features/            # Feature modules (28 features)
│   │   ├── shared/              # Shared hooks, stores, components
│   │   └── styles/globals.css   # Theme tokens + Tailwind
│   └── shared/                  # Shared between main + renderer
│       ├── ipc-contract.ts      # IPC channel definitions
│       ├── constants/           # Routes, themes
│       └── types/               # Domain types
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
