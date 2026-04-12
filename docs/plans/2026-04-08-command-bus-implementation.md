# Command Bus Implementation Plan

> **Note (2026-04):** This plan is historical. References to `HUB_TASKS` channels, `TaskRepository`, `TaskService`, and `.adc/specs/` describe the old file-based task system. The task system has since been replaced by `ProgressService` backed by a SQLite `progress_tasks` table, with `PROGRESS` channel constants.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered JSON stores, in-memory session maps, and dual agent spawn paths with a unified command bus backed by SQLite.

**Architecture:** A command bus wraps the existing IPC router, adding tracking (SQLite), source attribution, and session lifecycle management. Channel constants eliminate all hardcoded strings. The bus delegates spawning to the surviving agent-manager service. Deprecated systems (agent-orchestrator, task-launcher, crash-recovery stub, progress-watcher-v2) are deleted.

**Tech Stack:** better-sqlite3 v12, drizzle-orm, ULID, TypeScript strict

**Spec:** `docs/specs/2026-04-08-command-bus-design.md`

---

## Task Grouping

| Group | Tasks | Description |
|-------|-------|-------------|
| A: Channel Constants | 1–4 | Builder utility, channel files, contract migration, barrel update |
| B: SQLite Infrastructure | 5–7 | Database setup, Drizzle schema, connection module |
| C: Command Bus Core | 8–10 | Bus service, IPC integration, session management |
| D: Deprecation & Rewiring | 11–13 | Rewire consumers, delete dead systems, bootstrap cleanup |
| E: Verification & Docs | 14–16 | Verify, update documentation, write Phase 2 task files |

---

### Task 1: Channel Builder Utility

**Files:**
- Create: `src/shared/ipc/channel-builder.ts`
- Test: `tests/unit/shared/channel-builder.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/shared/channel-builder.test.ts
import { describe, expect, it } from 'vitest';

import { domain, events } from '@shared/ipc/channel-builder';

describe('channel-builder', () => {
  describe('domain()', () => {
    it('builds nested channel constants from domain + verb/noun map', () => {
      const EXAMPLE = domain('example', {
        LIST: ['items', 'archived'],
        CREATE: ['item'],
        DELETE: ['item'],
      });

      expect(EXAMPLE.LIST.ITEMS).toBe('example.list.items');
      expect(EXAMPLE.LIST.ARCHIVED).toBe('example.list.archived');
      expect(EXAMPLE.CREATE.ITEM).toBe('example.create.item');
      expect(EXAMPLE.DELETE.ITEM).toBe('example.delete.item');
    });

    it('handles single-noun verbs', () => {
      const SIMPLE = domain('auth', {
        LOGIN: ['user'],
      });

      expect(SIMPLE.LOGIN.USER).toBe('auth.login.user');
    });

    it('handles hyphenated domain names', () => {
      const HYPHEN = domain('agent-dashboard', {
        SPAWN: ['owner'],
      });

      expect(HYPHEN.SPAWN.OWNER).toBe('agent-dashboard.spawn.owner');
    });

    it('handles hyphenated noun names', () => {
      const COMPOUND = domain('workflow', {
        LIST: ['agent-defs'],
      });

      expect(COMPOUND.LIST['AGENT-DEFS']).toBe('workflow.list.agent-defs');
    });
  });

  describe('events()', () => {
    it('builds event channel constants with event: prefix', () => {
      const EXAMPLE_EVENTS = events('example', {
        ITEM: ['created', 'updated', 'deleted'],
      });

      expect(EXAMPLE_EVENTS.ITEM.CREATED).toBe('event:example.item.created');
      expect(EXAMPLE_EVENTS.ITEM.UPDATED).toBe('event:example.item.updated');
      expect(EXAMPLE_EVENTS.ITEM.DELETED).toBe('event:example.item.deleted');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/shared/channel-builder.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement channel-builder.ts**

```typescript
// src/shared/ipc/channel-builder.ts

/**
 * Channel constant builder — eliminates all hardcoded IPC channel strings.
 *
 * Usage:
 *   const PROGRESS = domain('progress', {
 *     LIST: ['tasks', 'archived'],
 *     CREATE: ['task', 'plan'],
 *   });
 *   // PROGRESS.LIST.TASKS = "progress.list.tasks" (literal type preserved)
 */

type Uppercase<S extends string> = S extends `${infer F}${infer R}`
  ? `${F extends Lowercase<F> ? globalThis.Uppercase<F> : F}${R extends '' ? '' : Uppercase<R>}`
  : S;

type DomainChannels<D extends string, M extends Record<string, readonly string[]>> = {
  [V in keyof M & string]: {
    [N in M[V][number] & string as globalThis.Uppercase<N>]: `${D}.${Lowercase<V>}.${N}`
  }
};

type EventChannels<D extends string, M extends Record<string, readonly string[]>> = {
  [V in keyof M & string]: {
    [N in M[V][number] & string as globalThis.Uppercase<N>]: `event:${D}.${Lowercase<V>}.${N}`
  }
};

export function domain<D extends string, M extends Record<string, readonly string[]>>(
  d: D,
  map: M,
): DomainChannels<D, M> {
  const result: Record<string, Record<string, string>> = {};
  for (const [verb, nouns] of Object.entries(map)) {
    const group: Record<string, string> = {};
    for (const noun of nouns as readonly string[]) {
      group[noun.toUpperCase()] = `${d}.${verb.toLowerCase()}.${noun}`;
    }
    result[verb] = group;
  }
  return result as DomainChannels<D, M>;
}

export function events<D extends string, M extends Record<string, readonly string[]>>(
  d: D,
  map: M,
): EventChannels<D, M> {
  const result: Record<string, Record<string, string>> = {};
  for (const [verb, nouns] of Object.entries(map)) {
    const group: Record<string, string> = {};
    for (const noun of nouns as readonly string[]) {
      group[noun.toUpperCase()] = `event:${d}.${verb.toLowerCase()}.${noun}`;
    }
    result[verb] = group;
  }
  return result as EventChannels<D, M>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/shared/channel-builder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/ipc/channel-builder.ts tests/unit/shared/channel-builder.test.ts
git commit -m "feat(ipc): add channel constant builder utility"
```

---

### Task 2: Create All Channel Files

**Files:**
- Create: `src/shared/ipc/<domain>/channels.ts` for each of the ~29 domains
- Create: `src/shared/ipc/misc/<domain>.channels.ts` for each misc sub-domain

This is mechanical. Each domain gets a `channels.ts` file that uses the `domain()` and `events()` builders. The old channel string values change to the new `domain.verb.noun` format.

**Channel naming convention (new format):**
- Invoke: `domain.verb.noun` — all lowercase, dot-separated
- Events: `event:domain.subject.past-tense` — all lowercase, dot-separated
- Verbs should be action words: `list`, `get`, `create`, `update`, `delete`, `start`, `stop`, `send`, `spawn`, etc.
- Nouns should be the resource: `task`, `session`, `user`, `config`, etc.

**Naming decisions for anomalous channels:**

The old naming was inconsistent. The new format normalizes everything. Key renames:

| Old | New | Constant |
|-----|-----|----------|
| `auth.login` | `auth.login.user` | `AUTH.LOGIN.USER` |
| `auth.me` | `auth.get.user` | `AUTH.GET.USER` |
| `auth.restore` | `auth.restore.session` | `AUTH.RESTORE.SESSION` |
| `settings.get` | `settings.get.all` | `SETTINGS.GET.ALL` |
| `settings.update` | `settings.update.all` | `SETTINGS.UPDATE.ALL` |
| `app.getVersion` | `app.get.version` | `APP.GET.VERSION` |
| `app.checkClaudeAuth` | `app.check.claude-auth` | `APP.CHECK['CLAUDE-AUTH']` |
| `dashboard.captures.list` | `dashboard.list.captures` | `DASHBOARD.LIST.CAPTURES` |
| `hub.tasks.list` | `hub-tasks.list.all` | `HUB_TASKS.LIST.ALL` |
| `event:user.sessionChanged` | `event:auth.session.changed` | `AUTH_EVENTS.SESSION.CHANGED` |
| `event:project.updated` | `event:projects.project.updated` | `PROJECTS_EVENTS.PROJECT.UPDATED` |
| `event:terminal.output` | `event:terminals.terminal.output` | `TERMINALS_EVENTS.TERMINAL.OUTPUT` |
| `event:task.statusChanged` | `event:tasks.status.changed` | `TASKS_EVENTS.STATUS.CHANGED` |

**Orchestrator channels to DELETE entirely (not migrate):**

All `agent.*` orchestrator invoke channels and `event:agent.orchestrator.*` event channels are removed. They will not get channel constants. The handler file `agent-orchestrator-handlers.ts` is deleted in Task 12.

Channels deleted: `agent.startPlanning`, `agent.startExecution`, `agent.killSession`, `agent.replanWithFeedback`, `agent.restartFromCheckpoint`, `agent.getOrchestratorSession`, `agent.listOrchestratorSessions`, `event:agent.orchestrator.progress`, `event:agent.orchestrator.planReady`, `event:agent.orchestrator.stopped`, `event:agent.orchestrator.error`, `event:agent.orchestrator.heartbeat`, `event:agent.orchestrator.watchdogAlert`.

The `agents/` IPC domain folder (`src/shared/ipc/agents/`) is renamed to reflect that it no longer contains orchestrator channels. The remaining agent-dashboard channels live in their own domain folder.

**Health domain anomaly:** The health domain uses `app.*` channel prefixes. These move under the `APP` constant alongside the actual app channels (version, updates, etc.). The `health/` IPC folder is merged into `app/`.

- [ ] **Step 1: Create channel files for major domains**

Create one `channels.ts` per domain folder. Below are all files to create, each with the `domain()` and `events()` calls. Every channel file follows the same pattern — import the builders, export the constants.

File template:
```typescript
// src/shared/ipc/<domain>/channels.ts
import { domain, events } from '../channel-builder';

export const DOMAIN_NAME = domain('domain-name', {
  VERB: ['noun1', 'noun2'],
});

export const DOMAIN_NAME_EVENTS = events('domain-name', {
  SUBJECT: ['past-tense1', 'past-tense2'],
});
```

**Complete list of channel files and their contents:**

`src/shared/ipc/auth/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const AUTH = domain('auth', {
  LOGIN: ['user'],
  LOGOUT: ['user'],
  REGISTER: ['user'],
  REFRESH: ['token'],
  GET: ['user'],
  RESTORE: ['session'],
});

export const AUTH_EVENTS = events('auth', {
  SESSION: ['changed'],
});
```

`src/shared/ipc/app/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const APP = domain('app', {
  GET: ['version', 'login-setting', 'update-status', 'error-log', 'error-stats', 'health-status'],
  CHECK: ['claude-auth', 'github-auth', 'oauth-status', 'updates'],
  SET: ['login-setting'],
  LAUNCH: ['claude-auth', 'github-auth'],
  DOWNLOAD: ['update'],
  INSTALL: ['update'],
  CLEAR: ['error-log'],
  REPORT: ['renderer-error'],
});

export const APP_EVENTS = events('app', {
  UPDATE: ['available', 'downloaded'],
  ERROR: ['occurred'],
  CAPACITY: ['alert'],
  DATA: ['recovery'],
  SERVICE: ['unhealthy'],
});
```

`src/shared/ipc/assistant/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const ASSISTANT = domain('assistant', {
  START: ['session'],
  SEND: ['command'],
  GET: ['history'],
  CLEAR: ['history'],
});

export const ASSISTANT_EVENTS = events('assistant', {
  MESSAGE: ['response', 'thinking'],
  TOOL: ['executed'],
  SESSION: ['autostart'],
});
```

`src/shared/ipc/agent-dashboard/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const AGENT_DASHBOARD = domain('agent-dashboard', {
  SPAWN: ['project-owner', 'team-lead'],
  LIST: ['sessions', 'qa-sessions', 'sessions-for-task'],
  GET: ['session', 'files-changed', 'tasks-for-feature', 'task', 'qa-session', 'session-log', 'git-diff'],
  SEND: ['message'],
  STOP: ['session'],
});

export const AGENT_DASHBOARD_EVENTS = events('agent-dashboard', {
  SESSION: ['started', 'ended', 'status-changed'],
  MESSAGE: ['received'],
  TEAMMATE: ['joined', 'left'],
  STREAM: ['event'],
  TASK: ['updated'],
  QA: ['session-updated'],
});
```

`src/shared/ipc/briefing/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const BRIEFING = domain('briefing', {
  GET: ['daily', 'config', 'suggestions'],
  GENERATE: ['daily'],
  UPDATE: ['config'],
});

export const BRIEFING_EVENTS = events('briefing', {
  BRIEFING: ['ready'],
});
```

`src/shared/ipc/claude/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const CLAUDE = domain('claude', {
  SEND: ['message'],
  STREAM: ['message'],
  CREATE: ['conversation'],
  LIST: ['conversations'],
  GET: ['messages'],
  CLEAR: ['conversation'],
  CHECK: ['configured'],
});

export const CLAUDE_EVENTS = events('claude', {
  STREAM: ['chunk'],
});
```

`src/shared/ipc/dashboard/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const DASHBOARD = domain('dashboard', {
  LIST: ['captures'],
  CREATE: ['capture'],
  DELETE: ['capture'],
});

export const DASHBOARD_EVENTS = events('dashboard', {
  CAPTURE: ['changed'],
});
```

`src/shared/ipc/data-management/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const DATA_MANAGEMENT = domain('data-management', {
  GET: ['registry', 'usage', 'retention'],
  UPDATE: ['retention'],
  CLEAR: ['store'],
  RUN: ['cleanup'],
  EXPORT: ['data'],
  IMPORT: ['data'],
});

export const DATA_MANAGEMENT_EVENTS = events('data-management', {
  CLEANUP: ['complete'],
});
```

`src/shared/ipc/docker/channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const DOCKER = domain('docker', {
  GET: ['status'],
  SETUP: ['hub'],
});
```

`src/shared/ipc/email/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const EMAIL = domain('email', {
  SEND: ['message'],
  GET: ['config', 'queue'],
  UPDATE: ['config'],
  TEST: ['connection'],
  RETRY: ['queued'],
  REMOVE: ['queued'],
});

export const EMAIL_EVENTS = events('email', {
  MESSAGE: ['sent', 'failed'],
});
```

`src/shared/ipc/files/channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const FILES = domain('files', {
  LIST: ['tree'],
});
```

`src/shared/ipc/fitness/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const FITNESS = domain('fitness', {
  LOG: ['workout', 'measurement'],
  LIST: ['workouts', 'goals'],
  GET: ['measurements', 'stats'],
  SET: ['goal'],
  UPDATE: ['goal-progress'],
  DELETE: ['workout', 'goal'],
});

export const FITNESS_EVENTS = events('fitness', {
  WORKOUT: ['changed'],
  MEASUREMENT: ['changed'],
  GOAL: ['changed'],
});
```

`src/shared/ipc/git/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const GIT = domain('git', {
  GET: ['status', 'branches', 'remote-url'],
  CREATE: ['branch', 'pr', 'worktree'],
  REMOVE: ['worktree'],
  LIST: ['worktrees'],
  COMMIT: ['changes'],
  PUSH: ['changes'],
  RESOLVE: ['conflict'],
  DETECT: ['structure'],
});

export const GIT_EVENTS = events('git', {
  WORKTREE: ['changed'],
});
```

`src/shared/ipc/github/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const GITHUB = domain('github', {
  LIST: ['prs', 'issues', 'repos'],
  GET: ['pr', 'notifications', 'auth-status'],
  CREATE: ['issue'],
});

export const GITHUB_EVENTS = events('github', {
  DATA: ['updated'],
});
```

`src/shared/ipc/hub/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const HUB = domain('hub', {
  CONNECT: ['server'],
  DISCONNECT: ['server'],
  GET: ['status', 'config'],
  SYNC: ['data'],
  REMOVE: ['config'],
});

export const HUB_EVENTS = events('hub', {
  CONNECTION: ['changed'],
  SYNC: ['completed'],
  DEVICE: ['online', 'offline'],
  WORKSPACE: ['updated'],
  PROJECT: ['updated'],
});
```

`src/shared/ipc/notifications/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const NOTIFICATIONS = domain('notifications', {
  LIST: ['all'],
  MARK: ['read', 'all-read'],
  GET: ['config', 'watcher-status'],
  UPDATE: ['config'],
  START: ['watching'],
  STOP: ['watching'],
});

export const NOTIFICATIONS_EVENTS = events('notifications', {
  NOTIFICATION: ['new'],
  WATCHER: ['error', 'status-changed'],
});
```

`src/shared/ipc/oauth/channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const OAUTH = domain('oauth', {
  AUTHORIZE: ['provider'],
  CHECK: ['authenticated'],
  REVOKE: ['provider'],
});
```

`src/shared/ipc/planner/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const PLANNER = domain('planner', {
  GET: ['day', 'week'],
  UPDATE: ['day', 'weekly-reflection'],
  ADD: ['time-block'],
  MODIFY: ['time-block'],
  REMOVE: ['time-block'],
  GENERATE: ['weekly-review'],
});

export const PLANNER_EVENTS = events('planner', {
  DAY: ['changed'],
});
```

`src/shared/ipc/progress/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const PROGRESS = domain('progress', {
  LIST: ['tasks', 'archived'],
  GET: ['task'],
  CREATE: ['task', 'plan'],
  UPDATE: ['task'],
  DELETE: ['task'],
  ARCHIVE: ['task'],
  START: ['research', 'team', 'workflow'],
  CANCEL: ['action'],
  RUN: ['log-cleanup'],
});

export const PROGRESS_EVENTS = events('progress', {
  TASK: ['updated', 'created', 'archived'],
  ACTION: ['started', 'completed', 'failed'],
  WORKFLOW: ['step'],
});
```

`src/shared/ipc/projects/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const PROJECTS = domain('projects', {
  LIST: ['all'],
  ADD: ['project'],
  REMOVE: ['project'],
  INITIALIZE: ['project'],
  SELECT: ['directory'],
  DETECT: ['repo'],
  UPDATE: ['project'],
  GET: ['sub-projects'],
  CREATE: ['sub-project', 'new'],
  DELETE: ['sub-project'],
  SETUP: ['existing'],
  ANALYZE: ['codebase'],
});

export const PROJECTS_EVENTS = events('projects', {
  PROJECT: ['updated'],
  SETUP: ['progress'],
});
```

`src/shared/ipc/qa/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const QA = domain('qa', {
  START: ['quiet', 'full'],
  GET: ['report', 'session'],
  CANCEL: ['session'],
});

export const QA_EVENTS = events('qa', {
  SESSION: ['started', 'progress', 'completed'],
});
```

`src/shared/ipc/security/channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const SECURITY = domain('security', {
  GET: ['settings'],
  UPDATE: ['settings'],
  EXPORT: ['audit'],
});
```

`src/shared/ipc/settings/channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const SETTINGS = domain('settings', {
  GET: ['all', 'profiles', 'oauth-providers', 'webhook-config', 'agent-settings', 'layout'],
  UPDATE: ['all', 'profile', 'webhook-config'],
  CREATE: ['profile'],
  DELETE: ['profile'],
  SET: ['default-profile', 'oauth-provider', 'agent-settings'],
  SAVE: ['layout'],
});
```

`src/shared/ipc/spotify/channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const SPOTIFY = domain('spotify', {
  GET: ['playback'],
  PLAY: ['track'],
  PAUSE: ['track'],
  SKIP: ['next', 'previous'],
  SEARCH: ['tracks'],
  SET: ['volume'],
  ADD: ['to-queue'],
});
```

`src/shared/ipc/tasks/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const TASKS = domain('tasks', {
  LIST: ['all', 'every'],
  GET: ['task'],
  CREATE: ['task'],
  UPDATE: ['task', 'status'],
  DELETE: ['task'],
  EXECUTE: ['task'],
  DECOMPOSE: ['task'],
  IMPORT: ['github-issues'],
  LIST_GITHUB: ['issues'],
});

export const HUB_TASKS = domain('hub-tasks', {
  LIST: ['all'],
  GET: ['task'],
  CREATE: ['task'],
  UPDATE: ['task', 'status'],
  DELETE: ['task'],
  EXECUTE: ['task'],
  CANCEL: ['task'],
});

export const TASKS_EVENTS = events('tasks', {
  STATUS: ['changed'],
  PROGRESS: ['updated'],
  LOG: ['appended'],
  PLAN: ['updated'],
});

export const HUB_TASKS_EVENTS = events('hub-tasks', {
  TASK: ['created', 'updated', 'deleted'],
  PROGRESS: ['updated'],
  TASK_RUN: ['completed'],
});
```

`src/shared/ipc/terminals/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const TERMINALS = domain('terminals', {
  LIST: ['all'],
  CREATE: ['session'],
  CLOSE: ['session'],
  SEND: ['input'],
  RESIZE: ['session'],
  INVOKE: ['claude-cli'],
});

export const TERMINALS_EVENTS = events('terminals', {
  TERMINAL: ['output', 'closed', 'title-changed'],
});
```

`src/shared/ipc/tracker/channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const TRACKER = domain('tracker', {
  LIST: ['all'],
  GET: ['plan'],
  UPDATE: ['plan'],
});
```

`src/shared/ipc/visualization/channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const VISUALIZATION = domain('visualization', {
  GET: ['codebase-graph', 'agent-teams', 'session-log'],
});
```

`src/shared/ipc/window/channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const WINDOW = domain('window', {
  MINIMIZE: ['app'],
  MAXIMIZE: ['app'],
  CLOSE: ['app'],
  CHECK: ['maximized'],
});
```

`src/shared/ipc/workflow/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const WORKFLOW = domain('workflow', {
  WATCH: ['progress'],
  STOP: ['watching', 'running'],
  LAUNCH: ['workflow'],
  CHECK: ['running'],
});

export const WORKFLOW_EVENTS = events('workflow', {
  WORKFLOW: ['milestone', 'context', 'permission'],
});
```

`src/shared/ipc/workflow-engine/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const WORKFLOW_ENGINE = domain('workflow-engine', {
  APPLY: ['template'],
  START: ['run'],
  STOP: ['run'],
  GET: ['run'],
  LIST: ['runs', 'archived', 'agent-defs'],
});

export const WORKFLOW_ENGINE_EVENTS = events('workflow-engine', {
  STATE: ['changed'],
  RUN: ['completed', 'error'],
});
```

`src/shared/ipc/workflow-templates/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const WORKFLOW_TEMPLATES = domain('workflow-templates', {
  LIST: ['all'],
  GET: ['template'],
  CREATE: ['template'],
  UPDATE: ['template'],
  DELETE: ['template'],
  DUPLICATE: ['template'],
  SCAN: ['artifacts'],
  WRITE: ['artifact'],
});

export const WORKFLOW_TEMPLATES_EVENTS = events('workflow-templates', {
  TEMPLATE: ['created', 'updated', 'deleted'],
});
```

`src/shared/ipc/workspace/channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const WORKSPACE = domain('workspace', {
  INIT: ['project', 'all-projects'],
  GET: ['sessions'],
  SPAWN: ['team-lead'],
  STOP: ['team-lead'],
  SEND: ['message'],
  HANDOFF: ['plan'],
  EXECUTE: ['task'],
  PROVISION: ['teammate'],
  TEARDOWN: ['teammate'],
});

export const WORKSPACE_EVENTS = events('workspace', {
  SESSION: ['ready', 'crashed', 'restarted'],
  PLAN: ['handed-off'],
});
```

**Misc sub-domain channel files** — create `src/shared/ipc/misc/<name>.channels.ts` for each:

`src/shared/ipc/misc/alerts.channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const ALERTS = domain('alerts', {
  LIST: ['all'],
  CREATE: ['alert'],
  DISMISS: ['alert'],
  DELETE: ['alert'],
});

export const ALERTS_EVENTS = events('alerts', {
  ALERT: ['triggered', 'changed'],
});
```

`src/shared/ipc/misc/calendar.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const CALENDAR = domain('calendar', {
  LIST: ['events'],
  CREATE: ['event'],
  DELETE: ['event'],
});
```

`src/shared/ipc/misc/changelog.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const CHANGELOG = domain('changelog', {
  LIST: ['entries'],
  ADD: ['entry'],
  GENERATE: ['entry'],
});
```

`src/shared/ipc/misc/devices.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const DEVICES = domain('devices', {
  LIST: ['all'],
  REGISTER: ['device'],
  HEARTBEAT: ['device'],
  UPDATE: ['device'],
});
```

`src/shared/ipc/misc/hotkeys.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const HOTKEYS = domain('hotkeys', {
  GET: ['config'],
  UPDATE: ['config'],
  RESET: ['config'],
});
```

`src/shared/ipc/misc/ideas.channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const IDEAS = domain('ideas', {
  LIST: ['all'],
  CREATE: ['idea'],
  UPDATE: ['idea'],
  DELETE: ['idea'],
  VOTE: ['idea'],
});

export const IDEAS_EVENTS = events('ideas', {
  IDEA: ['changed'],
});
```

`src/shared/ipc/misc/insights.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const INSIGHTS = domain('insights', {
  GET: ['metrics', 'time-series', 'task-distribution', 'project-breakdown'],
});
```

`src/shared/ipc/misc/mcp.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const MCP = domain('mcp', {
  CALL: ['tool'],
  LIST: ['connected'],
  GET: ['connection-state'],
});
```

`src/shared/ipc/misc/merge.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const MERGE = domain('merge', {
  PREVIEW: ['diff'],
  GET: ['file-diff'],
  CHECK: ['conflicts'],
  EXECUTE: ['merge'],
  ABORT: ['merge'],
});
```

`src/shared/ipc/misc/milestones.channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const MILESTONES = domain('milestones', {
  LIST: ['all'],
  CREATE: ['milestone'],
  UPDATE: ['milestone'],
  DELETE: ['milestone'],
  ADD: ['task'],
  TOGGLE: ['task'],
});

export const MILESTONES_EVENTS = events('milestones', {
  MILESTONE: ['changed'],
});
```

`src/shared/ipc/misc/notes.channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const NOTES = domain('notes', {
  LIST: ['all'],
  CREATE: ['note'],
  UPDATE: ['note'],
  DELETE: ['note'],
  SEARCH: ['notes'],
});

export const NOTES_EVENTS = events('notes', {
  NOTE: ['changed'],
});
```

`src/shared/ipc/misc/screen.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const SCREEN = domain('screen', {
  LIST: ['sources'],
  CAPTURE: ['screen'],
  CHECK: ['permission'],
});
```

`src/shared/ipc/misc/time.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const TIME = domain('time', {
  PARSE: ['expression'],
});
```

`src/shared/ipc/misc/voice.channels.ts`:
```typescript
import { domain, events } from '../channel-builder';

export const VOICE = domain('voice', {
  GET: ['config'],
  UPDATE: ['config'],
  CHECK: ['permission'],
});

export const VOICE_EVENTS = events('voice', {
  SPEECH: ['transcript'],
});
```

`src/shared/ipc/misc/webhook.channels.ts`:
```typescript
import { events } from '../channel-builder';

export const WEBHOOK_EVENTS = events('webhook', {
  COMMAND: ['received'],
});
```

`src/shared/ipc/misc/workspaces.channels.ts`:
```typescript
import { domain } from '../channel-builder';

export const WORKSPACES = domain('workspaces', {
  LIST: ['all'],
  CREATE: ['workspace'],
  UPDATE: ['workspace'],
  DELETE: ['workspace'],
});
```

- [ ] **Step 2: Verify all channel files compile**

Run: `npx tsc --noEmit src/shared/ipc/*/channels.ts src/shared/ipc/misc/*.channels.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/ipc/
git commit -m "feat(ipc): add channel constant files for all 29+ domains"
```

---

### Task 3: Update All Contracts to Use Channel Constants

**Files:**
- Modify: Every `contract.ts` file under `src/shared/ipc/` and `src/shared/ipc/misc/`
- Delete: `src/shared/ipc/agents/contract.ts` (orchestrator channels) — replaced by agent-dashboard only

For each contract file:
1. Import the channel constants from the sibling `channels.ts`
2. Replace every hardcoded string key with the constant reference
3. The contract object keys become computed property names: `[PROGRESS.CREATE.TASK]: { ... }`

- [ ] **Step 1: Update each contract file**

Pattern — before:
```typescript
export const progressInvoke = {
  'progress.listTasks': { input: z.object({}), output: z.array(progressTaskSchema) },
  'progress.createTask': { input: createInput, output: progressTaskSchema },
};
```

After:
```typescript
import { PROGRESS } from './channels';

export const progressInvoke = {
  [PROGRESS.LIST.TASKS]: { input: z.object({}), output: z.array(progressTaskSchema) },
  [PROGRESS.CREATE.TASK]: { input: createInput, output: progressTaskSchema },
};
```

Apply this pattern to every contract file. The Zod schemas stay exactly the same — only the keys change.

For event contracts, same pattern:
```typescript
import { PROGRESS_EVENTS } from './channels';

export const progressEvents = {
  [PROGRESS_EVENTS.TASK.UPDATED]: { payload: taskUpdatedPayloadSchema },
  [PROGRESS_EVENTS.TASK.CREATED]: { payload: taskCreatedPayloadSchema },
};
```

**Special: Delete the agents/contract.ts orchestrator sections.** Remove all `agent.*` and `event:agent.orchestrator.*` entries. The `agents/` IPC folder can be deleted entirely — agent-dashboard has its own folder.

- [ ] **Step 2: Update all barrel index.ts files in each domain folder to re-export channels**

Each domain's `index.ts` barrel should also export the channel constants:
```typescript
export { PROGRESS, PROGRESS_EVENTS } from './channels';
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: Many errors — every handler and renderer file that used the old string keys will break. This is expected and desired. Collect the error list for Task 4.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ipc/
git commit -m "feat(ipc): migrate all contracts to channel constants"
```

---

### Task 4: Fix All Broken References (Handlers + Renderer)

**Files:**
- Modify: All ~43 handler files in `src/main/ipc/handlers/`
- Modify: All renderer `ipc()` calls across `src/renderer/features/`
- Modify: All `useIpcEvent()` hooks across `src/renderer/features/`
- Modify: All `router.emit()` calls in services and bootstrap
- Modify: `src/shared/ipc/index.ts` (root barrel)
- Modify: `src/shared/ipc/types.ts` (type utilities)

This is the largest mechanical task. The approach:
1. Run `npm run typecheck` — TypeScript will list every broken reference
2. For each error: import the channel constant, replace the string literal
3. Repeat until typecheck passes

- [ ] **Step 1: Update the root barrel `src/shared/ipc/index.ts`**

The root barrel spreads all domain contracts into unified objects. Update it to:
- Remove the agents/orchestrator imports
- Add channel constant re-exports from each domain
- Keep the existing structure but reference the new contract shapes

- [ ] **Step 2: Update all handler files**

Pattern — before:
```typescript
router.handle('progress.createTask', async (input) => { ... });
```

After:
```typescript
import { PROGRESS } from '@shared/ipc/progress/channels';

router.handle(PROGRESS.CREATE.TASK, async (input) => { ... });
```

Apply to all ~43 handler files. Delete `agent-orchestrator-handlers.ts` entirely.

- [ ] **Step 3: Update all renderer ipc() calls**

Pattern — before:
```typescript
const tasks = await ipc('progress.listTasks', {});
```

After:
```typescript
import { PROGRESS } from '@shared/ipc/progress/channels';

const tasks = await ipc(PROGRESS.LIST.TASKS, {});
```

Search all files in `src/renderer/` for `ipc(` calls and update each one.

- [ ] **Step 4: Update all useIpcEvent() hooks**

Pattern — before:
```typescript
useIpcEvent('event:progress.taskUpdated', (payload) => { ... });
```

After:
```typescript
import { PROGRESS_EVENTS } from '@shared/ipc/progress/channels';

useIpcEvent(PROGRESS_EVENTS.TASK.UPDATED, (payload) => { ... });
```

- [ ] **Step 5: Update all router.emit() calls in services**

Search `src/main/` for `router.emit(` and update each to use event constants.

- [ ] **Step 6: Update EventBridge mappings**

If EventBridge uses string-based event-to-query-key mappings, update those to use event constants.

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run lint`
Expected: Zero errors

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(ipc): replace all hardcoded channel strings with constants"
```

---

### Task 5: Install SQLite Dependencies

**Files:**
- Modify: `package.json`
- Create: `src/main/db/` directory

- [ ] **Step 1: Install packages**

```bash
npm install better-sqlite3 drizzle-orm ulid
npm install -D @types/better-sqlite3 drizzle-kit
```

- [ ] **Step 2: Verify electron-rebuild config**

Check that `@electron/rebuild` is already in devDependencies (confirmed: `^4.0.2`). Add a postinstall script if not present:

```json
"postinstall": "electron-rebuild -f -w better-sqlite3"
```

- [ ] **Step 3: Verify better-sqlite3 works with electron-vite**

The `externalizeDepsPlugin()` in `electron.vite.config.ts` should already handle native modules. Verify by running:

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add better-sqlite3, drizzle-orm, ulid for command bus SQLite backing"
```

---

### Task 6: SQLite Database Schema & Connection

**Files:**
- Create: `src/main/db/connection.ts`
- Create: `src/main/db/schema.ts`
- Create: `src/main/db/index.ts`
- Create: `drizzle.config.ts` (project root)
- Test: `tests/unit/services/db-connection.test.ts`

- [ ] **Step 1: Create the Drizzle schema**

```typescript
// src/main/db/schema.ts
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const commands = sqliteTable('commands', {
  id: text('id').primaryKey(),
  channel: text('channel').notNull(),
  domain: text('domain').notNull(),
  verb: text('verb').notNull(),
  noun: text('noun'),
  isMutation: integer('is_mutation', { mode: 'boolean' }).notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id'),
  sourceName: text('source_name'),
  input: text('input', { mode: 'json' }),
  output: text('output', { mode: 'json' }),
  status: text('status').notNull(),
  error: text('error'),
  durationMs: integer('duration_ms'),
  projectId: text('project_id'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_commands_domain').on(table.domain),
  index('idx_commands_verb').on(table.verb),
  index('idx_commands_source_type').on(table.sourceType),
  index('idx_commands_project_id').on(table.projectId),
  index('idx_commands_created_at').on(table.createdAt),
]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  phase: text('phase'),
  status: text('status').notNull(),
  projectId: text('project_id'),
  taskSlug: text('task_slug'),
  model: text('model'),
  pid: integer('pid'),
  worktreePath: text('worktree_path'),
  spawnConfig: text('spawn_config', { mode: 'json' }),
  tokenUsage: text('token_usage', { mode: 'json' }),
  toolUsage: text('tool_usage', { mode: 'json' }),
  parentId: text('parent_id'),
  teamName: text('team_name'),
  wave: integer('wave'),
  taskIndex: integer('task_index'),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  exitCode: integer('exit_code'),
  error: text('error'),
}, (table) => [
  index('idx_sessions_status').on(table.status),
  index('idx_sessions_type').on(table.type),
  index('idx_sessions_project_id').on(table.projectId),
  index('idx_sessions_task_slug').on(table.taskSlug),
  index('idx_sessions_parent_id').on(table.parentId),
]);

export const busEvents = sqliteTable('bus_events', {
  id: text('id').primaryKey(),
  channel: text('channel').notNull(),
  payload: text('payload', { mode: 'json' }),
  sourceCommandId: text('source_command_id'),
  sessionId: text('session_id'),
  projectId: text('project_id'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_events_channel').on(table.channel),
  index('idx_events_session_id').on(table.sessionId),
  index('idx_events_source_command_id').on(table.sourceCommandId),
  index('idx_events_created_at').on(table.createdAt),
]);
```

- [ ] **Step 2: Create the database connection module**

```typescript
// src/main/db/connection.ts
import { join } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;
let sqlite: Database.Database | null = null;

export function initDatabase(userDataPath: string): ReturnType<typeof drizzle> {
  const dbPath = join(userDataPath, 'adc.db');
  sqlite = new Database(dbPath);

  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = OFF');
  sqlite.pragma('busy_timeout = 5000');

  db = drizzle(sqlite, { schema });

  // Run migrations on startup
  const migrationsPath = join(__dirname, '../../drizzle');
  migrate(db, { migrationsFolder: migrationsPath });

  return db;
}

export function getDatabase(): ReturnType<typeof drizzle> {
  if (!db) {
    throw new Error('Database not initialized — call initDatabase() first');
  }
  return db;
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

export type AdcDatabase = ReturnType<typeof drizzle>;
```

- [ ] **Step 3: Create barrel**

```typescript
// src/main/db/index.ts
export { closeDatabase, getDatabase, initDatabase } from './connection';
export type { AdcDatabase } from './connection';
export * from './schema';
```

- [ ] **Step 4: Create drizzle.config.ts**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/db/schema.ts',
  out: './drizzle',
});
```

- [ ] **Step 5: Generate initial migration**

```bash
npx drizzle-kit generate
```

This creates SQL files in `./drizzle/` for the initial schema.

- [ ] **Step 6: Write test**

```typescript
// tests/unit/services/db-connection.test.ts
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeDatabase, initDatabase } from '@main/db';

describe('database connection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'adc-test-'));
  });

  afterEach(() => {
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates adc.db in the specified directory', () => {
    initDatabase(tempDir);
    expect(existsSync(join(tempDir, 'adc.db'))).toBe(true);
  });

  it('runs migrations without error', () => {
    const db = initDatabase(tempDir);
    // Verify tables exist by attempting a query
    const result = db.select().from(commands).all();
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 7: Run test**

Run: `npx vitest run tests/unit/services/db-connection.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/main/db/ drizzle.config.ts drizzle/ tests/unit/services/db-connection.test.ts
git commit -m "feat(db): add SQLite database with Drizzle ORM schema and migrations"
```

---

### Task 7: Add Database to electron-vite Config

**Files:**
- Modify: `electron.vite.config.ts` — ensure better-sqlite3 is externalized
- Modify: `electron-builder` config — ensure drizzle migrations are in extraResources

- [ ] **Step 1: Verify externalization**

Read `electron.vite.config.ts`. If `externalizeDepsPlugin()` is already used for the main process config, `better-sqlite3` is automatically externalized. No changes needed.

If not, add `better-sqlite3` to the external list.

- [ ] **Step 2: Add drizzle migrations to extraResources**

In the electron-builder configuration (either `electron-builder.yml` or `package.json` build section), add:

```json
"extraResources": ["drizzle/**"]
```

- [ ] **Step 3: Update connection.ts migrations path for production**

The migrations path needs to resolve correctly in both development and production:

```typescript
// In connection.ts, update migrationsPath:
const isDev = !app.isPackaged;
const migrationsPath = isDev
  ? join(__dirname, '../../drizzle')
  : join(process.resourcesPath, 'drizzle');
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Builds without error

- [ ] **Step 5: Commit**

```bash
git add electron.vite.config.ts package.json src/main/db/connection.ts
git commit -m "build: configure electron-vite and builder for SQLite native module"
```

---

### Task 8: Command Bus Core Service

**Files:**
- Create: `src/main/bus/command-bus.ts`
- Create: `src/main/bus/types.ts`
- Create: `src/main/bus/index.ts`
- Test: `tests/unit/services/command-bus.test.ts`

- [ ] **Step 1: Define bus types**

```typescript
// src/main/bus/types.ts
import type { AdcDatabase } from '../db';

export interface CommandSource {
  type: 'ui' | 'agent' | 'system';
  id?: string;
  name?: string;
}

export interface BusResult<T = unknown> {
  commandId: string;
  status: 'success' | 'error';
  output: T;
  durationMs: number;
  error?: string;
}

export interface CommandFilter {
  domain?: string;
  verb?: string;
  sourceType?: string;
  projectId?: string;
  since?: string;
  limit?: number;
}

export interface EventFilter {
  channel?: string;
  sessionId?: string;
  since?: string;
  limit?: number;
}

export interface CommandRecord {
  id: string;
  channel: string;
  domain: string;
  verb: string;
  noun: string | null;
  isMutation: boolean;
  sourceType: string;
  sourceId: string | null;
  sourceName: string | null;
  input: unknown;
  output: unknown;
  status: string;
  error: string | null;
  durationMs: number | null;
  projectId: string | null;
  createdAt: string;
}

export interface EventRecord {
  id: string;
  channel: string;
  payload: unknown;
  sourceCommandId: string | null;
  sessionId: string | null;
  projectId: string | null;
  createdAt: string;
}

export type CommandHandler = (input: unknown) => Promise<unknown>;

export interface RegisteredCommand {
  channel: string;
  domain: string;
  verb: string;
  noun: string | null;
  isMutation: boolean;
  handler: CommandHandler;
}

// Verbs that represent mutations (not reads)
const MUTATION_VERBS = new Set([
  'create', 'update', 'delete', 'archive', 'add', 'remove', 'set',
  'save', 'send', 'start', 'stop', 'cancel', 'spawn', 'kill',
  'login', 'logout', 'register', 'refresh', 'restore', 'clear',
  'execute', 'launch', 'connect', 'disconnect', 'sync', 'import',
  'export', 'install', 'download', 'resolve', 'commit', 'push',
  'invoke', 'generate', 'report', 'dismiss', 'vote', 'toggle',
  'duplicate', 'write', 'apply', 'provision', 'teardown', 'handoff',
  'mark', 'retry', 'abort', 'setup', 'initialize', 'modify',
  'watch', 'log', 'reset', 'revoke', 'authorize', 'play', 'pause',
  'skip', 'resize', 'capture',
]);

export function isMutationVerb(verb: string): boolean {
  return MUTATION_VERBS.has(verb);
}

export function parseChannel(channel: string): { domain: string; verb: string; noun: string | null } {
  const parts = channel.split('.');
  if (parts.length === 3) {
    return { domain: parts[0], verb: parts[1], noun: parts[2] };
  }
  if (parts.length === 2) {
    return { domain: parts[0], verb: parts[1], noun: null };
  }
  // Handle hyphenated domains like "agent-dashboard.spawn.owner"
  // or "workflow-engine.start.run"
  // Try splitting from the right
  const lastDot = channel.lastIndexOf('.');
  const secondLastDot = channel.lastIndexOf('.', lastDot - 1);
  if (secondLastDot > 0) {
    return {
      domain: channel.slice(0, secondLastDot),
      verb: channel.slice(secondLastDot + 1, lastDot),
      noun: channel.slice(lastDot + 1),
    };
  }
  return { domain: channel.slice(0, lastDot), verb: channel.slice(lastDot + 1), noun: null };
}
```

- [ ] **Step 2: Implement command bus**

```typescript
// src/main/bus/command-bus.ts
import { eq, and, gte, desc } from 'drizzle-orm';
import { ulid } from 'ulid';

import type { AdcDatabase } from '../db';
import { commands, busEvents } from '../db/schema';
import { createScopedLogger } from '../lib/logger';

import type {
  BusResult,
  CommandFilter,
  CommandHandler,
  CommandRecord,
  CommandSource,
  EventFilter,
  EventRecord,
  RegisteredCommand,
} from './types';
import { isMutationVerb, parseChannel } from './types';

const logger = createScopedLogger('command-bus');

type EventHandler = (channel: string, payload: unknown) => void;

export interface CommandBus {
  dispatch(channel: string, input: unknown, source: CommandSource): Promise<BusResult>;
  emit(channel: string, payload: unknown, context?: { commandId?: string; sessionId?: string; projectId?: string }): void;
  on(channel: string, handler: EventHandler): () => void;
  onAny(handler: EventHandler): () => void;
  registerHandler(channel: string, handler: CommandHandler): void;
  registerDynamic(channel: string, handler: CommandHandler): void;
  getRegistry(): RegisteredCommand[];
  queryCommands(filter: CommandFilter): CommandRecord[];
  queryEvents(filter: EventFilter): EventRecord[];
  dispose(): void;
}

export function createCommandBus(db: AdcDatabase): CommandBus {
  const handlers = new Map<string, CommandHandler>();
  const eventListeners = new Map<string, Set<EventHandler>>();
  const anyListeners = new Set<EventHandler>();

  // Track the "current" command ID for correlating events
  let activeCommandId: string | null = null;

  function dispatch(channel: string, input: unknown, source: CommandSource): Promise<BusResult> {
    const id = ulid();
    const { domain, verb, noun } = parseChannel(channel);
    const mutation = isMutationVerb(verb);
    const startTime = Date.now();

    // Write pending command
    db.insert(commands).values({
      id,
      channel,
      domain,
      verb,
      noun,
      isMutation: mutation,
      sourceType: source.type,
      sourceId: source.id ?? null,
      sourceName: source.name ?? null,
      input: input as Record<string, unknown>,
      output: null,
      status: 'pending',
      error: null,
      durationMs: null,
      projectId: null,
      createdAt: new Date().toISOString(),
    }).run();

    const handler = handlers.get(channel);
    if (!handler) {
      const error = `No handler registered for channel: ${channel}`;
      logger.warn(error);
      db.update(commands)
        .set({ status: 'error', error, durationMs: Date.now() - startTime })
        .where(eq(commands.id, id))
        .run();
      return Promise.resolve({ commandId: id, status: 'error', output: null, durationMs: Date.now() - startTime, error });
    }

    activeCommandId = id;

    return handler(input)
      .then((output) => {
        const durationMs = Date.now() - startTime;
        db.update(commands)
          .set({ status: 'success', output: output as Record<string, unknown>, durationMs })
          .where(eq(commands.id, id))
          .run();
        activeCommandId = null;
        return { commandId: id, status: 'success' as const, output, durationMs };
      })
      .catch((err: Error) => {
        const durationMs = Date.now() - startTime;
        const error = err.message;
        db.update(commands)
          .set({ status: 'error', error, durationMs })
          .where(eq(commands.id, id))
          .run();
        activeCommandId = null;
        return { commandId: id, status: 'error' as const, output: null, durationMs, error };
      });
  }

  function emit(
    channel: string,
    payload: unknown,
    context?: { commandId?: string; sessionId?: string; projectId?: string },
  ): void {
    const id = ulid();
    db.insert(busEvents).values({
      id,
      channel,
      payload: payload as Record<string, unknown>,
      sourceCommandId: context?.commandId ?? activeCommandId,
      sessionId: context?.sessionId ?? null,
      projectId: context?.projectId ?? null,
      createdAt: new Date().toISOString(),
    }).run();

    // Notify listeners
    const channelListeners = eventListeners.get(channel);
    if (channelListeners) {
      for (const handler of channelListeners) {
        try {
          handler(channel, payload);
        } catch (err) {
          logger.error(`Event handler error for ${channel}:`, err);
        }
      }
    }
    for (const handler of anyListeners) {
      try {
        handler(channel, payload);
      } catch (err) {
        logger.error('Any-event handler error:', err);
      }
    }
  }

  function on(channel: string, handler: EventHandler): () => void {
    let listeners = eventListeners.get(channel);
    if (!listeners) {
      listeners = new Set();
      eventListeners.set(channel, listeners);
    }
    listeners.add(handler);
    return () => { listeners!.delete(handler); };
  }

  function onAny(handler: EventHandler): () => void {
    anyListeners.add(handler);
    return () => { anyListeners.delete(handler); };
  }

  function registerHandler(channel: string, handler: CommandHandler): void {
    handlers.set(channel, handler);
  }

  function registerDynamic(channel: string, handler: CommandHandler): void {
    handlers.set(channel, handler);
    logger.info(`Dynamic command registered: ${channel}`);
  }

  function getRegistry(): RegisteredCommand[] {
    return [...handlers.entries()].map(([channel, handler]) => {
      const { domain, verb, noun } = parseChannel(channel);
      return { channel, domain, verb, noun, isMutation: isMutationVerb(verb), handler };
    });
  }

  function queryCommands(filter: CommandFilter): CommandRecord[] {
    const conditions = [];
    if (filter.domain) conditions.push(eq(commands.domain, filter.domain));
    if (filter.verb) conditions.push(eq(commands.verb, filter.verb));
    if (filter.sourceType) conditions.push(eq(commands.sourceType, filter.sourceType));
    if (filter.projectId) conditions.push(eq(commands.projectId, filter.projectId));
    if (filter.since) conditions.push(gte(commands.createdAt, filter.since));

    let query = db.select().from(commands);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    return query.orderBy(desc(commands.createdAt)).limit(filter.limit ?? 100).all() as CommandRecord[];
  }

  function queryEvents(filter: EventFilter): EventRecord[] {
    const conditions = [];
    if (filter.channel) conditions.push(eq(busEvents.channel, filter.channel));
    if (filter.sessionId) conditions.push(eq(busEvents.sessionId, filter.sessionId));
    if (filter.since) conditions.push(gte(busEvents.createdAt, filter.since));

    let query = db.select().from(busEvents);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    return query.orderBy(desc(busEvents.createdAt)).limit(filter.limit ?? 100).all() as EventRecord[];
  }

  function dispose(): void {
    handlers.clear();
    eventListeners.clear();
    anyListeners.clear();
  }

  return {
    dispatch,
    emit,
    on,
    onAny,
    registerHandler,
    registerDynamic,
    getRegistry,
    queryCommands,
    queryEvents,
    dispose,
  };
}
```

- [ ] **Step 3: Create barrel**

```typescript
// src/main/bus/index.ts
export { createCommandBus } from './command-bus';
export type { CommandBus } from './command-bus';
export type {
  BusResult,
  CommandFilter,
  CommandHandler,
  CommandRecord,
  CommandSource,
  EventFilter,
  EventRecord,
  RegisteredCommand,
} from './types';
export { isMutationVerb, parseChannel } from './types';
```

- [ ] **Step 4: Write tests**

```typescript
// tests/unit/services/command-bus.test.ts
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCommandBus } from '@main/bus';
import { closeDatabase, initDatabase } from '@main/db';

describe('CommandBus', () => {
  let tempDir: string;
  let bus: ReturnType<typeof createCommandBus>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'adc-bus-test-'));
    const db = initDatabase(tempDir);
    bus = createCommandBus(db);
  });

  afterEach(() => {
    bus.dispose();
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('dispatches a command and logs to SQLite', async () => {
    const handler = vi.fn().mockResolvedValue({ id: '1', title: 'Test' });
    bus.registerHandler('test.create.item', handler);

    const result = await bus.dispatch(
      'test.create.item',
      { title: 'Test' },
      { type: 'ui', name: 'TestComponent' },
    );

    expect(result.status).toBe('success');
    expect(result.output).toEqual({ id: '1', title: 'Test' });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(handler).toHaveBeenCalledWith({ title: 'Test' });

    // Verify logged to SQLite
    const logged = bus.queryCommands({ domain: 'test' });
    expect(logged).toHaveLength(1);
    expect(logged[0].channel).toBe('test.create.item');
    expect(logged[0].status).toBe('success');
  });

  it('logs errors for failed commands', async () => {
    bus.registerHandler('test.fail.item', () => Promise.reject(new Error('boom')));

    const result = await bus.dispatch(
      'test.fail.item',
      {},
      { type: 'system', name: 'test' },
    );

    expect(result.status).toBe('error');
    expect(result.error).toBe('boom');
  });

  it('returns error for unregistered channels', async () => {
    const result = await bus.dispatch('nonexistent.channel', {}, { type: 'ui' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('No handler registered');
  });

  it('emits events and logs to SQLite', () => {
    const handler = vi.fn();
    bus.on('event:test.item.created', handler);

    bus.emit('event:test.item.created', { id: '1' });

    expect(handler).toHaveBeenCalledWith('event:test.item.created', { id: '1' });

    const logged = bus.queryEvents({ channel: 'event:test.item.created' });
    expect(logged).toHaveLength(1);
  });

  it('parses channels into domain/verb/noun', () => {
    const handler = vi.fn().mockResolvedValue(null);
    bus.registerHandler('progress.create.task', handler);

    const registry = bus.getRegistry();
    const entry = registry.find((r) => r.channel === 'progress.create.task');
    expect(entry?.domain).toBe('progress');
    expect(entry?.verb).toBe('create');
    expect(entry?.noun).toBe('task');
    expect(entry?.isMutation).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/unit/services/command-bus.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/bus/ tests/unit/services/command-bus.test.ts
git commit -m "feat(bus): implement command bus core with SQLite logging"
```

---

### Task 9: Session Management in Bus

**Files:**
- Create: `src/main/bus/session-manager.ts`
- Modify: `src/main/bus/types.ts` — add session types
- Modify: `src/main/bus/index.ts`
- Test: `tests/unit/services/bus-session-manager.test.ts`

- [ ] **Step 1: Add session types to types.ts**

```typescript
// Add to src/main/bus/types.ts

export interface SessionSpawnRequest {
  name: string;
  type: 'project-owner' | 'team-lead' | 'assistant' | 'qa' | 'research' | 'planner';
  phase?: 'research' | 'planning' | 'executing' | 'qa';
  projectId?: string;
  projectPath?: string;
  taskSlug?: string;
  prompt: string;
  model?: string;
  parentId?: string;
  teamName?: string;
  wave?: number;
  taskIndex?: number;
  worktreePath?: string;
  agentFlags?: {
    agentId?: string;
    agentName?: string;
    agentType?: string;
    dangerouslySkipPermissions?: boolean;
  };
}

export interface SessionRecord {
  id: string;
  name: string;
  type: string;
  phase: string | null;
  status: string;
  projectId: string | null;
  taskSlug: string | null;
  model: string | null;
  pid: number | null;
  worktreePath: string | null;
  spawnConfig: unknown;
  tokenUsage: unknown;
  toolUsage: unknown;
  parentId: string | null;
  teamName: string | null;
  wave: number | null;
  taskIndex: number | null;
  startedAt: string;
  endedAt: string | null;
  exitCode: number | null;
  error: string | null;
}

export interface SessionFilter {
  status?: string;
  type?: string;
  projectId?: string;
  taskSlug?: string;
  parentId?: string;
}

export type SessionEventType = 'spawned' | 'active' | 'completed' | 'error' | 'killed';
export type SessionEventHandler = (event: { type: SessionEventType; session: SessionRecord }) => void;
```

- [ ] **Step 2: Implement session manager**

```typescript
// src/main/bus/session-manager.ts
import { eq, and } from 'drizzle-orm';

import type { AdcDatabase } from '../db';
import { sessions } from '../db/schema';
import type { AgentManagerService } from '../services/agent-manager';
import { createScopedLogger } from '../lib/logger';

import type {
  SessionEventHandler,
  SessionFilter,
  SessionRecord,
  SessionSpawnRequest,
} from './types';

const logger = createScopedLogger('bus-sessions');

export interface BusSessionManager {
  spawn(config: SessionSpawnRequest): Promise<SessionRecord>;
  kill(sessionId: string): Promise<void>;
  get(sessionId: string): SessionRecord | undefined;
  list(filter?: SessionFilter): SessionRecord[];
  onEvent(handler: SessionEventHandler): () => void;
  recoverInterrupted(): void;
  dispose(): void;
}

export function createBusSessionManager(
  db: AdcDatabase,
  agentManager: AgentManagerService,
): BusSessionManager {
  const eventHandlers = new Set<SessionEventHandler>();
  const cleanups: Array<() => void> = [];

  function emitEvent(type: SessionEventHandler extends (e: infer E) => void ? E['type'] : never, session: SessionRecord): void {
    for (const handler of eventHandlers) {
      try {
        handler({ type: type as any, session });
      } catch (err) {
        logger.error('Session event handler error:', err);
      }
    }
  }

  // Subscribe to agent-manager events to keep SQLite in sync
  const unsubAgentManager = agentManager.onEvent((event) => {
    if (event.type === 'session.ended') {
      const sessionId = event.sessionId;
      const existing = get(sessionId);
      if (existing) {
        const endedAt = new Date().toISOString();
        const status = event.data?.exitCode === 0 ? 'completed' : 'error';
        db.update(sessions)
          .set({
            status,
            endedAt,
            exitCode: event.data?.exitCode ?? null,
            tokenUsage: event.data?.tokenUsage ?? existing.tokenUsage,
          })
          .where(eq(sessions.id, sessionId))
          .run();
        const updated = get(sessionId);
        if (updated) {
          emitEvent(status === 'completed' ? 'completed' : 'error', updated);
        }
      }
    } else if (event.type === 'status.changed') {
      const sessionId = event.sessionId;
      const existing = get(sessionId);
      if (existing && event.data?.status) {
        db.update(sessions)
          .set({ status: event.data.status })
          .where(eq(sessions.id, sessionId))
          .run();
      }
    }
  });
  cleanups.push(unsubAgentManager);

  function spawn(config: SessionSpawnRequest): Promise<SessionRecord> {
    // Determine spawn method based on type
    const isTeamLead = config.type === 'team-lead';

    const spawnResult = isTeamLead
      ? agentManager.spawnTeamLead({
          projectPath: config.projectPath ?? process.cwd(),
          prompt: config.prompt,
          model: config.model,
          teamName: config.teamName,
          agentFlags: config.agentFlags,
        })
      : agentManager.spawnProjectOwner({
          projectPath: config.projectPath ?? process.cwd(),
          prompt: config.prompt,
          name: config.name,
          model: config.model,
          agentFlags: config.agentFlags,
        });

    const session = isTeamLead
      ? (spawnResult as { session: { id: string; pid?: number } }).session
      : spawnResult as { id: string; pid?: number };

    const now = new Date().toISOString();
    const record: typeof sessions.$inferInsert = {
      id: session.id,
      name: config.name,
      type: config.type,
      phase: config.phase ?? null,
      status: 'active',
      projectId: config.projectId ?? null,
      taskSlug: config.taskSlug ?? null,
      model: config.model ?? null,
      pid: session.pid ?? null,
      worktreePath: config.worktreePath ?? null,
      spawnConfig: config as unknown as Record<string, unknown>,
      tokenUsage: null,
      toolUsage: null,
      parentId: config.parentId ?? null,
      teamName: config.teamName ?? null,
      wave: config.wave ?? null,
      taskIndex: config.taskIndex ?? null,
      startedAt: now,
      endedAt: null,
      exitCode: null,
      error: null,
    };

    db.insert(sessions).values(record).run();
    const result = get(session.id)!;
    emitEvent('spawned', result);
    return Promise.resolve(result);
  }

  function kill(sessionId: string): Promise<void> {
    agentManager.stopSession(sessionId);
    db.update(sessions)
      .set({ status: 'killed', endedAt: new Date().toISOString() })
      .where(eq(sessions.id, sessionId))
      .run();
    const updated = get(sessionId);
    if (updated) {
      emitEvent('killed', updated);
    }
    return Promise.resolve();
  }

  function get(sessionId: string): SessionRecord | undefined {
    const rows = db.select().from(sessions).where(eq(sessions.id, sessionId)).all();
    return rows[0] as SessionRecord | undefined;
  }

  function list(filter?: SessionFilter): SessionRecord[] {
    const conditions = [];
    if (filter?.status) conditions.push(eq(sessions.status, filter.status));
    if (filter?.type) conditions.push(eq(sessions.type, filter.type));
    if (filter?.projectId) conditions.push(eq(sessions.projectId, filter.projectId));
    if (filter?.taskSlug) conditions.push(eq(sessions.taskSlug, filter.taskSlug));
    if (filter?.parentId) conditions.push(eq(sessions.parentId, filter.parentId));

    let query = db.select().from(sessions);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    return query.all() as SessionRecord[];
  }

  function onEvent(handler: SessionEventHandler): () => void {
    eventHandlers.add(handler);
    return () => { eventHandlers.delete(handler); };
  }

  function recoverInterrupted(): void {
    const active = db.select().from(sessions)
      .where(eq(sessions.status, 'active'))
      .all();

    for (const session of active) {
      const pid = session.pid;
      let alive = false;
      if (pid) {
        try {
          process.kill(pid, 0); // Signal 0 = check if alive
          alive = true;
        } catch {
          alive = false;
        }
      }

      if (!alive) {
        logger.info(`Recovering interrupted session: ${session.id} (${session.name})`);
        db.update(sessions)
          .set({
            status: 'error',
            error: 'Interrupted by app restart',
            endedAt: new Date().toISOString(),
          })
          .where(eq(sessions.id, session.id))
          .run();
      }
    }
  }

  function dispose(): void {
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
    eventHandlers.clear();
  }

  return { spawn, kill, get, list, onEvent, recoverInterrupted, dispose };
}
```

- [ ] **Step 3: Update bus barrel**

Add session-manager exports to `src/main/bus/index.ts`.

- [ ] **Step 4: Write tests and verify**

Run: `npx vitest run tests/unit/services/bus-session-manager.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/main/bus/ tests/unit/services/
git commit -m "feat(bus): add session lifecycle management with SQLite persistence"
```

---

### Task 10: Wire Bus Into Bootstrap

**Files:**
- Modify: `src/main/bootstrap/service-registry.ts`
- Modify: `src/main/bootstrap/ipc-wiring.ts`
- Modify: `src/main/bootstrap/event-wiring.ts`
- Modify: `src/main/bootstrap/lifecycle.ts`

- [ ] **Step 1: Add database + bus initialization to service-registry.ts**

At the top of `createServiceRegistry()` (before other services):

```typescript
import { initDatabase, closeDatabase } from '../db';
import { createCommandBus } from '../bus';
import { createBusSessionManager } from '../bus/session-manager';

// Early in the function, after dataDir is resolved:
const db = initDatabase(dataDir);
const commandBus = createCommandBus(db);
```

After agentManagerService is created:

```typescript
const busSessionManager = createBusSessionManager(db, agentManagerService);
busSessionManager.recoverInterrupted(); // Mark interrupted sessions on boot
```

Add `commandBus` and `busSessionManager` to the services bag and the return object.

- [ ] **Step 2: Remove deprecated service creation from service-registry.ts**

Delete these lines (approximate line numbers from research):
- Line 448–452: `createCrashRecovery(...)` — replaced by `busSessionManager.recoverInterrupted()`
- Line 455: `createTaskLauncher()` — zombie
- Line 457: `createAgentOrchestrator(...)` — v1 replaced by bus
- Line 572–577: `createJsonlProgressWatcher(...)` and `createProgressWatcherV2()` — duplicates

Remove these from the services bag and return object. Update the `Services` interface.

- [ ] **Step 3: Wire IPC handlers through bus**

In `src/main/bootstrap/ipc-wiring.ts`, modify `wireIpcHandlers`:

```typescript
export function wireIpcHandlers(router: IpcRouter, services: Services, commandBus: CommandBus): void {
  // Register all handlers with the bus
  registerAllHandlers(router, services);

  // Wrap router.handle to dispatch through bus
  // The router's existing Zod validation stays — the bus adds tracking on top
}
```

The key integration point: intercept `router.handle()` calls so each invocation goes through `bus.dispatch()`. This can be done by patching the router's handle method or by modifying `registerAllHandlers` to register via the bus.

- [ ] **Step 4: Clean up event-wiring.ts**

Remove the orchestrator blocks (lines 115–179 and 182–239):
- Delete `agentOrchestrator.onSessionEvent(...)` block
- Delete `jsonlProgressWatcher.onProgress(...)` block
- Delete `jsonlProgressWatcher.start()` call

Add bus session event forwarding:

```typescript
busSessionManager.onEvent((event) => {
  router.emit(`event:bus.session.${event.type}`, {
    sessionId: event.session.id,
    session: event.session,
  });
});
```

- [ ] **Step 5: Add database cleanup to lifecycle.ts**

In the shutdown handler, add `closeDatabase()` call after all services are disposed.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/main/bootstrap/
git commit -m "feat(bootstrap): wire command bus and session manager into app lifecycle"
```

---

### Task 11: Rewire Orchestrator Consumers

**Files:**
- Modify: `src/main/services/workflow-engine/states/spawn.ts`
- Modify: `src/main/services/workflow-engine/states/qa-gate.ts`
- Modify: `src/main/services/workflow-engine/states/guardian.ts`
- Modify: `src/main/services/workflow-engine/types.ts`
- Modify: `src/main/services/qa/qa-runner.ts`
- Modify: `src/main/services/qa/qa-trigger.ts`
- Modify: `src/main/services/agent-orchestrator/agent-watchdog.ts` → move to `src/main/services/agent-watchdog/`
- Modify: `src/main/services/briefing/briefing-generator.ts`
- Modify: `src/main/services/insights/insights-service.ts`

For each consumer, the pattern is the same:
1. Replace `import type { AgentOrchestrator }` with `import type { BusSessionManager }` and/or `import type { CommandBus }`
2. Replace `agentOrchestrator.spawn(opts)` with `busSessionManager.spawn(config)`
3. Replace `agentOrchestrator.listActiveSessions()` with `busSessionManager.list({ status: 'active' })`
4. Replace `agentOrchestrator.getSession(id)` with `busSessionManager.get(id)`
5. Replace `agentOrchestrator.getSessionByTaskId(taskId)` with `busSessionManager.list({ taskSlug: taskId })[0]`
6. Replace `agentOrchestrator.kill(id)` with `busSessionManager.kill(id)`
7. Replace `agentOrchestrator.onSessionEvent(handler)` with `busSessionManager.onEvent(handler)`

- [ ] **Step 1: Update WorkflowEngine deps type**

In `src/main/services/workflow-engine/types.ts`, change `agentOrchestrator: AgentOrchestrator` to `busSessionManager: BusSessionManager`.

- [ ] **Step 2: Update spawn.ts**

Replace the `agentOrchestrator.spawn()` call with `busSessionManager.spawn()`. Map the old `SpawnOptions` fields to `SessionSpawnRequest` fields.

- [ ] **Step 3: Update qa-gate.ts**

Replace `agentOrchestrator.getSessionByTaskId()` polling with `busSessionManager.list({ taskSlug })` queries.

- [ ] **Step 4: Update guardian.ts**

Replace `agentOrchestrator.spawn()` and `agentOrchestrator.getSession()` with bus equivalents.

- [ ] **Step 5: Update qa-runner.ts**

Replace all orchestrator calls with bus session manager calls.

- [ ] **Step 6: Update qa-trigger.ts**

Replace `orchestrator.onSessionEvent` with `busSessionManager.onEvent` and `orchestrator.getSessionByTaskId` with bus queries.

- [ ] **Step 7: Move and update agent-watchdog.ts**

Move from `src/main/services/agent-orchestrator/agent-watchdog.ts` to `src/main/services/agent-watchdog/agent-watchdog.ts`. Update to use `busSessionManager.list({ status: 'active' })` instead of `orchestrator.listActiveSessions()`.

- [ ] **Step 8: Update briefing-generator.ts**

Replace `agentOrchestrator.listActiveSessions()` with `busSessionManager.list()`.

- [ ] **Step 9: Update insights-service.ts**

Replace `agentOrchestrator.listActiveSessions()` with `busSessionManager.list()`. Consider also querying the `commands` table for richer metrics.

- [ ] **Step 10: Update service-registry.ts**

Update all the wiring — pass `busSessionManager` instead of `agentOrchestrator` to all rewired consumers.

- [ ] **Step 11: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add src/main/services/ src/main/bootstrap/
git commit -m "refactor: rewire all orchestrator consumers to command bus session manager"
```

---

### Task 12: Delete Deprecated Systems

**Files:**
- Delete: `src/main/services/agent-orchestrator/` (entire directory)
- Delete: `src/main/services/workflow/task-launcher.ts`
- Delete: `src/main/services/data-management/crash-recovery.ts`
- Delete: `src/main/services/progress-watcher-v2/` (entire directory)
- Delete: `src/main/ipc/handlers/agent-orchestrator-handlers.ts`
- Modify: `src/main/ipc/index.ts` — remove orchestrator handler registration
- Modify: `src/shared/ipc/agents/` — delete or gut this folder (orchestrator-only)
- Modify: `src/shared/ipc/index.ts` — remove orchestrator imports
- Modify: `src/shared/types/session-config.ts` — update to match bus types

- [ ] **Step 1: Delete service directories and files**

```bash
rm -rf src/main/services/agent-orchestrator/
rm -rf src/main/services/progress-watcher-v2/
rm src/main/services/workflow/task-launcher.ts
rm src/main/services/data-management/crash-recovery.ts
rm src/main/ipc/handlers/agent-orchestrator-handlers.ts
```

- [ ] **Step 2: Remove from IPC barrel and handler registration**

In `src/main/ipc/index.ts`, remove the import and registration of `agent-orchestrator-handlers`. In `src/shared/ipc/index.ts`, remove `orchestratorInvoke` and `orchestratorEvents` imports.

- [ ] **Step 3: Delete the agents/ IPC domain folder**

Since all `agent.*` channels were orchestrator channels and are now deleted, remove `src/shared/ipc/agents/` entirely.

- [ ] **Step 4: Clean up any remaining type imports**

Search for any remaining imports from deleted modules and remove them.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS — zero references to deleted code

- [ ] **Step 6: Run existing tests**

Run: `npm run test`
Expected: All tests pass (some may need updating if they referenced deleted modules)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: delete deprecated agent-orchestrator, task-launcher, crash-recovery, progress-watcher-v2"
```

---

### Task 13: Add Bus IPC Domain

**Files:**
- Create: `src/shared/ipc/bus/channels.ts`
- Create: `src/shared/ipc/bus/contract.ts`
- Create: `src/shared/ipc/bus/schemas.ts`
- Create: `src/shared/ipc/bus/index.ts`
- Create: `src/main/ipc/handlers/bus-handlers.ts`

The bus needs its own IPC domain so the renderer can query commands, events, and sessions.

- [ ] **Step 1: Create bus channel constants**

```typescript
// src/shared/ipc/bus/channels.ts
import { domain, events } from '../channel-builder';

export const BUS = domain('bus', {
  QUERY: ['commands', 'events'],
  LIST: ['sessions'],
  GET: ['session', 'registry'],
  SPAWN: ['session'],
  KILL: ['session'],
});

export const BUS_EVENTS = events('bus', {
  SESSION: ['spawned', 'active', 'completed', 'error', 'killed'],
  COMMAND: ['executed'],
});
```

- [ ] **Step 2: Create schemas and contract**

Define Zod schemas for session queries and command queries. Create contract using the constants.

- [ ] **Step 3: Create bus handlers**

```typescript
// src/main/ipc/handlers/bus-handlers.ts
import { BUS } from '@shared/ipc/bus/channels';

export function registerBusHandlers(router: IpcRouter, commandBus: CommandBus, sessionManager: BusSessionManager): void {
  router.handle(BUS.QUERY.COMMANDS, async (input) => commandBus.queryCommands(input));
  router.handle(BUS.QUERY.EVENTS, async (input) => commandBus.queryEvents(input));
  router.handle(BUS.LIST.SESSIONS, async (input) => sessionManager.list(input));
  router.handle(BUS.GET.SESSION, async (input) => sessionManager.get(input.sessionId));
  router.handle(BUS.GET.REGISTRY, async () => commandBus.getRegistry().map(r => ({
    channel: r.channel, domain: r.domain, verb: r.verb, noun: r.noun, isMutation: r.isMutation,
  })));
  router.handle(BUS.SPAWN.SESSION, async (input) => sessionManager.spawn(input));
  router.handle(BUS.KILL.SESSION, async (input) => { await sessionManager.kill(input.sessionId); return { success: true }; });
}
```

- [ ] **Step 4: Register in ipc-wiring**

- [ ] **Step 5: Add to IPC root barrel**

- [ ] **Step 6: Commit**

```bash
git add src/shared/ipc/bus/ src/main/ipc/handlers/bus-handlers.ts
git commit -m "feat(ipc): add bus IPC domain for command/session/event queries"
```

---

### Task 14: Full Verification

- [ ] **Step 1: Run all checks**

```bash
npm run lint
npm run typecheck
npm run build
npm run test
```

All must pass with zero errors.

- [ ] **Step 2: Manual smoke test**

```bash
npm run dev
```

Verify: app starts, SQLite database created at userData path, IPC channels work, no console errors.

- [ ] **Step 3: Commit any fixes**

---

### Task 15: Documentation Updates

**Files to update (every file listed is mandatory):**

- Modify: `CLAUDE.md` — add Command Bus section, channel constants instructions, remove all orchestrator references
- Modify: `docs/architecture/ARCHITECTURE.md` — new system diagram with bus + SQLite layer, remove orchestrator from services list
- Modify: `docs/routing/FEATURES-INDEX.md` — update service inventory (remove orchestrator, task-launcher, progress-watcher-v2; add command-bus, bus-session-manager), update handler count, update IPC domain count
- Modify: `docs/routing/AI-AGENT-ROUTING-INDEX.md` — remove agents/orchestrator vertical slice, add bus/sessions domain vertical slice, update all consumer references
- Modify: `docs/patterns/PATTERNS.md` — add channel constants pattern section, add bus dispatch pattern section
- Modify: `.claude/agents/team-leader.md` — update to reference bus commands and channel constants
- Modify: `.claude/skills/electron-ipc/` — update the skill content to show channel constants + bus pattern instead of old string-literal pattern
- Modify: `.claude/skills/codebase-nav/` — update service inventory

- [ ] **Step 1: Update CLAUDE.md**

Add new section after "Caching Layer Rules":

```markdown
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
```

Remove all references to `agent-orchestrator`, `task-launcher`, `crash-recovery`, `progress-watcher-v2`.

- [ ] **Step 2: Update ARCHITECTURE.md**

Replace the system diagram. Add SQLite + bus layer between services and IPC router. Update service count and list.

- [ ] **Step 3: Update FEATURES-INDEX.md and AI-AGENT-ROUTING-INDEX.md**

Remove deleted services, add new ones, update counts.

- [ ] **Step 4: Update agent definitions and skills**

Update `.claude/agents/team-leader.md` and relevant skills to reference the new system.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/ .claude/
git commit -m "docs: update all documentation for command bus architecture"
```

---

### Task 16: Write Phase 2 Task Files

**Files:**
- Create: `progress/migrate-settings/task.md`
- Create: `progress/migrate-captures/task.md`
- Create: `progress/migrate-notes/task.md`
- Create: `progress/migrate-alerts/task.md`
- Create: `progress/migrate-ideas/task.md`
- Create: `progress/migrate-milestones/task.md`
- Create: `progress/migrate-changelog/task.md`
- Create: `progress/migrate-planner/task.md`
- Create: `progress/migrate-fitness/task.md`
- Create: `progress/migrate-briefings/task.md`
- Create: `progress/migrate-notifications/task.md`
- Create: `progress/migrate-progress-tasks/task.md`
- Create: `progress/migrate-progress-sessions/task.md`
- Create: `progress/migrate-task-specs/task.md`
- Create: `progress/migrate-workflow-engine/task.md`
- Create: `progress/migrate-oauth/task.md`
- Create: `progress/migrate-email/task.md`
- Create: `progress/migrate-hub-config/task.md`
- Create: `progress/remove-json-stores/task.md`
- Create: `progress/remove-progress-fs/task.md`

Each task file follows YAML frontmatter format:

```yaml
---
title: "Migrate [Domain] to SQLite"
status: backlog
priority: medium
tags: [phase-2, wave-N, data-migration]
---
```

- [ ] **Step 1: Write Wave 1 task files (7 simple JSON stores)**

Each task file must include:
- Current JSON file path and service that reads/writes it
- Drizzle table schema to add (the exact `sqliteTable()` call)
- One-time migration: read JSON → insert into SQLite
- Service changes: replace `readJSON`/`writeJSON` with Drizzle queries
- Handler changes: update any affected channel handlers
- Test: verify data round-trips through the new path
- Docs: which docs reference this store

- [ ] **Step 2: Write Wave 2 task files (4 directory-based stores)**

- [ ] **Step 3: Write Wave 3 task files (4 complex domains)**

- [ ] **Step 4: Write Wave 4 task files (3 encrypted stores)**

- [ ] **Step 5: Write Wave 5 task files (2 cleanup tasks)**

- [ ] **Step 6: Commit**

```bash
git add progress/migrate-*/task.md progress/remove-*/task.md
git commit -m "docs: add Phase 2 data migration task files for agent teams"
```

---

## Final Verification

After all 16 tasks are complete:

```bash
npm run lint      # Zero violations
npm run typecheck # Zero errors
npm run build     # Builds successfully
npm run test      # All tests pass
```

The app should start, create `adc.db`, track all IPC commands in SQLite, manage sessions through the bus, and have zero references to deleted code.
