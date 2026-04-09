# ADC — Project Rules

> Electron 39 + React 19 + TypeScript strict + Zustand 5 + Tailwind v4. Solo project, AI is primary code writer.

## Architecture

- **Main**: `src/main/features/<domain>/` — co-located service + handler + schema per domain. Infrastructure in `src/main/bus/`, `src/main/db/`, `src/main/services/` (agent-manager only)
- **Renderer**: `src/renderer/features/<domain>/` — React + TanStack Router + Zustand
- **Shared**: `src/shared/ipc/<domain>/` — Zod IPC contracts, channel constants, types
- **Aliases**: `@ui` `@features` `@shared` `@main` `@renderer`

## Rules That Prevent Mistakes

1. **IPC**: Zod schema in `src/shared/ipc/<domain>/contract.ts` → thin handler co-located in `src/main/features/<domain>/` → barrel in `src/shared/ipc/index.ts`. No business logic in handlers.
2. **Features (main)**: Each domain lives in `src/main/features/<domain>/` with service, handler, and schema co-located. Factory `createXService()` returning interface. `import type` for all interfaces.
3. **UI**: Use `@ui` primitives — never raw `<button>` `<input>` `<label>`. Use `Heading`/`Text` from `@ui` instead of raw `<h1>`/`<p>`/`<span>` for content text. Import from `@ui`.
4. **Features**: `index.ts` barrel + `api/` + `components/` + `hooks/` + `store.ts`. Zustand = UI state only. Run `node scripts/scaffold-features.mjs` to audit compliance.
4a. **Page Layout**: ALL pages use `PageHeader` compound component (`.Row`, `.Title`, `.Actions`, `.Tabs`, `.TabList`, `.Tab`, `.TabContent`). No legacy `title` prop. See `docs/patterns/PATTERNS.md`.
5. **v2**: Do NOT build on `terminal-service` or xterm.js — deprecated. Use stream-json / JSONL.
6. **Docs**: EVERY code change MUST update relevant docs. Non-negotiable.
7. **Verify**: `npm run lint` + `npm run typecheck` + `npm run build` before marking done.
8. **Worktrees**: Every agent works in an isolated git worktree. `scripts/worktree-setup.sh` runs automatically (WorktreeCreate hook in `.claude/settings.json`) to copy `.claude/settings.json` and install `node_modules/`. `.worktreeinclude` lists gitignored files to copy. Multiple teams can run in parallel on separate worktrees/branches. The WorktreeCreate hook is local-only (settings.json is gitignored) -- recreate it if missing.

## Caching Layer Rules

1. `store.ts` MUST NOT contain `useQuery`, `useMutation`, `ipc()`, or domain data types — stores hold UI state only
2. `api/` files MUST NOT import from Zustand stores
3. No `useIpcEvent` in feature code for data freshness — EventBridge owns all invalidation
4. No `refetchInterval` on any query — events drive freshness
5. Every feature with IPC data MUST have `api/queryKeys.ts` with factory pattern
6. Query keys MUST use factory pattern, not inline arrays
7. Mutations MUST invalidate via `onSuccess`/`onSettled`, not external event listeners

## Command Bus

All IPC channels are tracked by a central command bus backed by SQLite (`adc.db`).

1. **Channel constants** — use `DOMAIN.VERB.NOUN` constants from `src/shared/ipc/<domain>/channels.ts`. Never use string literals for channel names.
2. **Bus dispatch** — the IPC router dispatches through the bus. Every command is logged with source attribution.
3. **Sessions** — all Claude sessions are tracked in the `sessions` SQLite table via `BusSessionManager`. No in-memory-only session tracking.
4. **Queries** — use `bus.queryCommands()` and `bus.queryEvents()` for analytics. Use `busSessionManager.list()` for session queries.

### Channel Constant Pattern
```typescript
// Import constants from the domain's channels.ts
import { PROGRESS } from '@shared/ipc/progress/channels';

// Use in contracts, handlers, and renderer calls
router.handle(PROGRESS.CREATE.TASK, async (input) => { ... });
const result = await ipc(PROGRESS.CREATE.TASK, { slug, title });
```

## Finding Things

- Features/services/IPC lookup: `docs/routing/FEATURES-INDEX.md`
- Domain end-to-end trace: `docs/routing/AI-AGENT-ROUTING-INDEX.md`
- Full codebase map: `docs/INDEX.md`
- Feature plans: `docs/features/<name>/plan.md`
- Code patterns: `docs/patterns/PATTERNS.md`
- Caching layer guide: `docs/patterns/CACHING-LAYER-QUICKGUIDE.md`
- File placement rules: `docs/patterns/CODEBASE-GUARDIAN.md`
- Plan status: `docs/tracker.json`
- Command bus: `src/main/bus/`
- Database schema: `src/main/db/schema.ts`
- Channel constants: `src/shared/ipc/<domain>/channels.ts`
- Worktree setup script: `scripts/worktree-setup.sh`
- Worktree include list: `.worktreeinclude`

## Progress Task Pipeline

Local-first task management backed by the `progress/` filesystem. **The task list grid reads from `progress.*` IPC channels — NOT `hub.tasks.*`.**

**IPC domain:** `progress`
**Contract:** `src/shared/ipc/progress/contract.ts`
**Types:** `src/shared/types/progress.ts` — `ProgressTask`, `ProgressStatus`, `ProgressPriority`

**Additional ProgressTask fields:**
- `lastSessionId?: string` — ID of last agent session that worked on this task
- `lastAgentName?: string` — Name of last agent
- `completedAt?: string` — When task was last successfully completed
- `archivedAt?: string` — When task was archived
- `teamName?: string` — Team that worked on this task
- `sessionHistory?: Array<{sessionId, agentName, action, exitCode, timestamp}>` — Rolling history (last 20)
**Service:** `src/main/features/progress/progress-service.ts` — `createProgressService(projectPath, agentManagerService, db)`
**Handler:** `src/main/features/progress/progress-handlers.ts`
**Renderer store:** `src/renderer/shared/stores/progress-context-store.ts` — `useProgressContext()`
**Hydrator:** `src/renderer/shared/stores/ProgressContextHydrator.tsx` (mounted in RootLayout)

### `progress/` Directory Structure

```
progress/
├── <slug>/
│   ├── task.md              ← root file (or description.md / ticket.md) — YAML frontmatter
│   ├── research/
│   │   └── research.md
│   ├── plans/
│   │   └── plan.md
│   └── tasks/
│       └── task-1.md        ← team subtask files
└── archived/
    └── <slug>/
```

### Invoke Channels (12 total)

| Channel | Input | Output | Description |
|---------|-------|--------|-------------|
| `progress.listTasks` | `{}` | `ProgressTask[]` | List all non-archived tasks |
| `progress.getTask` | `{ slug }` | `ProgressTask \| null` | Get single task with full content |
| `progress.createTask` | `{ slug, title, description, priority? }` | `ProgressTask` | Create `progress/<slug>/task.md` |
| `progress.updateTask` | `{ slug, updates }` | `ProgressTask` | Rewrite frontmatter fields |
| `progress.archiveTask` | `{ slug }` | `{ success }` | Move to `progress/archived/<slug>/` |
| `progress.deleteTask` | `{ slug }` | `{ success }` | Remove directory entirely |
| `progress.listArchived` | `{}` | `ProgressTask[]` | List archived tasks |
| `progress.startResearch` | `{ slug }` | `{ sessionId }` | Spawn research agent session |
| `progress.createPlan` | `{ slug }` | `{ sessionId }` | Spawn planning agent session |
| `progress.spinUpTeam` | `{ slug }` | `{ sessionId, action }` | Spawn team-lead to decompose plan |
| `progress.runWorkflow` | `{ slug }` | `{ started: true }` | Run full Research→Plan→Team pipeline |
| `progress.cancelAction` | `{ slug }` | `{ success }` | Stop active agent session for task |
| `progress.runLogCleanup` | `{ maxAgeDays? }` | `{ deleted }` | Clean old JSONL session logs |

### Event Channels (7 total)

| Channel | Payload | When |
|---------|---------|------|
| `event:progress.taskUpdated` | `{ slug, task }` | Any frontmatter or directory change |
| `event:progress.taskCreated` | `{ slug, task }` | Task directory created |
| `event:progress.taskArchived` | `{ slug }` | Task moved to archived/ |
| `event:progress.actionStarted` | `{ slug, action, sessionId }` | Research/plan/team session spawned |
| `event:progress.actionCompleted` | `{ slug, action }` | Session exited with code 0 |
| `event:progress.actionFailed` | `{ slug, action, error }` | Session exited non-zero |
| `event:progress.workflowStep` | `{ slug, step, status }` | Step progress during runWorkflow |

### Workflow Template Event Channels

| Channel | Payload | When |
|---------|---------|------|
| `event:workflowTemplates.created` | `{ templateId }` | Template created |
| `event:workflowTemplates.updated` | `{ templateId }` | Template updated |
| `event:workflowTemplates.deleted` | `{ templateId }` | Template deleted |

### Additional IPC Channels

| Channel | Input | Output | Description |
|---------|-------|--------|-------------|
| `workflowTemplates.scanArtifacts` | `{}` | artifact list | Scans `.claude/skills/`, `.claude/commands/`, `.claude/agents/` |
| `workflowTemplates.writeArtifact` | `{ type, name, content }` | `{ success }` | Writes generated artifact to correct `.claude/` location |
| `workflow-engine.listArchived` | `{}` | archived run states | Returns archived workflow run state files |

### Status Flow

```
backlog → researching → research_done → planning → plan_ready → executing → review → done → archived
                                                                                    ↘ error
```

Status is stored in frontmatter AND reconciled from directory contents on every read:
- `research/research.md` exists → bumped to at least `research_done`
- `plans/plan.md` exists → bumped to at least `plan_ready`
- `tasks/task-*.md` exist → bumped to at least `executing`

Frontmatter wins only if it represents higher progress than the directory state.

### Agent Naming Convention

Agents MUST use descriptive names: `{role}-{slug}` (e.g., `research-auth-refactor`, `team-lead-auth-refactor`, `service-engineer-auth-service`).

## Workspace Agent Commands

IPC channels for plan handoff and team-lead orchestration. Accessible from any session (primary, assistant, UI):

| Channel | Purpose |
|---------|---------|
| `workspace.handOffPlan` | Send a plan file to an idle team-lead (or spawn a new one). Input: `{ projectId, planPath, instructions? }` |
| `workspace.executeTask` | Send an ad-hoc task to a team-lead. Input: `{ projectId, taskDescription, planPath? }` |
| `workspace.provisionTeammate` | Provision an isolated worktree for a teammate agent. Input: `{ projectId, agentRole, slug, teamName, taskInstructions? }` |
| `workspace.teardownTeammate` | Tear down a teammate's worktree after completion. Input: `{ projectId, slug }` |
| `workspace.spawnTeamLead` | Spawn a new mortal team-lead (with optional planPath). |
| `workspace.sendMessage` | Send a message to any active session by sessionId. |

### Renderer Hooks

```typescript
import { useHandOffPlan, useExecuteTask, useProvisionTeammate, useTeardownTeammate } from '@features/workspace/api/useWorkspace';
```

### Team-Lead Isolation

Every team-lead runs in its own git worktree (`.worktrees/team-lead-{projectId}-{index}/`) with:
- Custom CLAUDE.md generated from `.claude/agents/team-leader.md` + project rules
- Enforcement hooks in `.claude/settings.local.json` that block Edit/Write/NotebookEdit
- Full `.claude/` context (agents, skills, commands, settings)

This prevents hook bleed-through between sessions. The team-lead physically cannot write code.

### Teammate Isolation

Team-leads call `workspace.provisionTeammate` before spawning a teammate agent. This creates:
- Isolated worktree at `.worktrees/{slug}/`
- Role-specific CLAUDE.md from `.claude/agents/{agentRole}.md`
- No enforcement hooks (teammates need Edit/Write)

After the teammate completes, the team-lead calls `workspace.teardownTeammate` to clean up.

## Skills Available

Use installed skills proactively — invoke before doing work manually:
- `adc-design-system` — theme tokens, UI primitives, color-mix() rules
- `electron-ipc` — adding IPC channels end-to-end with examples
- `tailwind-css` — layout, alignment, responsive patterns
- `create-frontend-ui` — building UI components
- `frontend-developer` — React architecture, state, performance
- `tanstack-router` / `tanstack-query` / `tanstack-form` / `tanstack-table` — TanStack patterns
- `shadcn-ui` — component patterns
- Run `node scripts/codebase-lookup.mjs <domain>` for instant file resolution


---

<!-- AUTO-GENERATED BY ADC PROJECT SETUP -->
<!-- Review and merge the sections below into your existing CLAUDE.md -->

# ADC — Guidelines

> Auto-generated by ADC Project Setup. Review and customize for your project.

## Quick Reference

```bash
npm run dev
npm run start
npm run build
npm run lint
npm run lint:fix
npm run test
npm run format
npm run typecheck
```

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Language | TypeScript | 64.3% |
| Language | HTML | 16.7% |
| Language | JavaScript | 14.3% |
| Language | CSS | 4.8% |
| Framework | react | - |
| Framework | electron | - |
| Framework | tailwind | - |
| Package Manager | npm | - |
| Test Framework | vitest | - |
| Linter | eslint | - |
| Types | TypeScript | - |
| Styling | Tailwind CSS | - |
| Runtime | Node.js | 24 |

## Architecture Skeleton

```
├── .claude/
│   ├── agents/
│   ├── commands/
│   ├── progress/
│   │   ├── .claude/
│   │   ├── adc-brand-suite/
│   │   ├── adc-fix-first/
│   │   ├── agent-dashboard-view/
│   │   ├── archived/
│   │   ├── BRAND-001/
│   │   ├── claude-plugin-improvements/
│   │   ├── doc-cleanup/
│   │   ├── operation-cleanup/
│   │   ├── tmux-replacement/
│   │   ├── todos/
│   │   ├── visualization-canvas/
│   │   ├── workflow-standardization/
│   │   └── workspace-and-assistant-redesign/
│   ├── refs/
│   ├── skills/
│   │   ├── adc-design-system/
│   │   ├── adc-design-system-workspace/
│   │   ├── codebase-nav/
│   │   ├── codebase-nav-workspace/
│   │   ├── create-frontend-ui/
│   │   ├── electron-ipc/
│   │   ├── electron-ipc-workspace/
│   │   ├── frontend-developer/
│   │   ├── shadcn-ui/
│   │   ├── svg-logo-designer/
│   │   ├── svg-precision/
│   │   ├── tailwind-css/
│   │   ├── tanstack-form/
│   │   ├── tanstack-query/
│   │   ├── tanstack-router/
│   │   ├── tanstack-table/
│   │   └── tanstack-virtual/
│   ├── tracking/
│   │   ├── adc-brand-suite/
│   │   ├── agent-dashboard-view/
│   │   ├── customizable-sidebar-layouts/
│   │   ├── doc-cleanup/
│   │   ├── event-wiring-and-dead-code-cleanup/
│   │   ├── p0-critical-fixes/
│   │   ├── system-b-jsonl-progress-tracking/
│   │   ├── tmux-replacement/
│   │   ├── visualization-canvas/
│   │   └── workspace-and-assistant-redesign/
│   └── worktrees/
│       ├── brand-tasks/
│       └── work+visualization-canvas+page-route-nav/
├── .dev_diary/
│   └── adr/
├── .e2e-test-tmp/
│   ├── blob_storage/
│   │   └── 3d0933ce-0d94-4528-a16a-24206da0ace0/
│   ├── Cache/
│   │   ├── Cache_Data/
│   │   └── No_Vary_Search/
│   ├── Code Cache/
│   │   ├── js/
│   │   └── wasm/
│   ├── DawnGraphiteCache/
│   ├── DawnWebGPUCache/
│   ├── GPUCache/
│   ├── Local Storage/
│   │   └── leveldb/
│   ├── logs/
│   ├── Network/
│   ├── Session Storage/
│   └── Shared Dictionary/
│       └── cache/
├── .e2e-user-data/
│   ├── blob_storage/
│   │   └── 4a0d53a3-ebae-4458-a104-18b0677550cf/
│   ├── Cache/
│   │   ├── Cache_Data/
│   │   └── No_Vary_Search/
│   ├── Code Cache/
│   │   ├── js/
│   │   └── wasm/
│   ├── DawnGraphiteCache/
│   ├── DawnWebGPUCache/
│   ├── GPUCache/
│   ├── Local Storage/
│   │   └── leveldb/
│   ├── logs/
│   ├── Network/
│   ├── Session Storage/
│   └── Shared Dictionary/
│       └── cache/
├── .e2e-user-data-fresh/
│   ├── blob_storage/
│   │   └── 536d360f-feb2-4ac6-963d-56f30823b5c5/
│   ├── Cache/
│   │   ├── Cache_Data/
│   │   └── No_Vary_Search/
│   ├── Code Cache/
│   │   ├── js/
│   │   └── wasm/
│   ├── DawnGraphiteCache/
│   ├── DawnWebGPUCache/
│   ├── GPUCache/
│   ├── Local Storage/
│   │   └── leveldb/
│   ├── logs/
│   ├── Network/
│   ├── Session Storage/
│   └── Shared Dictionary/
│       └── cache/
├── .github/
│   └── workflows/
├── .playwright-mcp/
├── .remember/
│   ├── logs/
│   │   └── autonomous/
│   └── tmp/
├── .worktrees/
│   ├── adc-brand-suite/
│   ├── BRAND-001/
│   ├── custom-theme-editor/
│   ├── e2e-testing-suite/
│   ├── event-wiring-and-dead-code-cleanup/
│   ├── sprint-2-feature-hardening/
│   ├── sprint-3-ux-ui/
│   ├── sprint-4-touch-up/
│   ├── ui-fixes-r2/
│   └── ui-layout-refactor/
├── agents/
├── assets/
├── autoresearch/
├── brand/
├── certs/
├── docs/
│   ├── architecture/
│   ├── contracts/
│   ├── diagrams/
│   ├── features/
│   │   ├── agent-dashboard-view/
│   │   ├── command-palette/
│   │   ├── devices-ui/
│   │   ├── docs-sync/
│   │   ├── future-roadmap/
│   │   ├── productivity-hub-restructure/
│   │   ├── sidebar-architecture-refactor/
│   │   ├── user-scoped-storage/
│   │   ├── visualization/
│   │   └── workspace-ui/
│   ├── images/
│   ├── patterns/
│   ├── plans/
│   ├── prompts/
│   │   └── implementing-features/
│   ├── research/
│   ├── routing/
│   ├── screenshots/
│   │   └── homepage/
│   ├── specs/
│   ├── ui/
│   └── workflows/
├── hub/
│   ├── data/
│   └── src/
│       ├── db/
│       ├── lib/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── ws/
├── logs/
│   └── security/
├── nginx/
│   └── conf.d/
├── out/
│   ├── main/
│   ├── preload/
│   └── renderer/
│       └── assets/
├── progress/
│   ├── operation-cleanup/
│   │   └── research/
│   ├── visualization/
│   └── visualization-canvas/
├── resources/
│   └── social-media/
├── scripts/
│   ├── fonts/
│   └── hooks/
├── src/
│   ├── main/
│   │   ├── auth/
│   │   ├── bootstrap/
│   │   ├── ipc/
│   │   ├── lib/
│   │   ├── mcp/
│   │   ├── mcp-servers/
│   │   ├── services/
│   │   └── tray/
│   ├── preload/
│   ├── renderer/
│   │   ├── app/
│   │   ├── features/
│   │   ├── shared/
│   │   └── styles/
│   └── shared/
│       ├── constants/
│       ├── ipc/
│       └── types/
├── test-artifacts/
│   ├── coverage/
│   │   ├── main/
│   │   └── shared/
│   ├── playwright-reports/
│   │   ├── data/
│   │   └── trace/
│   └── test-results/
│       ├── .playwright-artifacts-125/
│       ├── 01-auth-Auth-—-Login-Page--3a008--navigates-to-register-page/
│       ├── 01-auth-Auth-—-Login-Page--3a008--navigates-to-register-page-retry1/
│       ├── 01-auth-Auth-—-Login-Page--3a008--navigates-to-register-page-retry2/
│       ├── 01-auth-Auth-—-Login-Page--5ef53-p-link-exists-on-login-page/
│       ├── 01-auth-Auth-—-Login-Page--5ef53-p-link-exists-on-login-page-retry1/
│       ├── 01-auth-Auth-—-Login-Page--5ef53-p-link-exists-on-login-page-retry2/
│       ├── 01-auth-Auth-—-Login-Page--66488-d-inputs-and-Sign-In-button/
│       ├── 01-auth-Auth-—-Login-Page--66488-d-inputs-and-Sign-In-button-retry1/
│       ├── 01-auth-Auth-—-Login-Page--66488-d-inputs-and-Sign-In-button-retry2/
│       ├── 01-auth-Auth-—-Login-Page--89669-n-shows-validation-or-error/
│       ├── 01-auth-Auth-—-Login-Page--89669-n-shows-validation-or-error-retry1/
│       ├── 01-auth-Auth-—-Login-Page--89669-n-shows-validation-or-error-retry2/
│       ├── 01-auth-Auth-—-Login-Page--c7799-age-has-all-required-fields/
│       ├── 01-auth-Auth-—-Login-Page--c7799-age-has-all-required-fields-retry1/
│       ├── 01-auth-Auth-—-Login-Page--c7799-age-has-all-required-fields-retry2/
│       ├── 01-auth-Auth-—-Login-Page-back-to-login-from-register-page/
│       ├── 01-auth-Auth-—-Login-Page-back-to-login-from-register-page-retry1/
│       ├── 01-auth-Auth-—-Login-Page-back-to-login-from-register-page-retry2/
│       ├── 01-auth-Auth-—-Successful--be1f8-hboard-with-sidebar-visible/
│       ├── 01-auth-Auth-—-Successful--be1f8-hboard-with-sidebar-visible-retry1/
│       ├── 01-auth-Auth-—-Successful--be1f8-hboard-with-sidebar-visible-retry2/
│       ├── 02-navigation-sweep-Naviga-00e2a-oard-navigates-to-dashboard/
│       ├── 02-navigation-sweep-Naviga-00e2a-oard-navigates-to-dashboard-retry1/
│       ├── 02-navigation-sweep-Naviga-00e2a-oard-navigates-to-dashboard-retry2/
│       ├── 02-navigation-sweep-Naviga-548fb-oundaries-no-console-errors/
│       ├── 02-navigation-sweep-Naviga-548fb-oundaries-no-console-errors-retry1/
│       ├── 02-navigation-sweep-Naviga-548fb-oundaries-no-console-errors-retry2/
│       ├── 02-navigation-sweep-Naviga-ad09e-itness-navigates-to-fitness/
│       ├── 02-navigation-sweep-Naviga-ad09e-itness-navigates-to-fitness-retry1/
│       ├── 02-navigation-sweep-Naviga-ad09e-itness-navigates-to-fitness-retry2/
│       ├── 02-navigation-sweep-Naviga-e2f12-y-navigates-to-productivity/
│       ├── 02-navigation-sweep-Naviga-e2f12-y-navigates-to-productivity-retry1/
│       ├── 02-navigation-sweep-Naviga-e2f12-y-navigates-to-productivity-retry2/
│       ├── 02-navigation-sweep-Naviga-ec419-tings-navigates-to-settings/
│       ├── 02-navigation-sweep-Naviga-ec419-tings-navigates-to-settings-retry1/
│       ├── 02-navigation-sweep-Naviga-ec419-tings-navigates-to-settings-retry2/
│       ├── 02-navigation-sweep-Naviga-ec4e9-y-Work-navigates-to-my-work/
│       ├── 02-navigation-sweep-Naviga-ec4e9-y-Work-navigates-to-my-work-retry1/
│       ├── 02-navigation-sweep-Naviga-ec4e9-y-Work-navigates-to-my-work-retry2/
│       ├── 02-navigation-sweep-Navigation-Sweep-every-page-has-content/
│       ├── 02-navigation-sweep-Navigation-Sweep-every-page-has-content-retry1/
│       ├── 02-navigation-sweep-Navigation-Sweep-every-page-has-content-retry2/
│       ├── 03-sidebar-mechanics-Sideb-00b60-em-highlighted-on-Dashboard/
│       ├── 03-sidebar-mechanics-Sideb-00b60-em-highlighted-on-Dashboard-retry1/
│       ├── 03-sidebar-mechanics-Sideb-00b60-em-highlighted-on-Dashboard-retry2/
│       ├── 03-sidebar-mechanics-Sideb-22c10-ughout-sidebar-interactions/
│       ├── 03-sidebar-mechanics-Sideb-22c10-ughout-sidebar-interactions-retry1/
│       ├── 03-sidebar-mechanics-Sideb-22c10-ughout-sidebar-interactions-retry2/
│       ├── 03-sidebar-mechanics-Sideb-2d0bb-nd-toggle-restores-ADC-text/
│       ├── 03-sidebar-mechanics-Sideb-2d0bb-nd-toggle-restores-ADC-text-retry1/
│       ├── 03-sidebar-mechanics-Sideb-2d0bb-nd-toggle-restores-ADC-text-retry2/
│       ├── 03-sidebar-mechanics-Sideb-47b07-state-changes-on-navigation/
│       ├── 03-sidebar-mechanics-Sideb-47b07-state-changes-on-navigation-retry1/
│       ├── 03-sidebar-mechanics-Sideb-47b07-state-changes-on-navigation-retry2/
│       ├── 03-sidebar-mechanics-Sideb-6e68c-sidebar-visible-after-login/
│       ├── 03-sidebar-mechanics-Sideb-6e68c-sidebar-visible-after-login-retry1/
│       ├── 03-sidebar-mechanics-Sideb-6e68c-sidebar-visible-after-login-retry2/
│       ├── 03-sidebar-mechanics-Sideb-8bc95-bled-without-active-project/
│       ├── 03-sidebar-mechanics-Sideb-8bc95-bled-without-active-project-retry1/
│       ├── 03-sidebar-mechanics-Sideb-8bc95-bled-without-active-project-retry2/
│       ├── 03-sidebar-mechanics-Sideb-b9bb3-ide-nav-and-still-clickable/
│       ├── 03-sidebar-mechanics-Sideb-b9bb3-ide-nav-and-still-clickable-retry1/
│       ├── 03-sidebar-mechanics-Sideb-b9bb3-ide-nav-and-still-clickable-retry2/
│       ├── 03-sidebar-mechanics-Sideb-d2ab4-DC-text-and-narrows-sidebar/
│       ├── 03-sidebar-mechanics-Sideb-d2ab4-DC-text-and-narrows-sidebar-retry1/
│       ├── 03-sidebar-mechanics-Sideb-d2ab4-DC-text-and-narrows-sidebar-retry2/
│       ├── 03-sidebar-mechanics-Sideb-fb17f--persists-across-navigation/
│       ├── 03-sidebar-mechanics-Sideb-fb17f--persists-across-navigation-retry1/
│       ├── 03-sidebar-mechanics-Sideb-fb17f--persists-across-navigation-retry2/
│       ├── 04-dashboard-Dashboard-Active-agents-section-visible/
│       ├── 04-dashboard-Dashboard-Active-agents-section-visible-retry1/
│       ├── 04-dashboard-Dashboard-Daily-stats-visible/
│       ├── 04-dashboard-Dashboard-Daily-stats-visible-retry1/
│       ├── 04-dashboard-Dashboard-Daily-stats-visible-retry2/
│       ├── 04-dashboard-Dashboard-gre-8247b-r-shows-time-aware-greeting-retry1/
│       ├── 04-dashboard-Dashboard-gre-8247b-r-shows-time-aware-greeting-retry2/
│       ├── 04-dashboard-Dashboard-loads-after-login/
│       ├── 04-dashboard-Dashboard-loads-after-login-retry1/
│       ├── 04-dashboard-Dashboard-no-console-errors/
│       ├── 04-dashboard-Dashboard-no-console-errors-retry1/
│       ├── 04-dashboard-Dashboard-no-console-errors-retry2/
│       ├── 04-dashboard-Dashboard-no-error-boundaries/
│       ├── 04-dashboard-Dashboard-no-error-boundaries-retry1/
│       ├── 04-dashboard-Dashboard-no-error-boundaries-retry2/
│       ├── 04-dashboard-Dashboard-Qui-b23dc-nput-and-add-button-visible/
│       ├── 04-dashboard-Dashboard-Qui-b23dc-nput-and-add-button-visible-retry1/
│       ├── 04-dashboard-Dashboard-Qui-b23dc-nput-and-add-button-visible-retry2/
│       ├── 04-dashboard-Dashboard-QuickCapture-add-a-capture/
│       ├── 04-dashboard-Dashboard-QuickCapture-add-a-capture-retry1/
│       ├── 04-dashboard-Dashboard-QuickCapture-add-a-capture-retry2/
│       ├── 04-dashboard-Dashboard-QuickCapture-delete-a-capture/
│       ├── 04-dashboard-Dashboard-QuickCapture-delete-a-capture-retry1/
│       ├── 04-dashboard-Dashboard-Recent-Projects-section-visible-retry1/
│       ├── 05-briefing-Briefing-Page--0c80c-n-is-clickable-and-responds/
│       ├── 05-briefing-Briefing-Page--0c80c-n-is-clickable-and-responds-retry1/
│       ├── 05-briefing-Briefing-Page--0c80c-n-is-clickable-and-responds-retry2/
│       ├── 05-briefing-Briefing-Page--9877a-ads-with-header-and-content/
│       ├── 05-briefing-Briefing-Page--9877a-ads-with-header-and-content-retry1/
│       ├── 05-briefing-Briefing-Page--9877a-ads-with-header-and-content-retry2/
│       ├── 05-briefing-Briefing-Page-generate-button-is-visible/
│       ├── 05-briefing-Briefing-Page-generate-button-is-visible-retry1/
│       ├── 05-briefing-Briefing-Page-generate-button-is-visible-retry2/
│       ├── 05-briefing-Briefing-Page-no-unexpected-console-errors/
│       ├── 05-briefing-Briefing-Page-no-unexpected-console-errors-retry1/
│       ├── 05-briefing-Briefing-Page-no-unexpected-console-errors-retry2/
│       ├── 05-briefing-Briefing-Page-shows-stats-cards-or-empty-state/
│       ├── 05-briefing-Briefing-Page-shows-stats-cards-or-empty-state-retry1/
│       ├── 05-briefing-Briefing-Page-shows-stats-cards-or-empty-state-retry2/
│       ├── 06-my-work-My-Work-Page-filter-interaction-changes-selection/
│       ├── 06-my-work-My-Work-Page-filter-interaction-changes-selection-retry1/
│       ├── 06-my-work-My-Work-Page-filter-interaction-changes-selection-retry2/
│       ├── 06-my-work-My-Work-Page-my-work-page-loads-with-header/
│       ├── 06-my-work-My-Work-Page-my-work-page-loads-with-header-retry1/
│       ├── 06-my-work-My-Work-Page-my-work-page-loads-with-header-retry2/
│       ├── 06-my-work-My-Work-Page-shows-task-list-or-empty-state/
│       ├── 06-my-work-My-Work-Page-shows-task-list-or-empty-state-retry1/
│       ├── 06-my-work-My-Work-Page-status-filter-dropdown-is-present/
│       ├── 06-my-work-My-Work-Page-status-filter-dropdown-is-present-retry1/
│       └── 06-my-work-My-Work-Page-status-filter-dropdown-is-present-retry2/
└── tests/
    ├── e2e/
    │   ├── helpers/
    │   └── screenshots/
    ├── integration/
    │   └── ipc-handlers/
    ├── qa-scenarios/
    ├── setup/
    │   └── mocks/
    └── unit/
        └── services/
```

## Key Patterns

### React

- Use named function declarations for components (not arrow functions)
- Hooks first, then derived state, then handlers, then render
- Self-closing tags for empty elements: `<Component />`
- Ternary for conditional rendering (not `&&`)

### TypeScript

- Use `import type { T }` for type-only imports
- Avoid `any` — use `unknown` with type narrowing
- No non-null assertions (`!`) — use `?? fallback` or proper null checks
- Use `node:` protocol for Node.js builtins (`import { join } from 'node:path'`)

### ESLint

- Zero-tolerance policy — all violations must be fixed
- Run `npm run lint` before committing

### Tailwind CSS

- Use CSS custom properties with Tailwind utility classes for theming
- Avoid hardcoded color values in utility classes — use theme tokens

## Import Order

```typescript
// 1. Node builtins
import { join } from 'node:path';

// 2. External packages
import { useState } from 'react';

// 3. Internal aliases
import type { MyType } from '@shared/types';

// 4. Relative imports
import { MyComponent } from './MyComponent';
```

Blank line between each group. Alphabetical within groups.
