# Workspace & Assistant Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty-state agent dashboard with always-on Primary Claude + Team Lead sessions per project, strip the assistant widget to a direct Claude CLI subprocess, and remove 40px of redundant chrome from every view.

**Architecture:** WorkspaceSessionManager (new main-process service) owns session lifecycle via the existing AgentManagerService. Renderer is purely state-based — sessions persist across project tab switches. The ContentHeader bar is deleted and its SidebarTrigger migrates into TopBar.

**Tech Stack:** Electron 39 + React 19, Zustand 5, TanStack Query, TanStack Router, Zod, `electron-vite` (IPC via typed `ipcInvokeContract` / `ipcEventContract`), existing `AgentManagerService`

---

## File Map

**New files (workspace domain):**
- `src/shared/ipc/workspace/schemas.ts` — SessionKey, WorkspaceSession Zod schemas
- `src/shared/ipc/workspace/contract.ts` — workspaceInvoke + workspaceEvents
- `src/shared/ipc/workspace/index.ts` — barrel
- `src/main/services/workspace/workspace-session-manager.ts` — session lifecycle service
- `src/main/ipc/handlers/workspace-handlers.ts` — thin IPC handlers
- `src/renderer/features/workspace/store.ts` — view-only Zustand store
- `src/renderer/features/workspace/api/useWorkspace.ts` — React Query + event hooks
- `src/renderer/features/workspace/components/WorkspacePage.tsx` — root page component
- `src/renderer/features/workspace/components/PrimarySessionPanel.tsx` — left 55% panel
- `src/renderer/features/workspace/components/TeamLeadPanel.tsx` — single TL card
- `src/renderer/features/workspace/components/TeamLeadPanelList.tsx` — right column
- `src/renderer/features/workspace/index.ts` — public barrel

**Modified files:**
- `src/shared/ipc/index.ts` — add workspace barrel import + spread
- `src/main/bootstrap/service-registry.ts` — register WorkspaceSessionManager + handlers
- `src/renderer/app/layouts/LayoutWrapper.tsx` — remove ContentHeader
- `src/renderer/app/layouts/TopBar.tsx` — add SidebarTrigger leftmost slot
- `src/renderer/app/routes/project.routes.ts` — swap AgentDashboardPage → WorkspacePage
- `src/renderer/app/layouts/Sidebar.tsx` — "Agents" → "Workspace" label
- `src/renderer/app/layouts/sidebar-layouts/shared-nav.ts` — same label update
- `src/main/services/assistant/assistant-service.ts` — strip to direct Claude CLI
- `src/renderer/features/assistant/components/WidgetPanel.tsx` — remove quick actions
- `src/shared/ipc/assistant/schemas.ts` — remove IntentTypeSchema, AssistantActionSchema
- `src/shared/ipc/assistant/contract.ts` — simplify sendCommand input/output
- `src/shared/ipc/index.ts` — remove intent/action schema re-exports

**Deleted directories:**
- `src/main/services/assistant/intent-classifier/` — entire directory
- `src/main/services/assistant/executors/` — entire directory

---

## Task 1: Workspace IPC Domain — Schemas + Contract + Barrel

**Files:**
- Create: `src/shared/ipc/workspace/schemas.ts`
- Create: `src/shared/ipc/workspace/contract.ts`
- Create: `src/shared/ipc/workspace/index.ts`
- Modify: `src/shared/ipc/index.ts`

- [ ] **Step 1: Create `src/shared/ipc/workspace/schemas.ts`**

```typescript
/**
 * Workspace IPC Schemas
 *
 * Zod schemas for always-on Primary Claude + Team Lead sessions per project.
 */

import { z } from 'zod';

export const SessionTypeSchema = z.enum(['primary', 'team-lead']);

export const SessionKeySchema = z.object({
  projectId: z.string(),
  type: SessionTypeSchema,
  /** 0 = always-on Team Lead, 1+ = user-spawned */
  index: z.number().int().nonnegative(),
});

export const WorkspaceSessionStatusSchema = z.enum([
  'starting',
  'live',
  'crashed',
  'restarting',
]);

export const WorkspaceSessionSchema = z.object({
  key: SessionKeySchema,
  agentSessionId: z.string(),
  projectPath: z.string(),
  model: z.string(),
  status: WorkspaceSessionStatusSchema,
  startedAt: z.number(),
  crashCount: z.number().int().nonnegative(),
});

export type SessionKey = z.infer<typeof SessionKeySchema>;
export type WorkspaceSession = z.infer<typeof WorkspaceSessionSchema>;
export type WorkspaceSessionStatus = z.infer<typeof WorkspaceSessionStatusSchema>;
```

- [ ] **Step 2: Create `src/shared/ipc/workspace/contract.ts`**

```typescript
/**
 * Workspace IPC Contract
 *
 * Invoke and event channel definitions for always-on project workspace sessions.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';
import { SessionKeySchema, WorkspaceSessionSchema } from './schemas';

export const workspaceInvoke = {
  /** Auto-spawn Primary + Team Lead sessions when a project tab opens. Idempotent. */
  'workspace.initProject': {
    input: z.object({
      projectId: z.string(),
      projectPath: z.string(),
    }),
    output: z.object({
      primarySessionId: z.string(),
      teamLeadSessionId: z.string(),
    }),
  },

  /** Get all active workspace sessions for a project. */
  'workspace.getSessions': {
    input: z.object({ projectId: z.string() }),
    output: z.array(WorkspaceSessionSchema),
  },

  /** Spawn an additional (mortal) Team Lead. Optionally pass a plan file path. */
  'workspace.spawnTeamLead': {
    input: z.object({
      projectId: z.string(),
      planPath: z.string().optional(),
    }),
    output: WorkspaceSessionSchema,
  },

  /** Stop a mortal Team Lead (index ≥ 1). Immortal sessions cannot be stopped this way. */
  'workspace.stopTeamLead': {
    input: z.object({
      projectId: z.string(),
      index: z.number().int().min(1),
    }),
    output: SuccessResponseSchema,
  },

  /** Send a message to a workspace session (proxies to agent-dashboard.sendMessage). */
  'workspace.sendMessage': {
    input: z.object({
      sessionId: z.string(),
      message: z.string(),
    }),
    output: SuccessResponseSchema,
  },
} as const;

export const workspaceEvents = {
  /** A workspace session is live and ready to receive messages. */
  'event:workspace.sessionReady': {
    payload: z.object({
      projectId: z.string(),
      sessionKey: SessionKeySchema,
      sessionId: z.string(),
    }),
  },

  /** A workspace session crashed. */
  'event:workspace.sessionCrashed': {
    payload: z.object({
      projectId: z.string(),
      sessionKey: SessionKeySchema,
      crashCount: z.number(),
    }),
  },

  /** An immortal workspace session restarted after a crash. */
  'event:workspace.sessionRestarted': {
    payload: z.object({
      projectId: z.string(),
      sessionKey: SessionKeySchema,
      sessionId: z.string(),
    }),
  },
} as const;
```

- [ ] **Step 3: Create `src/shared/ipc/workspace/index.ts`**

```typescript
export { workspaceInvoke, workspaceEvents } from './contract';
export {
  SessionKeySchema,
  SessionTypeSchema,
  WorkspaceSessionSchema,
  WorkspaceSessionStatusSchema,
} from './schemas';
export type { SessionKey, WorkspaceSession, WorkspaceSessionStatus } from './schemas';
```

- [ ] **Step 4: Wire workspace into root barrel `src/shared/ipc/index.ts`**

Add import at top of file (after the existing agent-dashboard import):

```typescript
import { workspaceEvents, workspaceInvoke } from './workspace';
```

In `ipcInvokeContract` spread (after `...agentDashboardInvoke`):

```typescript
  ...workspaceInvoke,
```

In `ipcEventContract` spread (after `...agentDashboardEvents`):

```typescript
  ...workspaceEvents,
```

Add schema re-exports at the bottom of the file:

```typescript
export {
  SessionKeySchema,
  SessionTypeSchema,
  WorkspaceSessionSchema,
  WorkspaceSessionStatusSchema,
} from './workspace';
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors in `src/shared/ipc/`

- [ ] **Step 6: Commit**

```bash
git add src/shared/ipc/workspace/ src/shared/ipc/index.ts
git commit -m "feat(workspace): add workspace IPC domain — schemas, contract, barrel"
```

---

## Task 2: WorkspaceSessionManager Service

**Files:**
- Create: `src/main/services/workspace/workspace-session-manager.ts`

- [ ] **Step 1: Create the service file**

```typescript
/**
 * WorkspaceSessionManager — always-on session lifecycle per project.
 *
 * Rules:
 * - primary + team-lead[0] are IMMORTAL: auto-restart on crash, never user-terminated.
 * - team-lead[1..N] are MORTAL: user can stop them, no auto-restart.
 * - initProject() is idempotent — safe to call every time a project tab opens.
 * - Sessions are keyed by projectId — switching tabs never touches sessions.
 */

import type { BrowserWindow } from 'electron';

import type { AgentManagerService } from '../agent-manager';
import type { SessionKey, WorkspaceSession, WorkspaceSessionStatus } from '@shared/ipc/workspace';

const PRIMARY_MODEL = 'claude-sonnet-4-6';
const TEAM_LEAD_MODEL = 'claude-sonnet-4-6';
const RESTART_DELAY_MS = 2000;

type SessionKeyString = string;

function keyToString(key: SessionKey): SessionKeyString {
  return `${key.projectId}:${key.type}:${key.index}`;
}

function isImmortal(key: SessionKey): boolean {
  return key.type === 'primary' || (key.type === 'team-lead' && key.index === 0);
}

export interface WorkspaceSessionManager {
  initProject(projectId: string, projectPath: string): Promise<{ primarySessionId: string; teamLeadSessionId: string }>;
  getSessions(projectId: string): WorkspaceSession[];
  spawnTeamLead(projectId: string, planPath?: string): Promise<WorkspaceSession>;
  stopTeamLead(projectId: string, index: number): Promise<{ success: boolean }>;
  sendMessage(sessionId: string, message: string): Promise<{ success: boolean }>;
  dispose(): void;
}

export function createWorkspaceSessionManager(
  agentManager: AgentManagerService,
  getWindow: () => BrowserWindow | null,
): WorkspaceSessionManager {
  const sessions = new Map<SessionKeyString, WorkspaceSession>();

  function sendEvent<T>(channel: string, payload: T): void {
    getWindow()?.webContents.send(channel, payload);
  }

  function updateSession(key: SessionKey, patch: Partial<WorkspaceSession>): void {
    const keyStr = keyToString(key);
    const existing = sessions.get(keyStr);
    if (existing) sessions.set(keyStr, { ...existing, ...patch });
  }

  async function spawnPrimary(projectId: string, projectPath: string): Promise<string> {
    const key: SessionKey = { projectId, type: 'primary', index: 0 };
    const keyStr = keyToString(key);

    const existing = sessions.get(keyStr);
    if (existing && (existing.status === 'live' || existing.status === 'starting')) {
      return existing.agentSessionId;
    }

    const session: WorkspaceSession = {
      key,
      agentSessionId: '',
      projectPath,
      model: PRIMARY_MODEL,
      status: 'starting',
      startedAt: Date.now(),
      crashCount: existing?.crashCount ?? 0,
    };
    sessions.set(keyStr, session);

    const result = await agentManager.spawnProjectOwner({
      projectPath,
      prompt: 'You are the primary Claude session for this project. Await instructions.',
      model: PRIMARY_MODEL,
      name: `workspace-primary-${projectId}`,
    });

    updateSession(key, { agentSessionId: result.sessionId, status: 'live' });
    sendEvent('event:workspace.sessionReady', { projectId, sessionKey: key, sessionId: result.sessionId });
    return result.sessionId;
  }

  async function spawnImmortalTeamLead(projectId: string, projectPath: string): Promise<string> {
    const key: SessionKey = { projectId, type: 'team-lead', index: 0 };
    const keyStr = keyToString(key);

    const existing = sessions.get(keyStr);
    if (existing && (existing.status === 'live' || existing.status === 'starting')) {
      return existing.agentSessionId;
    }

    const session: WorkspaceSession = {
      key,
      agentSessionId: '',
      projectPath,
      model: TEAM_LEAD_MODEL,
      status: 'starting',
      startedAt: Date.now(),
      crashCount: existing?.crashCount ?? 0,
    };
    sessions.set(keyStr, session);

    const result = await agentManager.spawnTeamLead({
      projectPath,
      teamName: `workspace-tl-${projectId}`,
      prompt: 'You are Team Lead 1 for this project. Await a plan file or instructions.',
      model: TEAM_LEAD_MODEL,
      name: `workspace-tl-${projectId}`,
    });

    updateSession(key, { agentSessionId: result.sessionId, status: 'live' });
    sendEvent('event:workspace.sessionReady', { projectId, sessionKey: key, sessionId: result.sessionId });
    return result.sessionId;
  }

  // Listen for agent session end events to handle immortal restart
  agentManager.onEvent((event) => {
    if (event.type !== 'session-ended') return;

    for (const [keyStr, session] of sessions.entries()) {
      if (session.agentSessionId !== event.sessionId) continue;

      const { key } = session;
      if (!isImmortal(key)) {
        // Mortal: just mark as crashed
        sessions.set(keyStr, { ...session, status: 'crashed' });
        return;
      }

      // Immortal: increment crash count, emit event, restart after delay
      const crashCount = session.crashCount + 1;
      sessions.set(keyStr, { ...session, status: 'restarting', crashCount });
      sendEvent('event:workspace.sessionCrashed', { projectId: key.projectId, sessionKey: key, crashCount });

      setTimeout(() => {
        const current = sessions.get(keyStr);
        if (!current) return;

        // Clear agentSessionId so spawnPrimary/spawnImmortalTeamLead will re-spawn
        sessions.set(keyStr, { ...current, agentSessionId: '', status: 'starting' });

        void (key.type === 'primary'
          ? spawnPrimary(key.projectId, session.projectPath)
          : spawnImmortalTeamLead(key.projectId, session.projectPath)
        ).then((newSessionId) => {
          sendEvent('event:workspace.sessionRestarted', {
            projectId: key.projectId,
            sessionKey: key,
            sessionId: newSessionId,
          });
        });
      }, RESTART_DELAY_MS);

      return;
    }
  });

  return {
    async initProject(projectId, projectPath) {
      const [primarySessionId, teamLeadSessionId] = await Promise.all([
        spawnPrimary(projectId, projectPath),
        spawnImmortalTeamLead(projectId, projectPath),
      ]);
      return { primarySessionId, teamLeadSessionId };
    },

    getSessions(projectId) {
      return [...sessions.values()].filter((s) => s.key.projectId === projectId);
    },

    async spawnTeamLead(projectId, planPath) {
      // Find next available mortal index
      const existing = [...sessions.values()].filter(
        (s) => s.key.projectId === projectId && s.key.type === 'team-lead',
      );
      const nextIndex = existing.length; // immortal is index 0, mortals start at 1

      const projectPath = existing[0]?.projectPath ?? '';
      const key: SessionKey = { projectId, type: 'team-lead', index: nextIndex };
      const keyStr = keyToString(key);

      const prompt = planPath
        ? `You are Team Lead ${nextIndex + 1}. Your plan file is at: ${planPath}. Read it and begin.`
        : `You are Team Lead ${nextIndex + 1} for this project. Await a plan file or instructions.`;

      const session: WorkspaceSession = {
        key,
        agentSessionId: '',
        projectPath,
        model: TEAM_LEAD_MODEL,
        status: 'starting',
        startedAt: Date.now(),
        crashCount: 0,
      };
      sessions.set(keyStr, session);

      const result = await agentManager.spawnTeamLead({
        projectPath,
        teamName: `workspace-tl-${projectId}-${nextIndex}`,
        prompt,
        model: TEAM_LEAD_MODEL,
        name: `workspace-tl-${projectId}-${nextIndex}`,
      });

      const ready: WorkspaceSession = { ...session, agentSessionId: result.sessionId, status: 'live' };
      sessions.set(keyStr, ready);
      sendEvent('event:workspace.sessionReady', { projectId, sessionKey: key, sessionId: result.sessionId });
      return ready;
    },

    async stopTeamLead(projectId, index) {
      if (index < 1) return { success: false }; // Cannot stop immortal
      const key: SessionKey = { projectId, type: 'team-lead', index };
      const keyStr = keyToString(key);
      const session = sessions.get(keyStr);
      if (!session) return { success: false };

      await agentManager.stopSession(session.agentSessionId);
      sessions.delete(keyStr);
      return { success: true };
    },

    async sendMessage(sessionId, message) {
      return agentManager.sendMessage(sessionId, message);
    },

    dispose() {
      sessions.clear();
    },
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If `agentManager.onEvent` callback shape mismatches, inspect `src/main/services/agent-manager/agent-manager-service.ts` and adjust the event guard (`event.type !== 'session-ended'` and `event.sessionId`) to match the actual event shape.

- [ ] **Step 3: Commit**

```bash
git add src/main/services/workspace/
git commit -m "feat(workspace): add WorkspaceSessionManager service with immortal session lifecycle"
```

---

## Task 3: Workspace IPC Handlers + Bootstrap Wiring

**Files:**
- Create: `src/main/ipc/handlers/workspace-handlers.ts`
- Modify: `src/main/bootstrap/service-registry.ts`

- [ ] **Step 1: Create `src/main/ipc/handlers/workspace-handlers.ts`**

```typescript
/**
 * Workspace IPC Handlers
 *
 * Thin handlers — one service call per handler, no business logic.
 */

import type { IpcRouter } from '../../ipc/router';
import type { WorkspaceSessionManager } from '../../services/workspace/workspace-session-manager';

export function registerWorkspaceHandlers(
  router: IpcRouter,
  workspace: WorkspaceSessionManager,
): void {
  router.handle('workspace.initProject', async ({ projectId, projectPath }) => {
    return workspace.initProject(projectId, projectPath);
  });

  router.handle('workspace.getSessions', ({ projectId }) => {
    return Promise.resolve(workspace.getSessions(projectId));
  });

  router.handle('workspace.spawnTeamLead', async ({ projectId, planPath }) => {
    return workspace.spawnTeamLead(projectId, planPath);
  });

  router.handle('workspace.stopTeamLead', async ({ projectId, index }) => {
    return workspace.stopTeamLead(projectId, index);
  });

  router.handle('workspace.sendMessage', async ({ sessionId, message }) => {
    return workspace.sendMessage(sessionId, message);
  });
}
```

- [ ] **Step 2: Add to `src/main/bootstrap/service-registry.ts`**

Find the import block and add after the agent-manager import:

```typescript
import { createWorkspaceSessionManager } from '../services/workspace/workspace-session-manager';
import type { WorkspaceSessionManager } from '../services/workspace/workspace-session-manager';
```

Find the `ServiceRegistryResult` interface and add after `agentManagerService`:

```typescript
  workspaceSessionManager: WorkspaceSessionManager;
```

Find where `agentManagerService` is instantiated in the function body and add immediately after it:

```typescript
  const workspaceSessionManager = createWorkspaceSessionManager(agentManagerService, getMainWindow);
```

Find where handlers are registered (look for `registerAgentDashboardHandlers`) and add:

```typescript
  registerWorkspaceHandlers(router, workspaceSessionManager);
```

Add the import for `registerWorkspaceHandlers` near the other handler imports:

```typescript
import { registerWorkspaceHandlers } from '../ipc/handlers/workspace-handlers';
```

Include `workspaceSessionManager` in the returned object at the end of the function.

- [ ] **Step 3: Typecheck + build**

```bash
npm run typecheck && npm run build
```

Expected: clean. If the `IpcRouter.handle` signature differs from what's shown (e.g., requires schema passing), inspect an existing handler file and match the exact call pattern.

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc/handlers/workspace-handlers.ts src/main/bootstrap/service-registry.ts
git commit -m "feat(workspace): register workspace IPC handlers and wire service in bootstrap"
```

---

## Task 4: Chrome Cleanup — Remove ContentHeader, Add Sidebar Toggle to TopBar

**Files:**
- Modify: `src/renderer/app/layouts/LayoutWrapper.tsx`
- Modify: `src/renderer/app/layouts/TopBar.tsx`

- [ ] **Step 1: Remove ContentHeader from `src/renderer/app/layouts/LayoutWrapper.tsx`**

Current file (lines 17–97). Remove the `ContentHeader` import and usage:

```typescript
// BEFORE LayoutWrapper.tsx
import { ContentHeader } from './ContentHeader';
// ...
export function LayoutWrapper({ children, layoutId }: LayoutWrapperProps) {
  const Layout = LAYOUT_MAP[layoutId];
  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <Layout />
      </Suspense>
      <SidebarInset>
        <ContentHeader />   {/* ← REMOVE this line */}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

Delete line `import { ContentHeader } from './ContentHeader';` and the `<ContentHeader />` JSX node. File becomes:

```typescript
/**
 * LayoutWrapper — Switches between 16 sidebar layout variants
 *
 * Reads the selected sidebarLayout from the layout store and
 * lazy-loads the corresponding SidebarLayoutXX component.
 * Wraps children in SidebarProvider + SidebarInset.
 */

import { Suspense, lazy } from 'react';

import { Loader2 } from 'lucide-react';

import type { SidebarLayoutId } from '@shared/types/layout';

import { SidebarInset, SidebarProvider } from '@ui/sidebar';

const LAYOUT_MAP: Record<SidebarLayoutId, React.LazyExoticComponent<React.ComponentType>> = {
  'sidebar-01': lazy(() =>
    import('./sidebar-layouts/SidebarLayout01').then((m) => ({ default: m.SidebarLayout01 })),
  ),
  'sidebar-02': lazy(() =>
    import('./sidebar-layouts/SidebarLayout02').then((m) => ({ default: m.SidebarLayout02 })),
  ),
  'sidebar-03': lazy(() =>
    import('./sidebar-layouts/SidebarLayout03').then((m) => ({ default: m.SidebarLayout03 })),
  ),
  'sidebar-04': lazy(() =>
    import('./sidebar-layouts/SidebarLayout04').then((m) => ({ default: m.SidebarLayout04 })),
  ),
  'sidebar-05': lazy(() =>
    import('./sidebar-layouts/SidebarLayout05').then((m) => ({ default: m.SidebarLayout05 })),
  ),
  'sidebar-06': lazy(() =>
    import('./sidebar-layouts/SidebarLayout06').then((m) => ({ default: m.SidebarLayout06 })),
  ),
  'sidebar-07': lazy(() =>
    import('./sidebar-layouts/SidebarLayout07').then((m) => ({ default: m.SidebarLayout07 })),
  ),
  'sidebar-08': lazy(() =>
    import('./sidebar-layouts/SidebarLayout08').then((m) => ({ default: m.SidebarLayout08 })),
  ),
  'sidebar-09': lazy(() =>
    import('./sidebar-layouts/SidebarLayout09').then((m) => ({ default: m.SidebarLayout09 })),
  ),
  'sidebar-10': lazy(() =>
    import('./sidebar-layouts/SidebarLayout10').then((m) => ({ default: m.SidebarLayout10 })),
  ),
  'sidebar-11': lazy(() =>
    import('./sidebar-layouts/SidebarLayout11').then((m) => ({ default: m.SidebarLayout11 })),
  ),
  'sidebar-12': lazy(() =>
    import('./sidebar-layouts/SidebarLayout12').then((m) => ({ default: m.SidebarLayout12 })),
  ),
  'sidebar-13': lazy(() =>
    import('./sidebar-layouts/SidebarLayout13').then((m) => ({ default: m.SidebarLayout13 })),
  ),
  'sidebar-14': lazy(() =>
    import('./sidebar-layouts/SidebarLayout14').then((m) => ({ default: m.SidebarLayout14 })),
  ),
  'sidebar-15': lazy(() =>
    import('./sidebar-layouts/SidebarLayout15').then((m) => ({ default: m.SidebarLayout15 })),
  ),
  'sidebar-16': lazy(() =>
    import('./sidebar-layouts/SidebarLayout16').then((m) => ({ default: m.SidebarLayout16 })),
  ),
};

function SidebarSkeleton() {
  return (
    <div className="bg-sidebar flex h-full w-[16rem] items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  );
}

interface LayoutWrapperProps {
  children: React.ReactNode;
  layoutId: SidebarLayoutId;
}

export function LayoutWrapper({ children, layoutId }: LayoutWrapperProps) {
  const Layout = LAYOUT_MAP[layoutId];

  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <Layout />
      </Suspense>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Add SidebarTrigger to `src/renderer/app/layouts/TopBar.tsx`**

Current TopBar renders project tabs inside a flex container. Add the `SidebarTrigger` as the leftmost slot:

```typescript
/**
 * TopBar — Project tabs bar with sidebar toggle
 *
 * Leftmost slot: SidebarTrigger (collapsed sidebar toggle).
 * Remaining: project tabs + open project button.
 * Consolidates two chrome bars into one 40px strip.
 */

import { useNavigate } from '@tanstack/react-router';
import { FolderOpen, Plus, X } from 'lucide-react';

import { ROUTES, PROJECT_VIEWS, projectViewPath } from '@shared/constants';

import { cn } from '@renderer/shared/lib/utils';
import { useLayoutStore } from '@renderer/shared/stores';
import { SidebarTrigger } from '@ui/sidebar';

import { useProjects } from '@features/projects';

export function TopBar() {
  // 1. Hooks
  const navigate = useNavigate();
  const { activeProjectId, projectTabOrder, setActiveProject, removeProjectTab } = useLayoutStore();
  const { data: projects } = useProjects();

  // 2. Derived state
  const openProjects = projectTabOrder
    .map((id) => projects?.find((p) => p.id === id))
    .filter(Boolean);

  // 3. Handlers
  function handleSelectProject(projectId: string) {
    setActiveProject(projectId);
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
  }

  function handleCloseTab(e: React.MouseEvent | React.KeyboardEvent, projectId: string) {
    e.stopPropagation();
    removeProjectTab(projectId);
  }

  function handleAddProject() {
    void navigate({ to: ROUTES.PROJECTS });
  }

  // 4. Render
  return (
    <div className="border-border bg-card flex h-10 items-center gap-px border-b px-1">
      {/* Sidebar toggle — replaces ContentHeader bar */}
      <SidebarTrigger className="-ml-1 mr-1 shrink-0" />
      <div className="bg-border mr-1 h-4 w-px shrink-0" />

      {/* Project tabs */}
      <div className="flex min-w-0 flex-1 items-center gap-px overflow-hidden">
        {openProjects.map((project) => {
          if (!project) return null;
          const isActive = project.id === activeProjectId;
          return (
            <button
              key={project.id}
              className={cn(
                'group flex items-center gap-2 rounded-t-md px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-background text-foreground border-primary border-b-2'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              onClick={() => handleSelectProject(project.id)}
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-32 truncate">{project.name}</span>
              <span
                aria-label={`Close ${project.name} tab`}
                className="hover:bg-muted ml-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                role="button"
                tabIndex={0}
                onClick={(e) => handleCloseTab(e, project.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleCloseTab(e, project.id);
                }}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}

        <button
          className="text-muted-foreground hover:bg-accent hover:text-foreground ml-1 rounded-md p-1.5"
          title="Open project"
          onClick={handleAddProject}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint + typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: clean. If `SidebarTrigger` import path differs, check existing `ContentHeader.tsx` for the correct import.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/app/layouts/LayoutWrapper.tsx src/renderer/app/layouts/TopBar.tsx
git commit -m "feat(chrome): remove ContentHeader bar, move SidebarTrigger into TopBar (save 40px)"
```

---

## Task 5: Workspace Zustand Store

**Files:**
- Create: `src/renderer/features/workspace/store.ts`

- [ ] **Step 1: Create `src/renderer/features/workspace/store.ts`**

```typescript
/**
 * Workspace View Store
 *
 * View-only state — no session lifecycle. Session data lives in React Query.
 * Persists panel collapse state + input drafts per session.
 */

import { create } from 'zustand';

interface WorkspaceStore {
  /** Which project's sessions are currently displayed */
  viewingProjectId: string | null;
  /** Collapse state per team lead (keyed by sessionId) */
  teamLeadCollapsed: Record<string, boolean>;
  /** Input draft text per session (keyed by sessionId) */
  inputDrafts: Record<string, string>;

  setViewingProject(projectId: string | null): void;
  toggleTeamLeadCollapsed(sessionId: string): void;
  setInputDraft(sessionId: string, draft: string): void;
  clearInputDraft(sessionId: string): void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  viewingProjectId: null,
  teamLeadCollapsed: {},
  inputDrafts: {},

  setViewingProject(projectId) {
    set({ viewingProjectId: projectId });
  },

  toggleTeamLeadCollapsed(sessionId) {
    set((state) => ({
      teamLeadCollapsed: {
        ...state.teamLeadCollapsed,
        [sessionId]: !state.teamLeadCollapsed[sessionId],
      },
    }));
  },

  setInputDraft(sessionId, draft) {
    set((state) => ({
      inputDrafts: { ...state.inputDrafts, [sessionId]: draft },
    }));
  },

  clearInputDraft(sessionId) {
    set((state) => {
      const { [sessionId]: _, ...rest } = state.inputDrafts;
      return { inputDrafts: rest };
    });
  },
}));
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/features/workspace/store.ts
git commit -m "feat(workspace): add workspace Zustand view store"
```

---

## Task 6: React Query Hooks

**Files:**
- Create: `src/renderer/features/workspace/api/useWorkspace.ts`

- [ ] **Step 1: Create `src/renderer/features/workspace/api/useWorkspace.ts`**

```typescript
/**
 * Workspace React Query Hooks
 *
 * useWorkspaceSessions — polls workspace.getSessions, invalidates on IPC events.
 * useWorkspaceInit    — calls workspace.initProject when a project tab opens.
 * useWorkspaceSend    — mutation to send a message to a session.
 * useWorkspaceSpawn   — mutation to spawn an additional Team Lead.
 * useWorkspaceStop    — mutation to stop a mortal Team Lead.
 *
 * Message streaming for each session reuses useAgentStream from agent-dashboard.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { window as ipcWindow } from '@renderer/shared/lib/ipc';
import { useIpcEvent } from '@renderer/shared/hooks';

export const workspaceKeys = {
  all: ['workspace'] as const,
  sessions: (projectId: string) => ['workspace', 'sessions', projectId] as const,
};

/** Poll active sessions for a project. Invalidates on session lifecycle events. */
export function useWorkspaceSessions(projectId: string | null) {
  const queryClient = useQueryClient();

  // Invalidate on session lifecycle events
  useIpcEvent('event:workspace.sessionReady', () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });
  useIpcEvent('event:workspace.sessionCrashed', () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });
  useIpcEvent('event:workspace.sessionRestarted', () => {
    if (!projectId) return;
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
  });

  return useQuery({
    queryKey: workspaceKeys.sessions(projectId ?? ''),
    queryFn: () => ipcWindow.invoke('workspace.getSessions', { projectId: projectId ?? '' }),
    enabled: projectId !== null,
    refetchInterval: 5000,
  });
}

/** Call initProject when a project tab first opens. Idempotent on the backend. */
export function useWorkspaceInit(projectId: string | null, projectPath: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || !projectPath) return;

    void ipcWindow
      .invoke('workspace.initProject', { projectId, projectPath })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
      });
  }, [projectId, projectPath, queryClient]);
}

/** Send a message to a workspace session. */
export function useWorkspaceSend() {
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      ipcWindow.invoke('workspace.sendMessage', { sessionId, message }),
  });
}

/** Spawn an additional mortal Team Lead. */
export function useSpawnTeamLead(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planPath }: { planPath?: string }) =>
      ipcWindow.invoke('workspace.spawnTeamLead', { projectId, planPath }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
    },
  });
}

/** Stop a mortal Team Lead by index. */
export function useStopTeamLead(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ index }: { index: number }) =>
      ipcWindow.invoke('workspace.stopTeamLead', { projectId, index }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.sessions(projectId) });
    },
  });
}
```

**Note:** Check the actual IPC invoke pattern used in this codebase. If the import is `import { ipc } from '@renderer/shared/lib/ipc'` and calls are `ipc.invoke(...)`, adjust accordingly. Look at any existing `api/use*.ts` file (e.g., `src/renderer/features/agent-dashboard/api/`) to find the exact import and call pattern.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: clean. Fix any import path issues by checking an existing feature's `api/` folder.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/features/workspace/api/
git commit -m "feat(workspace): add React Query hooks for workspace sessions"
```

---

## Task 7: Workspace UI Components

**Files:**
- Create: `src/renderer/features/workspace/components/WorkspacePage.tsx`
- Create: `src/renderer/features/workspace/components/PrimarySessionPanel.tsx`
- Create: `src/renderer/features/workspace/components/TeamLeadPanel.tsx`
- Create: `src/renderer/features/workspace/components/TeamLeadPanelList.tsx`
- Create: `src/renderer/features/workspace/index.ts`

**Important:** Before writing these, look at `src/renderer/features/agent-dashboard/hooks/useAgentStream.ts` (or equivalent) to confirm the exact hook name and import path for message streaming. The plan uses `useAgentStream` from `@features/agent-dashboard` — verify this is the correct export name.

- [ ] **Step 1: Create `PrimarySessionPanel.tsx`**

```typescript
/**
 * PrimarySessionPanel — Left panel showing the always-on Primary Claude session.
 *
 * Takes 55-60% of the workspace width.
 * Renders streamed messages and a text input to send commands.
 */

import { useRef, useState } from 'react';

import { Send } from 'lucide-react';

import { Button } from '@ui/button';
import { Input } from '@ui/input';

import { useAgentStream } from '@features/agent-dashboard';

import { useWorkspaceSend } from '../api/useWorkspace';
import { useWorkspaceStore } from '../store';

interface PrimarySessionPanelProps {
  sessionId: string;
  projectId: string;
  projectName: string;
  status: string;
}

export function PrimarySessionPanel({
  sessionId,
  projectId,
  projectName,
  status,
}: PrimarySessionPanelProps) {
  const { events } = useAgentStream(sessionId);
  const send = useWorkspaceSend();
  const draft = useWorkspaceStore((s) => s.inputDrafts[sessionId] ?? '');
  const setDraft = useWorkspaceStore((s) => s.setInputDraft);
  const clearDraft = useWorkspaceStore((s) => s.clearInputDraft);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleSend() {
    const message = draft.trim();
    if (!message || status !== 'live') return;
    send.mutate({ sessionId, message });
    clearDraft(sessionId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const statusColor =
    status === 'live'
      ? 'bg-green-500'
      : status === 'restarting' || status === 'starting'
        ? 'bg-yellow-500 animate-pulse'
        : 'bg-red-500';

  return (
    <div className="border-border flex h-full flex-col border-r">
      {/* Header */}
      <div className="border-border flex items-center gap-2 border-b px-4 py-2">
        <span className={`h-2 w-2 rounded-full ${statusColor}`} />
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Primary · {projectName}
        </span>
        <span className="text-muted-foreground ml-auto text-xs opacity-60">claude-sonnet-4-6</span>
      </div>

      {/* Message stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {status === 'starting' ? 'Starting session…' : 'Session ready. Send a message.'}
          </p>
        )}
        {events.map((event, i) => (
          <div key={i} className="text-sm whitespace-pre-wrap">
            {typeof event.content === 'string' ? event.content : null}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-border flex gap-2 border-t p-3">
        <Input
          className="flex-1"
          placeholder={status === 'live' ? 'Ask Claude or give a command…' : `Session ${status}…`}
          value={draft}
          disabled={status !== 'live'}
          onChange={(e) => setDraft(sessionId, e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          size="icon"
          disabled={!draft.trim() || status !== 'live' || send.isPending}
          onClick={handleSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `TeamLeadPanel.tsx`**

```typescript
/**
 * TeamLeadPanel — A single Team Lead session card in the right column.
 *
 * Collapsible. Shows session status, message stream, and input.
 * Mortal Team Leads (index ≥ 1) show a stop button.
 */

import { ChevronDown, ChevronUp, Send, X } from 'lucide-react';

import { Button } from '@ui/button';
import { Input } from '@ui/input';

import { useAgentStream } from '@features/agent-dashboard';

import type { WorkspaceSession } from '@shared/ipc/workspace';

import { useWorkspaceSend, useStopTeamLead } from '../api/useWorkspace';
import { useWorkspaceStore } from '../store';

interface TeamLeadPanelProps {
  session: WorkspaceSession;
}

export function TeamLeadPanel({ session }: TeamLeadPanelProps) {
  const { key, agentSessionId, status } = session;
  const { projectId, index } = key;
  const isImmortal = index === 0;
  const label = index === 0 ? 'Team Lead 1' : `Team Lead ${index + 1}`;

  const { events } = useAgentStream(agentSessionId);
  const send = useWorkspaceSend();
  const stop = useStopTeamLead(projectId);
  const isCollapsed = useWorkspaceStore((s) => s.teamLeadCollapsed[agentSessionId] ?? false);
  const toggle = useWorkspaceStore((s) => s.toggleTeamLeadCollapsed);
  const draft = useWorkspaceStore((s) => s.inputDrafts[agentSessionId] ?? '');
  const setDraft = useWorkspaceStore((s) => s.setInputDraft);
  const clearDraft = useWorkspaceStore((s) => s.clearInputDraft);

  function handleSend() {
    const message = draft.trim();
    if (!message || status !== 'live') return;
    send.mutate({ sessionId: agentSessionId, message });
    clearDraft(agentSessionId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleStop() {
    stop.mutate({ index });
  }

  const statusColor =
    status === 'live'
      ? 'bg-green-500'
      : status === 'restarting' || status === 'starting'
        ? 'bg-yellow-500 animate-pulse'
        : 'bg-red-500';

  return (
    <div className="border-border rounded-lg border">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`h-2 w-2 rounded-full ${statusColor}`} />
        <span className="text-xs font-medium">{label}</span>
        {status === 'restarting' && (
          <span className="text-muted-foreground text-xs">restarting…</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!isImmortal && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Stop team lead"
              onClick={handleStop}
              disabled={stop.isPending}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => toggle(agentSessionId)}
          >
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Collapsible body */}
      {!isCollapsed && (
        <>
          <div className="border-border max-h-48 overflow-y-auto border-t p-3 space-y-2">
            {events.length === 0 && (
              <p className="text-muted-foreground text-xs">
                {status === 'starting' ? 'Starting…' : 'Ready for a plan or instructions.'}
              </p>
            )}
            {events.map((event, i) => (
              <p key={i} className="text-xs whitespace-pre-wrap">
                {typeof event.content === 'string' ? event.content : null}
              </p>
            ))}
          </div>

          {/* Input */}
          <div className="border-border flex gap-2 border-t p-2">
            <Input
              className="h-7 flex-1 text-xs"
              placeholder={status === 'live' ? 'Send to team lead…' : `${status}…`}
              value={draft}
              disabled={status !== 'live'}
              onChange={(e) => setDraft(agentSessionId, e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              size="icon"
              className="h-7 w-7"
              disabled={!draft.trim() || status !== 'live' || send.isPending}
              onClick={handleSend}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `TeamLeadPanelList.tsx`**

```typescript
/**
 * TeamLeadPanelList — Right column: list of team lead cards + spawn button.
 */

import { Plus } from 'lucide-react';

import { Button } from '@ui/button';

import type { WorkspaceSession } from '@shared/ipc/workspace';

import { useSpawnTeamLead } from '../api/useWorkspace';

import { TeamLeadPanel } from './TeamLeadPanel';

interface TeamLeadPanelListProps {
  sessions: WorkspaceSession[];
  projectId: string;
}

export function TeamLeadPanelList({ sessions, projectId }: TeamLeadPanelListProps) {
  const spawn = useSpawnTeamLead(projectId);

  const teamLeadSessions = sessions
    .filter((s) => s.key.type === 'team-lead')
    .sort((a, b) => a.key.index - b.key.index);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {teamLeadSessions.map((session) => (
        <TeamLeadPanel key={`${session.key.type}-${session.key.index}`} session={session} />
      ))}

      <Button
        variant="outline"
        className="mt-auto w-full text-xs"
        disabled={spawn.isPending}
        onClick={() => spawn.mutate({})}
      >
        <Plus className="mr-2 h-3 w-3" />
        Spawn Team Lead
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Create `WorkspacePage.tsx`**

```typescript
/**
 * WorkspacePage — Primary work area for each project.
 *
 * Left panel (55%): Primary Claude session.
 * Right column (45%): Team Lead sessions + spawn button.
 *
 * Calls initProject on mount. View is purely state-based — sessions
 * persist in WorkspaceSessionManager regardless of which project is displayed.
 */

import { useParams } from '@tanstack/react-router';

import { useProjects } from '@features/projects';

import { useWorkspaceInit, useWorkspaceSessions } from '../api/useWorkspace';
import { useWorkspaceStore } from '../store';

import { PrimarySessionPanel } from './PrimarySessionPanel';
import { TeamLeadPanelList } from './TeamLeadPanelList';

export function WorkspacePage() {
  const { projectId } = useParams({ strict: false });
  const { data: projects } = useProjects();
  const setViewing = useWorkspaceStore((s) => s.setViewingProject);

  const project = projects?.find((p) => p.id === projectId);
  const projectPath = project?.path ?? null;
  const projectName = project?.name ?? 'Project';

  // Trigger session init for this project (idempotent)
  useWorkspaceInit(projectId ?? null, projectPath);

  // Set which project we're viewing (no session teardown — purely view state)
  if (projectId) setViewing(projectId);

  const { data: sessions = [] } = useWorkspaceSessions(projectId ?? null);

  const primarySession = sessions.find((s) => s.key.type === 'primary');

  if (!projectId) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Open a project to start a workspace session.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Primary Claude — left 55% */}
      <div className="min-w-0 flex-[55]">
        {primarySession ? (
          <PrimarySessionPanel
            sessionId={primarySession.agentSessionId}
            projectId={projectId}
            projectName={projectName}
            status={primarySession.status}
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Starting primary session…
          </div>
        )}
      </div>

      {/* Team Leads — right 45% */}
      <div className="border-border min-w-0 flex-[45] border-l">
        <TeamLeadPanelList sessions={sessions} projectId={projectId} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/renderer/features/workspace/index.ts`**

```typescript
/** Workspace feature — public API */
export { WorkspacePage } from './components/WorkspacePage';
```

- [ ] **Step 6: Lint + typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: clean. If `useAgentStream` doesn't exist or has a different name, check `src/renderer/features/agent-dashboard/hooks/` and `src/renderer/features/agent-dashboard/index.ts` for the correct export name. Adjust the import accordingly.

If `events` from `useAgentStream` has a different shape (not `{ content: string }`), adjust the event rendering in `PrimarySessionPanel` and `TeamLeadPanel` to match the actual event type (check `StreamJsonEventSchema` in `src/shared/ipc/agent-dashboard/schemas.ts`).

- [ ] **Step 7: Commit**

```bash
git add src/renderer/features/workspace/
git commit -m "feat(workspace): add WorkspacePage, PrimarySessionPanel, TeamLeadPanel components"
```

---

## Task 8: Route Update + Sidebar Label

**Files:**
- Modify: `src/renderer/app/routes/project.routes.ts`
- Modify: `src/renderer/app/layouts/Sidebar.tsx`
- Modify: `src/renderer/app/layouts/sidebar-layouts/shared-nav.ts`

- [ ] **Step 1: Swap `AgentDashboardPage` → `WorkspacePage` in `project.routes.ts`**

In `src/renderer/app/routes/project.routes.ts`, find the `agentsRoute` definition (lines 60–69) and replace it:

```typescript
  const agentsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: ROUTE_PATTERNS.PROJECT_AGENTS,
    staticData: { breadcrumbLabel: 'Workspace' },
    pendingComponent: ProjectSkeleton,
    component: lazyRouteComponent(
      () => import('@features/workspace'),
      'WorkspacePage',
    ),
  });
```

- [ ] **Step 2: Update sidebar label in `src/renderer/app/layouts/Sidebar.tsx`**

Find line 67:
```typescript
  { label: 'Agents', icon: Bot, path: PROJECT_VIEWS.AGENTS },
```
Change to:
```typescript
  { label: 'Workspace', icon: Bot, path: PROJECT_VIEWS.AGENTS },
```

- [ ] **Step 3: Update shared nav in `src/renderer/app/layouts/sidebar-layouts/shared-nav.ts`**

Find line 55:
```typescript
  { label: 'Agents', icon: Bot, path: PROJECT_VIEWS.AGENTS },
```
Change to:
```typescript
  { label: 'Workspace', icon: Bot, path: PROJECT_VIEWS.AGENTS },
```

- [ ] **Step 4: Lint + typecheck + build**

```bash
npm run lint && npm run typecheck && npm run build
```

Expected: clean. The lazy import `() => import('@features/workspace')` needs the `@features` alias to resolve. Verify `@features` points to `src/renderer/features` in `electron.vite.config.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/app/routes/project.routes.ts src/renderer/app/layouts/Sidebar.tsx src/renderer/app/layouts/sidebar-layouts/shared-nav.ts
git commit -m "feat(workspace): wire WorkspacePage to agents route, rename sidebar label to Workspace"
```

---

## Task 9: Assistant Service Simplification

**Files:**
- Modify: `src/main/services/assistant/assistant-service.ts`
- Delete: `src/main/services/assistant/intent-classifier/` (entire directory)
- Delete: `src/main/services/assistant/executors/` (entire directory — keep if you want reference, but don't import from it)

**Before writing:** Read `src/main/services/assistant/assistant-service.ts` in full to understand which executors and deps are currently wired. The plan below replaces the entire service body.

- [ ] **Step 1: Read the current assistant service**

```bash
cat src/main/services/assistant/assistant-service.ts
```

Note: which deps are passed in (so you know what to remove from service-registry), and where `sendCommand` currently calls the classifier.

- [ ] **Step 2: Replace `assistant-service.ts` with simplified version**

```typescript
/**
 * AssistantService — simplified direct Claude CLI subprocess.
 *
 * Fire-and-forget: sends input to `claude --print` and streams the response
 * back to the renderer via event:assistant.response chunks.
 *
 * No intent classification. No executors. No routing.
 */

import { spawn } from 'node:child_process';

import type { BrowserWindow } from 'electron';

export interface AssistantService {
  sendCommand(input: string, projectPath: string): void;
  getHistory(): CommandHistoryEntry[];
  clearHistory(): void;
}

interface CommandHistoryEntry {
  id: string;
  input: string;
  responseSummary: string;
  timestamp: string;
}

export function createAssistantService(getWindow: () => BrowserWindow | null): AssistantService {
  const history: CommandHistoryEntry[] = [];

  function sendEvent(channel: string, payload: unknown): void {
    getWindow()?.webContents.send(channel, payload);
  }

  return {
    sendCommand(input, projectPath) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sendEvent('event:assistant.thinking', { isThinking: true });

      const child = spawn('claude', ['--print', '-p', input], {
        cwd: projectPath,
        shell: true,
      });

      let responseBuffer = '';

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        responseBuffer += text;
        sendEvent('event:assistant.response', { content: text, type: 'text' });
      });

      child.stderr.on('data', (chunk: Buffer) => {
        sendEvent('event:assistant.response', { content: chunk.toString(), type: 'error' });
      });

      child.on('close', () => {
        sendEvent('event:assistant.thinking', { isThinking: false });
        history.push({
          id,
          input,
          responseSummary: responseBuffer.slice(0, 200),
          timestamp: new Date().toISOString(),
        });
      });
    },

    getHistory() {
      return [...history];
    },

    clearHistory() {
      history.length = 0;
    },
  };
}
```

- [ ] **Step 3: Update assistant handler to match new signature**

Find `src/main/ipc/handlers/assistant-handlers.ts`. Update the `sendCommand` handler to pass `projectPath` instead of the full context object. The handler should read `input` and `projectPath` from the IPC input (after contract is updated in Task 11):

```typescript
router.handle('assistant.sendCommand', ({ input, projectPath }) => {
  assistantService.sendCommand(input, projectPath ?? '');
  return Promise.resolve({ success: true });
});
```

- [ ] **Step 4: Update service-registry.ts — remove assistant deps**

In `src/main/bootstrap/service-registry.ts`, find where `createAssistantService` is called. It currently takes many deps (mcpManager, notesService, etc.). Replace the call with just:

```typescript
const assistantService = createAssistantService(getMainWindow);
```

Remove any imports that were only used by the old assistant service constructor (watch-store, watch-evaluator, cross-device-query, etc.) IF they are not used by any other service in the registry. Check each before deleting.

- [ ] **Step 5: Delete old assistant sub-directories**

```bash
rm -rf src/main/services/assistant/intent-classifier
rm -rf src/main/services/assistant/executors
```

If you want to keep them for reference, leave them but remove all imports from `assistant-service.ts`.

- [ ] **Step 6: Typecheck + build**

```bash
npm run typecheck && npm run build
```

Expected: clean. If there are references to removed deps elsewhere, trace the import chain and clean up. The most likely issue is service-registry importing a helper that was only used by the old assistant service — just remove those imports.

- [ ] **Step 7: Commit**

```bash
git add src/main/services/assistant/ src/main/ipc/handlers/assistant-handlers.ts src/main/bootstrap/service-registry.ts
git commit -m "feat(assistant): strip assistant service to direct Claude CLI subprocess, remove intent classifier and executors"
```

---

## Task 10: WidgetPanel Cleanup — Remove Quick Actions

**Files:**
- Modify: `src/renderer/features/assistant/components/WidgetPanel.tsx`

**Before writing:** Read `src/renderer/features/assistant/components/WidgetPanel.tsx` in full. Note: all the quick action chips, confirmation cards, and context enrichment logic need to be removed.

- [ ] **Step 1: Read WidgetPanel.tsx**

```bash
cat src/renderer/features/assistant/components/WidgetPanel.tsx
```

- [ ] **Step 2: Remove quick actions from WidgetPanel**

Locate and delete:
1. The `QUICK_ACTIONS` constant (array of `{ label, icon, command }` objects)
2. The `AssistantContext` enrichment code (reading `activeProjectId`, `currentPage` to build context)
3. The quick action chip JSX block (renders buttons from `QUICK_ACTIONS`)
4. Any confirmation/preview card JSX
5. The `context` parameter passed to `useSendCommand` (or equivalent mutation call)

What remains:
- The floating FAB button + panel open/close toggle
- The text input
- The response area with markdown rendering (keep this)
- The clear history button
- `useSendCommand` mutation but simplified: passes `input` + `projectPath` (read from active project store)

The `useSendCommand` call changes from:
```typescript
// OLD
sendCommand({ input, context: { activeProjectId, currentPage, ... } })
// NEW
sendCommand({ input, projectPath: activeProject?.path ?? '' })
```

After editing, the JSX should be: FAB → panel → [response area] + [clear button] + [input + send button].

- [ ] **Step 3: Lint + typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: clean. If `useSendCommand` type signature doesn't match the new IPC schema yet (that comes in Task 11), you may need to do Tasks 10 and 11 together or use a temporary `as unknown` cast.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/features/assistant/components/WidgetPanel.tsx
git commit -m "feat(assistant): remove quick action chips and intent context from widget panel"
```

---

## Task 11: IPC Schema Cleanup — Remove Intent and Action Types

**Files:**
- Modify: `src/shared/ipc/assistant/schemas.ts`
- Modify: `src/shared/ipc/assistant/contract.ts`
- Modify: `src/shared/ipc/index.ts`

- [ ] **Step 1: Simplify schemas in `src/shared/ipc/assistant/schemas.ts`**

**Delete** the following exports entirely from the file:
- `IntentTypeSchema` (lines 12–29)
- `AssistantActionSchema` (lines 31–64)

**Replace** `AssistantContextSchema`:
```typescript
// OLD
export const AssistantContextSchema = z.object({
  activeProjectId: z.string().nullable(),
  activeProjectName: z.string().nullable(),
  currentPage: z.string(),
  todayDate: z.string(),
});

// NEW
export const AssistantContextSchema = z.object({
  projectPath: z.string(),
});
```

**Replace** `AssistantResponseSchema`:
```typescript
export const AssistantResponseSchema = z.object({
  type: z.enum(['text', 'error']),
  content: z.string(),
});
```

**Replace** `CommandHistoryEntrySchema` (remove `intent` and `action` fields):
```typescript
export const CommandHistoryEntrySchema = z.object({
  id: z.string(),
  input: z.string(),
  responseSummary: z.string(),
  timestamp: z.string(),
});
```

- [ ] **Step 2: Simplify `src/shared/ipc/assistant/contract.ts`**

Replace the `assistant.sendCommand` channel:
```typescript
export const assistantInvoke = {
  'assistant.sendCommand': {
    input: z.object({
      input: z.string(),
      projectPath: z.string(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'assistant.getHistory': {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(CommandHistoryEntrySchema),
  },
  'assistant.clearHistory': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
} as const;
```

Remove `'event:assistant.commandCompleted'` and `'event:assistant.proactive'` from `assistantEvents` if the assistant service no longer emits them. Keep `'event:assistant.response'` and `'event:assistant.thinking'`.

- [ ] **Step 3: Remove schema re-exports from `src/shared/ipc/index.ts`**

Find the assistant re-export block (around lines 159–167):
```typescript
export {
  AssistantActionSchema,       // ← DELETE
  AssistantContextSchema,
  AssistantResponseSchema,
  CommandHistoryEntrySchema,
  IntentTypeSchema,            // ← DELETE
  WebhookCommandSchema,
  WebhookCommandSourceContextSchema,
} from './assistant';
```

Remove `AssistantActionSchema` and `IntentTypeSchema` from that block.

- [ ] **Step 4: Fix any remaining usages**

```bash
npm run typecheck 2>&1 | grep -i "intent\|action\|AssistantAction\|IntentType"
```

Fix any remaining references. These will typically be in:
- `src/renderer/features/assistant/hooks/useSendCommand.ts` (if it passes the old context shape)
- Any component that reads `intent` or `action` from responses

- [ ] **Step 5: Lint + typecheck + build**

```bash
npm run lint && npm run typecheck && npm run build
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/shared/ipc/assistant/ src/shared/ipc/index.ts
git commit -m "chore(assistant): remove IntentTypeSchema, AssistantActionSchema, simplify IPC contract to direct CLI shape"
```

---

## Task 12: Final Verification Pass

**No new files. Runs all checks across the full diff.**

- [ ] **Step 1: Full lint pass**

```bash
npm run lint
```

Expected: 0 errors. Fix any remaining issues before continuing.

- [ ] **Step 2: Full typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: successful compilation with no errors.

- [ ] **Step 4: Smoke-check ContentHeader is gone**

```bash
grep -r "ContentHeader" src/renderer/
```

Expected: only `ContentHeader.tsx` itself (it can remain as an unused file — it's just not imported anymore). If any layout still imports it, remove that import.

- [ ] **Step 5: Smoke-check intent classifier is gone**

```bash
grep -r "intent-classifier\|IntentType\|AssistantAction" src/ --include="*.ts" --include="*.tsx"
```

Expected: no hits (except the deleted directories if still present on disk).

- [ ] **Step 6: Smoke-check workspace barrel is wired**

```bash
grep -n "workspaceInvoke\|workspaceEvents" src/shared/ipc/index.ts
```

Expected: 2 hits (one in invoke spread, one in events spread).

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore(workspace): final verification — lint, typecheck, build all pass"
```

---

## Spec Coverage Checklist

| Spec Requirement | Task |
|---|---|
| Primary Claude session auto-spawns when project opens | Tasks 2, 3, 8 |
| Team Lead 1 auto-spawns when project opens | Tasks 2, 3, 8 |
| Switching project tabs doesn't terminate sessions | Task 2 (idempotent initProject, Map keyed by projectId) |
| Immortal sessions auto-restart on crash | Task 2 (onEvent → restart after delay) |
| Spawn additional Team Leads on demand | Tasks 2, 3, 6, 7 |
| Stop mortal Team Leads | Tasks 2, 3, 6, 7 |
| Primary panel takes 55-60% width | Task 7 (flex-[55] / flex-[45]) |
| Team Lead right column, scrollable | Task 7 (TeamLeadPanelList) |
| Sessions accept freeform input + stream responses | Tasks 6, 7 |
| Chrome cleanup: remove 40px title bar | Task 4 |
| Sidebar toggle moves to TopBar | Task 4 |
| Route label "Workspace" | Task 8 |
| Assistant widget: direct Claude CLI, no intent | Tasks 9, 10 |
| No quick action chips | Task 10 |
| No confirmation cards | Task 10 |
| IPC schemas cleaned up | Task 11 |
| npm run lint ∧ typecheck ∧ build pass | Task 12 |
