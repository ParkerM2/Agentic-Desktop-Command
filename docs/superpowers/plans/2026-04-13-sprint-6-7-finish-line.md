# Sprint 6-7 Finish Line — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the command bus to the renderer, provision workspaces locally, deliver live visualization data, and clean up deprecated channels.

**Architecture:** All 5 areas target existing seams — no new domains. Main changes are: renderer stubs replaced with real BUS IPC calls; new workspace SQLite service replacing inline throws; visualization hooks consolidated and live-updated via EventBridge.

**Tech Stack:** Electron IPC (typed channels), TanStack Query, Drizzle SQLite, React, EventBridge (setQueryData pattern for events)

**Spec:** `docs/superpowers/specs/2026-04-13-sprint-6-7-foundation-design.md`

---

## Wave 1 — Backend

> Tasks 1-4 are independent. Assign to parallel agents.

---

### Task 1: Workspace DB Migration + Schema

**Files:**
- Create: `drizzle/0014_add_workspaces_table.sql`
- Modify: `drizzle/meta/_journal.json` (add entry)
- Create: `src/main/features/workspaces/schema.ts`
- Modify: `src/main/db/schema.ts` (add export)

- [ ] **Step 1: Create migration SQL**

```sql
-- drizzle/0014_add_workspaces_table.sql
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  host_device_id TEXT,
  settings TEXT NOT NULL DEFAULT '{"autoStart":false,"maxConcurrent":3,"defaultBranch":"main"}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 2: Update migration journal**

In `drizzle/meta/_journal.json`, add after the last entry in the `entries` array (after the `0013_progress_workflow_columns` entry):

```json
    ,{
      "idx": 14,
      "version": "6",
      "when": 1775843500000,
      "tag": "0014_add_workspaces_table",
      "breakpoints": true
    }
```

- [ ] **Step 3: Create Drizzle schema file**

Create `src/main/features/workspaces/schema.ts`:

```typescript
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  hostDeviceId: text('host_device_id'),
  settings: text('settings').notNull().default('{"autoStart":false,"maxConcurrent":3,"defaultBranch":"main"}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

- [ ] **Step 4: Add to schema barrel**

In `src/main/db/schema.ts`, add at the end:

```typescript
export * from '../features/workspaces/schema';
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add drizzle/0014_add_workspaces_table.sql drizzle/meta/_journal.json src/main/features/workspaces/schema.ts src/main/db/schema.ts
git commit -m "feat(workspaces): add SQLite migration + Drizzle schema"
```

---

### Task 2: Workspace Service + Handlers

**Files:**
- Create: `src/main/features/workspaces/workspaces-service.ts`
- Create: `src/main/features/workspaces/workspaces-handlers.ts`

**Dependencies:** Task 1 (schema.ts must exist)

- [ ] **Step 1: Create workspace service**

Create `src/main/features/workspaces/workspaces-service.ts`:

```typescript
import { hostname } from 'node:os';

import { eq } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';

import { workspaces } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';

const logger = createScopedLogger('workspaces-service');

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  hostDeviceId: string | null;
  settings: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  description?: string;
  hostDeviceId?: string;
  settings: { autoStart: boolean; maxConcurrent: number; defaultBranch: string };
  createdAt: string;
  updatedAt: string;
}

function rowToRecord(row: WorkspaceRow): WorkspaceRecord {
  const settings = JSON.parse(row.settings) as WorkspaceRecord['settings'];
  return {
    id: row.id,
    name: row.name,
    ...(row.description !== null && { description: row.description }),
    ...(row.hostDeviceId !== null && { hostDeviceId: row.hostDeviceId }),
    settings,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface WorkspacesService {
  init: () => void;
  list: () => WorkspaceRecord[];
  create: (input: { name: string; description?: string }) => WorkspaceRecord;
  update: (id: string, input: {
    name?: string;
    description?: string;
    hostDeviceId?: string;
    settings?: Partial<WorkspaceRecord['settings']>;
  }) => WorkspaceRecord;
  delete: (id: string) => { success: boolean };
}

export function createWorkspacesService({ db }: { db: AdcDatabase }): WorkspacesService {
  function init(): void {
    const existing = db.select().from(workspaces).limit(1).all();
    if (existing.length > 0) return;

    const now = new Date().toISOString();
    const id = generateId();
    const name = hostname();
    db.insert(workspaces).values({
      id,
      name,
      description: null,
      hostDeviceId: null,
      settings: JSON.stringify({ autoStart: false, maxConcurrent: 3, defaultBranch: 'main' }),
      createdAt: now,
      updatedAt: now,
    }).run();
    logger.info(`[Workspaces] Auto-provisioned workspace "${name}" (${id})`);
  }

  function list(): WorkspaceRecord[] {
    return db.select().from(workspaces).all().map(rowToRecord);
  }

  function create(input: { name: string; description?: string }): WorkspaceRecord {
    const now = new Date().toISOString();
    const id = generateId();
    db.insert(workspaces).values({
      id,
      name: input.name,
      description: input.description ?? null,
      hostDeviceId: null,
      settings: JSON.stringify({ autoStart: false, maxConcurrent: 3, defaultBranch: 'main' }),
      createdAt: now,
      updatedAt: now,
    }).run();
    const row = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!row) throw new Error(`Workspace ${id} not found after insert`);
    return rowToRecord(row);
  }

  function update(id: string, input: {
    name?: string;
    description?: string;
    hostDeviceId?: string;
    settings?: Partial<WorkspaceRecord['settings']>;
  }): WorkspaceRecord {
    const existing = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!existing) throw new Error(`Workspace ${id} not found`);

    const now = new Date().toISOString();
    const existingSettings = JSON.parse(existing.settings) as WorkspaceRecord['settings'];
    const mergedSettings = input.settings
      ? { ...existingSettings, ...input.settings }
      : existingSettings;

    db.update(workspaces).set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.hostDeviceId !== undefined && { hostDeviceId: input.hostDeviceId }),
      settings: JSON.stringify(mergedSettings),
      updatedAt: now,
    }).where(eq(workspaces.id, id)).run();

    const updated = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!updated) throw new Error(`Workspace ${id} not found after update`);
    return rowToRecord(updated);
  }

  function deleteWorkspace(id: string): { success: boolean } {
    db.delete(workspaces).where(eq(workspaces.id, id)).run();
    return { success: true };
  }

  return { init, list, create, update, delete: deleteWorkspace };
}
```

- [ ] **Step 2: Create workspace handlers**

Create `src/main/features/workspaces/workspaces-handlers.ts`:

```typescript
import { WORKSPACES } from '@shared/ipc/misc/workspaces.channels';

import type { IpcRouter } from '../../ipc/router';
import type { WorkspacesService } from './workspaces-service';

export function registerWorkspacesHandlers(
  router: IpcRouter,
  service: WorkspacesService,
): void {
  router.handle(WORKSPACES.LIST.ALL, () =>
    Promise.resolve(service.list()),
  );

  router.handle(WORKSPACES.CREATE.WORKSPACE, ({ name, description }) =>
    Promise.resolve(service.create({ name, description })),
  );

  router.handle(WORKSPACES.UPDATE.WORKSPACE, ({ id, name, description, hostDeviceId, settings }) =>
    Promise.resolve(service.update(id, { name, description, hostDeviceId, settings })),
  );

  router.handle(WORKSPACES.DELETE.WORKSPACE, ({ id }) =>
    Promise.resolve(service.delete(id)),
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/main/features/workspaces/workspaces-service.ts src/main/features/workspaces/workspaces-handlers.ts
git commit -m "feat(workspaces): add SQLite service + IPC handlers"
```

---

### Task 3: Fix Workflow Handler Stubs

**Files:**
- Modify: `src/main/features/workflow/workflow-handlers.ts`
- Modify: `src/main/ipc/index.ts`

The three stubs at lines 116-126 of `workflow-handlers.ts` throw or return hardcoded values. Fix them to delegate to `busSessionManager`.

- [ ] **Step 1: Add busSessionManager parameter to registerWorkflowHandlers**

In `src/main/features/workflow/workflow-handlers.ts`, update the import and function signature:

Add import at the top (after existing imports):
```typescript
import type { BusSessionManager } from '../../bus/session-manager';
```

Change the function signature from:
```typescript
export function registerWorkflowHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient,
  workflowEngineService: WorkflowEngineService,
  workflowTemplateService: WorkflowTemplateService,
): void {
```
To:
```typescript
export function registerWorkflowHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient,
  workflowEngineService: WorkflowEngineService,
  workflowTemplateService: WorkflowTemplateService,
  busSessionManager: BusSessionManager,
): void {
```

- [ ] **Step 2: Replace the three broken stubs**

Replace lines 114-126 (the task launcher + check/stop stubs):

Old code:
```typescript
  // ── Task Launcher (deprecated — use command bus sessions) ──

  router.handle(WORKFLOW.LAUNCH.WORKFLOW, () => {
    throw new Error('Task launcher has been removed. Use command bus sessions instead.');
  });

  router.handle(WORKFLOW.CHECK.RUNNING, () =>
    Promise.resolve({ running: false }),
  );

  router.handle(WORKFLOW.STOP.RUNNING, () =>
    Promise.resolve({ stopped: false }),
  );
```

New code:
```typescript
  // ── Task Launcher ─────────────────────────────────────────

  router.handle(WORKFLOW.LAUNCH.WORKFLOW, async ({ taskDescription, projectPath }) => {
    const session = await busSessionManager.spawn({
      name: `task-${Date.now()}`,
      type: 'team-lead',
      projectPath,
      prompt: taskDescription,
    });
    return { sessionId: session.id, pid: session.pid ?? 0 };
  });

  router.handle(WORKFLOW.CHECK.RUNNING, ({ sessionId }) => {
    const sessions = busSessionManager.list({ status: 'active', taskSlug: sessionId });
    return Promise.resolve({ running: sessions.length > 0 });
  });

  router.handle(WORKFLOW.STOP.RUNNING, async ({ sessionId }) => {
    await busSessionManager.kill(sessionId);
    return { stopped: true };
  });
```

- [ ] **Step 3: Update the call site in ipc/index.ts**

In `src/main/ipc/index.ts`, find the `registerWorkflowHandlers` call (around line 304):

Old:
```typescript
  registerWorkflowHandlers(
    router,
    services.hubApiClient,
    services.workflowEngineService,
    services.workflowTemplateService,
  );
```

New:
```typescript
  registerWorkflowHandlers(
    router,
    services.hubApiClient,
    services.workflowEngineService,
    services.workflowTemplateService,
    services.busSessionManager,
  );
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/main/features/workflow/workflow-handlers.ts src/main/ipc/index.ts`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/main/features/workflow/workflow-handlers.ts src/main/ipc/index.ts
git commit -m "fix(workflow): wire LAUNCH/CHECK/STOP to busSessionManager"
```

---

### Task 4: Deprecation Cleanup

**Files:**
- Modify: `src/shared/ipc/misc/index.ts` (remove timeInvoke export)
- Modify: `src/shared/ipc/index.ts` (remove timeInvoke import + spread)
- Move: 3 historical doc files to `docs/archive/`

- [ ] **Step 1: Remove timeInvoke from misc barrel**

In `src/shared/ipc/misc/index.ts`, remove these lines:

```typescript
// ── Time ──
export { timeInvoke } from './time.contract';
```

- [ ] **Step 2: Remove timeInvoke from IPC contract index**

In `src/shared/ipc/index.ts`:

Remove `timeInvoke,` from the import (around line 47):
```typescript
import {
  alertsEvents,
  alertsInvoke,
  calendarInvoke,
  changelogInvoke,
  ideasEvents,
  ideasInvoke,
  insightsInvoke,
  mcpInvoke,
  mergeInvoke,
  milestonesEvents,
  milestonesInvoke,
  timeInvoke,     // ← remove this line
  webhookEvents,
  workspacesInvoke,
} from './misc';
```

Remove `...timeInvoke,` from `ipcInvokeContract` (around line 109):
```typescript
  ...timeInvoke,  // ← remove this line
```

- [ ] **Step 3: Typecheck to confirm no renderer usage**

Run: `npx tsc --noEmit`
Expected: no errors (renderer doesn't use TIME.PARSE.EXPRESSION anywhere)

- [ ] **Step 4: Archive historical docs**

```bash
mkdir -p docs/archive
mv docs/architecture/V2-REFACTOR.md docs/archive/V2-REFACTOR.md
mv docs/features/task-pipeline/plan.md docs/archive/task-pipeline-plan.md
mv docs/features/task-pipeline/implementation-plan.md docs/archive/task-pipeline-implementation-plan.md
mv docs/features/session-persistence/plan.md docs/archive/session-persistence-plan.md
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add -A src/shared/ipc/misc/index.ts src/shared/ipc/index.ts docs/archive/
git commit -m "chore: remove misc/time from preload allowlist, archive historical docs"
```

---

## Wave 2 — Workspace Wiring + Renderer Stubs

> Tasks 5-6 can run in parallel. Task 7 depends on Task 2 (workspace service).

---

### Task 5: Wire Workspaces into App Bootstrap

**Files:**
- Modify: `src/main/bootstrap/service-registry.ts`
- Modify: `src/main/ipc/index.ts`

**Dependencies:** Task 2 (workspaces-service.ts must exist)

- [ ] **Step 1: Add import to service-registry.ts**

In `src/main/bootstrap/service-registry.ts`, add import after the existing feature imports (around line 90):

```typescript
import { createWorkspacesService } from '../features/workspaces/workspaces-service';
```

- [ ] **Step 2: Add WorkspacesService to ServiceRegistryResult type**

In `src/main/bootstrap/service-registry.ts`, in the `ServiceRegistryResult` interface (around line 119), add:

```typescript
  workspacesService: ReturnType<typeof createWorkspacesService>;
```

- [ ] **Step 3: Instantiate the service in createServiceRegistry**

In `src/main/bootstrap/service-registry.ts`, in the `createServiceRegistry` function, after the `commandBus` and `busSessionManager` lines (around line 196), add:

```typescript
  const workspacesService = createWorkspacesService({ db });
  workspacesService.init();
```

- [ ] **Step 4: Add to the services bag**

In `src/main/bootstrap/service-registry.ts`, in the `services: Services = { ... }` object (around line 522), add:

```typescript
    workspacesService,
```

- [ ] **Step 5: Return from createServiceRegistry**

In `src/main/bootstrap/service-registry.ts`, in the `return { ... }` object (around line 586), add:

```typescript
    workspacesService,
```

- [ ] **Step 6: Add WorkspacesService to Services type in ipc/index.ts**

In `src/main/ipc/index.ts`, add import after existing imports:

```typescript
import type { WorkspacesService } from '../features/workspaces/workspaces-service';
```

In the `Services` interface (around line 123), add:

```typescript
  workspacesService: WorkspacesService;
```

- [ ] **Step 7: Replace inline workspace throws in registerAllHandlers**

In `src/main/ipc/index.ts`, add import at the top:

```typescript
import { registerWorkspacesHandlers } from '../features/workspaces/workspaces-handlers';
```

Find the inline workspace block (around line 336-348):

```typescript
  // Workspaces CRUD — Hub-backed, no local service yet.
  // Returns empty list for reads; throws descriptive error for mutations
  // since the typed contract requires a full workspace object on success.
  router.handle(WORKSPACES.LIST.ALL, () => Promise.resolve([]));
  router.handle(WORKSPACES.CREATE.WORKSPACE, () => {
    throw new Error('Cannot create workspace: Hub connection required. Connect to a Hub first.');
  });
  router.handle(WORKSPACES.UPDATE.WORKSPACE, () => {
    throw new Error('Cannot update workspace: Hub connection required. Connect to a Hub first.');
  });
  router.handle(WORKSPACES.DELETE.WORKSPACE, () => {
    throw new Error('Cannot delete workspace: Hub connection required. Connect to a Hub first.');
  });
```

Replace with:

```typescript
  registerWorkspacesHandlers(router, services.workspacesService);
```

- [ ] **Step 8: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/main/bootstrap/service-registry.ts src/main/ipc/index.ts`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/main/bootstrap/service-registry.ts src/main/ipc/index.ts
git commit -m "feat(workspaces): wire service into app bootstrap, replace Hub stubs"
```

---

### Task 6: Command Bus Renderer Wiring

**Files:**
- Create: `src/renderer/features/bus/api/queryKeys.ts`
- Modify: `src/renderer/features/tasks/api/useAgentMutations.ts`
- Modify: `src/renderer/features/workflow/api/useWorkflow.ts`

- [ ] **Step 1: Create bus query keys factory**

Create `src/renderer/features/bus/api/queryKeys.ts`:

```typescript
/**
 * Bus query keys factory
 */
export const busKeys = {
  all: ['bus'] as const,
  sessions: () => [...busKeys.all, 'sessions'] as const,
  session: (sessionId: string) => [...busKeys.all, 'session', sessionId] as const,
};
```

- [ ] **Step 2: Replace useAgentMutations.ts stubs**

Replace the entire content of `src/renderer/features/tasks/api/useAgentMutations.ts` with:

```typescript
/**
 * Agent mutation hooks — wired to command bus IPC
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BUS } from '@shared/ipc/bus/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';

import { ipc } from '@renderer/shared/lib/ipc';

import { busKeys } from '../../bus/api/queryKeys';

/** Start planning for a task */
export function useStartPlanning() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: {
      taskId: string;
      projectPath: string;
      taskDescription: string;
      subProjectPath?: string;
    }) =>
      ipc(BUS.SPAWN.SESSION, {
        name: `planning-${input.taskId}`,
        type: 'team-lead',
        phase: 'planning',
        taskSlug: input.taskId,
        projectPath: input.projectPath,
        prompt: input.taskDescription,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('start planning'),
  });
}

/** Start execution for a task */
export function useStartExecution() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: {
      taskId: string;
      projectPath: string;
      taskDescription: string;
      planRef?: string;
      subProjectPath?: string;
    }) =>
      ipc(BUS.SPAWN.SESSION, {
        name: `execution-${input.taskId}`,
        type: 'team-lead',
        phase: 'executing',
        taskSlug: input.taskId,
        projectPath: input.projectPath,
        prompt: input.planRef
          ? `${input.taskDescription}\n\nPlan: ${input.planRef}`
          : input.taskDescription,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('start execution'),
  });
}

/** Re-plan a task with user feedback */
export function useReplanWithFeedback() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: {
      taskId: string;
      projectPath: string;
      taskDescription: string;
      feedback: string;
      previousPlanPath?: string;
      subProjectPath?: string;
    }) =>
      ipc(BUS.SPAWN.SESSION, {
        name: `replan-${input.taskId}`,
        type: 'team-lead',
        phase: 'planning',
        taskSlug: input.taskId,
        projectPath: input.projectPath,
        prompt: input.feedback,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('re-plan with feedback'),
  });
}

/** Kill an active agent session */
export function useKillAgent() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (input: { sessionId: string }) =>
      ipc(BUS.KILL.SESSION, { sessionId: input.sessionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('kill agent'),
  });
}

/** Restart an agent from its last checkpoint */
export function useRestartFromCheckpoint() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: async (input: { taskId: string; projectPath: string }) => {
      // Find any active session for this task
      const sessions = await ipc(BUS.LIST.SESSIONS, { taskSlug: input.taskId });
      const active = sessions.find((s) => s.status === 'active');
      if (active) {
        await ipc(BUS.KILL.SESSION, { sessionId: active.id });
      }
      // Spawn a fresh session
      return ipc(BUS.SPAWN.SESSION, {
        name: `restart-${input.taskId}`,
        type: 'team-lead',
        phase: 'executing',
        taskSlug: input.taskId,
        projectPath: input.projectPath,
        prompt: 'Resume from last checkpoint.',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
    onError: onError('restart from checkpoint'),
  });
}
```

- [ ] **Step 3: Fix useWorkflow.ts**

Replace the entire content of `src/renderer/features/workflow/api/useWorkflow.ts` with:

```typescript
/**
 * React Query hooks for workflow operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BUS } from '@shared/ipc/bus/channels';
import { WORKFLOW } from '@shared/ipc/workflow/channels';
import type { InvokeInput } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

import { busKeys } from '../../bus/api/queryKeys';
import { workflowKeys } from './queryKeys';

/** Start watching progress files in a project */
export function useStartProgressWatcher() {
  return useMutation({
    mutationFn: (data: InvokeInput<typeof WORKFLOW.WATCH.PROGRESS>) =>
      ipc(WORKFLOW.WATCH.PROGRESS, data),
  });
}

/** Stop watching progress files */
export function useStopProgressWatcher() {
  return useMutation({
    mutationFn: (data: InvokeInput<typeof WORKFLOW.STOP.WATCHING>) =>
      ipc(WORKFLOW.STOP.WATCHING, data),
  });
}

/** Launch a task execution via command bus */
export function useLaunchTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      type: 'team-lead' | 'project-owner' | 'assistant' | 'qa' | 'research' | 'planner';
      phase?: 'research' | 'planning' | 'executing' | 'qa';
      projectPath?: string;
      prompt: string;
      taskSlug?: string;
    }) => ipc(BUS.SPAWN.SESSION, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
  });
}

/** Check if a session is running — polls bus sessions every 5s */
export function useSessionStatus(sessionId: string) {
  return useQuery({
    queryKey: workflowKeys.session(sessionId),
    queryFn: async () => {
      const sessions = await ipc(BUS.LIST.SESSIONS, { taskSlug: sessionId });
      const running = sessions.some((s) => s.status === 'active');
      return { running };
    },
    enabled: sessionId.length > 0,
    refetchInterval: 5_000,
  });
}

/** Stop a running session */
export function useStopSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { sessionId: string }) =>
      ipc(BUS.KILL.SESSION, { sessionId: data.sessionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: busKeys.sessions() });
    },
  });
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/renderer/features/bus/api/queryKeys.ts src/renderer/features/tasks/api/useAgentMutations.ts src/renderer/features/workflow/api/useWorkflow.ts`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/features/bus/api/queryKeys.ts src/renderer/features/tasks/api/useAgentMutations.ts src/renderer/features/workflow/api/useWorkflow.ts
git commit -m "feat(bus): wire useAgentMutations + useWorkflow to command bus IPC"
```

---

## Wave 3 — Visualization

> Tasks 7-10 are independent of each other. Assign to parallel agents.

---

### Task 7: Consolidate useVisualization.ts + Delete visualization-api.ts

**Files:**
- Modify: `src/renderer/features/visualization/api/useVisualization.ts`
- Delete: `src/renderer/features/visualization/api/visualization-api.ts`
- Modify: `src/renderer/features/visualization/components/canvas/VisualizationCanvas.tsx` (import update)
- Modify: `src/renderer/features/visualization/components/VisualizationPage.tsx` (import update)
- Modify: `src/renderer/features/visualization/components/panels/NodeDetailPanel.tsx` (import update)
- Modify: `src/renderer/features/visualization/components/panels/node-detail/SessionLogSection.tsx` (import update)

- [ ] **Step 1: Implement useVisualization.ts**

Replace the single TODO comment in `src/renderer/features/visualization/api/useVisualization.ts` with:

```typescript
/**
 * Visualization React Query hooks — Feature Slice Design canonical hooks file.
 *
 * Replaces the now-deleted visualization-api.ts workaround.
 */

import { useQuery } from '@tanstack/react-query';

import { VISUALIZATION } from '@shared/ipc/visualization/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { visualizationKeys } from './queryKeys';

/** Fetch codebase dependency graph — cached for 5 minutes */
export function useCodebaseGraph(projectId: string) {
  return useQuery({
    queryKey: visualizationKeys.codebaseGraph(projectId),
    queryFn: () => ipc(VISUALIZATION.GET['CODEBASE-GRAPH'], { projectId }),
    staleTime: 300_000,
    enabled: !!projectId,
  });
}

/** Fetch agent teams data — refreshes every 10 seconds */
export function useAgentTeams(projectId: string) {
  return useQuery({
    queryKey: visualizationKeys.agentTeams(projectId),
    queryFn: () => ipc(VISUALIZATION.GET['AGENT-TEAMS'], { projectId }),
    refetchInterval: 10_000,
    enabled: !!projectId,
  });
}

/** Fetch paginated session log for a specific agent */
export function useSessionLog(
  projectId: string,
  feature: string,
  agentName: string,
  cursor?: number,
) {
  return useQuery({
    queryKey: visualizationKeys.sessionLog(projectId, feature, agentName, cursor),
    queryFn: () =>
      ipc(VISUALIZATION.GET['SESSION-LOG'], { projectId, feature, agentName, cursor }),
    enabled: !!projectId && !!feature && !!agentName,
  });
}
```

- [ ] **Step 2: Update imports in VisualizationCanvas.tsx**

In `src/renderer/features/visualization/components/canvas/VisualizationCanvas.tsx`, change:

```typescript
import { useAgentTeams, useCodebaseGraph } from '../../api/visualization-api';
```
To:
```typescript
import { useAgentTeams, useCodebaseGraph } from '../../api/useVisualization';
```

- [ ] **Step 3: Update imports in VisualizationPage.tsx**

In `src/renderer/features/visualization/components/VisualizationPage.tsx`, change:

```typescript
import { useAgentTeams, useCodebaseGraph } from '../api/visualization-api';
```
To:
```typescript
import { useAgentTeams, useCodebaseGraph } from '../api/useVisualization';
```

- [ ] **Step 4: Update imports in NodeDetailPanel.tsx**

In `src/renderer/features/visualization/components/panels/NodeDetailPanel.tsx`, change:

```typescript
import { useAgentTeams } from '../../api/visualization-api';
```
To:
```typescript
import { useAgentTeams } from '../../api/useVisualization';
```

- [ ] **Step 5: Update imports in SessionLogSection.tsx**

In `src/renderer/features/visualization/components/panels/node-detail/SessionLogSection.tsx`, change:

```typescript
import { useSessionLog } from '../../../api/visualization-api';
```
To:
```typescript
import { useSessionLog } from '../../../api/useVisualization';
```

- [ ] **Step 6: Delete visualization-api.ts**

```bash
rm src/renderer/features/visualization/api/visualization-api.ts
```

- [ ] **Step 7: Grep to confirm no remaining imports from visualization-api**

Run: `grep -r "visualization-api" src/`
Expected: no matches

- [ ] **Step 8: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/renderer/features/visualization/api/useVisualization.ts src/renderer/features/visualization/components/canvas/VisualizationCanvas.tsx src/renderer/features/visualization/components/VisualizationPage.tsx src/renderer/features/visualization/components/panels/NodeDetailPanel.tsx src/renderer/features/visualization/components/panels/node-detail/SessionLogSection.tsx`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/renderer/features/visualization/api/useVisualization.ts src/renderer/features/visualization/components/canvas/VisualizationCanvas.tsx src/renderer/features/visualization/components/VisualizationPage.tsx src/renderer/features/visualization/components/panels/NodeDetailPanel.tsx src/renderer/features/visualization/components/panels/node-detail/SessionLogSection.tsx
git rm src/renderer/features/visualization/api/visualization-api.ts
git commit -m "refactor(visualization): consolidate hooks into useVisualization.ts, delete visualization-api.ts"
```

---

### Task 8: EventBridge BUS_EVENTS.SESSION.* Append Handlers

**Files:**
- Modify: `src/renderer/shared/components/EventBridge.tsx`

This task adds live session event → cache update wiring. When a bus session changes status, the `visualizationKeys.agentTeams(projectId)` cache is patched in place using `setQueryData`.

- [ ] **Step 1: Add imports to EventBridge.tsx**

In `src/renderer/shared/components/EventBridge.tsx`, add after the existing imports:

```typescript
import { BUS_EVENTS } from '@shared/ipc/bus/channels';
import type { z } from 'zod';
import type { sessionRecordSchema } from '@shared/ipc/bus/schemas';
import type { AgentTeamsData } from '@shared/ipc/visualization/schemas';

import { visualizationKeys } from '@features/visualization/api/queryKeys';
```

Note: `AgentTeamsData` needs to be imported as a type. Check if it's exported from `@shared/ipc/visualization/schemas` or `@shared/ipc`. Use:
```typescript
import type { AgentTeamsDataSchema } from '@shared/ipc/visualization/schemas';
type AgentTeamsData = z.infer<typeof AgentTeamsDataSchema>;
```

And for session records:
```typescript
type SessionRecord = z.infer<typeof sessionRecordSchema>;
```

- [ ] **Step 2: Add VISUALIZATION_AGENTS key constant**

In EventBridge.tsx, in the "Shared Key Constants" section (around line 64), add:

```typescript
const VISUALIZATION_AGENTS = ['visualization', 'agents'] as const;
```

- [ ] **Step 3: Add BUS_EVENTS.SESSION.* to EVENT_REGISTRY**

In the `EVENT_REGISTRY` object, add these 5 entries at the end (before the closing `}`):

```typescript
  // Bus session events — update visualization agent nodes in-place
  [BUS_EVENTS.SESSION.SPAWNED]: { keys: [VISUALIZATION_AGENTS], handler: 'append' as const },
  [BUS_EVENTS.SESSION.ACTIVE]: { keys: [VISUALIZATION_AGENTS], handler: 'append' as const },
  [BUS_EVENTS.SESSION.COMPLETED]: { keys: [VISUALIZATION_AGENTS], handler: 'append' as const },
  [BUS_EVENTS.SESSION.ERROR]: { keys: [VISUALIZATION_AGENTS], handler: 'append' as const },
  [BUS_EVENTS.SESSION.KILLED]: { keys: [VISUALIZATION_AGENTS], handler: 'append' as const },
```

- [ ] **Step 4: Map session status to AgentStatus**

In EventBridge.tsx, add a helper after the existing imports section:

```typescript
/** Map bus SessionRecord.status to visualization AgentStatus */
function sessionStatusToAgentStatus(
  status: string,
): 'pending' | 'active' | 'idle' | 'completed' | 'error' | 'killed' {
  switch (status) {
    case 'spawned': return 'pending';
    case 'active': return 'active';
    case 'completed': return 'completed';
    case 'error': return 'error';
    case 'killed': return 'killed';
    default: return 'idle';
  }
}
```

- [ ] **Step 5: Add BUS_SESSION_EVENTS set constant and implement the append handler**

Add this constant just below the `sessionStatusToAgentStatus` helper (outside `handleAppend`):

```typescript
const BUS_SESSION_EVENTS = new Set<string>([
  BUS_EVENTS.SESSION.SPAWNED,
  BUS_EVENTS.SESSION.ACTIVE,
  BUS_EVENTS.SESSION.COMPLETED,
  BUS_EVENTS.SESSION.ERROR,
  BUS_EVENTS.SESSION.KILLED,
]);
```

In the `handleAppend` function, add after the existing `AGENT_DASHBOARD_EVENTS.MESSAGE.RECEIVED` block:

```typescript
  if (BUS_SESSION_EVENTS.has(event)) {
    const { sessionId, session } = payload as { sessionId: string; session: SessionRecord };
    if (!session.projectId) return;

    const agentStatus = sessionStatusToAgentStatus(session.status);

    queryClient.setQueryData<AgentTeamsData>(
      visualizationKeys.agentTeams(session.projectId),
      (old) => {
        if (!old) return old;
        return {
          ...old,
          features: old.features.map((f) => ({
            ...f,
            tasks: f.tasks.map((t) =>
              t.lastSid === sessionId || t.agentName === session.name
                ? { ...t, status: agentStatus, lastSid: sessionId }
                : t,
            ),
          })),
        };
      },
    );
  }
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/renderer/shared/components/EventBridge.tsx`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/renderer/shared/components/EventBridge.tsx
git commit -m "feat(visualization): EventBridge wires BUS_EVENTS.SESSION.* to agent node cache updates"
```

---

### Task 9: AgentTaskNode Status Ring Styling

**Files:**
- Modify: `src/shared/ipc/visualization/schemas.ts` (add 'killed' to AgentStatusSchema)
- Modify: `src/renderer/features/visualization/components/nodes/AgentTaskNode.tsx`

- [ ] **Step 1: Add 'killed' to AgentStatusSchema**

In `src/shared/ipc/visualization/schemas.ts`, find:

```typescript
export const AgentStatusSchema = z.enum([
  'pending',
  'active',
  'idle',
  'completed',
  'error',
]);
```

Change to:

```typescript
export const AgentStatusSchema = z.enum([
  'pending',
  'active',
  'idle',
  'completed',
  'error',
  'killed',
]);
```

- [ ] **Step 2: Update AgentTaskNode statusVariant and add ring CSS**

In `src/renderer/features/visualization/components/nodes/AgentTaskNode.tsx`, update the `statusVariant` function to handle 'killed':

```typescript
function statusVariant(
  status: AgentStatus,
): 'success' | 'error' | 'warning' | 'neutral' {
  switch (status) {
    case 'active': {
      return 'success';
    }
    case 'completed': {
      return 'success';
    }
    case 'error': {
      return 'error';
    }
    case 'killed':
    case 'idle':
    case 'pending': {
      return 'neutral';
    }
  }
}
```

Add a `ringClass` helper function after `statusVariant`:

```typescript
function ringClass(status: AgentStatus): string {
  switch (status) {
    case 'active': {
      return 'ring-2 ring-green-500';
    }
    case 'error': {
      return 'ring-2 ring-red-500';
    }
    case 'completed':
    case 'killed': {
      return 'opacity-60';
    }
    default: {
      return '';
    }
  }
}
```

Update the wrapper `div` className in the component body:

Old:
```typescript
        className={[
          'min-w-[180px] rounded-md border bg-background/95 px-3 py-2 shadow-sm',
          selected ? 'ring-2 ring-primary' : '',
        ].join(' ')}
```

New:
```typescript
        className={[
          'min-w-[180px] rounded-md border bg-background/95 px-3 py-2 shadow-sm',
          selected ? 'ring-2 ring-primary' : ringClass(data.status),
        ].join(' ')}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/shared/ipc/visualization/schemas.ts src/renderer/features/visualization/components/nodes/AgentTaskNode.tsx`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/shared/ipc/visualization/schemas.ts src/renderer/features/visualization/components/nodes/AgentTaskNode.tsx
git commit -m "feat(visualization): add ring status styling to AgentTaskNode, add 'killed' status"
```

---

### Task 10: FeatureGroupDetail — Real Content

**Files:**
- Modify: `src/renderer/features/visualization/components/panels/NodeDetailPanel.tsx`
- Modify: `src/renderer/features/visualization/components/panels/node-detail/node-content.tsx`
- Modify: `src/renderer/features/visualization/components/panels/node-detail/FeatureGroupDetail.tsx`

**Dependencies:** Task 7 must be done first (useCodebaseGraph import must come from useVisualization.ts)

- [ ] **Step 1: Update NodeDetailPanel to also fetch codebase graph and derive feature data**

In `src/renderer/features/visualization/components/panels/NodeDetailPanel.tsx`, add the import:

```typescript
import { useAgentTeams, useCodebaseGraph } from '../../api/useVisualization';
```
(replacing the old `visualization-api` import — Task 7 will have done this, just verify it's correct)

Also add in the component body after the `agentTeamsData` lines:

```typescript
  const { data: codebaseGraphData } = useCodebaseGraph(projectId);

  const featureAgentTasks = featureData?.tasks ?? [];
  const featureFiles = codebaseGraphData?.files.filter((f) => f.group === featureName) ?? [];
```

Update the `renderNodeContent` call context to include the new fields:

Old:
```typescript
            {renderNodeContent(node, {
              featureEvents,
              agentTeamsLoading,
              featureName,
              projectId,
              getFileEdges,
            })}
```

New:
```typescript
            {renderNodeContent(node, {
              featureEvents,
              agentTeamsLoading,
              featureName,
              projectId,
              getFileEdges,
              featureAgentTasks,
              featureFiles,
            })}
```

- [ ] **Step 2: Update NodeContentContext in node-content.tsx**

In `src/renderer/features/visualization/components/panels/node-detail/node-content.tsx`, update the `NodeContentContext` interface:

```typescript
import type { AgentTaskInfoSchema } from '@shared/ipc/visualization/schemas';
import type { z } from 'zod';
import type { CodebaseFileSchema } from '@shared/ipc/visualization/schemas';

type AgentTaskInfo = z.infer<typeof AgentTaskInfoSchema>;
type CodebaseFile = z.infer<typeof CodebaseFileSchema>;
```

Add to the `NodeContentContext` interface:

```typescript
export interface NodeContentContext {
  agentTeamsLoading: boolean;
  featureEvents: TrackingEvent[];
  featureName: string;
  featureAgentTasks: AgentTaskInfo[];
  featureFiles: CodebaseFile[];
  getFileEdges: (path: string) => { exports: string[]; imports: string[] };
  projectId: string;
}
```

Update the `featureGroup` case in `renderNodeContent`:

```typescript
    case 'featureGroup': {
      return (
        <FeatureGroupDetail
          data={node.data as unknown as FeatureGroupData}
          agentTasks={featureAgentTasks}
          files={featureFiles}
          projectId={projectId}
        />
      );
    }
```

- [ ] **Step 3: Fill FeatureGroupDetail with real content**

Replace the entire content of `src/renderer/features/visualization/components/panels/node-detail/FeatureGroupDetail.tsx` with:

```typescript
/**
 * FeatureGroupDetail — detail view for a feature-group node.
 * Shows: metadata, file list, active agents, and session log.
 */

import { Badge, MetadataItem, MetadataList, Text } from '@ui';

import { SessionLogSection } from './SessionLogSection';
import { statusVariant } from './types';

import type { AgentTaskInfoSchema, CodebaseFileSchema } from '@shared/ipc/visualization/schemas';
import type { z } from 'zod';
import type { FeatureGroupData } from '../../../lib/graph-builders';

type AgentTaskInfo = z.infer<typeof AgentTaskInfoSchema>;
type CodebaseFile = z.infer<typeof CodebaseFileSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface FeatureGroupDetailProps {
  data: FeatureGroupData;
  agentTasks: AgentTaskInfo[];
  files: CodebaseFile[];
  projectId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FeatureGroupDetail({ data, agentTasks, files, projectId }: FeatureGroupDetailProps) {
  const activeAgents = agentTasks.filter((t) => t.status === 'active');

  return (
    <div className="space-y-4 p-4">
      <MetadataList>
        <MetadataItem label="Feature" value={data.feature} />
        <MetadataItem
          label="Status"
          value={<Badge variant={statusVariant(data.status)}>{data.status}</Badge>}
        />
        {data.branch !== null && (
          <MetadataItem
            label="Branch"
            value={
              <code className="block rounded bg-muted px-2 py-1 font-mono text-xs">
                {data.branch}
              </code>
            }
          />
        )}
        <MetadataItem label="Agents" value={data.agentCount} />
      </MetadataList>

      {/* Active Agents */}
      {activeAgents.length > 0 && (
        <section>
          <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Active Agents
          </Text>
          <ul className="space-y-1">
            {activeAgents.map((agent) => (
              <li
                key={agent.agentName}
                className="flex items-center justify-between rounded bg-muted/30 px-2 py-1 text-xs"
              >
                <span className="font-medium">{agent.agentName}</span>
                {agent.wave !== null && (
                  <span className="text-muted-foreground">Wave {agent.wave}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Files */}
      {files.length > 0 && (
        <section>
          <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Files ({files.length})
          </Text>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto">
            {files.map((f) => (
              <li key={f.path} className="truncate rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted/50">
                {f.relativePath}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Session Logs for active agents */}
      {activeAgents.map((agent) => (
        <SessionLogSection
          key={agent.agentName}
          agentName={agent.agentName}
          feature={data.feature}
          projectId={projectId}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/renderer/features/visualization/components/panels/NodeDetailPanel.tsx src/renderer/features/visualization/components/panels/node-detail/node-content.tsx src/renderer/features/visualization/components/panels/node-detail/FeatureGroupDetail.tsx`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/features/visualization/components/panels/NodeDetailPanel.tsx src/renderer/features/visualization/components/panels/node-detail/node-content.tsx src/renderer/features/visualization/components/panels/node-detail/FeatureGroupDetail.tsx
git commit -m "feat(visualization): FeatureGroupDetail shows files, active agents, and session logs"
```

---

## Wave 4 — Documentation + Polish

---

### Task 11: CLAUDE.md — Update Cache-Update Pattern

**Files:**
- Modify: `CLAUDE.md`

The current CLAUDE.md says "React Query mutations use simple `onSuccess` invalidation — NOT optimistic updates (IPC is <1ms)". This is incomplete — it doesn't mention the event-driven `setQueryData` pattern used in EventBridge.

- [ ] **Step 1: Update the Data Layer section**

In `CLAUDE.md`, find:

```
- React Query mutations use simple `onSuccess` invalidation — NOT optimistic updates (IPC is <1ms)
```

Replace with:

```
- **Mutations** use `onSuccess` invalidation (`queryClient.invalidateQueries`) — NOT optimistic updates (IPC is <1ms)
- **Event-driven cache updates** use `setQueryData` via EventBridge `append` handlers — this is distinct from mutation invalidation. When IPC events arrive (e.g., `BUS_EVENTS.SESSION.*`), the EventBridge patches the cache directly without a re-fetch.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude.md): clarify mutation invalidation vs event-driven setQueryData"
```

---

### Task 12: createdAt Timestamps Globally (Task 2.8)

**Files:**
- Modify list/card components for: notes, ideas, milestones, alerts, captures, progress tasks

Add `createdAt` shown as relative time ("3d ago") to list views. Hover tooltip shows absolute time. Use `date-fns` `formatDistanceToNow` or the existing relative time utilities in the codebase.

- [ ] **Step 1: Find the relative time utility**

Run: `grep -r "formatDistanceToNow\|relativeTime\|timeAgo" src/renderer/shared/ --include="*.ts" --include="*.tsx" -l`

If found, use that utility. If not found, use `date-fns`:

```typescript
import { formatDistanceToNow } from 'date-fns';

function relativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}
```

- [ ] **Step 2: Add createdAt to Notes list**

Find the notes list component (likely `src/renderer/features/personal/notes/components/NotesPage.tsx` or similar). Locate where note cards are rendered and add after the title:

```tsx
<span
  className="text-xs text-muted-foreground"
  title={new Date(note.createdAt).toLocaleString()}
>
  {relativeTime(note.createdAt)}
</span>
```

- [ ] **Step 3: Add createdAt to Ideas list**

Find `src/renderer/features/ideation/components/IdeationPage.tsx` or idea card component. Add relative time display in the same pattern.

- [ ] **Step 4: Add createdAt to Milestones**

Find `src/renderer/features/roadmap/components/RoadmapPage.tsx`. Add relative time to each milestone card.

- [ ] **Step 5: Add createdAt to Alerts**

Find `src/renderer/features/personal/alerts/components/AlertsPage.tsx`. Add relative time display.

- [ ] **Step 6: Add createdAt to Captures (QuickCapture)**

Find `src/renderer/features/dashboard/components/QuickCapture.tsx`. Add relative time to each capture item.

- [ ] **Step 7: Add createdAt to Progress Tasks grid**

In `src/renderer/features/tasks/components/grid/ProgressTaskGrid.tsx`, add a `createdAt` column or display in the detail row. Find where `ProgressTask` fields are displayed and add:

```tsx
<span
  className="text-xs text-muted-foreground"
  title={new Date(task.createdAt).toLocaleString()}
>
  {relativeTime(task.createdAt)}
</span>
```

- [ ] **Step 8: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add -p  # stage relevant files
git commit -m "feat(ui): add relative createdAt timestamps to all list views"
```

---

## Final Validation

- [ ] **Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Lint changed files**

Run: `npx eslint src/main/features/workspaces/ src/renderer/features/bus/ src/renderer/features/tasks/api/useAgentMutations.ts src/renderer/features/workflow/api/useWorkflow.ts src/renderer/features/visualization/`
Expected: no errors

- [ ] **Acceptance criteria review**

Check each area's acceptance criteria from the spec at `docs/superpowers/specs/2026-04-13-sprint-6-7-foundation-design.md`. Mark complete.

---

## Dependency Map

```
Wave 1 (parallel):
  Task 1 (migration) → Task 2 (service) → Task 5 (registry wiring)
  Task 3 (workflow stubs) — independent
  Task 4 (deprecation) — independent

Wave 2:
  Task 5 (workspaces wiring) — needs Task 2
  Task 6 (bus renderer) — independent

Wave 3 (parallel):
  Task 7 (useVisualization) → Task 10 (FeatureGroupDetail needs useVisualization import)
  Task 8 (EventBridge bus events) — independent
  Task 9 (AgentTaskNode rings) — independent

Wave 4 (parallel):
  Task 11 (CLAUDE.md) — independent
  Task 12 (createdAt) — independent
```
