# Command Bus Spec Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 8 gaps between the command bus design spec and the actual implementation — wire the bus as the IPC interceptor, expose commands as MCP tools, fix session spawning, add missing tables, and update all documentation.

**Architecture:** The IPC router's `handle()` method gets a `setBus()` hook so every inbound IPC call flows through `bus.dispatch()` for tracking. MCP tool exposure generates tool definitions from the bus registry. Documentation and skills are updated to reflect the new architecture.

**Tech Stack:** TypeScript strict, Drizzle ORM, better-sqlite3, MCP SDK

---

## Task Grouping

| Group | Tasks | Description |
|-------|-------|-------------|
| A: Bus Integration | 1–3 | Wire bus into router, fix workspace spawning |
| B: MCP Exposure | 4 | Expose bus commands as MCP tools |
| C: Missing Tables | 5 | Add Wave 3 missing tables |
| D: Documentation | 6–8 | PATTERNS.md, agent defs, skills |

---

### Task 1: Wire Command Bus Into IPC Router

**Files:**
- Modify: `src/main/ipc/router.ts`
- Modify: `src/main/bootstrap/ipc-wiring.ts`
- Modify: `src/main/bootstrap/service-registry.ts`
- Test: `tests/unit/services/ipc-router-bus.test.ts`

The router's `handle()` method currently calls handlers directly. We add a `setBus()` method so when a bus is attached, all dispatches flow through it for tracking. The Zod validation stays in the router — the bus adds logging on top.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/services/ipc-router-bus.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { isPackaged: false },
  ipcMain: { handle: vi.fn() },
  BrowserWindow: { getAllWindows: () => [] },
}));

describe('IpcRouter bus integration', () => {
  it('dispatches through bus when bus is attached', async () => {
    const bus = {
      dispatch: vi.fn().mockResolvedValue({
        commandId: '1', status: 'success', output: { id: 'x' }, durationMs: 1,
      }),
    };
    // Create router, attach bus, verify dispatch is called
    // (will fail because setBus doesn't exist yet)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/services/ipc-router-bus.test.ts`
Expected: FAIL — `setBus` not defined

- [ ] **Step 3: Add `setBus()` to IpcRouter**

In `src/main/ipc/router.ts`, add:

```typescript
import type { CommandBus } from '../bus';

export class IpcRouter {
  private getMainWindow: () => BrowserWindow | null;
  private bus: CommandBus | null = null;

  setBus(bus: CommandBus): void {
    this.bus = bus;
  }

  handle<T extends InvokeChannel>(channel: T, handler: InvokeHandler<T>): void {
    ipcMain.handle(channel, async (_event, rawInput: unknown) => {
      try {
        const contract = ipcInvokeContract[channel];
        const input = contract.input.parse(rawInput);

        // If bus is attached, dispatch through it for tracking
        if (this.bus) {
          const result = await this.bus.dispatch(
            channel,
            input,
            { type: 'ui' as const },
          );
          if (result.status === 'error') {
            return { success: false, error: result.error };
          }
          return { success: true, data: result.output };
        }

        // Fallback: direct handler call (no bus)
        const result = await handler(input as InvokeInput<T>);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    });

    // Register the handler on the bus too (so bus.dispatch finds it)
    if (this.bus) {
      this.bus.registerHandler(channel, (input) => handler(input as InvokeInput<T>));
    }
  }
}
```

**Important:** The bus needs handlers registered BEFORE `setBus()` is called, or we need to register handlers on the bus during `handle()`. Since `handle()` is called during bootstrap before `setBus()`, we need a two-phase approach: collect handlers first, then register them all on the bus when `setBus()` is called.

Revised approach — store handlers in a Map, register on bus when `setBus()` is called:

```typescript
export class IpcRouter {
  private getMainWindow: () => BrowserWindow | null;
  private bus: CommandBus | null = null;
  private registeredHandlers = new Map<string, (input: unknown) => Promise<unknown>>();

  setBus(bus: CommandBus): void {
    this.bus = bus;
    // Register all previously-registered handlers on the bus
    for (const [channel, handler] of this.registeredHandlers) {
      bus.registerHandler(channel, handler);
    }
  }

  handle<T extends InvokeChannel>(channel: T, handler: InvokeHandler<T>): void {
    // Store handler for bus registration
    const wrappedHandler = (input: unknown) => handler(input as InvokeInput<T>) as Promise<unknown>;
    this.registeredHandlers.set(channel, wrappedHandler);

    // If bus already attached, register immediately
    if (this.bus) {
      this.bus.registerHandler(channel, wrappedHandler);
    }

    ipcMain.handle(channel, async (_event, rawInput: unknown) => {
      try {
        const contract = ipcInvokeContract[channel];
        const input = contract.input.parse(rawInput);

        if (this.bus) {
          const result = await this.bus.dispatch(channel, input, { type: 'ui' });
          if (result.status === 'error') {
            return { success: false, error: result.error };
          }
          return { success: true, data: result.output };
        }

        const result = await handler(input as InvokeInput<T>);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    });
  }

  emit<T extends EventChannel>(channel: T, payload: EventPayload<T>): void {
    // Also emit through bus if attached
    if (this.bus) {
      this.bus.emit(channel, payload);
    }
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}
```

- [ ] **Step 4: Wire setBus in bootstrap**

In `src/main/bootstrap/ipc-wiring.ts`:

```typescript
import type { CommandBus } from '../bus';

export function wireIpcHandlers(router: IpcRouter, services: Services, commandBus?: CommandBus): void {
  registerAllHandlers(router, services);
  // Attach bus AFTER all handlers are registered
  if (commandBus) {
    router.setBus(commandBus);
  }
}
```

Update the call in `src/main/index.ts`:

```typescript
wireIpcHandlers(registry.router, registry.services, registry.commandBus);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/services/ipc-router-bus.test.ts`
Expected: PASS

- [ ] **Step 6: Run full verification**

Run: `npm run typecheck && npm run lint && npm run build && npx vitest run`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add src/main/ipc/router.ts src/main/bootstrap/ipc-wiring.ts src/main/index.ts tests/unit/services/ipc-router-bus.test.ts
git commit -m "feat(bus): wire command bus as IPC interceptor — all calls tracked in SQLite"
```

---

### Task 2: Wire Bus Events Into Router Emit

**Files:**
- Already modified in Task 1 (router.ts emit method)
- Modify: `src/main/bootstrap/event-wiring.ts` — add bus session event forwarding

- [ ] **Step 1: Add bus session event forwarding to event-wiring.ts**

In `src/main/bootstrap/event-wiring.ts`, the `EventWiringDeps` interface and `wireEventForwarding()` need `busSessionManager`:

```typescript
import type { BusSessionManager } from '../bus/session-manager';
import { BUS_EVENTS } from '@shared/ipc/bus/channels';

interface EventWiringDeps {
  router: IpcRouter;
  busSessionManager: BusSessionManager;
  // ... existing deps
}

export function wireEventForwarding(deps: EventWiringDeps): void {
  // Bus session events → renderer
  deps.busSessionManager.onEvent((event) => {
    const channel = BUS_EVENTS.SESSION[event.type.toUpperCase() as keyof typeof BUS_EVENTS.SESSION];
    if (channel) {
      deps.router.emit(channel as any, {
        sessionId: event.session.id,
        session: event.session,
      });
    }
  });

  // ... existing event wiring
}
```

- [ ] **Step 2: Update index.ts to pass busSessionManager**

```typescript
wireEventForwarding({
  router: registry.router,
  busSessionManager: registry.busSessionManager,
  watchEvaluator: registry.watchEvaluator,
  webhookRelay: registry.webhookRelay,
  hubConnectionManager: registry.hubConnectionManager,
});
```

- [ ] **Step 3: Run verification**

Run: `npm run typecheck && npm run lint && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/main/bootstrap/event-wiring.ts src/main/index.ts
git commit -m "feat(bus): forward bus session events to renderer via IPC"
```

---

### Task 3: Fix Workspace Session Manager to Spawn Via Bus

**Files:**
- Modify: `src/main/features/workspace/workspace-session-manager.ts`

- [ ] **Step 1: Add BusSessionManager to deps**

The factory `createWorkspaceSessionManager()` currently takes `(agentManager, worktreeProvisioner, getMainWindow)`. Add `busSessionManager` as a parameter.

- [ ] **Step 2: Replace agentManager.spawnTeamLead with busSessionManager.spawn**

At line ~192, replace:
```typescript
const result = agentManager.spawnTeamLead({
  projectPath: worktreePath,
  teamName: `workspace-tl-${projectId}-${String(index)}`,
  prompt,
  model: TEAM_LEAD_MODEL,
  name: `workspace-tl-${projectId}-${String(index)}`,
});
```

With:
```typescript
const result = await busSessionManager.spawn({
  name: `workspace-tl-${projectId}-${String(index)}`,
  type: 'team-lead',
  projectPath: worktreePath,
  prompt,
  model: TEAM_LEAD_MODEL,
  teamName: `workspace-tl-${projectId}-${String(index)}`,
  projectId,
});
```

- [ ] **Step 3: Replace agentManager.spawnProjectOwner with busSessionManager.spawn**

At line ~242, replace the `spawnProjectOwner` call with:
```typescript
const result = await busSessionManager.spawn({
  name: `workspace-primary-${projectId}`,
  type: 'project-owner',
  projectPath,
  prompt: "You are the primary Claude session...",
  model: PRIMARY_MODEL,
  projectId,
});
```

- [ ] **Step 4: Update service-registry.ts**

Pass `busSessionManager` to `createWorkspaceSessionManager()`:
```typescript
const workspaceSessionManager = createWorkspaceSessionManager(
  agentManagerService,
  worktreeProvisioner,
  getMainWindow,
  busSessionManager,
);
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint && npm run build && npx vitest run`

- [ ] **Step 6: Commit**

```bash
git add src/main/features/workspace/ src/main/bootstrap/service-registry.ts
git commit -m "refactor(workspace): spawn sessions through bus session manager"
```

---

### Task 4: Expose Bus Commands as MCP Tools

**Files:**
- Create: `src/main/bus/mcp-bridge.ts`
- Modify: `src/main/bootstrap/service-registry.ts`

The bus generates MCP tool definitions from its registry, so any AI session can invoke any command.

- [ ] **Step 1: Create the MCP bridge**

```typescript
// src/main/bus/mcp-bridge.ts
import type { CommandBus } from './command-bus';
import { createScopedLogger } from '../lib/logger';

const logger = createScopedLogger('bus-mcp-bridge');

export interface BusMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface BusMcpBridge {
  getTools: () => BusMcpTool[];
  callTool: (name: string, args: unknown) => Promise<unknown>;
}

export function createBusMcpBridge(bus: CommandBus): BusMcpBridge {
  return {
    getTools() {
      return bus.getRegistry()
        .filter((cmd) => cmd.isMutation) // Only expose mutations as tools
        .map((cmd) => ({
          name: cmd.channel,
          description: `${cmd.verb} ${cmd.noun ?? ''} in ${cmd.domain}`.trim(),
          inputSchema: { type: 'object', properties: {}, additionalProperties: true },
        }));
    },

    async callTool(name: string, args: unknown) {
      const result = await bus.dispatch(name, args, { type: 'agent', name: 'mcp-bridge' });
      if (result.status === 'error') {
        throw new Error(result.error ?? 'Command failed');
      }
      return result.output;
    },
  };
}
```

- [ ] **Step 2: Export from bus barrel**

Add to `src/main/bus/index.ts`:
```typescript
export { createBusMcpBridge } from './mcp-bridge';
export type { BusMcpBridge, BusMcpTool } from './mcp-bridge';
```

- [ ] **Step 3: Wire in service-registry**

After the command bus and all handlers are registered:
```typescript
import { createBusMcpBridge } from '../bus';

// After wireIpcHandlers (so all handlers are registered on the bus):
const busMcpBridge = createBusMcpBridge(commandBus);
```

Add `busMcpBridge` to the return object and `ServiceRegistryResult` interface.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/main/bus/mcp-bridge.ts src/main/bus/index.ts src/main/bootstrap/service-registry.ts
git commit -m "feat(bus): expose bus commands as MCP tool definitions"
```

---

### Task 5: Add Wave 3 Missing Tables

**Files:**
- Create: `src/main/features/progress/session-logs-schema.ts`
- Create: `src/main/features/project/task-specs-schema.ts`
- Create: `src/main/features/workflow-engine/workflow-agents-schema.ts`
- Modify: `src/main/db/schema.ts` — add re-exports

These tables are scaffolds for future use. They follow the spec exactly.

- [ ] **Step 1: Create session_logs table**

```typescript
// src/main/features/progress/session-logs-schema.ts
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sessionLogs = sqliteTable('session_logs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  slug: text('slug').notNull(),
  eventType: text('event_type').notNull(),
  payload: text('payload', { mode: 'json' }).$type<unknown>(),
  timestamp: text('timestamp').notNull(),
}, (table) => [
  index('idx_session_logs_session_id').on(table.sessionId),
  index('idx_session_logs_slug').on(table.slug),
]);
```

- [ ] **Step 2: Create task_specs, task_requirements, task_plans tables**

```typescript
// src/main/features/project/task-specs-schema.ts
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const taskSpecs = sqliteTable('task_specs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_task_specs_project_id').on(table.projectId),
]);

export const taskRequirements = sqliteTable('task_requirements', {
  id: text('id').primaryKey(),
  specId: text('spec_id').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_task_requirements_spec_id').on(table.specId),
]);

export const taskPlans = sqliteTable('task_plans', {
  id: text('id').primaryKey(),
  specId: text('spec_id').notNull(),
  content: text('content').notNull(),
  version: text('version').notNull().default('1'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_task_plans_spec_id').on(table.specId),
]);
```

- [ ] **Step 3: Create workflow_agents table**

```typescript
// src/main/features/workflow-engine/workflow-agents-schema.ts
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workflowAgents = sqliteTable('workflow_agents', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  role: text('role').notNull(),
  sessionId: text('session_id'),
  taskSlug: text('task_slug'),
  wave: integer('wave'),
  status: text('status').notNull().default('pending'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  error: text('error'),
}, (table) => [
  index('idx_workflow_agents_run_id').on(table.runId),
]);
```

- [ ] **Step 4: Add re-exports to db/schema.ts barrel**

```typescript
export * from '../features/progress/session-logs-schema';
export * from '../features/project/task-specs-schema';
export * from '../features/workflow-engine/workflow-agents-schema';
```

- [ ] **Step 5: Generate migration**

Run: `npx drizzle-kit generate`

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/main/features/progress/session-logs-schema.ts src/main/features/project/task-specs-schema.ts src/main/features/workflow-engine/workflow-agents-schema.ts src/main/db/schema.ts drizzle/
git commit -m "feat(db): add Wave 3 scaffold tables (session_logs, task_specs, workflow_agents)"
```

---

### Task 6: Update PATTERNS.md

**Files:**
- Modify: `docs/patterns/PATTERNS.md`

- [ ] **Step 1: Add Channel Constants pattern**

Add after existing IPC patterns section:

```markdown
## Channel Constants

All IPC channels use typed constants — never hardcoded strings.

### Defining Channels

```typescript
// src/shared/ipc/<domain>/channels.ts
import { domain, events } from '../channel-builder';

export const DASHBOARD = domain('dashboard', {
  LIST: ['captures'],
  CREATE: ['capture'],
  DELETE: ['capture'],
});
// DASHBOARD.LIST.CAPTURES = "dashboard.list.captures" (literal type)

export const DASHBOARD_EVENTS = events('dashboard', {
  CAPTURE: ['changed'],
});
// DASHBOARD_EVENTS.CAPTURE.CHANGED = "event:dashboard.capture.changed"
```

### Using in Contracts

```typescript
export const dashboardInvoke = {
  [DASHBOARD.LIST.CAPTURES]: { input: z.object({}), output: z.array(captureSchema) },
};
```

### Using in Handlers

```typescript
router.handle(DASHBOARD.LIST.CAPTURES, () => Promise.resolve(service.listCaptures()));
```

### Using in Renderer

```typescript
const captures = await ipc(DASHBOARD.LIST.CAPTURES, {});
useIpcEvent(DASHBOARD_EVENTS.CAPTURE.CHANGED, () => invalidate());
```

## Command Bus Dispatch

Every IPC call is tracked by the command bus in SQLite.

### How It Works

1. Renderer calls `ipc(CHANNEL, input)` via preload bridge
2. IPC router validates input with Zod
3. Router dispatches through `bus.dispatch(channel, input, source)`
4. Bus writes pending command to SQLite, executes handler, writes result
5. Every command is queryable: `bus.queryCommands({ domain: 'dashboard' })`

### Source Attribution

```typescript
// UI calls get source: { type: 'ui' }
// Agent calls get source: { type: 'agent', id: sessionId, name: agentName }
// System calls get source: { type: 'system', name: 'scheduler' }
```

### Session Management

```typescript
// All Claude sessions tracked in SQLite
const sessions = busSessionManager.list({ status: 'active' });
const session = await busSessionManager.spawn({ name, type, prompt, ... });
await busSessionManager.kill(sessionId);
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/patterns/PATTERNS.md
git commit -m "docs: add channel constants + bus dispatch patterns to PATTERNS.md"
```

---

### Task 7: Update Agent Definitions

**Files:**
- Modify: `.claude/agents/team-leader.md`
- Modify: `.claude/agents/service-engineer.md`

- [ ] **Step 1: Update team-leader.md**

Add to the initialization protocol or rules section:

```markdown
## Command Bus Integration

- All sessions are tracked in SQLite via `BusSessionManager`
- Spawn agents through `busSessionManager.spawn()`, NOT `agentManager` directly
- Query active sessions: `busSessionManager.list({ status: 'active' })`
- Every IPC command is logged — use `bus.queryCommands()` for debugging
- Channel constants: `import { PROGRESS } from '@shared/ipc/progress/channels'`
```

- [ ] **Step 2: Update service-engineer.md**

Add to the initialization protocol:

```markdown
## Feature Slice Design

Services live in `src/main/features/<domain>/` alongside their handler and schema:

```
src/main/features/<domain>/
├── schema.ts          ← Drizzle table definition
├── <domain>-service.ts ← Business logic factory
├── <domain>-handlers.ts ← IPC handler registration
└── [sub-modules]       ← Domain-specific helpers
```

## Channel Constants

Never use hardcoded IPC strings. Import from `@shared/ipc/<domain>/channels`:

```typescript
import { DASHBOARD } from '@shared/ipc/dashboard/channels';
router.handle(DASHBOARD.CREATE.CAPTURE, async (input) => { ... });
```

## SQLite Persistence

All domain data is stored in SQLite via Drizzle ORM:

```typescript
import { captures } from './schema';
import type { AdcDatabase } from '../../db';

export function createDashboardService(deps: { db: AdcDatabase, router: IpcRouter, dataDir: string }) {
  // Drizzle queries instead of JSON file I/O
  db.select().from(captures).orderBy(desc(captures.createdAt)).all();
}
```
```

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/team-leader.md .claude/agents/service-engineer.md
git commit -m "docs: update agent definitions for command bus + FSD architecture"
```

---

### Task 8: Update Skills

**Files:**
- Modify: `.claude/skills/electron-ipc/SKILL.md`
- Modify: `.claude/skills/codebase-nav/SKILL.md`

- [ ] **Step 1: Update electron-ipc skill**

Add a new section after the existing IPC channel instructions:

```markdown
## Channel Constants (Required)

All IPC channels use typed constants from `src/shared/ipc/<domain>/channels.ts`. NEVER use string literals.

```typescript
// Define: src/shared/ipc/<domain>/channels.ts
import { domain, events } from '../channel-builder';

export const DOMAIN = domain('domain-name', {
  VERB: ['noun1', 'noun2'],
});

export const DOMAIN_EVENTS = events('domain-name', {
  SUBJECT: ['past-tense'],
});
```

Use in contracts: `[DOMAIN.VERB.NOUN]: { input: schema, output: schema }`
Use in handlers: `router.handle(DOMAIN.VERB.NOUN, async (input) => { ... })`
Use in renderer: `ipc(DOMAIN.VERB.NOUN, input)`

## Command Bus

Every IPC call flows through the command bus for SQLite tracking. The bus wraps the router — no extra code needed in handlers. Source attribution, duration, and success/error status are recorded automatically.

Bus IPC channels for querying: `BUS.QUERY.COMMANDS`, `BUS.QUERY.EVENTS`, `BUS.LIST.SESSIONS`
```

- [ ] **Step 2: Update codebase-nav skill**

Update the domain resolution table:

```markdown
## Domain → File Resolution (FSD)

For any domain `{d}`:

Contract:  src/shared/ipc/{d}/contract.ts          (Zod schemas, channel defs)
Channels:  src/shared/ipc/{d}/channels.ts          (typed channel constants)
Schemas:   src/shared/ipc/{d}/schemas.ts            (shared Zod types)
Service:   src/main/features/{d}/*-service.ts       (business logic)
Handler:   src/main/features/{d}/*-handlers.ts      (IPC handler)
Schema:    src/main/features/{d}/schema.ts          (Drizzle SQLite table)
Feature:   src/renderer/features/{d}/               (React UI)
Types:     src/shared/types/{d}.ts                  (TypeScript interfaces)
```

Note the change from `src/main/services/` → `src/main/features/` and `src/main/ipc/handlers/` → co-located in the feature.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/electron-ipc/SKILL.md .claude/skills/codebase-nav/SKILL.md
git commit -m "docs: update electron-ipc and codebase-nav skills for FSD + bus"
```

---

## Wave 5 Items (Deferred)

The spec mentions two additional Wave 5 items that are **not implemented in this plan**:

1. **`migrate-renderer-localstorage`** — Move renderer localStorage to SQLite via IPC. This requires a new IPC domain and renderer-side refactor. Deferred to a separate plan.

2. **`update-user-data-migrator`** — Replace JSON migration with SQLite user-scoping. Now that all services use SQLite (global DB), the user-data-migrator's JSON file copying is legacy. It should be updated to handle user-scoped SQLite rows instead. Deferred to a separate plan since it touches the auth/session lifecycle.

Both are logged in `progress/command-bus-phase2/tasks/` as backlog items.

---

## Verification Checklist

After all 8 tasks:

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — succeeds
- [ ] `npx vitest run` — all tests pass
- [ ] Every IPC call logged to SQLite `commands` table (verify with bus query)
- [ ] Bus session events forwarded to renderer
- [ ] Workspace sessions spawned through bus session manager
- [ ] MCP bridge exposes mutation commands as tools
- [ ] Wave 3 tables exist and migrations generated
- [ ] PATTERNS.md has channel constants + bus dispatch sections
- [ ] Agent definitions reference bus + FSD
- [ ] Skills reference channel constants + FSD paths
