---
name: adc-qa-review
description: ADC-specific QA review skill for wave-scoped task review. Use when reviewing code changes from agent-team tasks — runs incremental lint/typecheck on changed files only, validates against ADC architecture and design system rules. Replaces full-codebase npm run lint/typecheck/build with targeted checks.
---

# ADC QA Review Skill

Lean, targeted QA review for ADC agent-team tasks. Reviews 1-5 tasks per wave against ADC-specific rules. Runs incremental checks (changed files only), not full codebase scans.

## When to Use

- After a coder agent reports task completion in an agent-team wave
- When reviewing multiple tasks within a single wave
- Instead of running `npm run lint` / `npm run typecheck` against the full codebase

## Incremental Check Commands

### 1. Get Changed Files

```bash
# From worktree — files changed vs feature branch
git diff --name-only HEAD~1 -- '*.ts' '*.tsx'

# Or from feature branch — files changed in this wave
git diff --name-only <merge-base>..HEAD -- '*.ts' '*.tsx'
```

### 2. Lint Only Changed Files

```bash
# Lint specific files (not full codebase)
npx eslint <file1.ts> <file2.tsx> <file3.ts>
```

### 3. Typecheck (full — tsc doesn't support file-level checks)

```bash
# Typecheck is project-wide but fast (~3s on ADC)
npx tsc --noEmit
```

### 4. Build Check (only if structural changes)

```bash
# Only run if new exports, new files, or barrel changes
npm run build
```

**Skip build if** the task only modified existing file contents without adding/removing exports.

## ADC-Specific Review Checklist

For each changed file, check **only the rules that apply** to the file type:

### Renderer Components (*.tsx in features/ or shared/ui/)
- [ ] Uses @ui primitives — no raw `<button>`, `<input>`, `<label>`, `<h1>`-`<h4>`, `<p>`
- [ ] `<Heading>` from @ui for headings, `<Text>` for paragraphs
- [ ] Named function declarations (not arrow exports)
- [ ] Props interface defined with specific types
- [ ] Ternary for conditional rendering (not `&&`)
- [ ] Explicit `> 0` for number-as-boolean
- [ ] `void` operator for floating promises
- [ ] No hardcoded colors — theme-aware Tailwind only
- [ ] `cn()` for class merging
- [ ] `data-testid` on root element (for composition/data-display components)

### Main Process Services (*.ts in main/)
- [ ] `node:` protocol for Node.js builtins
- [ ] Factory pattern with injected dependencies
- [ ] Synchronous return values (not Promises for DB queries)
- [ ] Events emitted after mutations

### Shared IPC (*.ts in shared/ipc/)
- [ ] Zod schemas match TypeScript types
- [ ] Channel naming: `domain.action` for invoke, `event:domain.eventName` for events
- [ ] Contract entry in domain contract.ts

### E2E Tests (*.spec.ts in tests/e2e/)
- [ ] Imports from `./electron.setup`
- [ ] `test.afterEach()` cleanup hook present
- [ ] POM classes used for navigation (when available)
- [ ] Console error assertion as final test
- [ ] Graceful skip when prerequisites missing
- [ ] No programmatic navigation — real clicks only

### All Files
- [ ] No `any` types (use `unknown` + narrowing)
- [ ] `import type` for type-only imports
- [ ] No unused imports/variables
- [ ] No commented-out code or TODOs without issue reference
- [ ] File under size limit (300 component, 500 service, 200 handler)

## Wave-Scoped Review Pattern

When reviewing multiple tasks in a single wave:

1. **Collect all changed files** across all tasks in the wave
2. **Run incremental lint once** on the full set of changed files
3. **Run typecheck once** (project-wide, but only once per wave)
4. **Review each task** against its acceptance criteria individually
5. **Run build once** if any task added new exports or files
6. **Report per-task verdicts** in a single batch message

### Batch Report Format

```
WAVE QA REPORT: [wave number]
================================

TASK #N: [PASS/FAIL]
  Files reviewed: [list]
  Acceptance criteria: [all met / issues]
  Issues: [if any]

TASK #M: [PASS/FAIL]
  Files reviewed: [list]
  Acceptance criteria: [all met / issues]
  Issues: [if any]

INCREMENTAL CHECKS (run once for wave):
  Lint (N files): PASS/FAIL
  Typecheck: PASS/FAIL
  Build: PASS/FAIL (or SKIPPED — no structural changes)

WAVE VERDICT: [PASS / PARTIAL FAIL (tasks X,Y fail) / FAIL]
```

## Architecture Reference (Post Sprint 1+2)

### Domain Structure (18 domains)

**Workspace domains (10)** — actively developed:
- agents, workspace, workflow, progress, tasks, project, git, qa, relay, visualization

**Infrastructure domains (6)** — stable:
- auth, settings, app, hub, claude, mcp

**Consolidated super-domains (2):**
- personal/ — notes, ideas, milestones, alerts, captures, planner, briefing, fitness, changelog
- integrations/ — email, notifications, spotify, github, calendar

### UI Component Tiers

| Tier | Location | Components |
|------|----------|------------|
| 1-2 | `shared/components/ui/` | Button, Input, Card, Badge, Table, Dialog, Tabs, PageLayout, PageHeader, etc. |
| 5 | `shared/components/ui/composition/` | FilterBar, DetailPanel, ActionBar |
| 6 | `shared/components/ui/data-display/` | DataGrid, StatusFlow, LiveIndicator |

### CommandBus Architecture

All IPC commands route through the CommandBus (`src/main/bus/command-bus.ts`):
- `dispatch(channel, input, source)` → routes to registered handler, logs to SQLite
- `emit(channel, payload)` → broadcasts events to listeners
- MCP Bridge (`src/main/bus/mcp-bridge.ts`) exposes mutation commands as MCP tools for AI agents
- Session Manager (`src/main/bus/session-manager.ts`) tracks agent sessions

When reviewing new IPC handlers or services, verify they register with the CommandBus via `bus.registerHandler()`.

### Import Direction Rules

```
features/ → shared/ → app/     (never reversed)
renderer ✗→ main               (never)
main ✗→ renderer               (never)
feature A → feature B/index.ts (barrel only, never deep imports)
```
