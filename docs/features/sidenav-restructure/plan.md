# Sidenav Restructure Plan

> Reorganize project-scoped navigation from a catch-all "Tools" bucket into logical groupings: Planning, Git, Tools (Claude Config), while keeping feature slices untouched.

## Current State

**Global nav:** Home, My Work, Fitness, Productivity
**Project-scoped nav:** Workspace, Tasks, Terminals, Visual Map, Tools

"Tools" currently houses GitHub, Ideation, Roadmap, Changelog, Insights — unrelated features grouped by elimination.

## Target State

### Global (top section — always visible)

| Item | Icon | Route | Contents |
|------|------|-------|----------|
| Home | `Home` | `/dashboard` | Dashboard, daily stats, quick capture |
| My Work | `Briefcase` | `/my-work` | Cross-project task view |
| Productivity | `Headphones` | `/productivity` | Calendar, Spotify, Briefing, Notes, Planner, Alerts, Comms |
| Fitness | `Dumbbell` | `/fitness` | Workouts, metrics |

### Project-scoped (middle section — requires active project)

| Item | Icon | Route Segment | Contents |
|------|------|---------------|----------|
| Workspace | `Bot` | `agents` | Primary session + Team Leads (unchanged) |
| Tasks | `ListTodo` | `tasks` | Task data grid (unchanged) |
| Terminals | `Terminal` | `terminals` | Terminal grid (unchanged) |
| Planning | `Map` | `planning` | Tabbed: Roadmap, Ideation, Insights |
| Git | `GitBranch` | `git` | GitHub (PRs, Issues, Notifications) + Changelog summary in header |
| Tools | `Wrench` | `tools` | Claude Config suite: Skills, Commands, Agents, Plugins, Config tabs |
| Visual Map | `Network` | `visualization` | Codebase graph (unchanged) |

## Changes Required

### Phase 1: Route Constants + Sidebar Labels (minimal risk)

**File: `src/shared/constants/routes.ts`**
- Add `PLANNING: 'planning'` and `GIT: 'git'` to `PROJECT_VIEWS`
- Add `PROJECT_PLANNING` and `PROJECT_GIT` to `ROUTE_PATTERNS`
- Keep existing constants (`ROADMAP`, `IDEATION`, `GITHUB`, `CHANGELOG`, `INSIGHTS`) for backwards compat until Phase 2 routes are wired
- `TOOLS` stays as-is (same path segment, new content in Phase 3)

**File: `src/renderer/app/layouts/Sidebar.tsx`**
- Update `projectItems` array:
  - Workspace, Tasks, Terminals — unchanged
  - Replace `Visual Map` → keep as-is
  - Replace `Tools` (BarChart3, tools path) with three entries:
    - `{ label: 'Planning', icon: Map, path: 'planning' }`
    - `{ label: 'Git', icon: GitBranch, path: 'git' }`
    - `{ label: 'Tools', icon: Wrench, path: 'tools' }` (repurposed)

### Phase 2: New Tabbed Pages (low risk — new components, existing feature slices)

**New file: `src/renderer/features/planning/`**
- `PlanningPage.tsx` — Tabbed container using `PageHeader` compound component with `.Tabs`
  - Tab 1: Roadmap → renders existing `RoadmapPage` component
  - Tab 2: Ideation → renders existing `IdeationPage` component
  - Tab 3: Insights → renders existing `InsightsPage` component
- Pattern: identical to how `ProductivityPage` wraps its sub-features as tabs
- Barrel export in `index.ts`

**New file: `src/renderer/features/git-hub/` (or modify existing `github/`)**
- `GitPage.tsx` — GitHub as primary content, Changelog as header summary
  - Embeds existing `GitHubPage` components (PRList, IssueList, etc.)
  - `ChangelogSummary` component in `PageHeader` area:
    - Shows most recent changelog entry inline
    - "Expand" button → full popup/dialog with all entries
    - "Copy" button → clipboard (full changelog)
    - "Update" button → add new entry
- Reuses all existing GitHub feature hooks/api/store unchanged

**File: `src/renderer/app/routes/project.routes.ts`**
- Add `planningRoute` → lazy loads `PlanningPage`
- Add `gitRoute` → lazy loads `GitPage`
- Keep old individual routes as redirects to new locations (or remove if no deep links exist)

### Phase 3: Tools → Claude Config Suite (new feature, largest effort)

**New feature: `src/renderer/features/tools-config/`**

```
tools-config/
├── index.ts
├── api/
│   ├── queryKeys.ts
│   ├── useToolsConfig.ts        # queries for skills/commands/agents/plugins
│   └── useToolsConfigMutations.ts
├── components/
│   ├── ToolsConfigPage.tsx      # tabbed container
│   ├── SkillsTab.tsx            # list + editor
│   ├── CommandsTab.tsx          # list + editor
│   ├── AgentsTab.tsx            # list + editor
│   ├── PluginsTab.tsx           # installed plugins browser
│   ├── ConfigTab.tsx            # settings.json + CLAUDE.md visual editor
│   ├── MarkdownFileEditor.tsx   # shared split-pane editor with preview
│   └── GenerateWithAi.tsx       # AI generation prompt overlay
├── hooks/
│   └── useToolsConfigEvents.ts
└── store.ts                     # active tab, selected file, editor state
```

**IPC channels (new domain: `src/shared/ipc/tools/`):**

```
tools.skills.list       → SkillEntry[]
tools.skills.read       → { content, frontmatter }
tools.skills.write      → void
tools.skills.generate   → streamed response

tools.commands.list     → CommandEntry[]
tools.commands.read     → { content }
tools.commands.write    → void

tools.agents.list       → AgentEntry[]
tools.agents.read       → { content }
tools.agents.write      → void

tools.plugins.list      → PluginEntry[]
tools.plugins.toggle    → void

tools.config.read       → { settings, claudeMd }
tools.config.write      → void
```

**Main process service: `src/main/services/tools-config/`**
- Reads/writes `.claude/skills/`, `.claude/commands/`, `.claude/agents/`
- Reads `~/.claude/commands/` for user-level commands
- Reads `~/.claude/plugins/` registry for installed plugins
- "Generate with AI" routes through assistant service with skill-authoring system prompt

### Phase 4: Chat Autocomplete (depends on Phase 3)

**Shared hook: `src/renderer/shared/hooks/useAvailableCommands.ts`**
- Consumes `tools.commands.list` + `tools.skills.list` IPC channels
- Returns unified list of available slash commands for autocomplete

**Shared component: `src/renderer/shared/components/CommandAutocomplete.tsx`**
- Wraps `<Input>` with slash-command popup
- Triggered by `/` at position 0
- Arrow keys + Tab/Enter to select
- Used in: PrimarySessionPanel, TeamLeadPanel, SidebarAssistantButton

## Risk Assessment

| Phase | Risk | Reason |
|-------|------|--------|
| 1 | Minimal | Constants + sidebar labels only |
| 2 | Low | New wrapper components, existing features unchanged |
| 3 | Medium | New feature slice + IPC + service, but isolated |
| 4 | Low | Additive UI component, no existing behavior changed |

## Key Principles

- **Feature slices stay untouched.** RoadmapPage, IdeationPage, InsightsPage, GitHubPage, ChangelogPage — zero internal changes. They get re-mounted under new routes via wrapper pages.
- **Follows existing patterns.** PlanningPage tabs = same pattern as ProductivityPage. GitPage = same PageHeader compound component pattern.
- **Incremental delivery.** Each phase is independently shippable and testable.

## Agent Team Decomposition

| Wave | Task | Files |
|------|------|-------|
| 1 | Route constants + Sidebar update | routes.ts, Sidebar.tsx |
| 1 | PlanningPage (tabbed wrapper) | features/planning/* |
| 1 | GitPage + ChangelogSummary | features/git-hub/* or github/* |
| 2 | Tools Config IPC contracts | shared/ipc/tools/*, main/ipc/handlers/tools-* |
| 2 | Tools Config service | main/services/tools-config/* |
| 3 | MarkdownFileEditor component | features/tools-config/components/* |
| 3 | ToolsConfigPage + all tabs | features/tools-config/* |
| 4 | useAvailableCommands + CommandAutocomplete | shared/hooks/*, shared/components/* |
| 4 | Wire autocomplete into chat inputs | workspace/*, assistant/* |
