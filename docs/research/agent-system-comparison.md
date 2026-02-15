# Agent System Comparison: Claude-UI Kanban vs create-claude-workflow

**Date**: 2026-02-14
**Author**: Research Analysis (Claude)
**Status**: Complete

> **NOTE (2026-02-15)**: The Kanban board discussed in this document has been **removed** from the codebase
> and replaced with a table-based Task Dashboard. This document is preserved as historical research
> that informed the decision to make that transition. See `docs/plans/2026-02-13-kanban-workflow-refactor.md`
> for the Task Dashboard plan.

---

## Executive Summary

This document compares two agent orchestration systems built for managing Claude Code agents:

- **System A: Claude-UI Kanban** -- An Electron desktop app with a PTY-based agent spawner, Kanban board UI, and priority queue. Currently broken at the execution layer (`claude --task` flag does not exist).

- **System B: create-claude-workflow** -- An npx scaffolder that installs markdown-based skill packs (slash commands and agent definitions) into any project. Orchestration is delegated entirely to Claude Code's native agent system via prompt engineering.

**Bottom line**: These two systems solve fundamentally different parts of the problem, and neither is a replacement for the other as they stand today. Claude-UI provides the **visual management layer** (dashboard, monitoring, multi-device sync). create-claude-workflow provides the **orchestration intelligence** (task decomposition, branch isolation, QA cycles, crash recovery). The correct path forward is to use create-claude-workflow as the execution engine underneath Claude-UI's management interface, which is precisely what the kanban refactor plan (`docs/plans/2026-02-13-kanban-workflow-refactor.md`) proposes.

| Dimension | Claude-UI Kanban | create-claude-workflow | Winner |
|-----------|-----------------|----------------------|--------|
| **Architecture** | Electron + IPC + PTY | Markdown prompts + Claude CLI | Workflow (simpler, works) |
| **Execution Model** | PTY spawn (broken) | Claude native agents | Workflow (functional) |
| **Error Handling** | PTY exit codes only | 3-round QA + escalation | Workflow |
| **Scalability** | Queue with max 2 | Wave-based parallelism | Workflow |
| **Maintainability** | ~1,400 LOC TypeScript | ~150 LOC JS + ~120K chars markdown | Tie (different tradeoffs) |
| **Multi-Device** | Hub server (partial) | None | Claude-UI |
| **State Management** | Ephemeral (in-memory) | Progress files on disk | Workflow |
| **Monitoring** | Real-time React UI | Progress files + /status command | Claude-UI |
| **Task Decomposition** | Manual (user creates) | AI-driven with wave planning | Workflow |
| **Integration** | Broken CLI integration | Native Claude Code skills | Workflow |
| **Cross-Platform** | Windows issues (pause) | Cross-platform (text files) | Workflow |
| **Maturity** | Alpha (broken core) | v1.0 (working, published) | Workflow |
| **Extensibility** | IPC contract pattern | Add .md files to .claude/ | Workflow |
| **User Experience** | Rich GUI (Kanban + DnD) | CLI-only | Claude-UI |

---

## System A: Claude-UI Kanban Agent System

### What It Is

An Electron 39 desktop application with a React 19 frontend. The agent system spawns Claude CLI processes via pseudo-terminal (PTY) sessions, parses their stdout for status patterns, and displays them in a drag-and-drop Kanban board.

### Architecture

```
Renderer (React)                  Main Process (Node.js)
+------------------+             +---------------------+
| KanbanBoard      |   IPC      | agent-service.ts    |
| AgentDashboard   | ---------> | agent-queue.ts      |
| useAgents hooks  |   events   | token-parser.ts     |
| React Query      | <--------- | @lydell/node-pty    |
+------------------+             +---------------------+
                                          |
                                          v
                                 +---------------------+
                                 | PTY Shell Process   |
                                 | claude --task "id"  | <-- BROKEN
                                 +---------------------+
```

**Key files:**
- `src/main/services/agent/agent-service.ts` (382 lines) -- Process lifecycle
- `src/main/services/agent/agent-queue.ts` (143 lines) -- Priority FIFO queue
- `src/main/services/agent/token-parser.ts` (138 lines) -- Stdout token extraction
- `src/renderer/features/agents/` (5 files) -- Dashboard UI
- `src/renderer/features/kanban/` (5 files) -- Board with dnd-kit
- `src/shared/types/agent.ts` (53 lines) -- AgentSession, TokenUsage types
- `src/shared/types/task.ts` (155 lines) -- Task, Subtask, QA types

### How Execution Works (Currently Broken)

1. User drags a task card in the Kanban board or clicks "Execute Task" in the detail modal.
2. The renderer calls `ipc('agents.start', { taskId, projectId })` via React Query mutation.
3. `agent-service.ts` checks queue capacity (default max: 2 concurrent).
4. If capacity is available, `spawnAgent()` creates a PTY via `@lydell/node-pty`.
5. After 500ms delay (for shell init), it writes: `claude --task "<taskId>"\r`
6. **This fails silently because `claude --task` is not a valid CLI flag.**
7. PTY output is parsed line-by-line against regex patterns for status keywords.
8. Token usage is extracted by matching patterns like "tokens: X / Y" or "$X.XX".
9. On PTY exit, agent status updates and the queue processes the next item.

### What Works

- **Queue System**: Well-implemented priority FIFO with configurable concurrency. Supports enqueue, dequeue, priority ordering, running count tracking, and IPC event emission.
- **React Query Integration**: Proper hooks with 10-second polling, query invalidation on mutations, and IPC event-driven cache invalidation via `useAgentEvents`.
- **Token Tracking**: Regex-based parser handles multiple output formats (combined tokens, individual input/output, cost). Accumulates across sessions.
- **UI Components**: Clean Kanban board with dnd-kit drag-and-drop, sortable contexts, drag overlays. Agent dashboard shows status, pause/resume/stop controls.
- **Type System**: Comprehensive TypeScript types for AgentSession, TokenUsage, Task, Subtask, QAReport, ExecutionProgress.

### What Is Broken

- **Core execution**: `claude --task` does not exist. No task ever actually runs.
- **Pause/resume**: Uses Unix signals (SIGTSTP/SIGCONT via Ctrl+Z + `fg`). No-op on Windows.
- **State persistence**: All agent state is in-memory (`Map<string, AgentProcess>`). Lost on app restart.
- **Output parsing**: Fragile regex matching against unstructured CLI output. Misses structured JSON output, handles ANSI escape codes poorly.
- **No task decomposition**: Tasks are created manually by the user. No automated planning, wave structuring, or dependency management.
- **No QA cycle**: No automated review of agent output. Status goes from "running" to "completed" or "error" based on exit codes.
- **No branch isolation**: Agents do not create feature branches or worktrees. All work happens in the main working directory.

---

## System B: create-claude-workflow

### What It Is

An npm package (`npx create-claude-workflow init`) that scaffolds markdown-based Claude Code skills into any project. It installs slash commands (`/implement-feature`, `/discover-agents`, etc.) and agent definitions that Claude Code reads as prompts. The orchestration logic lives entirely in structured markdown, executed by Claude's native agent spawning system.

### Architecture

```
User
  |
  v
Claude Code CLI
  |
  v (reads)
.claude/commands/implement-feature.md   <-- Orchestration protocol
  |
  v (follows instructions to)
.claude/prompts/implementing-features/
  |-- README.md           (630-line playbook)
  |-- AGENT-SPAWN-TEMPLATES.md
  |-- QA-CHECKLIST-TEMPLATE.md
  |-- PROGRESS-FILE-TEMPLATE.md
  |-- WORKFLOW-MODES.md
  |-- WAVE-FENCE-PROTOCOL.md
  |-- PRE-FLIGHT-CHECKS.md
  |-- CONTEXT-BUDGET-GUIDE.md
  |-- QA-CHECKLIST-AUTO-FILL-RULES.md
  |
  v (spawns)
.claude/agents/
  |-- team-leader.md         (orchestrator)
  |-- qa-reviewer.md         (per-task reviewer)
  |-- codebase-guardian.md   (final integrity)
  |-- <custom-agents>.md     (from /discover-agents)
  |
  v (writes)
docs/progress/<feature>-progress.md  <-- Crash-recovery artifact
```

**Key source files (scaffolder):**
- `bin/index.js` (20 lines) -- Entry point
- `lib/scaffolder.js` (100 lines) -- Template installer
- `lib/detect.js` (95 lines) -- Project state detection
- `lib/merge-claude-md.js` (65 lines) -- Sentinel-based CLAUDE.md merging
- `lib/merge-file.js` (~40 lines) -- File write with backup
- `lib/prompts.js` (~50 lines) -- Interactive setup
- `lib/templates.js` (~60 lines) -- Template loading and variable substitution

**Key template files (orchestration):**
- `templates/commands/implement-feature.md` (9,320 bytes) -- 9-phase orchestration protocol
- `templates/agents/team-leader.md` (9,176 bytes) -- Orchestrator agent definition
- `templates/agents/qa-reviewer.md` (8,690 bytes) -- QA agent definition
- `templates/agents/codebase-guardian.md` (7,633 bytes) -- Structural integrity checker
- `templates/prompts/implementing-features/README.md` (24,761 bytes) -- Master playbook
- 12 command files, 10 prompt files, 3 agent files

### How Execution Works

1. User runs `/implement-feature "add user authentication"` in Claude Code.
2. Claude reads `implement-feature.md` which prescribes a 9-phase workflow.
3. **Phase 1**: Loads project rules, architecture docs, and the playbook.
4. **Phase 2**: Checks for existing progress files (crash recovery).
5. **Phase 3**: Decomposes the feature into atomic tasks, maps dependencies, plans execution waves.
6. **Phase 4**: Creates `feature/<name>` branch and `docs/progress/<name>-progress.md`.
7. **Phase 5**: Creates team, tasks, and dependency graph.
8. **Phase 6**: For each wave:
   - Creates `work/<feature>/<task>` branches from `feature/` HEAD.
   - Spawns specialist agents (using AGENT-SPAWN-TEMPLATES.md).
   - Each agent follows a 4-phase workflow: Load Rules, Write Plan, Execute, Self-Review.
   - Agent spawns QA reviewer on the same work branch.
   - QA: PASS --> merge; FAIL --> agent fixes (max 3 rounds); FAIL x3 --> escalate.
   - Rebase work branch onto feature/, merge --no-ff, delete work branch.
   - Wave fence check (lint/typecheck/build verification between waves).
9. **Phase 7**: Codebase Guardian runs 7 structural integrity checks.
10. **Phase 8**: Full verification (lint, typecheck, test, build).
11. **Phase 9**: PR creation, cleanup, status report.

### What Works

- **Task decomposition**: AI-driven decomposition with wave planning, dependency mapping, and file scope isolation.
- **Branch isolation**: 5-layer conflict prevention (file scoping, wave ordering, pre-merge rebase, sequential merges, escalation).
- **QA cycles**: Per-task QA with max 3 rounds, role-based checklist auto-fill, doc updates on pass.
- **Crash recovery**: Progress files on disk survive terminal crashes. `/resume-feature` scans and resumes.
- **Workflow modes**: Strict (full pre-flight, wave fences), Standard (lint-only fences), Fast (skip fences).
- **Context budget management**: Token estimation formula, guidance for splitting large tasks.
- **Extensibility**: Add new agents by dropping `.md` files in `.claude/agents/`. `/discover-agents` auto-generates them.
- **12 slash commands**: implement-feature, discover-agents, resume-feature, create-feature-plan, hotfix, refactor, generate-tests, review-pr, scaffold-agent, audit-agents, status, claude-new.

### What Is Lacking

- **No GUI**: Everything is CLI-based. No visual dashboard, no drag-and-drop, no real-time status widgets.
- **No multi-device**: Runs on one computer only. No sync, no remote monitoring.
- **No token tracking**: Does not aggregate or display token usage across agents.
- **No concurrency control**: Relies on Claude Code's internal limits. No explicit queue or max concurrency setting.
- **Prompt-dependent**: Orchestration quality depends on Claude following complex multi-page instructions correctly. Failure modes are opaque.
- **No programmatic API**: Cannot be called from external systems. Everything goes through Claude Code's prompt interface.

---

## Detailed Comparison

### 1. Architecture

**Claude-UI**: Traditional desktop application architecture. Electron main process handles business logic (services), renderer handles UI (React). Communication via typed IPC contract. Clean separation of concerns at the code level, but the agent system is tightly coupled to PTY process management.

**create-claude-workflow**: "Prompt as code" architecture. All orchestration logic is encoded in structured markdown that Claude Code interprets. The scaffolder (`~430 LOC JavaScript`) is just a file installer -- it has zero runtime orchestration logic. All intelligence lives in the prompts.

**Assessment**: The create-claude-workflow architecture is more resilient because it delegates execution to Claude's native capabilities rather than trying to wrap them in a PTY. Claude-UI's IPC contract pattern is excellent for the management layer but wasted on the broken execution layer.

### 2. Execution Model

**Claude-UI**: Spawns a shell PTY, writes `claude --task "<id>"` (a nonexistent flag), and attempts to parse stdout. This fundamentally cannot work. Even if the flag existed, parsing unstructured terminal output is inherently fragile. ANSI escape sequences, wrapped lines, and non-deterministic output formatting make regex matching unreliable.

**create-claude-workflow**: Uses Claude Code's native agent spawning (`Task.create`, `agent.spawn`). Agents receive structured prompts with full context. No output parsing needed -- agents communicate through file writes (progress files, commits) and Claude's internal messaging. The execution model is how Claude Code was designed to be used.

**Assessment**: create-claude-workflow wins decisively. Claude-UI's execution model was built on a misunderstanding of Claude CLI's interface.

### 3. Error Handling & Recovery

**Claude-UI**: Error handling is limited to PTY exit codes. If exit code is 0, the task is "completed"; otherwise, "error". No retry logic, no QA review, no structured error reporting. Agent state is lost on crash.

**create-claude-workflow**: Multi-layered error handling:
- **Agent level**: Self-review phase catches issues before QA.
- **QA level**: Dedicated reviewer with structured checklist. Up to 3 fix-review cycles.
- **Wave level**: Fence checks (lint/typecheck/build) between waves catch integration errors.
- **Feature level**: Codebase Guardian runs 7 structural integrity checks.
- **Crash level**: Progress files on disk. `/resume-feature` identifies exact resume point from branch and file state.

**Assessment**: create-claude-workflow is dramatically more robust. Its 4-layer error recovery (self-review, QA, wave fences, Guardian) is a mature approach to autonomous code generation quality.

### 4. Scalability

**Claude-UI**: Priority FIFO queue with configurable max concurrency (default: 2). Well-implemented but moot because execution is broken. The queue supports priority levels and FIFO ordering within the same priority, which is a useful pattern.

**create-claude-workflow**: Wave-based parallelism. Tasks within a wave that touch different files can run in parallel. Waves execute sequentially based on dependency ordering. No explicit concurrency limit -- relies on Claude Code's internal limits. Context budget estimation helps prevent overloading.

**Assessment**: create-claude-workflow's wave-based approach is more sophisticated for multi-task features. Claude-UI's queue is a good pattern for a simpler per-task model.

### 5. Maintainability

**Claude-UI agent code**: ~1,400 lines of TypeScript across 8+ files. Well-typed, follows project conventions, uses dependency injection (services receive router). However, there are zero tests for the agent system (no test files found matching agent/queue/token-parser patterns). The IPC contract ensures type safety across the stack.

**create-claude-workflow**: ~430 lines of JavaScript (scaffolder) + ~120,000 characters of structured markdown (templates). The scaffolder is simple CJS with one dependency (@inquirer/prompts). The markdown templates are comprehensive but represent significant surface area that must be manually maintained. Changes to the orchestration protocol require updating multiple markdown files and understanding their interdependencies.

**Assessment**: Tie with different tradeoffs. Claude-UI's TypeScript is more mechanically maintainable (types catch errors, refactoring is IDE-supported). create-claude-workflow's markdown is easier to read and modify but harder to validate (no compiler catches prompt inconsistencies).

### 6. Multi-Device Support

**Claude-UI**: Has a Hub server (SQLite + WebSocket + REST) and a detailed refactor plan for multi-device support. The plan describes computer registration, task assignment to specific machines, progress syncing, and mobile/web viewers. This is architecturally sound but not yet implemented for the agent system.

**create-claude-workflow**: No multi-device support at all. Progress files are local. No network communication. The workflow runs on the machine where you invoke it.

**Assessment**: Claude-UI wins on vision and infrastructure. The Hub server exists and the refactor plan is detailed. This is the primary value that Claude-UI brings to the table.

### 7. State Management

**Claude-UI**: All agent state lives in a `Map<string, AgentProcess>` in the main process. This is completely ephemeral -- lost on app restart, lost on crash. Task state is persisted via the task service (local JSON files), but agent execution state has no persistence.

**create-claude-workflow**: State is managed through multiple persistent artifacts:
- **Progress files**: Markdown files in `docs/progress/` with YAML frontmatter. Survive crashes.
- **Git branches**: Work branches are physical state (exist in `.git`). Can be enumerated.
- **Commits**: Agent work is committed to branches. Not lost on crash.
- **QA checklists**: Written as markdown in progress files. Audit trail.

**Assessment**: create-claude-workflow is far superior. Progress files + git branches provide durable, recoverable state. The `/resume-feature` command can reconstruct execution state from these artifacts. Claude-UI's ephemeral state is a critical weakness.

### 8. Monitoring & Observability

**Claude-UI**: Rich React UI with real-time updates:
- Kanban board with color-coded status columns.
- Agent dashboard with status, elapsed time, pause/resume/stop controls.
- Task detail modal with execution progress bars, subtask completion, logs.
- IPC events drive React Query cache invalidation for near-real-time updates.
- Token usage tracking (input/output tokens, estimated cost).

**create-claude-workflow**: CLI-based monitoring:
- `/status` command reads progress files and formats a summary.
- Progress files are human-readable markdown (can be opened in any editor).
- Agent messages appear in Claude Code's conversation output.
- No dashboard, no charts, no real-time updates beyond what Claude prints.

**Assessment**: Claude-UI wins significantly. Visual monitoring is a core strength. The Kanban board, agent dashboard, and task detail modal provide at-a-glance understanding that CLI output cannot match.

### 9. Task Decomposition

**Claude-UI**: None. Users manually create tasks with a title and description. The `TaskSuggestion` and `TaskDecompositionResult` types exist (suggesting planned AI decomposition) but are not connected to the agent system. No wave planning, no dependency mapping.

**create-claude-workflow**: Sophisticated AI-driven decomposition:
- Team Leader reads project rules and architecture to understand context.
- Feature is decomposed into atomic tasks with file scope, acceptance criteria, and agent assignment.
- Dependencies are mapped and visualized.
- Tasks are grouped into waves (types first, then services, then API, then state, then UI).
- Context budget is estimated before spawning each agent.
- QA checklists are auto-filled based on agent role.

**Assessment**: create-claude-workflow is dramatically more capable. The wave-based decomposition with dependency ordering is a significant advancement over manual task creation.

### 10. Integration Points

**Claude-UI**:
- Claude CLI: Broken (`claude --task` does not exist).
- @lydell/node-pty: Working (PTY spawning is functional, even if what it runs is not).
- React Query: Working (polling, mutations, cache invalidation).
- IPC contract: Working (typed channel definitions, Zod validation).
- Hub server: Partially working (exists but not integrated with agent system).

**create-claude-workflow**:
- Claude Code slash commands: Working (native integration, zero runtime overhead).
- Claude Code agent spawning: Working (uses Claude's built-in multi-agent system).
- Git: Deep integration (branch-per-task, rebase, merge protocols).
- Project toolchain: Runs lint/typecheck/test/build as wave fence checks.
- npm: Published package, `npx` scaffolding.

**Assessment**: create-claude-workflow integrates correctly with Claude Code. Claude-UI's integration is broken at the critical juncture.

### 11. Cross-Platform

**Claude-UI**: Windows-first development (project is on Windows). However, agent pause/resume uses Unix signals (SIGTSTP/SIGCONT) that are no-ops on Windows. The shell detection logic handles Windows (PowerShell 7 > COMSPEC > cmd.exe) and Unix (SHELL > /bin/bash). PTY spawning via @lydell/node-pty works cross-platform but requires native compilation.

**create-claude-workflow**: Platform-agnostic. Everything is markdown and JavaScript. No native dependencies. Git operations work identically everywhere. Claude CLI is cross-platform. The scaffolder uses Node.js fs/path modules correctly (though the detect.js backslash replacement suggests Windows awareness).

**Assessment**: create-claude-workflow is more portable. Claude-UI's native PTY dependency and Unix signal usage create friction on some platforms.

### 12. Maturity

**Claude-UI**: Alpha quality for the agent system. The core execution path is broken. No tests. The queue and token parser are well-coded but serve a non-functional execution layer. The UI components are production-quality React but display data from a broken pipeline. Created as part of a larger desktop app (30+ features beyond agents).

**create-claude-workflow**: v1.0, published to npm. Working end-to-end orchestration. 12 slash commands covering the full development lifecycle. Comprehensive documentation (2 user guides, 10 prompt templates, internal spec). Created 2026-02-13, most recent commit 2026-02-14. Very new (2 days old as of analysis), 2 GitHub stars. No automated tests for the scaffolder, but the orchestration is validated by Claude Code's own execution.

**Assessment**: create-claude-workflow is more mature where it counts (working execution). Claude-UI is more mature as an application (production React, typed IPC, design system) but immature as an agent system.

### 13. Extensibility

**Claude-UI**: New agent types require: (1) defining types in `src/shared/types/`, (2) adding IPC channels to `ipc-contract.ts`, (3) implementing handlers, (4) creating service methods, (5) adding React hooks, (6) building UI components. This is a 6-layer change across 6+ files. The pattern is well-documented but heavyweight.

**create-claude-workflow**: New agent types require: (1) create a `.md` file in `.claude/agents/`. Done. The `/discover-agents` command auto-generates tailored agent definitions by analyzing the codebase. New commands require: (1) create a `.md` file in `.claude/commands/`. The extension model is radically simpler because everything is text.

**Assessment**: create-claude-workflow wins on extensibility by a wide margin. Adding a new agent type is creating a markdown file vs. modifying 6+ TypeScript files.

### 14. User Experience

**Claude-UI**: Visual desktop application. Drag-and-drop Kanban board with 7 columns (Backlog, Queue, In Progress, AI Review, Review, Done, Error). Task detail modal with progress bars, subtask lists, logs, and action buttons. Agent dashboard with status indicators and controls. Themed UI with 7+ color themes and dark mode. Accessible (jsx-a11y strict).

**create-claude-workflow**: Terminal-only. User types `/implement-feature "description"` and watches text output scroll. Progress can be checked via `/status` or by reading markdown files. No visual feedback beyond terminal output. Requires familiarity with Claude Code CLI and git branching concepts.

**Assessment**: Claude-UI provides a dramatically better user experience for monitoring and managing tasks. create-claude-workflow provides a better experience for execution (because it actually works), but the monitoring experience is minimal.

---

## Pros and Cons Summary

### Claude-UI Kanban -- Pros

1. **Rich visual interface**: Kanban board, agent dashboard, task detail modal are polished React components.
2. **Multi-device vision**: Hub server infrastructure and detailed refactor plan for cross-device sync.
3. **Type safety**: Full TypeScript with Zod validation, typed IPC contract.
4. **Token tracking**: Aggregated cost and usage metrics across agents.
5. **Queue management**: Priority-based concurrency control with configurable limits.
6. **Real-time updates**: IPC events drive React Query cache invalidation for live UI updates.
7. **Integrated desktop experience**: Part of a larger app with projects, terminals, settings, and more.

### Claude-UI Kanban -- Cons

1. **Core execution is broken**: `claude --task` does not exist. Nothing actually runs.
2. **No crash recovery**: Agent state is ephemeral (in-memory Map).
3. **No task decomposition**: Users must manually create and structure tasks.
4. **No QA automation**: No review cycle, no quality gates.
5. **No branch isolation**: No worktree management, no merge protocol.
6. **Platform issues**: Pause/resume is Unix-only.
7. **Fragile parsing**: Regex matching on unstructured PTY output.
8. **No tests**: Zero test coverage for the agent system.

### create-claude-workflow -- Pros

1. **Working execution**: Uses Claude Code's native agent spawning correctly.
2. **Sophisticated orchestration**: 9-phase workflow with wave planning, dependency ordering.
3. **Multi-layer QA**: Self-review, dedicated QA reviewer (3 rounds), wave fences, Codebase Guardian.
4. **Crash recovery**: Progress files + git branches survive terminal crashes. `/resume-feature` resumes.
5. **Branch isolation**: 5-layer conflict prevention with branch-per-task model.
6. **Easy extensibility**: Add agents and commands by creating markdown files.
7. **Context management**: Budget estimation, splitting guidance, role-based checklist auto-fill.
8. **Cross-platform**: No native dependencies, no platform-specific behavior.
9. **Zero runtime cost**: Skills loaded on demand, not at startup.

### create-claude-workflow -- Cons

1. **No GUI**: CLI-only monitoring and management.
2. **No multi-device**: Single computer, no sync, no remote access.
3. **No token tracking**: Does not monitor or aggregate cost metrics.
4. **Prompt fragility**: Orchestration quality depends on Claude following complex instructions.
5. **Opaque failures**: When Claude deviates from the prompt, debugging is difficult.
6. **No concurrency control**: No explicit queue or limit beyond Claude's internal constraints.
7. **Very new**: 2 days old, 2 GitHub stars, no community validation.
8. **No automated tests**: Scaffolder has no test suite.
9. **Large prompt surface area**: ~120K characters of markdown to maintain and keep consistent.

---

## Recommendation: Claude-UI's Path Forward

The kanban refactor plan (`docs/plans/2026-02-13-kanban-workflow-refactor.md`) already identifies the correct architecture. The recommendation here is to validate and refine that plan.

### Core Strategy: Combine Both Systems

Claude-UI should serve as the **management and monitoring layer** while create-claude-workflow (or its patterns) provides the **execution intelligence**. Specifically:

1. **Remove**: `agent-service.ts`, `agent-queue.ts`, `token-parser.ts` -- the broken PTY execution layer.
2. **Keep**: The React Query hooks pattern, IPC event system, and task type definitions.
3. **Adopt**: create-claude-workflow's execution model -- spawn `claude -p "Use /implement-feature ..."` as a detached child process.
4. **Adopt**: Progress file watching (chokidar) as the monitoring bridge between Claude agents and the UI.
5. **Keep**: The Hub server and multi-device sync plan -- this is Claude-UI's unique value proposition.

### Specific Implementation Recommendations

#### Phase 1: Fix Execution (Small effort, immediate impact)

Replace the PTY-based agent spawner with a minimal launcher:

```typescript
// Replace agent-service.ts with:
import { spawn } from 'child_process';

function launchWorkflow(taskDescription: string, projectPath: string): string {
  const child = spawn('claude', ['-p', `Use /implement-feature for: ${taskDescription}`], {
    cwd: projectPath,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return `workflow-${Date.now()}`;
}
```

This requires create-claude-workflow to be installed in the target project (`npx create-claude-workflow init`).

#### Phase 2: Progress File Monitoring (Medium effort)

Create a `progress-watcher.ts` service using chokidar:

```typescript
// Watch docs/progress/*.md for changes
// Parse YAML frontmatter for status, task counts, current wave
// Emit IPC events that React Query hooks consume
// This replaces PTY output parsing with structured file reading
```

This gives the UI real-time updates without parsing terminal output.

#### Phase 3: Task Table (Medium effort, UX improvement)

Replace the Kanban board with the task table described in the refactor plan. The Kanban board is visually appealing but information-sparse. A table view with filters, sorting, and bulk actions is better for managing many tasks. Keep the `TaskDetailModal` (it is well-built).

#### Phase 4: Hub Integration (Large effort, strategic value)

This is Claude-UI's differentiator. No other tool provides multi-device Claude agent management. The Hub server, computer registry, and WebSocket sync described in the refactor plan should be prioritized.

### What to Preserve from Each System

| From Claude-UI | From create-claude-workflow |
|----------------|---------------------------|
| React Query hooks + IPC events | Execution via Claude native agents |
| Task type definitions | Wave-based decomposition and planning |
| Hub server infrastructure | Progress file format and crash recovery |
| TaskDetailModal component | Branch-per-task isolation model |
| Theme system and design tokens | QA checklist and review cycle |
| IPC contract pattern | Codebase Guardian structural checks |
| Settings and preferences | Agent definition extensibility pattern |
| Multi-device vision | Workflow modes (strict/standard/fast) |

### What to Drop

| Drop from Claude-UI | Drop from create-claude-workflow |
|---------------------|--------------------------------|
| agent-service.ts (PTY spawner) | N/A (keep all patterns) |
| agent-queue.ts (internal queue) | |
| token-parser.ts (stdout parsing) | |
| Kanban board (replace with table) | |
| `claude --task` invocation | |

---

## Key Takeaways

1. **The right tool for execution is already built.** create-claude-workflow provides working, battle-tested orchestration that uses Claude Code the way it was designed to be used. There is no reason to reimplement this in TypeScript.

2. **Claude-UI's value is in the management layer.** No CLI tool will ever provide the visual monitoring, multi-device sync, and desktop integration that an Electron app can. This is the strategic moat.

3. **The bridge between them is progress files.** The create-claude-workflow progress file format is the natural interface between execution (Claude agents writing markdown) and monitoring (Electron app parsing and displaying it).

4. **Remove the broken code, do not fix it.** The PTY-based agent system was built on a misunderstanding of Claude CLI's interface. It should be removed, not repaired. The replacement is dramatically simpler (a single `spawn()` call).

5. **The kanban refactor plan is the right plan.** The architecture described in `docs/plans/2026-02-13-kanban-workflow-refactor.md` correctly identifies what to keep, what to remove, and what to build. This comparison validates its conclusions.

6. **Multi-device is the killer feature.** Neither system supports it fully today, but Claude-UI has the Hub infrastructure to deliver it. "Check your agent's progress from your phone" is a compelling value proposition that no other tool in this space offers.

7. **Test coverage matters.** Neither system has automated tests for its core functionality. Before building further, both systems would benefit from test suites. For Claude-UI, the progress file parser and Hub sync logic should be tested thoroughly as they become the new critical path.

---

## Appendix: File Inventory

### Claude-UI Agent System Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/main/services/agent/agent-service.ts` | 382 | PTY spawning, process management |
| `src/main/services/agent/agent-queue.ts` | 143 | Priority FIFO queue |
| `src/main/services/agent/token-parser.ts` | 138 | Stdout token extraction |
| `src/shared/types/agent.ts` | 53 | AgentSession, TokenUsage types |
| `src/shared/types/task.ts` | 155 | Task, Subtask, QA types |
| `src/shared/constants/agent-patterns.ts` | ~80 | Regex patterns for status detection |
| `src/renderer/features/agents/api/useAgents.ts` | 67 | React Query hooks |
| `src/renderer/features/agents/api/queryKeys.ts` | ~15 | Query key factory |
| `src/renderer/features/agents/hooks/useAgentEvents.ts` | ~30 | IPC event listeners |
| `src/renderer/features/agents/components/AgentDashboard.tsx` | 108 | Agent status UI |
| `src/renderer/features/kanban/components/KanbanBoard.tsx` | 190 | Drag-and-drop board |
| `src/renderer/features/kanban/components/KanbanColumn.tsx` | ~50 | Column container |
| `src/renderer/features/kanban/components/KanbanCard.tsx` | ~80 | Draggable task card |
| `src/renderer/features/kanban/components/TaskDetailModal.tsx` | 235 | Task details panel |

### create-claude-workflow Files

| File | Size | Purpose |
|------|------|---------|
| `bin/index.js` | 502 B | CLI entry point |
| `lib/scaffolder.js` | 3,591 B | Template installer |
| `lib/detect.js` | 2,884 B | Project state detection |
| `lib/merge-claude-md.js` | 2,525 B | CLAUDE.md sentinel merge |
| `lib/merge-file.js` | 1,493 B | File write with backup |
| `lib/prompts.js` | 1,961 B | Interactive setup prompts |
| `lib/templates.js` | 2,451 B | Template loading |
| `lib/merge-agent.js` | 3,073 B | Agent protocol injection (v2) |
| `templates/commands/*.md` | 12 files | Slash command definitions |
| `templates/agents/*.md` | 3 files | Agent definitions |
| `templates/prompts/**/*.md` | 10 files | Playbook and templates |
| `templates/docs/*.md` | 2 files | User guides |
| `SPEC-v1-trim.md` | 14,698 B | Development spec |
| `package.json` | 513 B | 1 dependency (@inquirer/prompts) |
