# ADC v2 Architecture: Headless Agents + Custom React UI

**Date**: 2026-03-30
**Status**: PLAN — awaiting implementation
**Supersedes**: Current xterm.js terminal-based agent rendering

---

## Problem Statement

The current ADC terminal grid (xterm.js + node-pty) renders raw Claude CLI output. This has several limitations:

1. **No structured data** — tool calls, file edits, and messages are mixed ANSI text
2. **No per-agent visibility** — Claude Agent Teams spawn teammates in tmux panes that are hard to observe programmatically
3. **Terminal UX is poor** — raw terminal output isn't a good UI for monitoring multiple agents
4. **No diff viewer** — file changes are only visible as terminal text
5. **Warp replacement needed** — tmux-in-Warp had grid limitations; need better agent visibility

## Key Discovery

Claude Code supports **bidirectional structured JSON streaming**:

```bash
claude -p \
  --input-format stream-json \    # send user messages as JSON via stdin
  --output-format stream-json \   # receive events as NDJSON via stdout
  --verbose \                     # include tool calls
  --include-partial-messages \    # token-level streaming
  --replay-user-messages          # echo confirmation
```

Each line is a JSON object with types: `system` (init), `assistant` (messages + tool calls), `stream_event` (token deltas), `result` (final).

Additionally, every Claude session writes a **JSONL file** at `~/.claude/projects/<cwd>/<session-id>.jsonl` with the same structured data. Teammates spawned by Agent Teams each get their own session JSONL.

## Data Layer Separation (Critical Design Principle)

Agent visibility and workflow tracking are **independent data streams** that the UI joins when possible but displays independently when not.

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Agent Visibility (always on, source-agnostic)     │
│                                                             │
│  Sources:                                                   │
│    ~/.claude/teams/*/config.json    → team membership        │
│    ~/.claude/projects/*/*.jsonl     → session conversations  │
│    tmux list-panes                  → active pane detection  │
│                                                             │
│  Shows ALL agent activity regardless of tracking:           │
│    - One-off experiment teams                               │
│    - Ad-hoc review squads                                   │
│    - Manual sessions                                        │
│    - Any spawned teammate                                   │
│                                                             │
│  Never depends on workflow tracking being configured.       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Workflow Tracking (claude-workflow plugin)         │
│                                                             │
│  Sources:                                                   │
│    progress/*/events.jsonl          → workflow events        │
│    progress/*/tasks/*.md            → task files (YAML+body) │
│    progress/*/proof-ledger          → QA verdicts            │
│    progress/*/workflow-state.json   → FSM state              │
│                                                             │
│  Ticket-scoped data:                                        │
│    - Plans, wave ordering, acceptance criteria               │
│    - QA pass/fail verdicts                                   │
│    - Merge status, branch lifecycle                          │
│    - Only exists when /new-plan → /agent-team is used       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Dashboard / Task Board (consumer of both)          │
│                                                             │
│  Correlation logic:                                         │
│    - Match agent team name to ticket ID when possible        │
│    - Show untracked agents in "Active Agents" without        │
│      forcing ticket association                              │
│    - Show ticketed work without agents (manual tasks,        │
│      research, planning — no team involved)                  │
│    - Display both independently when they don't match        │
│                                                             │
│  Views:                                                     │
│    - Agent Panel: always visible, all agents                 │
│    - Ticket Board: tracked work only                         │
│    - Correlated View: agents matched to tickets              │
│    - Unmatched: agents without tickets + tickets without     │
│      agents (both are valid states)                          │
└─────────────────────────────────────────────────────────────┘
```

### Why This Matters

- **Agent visibility should never depend on workflow tracking.** A one-off team still shows up.
- **Workflow tracking should never depend on agent teams.** Manual work on a ticket still tracks.
- **The dashboard joins them when they match**, but treats mismatches as normal, not errors.
- **The claude-workflow plugin can evolve independently** — its tracking schema updates don't break agent visibility, and vice versa.

---

## Architecture

### Two-Session Model

```
┌──────────────────────────────────────────────────────────────────┐
│  ADC Electron App (React 19 + Tailwind 4)                        │
│                                                                  │
│  ┌──────────┐  ┌──────────────────────────────────────────────┐  │
│  │ Sidebar   │  │ Main View (tabs)                             │  │
│  │           │  │                                              │  │
│  │ File Tree │  │  ┌─ Agent Chat Panels ─────────────────────┐ │  │
│  │ (react-   │  │  │                                         │ │  │
│  │ arborist) │  │  │  ┌──────────────┐  ┌──────────────────┐ │ │  │
│  │           │  │  │  │ Project      │  │ Team Lead        │ │ │  │
│  │ Git       │  │  │  │ Owner        │  │                  │ │ │  │
│  │ Changes   │  │  │  │              │  │ Markdown msgs    │ │ │  │
│  │ (git-diff │  │  │  │ Markdown     │  │ Tool call cards  │ │ │  │
│  │  -view)   │  │  │  │ msgs         │  │ Agent spawn evts │ │ │  │
│  │           │  │  │  │ Tool calls   │  │ Input box        │ │ │  │
│  │ Agent     │  │  │  │ Input box    │  │                  │ │ │  │
│  │ Status    │  │  │  └──────────────┘  └──────────────────┘ │ │  │
│  │           │  │  │                                         │ │  │
│  │ Task      │  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │ │  │
│  │ Board     │  │  │  │Agent #1 │ │Agent #2 │ │Agent #3 │  │ │  │
│  │           │  │  │  │(auto-   │ │(auto-   │ │(auto-   │  │ │  │
│  │           │  │  │  │ detect) │ │ detect) │ │ detect) │  │ │  │
│  └──────────┘  │  │  └─────────┘ └─────────┘ └─────────┘  │ │  │
│                │  └─────────────────────────────────────────┘ │  │
│                │                                              │  │
│                │  ┌─ Diff View ─────────────────────────────┐ │  │
│                │  │ @git-diff-view/react                    │ │  │
│                │  │ GitHub-style + inline comments           │ │  │
│                │  └─────────────────────────────────────────┘ │  │
│                │                                              │  │
│                │  ┌─ Dashboard ─────────────────────────────┐ │  │
│                │  │ Progress · Events · Kanban · QA          │ │  │
│                │  └─────────────────────────────────────────┘ │  │
│                └──────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ Main Process Services ─────────────────────────────────────┐ │
│  │                                                              │ │
│  │  AgentManager                                                │ │
│  │    Project Owner: spawn('claude', [stream-json flags])       │ │
│  │      ↕ stdin/stdout NDJSON (direct bidirectional)            │ │
│  │                                                              │ │
│  │    Team Lead: tmux session (interactive, agent teams)        │ │
│  │      Output: watch session JSONL                             │ │
│  │      Input: tmux send-keys                                   │ │
│  │                                                              │ │
│  │  TeamWatcher                                                 │ │
│  │    fs.watch(~/.claude/teams/*/config.json)                   │ │
│  │    Detects new teammates → grabs sessionId + tmuxPaneId      │ │
│  │    Watches each teammate's session JSONL → parses → IPC      │ │
│  │                                                              │ │
│  │  ProgressWatcher                                             │ │
│  │    fs.watch(progress/*)                                       │ │
│  │    Tracks task completion, QA verdicts, workflow events       │ │
│  │                                                              │ │
│  │  GitService — worktrees, diffs, status, merge                │ │
│  │  FileWatcher — live file tree updates (fs.watch recursive)   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Project Owner (headless stream-json)
  spawn('claude', ['-p', '--input-format', 'stream-json',
    '--output-format', 'stream-json', '--verbose',
    '--include-partial-messages', '--replay-user-messages'])

  stdin  → JSON user messages from React input
  stdout → NDJSON events: system, assistant, stream_event, result

Team Lead (tmux, interactive, agent teams enabled)
  tmux new-session -d -s team-lead -e CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
  tmux send-keys -t team-lead "claude --name team-lead --teammate-mode tmux" Enter

  Output → watch ~/.claude/projects/<cwd>/<leadSessionId>.jsonl
  Input  → tmux send-keys -t team-lead "<message>" Enter

Teammates (auto-spawned by team-lead)
  Detected via → fs.watch(~/.claude/teams/<team>/config.json)
  Each has    → sessionId, tmuxPaneId, cwd
  Output via  → watch ~/.claude/projects/<cwd>/<teammateSessionId>.jsonl

All session JSONL files use same format as stream-json:
  {"type":"assistant","message":{"content":[{"type":"text","text":"..."},
    {"type":"tool_use","name":"Edit","input":{...}}]}}
```

### Communication: Project Owner → Team Lead

```typescript
// PO finishes a plan → write to files (claude-workflow pipeline)
// Plan lives at: progress/<ticket>/tasks/task-*.md

// Trigger team-lead to execute:
exec('tmux send-keys -t team-lead "Read and execute the plan at ' +
     'progress/DASH-003/tasks/" Enter');

// Or via file-based trigger:
// PO writes a trigger file, TeamWatcher detects it, sends tmux command
```

## Component Stack

| Layer | Package | Stars/Downloads | Purpose |
|-------|---------|-----------------|---------|
| File Explorer | `react-arborist` | 3.6K stars, 302K/wk | Virtualized tree, drag-drop, inline rename |
| Git Diff Viewer | `@git-diff-view/react` | Active | GitHub-faithful, inline comments, split/unified |
| Simple Diffs | `react-diff-viewer-continued` | 566K/wk | Quick before/after display |
| LLM Output | `@llm-ui/react` + `@llm-ui/markdown` | 37K/wk | Smooth streaming at native frame rate |
| Chat UI | `@assistant-ui/react` | Active | Composable chat primitives, auto-scroll |
| ANSI fallback | `ansi-to-react` | 187K/wk | Only if raw terminal output needed |
| Terminal (optional) | `ghostty-web` | 42K/wk | Ghostty→WASM, drop-in xterm.js replacement |
| Markdown | `react-markdown` + `remark-gfm` | Massive | GitHub-flavored markdown rendering |
| Code Highlighting | `react-syntax-highlighter` | Massive | Prism.js-based, 200+ languages |
| State | `zustand` | Already in stack | Lightweight reactive stores |
| Styling | `tailwind css 4` | Already in stack | Utility-first CSS |

## Output Capture Methods

### Method 1: stream-json (Project Owner — direct)

Best for the interactive session. Bidirectional via stdin/stdout.

```typescript
const claude = spawn('claude', ['-p',
  '--input-format', 'stream-json',
  '--output-format', 'stream-json',
  '--verbose', '--include-partial-messages',
  '--replay-user-messages']);

// Send
claude.stdin.write(JSON.stringify({
  type: 'user',
  message: { role: 'user', content: text }
}) + '\n');

// Receive
claude.stdout.on('data', chunk => parseNDJSON(chunk));
```

### Method 2: Session JSONL watching (Team Lead + Teammates)

Best for agents running in tmux. Same structured data, read from disk.

```typescript
const watcher = fs.watch(sessionJsonlPath);
watcher.on('change', () => {
  // Read new lines appended since last read
  const newLines = readNewLines(sessionJsonlPath, lastOffset);
  for (const line of newLines) {
    const event = JSON.parse(line);
    // Forward to renderer via IPC
    mainWindow.webContents.send('agent-event', { agentId, event });
  }
});
```

### Method 3: tmux capture (fallback)

Only if JSONL watching doesn't capture everything.

```bash
tmux pipe-pane -t %1 -o "cat >> /tmp/teammate-1.log"
tmux capture-pane -t %1 -p   # one-shot capture
```

## Team Config Watching

```typescript
// ~/.claude/teams/<team>/config.json updates when teammates join/leave
fs.watch(teamConfigPath, () => {
  const config = JSON.parse(fs.readFileSync(teamConfigPath));
  const newMembers = config.members.filter(m => !knownMembers.has(m.agentId));

  for (const member of newMembers) {
    // Start watching their session JSONL
    watchSessionJSONL(member.agentId, member.cwd, member.sessionId);
    // Notify renderer to create a new agent panel
    mainWindow.webContents.send('teammate-joined', member);
  }
});
```

## Existing ADC Services to Reuse

| Service | Path | Reuse Plan |
|---------|------|------------|
| `agent-orchestrator` | `src/main/services/agent-orchestrator/` | Adapt spawn logic for stream-json |
| `jsonl-progress-watcher` | `src/main/services/agent-orchestrator/` | Reuse for progress/ watching |
| `git-service` | `src/main/services/git/` | Reuse as-is for diffs, worktrees |
| `worktree-service` | `src/main/services/git/` | Reuse for parallel dev |
| `merge-service` | `src/main/services/merge/` | Reuse for visual merge |
| `task-service` | `src/main/services/project/` | Adapt for claude-workflow task files |
| `qa-runner` | `src/main/services/qa/` | Reuse QA pipeline |
| `progress-watcher` | `src/main/services/workflow/` | Reuse for progress/ sync |
| `terminal-service` | `src/main/services/terminal/` | Replace with AgentManager (stream-json) |
| `dashboard-service` | `src/main/services/dashboard/` | Adapt for new data sources |

## Existing ADC Renderer Features to Reuse

| Feature | Path | Reuse Plan |
|---------|------|------------|
| `agents` | `src/renderer/features/agents/` | Adapt UI for JSONL-parsed events |
| `tasks` | `src/renderer/features/tasks/` | Reuse task table |
| `workflow` | `src/renderer/features/workflow/` | Reuse workflow pipeline view |
| `merge` | `src/renderer/features/merge/` | Reuse merge UI |
| `github` | `src/renderer/features/github/` | Reuse PR/issue integration |
| `dashboard` | `src/renderer/features/dashboard/` | Adapt for new data |
| `terminals` | `src/renderer/features/terminals/` | Replace with Agent Chat panels |

## New Services to Build

### Layer 1: Agent Visibility (independent of workflow)

| Service | Purpose |
|---------|---------|
| `AgentManager` | Spawn/manage headless Claude processes (stream-json) + tmux team-lead |
| `TeamWatcher` | Watch `~/.claude/teams/*/config.json` for teammate join/leave/status |
| `SessionJSONLReader` | Tail-follow session JSONL files, parse events, emit via IPC |
| `TmuxBridge` | Create/manage tmux sessions, send-keys, pipe-pane |

### Layer 2: Workflow Tracking (independent of agents)

| Service | Purpose |
|---------|---------|
| `ProgressWatcher` | Watch `progress/*/events.jsonl` for workflow events (reuse from ADC) |
| `TaskFileReader` | Parse task YAML frontmatter + body from `progress/*/tasks/` |
| `WorkflowStateReader` | Read FSM state from `workflow-state.json` |

### Layer 3: Correlation (joins both layers)

| Service | Purpose |
|---------|---------|
| `AgentTicketCorrelator` | Match agent team names/sessions to ticket IDs when possible |
| `DashboardAggregator` | Merge agent status + workflow progress into unified dashboard state |

## New Renderer Components to Build

| Component | Package Dependency | Purpose |
|-----------|-------------------|---------|
| `AgentChatPanel` | `@llm-ui/react`, `@assistant-ui/react` | Render structured agent output |
| `ToolCallCard` | Custom | Visual card for each tool call (Bash, Edit, Read, etc.) |
| `FileEditDiff` | `@git-diff-view/react` | Inline diff for file edits from tool calls |
| `AgentStatusBar` | Custom | Agent name, model, status, token usage |
| `FileExplorer` | `react-arborist` | Replace current file explorer |
| `GitChangesPanel` | `@git-diff-view/react` | Sidebar git status with diffs |

## Gaps to Remedy Before Implementation

### Gap 1: Agent Teams in Print Mode — RESOLVED
**Status**: Confirmed — Agent Teams require interactive mode. Team Lead runs in tmux.
**Solution**: Team Lead in tmux (interactive, agent teams enabled). Project Owner headless via stream-json. Output for both captured via session JSONL watching.

### Gap 2: claude-workflow JSONL Tracking (MEDIUM)
**What**: Event schema partially implemented. Being updated this week (as of 2026-03-30).
**Note**: Workflow tracking is Layer 2 — independent of agent visibility (Layer 1). Agent panels work without workflow tracking. Dashboard correlates the two when data is available.
**Solution**: Flesh out event types in claude-workflow plugin. Agent visibility does not block on this.

### Gap 3: Session JSONL Format — RESOLVED
**Status**: Confirmed — session JSONL uses same structure as stream-json (assistant messages with content arrays containing text + tool_use blocks). Plugin's workflow tracking will also be updated this week.

### Gap 4: tmux Availability (LOW)
**What**: tmux may not be installed.
**Solution**: Check on app start, prompt to install via `brew install tmux`.

### Gap 5: Team Config Race Conditions (LOW)
**What**: Multiple teammates joining simultaneously could cause rapid config.json rewrites.
**Solution**: Debounce fs.watch (300ms), diff against known members set.

## Implementation Phases

| Phase | What | Dependencies |
|-------|------|-------------|
| **Phase 0** | ~~Verify session JSONL format, test Agent Teams in tmux~~ DONE | None |
| **Phase 1** | Build AgentManager + stream-json parsing for Project Owner | None |
| **Phase 2** | Build TmuxBridge + TeamWatcher for Team Lead session | Phase 1 |
| **Phase 3** | Build SessionJSONLReader for teammate output capture | Phase 2 |
| **Phase 4** | Build AgentChatPanel renderer (replace terminal view) | Phase 1 |
| **Phase 5** | Integrate react-arborist file explorer | Standalone |
| **Phase 6** | Integrate @git-diff-view/react for diffs | Standalone |
| **Phase 7** | Wire ProgressWatcher to dashboard/task board | Phase 3 |
| **Phase 8** | Flesh out claude-workflow tracking events | Standalone |
| **Phase 9** | QA pipeline integration | Phase 7 |

## Alternative: Agent SDK

Instead of spawning CLI processes, use `@anthropic-ai/claude-agent-sdk`:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
const q = query({ prompt, options: { model: 'claude-sonnet-4-6' } });
for await (const msg of q) { /* structured events */ }
```

**Trade-offs**: Tighter integration and typed interfaces, but may not support Agent Teams yet. CLI spawn is more battle-tested for this use case.

## Research Sources

- [Claude Code Headless Mode Docs](https://code.claude.com/docs/en/headless)
- [Claude Code Agent Teams Docs](https://code.claude.com/docs/en/agent-teams)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [react-arborist GitHub](https://github.com/brimdata/react-arborist) — 3.6K stars
- [@git-diff-view/react GitHub](https://github.com/MrWangJustToDo/git-diff-view)
- [@llm-ui/react](https://llm-ui.com/) — LLM output rendering
- [@assistant-ui/react](https://www.assistant-ui.com/) — Chat UI primitives
- [ansi-to-react GitHub](https://github.com/nteract/ansi-to-react) — ANSI fallback
- [ghostty-web GitHub](https://github.com/coder/ghostty-web) — Ghostty→WASM terminal
- [node-pty GitHub](https://github.com/microsoft/node-pty) — PTY for Node.js
- [node-tmux npm](https://www.npmjs.com/package/node-tmux) — tmux control from Node.js
- [format-claude-stream GitHub](https://github.com/Khan/format-claude-stream) — stream-json parser reference
- [AI Maestro GitHub](https://github.com/23blocks-OS/ai-maestro) — AMP protocol reference
- [Superset GitHub](https://github.com/superset-sh/superset) — Diff viewer reference
- [Calyx GitHub](https://github.com/yuuichieguchi/Calyx) — MCP IPC reference
- [cmux GitHub](https://github.com/manaflow-ai/cmux) — Terminal notification reference
- [Issue #24594: stream-json input format](https://github.com/anthropics/claude-code/issues/24594)
- [Issue #24596: stream-json event types](https://github.com/anthropics/claude-code/issues/24596)
