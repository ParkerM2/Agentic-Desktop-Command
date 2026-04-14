# Category 5 Scope Decisions — 2026-04-14

These four items from the codebase issues breakdown (Category 5: Overkill / Scope Creep) require
product decisions before engineering can proceed. Each section describes what exists, what the
tradeoffs are, and presents the decision options.

---

## Decision 1 — Personal Productivity Stack (Issue 5.1)

### What exists

Nine personal productivity domains embedded in ADC across migrations 0002, 0003, 0008:

| Domain | SQLite tables | Status |
|--------|--------------|--------|
| `notes` | `notes` | Active (UI + IPC) |
| `ideas` / `ideation` | `ideas` | Active (UI + IPC) |
| `changelog` | `changelog_entries` | Active (IPC, stub UI) |
| `milestones` | `milestones`, `milestone_tasks` | Active (IPC + UI in roadmap) |
| `alerts` | `alerts` | Active (IPC + UI) |
| `planner` | `daily_plans`, `time_blocks`, `weekly_reviews` | Active (IPC + UI) |
| `briefing` | `daily_briefings`, `briefing_configs` | Active (IPC + UI) |
| `fitness` | `workouts`, `body_measurements`, `fitness_goals` | Active (IPC + UI) |
| `insights` | (none separate — uses progress data) | Partial |

### The tension

ADC's core purpose is **multi-project management + agent team orchestration**. Notes and ideas are
defensible inside a dev tool (capture context, track feature ideas). The rest — daily briefings,
body measurements, workout logs, time blocking, planner — belong to a personal productivity app,
not an agent orchestrator.

Keeping all nine domains means ongoing maintenance burden for features unrelated to the core value.

### Options

**A. Trim the personal stack** — remove fitness, briefing, planner. Keep notes, ideas, changelog,
milestones, alerts. Changelog and milestones support project-scoped work; alerts notify on
deadlines. ~5 domains removed, 3 SQLite migrations partially rolled back or left as dead tables.

**B. Fork personal stack** — extract fitness/briefing/planner/alerts into a separate Electron app
that shares the SQLite file. ADC stays focused; the personal app can grow independently.

**C. Keep everything** — accept ADC as a "life OS" product, not just a dev tool. Full personal
productivity stack stays. Accept the maintenance cost.

**D. Keep everything, de-emphasize in UI** — hide personal features behind a settings flag.
No removal, minimal ongoing effort.

### Decision needed

Which personal domains should ADC own long-term? (Options A–D, or a custom subset.)

---

## Decision 2 — Six MCP Servers (Issue 5.2)

### What exists

Six in-process MCP servers at `src/main/mcp-servers/`:

| Server | Tie to agent orchestration |
|--------|---------------------------|
| `browser` | Strong — agents browse, test, interact with web |
| `github` | Strong — agents work on git repos, read PRs/issues |
| `discord` | Weak — notification channel, no agent workflow |
| `slack` | Weak — notification channel, no agent workflow |
| `spotify` | None — music playback |
| `calendar` | Weak — scheduling, not directly agent-related |

### The tension

Each MCP server adds connection overhead, auth surface area, and maintenance cost. Discord, Slack,
and Spotify have no obvious agent-orchestration use case. Calendar is borderline (sprint planning?).

### Options

**A. Trim to browser + github** — remove discord, slack, spotify, calendar. Reduces surface by 4.

**B. Trim to browser + github + calendar** — keep calendar for sprint planning / deadline awareness.

**C. Keep all six** — accept the breadth; each integration adds value for different users.

**D. Move non-core MCPs to optional plugins** — load on demand, not always-on.

### Decision needed

Which MCP servers should ship with ADC core? (Options A–D.)

---

## Decision 3 — Visualization Feature / xyflow Node Graph (Issue 5.3)

### What exists

A full `@xyflow/react` feature at `src/renderer/features/visualization/` with:
- Canvas, edges, nodes, panels, toolbar components
- IPC domain + main + renderer
- EventBridge integration wiring `BUS_EVENTS.SESSION.*` to agent team node graph

Sprint 6–7 wired the EventBridge so the node graph now updates live as agent sessions start/stop.

### The tension

The node graph visualizes agent team structure during a session. This is directly tied to the core
use case (agent orchestration). However it is a heavyweight dependency (@xyflow) and the feature
is still young.

### Options

**A. Keep and expand** — the node graph is the "cockpit" for watching agent teams. Invest in it.

**B. Keep as-is, de-prioritize** — ship what's there, don't add more. Revisit later.

**C. Replace with a simpler list view** — remove @xyflow, show agents as a plain table. Lighter.

**D. Remove** — agent orchestration works without visualization. Cut the scope.

### Decision needed

Is the xyflow node graph a core product feature worth investing in, or should it be simplified/removed?

---

## Decision 4 — Workflow Pipeline Builder UI (Issue 5.4)

### What exists

`src/renderer/features/workflow-pipeline/` — a pipeline builder UI for composing workflows.
Related backend: `workflow/engine` IPC domain with `WORKFLOW.LAUNCH.WORKFLOW` which currently
throws "use command bus instead".

`workflow-engine` and `workflow-templates` IPC domains are partially deprecated — they have active
renderer callers but the main process has moved to `busSessionManager` (command bus). A migration
sprint is needed to reconcile them (deferred from Sprint 9 Task 3 & 4).

### The tension

The workflow pipeline builder sits on top of a half-migrated engine. The command bus direction
(spawning sessions directly) is simpler and already working. A pipeline builder implies users can
define multi-step automated workflows, which is a significant product capability.

### Options

**A. Finish the pipeline builder** — complete the migration of workflow-engine + workflow-templates
onto the command bus, then build out the pipeline builder UI as a first-class feature.

**B. Retire the pipeline builder** — remove `workflow-pipeline` renderer feature and
`workflow-engine` / `workflow-templates` IPC domains. The command bus (direct session spawning) is
the workflow primitive.

**C. Defer** — leave in its current half-migrated state, prioritize other sprints.

### Decision needed

Is the workflow pipeline builder a core product feature (Option A) or should it be retired (Option B)?

---

## Summary Table

| # | Issue | Decision needed | Options |
|---|-------|----------------|---------|
| 1 | Personal productivity stack | Which domains stay in ADC? | A (trim) / B (fork) / C (keep all) / D (hide) |
| 2 | MCP servers | Which servers ship with core? | A (browser+github only) / B (+calendar) / C (all) / D (optional plugins) |
| 3 | Visualization / xyflow | Core feature or cut? | A (expand) / B (keep as-is) / C (simplify) / D (remove) |
| 4 | Workflow pipeline builder | Finish or retire? | A (finish) / B (retire) / C (defer) |
