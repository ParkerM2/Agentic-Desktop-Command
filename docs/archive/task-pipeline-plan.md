# Progress-Driven Task Pipeline

> **NOTE:** This plan predates the caching layer consolidation. References to `useProgressContext`, `useAgentContext`, `ProgressContextHydrator`, `AgentContextHydrator`, `progress-context-store`, and `agent-context-store` are outdated -- these have been replaced by React Query hooks (`useProgress`, `useProgressMutations`, `useAgentMessages`) and `EventBridge`. See `docs/patterns/CACHING-LAYER-QUICKGUIDE.md`.

> Local-first task management backed by `progress/` filesystem. Tasks flow through Research → Plan → Team execution with per-step agent sessions and a single "Run Workflow" button for end-to-end automation. Agent context store is the single source of truth for all live agent data — sessions, messages, tool calls, errors, token usage — accessible globally and archived to disk on app close.

---

## 1. Data Model

### Directory Structure

Every task is a directory under `progress/`. Archived tasks move to `progress/archived/`.

```
progress/
├── my-feature/
│   ├── task.md                  ← root file (or description.md / ticket.md)
│   ├── research/
│   │   └── research.md          ← deep research output
│   ├── plans/
│   │   └── plan.md              ← implementation plan
│   └── tasks/
│       ├── task-1.md            ← team subtasks (agent workflow files)
│       └── task-2.md
├── fix-sidebar-bug/
│   └── ticket.md
└── archived/
    └── old-feature/
        └── task.md
```

### Root File Frontmatter

The service scans for any of `task.md`, `description.md`, `ticket.md` in the directory root. Same schema regardless of filename.

```yaml
---
title: "Implement feature X"
description: "Short description of the task"
status: backlog
priority: normal
jiraTicket: PROJ-1234
jiraUrl: https://company.atlassian.net/browse/PROJ-1234
prNumber: 89
prUrl: https://github.com/owner/repo/pull/89
prStatus: open
createdAt: 2026-04-07T00:00:00Z
updatedAt: 2026-04-07T00:00:00Z
---

Optional long-form description, acceptance criteria, notes, etc.
```

### Status Enum

```
backlog → researching → research_done → planning → plan_ready → executing → review → done → archived
                                                                                  ↘ error
```

Status is both stored in frontmatter AND inferred from directory contents:
- `research/research.md` exists → at least `research_done`
- `plans/plan.md` exists → at least `plan_ready`
- `tasks/task-*.md` exist → at least `executing`

Frontmatter is the manual override. Directory structure is structural truth. The service reconciles on read — if the directory has more progress than the status says, it bumps the status.

### Priority

`low | normal | high | urgent`

### Ticket & PR Fields

| Field | Type | Description |
|-------|------|-------------|
| `jiraTicket` | string | Jira issue key (e.g. `PROJ-1234`) |
| `jiraUrl` | string | Full Jira URL |
| `prNumber` | number | GitHub PR number |
| `prUrl` | string | Full GitHub PR URL |
| `prStatus` | string | `draft | open | merged | closed` |

Set manually or populated by team-lead when it creates a PR. No live Jira/GitHub API polling.

---

## 2. Progress Service

**Location:** `src/main/services/progress/progress-service.ts`

Factory: `createProgressService(projectPath)` returning `ProgressService` interface.

### Reads

- Scans `progress/` on startup (excluding `archived/`)
- For each subdirectory: reads root md file, checks for `research/`, `plans/`, `tasks/` presence
- Builds `ProgressTask[]`
- Watches for FS changes (new directories, file writes) and emits update events
- Also reads `progress/archived/` for archive count

### Writes

| Method | Description |
|--------|-------------|
| `createTask(slug, title, description, priority?)` | Creates `progress/<slug>/task.md` with frontmatter |
| `updateTask(slug, updates)` | Rewrites frontmatter fields in the root md file |
| `archiveTask(slug)` | Moves `progress/<slug>/` → `progress/archived/<slug>/` |
| `deleteTask(slug)` | Removes directory entirely |
| `listTasks()` | Returns all non-archived ProgressTask[] |
| `getTask(slug)` | Returns single ProgressTask with full content |
| `listArchived()` | Returns archived ProgressTask[] |

### ProgressTask Type

```typescript
interface ProgressTask {
  slug: string;
  rootFile: string;                // 'task.md' | 'description.md' | 'ticket.md'
  title: string;
  description: string;
  status: ProgressStatus;
  priority: ProgressPriority;
  jiraTicket?: string;
  jiraUrl?: string;
  prNumber?: number;
  prUrl?: string;
  prStatus?: string;
  createdAt: string;
  updatedAt: string;

  // Derived from directory contents
  hasResearch: boolean;
  hasPlan: boolean;
  hasTeamTasks: boolean;
  teamTaskCount: number;

  // Content (populated on getTask, not listTasks)
  researchContent?: string;
  planContent?: string;
}
```

### Actions (Agent Session Spawning)

Each action spawns a dedicated agent session via `AgentManagerService.spawnProjectOwner()`.

| Action | Prompt | Output |
|--------|--------|--------|
| `startResearch(slug)` | "Deep research on `<title>`. Read existing files. Write comprehensive research doc to `progress/<slug>/research/research.md`." | Writes research.md, updates status to `research_done` |
| `createPlan(slug)` | "Read research at `progress/<slug>/research/research.md`. Create implementation plan at `progress/<slug>/plans/plan.md`." | Writes plan.md, updates status to `plan_ready` |
| `spinUpTeam(slug)` | Calls `workspace.handOffPlan(projectId, 'progress/<slug>/plans/plan.md')` | Team-lead decomposes into tasks/, status → `executing` |

Each action:
1. Updates frontmatter status before spawning (e.g., `researching`)
2. Spawns a headless session
3. Tracks sessionId in the active sessions map
4. On session end (exit event), re-reads the directory to reconcile status

### Run Workflow (End-to-End)

`runWorkflow(slug)` — sequential pipeline:

1. If no research: `startResearch(slug)`, wait for session end
2. If no plan: `createPlan(slug)`, wait for session end
3. If no team: `spinUpTeam(slug)`

On any step failure (non-zero exit): stops, sets status to `error`, surfaces error. User can retry from the failed step or restart.

While running, the service tracks which step is active and emits progress events.

---

## 3. IPC Contract

**Domain:** `progress`

### Invoke Channels

```typescript
'progress.listTasks'           → ProgressTask[]
'progress.getTask'             → ProgressTask | null         // { slug }
'progress.createTask'          → ProgressTask                // { slug, title, description, priority? }
'progress.updateTask'          → ProgressTask                // { slug, updates }
'progress.archiveTask'         → { success }                 // { slug }
'progress.deleteTask'          → { success }                 // { slug }
'progress.listArchived'        → ProgressTask[]

'progress.startResearch'       → { sessionId }               // { slug }
'progress.createPlan'          → { sessionId }               // { slug }
'progress.spinUpTeam'          → { sessionId, teamLeadIndex, action }  // { slug }
'progress.runWorkflow'         → { started: true }           // { slug }
'progress.cancelAction'        → { success }                 // { slug }
```

### Event Channels

```typescript
'event:progress.taskUpdated'       → { slug, task: ProgressTask }
'event:progress.taskCreated'       → { slug, task: ProgressTask }
'event:progress.taskArchived'      → { slug }
'event:progress.actionStarted'     → { slug, action: 'research' | 'plan' | 'team', sessionId }
'event:progress.actionCompleted'   → { slug, action: 'research' | 'plan' | 'team' }
'event:progress.actionFailed'      → { slug, action: 'research' | 'plan' | 'team', error }
'event:progress.workflowStep'      → { slug, step: 'research' | 'plan' | 'team', status: 'started' | 'completed' | 'failed' }
```

---

## 4. Agent Context Store — Full Data Layer

### Single Source of Truth

`useAgentContext` (already created at `src/renderer/shared/stores/agent-context-store.ts`) becomes the **single source of truth** for all live agent data in the renderer. Every component reads from this store — no direct IPC calls for agent data.

### Expanded Store Shape

```typescript
interface AgentContextState {
  // ── Live Sessions ──────────────────────────────────────
  sessions: WorkspaceSession[];           // primary + team-leads
  agentSessions: AgentSessionDetail[];    // ALL agent sessions (summaries only — from disk)
  isLoading: boolean;
  lastError: string | null;

  // ── Rolling Window (in-memory, last N per session) ─────
  recentMessages: Map<string, AgentChatMessage[]>;   // sessionId → last 50 messages
  recentToolCalls: Map<string, ToolCallSummary[]>;   // sessionId → last 20 tool calls
  errors: Map<string, AgentError[]>;                 // sessionId → all errors (typically few)

  // ── Task ↔ Agent Mapping ───────────────────────────────
  taskAgentMap: Map<string, string[]>;          // slug → sessionIds

  // ── Actions ────────────────────────────────────────────
  handOffPlan(...): Promise<HandoffResult>;
  executeTask(...): Promise<HandoffResult>;
  sendMessage(sessionId, message): Promise<boolean>;
  fetchGitDiff(sessionId): Promise<string>;           // on-demand, not cached
  fetchSessionLog(sessionId, offset, limit): Promise<AgentChatMessage[]>;  // paginated from disk
  // ... existing actions
}
```

Token usage and session metadata come from the summary files, not from in-memory maps. Git diffs are computed on demand and never stored.

### Agent Session Detail

```typescript
interface AgentSessionDetail {
  sessionId: string;
  name: string;                // meaningful name: "{agentRole}-{taskSlug}" e.g. "service-engineer-auth-refactor"
  role: string;                // from task-*.md agentRole field
  taskSlug: string;            // which progress task this agent works on
  taskNumber: number | null;   // from task-*.md
  status: AgentStatus;         // running | idle | completed | failed
  branch: string | null;       // git branch this agent works on
  model: string;
  tokenUsage: AgentTokenUsage;
  startedAt: string;
  lastActivityAt: string;
  exitCode: number | null;
  isTeamLead: boolean;
}
```

### Agent Naming Convention

Agent names MUST be descriptive. The team-lead assigns names based on role + task:

| Pattern | Example |
|---------|---------|
| Research session | `research-{slug}` → `research-auth-refactor` |
| Planning session | `planning-{slug}` → `planning-auth-refactor` |
| Team-lead | `team-lead-{slug}` → `team-lead-auth-refactor` |
| Teammate | `{agentRole}-{taskSlug}` → `service-engineer-auth-service` |

The team-leader.md agent definition instructs the team-lead to use these names when calling `Agent(name: "service-engineer-auth-service", team_name: "auth-refactor", ...)`.

### Data Flow

```
Main Process (AgentManagerService)
  │  holds all live data: sessions, messages, tool calls, usage, errors
  │  captures from stream-json parser per session
  │
  ├─ IPC events → AgentContextHydrator (renderer)
  │                  │
  │                  └─ syncs into useAgentContext (Zustand store)
  │                       │
  │                       ├─ Task list expanded row reads agent data
  │                       ├─ Workspace panels read session data
  │                       ├─ Visualization reads agent data
  │                       └─ Assistant reads session data
  │
  └─ On app close → serialize to disk
                      │
                      └─ progress/<slug>/sessions/
                           ├─ research-session.json    (archived messages, usage, errors)
                           ├─ planning-session.json
                           └─ teammates/
                               ├─ service-engineer.json
                               └─ component-engineer.json
```

### Disk-First Persistence (Continuous Append)

Sessions can run for days or weeks. Holding full history in memory would bloat the store and degrade renderer performance. Instead: **append to disk continuously, keep a rolling window in memory.**

#### Write Path (Main Process)

As `AgentManagerService` receives stream-json events:

1. **Append-only JSONL** — each message, tool call, and error is appended to `progress/<slug>/sessions/<agent-name>.jsonl` as it arrives. No batching, no buffering — one line per event. This is the persistent log.

2. **Summary file** — `progress/<slug>/sessions/<agent-name>.summary.json` is updated periodically (every 30s or on session status change) with:
   - Session metadata (name, role, status, model, branch)
   - Token usage totals
   - Error count
   - Last activity timestamp
   - Message count
   - Exit code (when done)

#### Read Path (Renderer)

The `useAgentContext` store holds **only the last N messages/events per session** (default N=50). This is the rolling window.

- The summary file provides the overview data (tokens, errors, status) without loading full history
- When the user expands an agent's detail view, the UI requests the full JSONL log on demand via IPC (`agent-dashboard.getSessionLog`) with pagination (offset + limit)
- The store never holds the full history — it pages from disk

#### Memory Limits

| Data | In-Memory | On Disk |
|------|-----------|---------|
| Messages per session | Last 50 | Full JSONL (unlimited) |
| Tool calls per session | Last 20 | Full JSONL |
| Errors per session | All (typically few) | Full JSONL |
| Token usage | Running totals only | Summary file |
| Git diffs | Fetched on demand, not cached | Not persisted (computed from git) |

#### Lifecycle

- **Session start**: create JSONL file + summary file
- **During session**: append events to JSONL, update summary periodically
- **Session end**: finalize summary with exit code + duration, flush any pending writes
- **Task archived**: session files move with the task directory to `progress/archived/`
- **App restart**: `ProgressService` reads summary files for the task list; full logs loaded on demand

#### Write Filter (On Ingest)

Not every stream-json event is worth persisting. The session writer applies a filter before appending to JSONL:

| Event Type | Keep | Why |
|------------|------|-----|
| `assistant` text messages | Full text | Core output, needed for review |
| `user` messages | Full text | Context for the conversation |
| `tool_use` blocks | Name + input summary (first 500 chars) + success/fail | Tool analytics without storing huge inputs |
| `tool_result` blocks | Status + truncated output (first 200 chars) | Know what happened without full file contents |
| `stream_event` deltas | **Discard** | Partial tokens — the final `assistant` message has the complete text |
| `system` init | Model, session_id only | Metadata |
| `result` usage | Full token counts | Analytics |
| Errors | Full error message + stack | Debugging |

This filter runs on the write path in the main process. Raw stream-json never hits disk — only the filtered version. This alone cuts log size by ~60-70% since streaming deltas are the bulk.

#### Summary Metrics (Analytics-Ready)

The summary file (`<agent-name>.summary.json`) accumulates metrics designed for later analysis:

```typescript
interface SessionSummary {
  // ── Identity ─────────────────────────────
  sessionId: string;
  agentName: string;
  agentRole: string;
  taskSlug: string;
  model: string;
  provider: 'claude' | 'local' | string;    // for future LLM comparison

  // ── Timing ───────────────────────────────
  startedAt: string;
  endedAt: string | null;
  durationMs: number;

  // ── Token Usage ──────────────────────────
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;                           // estimated from model pricing

  // ── Efficiency ───────────────────────────
  toolCallCount: number;
  toolCallsByName: Record<string, number>;   // { "Edit": 14, "Read": 32, ... }
  errorCount: number;
  messageCount: number;
  filesChanged: number;

  // ── Outcome ──────────────────────────────
  status: 'completed' | 'failed' | 'killed';
  exitCode: number | null;
}
```

These summaries survive log cleanup and serve as the permanent analytical record per agent session.

#### Weekly Log Cleanup

A cleanup function runs on a 7-day schedule (configurable). It processes `progress/*/sessions/*.jsonl` files:

1. **For completed sessions older than 7 days:**
   - Delete the JSONL file (full message log)
   - Keep the `.summary.json` file (analytics record) — this is permanent
   - The summary has everything needed for reports, charts, comparisons

2. **For archived tasks:**
   - Same treatment — summaries kept, JSONL deleted after 7 days
   - Summary files are small (~1KB each) and never cleaned

3. **What survives cleanup permanently:**
   - `*.summary.json` — agent name, role, task, model, provider, timing, tokens, cost, tool counts, error count, outcome
   - `task.md` / `description.md` / `ticket.md` — task metadata
   - `research/research.md` — research output
   - `plans/plan.md` — implementation plan

This means after cleanup, you can still answer: "How many tokens did the service-engineer use on the auth-refactor task?", "What's the average cost per agent across all tasks?", "How does claude-opus compare to local-llama on similar tasks?" — all from the summary files. You just can't replay the full conversation.

The cleanup is implemented in `ProgressService` as `runLogCleanup()`, triggered by a `setInterval` on app start (check daily, clean if 7+ days old). Also callable manually via IPC for immediate cleanup.

### IPC for Agent Data

New channels on `agent-dashboard` domain (extends existing):

```typescript
'agent-dashboard.getSessionDetail'     → AgentSessionDetail        // { sessionId }
'agent-dashboard.getSessionMessages'   → AgentChatMessage[]        // { sessionId }
'agent-dashboard.getSessionToolCalls'  → ToolCallSummary[]         // { sessionId }
'agent-dashboard.getSessionErrors'     → AgentError[]              // { sessionId }
'agent-dashboard.getGitDiff'           → string                    // { sessionId }
'agent-dashboard.getSessionsForTask'   → AgentSessionDetail[]      // { slug }
```

These are consumed by the `AgentContextHydrator` — individual components do NOT call these directly.

---

## 5. Global Store (`useProgressContext`)

**Location:** `src/renderer/shared/stores/progress-context-store.ts`

Zustand store, hydrated by `ProgressContextHydrator` in root layout.

```typescript
interface ProgressContextState {
  tasks: ProgressTask[];
  archivedCount: number;
  activeSessions: Map<string, { sessionId: string; action: string }>;  // slug → active action
  isLoading: boolean;

  // Actions (call IPC)
  createTask(slug: string, title: string, description: string, priority?: string): Promise<ProgressTask>;
  updateTask(slug: string, updates: Partial<ProgressTask>): Promise<void>;
  archiveTask(slug: string): Promise<void>;
  startResearch(slug: string): Promise<void>;
  createPlan(slug: string): Promise<void>;
  spinUpTeam(slug: string): Promise<void>;
  runWorkflow(slug: string): Promise<void>;
  cancelAction(slug: string): Promise<void>;
}
```

Available globally via `useProgressContext()` — any component, any page, assistant widget, etc.

---

## 5. Task List Grid

Rewire `ProgressTaskGrid` to read from `useProgressContext` instead of Hub tasks.

### Columns

| # | Column | Source | Width | Sortable |
|---|--------|--------|-------|----------|
| 1 | Expand | toggle | 40px | no |
| 2 | Status | `status` | 120px | yes |
| 3 | Title | `title` | flex | yes |
| 4 | Priority | `priority` | 90px | yes |
| 5 | Stage | derived from `hasResearch`, `hasPlan`, `hasTeamTasks` | 160px | no |
| 6 | Ticket | `jiraTicket` → clickable badge | 110px | no |
| 7 | PR | `prNumber` + `prStatus` → clickable badge | 100px | no |
| 8 | Updated | `updatedAt` | 110px | yes |

**Stage column** — three small step indicators:
- Research: filled circle if `hasResearch`, empty if not
- Plan: filled if `hasPlan`, empty if not
- Team: filled if `hasTeamTasks`, empty if not

Visual pipeline indicator showing how far the task has progressed.

### Toolbar

- Status filter (multi-select dropdown)
- Search (title + description)
- "New Task" button (creates `progress/<slug>/task.md`)
- "Run Workflow" button (disabled unless a single task is selected)

---

## 6. Expanded Row

When a row is expanded, shows a vertical pipeline view:

### Top Bar
- Jira badge + link (if set, else "Link Ticket" button)
- PR badge + link + status (if set, else "Link PR" button)
- **"Run Workflow"** button (kicks off full pipeline from current step)
- **"Archive"** button

### Research Section
- **If no research:** "Deep Research" button
- **If researching:** spinner + "Researching..." with session link
- **If research done:** rendered markdown of `research/research.md` (collapsible, default collapsed showing first ~200 chars)

### Plan Section
- **If no plan (and research done):** "Create Plan" button
- **If planning:** spinner + "Creating plan..."
- **If plan ready:** rendered markdown of `plans/plan.md` (collapsible) + "Spin Up Team" button

### Team Section
- **If no team (and plan ready):** "Spin Up Team" button
- **If executing:** Team Activity panel (see below)
- **If done/review:** completion summary with final stats

### Team Activity Panel (executing state)

Reads from `useAgentContext` joined with `useProgressContext`:

**Agent List** — table of all agents for this task:

| Column | Source |
|--------|--------|
| Name | `AgentSessionDetail.name` (e.g., `service-engineer-auth-service`) |
| Role | `AgentSessionDetail.role` |
| Status | `AgentSessionDetail.status` badge (running/idle/completed/failed) |
| Tokens | `AgentSessionDetail.tokenUsage` (input + output) |
| Duration | derived from `startedAt` → `lastActivityAt` |

**Per-Agent Expandable Detail** — click an agent row to expand:

- **Message Log** — scrollable chat view from `useAgentContext.messages.get(sessionId)`, reuses `AgentChatPanel`
- **Tool Calls** — list of tool calls with name, truncated input, success/fail badge
- **Errors** — red-highlighted error entries with timestamps
- **Git Diff** — on-demand diff viewer (`fetchGitDiff(sessionId)`) showing changes on the agent's branch
- **Session Info** — model, branch, exit code, total tokens, duration

### Error State
If any step failed: red banner with error message + "Retry" button for that step.

---

## 7. Visualization Integration

The Agents view in the visualization feature currently reads from `tracking/` (legacy plugin system). Refactor to read from `progress/` + live agent sessions.

### Data Sources (New)

| Source | What it provides |
|--------|-----------------|
| `progress/` directory scan | Feature list, task structure, status, file scope from task-*.md |
| `AgentManagerService.listSessions()` | Live session status (running/idle/completed) for research, plan, and team agents |
| `useAgentContext.sessions` | Workspace sessions (primary, team-leads) |
| `useProgressContext.activeSessions` | Which tasks have active actions (research/plan/team) |

### What Changes

**`src/main/services/visualization/agent-teams.ts`** — `buildAgentTeamsData()`:
- Reads features from `progress/` (non-archived directories) instead of `tracking/index.json`
- Reads agent task files from `progress/<slug>/tasks/task-*.md` (already does this)
- Gets live agent status from `AgentManagerService` session data instead of JSONL event parsing
- Single-agent sessions (research, planning) show as single nodes in the feature group
- Team execution shows the full agent tree (team-lead + teammates)

### Node Mapping

| Progress Stage | Visualization Node |
|---------------|-------------------|
| `researching` | Single AgentTask node: "Research Agent" (active) |
| `planning` | Single AgentTask node: "Planning Agent" (active) |
| `executing` | FeatureGroup with AgentTask children from task-*.md |
| `research_done` / `plan_ready` | Single completed node (dimmed) |
| `done` | FeatureGroup with all agents completed |

### Removed Dependency

- No longer reads `tracking/` directory at all
- No longer parses agent JSONL event files for status derivation
- Status comes from live `AgentManagerService` sessions + progress task status

---

## 8. Files to Create / Modify

### New Files
- `src/shared/types/progress.ts` — ProgressTask, ProgressStatus, ProgressPriority types
- `src/shared/types/agent-session-detail.ts` — AgentSessionDetail, ToolCallSummary, AgentError types
- `src/shared/ipc/progress/schemas.ts` — Zod schemas
- `src/shared/ipc/progress/contract.ts` — invoke + event channels
- `src/shared/ipc/progress/index.ts` — barrel
- `src/main/services/progress/progress-service.ts` — FS scanner, watcher, CRUD, actions
- `src/main/services/progress/task-file-io.ts` — read/write frontmatter md files
- `src/main/services/progress/session-archiver.ts` — serialize agent session data to `progress/<slug>/sessions/` on close/done
- `src/main/services/progress/index.ts` — barrel
- `src/main/ipc/handlers/progress-handlers.ts` — thin IPC handlers
- `src/renderer/shared/stores/progress-context-store.ts` — global Zustand store
- `src/renderer/shared/stores/ProgressContextHydrator.tsx` — sync component
- `src/renderer/features/tasks/components/grid/ProgressTaskGrid.tsx` — new grid reading from progress store
- `src/renderer/features/tasks/components/detail/ProgressTaskDetailRow.tsx` — new expanded row with pipeline UI
- `src/renderer/features/tasks/components/detail/TeamActivityPanel.tsx` — per-agent list + expandable detail (logs, tools, errors, diff)
- `src/renderer/features/tasks/components/detail/AgentDetailExpander.tsx` — single agent expandable row (messages, tool calls, errors, git diff)

### Modified Files
- `src/shared/ipc/index.ts` — add progress contract to merged contracts
- `src/shared/ipc/agent-dashboard/contract.ts` — add per-session detail/messages/toolcalls/errors/diff channels
- `src/main/services/agent-manager/agent-manager-service.ts` — add methods for session detail, tool call log, error log, git diff
- `src/main/ipc/handlers/agent-dashboard-handlers.ts` — register new per-session data handlers
- `src/main/bootstrap/service-registry.ts` — create + wire progress service, wire session archiver to app lifecycle
- `src/main/ipc/index.ts` — register progress handlers (if separate from service-registry)
- `src/main/services/visualization/agent-teams.ts` — refactor to read from progress/ + AgentManagerService instead of tracking/
- `src/renderer/shared/stores/agent-context-store.ts` — expand to full data layer (messages, tool calls, errors, git diffs, task-agent mapping)
- `src/renderer/shared/stores/AgentContextHydrator.tsx` — hydrate expanded agent data, handle session archive events
- `src/renderer/shared/stores/index.ts` — export new store + hydrator
- `src/renderer/app/layouts/RootLayout.tsx` — mount ProgressContextHydrator
- `src/renderer/features/visualization/api/visualization-api.ts` — update if data shape changes
- `src/renderer/features/tasks/components/TasksPage.tsx` — swap grid to ProgressTaskGrid
- `src/renderer/features/workspace/components/TeamLeadPanel.tsx` — ensure agent names propagate to context
- `.claude/agents/team-leader.md` — document agent naming convention requirement
- `docs/routing/FEATURES-INDEX.md` — add progress service entry
- `CLAUDE.md` — document progress IPC channels and agent naming convention

---

## 8. What's NOT In Scope

- Hub sync / mirror — local only for now
- Jira API live polling — manual metadata only
- GitHub PR status polling — manual metadata only
- Small task / PR review / bug fix workflows — team-only for now
- Agent pause/resume (Windows limitation)

## 10. Deprecations

- `tracking/` directory — no longer used for agent visualization. All data comes from `progress/` + live session state
- `ProgressWatcherV2` (progress-watcher-v2 service) — replaced by the new `ProgressService` which covers both task CRUD and file watching
- `hub.tasks.*` IPC channels — task list grid reads from `progress.*` channels instead. Hub task channels remain for backward compat but are not the primary data source

## 11. Reserved / Hidden (Not In Use)

- `workspace.provisionTeammate` / `workspace.teardownTeammate` IPC channels — reserved for future use with non-Claude LLM providers or local models where the harness (not the LLM) manages teammate process spawning. Currently hidden from UI. Claude Code's Experimental Agent Teams handle teammate spawning natively via the `Agent` tool with `team_name` parameter. These channels exist so the harness can orchestrate teammates directly if the provider doesn't support agent teams.
