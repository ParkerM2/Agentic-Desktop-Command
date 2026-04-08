# Task Pipeline — Implementation Plan

> **NOTE:** This plan predates the caching layer consolidation. References to `useProgressContext`, `useAgentContext`, `ProgressContextHydrator`, `AgentContextHydrator`, `progress-context-store`, and `agent-context-store` are outdated -- these have been replaced by React Query hooks (`useProgress`, `useProgressMutations`, `useAgentMessages`) and `EventBridge`. See `docs/patterns/CACHING-LAYER-QUICKGUIDE.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Hub-based task management with a local `progress/` filesystem-backed pipeline. Tasks flow through Research → Plan → Team with per-agent session monitoring, disk-first persistence, and global stores.

**Architecture:** Data fetching uses the 3-layer caching architecture (EventBridge → React Query → Components). The task list grid reads from React Query hooks (`useProgress`), and IPC events drive cache invalidation via EventBridge. Agent session data is append-only JSONL on disk with rolling window in memory.

**Tech Stack:** TypeScript strict, Zod IPC contracts, Zustand 5, TanStack Table v8, React 19, Node.js FS watchers, JSONL append-only logs.

**Spec:** `docs/features/task-pipeline/plan.md`

---

## File Structure

### New Files (by layer)

**Shared Types:**
- `src/shared/types/progress.ts` — ProgressTask, ProgressStatus, ProgressPriority, SessionSummary
- `src/shared/types/agent-session-detail.ts` — AgentSessionDetail, ToolCallSummary, AgentError, FilteredLogEntry

**IPC Contract:**
- `src/shared/ipc/progress/schemas.ts` — Zod schemas for all progress types
- `src/shared/ipc/progress/contract.ts` — invoke + event channel definitions
- `src/shared/ipc/progress/index.ts` — barrel

**Main Process Service:**
- `src/main/services/progress/task-file-io.ts` — read/write frontmatter md files, scan directories
- `src/main/services/progress/session-writer.ts` — filtered JSONL append + summary file updates
- `src/main/services/progress/log-cleanup.ts` — weekly cleanup of old JSONL files
- `src/main/services/progress/progress-service.ts` — orchestrator: CRUD, FS watcher, action spawning, workflow state machine
- `src/main/services/progress/index.ts` — barrel

**IPC Handlers:**
- `src/main/ipc/handlers/progress-handlers.ts` — thin handlers delegating to ProgressService

**Renderer Stores:**
- `src/renderer/shared/stores/progress-context-store.ts` — global task pipeline store
- `src/renderer/shared/stores/ProgressContextHydrator.tsx` — sync from IPC + events

**Renderer UI:**
- `src/renderer/features/tasks/components/grid/ProgressTaskGrid.tsx` — TanStack Table grid
- `src/renderer/features/tasks/components/grid/columns.tsx` — column definitions (status, title, priority, stage, ticket, PR, updated)
- `src/renderer/features/tasks/components/grid/StageIndicator.tsx` — three-dot pipeline indicator
- `src/renderer/features/tasks/components/grid/TicketBadge.tsx` — Jira clickable badge
- `src/renderer/features/tasks/components/grid/PrBadge.tsx` — GitHub PR clickable badge
- `src/renderer/features/tasks/components/detail/ProgressTaskDetailRow.tsx` — expanded row container with pipeline sections
- `src/renderer/features/tasks/components/detail/ResearchSection.tsx` — research view + button
- `src/renderer/features/tasks/components/detail/PlanSection.tsx` — plan view + buttons
- `src/renderer/features/tasks/components/detail/TeamActivityPanel.tsx` — agent list table
- `src/renderer/features/tasks/components/detail/AgentDetailExpander.tsx` — per-agent expandable (messages, tools, errors, diff)
- `src/renderer/features/tasks/components/detail/PipelineTopBar.tsx` — ticket/PR badges + Run Workflow + Archive
- `src/renderer/features/tasks/components/TaskToolbar.tsx` — search, filter, New Task, Run Workflow

### Modified Files
- `src/shared/ipc/index.ts` — spread progressInvoke + progressEvents
- `src/shared/ipc/agent-dashboard/contract.ts` — add session log/detail/diff channels
- `src/main/services/agent-manager/agent-manager-service.ts` — add getSessionDetail, getSessionLog, getGitDiff methods + session writer wiring
- `src/main/ipc/handlers/agent-dashboard-handlers.ts` — register new session data handlers
- `src/main/bootstrap/service-registry.ts` — create ProgressService, wire to agent manager + lifecycle
- `src/main/services/visualization/agent-teams.ts` — refactor to read from progress/ + AgentManagerService
- `src/renderer/shared/stores/agent-context-store.ts` — expand to full data layer
- `src/renderer/shared/stores/AgentContextHydrator.tsx` — hydrate expanded data
- `src/renderer/shared/stores/index.ts` — export new stores
- `src/renderer/app/layouts/RootLayout.tsx` — mount ProgressContextHydrator
- `src/renderer/features/tasks/components/TasksPage.tsx` — swap to ProgressTaskGrid
- `docs/routing/FEATURES-INDEX.md` — add progress service
- `CLAUDE.md` — document progress channels

---

## Wave 1: Shared Types + IPC Contract (no dependencies)

These tasks have zero dependencies and can all run in parallel.

### Task 1: Progress Types

**Files:**
- Create: `src/shared/types/progress.ts`

- [ ] **Step 1: Create ProgressStatus and ProgressPriority enums**

```typescript
// src/shared/types/progress.ts

export type ProgressStatus =
  | 'backlog'
  | 'researching'
  | 'research_done'
  | 'planning'
  | 'plan_ready'
  | 'executing'
  | 'review'
  | 'done'
  | 'error'
  | 'archived';

export type ProgressPriority = 'low' | 'normal' | 'high' | 'urgent';

export type PrStatus = 'draft' | 'open' | 'merged' | 'closed';
```

- [ ] **Step 2: Create ProgressTask interface**

```typescript
export interface ProgressTask {
  slug: string;
  rootFile: string;
  title: string;
  description: string;
  status: ProgressStatus;
  priority: ProgressPriority;
  jiraTicket?: string;
  jiraUrl?: string;
  prNumber?: number;
  prUrl?: string;
  prStatus?: PrStatus;
  createdAt: string;
  updatedAt: string;
  hasResearch: boolean;
  hasPlan: boolean;
  hasTeamTasks: boolean;
  teamTaskCount: number;
  researchContent?: string;
  planContent?: string;
}
```

- [ ] **Step 3: Create SessionSummary interface**

```typescript
export interface SessionSummary {
  sessionId: string;
  agentName: string;
  agentRole: string;
  taskSlug: string;
  model: string;
  provider: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  toolCallCount: number;
  toolCallsByName: Record<string, number>;
  errorCount: number;
  messageCount: number;
  filesChanged: number;
  status: 'completed' | 'failed' | 'killed';
  exitCode: number | null;
}
```

- [ ] **Step 4: Create FilteredLogEntry type**

```typescript
export type FilteredLogEntryType =
  | 'assistant_message'
  | 'user_message'
  | 'tool_use'
  | 'tool_result'
  | 'usage'
  | 'error'
  | 'system_init';

export interface FilteredLogEntry {
  type: FilteredLogEntryType;
  timestamp: string;
  sessionId: string;
  data: Record<string, unknown>;
}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no consumers yet, just type definitions)

- [ ] **Step 6: Commit**

```bash
git add src/shared/types/progress.ts
git commit -m "feat(types): add progress task pipeline types"
```

---

### Task 2: Agent Session Detail Types

**Files:**
- Create: `src/shared/types/agent-session-detail.ts`

- [ ] **Step 1: Create AgentSessionDetail interface**

```typescript
// src/shared/types/agent-session-detail.ts

import type { AgentStatus } from './agent-dashboard';

export interface AgentSessionDetail {
  sessionId: string;
  name: string;
  role: string;
  taskSlug: string;
  taskNumber: number | null;
  status: AgentStatus;
  branch: string | null;
  model: string;
  tokenUsage: { input: number; output: number };
  startedAt: string;
  lastActivityAt: string;
  exitCode: number | null;
  isTeamLead: boolean;
}
```

- [ ] **Step 2: Create ToolCallSummary and AgentError**

```typescript
export interface ToolCallSummary {
  id: string;
  toolName: string;
  inputSummary: string;
  success: boolean;
  timestamp: string;
}

export interface AgentError {
  message: string;
  stack?: string;
  timestamp: string;
  sessionId: string;
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/shared/types/agent-session-detail.ts
git commit -m "feat(types): add agent session detail types"
```

---

### Task 3: Progress IPC Contract

**Files:**
- Create: `src/shared/ipc/progress/schemas.ts`
- Create: `src/shared/ipc/progress/contract.ts`
- Create: `src/shared/ipc/progress/index.ts`
- Modify: `src/shared/ipc/index.ts`

- [ ] **Step 1: Create Zod schemas**

```typescript
// src/shared/ipc/progress/schemas.ts
import { z } from 'zod';

export const ProgressStatusSchema = z.enum([
  'backlog', 'researching', 'research_done', 'planning',
  'plan_ready', 'executing', 'review', 'done', 'error', 'archived',
]);

export const ProgressPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const PrStatusSchema = z.enum(['draft', 'open', 'merged', 'closed']);

export const ProgressTaskSchema = z.object({
  slug: z.string(),
  rootFile: z.string(),
  title: z.string(),
  description: z.string(),
  status: ProgressStatusSchema,
  priority: ProgressPrioritySchema,
  jiraTicket: z.string().optional(),
  jiraUrl: z.string().optional(),
  prNumber: z.number().optional(),
  prUrl: z.string().optional(),
  prStatus: PrStatusSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  hasResearch: z.boolean(),
  hasPlan: z.boolean(),
  hasTeamTasks: z.boolean(),
  teamTaskCount: z.number(),
  researchContent: z.string().optional(),
  planContent: z.string().optional(),
});

export const SessionSummarySchema = z.object({
  sessionId: z.string(),
  agentName: z.string(),
  agentRole: z.string(),
  taskSlug: z.string(),
  model: z.string(),
  provider: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationMs: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  costUsd: z.number(),
  toolCallCount: z.number(),
  toolCallsByName: z.record(z.string(), z.number()),
  errorCount: z.number(),
  messageCount: z.number(),
  filesChanged: z.number(),
  status: z.enum(['completed', 'failed', 'killed']),
  exitCode: z.number().nullable(),
});
```

- [ ] **Step 2: Create invoke + event contract**

```typescript
// src/shared/ipc/progress/contract.ts
import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { ProgressTaskSchema } from './schemas';

export const progressInvoke = {
  'progress.listTasks': {
    input: z.object({}),
    output: z.array(ProgressTaskSchema),
  },
  'progress.getTask': {
    input: z.object({ slug: z.string() }),
    output: ProgressTaskSchema.nullable(),
  },
  'progress.createTask': {
    input: z.object({
      slug: z.string(),
      title: z.string(),
      description: z.string(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    }),
    output: ProgressTaskSchema,
  },
  'progress.updateTask': {
    input: z.object({
      slug: z.string(),
      updates: z.record(z.string(), z.unknown()),
    }),
    output: ProgressTaskSchema,
  },
  'progress.archiveTask': {
    input: z.object({ slug: z.string() }),
    output: SuccessResponseSchema,
  },
  'progress.deleteTask': {
    input: z.object({ slug: z.string() }),
    output: SuccessResponseSchema,
  },
  'progress.listArchived': {
    input: z.object({}),
    output: z.array(ProgressTaskSchema),
  },
  'progress.startResearch': {
    input: z.object({ slug: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  'progress.createPlan': {
    input: z.object({ slug: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  'progress.spinUpTeam': {
    input: z.object({ slug: z.string() }),
    output: z.object({
      sessionId: z.string(),
      teamLeadIndex: z.number(),
      action: z.enum(['spawned', 'reused']),
    }),
  },
  'progress.runWorkflow': {
    input: z.object({ slug: z.string() }),
    output: z.object({ started: z.literal(true) }),
  },
  'progress.cancelAction': {
    input: z.object({ slug: z.string() }),
    output: SuccessResponseSchema,
  },
  'progress.runLogCleanup': {
    input: z.object({}),
    output: z.object({ deletedFiles: z.number() }),
  },
} as const;

export const progressEvents = {
  'event:progress.taskUpdated': {
    payload: z.object({ slug: z.string(), task: ProgressTaskSchema }),
  },
  'event:progress.taskCreated': {
    payload: z.object({ slug: z.string(), task: ProgressTaskSchema }),
  },
  'event:progress.taskArchived': {
    payload: z.object({ slug: z.string() }),
  },
  'event:progress.actionStarted': {
    payload: z.object({
      slug: z.string(),
      action: z.enum(['research', 'plan', 'team']),
      sessionId: z.string(),
    }),
  },
  'event:progress.actionCompleted': {
    payload: z.object({
      slug: z.string(),
      action: z.enum(['research', 'plan', 'team']),
    }),
  },
  'event:progress.actionFailed': {
    payload: z.object({
      slug: z.string(),
      action: z.enum(['research', 'plan', 'team']),
      error: z.string(),
    }),
  },
  'event:progress.workflowStep': {
    payload: z.object({
      slug: z.string(),
      step: z.enum(['research', 'plan', 'team']),
      status: z.enum(['started', 'completed', 'failed']),
    }),
  },
} as const;
```

- [ ] **Step 3: Create barrel**

```typescript
// src/shared/ipc/progress/index.ts
export { progressEvents, progressInvoke } from './contract';
export {
  ProgressPrioritySchema,
  ProgressStatusSchema,
  ProgressTaskSchema,
  PrStatusSchema,
  SessionSummarySchema,
} from './schemas';
```

- [ ] **Step 4: Add to root IPC barrel**

In `src/shared/ipc/index.ts`, add import and spread:

```typescript
import { progressEvents, progressInvoke } from './progress';

// In ipcInvokeContract:
  ...progressInvoke,

// In ipcEventContract:
  ...progressEvents,
```

- [ ] **Step 5: Run typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/ipc/progress/ src/shared/ipc/index.ts
git commit -m "feat(ipc): add progress task pipeline contract"
```

---

## Wave 2: Main Process Services (depends on Wave 1 types)

### Task 4: Task File I/O

**Files:**
- Create: `src/main/services/progress/task-file-io.ts`

Core utilities: read/write YAML frontmatter markdown files, scan `progress/` directory, detect root file name, check subdirectory presence.

- [ ] **Step 1: Write the test**

Create `tests/unit/services/progress/task-file-io.test.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  readTaskFile,
  writeTaskFile,
  scanProgressDir,
  detectRootFile,
  checkSubdirectories,
} from '@main/services/progress/task-file-io';

const TEST_DIR = join(tmpdir(), 'progress-test-' + Date.now());

beforeEach(() => {
  mkdirSync(join(TEST_DIR, 'progress', 'my-feature'), { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('detectRootFile', () => {
  it('finds task.md', () => {
    writeFileSync(join(TEST_DIR, 'progress', 'my-feature', 'task.md'), '---\ntitle: Test\n---');
    expect(detectRootFile(join(TEST_DIR, 'progress', 'my-feature'))).toBe('task.md');
  });

  it('finds description.md', () => {
    writeFileSync(join(TEST_DIR, 'progress', 'my-feature', 'description.md'), '---\ntitle: Test\n---');
    expect(detectRootFile(join(TEST_DIR, 'progress', 'my-feature'))).toBe('description.md');
  });

  it('finds ticket.md', () => {
    writeFileSync(join(TEST_DIR, 'progress', 'my-feature', 'ticket.md'), '---\ntitle: Test\n---');
    expect(detectRootFile(join(TEST_DIR, 'progress', 'my-feature'))).toBe('ticket.md');
  });

  it('returns null if no root file', () => {
    expect(detectRootFile(join(TEST_DIR, 'progress', 'my-feature'))).toBeNull();
  });
});

describe('readTaskFile', () => {
  it('parses frontmatter and body', () => {
    const content = '---\ntitle: My Feature\nstatus: backlog\npriority: normal\ncreatedAt: 2026-04-07T00:00:00Z\nupdatedAt: 2026-04-07T00:00:00Z\n---\nDescription body here.';
    writeFileSync(join(TEST_DIR, 'progress', 'my-feature', 'task.md'), content);
    const result = readTaskFile(join(TEST_DIR, 'progress', 'my-feature'), 'task.md');
    expect(result.title).toBe('My Feature');
    expect(result.status).toBe('backlog');
    expect(result.description).toContain('Description body here');
  });
});

describe('checkSubdirectories', () => {
  it('detects research, plans, tasks presence', () => {
    mkdirSync(join(TEST_DIR, 'progress', 'my-feature', 'research'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'progress', 'my-feature', 'research', 'research.md'), '# Research');
    const result = checkSubdirectories(join(TEST_DIR, 'progress', 'my-feature'));
    expect(result.hasResearch).toBe(true);
    expect(result.hasPlan).toBe(false);
    expect(result.hasTeamTasks).toBe(false);
  });
});

describe('scanProgressDir', () => {
  it('returns slugs excluding archived', () => {
    mkdirSync(join(TEST_DIR, 'progress', 'archived', 'old'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'progress', 'my-feature', 'task.md'), '---\ntitle: Active\nstatus: backlog\npriority: normal\ncreatedAt: 2026-04-07T00:00:00Z\nupdatedAt: 2026-04-07T00:00:00Z\n---');
    const slugs = scanProgressDir(join(TEST_DIR, 'progress'));
    expect(slugs).toContain('my-feature');
    expect(slugs).not.toContain('archived');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/services/progress/task-file-io.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement task-file-io.ts**

```typescript
// src/main/services/progress/task-file-io.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ProgressPriority, ProgressStatus } from '@shared/types/progress';

const ROOT_FILE_NAMES = ['task.md', 'description.md', 'ticket.md'] as const;

// ── Frontmatter Parsing ─────────────────────────────────

interface ParsedFrontmatter {
  title: string;
  description: string;
  status: ProgressStatus;
  priority: ProgressPriority;
  jiraTicket?: string;
  jiraUrl?: string;
  prNumber?: number;
  prUrl?: string;
  prStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export function parseFrontmatter(content: string): { frontmatter: ParsedFrontmatter; body: string } {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return {
      frontmatter: {
        title: '', description: '', status: 'backlog', priority: 'normal',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      body: content,
    };
  }
  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return {
      frontmatter: {
        title: '', description: '', status: 'backlog', priority: 'normal',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      body: content,
    };
  }

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 3).trim();
  const fields: Record<string, string> = {};

  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }

  return {
    frontmatter: {
      title: fields.title ?? '',
      description: fields.description ?? '',
      status: (fields.status as ProgressStatus) ?? 'backlog',
      priority: (fields.priority as ProgressPriority) ?? 'normal',
      jiraTicket: fields.jiraTicket,
      jiraUrl: fields.jiraUrl,
      prNumber: fields.prNumber ? Number(fields.prNumber) : undefined,
      prUrl: fields.prUrl,
      prStatus: fields.prStatus,
      createdAt: fields.createdAt ?? new Date().toISOString(),
      updatedAt: fields.updatedAt ?? new Date().toISOString(),
    },
    body,
  };
}

export function serializeFrontmatter(fields: Record<string, unknown>, body: string): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && (value.includes(':') || value.includes('#'))) {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }
  lines.push('---');
  if (body.length > 0) {
    lines.push('', body);
  }
  return lines.join('\n');
}

// ── Directory Operations ────────────────────────────────

export function detectRootFile(taskDir: string): string | null {
  for (const name of ROOT_FILE_NAMES) {
    if (existsSync(join(taskDir, name))) {
      return name;
    }
  }
  return null;
}

export interface SubdirectoryCheck {
  hasResearch: boolean;
  hasPlan: boolean;
  hasTeamTasks: boolean;
  teamTaskCount: number;
}

export function checkSubdirectories(taskDir: string): SubdirectoryCheck {
  const hasResearch = existsSync(join(taskDir, 'research', 'research.md'));
  const hasPlan = existsSync(join(taskDir, 'plans', 'plan.md'));

  const tasksDir = join(taskDir, 'tasks');
  let hasTeamTasks = false;
  let teamTaskCount = 0;
  if (existsSync(tasksDir)) {
    const files = readdirSync(tasksDir).filter((f) => /^task-\d+\.md$/.test(f));
    hasTeamTasks = files.length > 0;
    teamTaskCount = files.length;
  }

  return { hasResearch, hasPlan, hasTeamTasks, teamTaskCount };
}

export function readTaskFile(taskDir: string, rootFile: string): ParsedFrontmatter & { body: string } {
  const content = readFileSync(join(taskDir, rootFile), 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);
  return { ...frontmatter, body, description: body.length > 0 ? body : frontmatter.description };
}

export function scanProgressDir(progressDir: string): string[] {
  if (!existsSync(progressDir)) return [];
  return readdirSync(progressDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'archived')
    .map((d) => d.name);
}

export function createTaskOnDisk(
  progressDir: string,
  slug: string,
  title: string,
  description: string,
  priority: ProgressPriority = 'normal',
): void {
  const taskDir = join(progressDir, slug);
  mkdirSync(taskDir, { recursive: true });
  const now = new Date().toISOString();
  const content = serializeFrontmatter(
    { title, description: '', status: 'backlog', priority, createdAt: now, updatedAt: now },
    description,
  );
  writeFileSync(join(taskDir, 'task.md'), content, 'utf-8');
}

export function archiveTaskOnDisk(progressDir: string, slug: string): void {
  const source = join(progressDir, slug);
  const archiveDir = join(progressDir, 'archived');
  mkdirSync(archiveDir, { recursive: true });
  renameSync(source, join(archiveDir, slug));
}

export function deleteTaskOnDisk(progressDir: string, slug: string): void {
  rmSync(join(progressDir, slug), { recursive: true, force: true });
}

export function updateTaskFrontmatter(
  taskDir: string,
  rootFile: string,
  updates: Record<string, unknown>,
): void {
  const filePath = join(taskDir, rootFile);
  const content = readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);
  const merged = { ...frontmatter, ...updates, updatedAt: new Date().toISOString() };
  writeFileSync(filePath, serializeFrontmatter(merged, body), 'utf-8');
}

export function readFileContent(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8');
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run tests/unit/services/progress/task-file-io.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/services/progress/task-file-io.ts tests/unit/services/progress/
git commit -m "feat(progress): task file I/O with frontmatter parsing"
```

---

### Task 5: Session Writer (filtered JSONL + summary)

**Files:**
- Create: `src/main/services/progress/session-writer.ts`

- [ ] **Step 1: Write the test**

Create `tests/unit/services/progress/session-writer.test.ts` — tests that the writer filters stream events, appends JSONL, and updates summary files.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement session-writer.ts**

The session writer:
- `createSessionWriter(sessionDir, agentName)` — returns a writer object
- `writer.appendEvent(streamJsonEvent)` — filters and appends to `<agentName>.jsonl`
- `writer.updateSummary(partialSummary)` — merges into `<agentName>.summary.json`
- `writer.finalize(exitCode)` — writes final summary with duration, flushes

Filter rules: discard `stream_event` deltas, truncate tool_result to 200 chars, truncate tool_use input to 500 chars.

- [ ] **Step 4: Run test**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/services/progress/session-writer.ts tests/unit/services/progress/session-writer.test.ts
git commit -m "feat(progress): filtered JSONL session writer with summary"
```

---

### Task 6: Log Cleanup

**Files:**
- Create: `src/main/services/progress/log-cleanup.ts`

- [ ] **Step 1: Write the test**

Test that `runLogCleanup(progressDir, maxAgeDays)` deletes `.jsonl` files older than threshold but keeps `.summary.json` files.

- [ ] **Step 2: Implement log-cleanup.ts**

```typescript
// Scan progress/*/sessions/*.jsonl
// For each: check mtime, if older than maxAgeDays and corresponding summary exists → delete
// Return count of deleted files
```

- [ ] **Step 3: Run test, commit**

---

## Wave 3: Progress Service + IPC Handlers (depends on Wave 2)

### Task 7: Progress Service

**Files:**
- Create: `src/main/services/progress/progress-service.ts`
- Create: `src/main/services/progress/index.ts`

The orchestrator service that composes task-file-io, session-writer, and log-cleanup. Implements full CRUD, FS watching, action spawning (research/plan/team), and workflow state machine.

- [ ] **Step 1: Write integration test** — tests createTask, listTasks, getTask, archiveTask against a temp directory

- [ ] **Step 2: Implement createProgressService factory**

Interface:
```typescript
export interface ProgressService {
  listTasks(): ProgressTask[];
  getTask(slug: string): ProgressTask | null;
  createTask(slug: string, title: string, description: string, priority?: ProgressPriority): ProgressTask;
  updateTask(slug: string, updates: Record<string, unknown>): ProgressTask;
  archiveTask(slug: string): void;
  deleteTask(slug: string): void;
  listArchived(): ProgressTask[];
  startResearch(slug: string): { sessionId: string };
  createPlan(slug: string): { sessionId: string };
  spinUpTeam(slug: string): { sessionId: string; teamLeadIndex: number; action: 'spawned' | 'reused' };
  runWorkflow(slug: string): void;
  cancelAction(slug: string): void;
  runLogCleanup(): { deletedFiles: number };
  onTaskUpdated(listener: (slug: string, task: ProgressTask) => void): void;
  getSessionWriter(slug: string, agentName: string): SessionWriter;
  dispose(): void;
}
```

- [ ] **Step 3: Implement FS watcher** — watches `progress/` for new directories, file changes. Debounced 500ms. Emits `onTaskUpdated`.

- [ ] **Step 4: Implement action spawning** — `startResearch`, `createPlan` use `AgentManagerService.spawnProjectOwner()`. `spinUpTeam` calls `WorkspaceSessionManager.handOffPlan()`. Each updates frontmatter status before spawning, listens for session end to reconcile.

- [ ] **Step 5: Implement runWorkflow** — sequential state machine: research → plan → team. Listens for session end events to advance.

- [ ] **Step 6: Create barrel** `src/main/services/progress/index.ts`

- [ ] **Step 7: Run tests, commit**

---

### Task 8: Progress IPC Handlers

**Files:**
- Create: `src/main/ipc/handlers/progress-handlers.ts`
- Modify: `src/main/bootstrap/service-registry.ts`

- [ ] **Step 1: Create thin handlers** — one `router.handle` per IPC channel, delegating to ProgressService

- [ ] **Step 2: Wire into service registry** — create ProgressService in bootstrap, register handlers, wire session archiver to app `before-quit`

- [ ] **Step 3: Run typecheck + lint + build**

- [ ] **Step 4: Commit**

---

## Wave 4: Renderer Stores (depends on Wave 3 IPC)

Can run in parallel: Task 9 and Task 10.

### Task 9: Progress Context Store + Hydrator

**Files:**
- Create: `src/renderer/shared/stores/progress-context-store.ts`
- Create: `src/renderer/shared/stores/ProgressContextHydrator.tsx`
- Modify: `src/renderer/shared/stores/index.ts`
- Modify: `src/renderer/app/layouts/RootLayout.tsx`

- [ ] **Step 1: Create useProgressContext store** — Zustand store with task list, actions calling IPC, active sessions map

- [ ] **Step 2: Create ProgressContextHydrator** — React Query poll + IPC event invalidation, syncs into store

- [ ] **Step 3: Export from barrel, mount in RootLayout**

- [ ] **Step 4: Commit**

---

### Task 10: Expand Agent Context Store

**Files:**
- Modify: `src/renderer/shared/stores/agent-context-store.ts`
- Modify: `src/renderer/shared/stores/AgentContextHydrator.tsx`

- [ ] **Step 1: Add agentSessions, recentMessages, recentToolCalls, errors, taskAgentMap** to the store

- [ ] **Step 2: Add fetchGitDiff and fetchSessionLog actions**

- [ ] **Step 3: Update hydrator** to sync expanded data from new IPC channels

- [ ] **Step 4: Commit**

---

## Wave 5: Grid + Expanded Row UI (depends on Wave 4 stores)

These can run in parallel — each touches different files.

### Task 11: Grid Column Definitions + Helper Components

**Files:**
- Create: `src/renderer/features/tasks/components/grid/columns.tsx`
- Create: `src/renderer/features/tasks/components/grid/StageIndicator.tsx`
- Create: `src/renderer/features/tasks/components/grid/TicketBadge.tsx`
- Create: `src/renderer/features/tasks/components/grid/PrBadge.tsx`

- [ ] **Step 1: Create StageIndicator** — three circles (research, plan, team), filled/empty based on booleans

- [ ] **Step 2: Create TicketBadge** — clickable Jira key badge with external link

- [ ] **Step 3: Create PrBadge** — PR number + status badge with external link

- [ ] **Step 4: Create column definitions** — TanStack Table `ColumnDef<ProgressTask>[]` using the components above

- [ ] **Step 5: Commit**

---

### Task 12: Progress Task Grid

**Files:**
- Create: `src/renderer/features/tasks/components/grid/ProgressTaskGrid.tsx`
- Create: `src/renderer/features/tasks/components/TaskToolbar.tsx`
- Modify: `src/renderer/features/tasks/components/TasksPage.tsx`

- [ ] **Step 1: Create TaskToolbar** — status filter, search, New Task button, Run Workflow button

- [ ] **Step 2: Create ProgressTaskGrid** — TanStack Table reading from `useProgressContext`, column definitions from Task 11, expandable rows

- [ ] **Step 3: Swap TasksPage** to use ProgressTaskGrid

- [ ] **Step 4: Run typecheck + lint**

- [ ] **Step 5: Commit**

---

### Task 13: Expanded Row — Pipeline Sections

**Files:**
- Create: `src/renderer/features/tasks/components/detail/PipelineTopBar.tsx`
- Create: `src/renderer/features/tasks/components/detail/ResearchSection.tsx`
- Create: `src/renderer/features/tasks/components/detail/PlanSection.tsx`
- Create: `src/renderer/features/tasks/components/detail/ProgressTaskDetailRow.tsx`

- [ ] **Step 1: Create PipelineTopBar** — Jira badge, PR badge, Run Workflow button, Archive button

- [ ] **Step 2: Create ResearchSection** — conditional: button / spinner / rendered markdown

- [ ] **Step 3: Create PlanSection** — conditional: button / spinner / rendered markdown + Spin Up Team button

- [ ] **Step 4: Create ProgressTaskDetailRow** — composes TopBar + Research + Plan + Team sections

- [ ] **Step 5: Commit**

---

### Task 14: Team Activity Panel + Agent Detail

**Files:**
- Create: `src/renderer/features/tasks/components/detail/TeamActivityPanel.tsx`
- Create: `src/renderer/features/tasks/components/detail/AgentDetailExpander.tsx`

- [ ] **Step 1: Create TeamActivityPanel** — table of agents for this task from `useAgentContext.taskAgentMap`, columns: name, role, status, tokens, duration

- [ ] **Step 2: Create AgentDetailExpander** — expandable per-agent: message log (AgentChatPanel reuse), tool calls list, errors, git diff viewer, session info

- [ ] **Step 3: Wire into ProgressTaskDetailRow** — show TeamActivityPanel when status is `executing`

- [ ] **Step 4: Commit**

---

## Wave 6: Visualization Refactor + Agent Dashboard Extensions (depends on Wave 4)

### Task 15: Agent Dashboard IPC Extensions

**Files:**
- Modify: `src/shared/ipc/agent-dashboard/contract.ts`
- Modify: `src/main/services/agent-manager/agent-manager-service.ts`
- Modify: `src/main/ipc/handlers/agent-dashboard-handlers.ts`

- [ ] **Step 1: Add new channels** — `getSessionDetail`, `getSessionLog` (paginated), `getSessionsForTask`, `getGitDiff`

- [ ] **Step 2: Implement in AgentManagerService** — getSessionLog reads from JSONL on disk with offset/limit; getGitDiff runs `git diff` on the session's branch

- [ ] **Step 3: Register handlers**

- [ ] **Step 4: Commit**

---

### Task 16: Visualization Agent Teams Refactor

**Files:**
- Modify: `src/main/services/visualization/agent-teams.ts`

- [ ] **Step 1: Refactor buildAgentTeamsData** to read from `progress/` instead of `tracking/`

- [ ] **Step 2: Get live agent status** from AgentManagerService sessions instead of JSONL events

- [ ] **Step 3: Map single-agent sessions** (research, planning) to single nodes

- [ ] **Step 4: Commit**

---

## Wave 7: Integration + Documentation

### Task 17: Documentation + CLAUDE.md Updates

**Files:**
- Modify: `docs/routing/FEATURES-INDEX.md`
- Modify: `CLAUDE.md`
- Modify: `.claude/agents/team-leader.md`

- [ ] **Step 1: Add progress service** to FEATURES-INDEX

- [ ] **Step 2: Add progress IPC channels** and agent naming convention to CLAUDE.md

- [ ] **Step 3: Verify team-leader.md** has correct agent naming instructions

- [ ] **Step 4: Commit**

---

### Task 18: Final Verification

- [ ] **Step 1: Run full verification suite**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

- [ ] **Step 2: Manual smoke test** — start app, check task list loads from `progress/`, create a task, verify expanded row renders

- [ ] **Step 3: Commit any fixes**

---

## Parallelism Summary

```
Wave 1: Tasks 1, 2, 3  (types + IPC contract)  ── all parallel
Wave 2: Tasks 4, 5, 6  (file I/O, writer, cleanup)  ── all parallel
Wave 3: Tasks 7, 8     (service + handlers)  ── sequential (8 depends on 7)
Wave 4: Tasks 9, 10    (stores)  ── parallel
Wave 5: Tasks 11, 12, 13, 14  (UI components)  ── 11 parallel with 13,14; 12 depends on 11
Wave 6: Tasks 15, 16   (agent dashboard + viz)  ── parallel
Wave 7: Tasks 17, 18   (docs + verification)  ── sequential
```

**Maximum parallelism per wave:**
- Wave 1: 3 agents
- Wave 2: 3 agents
- Wave 3: 1-2 agents
- Wave 4: 2 agents
- Wave 5: 3-4 agents
- Wave 6: 2 agents
- Wave 7: 1 agent

**Total: 18 tasks across 7 waves.**
