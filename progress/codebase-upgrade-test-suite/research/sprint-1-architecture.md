# Sprint 1 — Architecture Foundation

> Research compiled April 9-10, 2026. Sources: 10 parallel research agents, electron-app-planning skill cross-reference, FSD methodology analysis, enterprise Electron pattern survey.

## Objective

Consolidate ADC from 50 main-process domains / 38 renderer features into a focused 18-domain two-app architecture. Eliminate technical debt (dual storage, eager bootstrap, no import enforcement).

## Two-App Split

ADC is two apps sharing infrastructure:

| App | Purpose | Priority | Domain Count |
|---|---|---|---|
| **Workspace** | Agent orchestration, tasks, workflow, git, terminals, visualization | Active development | 10 |
| **Personal** | Notes, ideas, milestones, fitness, planner, alerts, captures, changelog | Frozen until Workspace locked in | 2 (consolidated) |
| **Infrastructure** | Auth, settings, app, hub, claude, mcp | Stable | 6 |

## Domain Consolidation Map (50 → 18)

### Workspace Domains (10) — keep separate, actively developed
- `agents` (renamed from agent-dashboard)
- `workspace` (session management, plan handoff, teammate provisioning)
- `workflow` (MERGE: workflow + workflow-engine + workflow-templates)
- `progress` (pipeline, SQLite + markdown)
- `tasks` (MERGE: tasks + hub-tasks — local-first with Hub mirror)
- `project` (CRUD, detection, analysis)
- `git` (ops, worktrees, merge)
- `qa` (runner + trigger)
- `relay` (cross-device session relay)
- `visualization` (codebase graphs, session logs)

### Infrastructure Domains (6) — stable
- `auth` (OAuth, tokens, sessions)
- `settings` (ABSORBS: hotkeys, voice, screen, security, data-management, webhook-settings)
- `app` (ABSORBS: health, docker, window)
- `hub` (ABSORBS: device — connection + devices + sync)
- `claude` (API client)
- `mcp` (registry + tool calls)

### Personal Domains (2) — frozen, consolidated
- `personal` (ABSORBS: notes, ideas, milestones, alerts, captures, changelog, planner, briefing, fitness)
- `integrations` (ABSORBS: email, notifications, spotify, github, calendar)

### What NOT to merge (skill pushback)
- Don't merge briefing into planner as separate service — different data models. Keep as sub-module within personal super-domain.
- Don't merge visualization into project — different concerns, different route.

## Lazy Service Initialization

### Current Problem
- 100+ services instantiated eagerly at boot in a 717-line service registry
- 6-tier initialization ordering
- Features like Spotify, Fitness, Calendar load even if never used

### Solution: Proxy-based lazy init (no DI framework needed)

```typescript
export function lazyService<T extends object>(factory: () => T): T {
  let instance: T | null = null;
  return new Proxy({} as T, {
    get(_, prop) {
      if (!instance) instance = factory();
      return Reflect.get(instance, prop);
    },
  });
}
```

**Tier 0 — Critical (eager, <200ms):** SQLite, IPC Router, Command Bus, Auth, Settings, Error collector, Project service (7 services)

**Tier 1 — Deferred (lazy):** Everything else (~60 services) — init on first IPC call

### Why not awilix/inversify/tsyringe?
The lazy Proxy pattern is 15 lines. DI containers add decorator overhead, config complexity, and a learning curve. For a solo-dev app with AI writing code, simplicity wins.

## JSON Store Elimination

### Already Done (this session)
- Removed dead `migrateFromJson()` code from 7 services (notes, ideas, milestones, captures, alerts, changelog, fitness)
- Removed `dataDir` dependency from service factories
- -433 lines of dead migration code

### Remaining (Sprint 1 work)
- Move `voice-config.json` → `settings_kv` row
- Move `worktrees.json` → derive from `git worktree list` (don't store)
- Move `hub-sync.json` queue → SQLite table or `settings_kv`
- Move `assistant-history.json` → SQLite `command_history` table
- Move `assistant-watches.json` → SQLite `assistant_watches` table
- Keep: JSONL session logs (streaming append), `.claude/` artifacts (project files), `docs/tracker.json` (git-tracked)

### Table Consolidation (39 → ~32)

| Merge Into | Absorb | Rationale |
|---|---|---|
| `settings_kv` | email_config, hub_config, notification_config, briefing_config | Singleton config stores |
| `planner_entries` | daily_plans + weekly_reviews | Same domain, add `type` column |
| `task_artifacts` | task_specs + task_requirements + task_plans | Linked to spec, add `kind` discriminator |

## Command Bus: Mutations Only

### Already Done (this session)
- Read-only queries (list, get, query, status) skip SQLite insert/update
- ~60-70% reduction in `commands` table writes
- Only mutations (create, update, delete, spawn, etc.) tracked

### Consider
- Make tracking opt-in per domain for high-frequency domains (agent-dashboard streaming)

## Import Direction Enforcement

### Tool: `eslint-plugin-boundaries`

```javascript
// .eslintrc.js
settings: {
  'boundaries/elements': [
    { type: 'features', pattern: 'src/renderer/features/*' },
    { type: 'shared',   pattern: 'src/renderer/shared/*' },
    { type: 'app',      pattern: 'src/renderer/app/*' },
  ],
},
rules: {
  'boundaries/element-types': [2, {
    default: 'disallow',
    rules: [
      { from: 'app',      allow: ['features', 'shared'] },
      { from: 'features', allow: ['shared'] },
      { from: 'shared',   allow: [] },
    ],
  }],
}
```

**3 layers, not 4.** The "widgets" layer was dropped — a widget is just the main exported component of a feature. The distinction doesn't earn its keep.

## Security Gaps to Close

1. **`sandbox: true`** — Main window has `sandbox: false`. Enable or document why.
2. **Content Security Policy** — Add CSP headers to prevent XSS in renderer.
3. **Memory monitoring** — Add `process.memoryUsage()` to Health Registry.

## Agent Resilience

- **Simple crash counter** (NOT full circuit breaker state machine): 3 failures in 30s → stop retrying, alert user
- **Bounded concurrency**: `maxConcurrentAgents` setting (default: 5)
- **Worktree isolation**: Keep as-is (scales to ~15 concurrent agents)

## Renderer Consolidation (38 → ~16)

| Action | Slices | Reduction |
|---|---|---|
| Personal features → `personal/` (tabbed) | notes, ideas, milestones, alerts, fitness, planner, captures, changelog → 1 | -7 |
| integrations → `communications/` | email, notifications, spotify → 1 | -2 |
| roadmap + ideation + insights → `planning/` tabs | 3 → 1 | -2 |
| devices + workspaces → `settings/` internal | 2 → absorbed | -2 |
| file-explorer + diff-viewer + merge → `code-viewer/` | 3 → 1 | -2 |
| changelog + github → route or remove orphans | 2 → 0 | -2 |

## Sources

- Feature-Sliced Design: feature-sliced.design
- VS Code Architecture: thedeveloperspace.com/vs-code-architecture-guide
- Nx Module Boundaries: nx.dev/docs/features/enforce-module-boundaries
- electron-app-planning skill (masayan1126)
- Interprocess (type-safe Electron IPC): daltonmenezes.github.io/interprocess
