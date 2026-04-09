# ADC Command Bus — Design Spec

> Unified command bus + SQLite backing store that replaces scattered JSON files, in-memory session maps, and dual agent spawn paths with a single control plane for the entire app.

**Date:** 2026-04-08
**Branch:** TBD (feature/command-bus)
**Status:** Approved — ready for implementation planning

---

## 1. Problem Statement

ADC has grown organically and now has:

- **5 separate in-memory session tracking Maps** (agent-orchestrator, agent-manager, workspace, progress, QA) with no shared state
- **3 independent Claude spawn paths** (agent-orchestrator v1, agent-manager v2, task-launcher zombie)
- **26+ JSON file stores** scattered across `userData` and `projectPath` directories
- **YAML frontmatter** in `progress/` directories for task state
- **Broken crash recovery** wired with `() => []` — cannot see any active sessions
- **`SessionRecord` type** designed but never implemented
- **`sessions` IPC domain** referenced but never created
- **Duplicate watchers** on the same `progress/` directory
- **Hardcoded string literals** for all ~100+ IPC channel names across 43 handler files

The result: every new feature bolts onto whichever system it happens to touch, deepening fragmentation. AI agents reading stale docs produce wrong code. No single place to query "what happened in this app."

## 2. Solution: Command Bus + SQLite

A central **command bus** that:

1. **Intercepts every IPC call** — wrapping the existing Zod-validated router with tracking, source attribution, and logging
2. **Persists everything to SQLite** — commands, sessions, events, and eventually all domain data
3. **Owns all session lifecycle** — sole authority for spawning Claude processes, delegating to the surviving agent-manager
4. **Exposes capabilities as MCP tools** — any AI session can invoke any command through the bus
5. **Uses channel constants** — zero hardcoded strings, computed from atomic domain/verb/noun builders

### Design Principles

- **Dumb infrastructure, smart consumers** — the bus routes, tracks, and records. It does not decide, reason, or chain commands. AI sessions are the intelligence layer.
- **Bus wraps IPC, doesn't replace it** — existing Zod validation and handler registration stay. The bus adds tracking on top. Migration is incremental.
- **Two entry points to every capability:**
  - **Deterministic:** UI button or `/command` → direct bus dispatch (hard gate, no AI in the loop for routing)
  - **Conversational:** freeform text → Claude interprets → calls bus command as MCP tool (soft gate)
- **SQLite is the single source of truth** — all domain data migrates here. No more scattered JSON, YAML, or in-memory-only state.

## 3. Channel Constants System

### Builder

Eliminates all hardcoded IPC channel strings. One `domain()` call per IPC domain, zero string duplication:

```typescript
// src/shared/ipc/channel-builder.ts

type DomainChannels<D extends string, M extends Record<string, readonly string[]>> = {
  [V in keyof M]: {
    [N in Uppercase<M[V][number] & string>]: `${D}.${Lowercase<V & string>}.${M[V][number] & string}`
  }
};

function domain<D extends string, M extends Record<string, readonly string[]>>(
  d: D, map: M
): DomainChannels<D, M> {
  const result: Record<string, Record<string, string>> = {};
  for (const [verb, nouns] of Object.entries(map)) {
    const group: Record<string, string> = {};
    for (const noun of nouns) {
      group[noun.toUpperCase()] = `${d}.${verb.toLowerCase()}.${noun}`;
    }
    result[verb] = group;
  }
  return result as DomainChannels<D, M>;
}
```

### Per-Domain Channel Files

Each domain gets a `channels.ts` file. Examples:

```typescript
// src/shared/ipc/progress/channels.ts
export const PROGRESS = domain('progress', {
  LIST:    ['tasks', 'archived'],
  GET:     ['task'],
  CREATE:  ['task', 'plan'],
  UPDATE:  ['task'],
  DELETE:  ['task'],
  ARCHIVE: ['task'],
  START:   ['research', 'team', 'workflow'],
  CANCEL:  ['action'],
  RUN:     ['log-cleanup'],
});
// PROGRESS.CREATE.TASK = "progress.create.task" (literal type)

// src/shared/ipc/auth/channels.ts
export const AUTH = domain('auth', {
  LOGIN:    ['user'],
  LOGOUT:   ['user'],
  REGISTER: ['user'],
  REFRESH:  ['token'],
  GET:      ['user'],
});

// src/shared/ipc/settings/channels.ts
export const SETTINGS = domain('settings', {
  GET:    ['all', 'profile'],
  UPDATE: ['all', 'profile'],
});
```

### Event Channels

Same pattern with `event:` prefix builder:

```typescript
function events<D extends string, M extends Record<string, readonly string[]>>(
  d: D, map: M
): EventChannels<D, M> { /* values are "event:{d}.{v}.{n}" */ }

export const PROGRESS_EVENTS = events('progress', {
  TASK:     ['updated', 'created', 'archived'],
  ACTION:   ['started', 'completed', 'failed'],
  WORKFLOW: ['step'],
});
// PROGRESS_EVENTS.TASK.CREATED = "event:progress.task.created"
```

### Contract Files Reference Constants

```typescript
// src/shared/ipc/progress/contract.ts
export const progressInvoke = {
  [PROGRESS.LIST.TASKS]: {
    input: z.object({}),
    output: z.array(progressTaskSchema),
  },
  [PROGRESS.CREATE.TASK]: {
    input: progressCreateTaskInputSchema,
    output: progressTaskSchema,
  },
};
```

### Dynamic Registration

Plugins and workflow templates register commands at runtime:

```typescript
commandBus.registerDynamic(
  domain('workflow.custom', { RUN: ['deploy', 'validate'] }),
  {
    'workflow.custom.run.deploy': { input: deploySchema, output: resultSchema, handler: deployFn },
    'workflow.custom.run.validate': { input: validateSchema, output: resultSchema, handler: validateFn },
  }
);
```

## 4. SQLite Schema

**Stack:** `better-sqlite3` v12 + `drizzle-orm` with better-sqlite3 driver.

- Sync API — perfect for Electron main process, no promise overhead
- WAL mode — concurrent reads while writing
- Drizzle migrations — programmatic `migrate()` on app startup
- DB location: `app.getPath('userData')/adc.db`

### Core Tables (Phase 1)

```typescript
// src/main/db/schema.ts

import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ─── Commands ──────────────────────────────────────────────────
export const commands = sqliteTable('commands', {
  id:           text('id').primaryKey(),            // ULID (time-sortable)
  channel:      text('channel').notNull(),          // "progress.create.task"
  domain:       text('domain').notNull(),           // "progress"
  verb:         text('verb').notNull(),             // "create"
  noun:         text('noun'),                       // "task" (nullable for 2-level)
  isMutation:   integer('is_mutation', { mode: 'boolean' }).notNull(),
  sourceType:   text('source_type').notNull(),      // "ui" | "agent" | "system"
  sourceId:     text('source_id'),                  // sessionId, component name, trigger
  sourceName:   text('source_name'),                // agent name, user-facing label
  input:        text('input', { mode: 'json' }),
  output:       text('output', { mode: 'json' }),
  status:       text('status').notNull(),           // "success" | "error"
  error:        text('error'),
  durationMs:   integer('duration_ms'),
  projectId:    text('project_id'),
  createdAt:    text('created_at').notNull(),       // ISO timestamp
});

// ─── Sessions ──────────────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id:           text('id').primaryKey(),            // randomUUID() from agent-manager
  name:         text('name').notNull(),             // "research-auth-refactor"
  type:         text('type').notNull(),             // "project-owner" | "team-lead" | "assistant" | "qa" | "research" | "planner"
  phase:        text('phase'),                      // "research" | "planning" | "executing" | "qa"
  status:       text('status').notNull(),           // "active" | "completed" | "error" | "killed"
  projectId:    text('project_id'),
  taskSlug:     text('task_slug'),
  model:        text('model'),
  pid:          integer('pid'),
  worktreePath: text('worktree_path'),
  spawnConfig:  text('spawn_config', { mode: 'json' }),
  tokenUsage:   text('token_usage', { mode: 'json' }),
  toolUsage:    text('tool_usage', { mode: 'json' }),
  parentId:     text('parent_id'),                  // FK → sessions.id
  teamName:     text('team_name'),
  wave:         integer('wave'),
  taskIndex:    integer('task_index'),
  startedAt:    text('started_at').notNull(),
  endedAt:      text('ended_at'),
  exitCode:     integer('exit_code'),
  error:        text('error'),
});

// ─── Events ────────────────────────────────────────────────────
export const events = sqliteTable('events', {
  id:              text('id').primaryKey(),          // ULID
  channel:         text('channel').notNull(),        // "event:progress.task.created"
  payload:         text('payload', { mode: 'json' }),
  sourceCommandId: text('source_command_id'),        // FK → commands.id
  sessionId:       text('session_id'),               // FK → sessions.id
  projectId:       text('project_id'),
  createdAt:       text('created_at').notNull(),
});
```

### Indexes

```sql
-- commands
CREATE INDEX idx_commands_domain ON commands(domain);
CREATE INDEX idx_commands_verb ON commands(verb);
CREATE INDEX idx_commands_source_type ON commands(source_type);
CREATE INDEX idx_commands_project_id ON commands(project_id);
CREATE INDEX idx_commands_created_at ON commands(created_at);

-- sessions
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_type ON sessions(type);
CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_task_slug ON sessions(task_slug);
CREATE INDEX idx_sessions_parent_id ON sessions(parent_id);

-- events
CREATE INDEX idx_events_channel ON events(channel);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_source_command_id ON events(source_command_id);
CREATE INDEX idx_events_created_at ON events(created_at);
```

### Design Decisions

- **ULID over UUID** for commands/events — time-sortable, `ORDER BY id` = chronological
- **`domain`, `verb`, `noun` extracted as columns** — parsed from channel string on write for fast dimensional queries
- **`isMutation` flag** — derived from verb. `LIST`, `GET` = false. Everything else = true
- **`parentId` on sessions** — enables full tree queries: workspace → team-lead → teammates
- **JSON columns for flexible payloads** — normalized later if needed
- **No enforced foreign keys** — application-level joins, keeps writes fast during migration period

## 5. Command Bus Core

### Interface

```typescript
// src/main/bus/command-bus.ts

interface CommandBus {
  // Dispatch
  dispatch<C extends string>(channel: C, input: InvokeInput<C>, source: CommandSource): Promise<BusResult<InvokeOutput<C>>>;

  // Events
  emit(channel: string, payload: unknown, context?: EventContext): void;
  on(channel: string, handler: (payload: unknown) => void): () => void;

  // Sessions
  spawnSession(config: SessionSpawnRequest): Promise<SessionRecord>;
  killSession(sessionId: string): Promise<void>;
  getSession(sessionId: string): SessionRecord | undefined;
  listSessions(filter?: SessionFilter): SessionRecord[];
  onSessionEvent(handler: SessionEventHandler): () => void;

  // Registry
  registerDomain(domain: string, invoke: InvokeContract, events?: EventContract): void;
  registerDynamic(channel: string, definition: DynamicCommand): void;
  getRegistry(): RegisteredCommand[];

  // Query
  queryCommands(filter: CommandFilter): CommandRecord[];
  queryEvents(filter: EventFilter): EventRecord[];

  // Lifecycle
  dispose(): void;
}
```

### Dispatch Flow

```
dispatch("progress.create.task", { slug, title }, { type: "ui", component: "TaskGrid" })
  │
  ├─ 1. Generate ULID
  ├─ 2. Parse channel → domain, verb, noun
  ├─ 3. Look up handler in registry
  ├─ 4. Write command row to SQLite (status: pending)
  ├─ 5. Execute handler(input)
  ├─ 6. Update row with output/status/duration
  ├─ 7. Log emitted events to events table with sourceCommandId
  └─ 8. Return BusResult { commandId, status, output, durationMs }
```

### IPC Integration

The bus wraps the existing IPC router. The router still handles Zod validation. The bus adds logging, source attribution, and event capture:

```typescript
// In ipc-wiring.ts:
router.handleViaBus(bus);
// Each IPC call → bus.dispatch() → handler → result
```

### Session Spawning

The bus is the sole spawn authority. All services call `bus.spawnSession()`:

```
bus.spawnSession(config)
  ├─ 1. Write session row (status: 'spawning')
  ├─ 2. Delegate to agentManagerService.spawn()
  ├─ 3. Subscribe to agent-manager events
  ├─ 4. Update SQLite on status changes
  └─ 5. On end: final token/tool usage write
```

### Crash Recovery

```typescript
// On app boot — replaces broken () => [] stub
const interrupted = db.select().from(sessions)
  .where(eq(sessions.status, 'active')).all();

for (const session of interrupted) {
  if (!isProcessAlive(session.pid)) {
    db.update(sessions)
      .set({ status: 'error', error: 'interrupted by app restart', endedAt: now() })
      .where(eq(sessions.id, session.id)).run();
  }
}
```

### MCP Tool Exposure

The bus generates MCP tool definitions from its registry, exposing all commands as tools for AI sessions:

```typescript
bus.getRegistry().map(cmd => ({
  name: cmd.channel,
  description: cmd.description,
  inputSchema: cmd.inputZodSchema,
}));
```

## 6. Enforcement Model

Two entry points to every capability, both hitting the same bus:

| Entry | Routing | Enforcement |
|---|---|---|
| **UI button / `/command`** | Deterministic — direct bus dispatch, no AI in the loop | Hard gate — always calls the correct command |
| **Freeform text → Claude** | AI interprets → calls bus command as MCP tool | Soft gate — Claude has the tools, alternatives are harder |

**Structural enforcement (hooks + tool gating):**
- Per-session tool permissions generated at spawn time
- Team-leads: Edit/Write/NotebookEdit blocked (existing pattern)
- Bus commands exposed as MCP tools = path of least resistance for agents

**Hard gates for critical paths:**
- Session lifecycle (spawn/kill) — only through bus
- Task state changes — only through bus commands
- Config changes — only through bus commands

**Soft gates + logging for everything else:**
- Agents can technically read files directly
- PostToolUse hooks detect bypasses and log them
- Tighten enforcement based on bypass data over time

## 7. Deprecation & Cleanup (Phase 1)

### Services to Delete

| Path | Reason | Replacement |
|---|---|---|
| `src/main/services/agent-orchestrator/` | v1 spawn path, no stream-json | `bus.spawnSession()` → agent-manager |
| `src/main/services/workflow/task-launcher.ts` | Zero-dep zombie | `bus.spawnSession()` |
| `src/main/services/data-management/crash-recovery.ts` | Broken stub (`() => []`) | SQLite session query on boot |
| `src/main/services/progress-watcher-v2/` | Duplicate watcher | ProgressService's own watcher |

### Consumer Rewiring

| Consumer | Old Dependency | New Dependency |
|---|---|---|
| `WorkflowEngineService` | `agentOrchestrator.spawn()` | `bus.spawnSession()` |
| `QaRunner` | `agentOrchestrator.spawn()` | `bus.spawnSession()` |
| `QaTrigger` | orchestrator session events | bus session events |
| `AgentWatchdog` | `agentOrchestrator.listActiveSessions()` | `bus.listSessions({ status: 'active' })` |
| `BriefingService` | `agentOrchestrator.listActiveSessions()` | `bus.listSessions()` |
| `SuggestionEngine` | orchestrator active sessions | `bus.listSessions()` |
| `InsightsService` | orchestrator for metrics | `bus.queryCommands()` + `bus.listSessions()` |
| `JsonlProgressWatcher` | orchestrator JSONL files | Remove entirely |

### Bootstrap Changes

**`service-registry.ts`:**
- Remove: `createAgentOrchestrator()`, `createTaskLauncher()`, `createCrashRecovery()`
- Remove: agentWatchdog wiring to orchestrator, jsonlProgressWatcher creation
- Add: `createCommandBus(db, agentManagerService, router)`
- Rewire: all consumers to bus

**`ipc-wiring.ts`:**
- Remove: orchestrator event forwarding block
- Add: `router.handleViaBus(bus)`

**`event-wiring.ts`:**
- Remove: orchestrator `onSessionEvent` block
- Remove: `jsonlProgressWatcher.onProgress` block
- Keep: hubConnectionManager, watchEvaluator, webhookRelay blocks
- Add: `bus.onSessionEvent()` → renderer forwarding

### IPC Contract Changes

**`src/shared/ipc/agents/`:**
- Remove orchestrator channels (`agent.startPlanning`, `agent.startExecution`, etc.)
- Keep agent-dashboard channels

### What Survives

| System | Role |
|---|---|
| `agent-manager/` | Sole Claude process spawner — bus delegates to it |
| `workspace-session-manager` | Workspace policy (immortal sessions, worktrees) — calls `bus.spawnSession()` |
| `progress-service` | FS task pipeline (until Wave 3 migration) — calls bus commands |
| `IPC Router` | Zod validation + preload bridge — bus wraps it |
| `SessionWriter` | Per-session JSONL writer — lifecycle in bus, content in writer |
| `WorktreeProvisioner` | Git worktree isolation — unchanged |

### Documentation Updates (mandatory before teams launch)

| Doc | Changes |
|---|---|
| `CLAUDE.md` | Add bus section, channel constants, remove orchestrator references |
| `docs/architecture/ARCHITECTURE.md` | New system diagram, add bus + SQLite layer |
| `docs/routing/FEATURES-INDEX.md` | Update service/handler inventory |
| `docs/routing/AI-AGENT-ROUTING-INDEX.md` | Update agents vertical slice, add bus/sessions domain |
| `docs/patterns/PATTERNS.md` | Add channel constants + bus dispatch patterns |
| `docs/patterns/CACHING-LAYER-QUICKGUIDE.md` | Update EventBridge wiring if changed |
| `.claude/agents/team-leader.md` | Reference bus commands |
| `.claude/agents/service-engineer.md` | Channel constants pattern |
| `.claude/skills/electron-ipc/` | Channel constants + bus pattern |
| `.claude/skills/codebase-nav/` | Update service inventory |

## 8. Phase 2 — Data Store Migrations

After Phase 1 ships, agent teams execute these migrations. Each task is independent within its wave.

### Wave 1 — Simple JSON Stores (parallelizable)

| Task | Source | Target Table |
|---|---|---|
| `migrate-settings` | `settings.json` | `settings` |
| `migrate-captures` | `captures.json` | `captures` |
| `migrate-notes` | `notes.json` | `notes` |
| `migrate-alerts` | `alerts.json` | `alerts` |
| `migrate-ideas` | `ideas.json` | `ideas` |
| `migrate-milestones` | `milestones.json` | `milestones` |
| `migrate-changelog` | `changelog.json` | `changelog_entries` |

### Wave 2 — Directory-Based Stores (parallelizable)

| Task | Source | Target Table |
|---|---|---|
| `migrate-planner` | `planner/*.json` | `daily_plans`, `time_blocks` |
| `migrate-fitness` | `fitness/*.json` | `workouts`, `measurements`, `fitness_goals` |
| `migrate-briefings` | `briefings.json` + config | `briefings`, `briefing_config` |
| `migrate-notifications` | `notifications-cache.json` + config | `notifications`, `notification_config` |

### Wave 3 — Complex Domains (sequential)

| Task | Source | Target Table |
|---|---|---|
| `migrate-progress-tasks` | `progress/<slug>/task.md` | `progress_tasks` |
| `migrate-progress-sessions` | `progress/<slug>/sessions/*.jsonl` | `session_logs` |
| `migrate-task-specs` | `<projectPath>/.adc/specs/` | `task_specs`, `task_requirements`, `task_plans` |
| `migrate-workflow-engine` | `workflow-engine/*.json` | `workflow_runs`, `workflow_agents` |

### Wave 4 — Auth & Encrypted Stores (sensitive)

| Task | Source | Target Table |
|---|---|---|
| `migrate-oauth` | `oauth-tokens.json`, `oauth-providers.json` | `oauth_tokens`, `oauth_providers` |
| `migrate-email` | `email-config.json` | `email_config`, `email_queue` |
| `migrate-hub-config` | `hub-config.json` | `hub_config` |

### Wave 5 — Cleanup

| Task | What |
|---|---|
| `remove-json-stores` | Delete JSON read/write code, `store-registry.ts`, cleanup service |
| `remove-progress-fs` | Delete `progress/` FS pipeline, watcher, `task-file-io.ts` |
| `migrate-renderer-localstorage` | Move renderer localStorage to SQLite via IPC |
| `update-user-data-migrator` | Replace JSON migration with SQLite user-scoping |

### Per-Task File Contents

Each `progress/<slug>/task.md` will include:
- Current implementation files (exact paths)
- Drizzle table schema to add
- One-time JSON → SQLite migration script
- Service method changes
- Handler/channel constant updates
- Test expectations
- Docs to update

## 9. Technology Stack

| Component | Choice | Reason |
|---|---|---|
| SQLite binding | `better-sqlite3` v12 | Fastest, sync API for main process, prebuilt Electron binaries |
| Query layer | `drizzle-orm` | Type-safe, ~7KB, first-class better-sqlite3 driver, built-in migrations |
| Migration runner | `drizzle-orm/better-sqlite3/migrator` | Programmatic, runs on app startup |
| DB location | `app.getPath('userData')/adc.db` | Standard Electron pattern, survives updates |
| WAL mode | Enabled on connection | `db.pragma('journal_mode = WAL')` |
| ID generation | ULID | Time-sortable, no timestamp index needed for chronological queries |
| Channel constants | Custom `domain()` builder | Zero hardcoded strings, TypeScript literal types preserved |

### electron-vite Integration

- `externalizeDepsPlugin()` already externalizes native modules — `better-sqlite3` stays in `node_modules`
- Main process CJS output compatible with `better-sqlite3`'s CJS-only API
- `postinstall` script: `electron-rebuild -f -w better-sqlite3`
- Drizzle migrations bundled in `extraResources` for packaged app
