# Hub Relay Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all known bugs, complete missing tasks, and add test/doc coverage for the hub-relay feature so it can ship.

**Architecture:** The relay system enables cross-device Claude sessions. A "claimer" device claims a project hosted on a remote device, then spawns/streams/kills sessions through the Hub WebSocket relay. The implementation lives across shared IPC contracts, main-process services, Hub server routes, and renderer React Query hooks. This plan fixes 3 IPC gaps, wires the heartbeat service properly, builds the missing relay session UI hook, and adds tests + docs.

**Tech Stack:** TypeScript, Zod, Electron IPC, TanStack Query, Vitest, Hub REST API

**Branch:** `feature/hub-relay` (based on `master` at `2b60eb5`)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/ipc/relay/contract.ts` | Modify | Add `relay.forceReclaim` and `relay.releaseProject` invoke channels |
| `src/shared/ipc/relay/schemas.ts` | Modify | Add `ForceReclaimInputSchema` |
| `src/shared/ipc/projects/contract.ts` | Modify | Add `projects.listAll` invoke channel |
| `src/shared/ipc/projects/schemas.ts` | Modify | Add `ProjectSchema` fields for `remote`, `hostDeviceId`, `hostDeviceName`, `claimedByDeviceId` (if not already present) |
| `src/main/ipc/handlers/relay-handlers.ts` | Modify | Add `relay.forceReclaim` and `relay.releaseProject` handlers |
| `src/main/ipc/handlers/project-handlers.ts` | Modify | Add `projects.listAll` handler |
| `src/main/bootstrap/service-registry.ts` | Modify | Replace inline heartbeat with `createHeartbeatService` |
| `src/renderer/features/workspace/hooks/useRelaySession.ts` | Create | Hook for relay session lifecycle events |
| `src/renderer/features/workspace/api/useWorkspace.ts` | Modify | Add `useSpawnRemoteSession` mutation |
| `src/renderer/features/projects/api/useProjects.ts` | Modify | Add `useAllProjects` query hook |
| `tests/unit/services/relay-service.test.ts` | Create | Unit tests for relay service |
| `tests/integration/ipc-handlers/relay-handlers.test.ts` | Create | Integration tests for relay IPC handlers |
| `docs/routing/FEATURES-INDEX.md` | Modify | Add relay domain entry |
| `docs/routing/AI-AGENT-ROUTING-INDEX.md` | Modify | Add relay domain trace |

---

### Task 1: Add Missing IPC Contract Channels

**Files:**
- Modify: `src/shared/ipc/relay/contract.ts`
- Modify: `src/shared/ipc/relay/schemas.ts`
- Modify: `src/shared/ipc/projects/contract.ts`

- [ ] **Step 1: Add `ForceReclaimInputSchema` to relay schemas**

In `src/shared/ipc/relay/schemas.ts`, add at the bottom before the closing comment:

```typescript
// ─── Force Reclaim Schema ─────────────────────────────────────

export const ForceReclaimInputSchema = z.object({
  projectId: z.string(),
});
```

- [ ] **Step 2: Add `relay.forceReclaim` and `relay.releaseProject` to relay contract**

In `src/shared/ipc/relay/contract.ts`, add these two channels inside `relayInvoke` after `relay.unclaimProject`:

```typescript
  'relay.forceReclaim': {
    input: z.object({
      projectId: z.string(),
    }),
    output: SuccessWithErrorSchema,
  },
  'relay.releaseProject': {
    input: z.object({
      projectId: z.string(),
    }),
    output: SuccessResponseSchema,
  },
```

Also add the `ForceReclaimInputSchema` import if using it (not needed here since we use inline `z.object`).

- [ ] **Step 3: Add `projects.listAll` to projects contract**

In `src/shared/ipc/projects/contract.ts`, add inside `projectsInvoke` after `projects.list`:

```typescript
  'projects.listAll': {
    input: z.object({ currentDeviceId: z.string() }),
    output: z.array(ProjectSchema),
  },
```

- [ ] **Step 4: Run typecheck to verify contract changes compile**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -30`
Expected: No new errors from the contract files. There may be errors about missing handlers — that's expected and fixed in Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ipc/relay/contract.ts src/shared/ipc/relay/schemas.ts src/shared/ipc/projects/contract.ts
git commit -m "feat(ipc): add relay.forceReclaim, relay.releaseProject, and projects.listAll contracts"
```

---

### Task 2: Implement Missing IPC Handlers

**Files:**
- Modify: `src/main/ipc/handlers/relay-handlers.ts`
- Modify: `src/main/ipc/handlers/project-handlers.ts`

- [ ] **Step 1: Write failing test for `relay.forceReclaim` handler**

Create a quick smoke test. In `tests/integration/ipc-handlers/relay-handlers.test.ts`:

```typescript
/**
 * Integration tests for relay IPC handlers
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HubApiClient } from '@main/services/hub/hub-api-client';
import type { IpcRouter } from '@main/ipc/router';

function createMockHubApiClient(): HubApiClient {
  return {
    hubGet: vi.fn(),
    hubPost: vi.fn(),
    hubPatch: vi.fn(),
    hubPut: vi.fn(),
    hubDelete: vi.fn(),
    listTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    pushProgress: vi.fn(),
    updateTaskStatus: vi.fn(),
    executeTask: vi.fn(),
    cancelTask: vi.fn(),
    registerDevice: vi.fn(),
    heartbeat: vi.fn(),
  };
}

function createMockRouter(): IpcRouter & {
  _handlers: Map<string, (input: unknown) => Promise<unknown>>;
  _emitted: Array<{ channel: string; payload: unknown }>;
} {
  const handlers = new Map<string, (input: unknown) => Promise<unknown>>();
  const emitted: Array<{ channel: string; payload: unknown }> = [];

  return {
    _handlers: handlers,
    _emitted: emitted,
    handle(channel: string, handler: (input: unknown) => Promise<unknown>) {
      handlers.set(channel, handler);
    },
    emit(channel: string, payload: unknown) {
      emitted.push({ channel, payload });
    },
  } as unknown as IpcRouter & {
    _handlers: Map<string, (input: unknown) => Promise<unknown>>;
    _emitted: Array<{ channel: string; payload: unknown }>;
  };
}

describe('registerRelayHandlers', () => {
  let router: ReturnType<typeof createMockRouter>;
  let hubApiClient: HubApiClient;
  const getDeviceId = vi.fn(() => 'device-1');

  beforeEach(() => {
    router = createMockRouter();
    hubApiClient = createMockHubApiClient();
    vi.clearAllMocks();
  });

  async function loadAndRegister() {
    const { registerRelayHandlers } = await import(
      '@main/ipc/handlers/relay-handlers'
    );
    registerRelayHandlers(router, hubApiClient, getDeviceId);
  }

  describe('relay.forceReclaim', () => {
    it('calls Hub force-reclaim endpoint and emits projectClaimed event', async () => {
      vi.mocked(hubApiClient.hubPost).mockResolvedValueOnce({
        ok: true,
        data: {
          data: {
            projectId: 'proj-1',
            claimedByDeviceId: 'device-1',
            hostDeviceId: 'device-2',
            expiresAt: '2026-04-08T12:00:00Z',
            forceReclaim: true,
          },
        },
        statusCode: 200,
      });

      await loadAndRegister();
      const handler = router._handlers.get('relay.forceReclaim');
      expect(handler).toBeDefined();

      const result = await handler!({ projectId: 'proj-1' });
      expect(result).toEqual({ success: true });

      expect(hubApiClient.hubPost).toHaveBeenCalledWith(
        '/api/projects/proj-1/force-reclaim',
        { deviceId: 'device-1' },
      );

      expect(router._emitted).toContainEqual(
        expect.objectContaining({ channel: 'event:relay.projectClaimed' }),
      );
    });

    it('returns error when device not registered', async () => {
      getDeviceId.mockReturnValueOnce(null);

      await loadAndRegister();
      const handler = router._handlers.get('relay.forceReclaim');
      const result = await handler!({ projectId: 'proj-1' });

      expect(result).toEqual({
        success: false,
        error: 'Device not registered — cannot force-reclaim project',
      });
    });
  });

  describe('relay.releaseProject', () => {
    it('calls Hub release endpoint and emits projectUnclaimed event', async () => {
      vi.mocked(hubApiClient.hubPost).mockResolvedValueOnce({
        ok: true,
        data: { success: true },
        statusCode: 200,
      });

      await loadAndRegister();
      const handler = router._handlers.get('relay.releaseProject');
      expect(handler).toBeDefined();

      const result = await handler!({ projectId: 'proj-1' });
      expect(result).toEqual({ success: true });

      expect(hubApiClient.hubPost).toHaveBeenCalledWith(
        '/api/projects/proj-1/release',
        { deviceId: 'device-1' },
      );

      expect(router._emitted).toContainEqual(
        expect.objectContaining({ channel: 'event:relay.projectUnclaimed' }),
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/integration/ipc-handlers/relay-handlers.test.ts 2>&1 | tail -20`
Expected: FAIL — `relay.forceReclaim` handler not registered.

- [ ] **Step 3: Add `relay.forceReclaim` and `relay.releaseProject` handlers**

In `src/main/ipc/handlers/relay-handlers.ts`, add after the `relay.unclaimProject` handler:

```typescript
  // ─── relay.forceReclaim ──────────────────────────────────────
  router.handle('relay.forceReclaim', async ({ projectId }) => {
    const deviceId = getDeviceId();
    if (!deviceId) {
      return { success: false, error: 'Device not registered — cannot force-reclaim project' };
    }

    const result = await hubApiClient.hubPost<HubClaimResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/force-reclaim`,
      { deviceId },
    );

    if (!result.ok) {
      return { success: false, error: result.error ?? 'Failed to force-reclaim project' };
    }

    router.emit('event:relay.projectClaimed', {
      projectId,
      claimedByDeviceId: deviceId,
      claimedAt: new Date().toISOString(),
    });

    return { success: true };
  });

  // ─── relay.releaseProject ────────────────────────────────────
  router.handle('relay.releaseProject', async ({ projectId }) => {
    const deviceId = getDeviceId();
    if (!deviceId) {
      throw new Error('Device not registered — cannot release project');
    }

    const result = await hubApiClient.hubPost<{ success: boolean }>(
      `/api/projects/${encodeURIComponent(projectId)}/release`,
      { deviceId },
    );

    if (!result.ok) {
      throw new Error(result.error ?? 'Failed to release project');
    }

    router.emit('event:relay.projectUnclaimed', {
      projectId,
      unclaimedAt: new Date().toISOString(),
    });

    return { success: true };
  });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/integration/ipc-handlers/relay-handlers.test.ts 2>&1 | tail -20`
Expected: PASS — all 3 tests pass.

- [ ] **Step 5: Add `projects.listAll` handler**

In `src/main/ipc/handlers/project-handlers.ts`, inside `registerProjectHandlers`, add after the `projects.list` handler:

```typescript
  // ─── projects.listAll ─────────────────────────────────────────
  router.handle('projects.listAll', async ({ currentDeviceId }) => {
    return service.listAllProjects(currentDeviceId);
  });
```

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/main/ipc/handlers/relay-handlers.ts src/main/ipc/handlers/project-handlers.ts tests/integration/ipc-handlers/relay-handlers.test.ts
git commit -m "feat(relay): add forceReclaim, releaseProject, and listAll IPC handlers with tests"
```

---

### Task 3: Wire HeartbeatService in Service Registry

**Files:**
- Modify: `src/main/bootstrap/service-registry.ts`

- [ ] **Step 1: Write failing test for heartbeat wiring**

In `tests/unit/services/relay-service.test.ts`, add a focused test:

```typescript
/**
 * Unit Tests — Relay Service
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RelayEnvelope, SessionSpawnPayload } from '@shared/types/relay';

describe('RelayService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function createFreshService() {
    vi.resetModules();
    const { createRelayService } = await import(
      '@main/services/relay/relay-service'
    );
    return createRelayService();
  }

  describe('spawnRemoteSession()', () => {
    it('sends a spawn envelope through the send function', () => {
      const sendFn = vi.fn();
      const service = createFreshService();

      return service.then((s) => {
        s.setSendFn(sendFn);
        const sessionId = s.spawnRemoteSession('host-1', 'proj-1', {
          agentRole: 'coder',
          prompt: 'Fix the bug',
          workDir: '/path/to/project',
          taskId: 'task-1',
        });

        expect(sessionId).toMatch(/^relay-/);
        expect(sendFn).toHaveBeenCalledOnce();

        const envelope = sendFn.mock.calls[0][0] as RelayEnvelope;
        expect(envelope.type).toBe('spawn');
        expect(envelope.sessionId).toBe(sessionId);
      });
    });
  });

  describe('isRemoteProject()', () => {
    it('returns false for unregistered projects', async () => {
      const service = await createFreshService();
      expect(service.isRemoteProject('proj-1')).toBe(false);
    });

    it('returns true after registerRemoteProject', async () => {
      const service = await createFreshService();
      service.registerRemoteProject('proj-1', 'host-1');
      expect(service.isRemoteProject('proj-1')).toBe(true);
    });

    it('returns false after unregisterRemoteProject', async () => {
      const service = await createFreshService();
      service.registerRemoteProject('proj-1', 'host-1');
      service.unregisterRemoteProject('proj-1');
      expect(service.isRemoteProject('proj-1')).toBe(false);
    });
  });

  describe('getHostDeviceId()', () => {
    it('returns undefined for unregistered projects', async () => {
      const service = await createFreshService();
      expect(service.getHostDeviceId('proj-1')).toBeUndefined();
    });

    it('returns host device ID for registered projects', async () => {
      const service = await createFreshService();
      service.registerRemoteProject('proj-1', 'host-1');
      expect(service.getHostDeviceId('proj-1')).toBe('host-1');
    });
  });

  describe('killSession()', () => {
    it('sends a kill envelope and removes session state', async () => {
      const sendFn = vi.fn();
      const service = await createFreshService();
      service.setSendFn(sendFn);

      const sessionId = service.spawnRemoteSession('host-1', 'proj-1', {
        agentRole: 'coder',
        prompt: 'Fix the bug',
        workDir: '/path/to/project',
        taskId: 'task-1',
      });

      sendFn.mockClear();
      service.killSession(sessionId, 'user cancelled');

      expect(sendFn).toHaveBeenCalledOnce();
      const envelope = sendFn.mock.calls[0][0] as RelayEnvelope;
      expect(envelope.type).toBe('kill');
      expect(envelope.sessionId).toBe(sessionId);
    });

    it('logs warning for unknown session', async () => {
      const service = await createFreshService();
      // Should not throw
      service.killSession('nonexistent-session');
    });
  });

  describe('handleHubMessage()', () => {
    it('ignores non-relay messages', async () => {
      const service = await createFreshService();
      // Should not throw
      service.handleHubMessage({ type: 'notification', data: {} });
      service.handleHubMessage('not an object');
      service.handleHubMessage(null);
    });
  });
});
```

- [ ] **Step 2: Run the relay service tests**

Run: `npx vitest run tests/unit/services/relay-service.test.ts 2>&1 | tail -20`
Expected: PASS — all tests pass (these test the existing service, confirming it works).

- [ ] **Step 3: Replace inline heartbeat with HeartbeatService**

In `src/main/bootstrap/service-registry.ts`, find the heartbeat section (around lines 315-355). Replace the inline `heartbeatIntervalId` / `setInterval` block.

**Remove** the following variables and inline heartbeat code:
```typescript
  let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  // ... the entire setInterval block inside registerDeviceAndStartHeartbeat
```

**Replace** with:

```typescript
  const heartbeatService = createHeartbeatService({
    deviceService,
    projectSource: projectService,
    intervalMs: HEARTBEAT_INTERVAL_MS,
  });
```

Add the import at the top of the file:
```typescript
import { createHeartbeatService } from '../services/device/heartbeat';
```

Inside `registerDeviceAndStartHeartbeat`, after the device registration succeeds, replace the `setInterval` block with:
```typescript
        heartbeatService.start(result.data.id);
        appLogger.info('[Hub] Heartbeat service started (30s)');
```

Remove `heartbeatIntervalId` from the returned registry object. Add `heartbeatService` if the registry exposes it (check existing return shape).

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 5: Run lint**

Run: `npx eslint src/main/bootstrap/service-registry.ts --max-warnings 0 2>&1 | tail -10`
Expected: No warnings.

- [ ] **Step 6: Commit**

```bash
git add src/main/bootstrap/service-registry.ts tests/unit/services/relay-service.test.ts
git commit -m "fix(relay): wire HeartbeatService with project source in service registry"
```

---

### Task 4: Add `useAllProjects` Query Hook

**Files:**
- Modify: `src/renderer/features/projects/api/useProjects.ts`
- Modify: `src/renderer/features/projects/api/queryKeys.ts`

- [ ] **Step 1: Add `useAllProjects` hook**

In `src/renderer/features/projects/api/useProjects.ts`, add after the `useProjects` hook:

```typescript
/** Fetch all projects across all connected devices (includes remote projects) */
export function useAllProjects() {
  const { currentDeviceId } = useDeviceStore();
  return useQuery({
    queryKey: projectKeys.allProjects(),
    queryFn: () => ipc('projects.listAll', { currentDeviceId: currentDeviceId ?? '' }),
    enabled: currentDeviceId !== null && currentDeviceId.length > 0,
    staleTime: 60_000,
  });
}
```

Add the import at the top:
```typescript
import { useDeviceStore } from '@features/devices';
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -30`
Expected: No errors (the `projects.listAll` channel was added in Task 1).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/features/projects/api/useProjects.ts
git commit -m "feat(projects): add useAllProjects hook for cross-device project list"
```

---

### Task 5: Create `useRelaySession` Hook

**Files:**
- Create: `src/renderer/features/workspace/hooks/useRelaySession.ts`
- Modify: `src/renderer/features/workspace/api/useWorkspace.ts`

- [ ] **Step 1: Create the relay session hook**

Create `src/renderer/features/workspace/hooks/useRelaySession.ts`:

```typescript
/**
 * useRelaySession — listens for relay session events and normalizes
 * them into a shape consumable by the workspace session list.
 *
 * Subscribes to:
 *   event:relay.sessionSpawned — adds a new remote session entry
 *   event:relay.sessionOutput  — appends output to the session's buffer
 *   event:relay.sessionEnded   — marks the session as completed
 */

import { useCallback, useRef, useState } from 'react';

import { useIpcEvent } from '@renderer/shared/hooks';

export interface RelaySessionEntry {
  sessionId: string;
  projectId: string;
  status: 'running' | 'completed' | 'error';
  exitCode?: number;
  outputLines: string[];
  startedAt: string;
  endedAt?: string;
}

/**
 * Tracks relay sessions for a specific project.
 * Returns the current list of relay sessions and a clear function.
 */
export function useRelaySession(projectId: string | null) {
  const sessionsRef = useRef<Map<string, RelaySessionEntry>>(new Map());
  const [sessions, setSessions] = useState<RelaySessionEntry[]>([]);

  const sync = useCallback(() => {
    setSessions([...sessionsRef.current.values()]);
  }, []);

  useIpcEvent(
    'event:relay.sessionSpawned',
    useCallback(
      (payload: { sessionId: string; projectId: string }) => {
        if (projectId !== null && payload.projectId !== projectId) return;

        sessionsRef.current.set(payload.sessionId, {
          sessionId: payload.sessionId,
          projectId: payload.projectId,
          status: 'running',
          outputLines: [],
          startedAt: new Date().toISOString(),
        });
        sync();
      },
      [projectId, sync],
    ),
  );

  useIpcEvent(
    'event:relay.sessionOutput',
    useCallback(
      (payload: { sessionId: string; output: { data: string } }) => {
        const entry = sessionsRef.current.get(payload.sessionId);
        if (!entry) return;

        entry.outputLines.push(payload.output.data);
        sync();
      },
      [sync],
    ),
  );

  useIpcEvent(
    'event:relay.sessionEnded',
    useCallback(
      (payload: {
        sessionId: string;
        ended: { exitCode: number; endedAt: string };
      }) => {
        const entry = sessionsRef.current.get(payload.sessionId);
        if (!entry) return;

        entry.status = payload.ended.exitCode === 0 ? 'completed' : 'error';
        entry.exitCode = payload.ended.exitCode;
        entry.endedAt = payload.ended.endedAt;
        sync();
      },
      [sync],
    ),
  );

  const clearSessions = useCallback(() => {
    sessionsRef.current.clear();
    setSessions([]);
  }, []);

  return { relaySessions: sessions, clearRelaySessions: clearSessions };
}
```

- [ ] **Step 2: Add `useSpawnRemoteSession` mutation to useWorkspace**

In `src/renderer/features/workspace/api/useWorkspace.ts`, add at the bottom of the file:

```typescript
/** Spawn a Claude session on a remote host device via relay */
export function useSpawnRemoteSession() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (data: {
      hostDeviceId: string;
      projectId: string;
      payload: {
        agentRole: string;
        prompt: string;
        workDir: string;
        taskId: string;
      };
    }) => ipc('relay.spawnSession', data),
    onError: onError('spawn remote session'),
  });
}
```

Add the missing import if not already present:
```typescript
import { useMutationErrorToast } from '@renderer/shared/hooks';
```

- [ ] **Step 3: Export from workspace barrel**

Verify `src/renderer/features/workspace/index.ts` exports the new hook. If a barrel exists, add:
```typescript
export { useRelaySession } from './hooks/useRelaySession';
```

If there's no barrel, skip this — consumers import directly.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 5: Run lint**

Run: `npx eslint src/renderer/features/workspace/hooks/useRelaySession.ts src/renderer/features/workspace/api/useWorkspace.ts --max-warnings 0 2>&1 | tail -10`
Expected: No warnings.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/features/workspace/hooks/useRelaySession.ts src/renderer/features/workspace/api/useWorkspace.ts
git commit -m "feat(relay): add useRelaySession hook and useSpawnRemoteSession mutation"
```

---

### Task 6: Fix ProjectListPage Force-Reclaim Wiring

**Files:**
- Modify: `src/renderer/features/projects/api/useProjects.ts`
- Modify: `src/renderer/features/projects/components/ProjectListPage.tsx`

- [ ] **Step 1: Add `useForceReclaimProject` mutation**

In `src/renderer/features/projects/api/useProjects.ts`, add:

```typescript
/** Force-reclaim a project that another device has claimed */
export function useForceReclaimProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (projectId: string) =>
      ipc('relay.forceReclaim', { projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    onError: onError('force-reclaim project'),
  });
}
```

- [ ] **Step 2: Update ProjectListPage to use the new mutation**

In `src/renderer/features/projects/components/ProjectListPage.tsx`, find the import of `useReleaseProject` and add `useForceReclaimProject`:

```typescript
import {
  useClaimProject,
  useForceReclaimProject,
  useProjects,
  useReleaseProject,
  useRemoveProject,
  useSubProjects,
} from '../api/useProjects';
```

In the `ProjectListPage` component body, add:
```typescript
  const forceReclaimProject = useForceReclaimProject();
```

Update `handleForceReclaimProject` to use the dedicated mutation instead of the release→reopen hack:

```typescript
  function handleForceReclaimProject(
    e: React.MouseEvent | React.KeyboardEvent,
    project: Project,
  ) {
    e.stopPropagation();
    forceReclaimProject.mutate(project.id, {
      onSuccess: (result) => {
        if (result.success) {
          addToast('Project reclaimed', 'success');
          addProjectTab(project.id);
          void navigate({ to: projectViewPath(project.id, PROJECT_VIEWS.TASKS) });
        } else {
          addToast(result.error ?? 'Failed to reclaim project', 'error');
        }
      },
    });
  }
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 4: Run lint**

Run: `npx eslint src/renderer/features/projects/components/ProjectListPage.tsx src/renderer/features/projects/api/useProjects.ts --max-warnings 0 2>&1 | tail -10`
Expected: No warnings.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/features/projects/api/useProjects.ts src/renderer/features/projects/components/ProjectListPage.tsx
git commit -m "fix(relay): wire force-reclaim to dedicated IPC channel instead of release hack"
```

---

### Task 7: Update Documentation

**Files:**
- Modify: `docs/routing/FEATURES-INDEX.md`
- Modify: `docs/routing/AI-AGENT-ROUTING-INDEX.md`

- [ ] **Step 1: Add relay domain to FEATURES-INDEX**

In `docs/routing/FEATURES-INDEX.md`, add a row to the domain table (alphabetically near "relay"):

```markdown
| **relay** | Cross-device session relay. Manages project claims, session lifecycle (spawn/input/output/kill/resume), and WebSocket message routing between claimer and host devices. | claimProject, unclaimProject, forceReclaim, releaseProject, spawnSession, sendInput, killSession, resumeSession, sendEnvelope | `event:relay.projectClaimed`, `event:relay.projectUnclaimed`, `event:relay.sessionSpawned`, `event:relay.sessionOutput`, `event:relay.sessionEnded`, `event:relay.messageReceived` |
```

- [ ] **Step 2: Add relay domain trace to AI-AGENT-ROUTING-INDEX**

In `docs/routing/AI-AGENT-ROUTING-INDEX.md`, add a relay section. Match the existing format in the file. Include:

```markdown
## Relay Domain

End-to-end trace for cross-device session relay.

| Layer | File | Purpose |
|-------|------|---------|
| Types | `src/shared/types/relay.ts` | `RelayEnvelope`, `SessionSpawnPayload`, `SessionOutputPayload`, etc. |
| Schemas | `src/shared/ipc/relay/schemas.ts` | Zod schemas mirroring relay types |
| Contract | `src/shared/ipc/relay/contract.ts` | 9 invoke channels + 6 event channels |
| Handlers | `src/main/ipc/handlers/relay-handlers.ts` | `relay.claimProject`, `relay.unclaimProject`, `relay.forceReclaim`, `relay.releaseProject` |
| Service | `src/main/services/relay/relay-service.ts` | `createRelayService()` — incoming/outgoing session routing |
| Service Types | `src/main/services/relay/relay-types.ts` | Hub API response shapes (`HubClaimResponse`, `RemoteProjectRaw`) |
| Heartbeat | `src/main/services/device/heartbeat.ts` | `createHeartbeatService()` — sends project list with each heartbeat |
| Hub WS | `hub/src/ws/relay-router.ts` | Hub-side WebSocket relay (point-to-point session routing) |
| Hub Routes | `hub/src/routes/relay.ts` | Hub REST routes for claim/release/force-reclaim |
| Hub Migration | `hub/src/db/migrations/006_relay_tables.sql` | `session_relay`, `project_claim` tables |
| Renderer Hook | `src/renderer/features/workspace/hooks/useRelaySession.ts` | `useRelaySession()` — subscribes to relay session events |
| Renderer Mutations | `src/renderer/features/projects/api/useProjects.ts` | `useClaimProject()`, `useReleaseProject()`, `useForceReclaimProject()`, `useAllProjects()` |
| Renderer Mutations | `src/renderer/features/workspace/api/useWorkspace.ts` | `useSpawnRemoteSession()` |
| EventBridge | `src/renderer/shared/components/EventBridge.tsx` | `event:relay.projectClaimed` → invalidates `['projects', 'list']` |
```

- [ ] **Step 3: Commit**

```bash
git add docs/routing/FEATURES-INDEX.md docs/routing/AI-AGENT-ROUTING-INDEX.md
git commit -m "docs: add relay domain to FEATURES-INDEX and AI-AGENT-ROUTING-INDEX"
```

---

### Task 8: Full Verification Pass

**Files:** None (verification only)

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck 2>&1 | tail -20`
Expected: Exit code 0, no errors.

- [ ] **Step 2: Run full lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: Exit code 0, no warnings.

- [ ] **Step 3: Run full build**

Run: `npm run build 2>&1 | tail -20`
Expected: Exit code 0, successful build.

- [ ] **Step 4: Run full test suite**

Run: `npm run test 2>&1 | tail -30`
Expected: All tests pass, including the 2 new test files.

- [ ] **Step 5: Verify all relay IPC channels have handlers**

Run: `grep -oP "'relay\.\w+'" src/shared/ipc/relay/contract.ts | sort` and compare with `grep -oP "'relay\.\w+'" src/main/ipc/handlers/relay-handlers.ts | sort`.

Every invoke channel in the contract should have a corresponding handler registration.

- [ ] **Step 6: Verify EventBridge event names match handler emissions**

Run: `grep "event:relay" src/renderer/shared/components/EventBridge.tsx` and `grep "event:relay" src/main/ipc/handlers/relay-handlers.ts`.

Event names in EventBridge should match exactly what handlers emit.

- [ ] **Step 7: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "fix(relay): verification pass fixes"
```
