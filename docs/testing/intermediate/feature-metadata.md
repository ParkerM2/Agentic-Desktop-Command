# Feature Metadata Survey

> Task #2 output — survey of all documented renderer features with routes, key components, IPC channels, and nav reachability.
>
> **Sources read:**
> - `docs/routing/FEATURES-INDEX.md` (canonical feature table + IPC channels + key components)
> - `docs/routing/AI-AGENT-ROUTING-INDEX.md` (route group assignments per domain)
> - `tests/e2e/helpers/navigation.ts` (nav constants)
>
> **Date:** 2026-04-06

---

## Navigation Constants (verbatim from `tests/e2e/helpers/navigation.ts`)

### `TOP_LEVEL_NAV_ITEMS`

```typescript
export const TOP_LEVEL_NAV_ITEMS = [
  'Dashboard',
  'My Work',
  'Fitness',
  'Productivity',
] as const;
```

### `PROJECT_NAV_ITEMS`

```typescript
export const PROJECT_NAV_ITEMS = [
  'Tasks',
  'Terminals',
  'Agents',
  'Pipeline',
  'Roadmap',
  'Ideation',
  'GitHub',
  'Changelog',
  'Insights',
] as const;
```

### `ROUTE_URL_MAP`

```typescript
export const ROUTE_URL_MAP: Record<string, string> = {
  Dashboard: '/dashboard',
  'My Work': '/my-work',
  Fitness: '/fitness',
  Productivity: '/productivity',
};
```

**Notes from navigation.ts comments:**
- `Settings` is NOT inside `<nav>` — it's in the sidebar footer area (located via `aside button` with text "Settings").
- `Briefing`, `Notes`, `Planner`, `Alerts`, `Comms` were moved to Productivity tabs in the ui-layout-refactor and are no longer sidebar items.
- Project nav items are below the divider in the sidebar and require an active project. If no project is active, these buttons are disabled.
- `Pipeline` maps to the `workflow-pipeline` feature (not present in `ROUTE_URL_MAP` — reachable only when a project is active).

---

## Discrepancy Notice

`docs/routing/FEATURES-INDEX.md` Quick Stats header states **36 Renderer Features**, but the feature table in Section 1 contains **31 documented rows**. Additionally, the `src/renderer/features/` directory contains **37 total subdirectories** (31 documented + 6 undocumented: `diff-viewer`, `file-explorer`, `health`, `tools`, `workflow`, `workspace`).

Per task rules, IPC channels and routes are **not invented** — only data from source documents is used. The 31 documented features are listed below in the main table. The 6 undocumented directories are listed in Appendix A.

---

## Feature Table (31 Documented — from FEATURES-INDEX.md Section 1)

Columns:
- **Feature** — feature module name
- **Route** — URL path(s) from AI-AGENT-ROUTING-INDEX.md vertical slices; "—" if not in routing index
- **In Nav Helper** — which constant includes this feature, or "Not in nav" with reason
- **Key Components** — from FEATURES-INDEX.md
- **IPC Domain / Channels** — from FEATURES-INDEX.md

| # | Feature | Route | In Nav Helper | Key Components | IPC Domain / Channels |
|---|---------|-------|---------------|----------------|----------------------|
| 1 | **agent-dashboard** | — (not listed in AI-AGENT-ROUTING-INDEX) | Not in nav — no sidebar entry; accessed programmatically from task context | AgentDashboardPage, AgentChatPanel, AgentPanelCompact, AgentPanelExpanded, AgentPanelPopup, ToolCallCard, TextMessage, UserMessage, AgentStatusBar, AgentLayoutSingle, AgentLayoutGrid, AgentLayoutToolbar | `agent-dashboard.getTasksForFeature`, `agent-dashboard.getTask`, `agent-dashboard.getQaSession`, `agent-dashboard.listQaSessions`, `agent-dashboard.getFilesChanged`, `event:agent-dashboard.taskUpdated`, `event:agent-dashboard.qaSessionUpdated`, `files.listTree` |
| 2 | **agents** | `/projects/$projectId/agents`, `/agents` (top-level) | `PROJECT_NAV_ITEMS` → "Agents" | AgentDashboard, AgentControls, AgentLogs | `agents.*` |
| 3 | **alerts** | `/alerts` (productivity.routes.ts) | Not in nav — moved to Productivity tabs (ui-layout-refactor); accessed via Productivity > Alerts tab | AlertsPage, AlertForm, AlertList | `alerts.*` |
| 4 | **assistant** | — (widget, no dedicated route) | Not in nav — floating widget mounted globally, not a sidebar destination | AssistantWidget, SidebarAssistantButton, AssistantInputBar (ProjectSelector + QuickActionChips), WidgetPanel, WidgetMessageArea; Backend: tool-definitions.ts, tool-executor.ts, tool-handlers/ | `assistant.start`, `assistant.sendCommand`, `assistant.getHistory`, `assistant.clearHistory`, `event:assistant.response`, `event:assistant.thinking`, `event:assistant.toolExecuted` |
| 5 | **auth** | `/login`, `/register` (auth.routes.tsx) | Not in nav — pre-auth routes; reached before sidebar is rendered | LoginPage (TanStack Form + Zod), RegisterPage (TanStack Form + Zod), AuthGuard, UserMenu (in layouts); Hooks: useForceLogout | `auth.*` |
| 6 | **briefing** | `/briefing` (misc.routes.ts) | Not in nav — moved to Productivity tabs; accessed via Productivity > Briefing tab | BriefingPage, SuggestionCard | `briefing.*` |
| 7 | **changelog** | `/projects/$projectId/changelog` (project.routes.ts) | `PROJECT_NAV_ITEMS` → "Changelog" | ChangelogPage, ChangelogEntry | `changelog.*` |
| 8 | **communications** | `/communications` (communication.routes.ts) | Not in nav — no sidebar entry for communications directly | SlackPanel, DiscordPanel | MCP tools |
| 9 | **dashboard** | `/dashboard` (dashboard.routes.ts) | `TOP_LEVEL_NAV_ITEMS` → "Dashboard" | DashboardPage, TodayView, DailyStats, ActiveAgents | multiple (aggregates multiple domains) |
| 10 | **devices** | — (no route in routing index) | Not in nav — no dedicated page route; UI embedded elsewhere (e.g., Settings) | DeviceCard, DeviceSelector | `devices.*` |
| 11 | **fitness** | `/fitness` (misc.routes.ts) | `TOP_LEVEL_NAV_ITEMS` → "Fitness" | FitnessPage, WorkoutLog, MetricsChart | `fitness.*` |
| 12 | **github** | `/projects/$projectId/github` (project.routes.ts) | `PROJECT_NAV_ITEMS` → "GitHub" | GitHubPage, GitHubConnectionStatus, PRList, IssueList, NotificationList, PrDetailModal, IssueCreateForm; Hooks: useGitHubAuthStatus, useGitHubRepos, useGitHubPrs, useGitHubIssues, useGitHubNotifications, useCreateIssue, useGitHubEvents | `github.*` |
| 13 | **hub-setup** | — (not listed in AI-AGENT-ROUTING-INDEX) | Not in nav — pre-auth Hub configuration wizard; shown before login | HubSetupPage, validateHubUrl | `hub.getConfig`, `hub.connect` |
| 14 | **ideation** | `/projects/$projectId/ideation` (project.routes.ts) | `PROJECT_NAV_ITEMS` → "Ideation" | IdeationPage, IdeaEditForm | `ideas.*` |
| 15 | **insights** | `/projects/$projectId/insights` (project.routes.ts) | `PROJECT_NAV_ITEMS` → "Insights" | InsightsPage, MetricsCards, Charts | `insights.*` |
| 16 | **merge** | — (no route in routing index) | Not in nav — modal-based workflow; triggered from task/git context, not a sidebar destination | MergeConfirmModal, MergePreviewPanel, ConflictResolver, FileDiffViewer (`@git-diff-view/react`) | `merge.*` |
| 17 | **my-work** | `/my-work` (dashboard.routes.ts) | `TOP_LEVEL_NAV_ITEMS` → "My Work" | MyWorkPage | `tasks.*` |
| 18 | **notes** | `/notes` (productivity.routes.ts) | Not in nav — moved to Productivity tabs; accessed via Productivity > Notes tab | NotesPage, NoteEditor, NoteList | `notes.*` |
| 19 | **onboarding** | — (wizard modal, no dedicated route) | Not in nav — first-run wizard modal; shown automatically on first launch | OnboardingWizard, ClaudeCliStep, ApiKeyStep | `app.*`, `settings.*` |
| 20 | **planner** | `/planner`, `/planner/weekly` (productivity.routes.ts) | Not in nav — moved to Productivity tabs; accessed via Productivity > Planner tab | PlannerPage, TimeBlockGrid, TimeBlockCard | `planner.*` |
| 21 | **productivity** | `/productivity` (productivity.routes.ts) | `TOP_LEVEL_NAV_ITEMS` → "Productivity" | ProductivityPage (tabbed, 8 tabs: Overview, Calendar, Spotify, Briefing, Notes, Planner, Alerts, Comms), CalendarWidget, SpotifyWidget; embeds BriefingPage, NotesPage, PlannerPage, AlertsPage, CommunicationsPage as tab content | `calendar.*`, `spotify.*`, `briefing.*`, `notes.*`, `planner.*`, `alerts.*` |
| 22 | **projects** | `/projects`, `/projects/$projectId` (project.routes.ts) | Not in nav — reachable via "+" button in TopBar (navigateToProjectsList helper uses `button[title="Open project"]`), not a standard sidebar item | ProjectListPage, ProjectSettings, WorktreeManager, ProjectEditDialog, GitStatusIndicator | `projects.*`, `git.status` |
| 23 | **roadmap** | `/projects/$projectId/roadmap` (project.routes.ts) | `PROJECT_NAV_ITEMS` → "Roadmap" | RoadmapPage, MilestoneCard | `milestones.*` |
| 24 | **screen** | — (no dedicated route; ScreenshotButton mounted in TopBar) | Not in nav — toolbar widget, not a page destination | ScreenshotButton (mounted in TopBar), ScreenshotViewer | `screen.*` |
| 25 | **settings** | `/settings`, `/settings/themes` (settings.routes.ts) | Not in nav — sidebar footer button (navigateToSettings helper uses `aside button` with text "Settings", NOT inside `<nav>`) | SettingsPage (tabbed, 6 tabs: Display, Profile, Hub, Integrations, Storage, Advanced), LayoutSection, ProfileFormModal, HubSettings, OAuthProviderSettings, OAuthConnectionStatus, WebhookSettings, StorageManagementSection, StorageUsageBar, RetentionControl, ColorThemeSection; Theme Editor: ThemeEditorPage, ColorControl, ColorSection, ThemePreview, SavedThemesBar, CssImportDialog, css-parser.ts, css-exporter.ts, token-sections.ts | `settings.*`, `oauth.*`, `dataManagement.*` |
| 26 | **tasks** | `/projects/$projectId/tasks` (project.routes.ts) | `PROJECT_NAV_ITEMS` → "Tasks" | TaskDataGrid (TanStack Table + `@ui` Table primitives in `<Card>`), TaskFiltersToolbar, TaskDetailRow, TaskStatusBadge, CreateTaskDialog, PlanFeedbackDialog, TaskResultView, CreatePrDialog; Hooks: useTaskEvents, useAgentMutations, useQaMutations, QaReportViewer | `hub.tasks.*`, `tasks.*`, `agent.*`, `qa.*`, `git.createPr`, `event:agent.orchestrator.*`, `event:qa.*` |
| 27 | **terminals** | `/projects/$projectId/terminals` (project.routes.ts) | `PROJECT_NAV_ITEMS` → "Terminals" | TerminalGrid, TerminalInstance | `terminals.*` |
| 28 | **visualization** | — (not listed in AI-AGENT-ROUTING-INDEX) | Not in nav — no sidebar entry; reachable by direct URL or programmatic navigation | VisualizationPage, VisualizationCanvas (React Flow + dagre layout), LayerToggleToolbar, FileGroupNode, FileNode, AgentTaskNode, FeatureGroupNode, GuardianNode, DataFlowEdge, AgentScopeEdge, NodeDetailPanel | `visualization.getCodebaseGraph`, `visualization.getAgentTeams`, `visualization.getSessionLog` |
| 29 | **voice** | — (no route in routing index) | Not in nav — VoiceButton mounted in TopBar; VoiceSettings embedded in SettingsPage | VoiceButton, VoiceSettings (mounted in SettingsPage) | `voice.*` |
| 30 | **workflow-pipeline** | — (not listed in AI-AGENT-ROUTING-INDEX; `PROJECT_NAV_ITEMS` → "Pipeline" implies project-scoped route) | `PROJECT_NAV_ITEMS` → "Pipeline" (label maps to this feature) | WorkflowPipelinePage, PipelineDiagram, PipelineStepNode, PipelineConnector, TaskSelector, MarkdownRenderer, MarkdownEditor, 8 step panels | `hub.tasks.*` |
| 31 | **workspaces** | — (no route in routing index) | Not in nav — no dedicated sidebar entry; UI embedded within settings or project context | WorkspaceCard, WorkspacesTab, WorkspaceEditor | `workspaces.*` |

---

## Nav Reachability Summary

### Directly reachable via `TOP_LEVEL_NAV_ITEMS` (sidebar click, no project required)

| Nav Label | Feature Module | URL |
|-----------|---------------|-----|
| Dashboard | dashboard | `/dashboard` |
| My Work | my-work | `/my-work` |
| Fitness | fitness | `/fitness` |
| Productivity | productivity | `/productivity` |

### Directly reachable via `PROJECT_NAV_ITEMS` (sidebar click, requires active project)

| Nav Label | Feature Module | URL |
|-----------|---------------|-----|
| Tasks | tasks | `/projects/$projectId/tasks` |
| Terminals | terminals | `/projects/$projectId/terminals` |
| Agents | agents | `/projects/$projectId/agents` |
| Pipeline | workflow-pipeline | (project-scoped, exact route not in routing index) |
| Roadmap | roadmap | `/projects/$projectId/roadmap` |
| Ideation | ideation | `/projects/$projectId/ideation` |
| GitHub | github | `/projects/$projectId/github` |
| Changelog | changelog | `/projects/$projectId/changelog` |
| Insights | insights | `/projects/$projectId/insights` |

### Reachable via sidebar footer (not `<nav>` element)

| Feature | Access Method |
|---------|--------------|
| settings | `aside button` with text "Settings" (sidebar footer) |

### Not directly reachable via sidebar click

| Feature | Reason |
|---------|--------|
| agent-dashboard | No sidebar entry; accessed programmatically from task context |
| alerts | Moved to Productivity tabs (ui-layout-refactor); access via Productivity > Alerts tab |
| assistant | Floating widget mounted globally; toggled via SidebarAssistantButton |
| auth | Pre-auth routes (`/login`, `/register`); rendered before sidebar exists |
| briefing | Moved to Productivity tabs; access via Productivity > Briefing tab |
| communications | No sidebar entry |
| devices | No dedicated page route |
| hub-setup | Pre-auth Hub configuration wizard |
| merge | Modal workflow; triggered from task/git context |
| notes | Moved to Productivity tabs; access via Productivity > Notes tab |
| onboarding | First-run wizard modal; triggered automatically |
| planner | Moved to Productivity tabs; access via Productivity > Planner tab |
| projects | Reachable via TopBar "+" button (`button[title="Open project"]`), not a nav item |
| screen | Toolbar widget (ScreenshotButton in TopBar) |
| visualization | No sidebar entry; direct URL navigation |
| voice | VoiceButton in TopBar; VoiceSettings embedded in SettingsPage |
| workspaces | Embedded in settings or project context |

---

## Appendix A — Undocumented Feature Directories

The following 6 directories exist in `src/renderer/features/` but are **not listed in FEATURES-INDEX.md Section 1** and **not described in AI-AGENT-ROUTING-INDEX.md**. Per task rules, no IPC channels or routes are assigned to them here.

| Directory | Has Components | Has Hooks | Has Store | Status |
|-----------|---------------|-----------|-----------|--------|
| `diff-viewer` | Yes (`components/`) | No | Yes (`store.ts`) | Undocumented — not in FEATURES-INDEX |
| `file-explorer` | Yes (`components/`) | Yes (`hooks/`) | Yes (`store.ts`) | Undocumented — not in FEATURES-INDEX |
| `health` | Yes (`components/`) | Yes (`hooks/`) | Yes (`store.ts`) | Undocumented — not in FEATURES-INDEX |
| `tools` | Yes (`components/`) | No | Yes (`store.ts`) | Undocumented — not in FEATURES-INDEX |
| `workflow` | Yes (`components/`) | Yes (`hooks/`) | Yes (`store.ts`) | Undocumented — not in FEATURES-INDEX |
| `workspace` | Yes (`components/`) | Yes (`hooks/`) | Yes (`store.ts`) | Undocumented — not in FEATURES-INDEX (note: separate from `workspaces`) |

**Note on count discrepancy:** `FEATURES-INDEX.md` Quick Stats header states "Renderer Features: 36". The Section 1 table contains 31 rows. The filesystem contains 37 feature directories. These counts are inconsistent. The 31 documented features are the authoritative source for this survey. The discrepancy should be resolved by updating `FEATURES-INDEX.md`.

---

## Self-Review Checklist

- [x] All 31 rows from FEATURES-INDEX.md Section 1 table present in the feature table
- [x] `TOP_LEVEL_NAV_ITEMS` captured verbatim from `tests/e2e/helpers/navigation.ts`
- [x] `PROJECT_NAV_ITEMS` captured verbatim from `tests/e2e/helpers/navigation.ts`
- [x] `ROUTE_URL_MAP` captured verbatim from `tests/e2e/helpers/navigation.ts`
- [x] All features not in either nav array explicitly flagged with reason
- [x] No IPC channels invented — all from FEATURES-INDEX.md
- [x] No routes invented — all from AI-AGENT-ROUTING-INDEX.md
- [x] Count discrepancy between FEATURES-INDEX.md header (36) and table (31) documented
- [x] 6 undocumented filesystem directories listed in Appendix A
- [ ] FEATURES-INDEX.md header count (36) does not match table rows (31) — **flagged as discrepancy, not fixable by this task**
