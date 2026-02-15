# Implementing Features — Team Lead Playbook

> The definitive guide for Team Lead agents orchestrating feature implementation using Claude Agent Teams. Every feature — new, refactor, or bug fix — follows this playbook.

---

## Table of Contents

1. [Lifecycle Overview](#1-lifecycle-overview)
2. [Progress Tracking (Crash-Safe)](#2-progress-tracking-crash-safe)
3. [Documentation Maintenance](#3-documentation-maintenance)
4. [Agent Teams Setup](#4-agent-teams-setup)
5. [Agent Initialization Protocol](#5-agent-initialization-protocol)
6. [QA Verification Workflow](#6-qa-verification-workflow)
7. [File & Folder Structure Reference](#7-file--folder-structure-reference)

For the QA Checklist Template, see: [`QA-CHECKLIST-TEMPLATE.md`](./QA-CHECKLIST-TEMPLATE.md)
For the Progress File Template, see: [`PROGRESS-FILE-TEMPLATE.md`](./PROGRESS-FILE-TEMPLATE.md)
For Agent Spawn Templates, see: [`AGENT-SPAWN-TEMPLATES.md`](./AGENT-SPAWN-TEMPLATES.md)

---

## 1. Lifecycle Overview

Every feature passes through these phases. No phase may be skipped.

```
PLAN ──▶ TRACK ──▶ ASSIGN ──▶ BUILD ──▶ TEST ──▶ QA ──▶ INTEGRATE ──▶ DOCUMENT
  │         │         │          │         │       │         │             │
  │         │         │          │         │       │         │             └─ Update ARCHITECTURE.md,
  │         │         │          │         │       │         │                PATTERNS.md, DATA-FLOW.md
  │         │         │          │         │       │         │
  │         │         │          │         │       │         └─ Merge worktrees, FULL TEST SUITE,
  │         │         │          │         │       │            commit, push, PR
  │         │         │          │         │       │
  │         │         │          │         │       └─ QA agent verifies ALL tests pass,
  │         │         │          │         │          then does visual testing
  │         │         │          │         │
  │         │         │          │         └─ MANDATORY: npm run lint && typecheck
  │         │         │          │            && test && build — ALL MUST PASS
  │         │         │          │
  │         │         │          └─ Agents work in isolated worktrees,
  │         │         │             use superpowers plugin for every action
  │         │         │
  │         │         └─ TeamCreate, TaskCreate with dependencies,
  │         │            spawn agents with full initialization
  │         │
  │         └─ Create progress temp file at
  │            docs/progress/<feature-name>-progress.md
  │
  └─ Read design doc, decompose into tasks,
     identify agent roles, map dependencies
```

### TEST GATE — NON-NEGOTIABLE

**At EVERY transition, the test suite MUST pass:**

```bash
# These 4 commands MUST pass before ANY completion claim
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All tests pass
npm run build        # Builds successfully
```

**Skipping tests = automatic failure. No exceptions. No excuses.**

---

## 2. Progress Tracking (Crash-Safe)

### Why This Exists

Claude Code sessions can terminate unexpectedly (terminal close, timeout, process kill). The progress file is a **crash-recovery artifact** — when a new session picks up the work, it reads this file to understand exactly where things left off.

### The Progress File

**Location**: `docs/progress/<feature-name>-progress.md`

The Team Lead MUST create this file BEFORE spawning any agents, and update it after EVERY significant state change (agent complete, agent failed, phase transition).

**When to update the progress file:**
- After creating the team and tasks
- After each agent is spawned (record worktree branch)
- After each agent completes or fails
- After each QA cycle (pass/fail)
- After integration (merge, commit)
- After documentation updates

**What goes in the progress file:**

```markdown
# Feature: <Feature Name>
**Status**: IN_PROGRESS | BLOCKED | QA_REVIEW | INTEGRATING | COMPLETE
**Team**: <team-name>
**Branch**: feature/<feature-name>
**Design Doc**: docs/plans/<design-doc>.md
**Started**: <ISO timestamp>
**Last Updated**: <ISO timestamp>

## Agent Registry
| Agent Name | Role | Worktree Branch | Task ID | Status | Notes |
|------------|------|-----------------|---------|--------|-------|
| schema-designer | Schema Designer | feature/<name>/schema | #1 | COMPLETE | Types + IPC done |
| service-eng | Service Engineer | feature/<name>/service | #2 | IN_PROGRESS | Working on auth handler |
| component-eng | Component Engineer | feature/<name>/ui | #3 | PENDING | Blocked by #2 |
| qa-review-svc | QA Reviewer | feature/<name>/service | - | PENDING | Will review #2 output |

## Task Progress
### Task #1: Define types and IPC contract [COMPLETE]
- Agent: schema-designer
- Files created: src/shared/types/foo.ts, src/shared/ipc-contract.ts (modified)
- QA: PASSED (report: <link or inline>)
- Merged to: feature/<feature-name>

### Task #2: Implement foo service [IN_PROGRESS]
- Agent: service-eng
- Files: src/main/services/foo/foo-service.ts (creating)
- Step 1/4: Service factory ✅
- Step 2/4: CRUD methods ✅
- Step 3/4: IPC handlers 🔄 (in progress)
- Step 4/4: Event emissions ⬜

### Task #3: Build FooPage component [PENDING]
- Blocked by: Task #2 (needs IPC handlers to exist)

## Blockers
- None currently

## QA Results
### Round 1 — Task #1 (schema-designer)
- Automated: lint ✅ typecheck ✅ build ✅
- Manual: All checks pass
- Verdict: APPROVED

## Recovery Notes
If resuming from crash:
1. Read this file for current state
2. Check `git worktree list` for active worktrees
3. Check TaskList for team task status
4. Resume from the first non-COMPLETE task
```

### Recovery Protocol (For New Sessions)

When a Team Lead agent starts and detects existing progress:

1. Read `docs/progress/<feature-name>-progress.md`
2. Run `git worktree list` to verify worktree state
3. Check if the team still exists (read `~/.claude/teams/<team-name>/config.json`)
4. If team exists: use `TaskList` to get current state, resume from first pending task
5. If team doesn't exist: recreate team, create remaining tasks, spawn agents for pending work
6. Update progress file with recovery timestamp

---

## 3. Documentation Maintenance

### The Rule

> Every feature that adds, modifies, or removes files MUST trigger a documentation update as the FINAL step before the feature is considered complete.

### Which Docs to Update

| Document | Location | Update When |
|----------|----------|-------------|
| `ai-docs/FEATURES-INDEX.md` | Feature/service/component inventory | New feature module, new service, new shared component/hook/store |
| `ai-docs/ARCHITECTURE.md` | System diagram, service list, IPC flow | New service, new IPC channel, new feature module, architectural change |
| `ai-docs/PATTERNS.md` | Code patterns and conventions | New pattern established, existing pattern modified |
| `ai-docs/DATA-FLOW.md` | Data flow diagrams | New data path, new event, new store, new IPC channel |
| `ai-docs/LINTING.md` | ESLint rules and fix patterns | New eslint-disable justification, new rule exception |
| `ai-docs/user-interface-flow.md` | UX flow map, component wiring | New user-facing feature, UI layout change, gap resolution |
| `ai-docs/CODEBASE-GUARDIAN.md` | File placement and naming rules | New directory, new structural pattern |
| `CLAUDE.md` | AI agent guidelines | New path alias, new tech stack entry, new convention |
| `PROGRESS.md` | Build progress tracker | Feature completed or milestone reached |

### How the Team Lead Assigns Documentation Updates

After all coding tasks and QA pass, the Team Lead:

1. Determines which docs are affected by the feature
2. Creates a documentation task: `TaskCreate` with subject "Update docs for <feature>"
3. Assigns it to an agent (typically the `codebase-guardian` or a `general-purpose` agent)
4. The documentation agent:
   - Reads ALL files created/modified in the feature
   - Updates the relevant docs to reflect the new state
   - Adds new services to ARCHITECTURE.md service list
   - Adds new IPC channels to DATA-FLOW.md
   - Adds new patterns to PATTERNS.md
   - Updates file/folder structure sections
5. Team Lead verifies docs are accurate before marking feature complete

### File/Folder Structure — Current State

```
Claude-UI/
├── CLAUDE.md                          # AI agent guidelines (update for new conventions)
├── PROGRESS.md                        # Build tracker (update on milestones)
├── ai-docs/
│   ├── ARCHITECTURE.md                # System architecture (update for new services/features)
│   ├── CODEBASE-GUARDIAN.md           # File placement + naming rules
│   ├── DATA-FLOW.md                   # Data flow diagrams (update for new IPC/events)
│   ├── FEATURES-INDEX.md              # Feature/service/component inventory
│   ├── LINTING.md                     # ESLint rules (update for new exceptions)
│   ├── PATTERNS.md                    # Code patterns (update for new conventions)
│   ├── user-interface-flow.md         # UX flow map + gap analysis
│   └── prompts/
│       └── implementing-features/     # THIS PLAYBOOK
├── docs/
│   ├── plans/                         # Design documents (one per feature)
│   └── progress/                      # Crash-safe progress files (one per active feature)
├── .claude/agents/                    # Agent prompt definitions (27 specialists)
├── hub/                               # Hub backend (Fastify + SQLite)
│   └── src/
│       ├── db/schema.sql
│       ├── routes/
│       ├── lib/
│       └── ws/
├── src/
│   ├── main/                          # Electron main process
│   │   ├── auth/                      # OAuth manager + token store + providers
│   │   ├── ipc/
│   │   │   ├── router.ts             # IPC router (Zod validation)
│   │   │   ├── index.ts              # Handler registration
│   │   │   └── handlers/             # One file per domain
│   │   ├── mcp/                       # MCP client framework
│   │   ├── mcp-servers/               # MCP server definitions (Slack, Discord, GitHub, etc.)
│   │   ├── services/                  # Business logic (one folder per domain)
│   │   └── tray/                      # System tray + hotkeys
│   ├── preload/                       # Context bridge
│   ├── renderer/                      # React app
│   │   ├── app/
│   │   │   ├── layouts/              # RootLayout, TopBar, CommandBar, Sidebar
│   │   │   ├── providers/            # QueryClient, Router providers
│   │   │   └── router.tsx            # TanStack Router route tree
│   │   ├── features/                  # Feature modules (self-contained)
│   │   │   └── <name>/
│   │   │       ├── index.ts          # Barrel exports
│   │   │       ├── api/              # React Query hooks
│   │   │       ├── components/       # React components
│   │   │       ├── hooks/            # Event hooks, custom hooks
│   │   │       └── store.ts          # Zustand store (UI state)
│   │   ├── shared/
│   │   │   ├── components/           # Shared UI components
│   │   │   ├── hooks/                # Shared hooks (useIpcEvent, etc.)
│   │   │   ├── lib/                  # Utilities (cn, ipc helper)
│   │   │   └── stores/               # Shared Zustand stores (theme, sidebar)
│   │   └── styles/globals.css        # Theme tokens + Tailwind config
│   └── shared/                        # Shared between main + renderer
│       ├── ipc-contract.ts           # THE source of truth for IPC
│       ├── constants/                 # Theme constants, route paths
│       └── types/                     # Domain type definitions
└── doc-history/                       # Archived planning docs
```

### Updating the Structure

When a feature adds new directories or files to the structure:

1. The documentation agent adds the new paths to `ai-docs/ARCHITECTURE.md` structure section
2. If a new feature module is created, add it to the features list with a brief description
3. If a new service is created, add it to the service list in ARCHITECTURE.md
4. If new IPC channels are added, add them to DATA-FLOW.md channel table
5. The Team Lead verifies the structure section matches `reality` (run `ls` commands to confirm)

---

## 4. Agent Teams Setup

### Creating the Team

```
TeamCreate:
  team_name: "<feature-name>"
  description: "Implementing <feature description>"
```

### Creating Tasks with Dependencies

Tasks MUST be created with proper `blockedBy` relationships to prevent agents from starting work before prerequisites are ready.

**Standard dependency chain:**

```
Task #1: Schema/Types (no blockers)              ← Schema Designer
Task #2: Service implementation (blocked by #1)   ← Service Engineer
Task #3: IPC handlers (blocked by #2)             ← IPC Handler Engineer
Task #4: Zustand store (blocked by #1)            ← Store Engineer
Task #5: React Query hooks (blocked by #3, #4)    ← Hook Engineer
Task #6: Components (blocked by #5)               ← Component Engineer
Task #7: Router/navigation (blocked by #6)        ← Router Engineer
Task #8: Documentation update (blocked by all)    ← Codebase Guardian
```

Parallel-safe tasks (can run simultaneously):
- Schema (#1) + Database (#2 if Hub changes needed)
- Store (#4) + Service (#2) (different files, both depend on schema)
- Components (#6) + Styling (#6b) (if separate agents)

### Worktree Strategy

Each agent SHOULD work in its own git worktree to prevent file conflicts:

```bash
# Team Lead creates worktrees before spawning agents
git worktree add ../claude-ui-schema feature/<name>/schema
git worktree add ../claude-ui-service feature/<name>/service
git worktree add ../claude-ui-ui feature/<name>/ui
```

**Exception**: If the feature is small (< 5 files), agents can share the main worktree with strict file-scope rules (no two agents edit the same file).

Record each agent's worktree in the progress file.

---

## 5. Agent Initialization Protocol

### Mandatory Initialization for EVERY Agent

When spawning any agent via the `Task` tool, the prompt MUST include:

```
## Initialization (MANDATORY — do these BEFORE any code)

1. Read `CLAUDE.md` — project rules (DO NOT SKIP)
2. Read `ai-docs/ARCHITECTURE.md` — system architecture
3. Read `ai-docs/PATTERNS.md` — code conventions
4. Read `ai-docs/LINTING.md` — ESLint rules and fix patterns

## Required Skills (USE THESE — they are NOT optional)

You MUST invoke the superpowers skills system. Before ANY action, use the appropriate skill:

- Before designing/planning: invoke `superpowers:brainstorming`
- Before writing code: invoke `superpowers:writing-plans` (plan first, code second)
- While coding: invoke `superpowers:test-driven-development` if tests exist
- When hitting bugs: invoke `superpowers:systematic-debugging`
- Before claiming done: invoke `superpowers:verification-before-completion`
- For code review: invoke `superpowers:requesting-code-review`

The skills enforce disciplined thinking. Skipping them leads to sloppy code that fails QA.

## Your Agent Definition

Read your agent prompt at `.claude/agents/<your-role>.md` for your specific:
- File scope (what you can and cannot touch)
- Code templates and patterns
- Self-review checklist
- Handoff protocol
```

### Providing Task Context

Every agent spawn MUST include:

```
## Task
<clear description of what to build/modify>

## Acceptance Criteria
- [ ] <specific, testable criterion>
- [ ] <specific, testable criterion>
- [ ] tsc --noEmit passes clean
- [ ] npm run lint passes clean

## Files to Create
- <exact path>

## Files to Modify
- <exact path> (describe what changes)

## Files to Read for Context
- <paths to existing code the agent needs to understand>

## Dependencies
- Blocked by: Task #X (<what must exist before this agent starts>)
- Blocks: Task #Y (<what depends on this agent's output>)

## QA Checklist
<include the filled-out QA-CHECKLIST-TEMPLATE.md — see section 6>
```

---

## 6. QA Verification Workflow

### The Flow

```
Coding Agent                    QA Review Agent
     │                               │
     ├─ completes work                │
     ├─ RUNS FULL TEST SUITE:         │
     │   npm run lint                 │
     │   npm run typecheck            │
     │   npm run test                 │   ◀── MANDATORY, NOT OPTIONAL
     │   npm run build                │
     │   (ALL MUST PASS)              │
     ├─ runs self-review checklist    │
     ├─ spawns QA Review Agent ──────▶│
     │   (same worktree,              ├─ RUNS FULL TEST SUITE AGAIN (independent verify)
     │    includes QA checklist)       │   npm run lint && typecheck && test && build
     │                                ├─ reads task description + QA checklist
     │                                ├─ reviews code diff
     │                                ├─ checks documentation additions
     │                                ├─ analyzes data flow + error paths
     │                                ├─ checks for performance/DRY/scalability issues
     │                                ├─ starts Electron app (npm run dev)
     │                                ├─ uses MCP electron tools to test UI
     │                                │   ├─ get_electron_window_info (verify app runs)
     │                                │   ├─ take_screenshot (visual verification)
     │                                │   ├─ get_page_structure (verify elements exist)
     │                                │   ├─ click_by_text / fill_input (user flow test)
     │                                │   ├─ read_electron_logs (check for errors)
     │                                │   └─ navigate hash routes (page transitions)
     │                                ├─ compiles QA report
     │◀── returns QA report ──────────┤
     │                                │
     ├─ if FAIL:                      │
     │   ├─ fix issues                │
     │   ├─ RUN TEST SUITE AGAIN      │
     │   ├─ spawn NEW QA agent ──────▶│  (repeat, max 3 rounds)
     │                                │
     ├─ if PASS:                      │
     │   ├─ attach QA report to       │
     │   │   task completion message   │
     │   ├─ notify Team Lead ─────────┘
     │
     └─ Team Lead marks task complete
```

### TEST SUITE IS MANDATORY — NO EXCEPTIONS

**Both the coding agent AND the QA agent must independently run the full test suite.**

If either agent skips tests, the work is REJECTED.

```bash
# The test gate that must pass:
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All unit + integration tests pass
npm run build        # Builds successfully
```

### Spawning the QA Review Agent (Coding Agent's Responsibility)

When a coding agent finishes its work, it MUST spawn a QA Review agent:

```
Task tool call:
  description: "QA review for Task #X"
  subagent_type: general-purpose
  team_name: <current team>
  name: "qa-review-task-X"
  mode: bypassPermissions
  prompt: |
    You are a QA Review Agent. Your job is to validate the work done for Task #X.

    ## Initialization
    1. Read `CLAUDE.md`
    2. Read `ai-docs/LINTING.md`
    3. Read `ai-docs/PATTERNS.md`
    4. Read `.claude/agents/qa-reviewer.md`
    5. Read `ai-docs/prompts/mcp_tools/electron_validation.md`

    ## Required Skills
    - invoke `superpowers:verification-before-completion` FIRST
    - invoke `superpowers:systematic-debugging` if issues found

    ## Task Context
    <paste the original task description and acceptance criteria>

    ## Files Changed
    <list all files the coding agent created/modified>

    ## QA Checklist
    <paste the filled QA checklist — see QA-CHECKLIST-TEMPLATE.md>

    ## Your Review Protocol

    ### Phase 1: Automated Checks
    Run these commands and record output:
    ```
    npm run lint
    npx tsc --noEmit
    npm run build
    ```
    If ANY fail, report FAIL immediately with exact error output.

    ### Phase 2: Code Review
    For every changed file:
    - Read the full file (not just the diff)
    - Check against CLAUDE.md patterns
    - Check for: unused imports, any types, hardcoded colors, missing a11y,
      floating promises, incorrect import order, missing error handling
    - Check data flow: does the IPC channel exist? Does the handler call a real service?
    - Check for performance: unnecessary re-renders, missing memoization on expensive ops
    - Check for DRYness: duplicated logic that should be extracted
    - Check for scalability: hardcoded limits, missing pagination, unbounded arrays

    ### Phase 3: Documentation Check
    - Were new files added? If yes, do barrel exports (index.ts) include them?
    - Were new IPC channels added? Are they in ipc-contract.ts?
    - Were new types added? Are they exported from the types barrel?

    ### Phase 4: Electron App Testing (MANDATORY for UI changes)
    1. Start the app: run `npm run dev` in background
    2. Wait for app to start (check logs for "ready" or similar)
    3. Use MCP electron tools:
       a. `mcp__electron__get_electron_window_info` — verify app is running
       b. `mcp__electron__take_screenshot` — visual state capture
       c. `mcp__electron__send_command_to_electron` with `get_page_structure`
       d. Navigate to the relevant page (click sidebar items)
       e. Test the specific feature: click buttons, fill forms, verify responses
       f. `mcp__electron__read_electron_logs` — check for console errors
    4. At minimum: navigate through ALL main app pages as a user would.
       Report any errors, blank pages, or broken navigation.

    ### Phase 5: QA Report
    Send your report back to the coding agent that spawned you.

    Format:
    ```
    QA REPORT: PASS | FAIL
    ═══════════════════════════════════
    Task: #X — <task name>
    Reviewed: <N> files

    Automated Checks:
      - lint: <PASS/FAIL> (<N> violations)
      - typecheck: <PASS/FAIL> (<N> errors)
      - build: <PASS/FAIL>

    Code Review:
      - TypeScript strictness: <PASS/FAIL>
      - React patterns: <PASS/FAIL>
      - Accessibility: <PASS/FAIL>
      - Design system: <PASS/FAIL>
      - Architecture: <PASS/FAIL>
      - Data flow: <PASS/FAIL>
      - Performance: <PASS/FAIL>
      - DRYness: <PASS/FAIL>

    Documentation: <PASS/FAIL>

    Electron Testing:
      - App starts: <YES/NO>
      - Screenshot captured: <YES/NO>
      - Feature tested: <YES/NO>
      - Console errors: <NONE / list>
      - Navigation: <ALL PAGES OK / issues>

    Issues Found:
      1. [SEVERITY] file:line — description — fix instruction
      2. ...

    VERDICT: APPROVED / REJECTED
    ```
```

### QA Round Limits

- **Maximum 3 QA rounds** per task
- If a task fails QA 3 times, the coding agent reports the persistent issues to the Team Lead
- The Team Lead may reassign, intervene directly, or escalate to the user

---

## 7. File & Folder Structure Reference

### Adding a New Feature Module

When a feature is being implemented from scratch:

```
src/renderer/features/<feature-name>/
├── index.ts                    # Barrel exports (public API)
├── api/
│   ├── queryKeys.ts            # React Query cache key factory
│   └── use<Feature>.ts         # Query + mutation hooks
├── components/
│   └── <Feature>Page.tsx       # Main page component
├── hooks/
│   └── use<Feature>Events.ts   # IPC event → query invalidation
└── store.ts                    # Zustand store (UI state only)
```

Corresponding backend:

```
src/main/services/<feature-name>/
└── <feature-name>-service.ts   # Service factory with business logic

src/main/ipc/handlers/
└── <feature-name>-handlers.ts  # IPC handler registration

src/shared/types/
└── <feature-name>.ts           # Domain types (if new)

src/shared/ipc-contract.ts      # Add channels + Zod schemas
```

### Adding a New IPC Channel

Checklist:

1. `src/shared/ipc-contract.ts` — Add channel with input/output Zod schemas
2. `src/main/ipc/handlers/<domain>-handlers.ts` — Add handler that calls service
3. `src/main/ipc/index.ts` — Register handler file (if new file)
4. `src/renderer/features/<name>/api/use<Feature>.ts` — Add React Query hook
5. `src/renderer/features/<name>/hooks/use<Feature>Events.ts` — Add event listener (if event channel)
6. `ai-docs/DATA-FLOW.md` — Document the new channel

### Adding a New Service

Checklist:

1. `src/main/services/<name>/<name>-service.ts` — Factory function with deps
2. `src/main/index.ts` — Instantiate service, pass deps, add to services object
3. `src/main/ipc/handlers/<name>-handlers.ts` — Register IPC handlers
4. `src/main/ipc/index.ts` — Import and register handler file
5. `src/shared/ipc-contract.ts` — Define channels
6. `ai-docs/ARCHITECTURE.md` — Add to service list
