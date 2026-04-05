# Agent Dashboard View — UI Expectations & Layout Spec

**Date**: 2026-03-30
**Status**: DRAFT
**Slug**: `agent-dashboard-view`
**Style Reference**: OpenCode TUI + OpenChamber Desktop (chat-style agent output, structured tool calls, diff viewer, git sidebar)

---

## Visual References

### Primary Reference: OpenChamber (React + Tauri frontend for OpenCode)

OpenChamber is the closest existing implementation to what we're building. It's a React desktop app that renders OpenCode's structured output as a proper GUI.

**GitHub**: https://github.com/openchamber/openchamber
**Tech Stack**: React + Vite + Tauri (desktop), Ghostty-web (terminal), Pierre.js (diff viewer), PostCSS themes

**Screenshots** (reference for our UI design):

| View | URL | What to study |
|------|-----|---------------|
| Chat Interface | `https://raw.githubusercontent.com/openchamber/openchamber/main/docs/references/chat_example.png` | Message layout, tool call rendering, input area |
| Tool Output | `https://raw.githubusercontent.com/openchamber/openchamber/main/docs/references/tool_output_example.png` | How tool calls (Read, Edit, Bash) are displayed as cards |
| Diff View | `https://raw.githubusercontent.com/openchamber/openchamber/main/docs/references/diff_example.png` | Inline diff rendering, file change display |
| Settings | `https://raw.githubusercontent.com/openchamber/openchamber/main/docs/references/settings_example.png` | Settings panel layout |
| Web Version | `https://raw.githubusercontent.com/openchamber/openchamber/main/docs/references/web_version_example.png` | Full layout with sidebar + chat + panels |
| Mobile Chat | `https://raw.githubusercontent.com/openchamber/openchamber/main/docs/references/pwa_chat_example.png` | Responsive chat design |
| Mobile Diff | `https://raw.githubusercontent.com/openchamber/openchamber/main/docs/references/pwa_diff_example.png` | Responsive diff design |
| VS Code Extension | `https://raw.githubusercontent.com/openchamber/openchamber/main/packages/vscode/extension.jpg` | Sidebar integration pattern |

**Key implementation details from OpenChamber:**
- Uses `ghostty-web` for terminal rendering (Ghostty compiled to WASM)
- Uses `pierre.js` for diff viewing with syntax highlighting
- Communicates with OpenCode backend via HTTP + Server-Sent Events (SSE)
- Supports 18+ built-in themes with custom theme hot-reload via JSON
- Branchable chat timeline — undo, redo, fork from any turn
- IndexedDB for client-side caching

### Secondary Reference: OpenCode WebUI (mobile-first web interface)

**GitHub**: https://github.com/threehymns/opencode-webui
**Tech Stack**: React 19 + Vite + SSE streaming

**Demo GIFs**:
- Chat: `https://github.com/chriswritescode-dev/opencode-web/releases/download/0.3.0/Chat.gif`
- File editing: `https://github.com/chriswritescode-dev/opencode-web/releases/download/0.3.0/git-file-edit.gif`
- File context: `https://github.com/chriswritescode-dev/opencode-web/releases/download/0.2.5/file-context.gif`

Features: git diff viewer with line numbers, directory tree navigation, @filename autocomplete, plan/build mode toggle

### Additional References

| Project | URL | What to study |
|---------|-----|---------------|
| OpenCode Snapshots | https://github.com/phishy/opencode-snapshots | Session timeline, file diff before/after toggle, snapshot browser |
| OpenCode Diff Viewer Plugin | https://github.com/AruNi-01/opencode-diff-viewer | TUI diff rendering using lumen |
| Diffity | https://github.com/kamranahmedse/diffity | GitHub-style diff viewer with AI review comments, severity tags |
| OpenCode GUI (VS Code) | https://github.com/ktmage/opencode-gui | Collapsible tool calls, reasoning steps, sidebar chat |

### OpenCode Desktop Layout (reference description)

The OpenCode Desktop app arranges panels as:
- **Chat Panel** (bottom) — typing queries, AI responds with text/code diffs/action previews
- **File Explorer** (left sidebar) — tree view of project files
- **Diff Viewer** (center) — proposed changes with green/red highlighting, Accept/Reject/Undo
- **Terminal Pane** (bottom-right) — embedded shell
- **Sessions Sidebar** (right) — multi-tab parallel agents

Our layout differs because we have **multiple agents** rather than a single session, but the component patterns (chat rendering, tool call cards, diff display) should match.

---

## Overview

The Agents tab is the primary view for monitoring all Claude sessions across projects. It renders structured stream-json / session JSONL data as a chat-style UI — not raw terminal output. Every agent panel shows the same structured content: markdown messages, tool call cards, file edit diffs, task status, and errors.

---

## Layout System

### Layout Modes (user-selectable via toolbar toggle)

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar: [Layout ▾] [Project Filter ▾] [Status Filter] │
│           Single | 2-Column | 3-Column | Grid | Multi   │
└─────────────────────────────────────────────────────────┘
```

#### 1. Single (default)

Main session takes the left 60%, team lead + agents stack on the right 40%.

```
┌────────────────────────────┬──────────────────────┐
│                            │  Team Lead            │
│      Main Session          │  (compact)            │
│      (Project Owner)       ├──────────────────────┤
│                            │  Agent #1 (compact)   │
│      Full chat view        ├──────────────────────┤
│      Messages, tool calls  │  Agent #2 (compact)   │
│      Input box at bottom   ├──────────────────────┤
│                            │  Agent #3 (compact)   │
│                            ├──────────────────────┤
│                            │  ...grows vertically  │
└────────────────────────────┴──────────────────────┘
```

#### 2. Two-Column

Main and Team Lead side by side (equal width). Agents below in a scrollable row.

```
┌───────────────────────┬───────────────────────┐
│                       │                       │
│    Main Session       │    Team Lead          │
│                       │                       │
│                       │                       │
├───────┬───────┬───────┼───────┬───────┬───────┤
│ Agt 1 │ Agt 2 │ Agt 3 │ Agt 4 │ Agt 5 │ ...  │
│(compact cards, horizontally scrollable)        │
└───────┴───────┴───────┴───────┴───────┴───────┘
```

#### 3. Three-Column

Main, Team Lead, and a third column for the selected/active agent expanded.

```
┌──────────────┬──────────────┬──────────────────┐
│              │              │                  │
│  Main        │  Team Lead   │  Selected Agent  │
│  Session     │              │  (expanded)      │
│              │              │                  │
│              │              │  Full chat       │
│              │              │  Task list       │
│              │              │  Error log       │
└──────────────┴──────────────┴──────────────────┘
   Agent selector tabs/list below or in sidebar
```

#### 4. Grid

All agents in equal-sized cells. Auto-wraps based on window width.

```
┌──────────┬──────────┬──────────┬──────────┐
│  Main    │  Team    │  Agent   │  Agent   │
│  Session │  Lead    │  #1      │  #2      │
│          │          │          │          │
├──────────┼──────────┼──────────┼──────────┤
│  Agent   │  Agent   │  Agent   │  Agent   │
│  #3      │  #4      │  #5      │  #6      │
│          │          │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

#### 5. Multi-Project

Multiple projects stacked vertically, each with its own Main + Team Lead + Agents row. Horizontal scrolling within each project row.

```
┌─ Project A ─────────────────────────────────┐
│ ┌─────────┐ ┌──────────┐ ┌─────┐ ┌─────┐  │
│ │  Main   │ │ Team Lead│ │Agt 1│ │Agt 2│  │
│ └─────────┘ └──────────┘ └─────┘ └─────┘  │
├─ Project B ─────────────────────────────────┤
│ ┌─────────┐ ┌──────────┐ ┌─────┐          │
│ │  Main   │ │ Team Lead│ │Agt 1│          │
│ └─────────┘ └──────────┘ └─────┘          │
├─ Project C (no team — solo session) ────────┤
│ ┌─────────┐                                │
│ │  Main   │                                │
│ └─────────┘                                │
└─────────────────────────────────────────────┘
```

---

## Agent Panel States

Every agent panel has three states, toggled by user interaction:

### 1. Compact (default in lists/grids)

Shows minimal status at a glance. Fixed height (~120px).

```
┌──────────────────────────────────────┐
│  ● Agent #1 — component-engineer     │  ← colored dot = status
│  Model: sonnet  │  Task: #3          │
│  Status: Running │  Tokens: 12.4K    │
│                                      │
│  Last: "Implementing the FileTree    │  ← truncated last message
│  component with react-arborist..."   │
│                                      │
│  [↗ Expand]  [⬚ Popup]              │  ← action buttons
└──────────────────────────────────────┘
```

**Status dot colors:**
- 🟢 Green: Running (streaming output)
- 🔵 Blue: Idle (waiting for input / task)
- 🟡 Yellow: Needs attention (permission prompt, error recovery)
- 🔴 Red: Failed / crashed
- ⚪ Gray: Completed / shut down

### 2. Expanded (click to grow)

Panel expands in-place within the layout. Shows full agent detail with tabs.

```
┌──────────────────────────────────────────────┐
│  ● Agent #1 — component-engineer       [─ ⬚]│
│  Model: sonnet  │  Tokens: 12.4K/45.2K      │
│  Task: #3 — FileTree component               │
│  Branch: work/DASH-003/file-tree-panel       │
├──────────────────────────────────────────────┤
│  [Chat] [Tasks] [Files Changed] [Errors]     │  ← tabs
├──────────────────────────────────────────────┤
│                                              │
│  Chat Tab (default):                         │
│  ┌────────────────────────────────────────┐  │
│  │ 🤖 Let me read the task file first.   │  │
│  │                                        │  │
│  │ ┌─ Read ───────────────────────────┐  │  │
│  │ │ progress/DASH-003/tasks/         │  │  │
│  │ │ task-3.md                        │  │  │
│  │ └─────────────────────────────────┘  │  │
│  │                                        │  │
│  │ 🤖 I'll implement the FileTree        │  │
│  │ component using react-arborist...      │  │
│  │                                        │  │
│  │ ┌─ Edit ───────────────────────────┐  │  │
│  │ │ src/renderer/features/files/     │  │  │
│  │ │ components/FileTree.tsx          │  │  │
│  │ │ +42 -0  [View Diff]             │  │  │
│  │ └─────────────────────────────────┘  │  │
│  │                                        │  │
│  │ ┌─ Bash ───────────────────────────┐  │  │
│  │ │ $ npm run build                  │  │  │
│  │ │ ✓ Build succeeded (4.2s)         │  │  │
│  │ └─────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Tasks Tab:                                  │
│  ☑ Phase 0: Load rules + read task file      │
│  ☑ Phase 1: Write execution plan             │
│  ◻ Phase 2: Implement FileTree component     │  ← in progress
│  ◻ Phase 3: Self-review + npm run build      │
│  ◻ Phase 4: Report to team leader            │
│                                              │
│  Files Changed Tab:                          │
│  M  src/renderer/features/files/FileTree.tsx │
│  A  src/renderer/features/files/useFileTree.ts│
│  (click any file → diff viewer)              │
│                                              │
│  Errors Tab:                                 │
│  (empty — no errors)                         │
└──────────────────────────────────────────────┘
```

### 3. Popup (click popup button → styled modal)

A proper modal dialog with header, description, metadata bar, and tabbed content. Not a raw overlay — a designed, structured view of everything about this agent. Dismissable via Escape, close button, or clicking the backdrop.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  ┌─ Header ─────────────────────────────────────────────┐  │  │
│  │  │                                                       │  │  │
│  │  │  ● Agent #1 — component-engineer               [ ╳ ] │  │  │
│  │  │                                                       │  │  │
│  │  │  Building the FileTree component using react-arborist │  │  │
│  │  │  with live filesystem watching and drag-drop support. │  │  │
│  │  │                                                       │  │  │
│  │  │  ┌──────────┬───────────┬──────────┬───────────────┐  │  │  │
│  │  │  │ Model    │ Task      │ Branch   │ Duration      │  │  │  │
│  │  │  │ sonnet   │ #3 of 6  │ work/... │ 4m 32s        │  │  │  │
│  │  │  ├──────────┼───────────┼──────────┼───────────────┤  │  │  │
│  │  │  │ Status   │ Tokens    │ Cost     │ Files Changed │  │  │  │
│  │  │  │ Running  │ 12.4K in  │ $0.018   │ 3 files       │  │  │  │
│  │  │  │          │ 2.1K out  │          │ +142 -8       │  │  │  │
│  │  │  └──────────┴───────────┴──────────┴───────────────┘  │  │  │
│  │  │                                                       │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌─ Tabs ───────────────────────────────────────────────┐  │  │
│  │  │ [Chat] [Tasks] [Files Changed] [Errors] [Terminal]   │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌─ Tab Content ────────────────────────────────────────┐  │  │
│  │  │                                                      │  │  │
│  │  │  (content for selected tab — see below)              │  │  │
│  │  │                                                      │  │  │
│  │  │                                                      │  │  │
│  │  │                                                      │  │  │
│  │  │                                                      │  │  │
│  │  │                                                      │  │  │
│  │  │                                                      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌─ Input ─────────────────────────────────────────────┐  │  │
│  │  │ Type a message to this agent...          [Send ↵]   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
        ↑ backdrop (click to dismiss)
```

#### Popup Tab: Chat

Full scrollable conversation history. Same rendering as the expanded panel chat (markdown messages, tool call cards, file edit diffs) but with maximum vertical space. Auto-scrolls to latest message. Scroll up to browse history.

```
┌──────────────────────────────────────────────────────┐
│ 🤖  Let me read the task file first.                 │
│                                                      │
│ ┌─ Read ──────────────────────────────────────────┐  │
│ │ progress/DASH-003/tasks/task-3.md                │  │
│ │ [▸ Show content]                                │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ 🤖  I'll implement the FileTree component using      │
│     react-arborist. Here's my execution plan:        │
│                                                      │
│     1. Create FileTree.tsx with virtualized tree     │
│     2. Add useFileTree hook for fs.watch             │
│     3. Wire to sidebar via IPC                       │
│                                                      │
│ ┌─ Edit ──────────────────────────────────────────┐  │
│ │ ✏️  src/renderer/features/files/FileTree.tsx     │  │
│ │ +42 -0                                          │  │
│ │ ┌─────────────────────────────────────────────┐ │  │
│ │ │ + import { Tree } from 'react-arborist';    │ │  │
│ │ │ + import { useFileTree } from './hooks';    │ │  │
│ │ │ +                                           │ │  │
│ │ │ + export function FileTree({ root }) {      │ │  │
│ │ │ +   const { nodes } = useFileTree(root);    │ │  │
│ │ │   ... (3 more lines)                        │ │  │
│ │ └─────────────────────────────────────────────┘ │  │
│ │ [View Full Diff]                                │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ ┌─ Bash ──────────────────────────────────────────┐  │
│ │ $ npm run build                                 │  │
│ │ ┌─────────────────────────────────────────────┐ │  │
│ │ │ > tsc -b && vite build                      │ │  │
│ │ │ ✓ 247 modules transformed                   │ │  │
│ │ │ ✓ built in 4.21s                            │ │  │
│ │ └─────────────────────────────────────────────┘ │  │
│ │ ✅ Exit 0 (4.2s)                                │  │
│ └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

#### Popup Tab: Tasks

Checklist view of the agent's workflow phases. Shows progress, completion state, and time spent per phase. Draws from task file YAML (Layer 2 when available) or inferred from session activity (Layer 1).

```
┌──────────────────────────────────────────────────────┐
│  Task #3 — FileTree Component                        │
│  Assigned: component-engineer                        │
│  Acceptance Criteria: 4 items                        │
│                                                      │
│  Progress ████████████░░░░░░░░ 60%                   │
│                                                      │
│  Workflow Phases:                                    │
│  ──────────────────────────────────────────────────  │
│  ✅ Phase 0: Load rules + read task file    (0:12)   │
│  ✅ Phase 1: Write execution plan           (1:04)   │
│  🔄 Phase 2: Execute plan                  (3:16)   │  ← in progress
│     ✅ Create FileTree.tsx                           │
│     ✅ Create useFileTree.ts                         │
│     🔄 Wire to sidebar IPC                          │  ← current step
│     ◻ Add drag-drop support                         │
│  ◻ Phase 3: Self-review + build                     │
│  ◻ Phase 4: Report to team leader                   │
│                                                      │
│  Acceptance Criteria:                                │
│  ──────────────────────────────────────────────────  │
│  ✅ Renders directory tree from project root         │
│  ✅ Live updates when files change (< 300ms)         │
│  ◻ Supports expand/collapse with keyboard nav       │
│  ◻ Click file opens in editor panel                 │
└──────────────────────────────────────────────────────┘
```

#### Popup Tab: Files Changed

All files modified by this agent on its workbranch. Click any file to view the full diff inline.

```
┌──────────────────────────────────────────────────────┐
│  Branch: work/DASH-003/file-tree-panel               │
│  3 files changed  │  +142 additions  │  -8 deletions │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  A  src/renderer/features/files/FileTree.tsx │    │
│  │     +98 lines                                │    │
│  ├──────────────────────────────────────────────┤    │
│  │  A  src/renderer/features/files/useFileTree.ts│   │
│  │     +36 lines                                │    │
│  ├──────────────────────────────────────────────┤    │
│  │  M  src/renderer/features/files/index.ts     │    │
│  │     +8 -8 lines                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌─ Selected: FileTree.tsx (full diff) ───────────┐  │
│  │                                                 │  │
│  │  (rendered via @git-diff-view/react)            │  │
│  │  GitHub-style split or unified diff             │  │
│  │  Syntax highlighted, line numbers               │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

#### Popup Tab: Errors

Filtered view of only errors, warnings, and issues. Pulled from session JSONL (failed tool calls, non-zero exit codes, error messages) and workflow tracking (QA failures). Empty state shows a green checkmark.

```
┌──────────────────────────────────────────────────────┐
│  Errors & Warnings                                   │
│                                                      │
│  ┌─ Error ────────────────────────────── 12:38 PM ┐  │
│  │  ❌ Bash: npm run build                         │  │
│  │  Exit code: 2                                   │  │
│  │                                                 │  │
│  │  src/renderer/features/files/FileTree.tsx:24    │  │
│  │  Type 'string' is not assignable to type        │  │
│  │  'FileNode[]'                                   │  │
│  │                                                 │  │
│  │  [View in Chat Context]                         │  │
│  └─────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ Warning ──────────────────────────── 12:36 PM ┐  │
│  │  ⚠️  Agent attempted to edit file outside scope  │  │
│  │  src/main/services/git/git-service.ts           │  │
│  │  (reported as out-of-scope observation)         │  │
│  └─────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ QA Failure ───────────────────────── 12:42 PM ┐  │
│  │  🔴 QA Round 1: FAIL                            │  │
│  │  Missing keyboard navigation (acceptance        │  │
│  │  criterion #3 not met)                          │  │
│  │  [View QA Report]                               │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

Empty state:
┌──────────────────────────────────────────────────────┐
│                                                      │
│                  ✅ No errors                         │
│                                                      │
│           Clean run — no issues detected             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Popup Tab: Terminal (optional, escape hatch)

Raw terminal output via `ghostty-web` or `xterm.js`. Only available for tmux-backed agents (team lead + teammates). Shows the actual terminal the agent is running in. Useful for:
- Debugging when structured output misses something
- Interactive permission prompts
- Viewing subprocess output that isn't captured in session JSONL

```
┌──────────────────────────────────────────────────────┐
│  Raw Terminal — tmux pane %3                         │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  (ghostty-web / xterm.js terminal emulator)          │
│  (connected to tmux pane via pipe-pane or attach)    │
│                                                      │
│  $ claude --name coder-task-3                        │
│  ╭──────────────────────────────────────────────╮    │
│  │ Claude Code v2.1.87                          │    │
│  │ Model: claude-sonnet-4-6                     │    │
│  │                                              │    │
│  │ Let me read the task file first.             │    │
│  │                                              │    │
│  │ Read progress/DASH-003/tasks/...              │    │
│  │ ...                                          │    │
│  ╰──────────────────────────────────────────────╯    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Chat Message Components (OpenCode-style)

### Text Message

```
┌──────────────────────────────────────────┐
│ 🤖  I'll implement the FileTree          │
│     component using react-arborist.      │
│                                          │
│     The component needs to:              │
│     - Watch the filesystem recursively   │
│     - Support expand/collapse            │
│     - Show file type icons               │
│                                          │
│                            12:34:02 PM   │
└──────────────────────────────────────────┘
```

Rendered via `@llm-ui/react` for smooth streaming + `react-markdown` for formatting.

### Tool Call Card — Read

```
┌─ Read ──────────────────────────────────┐
│ 📄 src/shared/types/file-node.types.ts  │
│    Lines 1-45                           │
│    [▸ Show content]                     │  ← collapsible
└─────────────────────────────────────────┘
```

### Tool Call Card — Edit

```
┌─ Edit ──────────────────────────────────┐
│ ✏️  src/renderer/features/files/        │
│    FileTree.tsx                          │
│    +42 lines  -3 lines                  │
│                                         │
│  ┌─ Diff ─────────────────────────────┐ │
│  │ - import { Tree } from 'old-lib';  │ │
│  │ + import { Tree } from             │ │
│  │ +   'react-arborist';              │ │
│  │                                     │ │
│  │   ... (collapsed, click to expand)  │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  [View Full Diff]                       │  ← opens in diff panel
└─────────────────────────────────────────┘
```

Inline diff rendered via `@git-diff-view/react` (compact mode). Full diff opens the Diff View tab.

### Tool Call Card — Bash

```
┌─ Bash ──────────────────────────────────┐
│ $ npm run build                         │
│                                         │
│  ┌─ Output ─────────────────────────┐   │
│  │ > tsc -b && vite build           │   │
│  │ vite v6.2.0 building...          │   │
│  │ ✓ 247 modules transformed        │   │
│  │ ✓ built in 4.21s                 │   │
│  └───────────────────────────────────┘   │
│                                         │
│  ✅ Exit code: 0  (4.2s)               │
└─────────────────────────────────────────┘
```

Failed commands show red border + error highlighting.

### Tool Call Card — Agent Spawn (Team Lead only)

```
┌─ Agent Spawned ─────────────────────────┐
│ 👤 component-engineer                   │
│    Task: #3 — FileTree component        │
│    Model: sonnet                        │
│    Branch: work/DASH-003/file-tree      │
│                                         │
│  ● Running                              │
│  [View Agent Panel]                     │  ← scrolls to / opens panel
└─────────────────────────────────────────┘
```

### User Message (from PO or direct interaction)

```
┌──────────────────────────────────────────┐
│                          You  12:30 PM   │
│  Execute the plan at progress/            │
│  DASH-003/tasks/. Create an agent team   │
│  with 4 teammates using Sonnet.          │
└──────────────────────────────────────────┘
```

Right-aligned, different background color. Sent via input box at bottom of panel.

---

## Main Session Panel (Project Owner)

The main session is always the leftmost / most prominent panel. It has additional features beyond standard agent panels:

- **Input box always visible** at bottom (primary interaction point)
- **Slash command palette** — typing `/` shows available commands
- **Plan output** — `/new-plan` results render as structured cards with task breakdowns
- **Research output** — `/deep-research` results render as formatted reports
- **Send to Team Lead** button — when a plan is ready, one-click sends it to the team lead pane

```
┌──────────────────────────────────────────────┐
│  ★ Main Session — Project Owner         [⬚]  │
│  Project: gpMS_ConsoleFrontend               │
│  Model: opus  │  Tokens: 45.2K              │
├──────────────────────────────────────────────┤
│                                              │
│  (Chat messages, tool calls, plans, etc.)    │
│                                              │
│  ┌─ Plan Ready ─────────────────────────┐   │
│  │ DASH-003: Agent Dashboard View        │   │
│  │ 6 tasks across 3 waves               │   │
│  │                                       │   │
│  │ Wave 1: Schema + Service (2 tasks)    │   │
│  │ Wave 2: Components (3 tasks)          │   │
│  │ Wave 3: Integration (1 task)          │   │
│  │                                       │   │
│  │ [Send to Team Lead ▸] [View Plan]     │   │
│  └───────────────────────────────────────┘   │
│                                              │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ Type a message or /command...   [Send ↵] │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## Team Lead Panel

The team lead panel shows orchestration activity — agent spawns, QA cycles, merge operations, and team coordination. It is always the second panel (after Main).

```
┌──────────────────────────────────────────────┐
│  ◆ Team Lead                           [─ ⬚]│
│  Team: DASH-003  │  Agents: 4/4 running     │
│  Model: opus  │  Wave: 2/3                   │
├──────────────────────────────────────────────┤
│  [Chat]  [Team Status]  [QA Results]         │
├──────────────────────────────────────────────┤
│                                              │
│  Team Status Tab:                            │
│  ┌────────────────────────────────────────┐  │
│  │ Agent           Task    Status         │  │
│  │ ─────────────────────────────────────  │  │
│  │ ● coder-task-1  #1     ✅ Complete     │  │
│  │ ● coder-task-2  #2     ✅ QA Passed    │  │
│  │ ● coder-task-3  #3     🔄 Running      │  │
│  │ ● coder-task-4  #4     🔄 Running      │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  QA Results Tab:                             │
│  Task #1: PASS (3 checks passed)             │
│  Task #2: PASS (4 checks passed)             │
│  Task #3: Pending...                         │
│                                              │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ Send instruction to team lead... [Send]  │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## Sidebar Integration

The sidebar (when visible alongside Agents tab) shows:

```
┌──────────┐
│ Files    │  ← react-arborist file tree, live updating
│ ──────── │
│ 📂 src/  │
│  📂 main │
│  📂 rend │
│   ...    │
│          │
│ Changes  │  ← git status, click for diff
│ ──────── │
│ M file1  │
│ A file2  │
│ D file3  │
│          │
│ Agents   │  ← quick agent list with status dots
│ ──────── │
│ ● Main   │
│ ◆ Lead   │
│ ● Agt 1  │
│ ● Agt 2  │
│ ○ Agt 3  │
│          │
│ Tasks    │  ← ticket/task quick view
│ ──────── │
│ ☑ #1 ✓   │
│ ☑ #2 ✓   │
│ ◻ #3 ◎   │
│ ◻ #4 ◎   │
└──────────┘
```

---

## Interactions

| Action | Result |
|--------|--------|
| Click compact panel | Expand in-place (shows tabs: Chat, Tasks, Files, Errors) |
| Click `[⬚ Popup]` button | Full-screen overlay with complete agent output |
| Click `[─]` on expanded | Collapse back to compact |
| Click file in Files Changed tab | Opens diff in the Diff View panel |
| Click `[View Diff]` on Edit card | Opens inline diff or scrolls to diff panel |
| Click `[View Agent Panel]` on spawn card | Scrolls to or opens that agent's panel |
| Click `[Send to Team Lead ▸]` | Sends plan reference to team lead via tmux/stdin |
| Click agent in sidebar list | Scrolls to that agent's panel in main view |
| Type in input box + Enter | Sends message to that specific agent |
| Escape in popup | Closes popup, returns to layout view |
| Layout toggle in toolbar | Switches between Single/2-Col/3-Col/Grid/Multi |

---

## Responsive Behavior

| Window Width | Default Layout | Behavior |
|-------------|---------------|----------|
| < 1024px | Single | Main full width, agents in collapsible bottom drawer |
| 1024-1440px | Single | Main 60%, agent stack 40% |
| 1440-1920px | 2-Column | Main + Lead equal, agents below |
| > 1920px | 3-Column | Main + Lead + selected agent |

User can override default at any width.

---

## Data Sources per Panel Section

| Panel Section | Data Source | Layer |
|---------------|-----------|-------|
| Status dot + running/idle | Session JSONL (last event type) | Agent Visibility |
| Chat messages | Session JSONL (assistant + user messages) | Agent Visibility |
| Tool call cards | Session JSONL (tool_use content blocks) | Agent Visibility |
| Token usage | Session JSONL (usage fields) | Agent Visibility |
| Task list (phases) | `progress/*/tasks/task-N.md` | Workflow Tracking |
| QA results | `progress/*/proof-ledger.jsonl` | Workflow Tracking |
| Files changed | `git diff` on agent's worktree/branch | Git Service |
| Error log | Session JSONL (error events) + stderr | Agent Visibility |
| Team membership | `~/.claude/teams/*/config.json` | Agent Visibility |
| Ticket association | Correlation by team name ↔ ticket ID | Dashboard (Layer 3) |

---

## Component Library Reference

### Packages to evaluate (from research 2026-03-30)

| Category | Package | Downloads/wk | Why |
|----------|---------|-------------|-----|
| **File Tree** | `react-arborist` | 302K | Virtualized, drag-drop, inline rename, 3.6K stars |
| **File Tree** (alt) | `react-complex-tree` | 48K | More unopinionated, stronger a11y |
| **Diff Viewer** | `@git-diff-view/react` | 36K | GitHub-faithful UI, inline comments via widget system, split/unified |
| **Diff Viewer** (alt) | `react-diff-view` | 223K | Mature widget architecture for code review commenting |
| **Diff Viewer** (simple) | `react-diff-viewer-continued` | 566K | Highest adoption, good for quick before/after |
| **Editor Diff** | `@monaco-editor/react` DiffEditor | 3.9M | Full VS Code diff experience |
| **LLM Streaming** | `@llm-ui/react` + `@llm-ui/markdown` | 37K | Smooth character-by-character at native frame rate |
| **Chat UI** | `@assistant-ui/react` | Active | Composable chat primitives, streaming, auto-scroll |
| **Markdown** | `react-markdown` + `remark-gfm` | Massive | GitHub-flavored markdown |
| **Code Highlight** | `react-syntax-highlighter` | Massive | Prism.js backend, 200+ languages |
| **ANSI Fallback** | `ansi-to-react` | 187K | ANSI escape codes → React elements |
| **Terminal** | `ghostty-web` | 42K | Ghostty→WASM, xterm.js API compatible drop-in |
| **Diff (reference)** | `pierre.js` | — | Used by OpenChamber for diff rendering |

### OpenChamber's stack (closest reference implementation)

```
React + Vite (frontend)
Tauri (desktop shell — we use Electron instead)
ghostty-web (terminal rendering)
pierre.js (diff viewer)
PostCSS (18+ themes)
HTTP + SSE (backend communication — we use stream-json + JSONL)
IndexedDB (client caching)
```

### Our adapted stack

```
React 19 + Vite (existing ADC frontend)
Electron 39 (existing ADC desktop shell)
@llm-ui/react (LLM output rendering — replaces terminal)
@git-diff-view/react (diff viewer — replaces pierre.js)
react-arborist (file tree — replaces custom tree)
ghostty-web (escape hatch terminal tab only)
stream-json stdin/stdout (PO session)
session JSONL watching (team lead + teammates)
Tailwind CSS 4 (existing ADC styling)
Zustand 5 (existing ADC state)
```

---

## Raw Terminal Tab (escape hatch)

Each agent panel has an optional "Raw Terminal" tab (hidden by default, shown in popup view) that renders the actual terminal output via `ghostty-web` or `xterm.js`. This is the escape hatch for:

- Debugging when structured output doesn't capture something
- Interactive prompts (permission requests, confirmations)
- Viewing output from non-Claude processes the agent spawned

Only relevant for tmux-backed agents (team lead + teammates). The Project Owner's headless session has no terminal — only the chat UI.
