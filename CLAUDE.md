# ADC — Agentic Desktop Command Guidelines

> Desktop UI for managing Claude autonomous coding agents.
> Electron 39 + React 19 + TypeScript strict + Tailwind v4 + Zustand 5

## Implementation Rule — MANDATORY

**When a plan exists (from `/plan-feature`, `/create-feature-plan`, or user-provided), ALWAYS use the `/implement-feature` skill with parallel agent teams.** Do NOT single-thread implementation yourself. Specialized agents working in parallel are faster and more efficient than sequential solo execution. This applies to ALL planned work — no exceptions, no "this is small enough to do myself" overrides. Use the workflow tooling. That's what it's there for.

---

## gstack Skills (global)

Invoke explicitly only — no proactive routing.

### Research & Auditing
- `/office-hours` — structured product interrogation (6 forcing questions, outputs design doc)
- `/plan-eng-review` — architecture lock + data flow + edge cases + test plan
- `/cso` — OWASP Top 10 + STRIDE threat model (daily=high-confidence, comprehensive=deep)
- `/design-review` — 80-item visual audit on live app with before/after screenshots

### Planning & Validation (before `/new-plan`)
- `/plan-ceo-review` — "what's the 10-star version?" (4 scope modes)
- `/plan-design-review` — rates 7 design dimensions 0-10, fixes gaps
- `/autoplan` — auto-runs CEO → design → eng review pipeline

### Code Quality & QA (after `/agent-team`)
- `/review` — staff-engineer code review (7 parallel sub-agents)
- `/qa` — real browser testing + auto-fix + regression test generation
- `/qa-only` — same as `/qa` but report-only, no code changes
- `/investigate` — systematic 4-phase debugging (no fix without root cause)

### Session Management
- `/retro` — weekly retro with shipping streaks + test health trends
- `/learn` — cross-session memory (patterns, pitfalls, preferences)

### gstack Data

Artifacts: `~/.gstack/projects/ParkerM2-Agentic-Desktop-Command/`
Symlinked: `.claude/refs/gstack-project` → gstack project data
QA reports: `~/.gstack/qa/` (per-ticket)
Learnings: `~/.gstack/projects/ParkerM2-Agentic-Desktop-Command/learnings.jsonl`

When running `/new-plan` or `/agent-team`, check `.claude/refs/gstack-project/` for design docs,
test plans, and learnings that should inform the plan.

---

## ADC v2 Refactor — Active (P0)

> V2 Refactor active (P0). See `ai-docs/V2-REFACTOR.md`. DO NOT build on `terminal-service`/xterm.js/node-pty.
> Key slug: `agent-dashboard-view`. Branch: `feature/agent-dashboard-view`.

---

## Quick Reference

```bash
npm run dev          # Start dev mode (electron-vite)
npm run build        # Production build
npm run lint         # ESLint (zero tolerance — must pass clean)
npm run lint:fix     # Auto-fix ESLint violations
npm run format       # Prettier format all files
npm run typecheck    # tsc --noEmit
npm run test         # Run unit + integration tests
npm run test:unit    # Unit tests only (vitest)
npm run test:integration  # Integration tests only (vitest)
npm run test:e2e     # E2E tests (playwright + electron)
npm run test:coverage    # Unit tests with coverage report
npm run check:docs   # Verify docs updated for source changes
npm run validate:tracker  # Validate docs/tracker.json integrity
npm run verify       # Run ALL verification commands at once
```

## Verification Requirements — MANDATORY (Non-Skippable)

**Before ANY work can be considered complete, ready for human review, or merged:**

```bash
# ALL SIX COMMANDS MUST PASS — NO EXCEPTIONS
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All tests pass
npm run build        # Builds successfully
npm run test:e2e     # E2E tests pass (playwright + electron — requires build)
npm run check:docs   # Documentation updated for source changes
```

### The Rule

> **Claude agents CANNOT claim work is complete without running the full verification suite and showing passing output.**
> This includes documentation updates — code changes without doc updates are incomplete work.
> This is not optional. This is not skippable. No excuses. Evidence before assertions.

### What This Means

| Situation | Required Action |
|-----------|-----------------|
| Implementing a new feature | Run full suite BEFORE claiming done |
| Fixing a bug | Run full suite BEFORE claiming fixed |
| Refactoring code | Run full suite BEFORE claiming complete |
| Adding a new service/component | Run full suite BEFORE handoff |
| ANY code change whatsoever | Run full suite BEFORE completion claims |

### Correct Pattern

```
1. Make code changes + update relevant ai-docs/
2. npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e && npm run check:docs
3. All 6 pass → ONLY THEN say "All verification passes. Ready for review."
```

Phrases like "This should work now", "I've fixed the issue", "Ready for review", or "Docs can be updated later" without passing output are **LIES**.

Tests live in `tests/unit/services/`, `tests/integration/ipc-handlers/`, and co-located with components.

### Documentation Updates — MANDATORY

> EVERY code change needs doc updates. Run `npm run check:docs`. See `ai-docs/DOC-UPDATE-MAP.md` for the full change-type → docs mapping.

## Architecture Overview

```
src/
├── main/        # Electron main process — bootstrap/, ipc/handlers/, services/ (32)
├── preload/     # Context bridge (typed API exposed to renderer)
├── renderer/    # React app — app/routes/ (8 domains), features/, shared/
└── shared/      # main + renderer shared — ipc/ (23 domain folders), types/hub/
```

## Critical Pattern: IPC Contract

**`src/shared/ipc/` (23 domain folders) is the source of truth for all IPC communication.** The root barrel at `src/shared/ipc/index.ts` merges all domain contracts into the unified `ipcInvokeContract` and `ipcEventContract`. The original `src/shared/ipc-contract.ts` is a thin backward-compatible re-export.

To add a new IPC operation:
1. Find or create the domain folder in `src/shared/ipc/<domain>/`
2. Add Zod schemas to `schemas.ts`, contract entries to `contract.ts`
3. Add handler in `src/main/ipc/handlers/<domain>-handlers.ts`
4. Implement logic in `src/main/services/<domain>/<domain>-service.ts`
5. Call from renderer via `ipc('<channel>', input)` — types flow automatically

Data flow: `ipc/<domain>/contract.ts` -> root barrel -> `IpcRouter` -> preload bridge -> `ipc()` helper -> React Query hooks

## Service + Feature Patterns

Local services return **sync values**; IPC handlers wrap with `Promise.resolve(...)`. Exceptions: `selectDirectory()` (dialog) and Hub API proxies are async.

Feature module structure: `index.ts` + `api/queryKeys.ts` + `api/use<Feature>.ts` + `components/` + `hooks/use<Feature>Events.ts` + `store.ts` (UI state only).

## Path Aliases

| Alias | Target | Used In |
|-------|--------|---------|
| `@shared/*` | `src/shared/*` | main, preload, renderer |
| `@main/*` | `src/main/*` | main |
| `@renderer/*` | `src/renderer/*` | renderer |
| `@features/*` | `src/renderer/features/*` | renderer |
| `@ui/*` | `src/renderer/shared/components/ui/*` | renderer |

## ESLint Rules

> Strict ESLint. Zero violations. See `ai-docs/LINTING.md`. Key: no `any`, no `!`, strict booleans (`arr.length > 0`), `import type`, `void` for floating promises.

## Import Order

> Enforced. See `ai-docs/PATTERNS.md`. Groups: node builtins → externals (react first) → `@shared`/`@main`/`@renderer` → `@features` → relative. Blank line between groups.

## React Component Pattern

> Named function declarations required. See `ai-docs/PATTERNS.md`. Key: `export function MyComponent(...)`, ternary for conditional rendering, self-closing empty tags, no index keys.

## Design System

> CSS custom properties + Tailwind v4 `@theme` + `color-mix()`. NEVER hardcode hex/rgba in utility classes. See `ai-docs/DESIGN-SYSTEM.md`.

## State Management

- **Server state**: React Query (via `useQuery`/`useMutation` in feature `api/` folders)
- **UI state**: Zustand stores (in feature `store.ts` or `shared/stores/`)
- **No Redux, no Context for state**

## Tech Stack

Electron 39, electron-vite 5, React 19, TypeScript strict 5.9, TanStack Router 1.95, React Query 5.62, Zustand 5, Tailwind 4, Zod 4, dnd-kit 6, Radix UI, ESLint 9 (strict), Prettier 3.
**v2 replacing**: xterm.js + node-pty → `@llm-ui/react` + `ghostty-web` + `stream-json` + session JSONL.

## Detailed Architecture Docs

| Document | Purpose |
|----------|---------|
| `ai-docs/FEATURES-INDEX.md` | Feature inventory, file locations, service list |
| `ai-docs/ARCHITECTURE.md` | System architecture, IPC flow |
| `ai-docs/PATTERNS.md` | Code conventions, component + import patterns |
| `ai-docs/DATA-FLOW.md` | Data flow diagrams |
| `ai-docs/CODEBASE-GUARDIAN.md` | File placement, naming, import rules |
| `ai-docs/LINTING.md` | ESLint rules + fix patterns |
| `ai-docs/DESIGN-SYSTEM.md` | Design system, color-mix(), themes |
| `ai-docs/DOC-UPDATE-MAP.md` | Change → docs mapping, pre-commit checklist |
| `ai-docs/PLAN-TRACKING.md` | Plan tracking, tracker entry format, slug rules |
| `ai-docs/WORKTREE-BOOTSTRAP.md` | Worktree agent bootstrap via generate-worktree-claude.mjs |
| `ai-docs/V2-REFACTOR.md` | ADC v2 architecture, services, phases |
| `ai-docs/TASK-PLANNING-PIPELINE.md` | Task planning IPC channels, status transitions |
| `ai-docs/AGENT-WORKFLOW.md` | Agent team orchestration (intake → QA → merge) |
| `ai-docs/user-interface-flow.md` | UX flow map, component wiring |
| `docs/research/2026-03-30-headless-agent-architecture.md` | ADC v2 full research |
| `docs/features/agent-dashboard-view/plan.md` | ADC v2 dashboard UI spec |

**Plan lifecycle:** `docs/tracker.json` (single source of truth). See `ai-docs/PLAN-TRACKING.md`.

## Plan Tracking Protocol

> Plans tracked in `docs/tracker.json`. Slug = folder = key = branch. See `ai-docs/PLAN-TRACKING.md`.

## Worktree Bootstrapping

> Worktree agents get a generated CLAUDE.md via `scripts/generate-worktree-claude.mjs`. Team Leader MUST call this after `git worktree add`. See `ai-docs/WORKTREE-BOOTSTRAP.md`.
