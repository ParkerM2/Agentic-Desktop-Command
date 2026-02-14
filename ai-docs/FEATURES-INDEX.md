# Features Index

> Quick reference for all features, services, and file locations in Claude-UI.
> Use this as a starting point to understand what exists and where.

---

## Quick Stats

| Category | Count |
|----------|-------|
| Renderer Features | 21 |
| Main Process Services | 24 |
| IPC Handler Files | 24 |
| IPC Contract Lines | ~1500 |

---

## 1. Renderer Features

Location: `src/renderer/features/`

| Feature | Purpose | Key Components | IPC Channels |
|---------|---------|----------------|--------------|
| **agents** | Agent process management | AgentDashboard, AgentControls, AgentLogs | `agents.*` |
| **alerts** | Reminder/alert system | AlertsPage, AlertForm, AlertList | `alerts.*` |
| **assistant** | Built-in Claude assistant | CommandBar (TopBar) | `assistant.*` |
| **changelog** | Project changelog viewer | ChangelogPage, ChangelogEntry | `changelog.*` |
| **communications** | Slack/Discord integration | SlackPanel, DiscordPanel | MCP tools |
| **dashboard** | Home dashboard | DashboardPage, TodayView, DailyStats, ActiveAgents | multiple |
| **fitness** | Health/fitness tracking | FitnessPage, WorkoutLog, MetricsChart | `fitness.*` |
| **github** | GitHub integration | GitHubPage, PRList, IssueList | `github.*` |
| **ideation** | Idea capture & tracking | IdeationPage, IdeaForm | `ideas.*` |
| **insights** | Analytics dashboard | InsightsPage, MetricsCards, Charts | `insights.*` |
| **kanban** | Task kanban board | KanbanBoard, KanbanColumn, TaskCard | `tasks.*` |
| **notes** | Note-taking | NotesPage, NoteEditor, NoteList | `notes.*` |
| **planner** | Daily planner | PlannerPage, TimeBlockGrid, TimeBlockCard | `planner.*` |
| **productivity** | Productivity widgets | CalendarWidget, SpotifyWidget | `calendar.*`, `spotify.*` |
| **projects** | Project management | ProjectListPage, ProjectSettings, WorktreeManager | `projects.*` |
| **roadmap** | Project roadmap | RoadmapPage, MilestoneCard | `milestones.*` |
| **settings** | App settings | SettingsPage, HubSettings, OAuthProviderSettings, WebhookSettings | `settings.*` |
| **tasks** | Task management | TaskCard, TaskStatusBadge, TaskForm | `tasks.*` |
| **terminals** | Terminal emulator | TerminalGrid, TerminalInstance | `terminals.*` |

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
| **hub** | Hub server connection | connect, disconnect, sync | `event:hub.*` |
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

### Constants (`src/shared/constants/`)

| File | Constants |
|------|-----------|
| `routes.ts` | ROUTES, ROUTE_PATTERNS, projectViewPath() |
| `themes.ts` | COLOR_THEMES, COLOR_THEME_LABELS |

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
│   │   ├── services/            # Business logic (23 services)
│   │   └── tray/                # System tray + hotkeys
│   ├── preload/                 # Context bridge
│   ├── renderer/                # React app
│   │   ├── app/                 # Router, providers, layouts
│   │   ├── features/            # Feature modules (21 features)
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
