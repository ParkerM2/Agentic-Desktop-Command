# Planning Prompt — Codebase Upgrade + Test Suite

> Copy this into a fresh Claude Code session after `/clear`. It provides full context to start the `/new-plan` or superpowers planning phase.

---

## Prompt

I need to plan and execute a 3-sprint codebase upgrade for ADC (Agent Desktop Command) — an Electron 39 + React 19 + TypeScript strict + Zustand 5 + Tailwind v4 agent orchestration / task management / development suite.

### Context

Read these files for full context:
- `progress/codebase-upgrade-test-suite/task.md` — goal overview
- `progress/codebase-upgrade-test-suite/research/sprint-1-architecture.md` — domain consolidation, lazy init, JSON elimination
- `progress/codebase-upgrade-test-suite/research/sprint-2-ui-and-testing.md` — compositional UI library, E2E test hardening
- `progress/codebase-upgrade-test-suite/research/sprint-3-qa-recorder.md` — BrowserView + Playwright + Claude automated website testing
- `docs/architecture/DEFINITIVE-STRUCTURE.md` — target architecture (v2, two-app split)
- `docs/testing/E2E-TEST-SUITE.md` — current test suite (136 tests, 15 specs, known gaps)
- `docs/QA-Feature-Research.md` — QA Recorder feature research (comprehensive, from master PR #109)

### What's Already Done

- Command bus skip tracking for reads (60-70% fewer SQLite writes) — committed
- Dead JSON migration code removed from 7 services (notes, ideas, milestones, captures, alerts, changelog, fitness) — committed
- `--remote-debugging-port=9222` enabled by default in dev script — committed
- Architecture explorer HTML + enterprise analysis HTML + definitive structure doc — committed

### Sprint 1 — Architecture Foundation

**Two-app split:** Workspace (10 active domains) vs Personal (2 frozen super-domains) vs Infrastructure (6 stable)

Key tasks:
1. Personal domain consolidation: notes, ideas, milestones, alerts, captures, changelog, planner, briefing, fitness → `personal/` super-domain (main + renderer)
2. Integration consolidation: email, notifications, spotify, github, calendar → `integrations/` super-domain
3. Workspace domain merges: workflow x3→1, tasks x2→1
4. Infrastructure absorptions: health+docker→app, hotkeys+voice+screen+security→settings, device→hub
5. Lazy service init: `lazyService()` Proxy wrapper, 7 eager + 60 deferred
6. Remaining JSON store elimination (voice-config, worktrees, hub-sync, assistant-history, assistant-watches)
7. Table consolidation: config singletons → settings_kv, planner merge, task artifacts merge
8. `eslint-plugin-boundaries` import direction enforcement (3 layers: features/shared/app)
9. Security: sandbox:true assessment, CSP headers, memory monitoring

### Sprint 2 — Compositional UI Library + Test Suite

Key tasks:
1. Build shared composition components: PageShell, DataGrid (with TanStack Virtual), FilterBar, DetailPanel, ActionBar, StatusFlow, LiveIndicator
2. Add `data-testid` convention to all primitives
3. Fix broken tests: AG-Grid selector → TanStack Table, stale sidebar labels
4. Add afterEach cleanup hooks to all 15 specs
5. Test infrastructure: `--remote-debugging-port=0` in tests, `electron-playwright-helpers`, `toHaveScreenshot()` baselines
6. Page Object Model conversion for navigation helpers
7. Fill HIGH-priority test gaps (tasks CRUD, agents lifecycle, terminals, workflow)

### Sprint 3 — QA Recorder Feature

Key tasks:
1. Drizzle migration: qa_scripts + qa_runs tables
2. webviewTag:true + cert bypass in main window
3. recorder-preload.js: DOM event capture + Playwright selector generator
4. IPC contract: 9 invoke + 3 event channels
5. Main service: script-store, runner (spawns Playwright), exporter (simple-git)
6. Renderer feature: store, API hooks, QaRecorderPage (StepPanel + WebviewPanel)
7. QaTrigger extension: run Playwright suite on task review
8. Claude integration: CommandBus MCP bridge access to qa-recorder channels

### Skills to Invoke

- `/electron-ipc` — when adding IPC channels (qa-recorder domain, any domain consolidation)
- `/e2e-testing` — when writing Playwright specs or POM classes
- `/electron-app-planning` — for architectural validation
- `/create-frontend-ui` — when building compositional UI primitives
- `/adc-design-system` — for theme tokens and @ui primitive patterns
- `/tailwind-css` — for layout and alignment
- `/tanstack-table` — for DataGrid implementation
- `/tanstack-virtual` — for virtualized scrolling (REQUIRED on large tables)
- `/tanstack-query` — for React Query patterns in api/ hooks
- `/tanstack-router` — for route changes during feature consolidation
- `/codebase-nav` — for finding files by domain

### Useful Tools / Plugins / MCPs

- `chrome-devtools-mcp` — visual verification of UI changes via CDP (port 9222)
- `playwright` MCP — browser automation for testing
- `context7` — up-to-date library docs
- `coderabbit:code-review` — code quality review
- Playwright built-in agents (v1.58+): `playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer`

### Agents Available

- `superpowers:code-reviewer` — review after major steps
- `claude-workflow:qa-reviewer` — per-task quality gate
- `claude-workflow:codebase-guardian` — structural integrity check
- `pr-review-toolkit:code-reviewer` — PR review
- `pr-review-toolkit:silent-failure-hunter` — error handling review

### Key Rules (from CLAUDE.md)

- IPC: Zod schema in shared/ipc → thin handler in main/features → barrel in shared/ipc/index.ts
- UI: Use @ui primitives only — never raw HTML elements
- Features: index.ts barrel + api/ + components/ + hooks/ + store.ts
- Verify: `npm run lint` + `npm run typecheck` + `npm run build` before marking done
- No JSON stores for domain data — SQLite only
- Command bus tracks mutations only (reads skip SQLite)

### Start With

`/new-plan` for Sprint 1, or use superpowers planning to decompose into agent-ready tasks.

Note: master has diverged — run `git fetch origin master` and review `git log origin/master --oneline -20` before starting. PR #109 (QA Feature Research) is on master but may not be merged into this branch yet.
