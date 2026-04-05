# ADC v2 Refactor — Architecture Reference

> Status: COMPLETE as of 2026-04-01. All 9 phases shipped across agent-dashboard-view + adc-fix-first merges.

ADC is undergoing a major architectural shift from **xterm.js terminal grids** (raw ANSI output via node-pty) to **headless agents with structured JSON streaming** rendered as a custom React chat UI.

## What's Changing

| Before (v1) | After (v2) |
|-------------|------------|
| xterm.js + node-pty renders raw terminal output | Headless `stream-json` + session JSONL parsed into React components |
| Single terminal pane per agent | Chat-style panels with markdown messages, tool call cards, inline diffs |
| No structured data from agents | NDJSON events: `system`, `assistant`, `stream_event`, `result` |
| Terminal grid layout | Selectable layouts: Single, 2-Column, 3-Column, Grid, Multi-Project |
| `terminal-service` manages PTY | `AgentManager` manages headless Claude processes + tmux sessions |

## Three-Layer Data Architecture

Agents and workflow tracking are **independent data streams** — the UI joins them when they correlate but displays each independently.

- **Layer 1 — Agent Visibility** (always on): Session JSONL watching, `~/.claude/teams/*/config.json`, tmux pane detection. Shows ALL agent activity regardless of workflow tracking.
- **Layer 2 — Workflow Tracking** (claude-workflow plugin): `progress/*/events.jsonl`, task files, QA verdicts, FSM state. Only exists when `/new-plan` → `/agent-team` is used.
- **Layer 3 — Dashboard** (consumer): Correlates agents to tickets when possible, displays both independently when they don't match.

## Two-Session Model

- **Project Owner**: Headless via `spawn('claude', ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', ...])`. Bidirectional stdin/stdout NDJSON.
- **Team Lead**: Interactive in tmux with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Output captured via session JSONL file watching. Input via `tmux send-keys`.
- **Teammates**: Auto-detected via `fs.watch(~/.claude/teams/*/config.json)`. Each has its own session JSONL.

## Services Being Replaced / Added

| Action | Service | Notes |
|--------|---------|-------|
| **Replace** | `terminal-service` → `AgentManager` | Stream-json spawn + tmux session management |
| **Replace** | Terminal grid UI → `AgentChatPanel` | `@llm-ui/react` + `@assistant-ui/react` for chat rendering |
| **New** | `TeamWatcher` | Watch team config for teammate join/leave |
| **New** | `SessionJSONLReader` | Tail-follow session JSONL, parse events, emit via IPC |
| **New** | `TmuxBridge` | Create/manage tmux sessions, send-keys |
| **New** | `AgentTicketCorrelator` | Match agent teams to ticket IDs (Layer 3) |
| **Reuse** | `agent-orchestrator`, `git-service`, `worktree-service`, `merge-service`, `qa-runner`, `progress-watcher` | Adapt, don't rewrite |

## New Packages (v2 stack additions)

| Package | Purpose |
|---------|---------|
| `react-arborist` | Virtualized file tree (replaces custom tree) |
| `@git-diff-view/react` | GitHub-style diff viewer |
| `@llm-ui/react` + `@llm-ui/markdown` | Smooth LLM streaming output |
| `@assistant-ui/react` | Composable chat UI primitives |
| `ghostty-web` | Escape-hatch terminal tab (Ghostty→WASM) |
| `react-markdown` + `remark-gfm` | Markdown rendering |
| `react-syntax-highlighter` | Code block highlighting |

## DO NOT

- **Do NOT build new features on `terminal-service` or xterm.js** — these are being replaced.
- **Do NOT add new PTY/node-pty integrations** — agent output comes from stream-json / JSONL now.
- **Do NOT assume agent visibility requires workflow tracking** — Layer 1 works independently.
- **Do NOT assume workflow tracking requires agent teams** — Layer 2 works independently.

## Key Documents

| Document | What |
|----------|------|
| `docs/research/2026-03-30-headless-agent-architecture.md` | Full research: data flow, service design, component stack, implementation phases |
| `docs/features/agent-dashboard-view/plan.md` | UI spec: layout modes, panel states, chat components, interactions |
| `docs/tracker.json` → `agent-dashboard-view` | Tracker entry (status: DRAFT, P0) |

## Implementation Phases

| Phase | What | Status | Shipped In |
|-------|------|--------|-----------|
| 0 | Verify session JSONL format, test Agent Teams in tmux | COMPLETE | Pre-existing |
| 1 | AgentManager + stream-json parsing (Project Owner) | COMPLETE | agent-dashboard-view |
| 2 | TmuxBridge + TeamWatcher (Team Lead) | COMPLETE | agent-dashboard-view (built) + adc-fix-first (wired) |
| 3 | SessionJSONLReader (teammate output) | COMPLETE | agent-dashboard-view |
| 4 | AgentChatPanel renderer (replace terminal view) | COMPLETE | agent-dashboard-view |
| 5 | react-arborist file explorer | COMPLETE | agent-dashboard-view (built) + adc-fix-first (IPC wired) |
| 6 | @git-diff-view/react diff viewer | COMPLETE | agent-dashboard-view |
| 7 | Wire ProgressWatcher to dashboard | COMPLETE | agent-dashboard-view (ProgressWatcherV2) + adc-fix-first (IPC handlers) |
| 8 | Flesh out claude-workflow tracking events | NOT STARTED | — |
| 9 | QA pipeline integration | COMPLETE | adc-fix-first (QaRunner.listSessions + mapQaSessionToDashboard wired) |

## Progress Tracking During the Refactor

The slug `agent-dashboard-view` is the single key used consistently everywhere. All artifacts MUST use this exact slug.

| Artifact | Path |
|----------|------|
| Tracker entry | `docs/tracker.json` → `plans.agent-dashboard-view` |
| Plan doc | `docs/features/agent-dashboard-view/plan.md` |
| Research doc | `docs/research/2026-03-30-headless-agent-architecture.md` |
| Progress events | `progress/agent-dashboard-view/events.jsonl` |
| Progress summary | `progress/agent-dashboard-view/current.md` |
| Workflow state | `progress/agent-dashboard-view/workflow-state.json` |
| Task files | `progress/agent-dashboard-view/tasks/task-*.md` |
| Feature branch | `feature/agent-dashboard-view` |
| Work branches | `work/agent-dashboard-view/<task-slug>` |
| Worktrees | `.worktrees/agent-dashboard-view/<task-slug>` |

**Workflow config**: `.claude/workflow.json` defines branching prefixes, worktree settings, and bootstrap config. Read it before any `/agent-team` execution.

**Event tracking**: The claude-workflow plugin writes JSONL events to `progress/agent-dashboard-view/events.jsonl` using the schema defined in `prompts/implementing-features/EVENT-SCHEMA.md`. Key event types: `session.start`, `plan.created`, `task.started`, `task.completed`, `qa.passed`, `branch.merged`, `checkpoint`, `session.end`.

**Tracker sync**: When implementation starts, update `docs/tracker.json` status from `DRAFT` → `IN_PROGRESS`. When complete, update to `IMPLEMENTED`. The tracker is the persistent cross-session record; progress/ is the runtime crash-recovery artifact.
