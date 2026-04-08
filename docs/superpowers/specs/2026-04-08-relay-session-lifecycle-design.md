# Relay Session Lifecycle — Design Spec

## Goal

Wire the 5 remaining relay session IPC channels, make the progress pipeline transparently route to remote devices, and build a universal session lifecycle system where every Claude session is tracked in `progress/<slug>/session.config.json` with harness-driven kill/restart and crash recovery.

## Problem

1. **5 relay session channels have no IPC handlers** — `relay.spawnSession`, `relay.sendInput`, `relay.killSession`, `relay.resumeSession`, `relay.sendEnvelope` are defined in the contract but the renderer can't call them.

2. **Progress pipeline is local-only** — `progress-service.ts` spawns sessions via `agentManagerService.spawnProjectOwner()` with no awareness of remote projects. Task row buttons (research/plan/execute) silently fail on remote projects.

3. **No session lifecycle management** — there's no way to kill a stuck Claude session or restart one that failed. No crash recovery. No history of what sessions ran on a task. The assistant has no session management tools.

4. **Agents don't self-report** — relying on agents to call commands or write their own progress records is unreliable. The harness must handle all session tracking.

## Architecture

Three layers, bottom-up:

### Layer 1 — Relay Session IPC Handlers

Wire the 5 missing channels in `relay-handlers.ts` to the existing `RelayService`. Thin handlers following the same pattern as `relay.claimProject`/`relay.unclaimProject`.

### Layer 2 — Transparent Remote Routing

The progress service checks `relayService.isRemoteProject(projectId)` before spawning. If remote, routes through `relayService.spawnRemoteSession()`. If local, uses `agentManagerService.spawnProjectOwner()`. Callers (UI, assistant, workspace) see no difference.

### Layer 3 — Universal Session Lifecycle

Every Claude session that does work registers in `progress/<slug>/session.config.json`. The orchestrator writes at spawn, the `JsonlProgressWatcher` updates during execution (tokens, tool use), and the orchestrator finalizes at exit. Agents never touch session config directly. Kill and restart operate on these records. On app boot, scan for interrupted sessions and offer restart.

---

## Layer 1: Relay Session IPC Handlers

### Modified: `src/main/ipc/handlers/relay-handlers.ts`

The `registerRelayHandlers` function gains a `relayService: RelayService` parameter (currently only takes `hubApiClient` and `getDeviceId`).

5 new handler registrations:

| Channel | Implementation |
|---------|---------------|
| `relay.spawnSession` | `relayService.spawnRemoteSession(hostDeviceId, projectId, payload)` — returns `{ sessionId }` |
| `relay.sendInput` | `relayService.sendInput(sessionId, data)` — returns `{ success: true }` |
| `relay.killSession` | `relayService.killSession(sessionId, reason)` — returns `{ success: true }` |
| `relay.resumeSession` | `relayService.resumeSession(sessionId)` — returns `{ success: true }` |
| `relay.sendEnvelope` | Direct passthrough — parses envelope, calls `relayService.handleIncomingEnvelope(envelope, localDeviceId)` |

### Modified: `src/main/bootstrap/service-registry.ts`

Pass `relayService` to `registerRelayHandlers`.

---

## Layer 2: Transparent Remote Routing

### Modified: `src/main/services/progress/progress-service.ts`

**New dependency**: `relayService: RelayService` added to `createProgressService` factory.

**Modified function**: `spawnAndTrack(slug, action, prompt)`:

```
Before spawning:
  1. Resolve projectId for this task (from task metadata or active project context)
  2. Check relayService.isRemoteProject(projectId)
  3a. If remote:
     - hostDeviceId = relayService.getHostDeviceId(projectId)
     - sessionId = relayService.spawnRemoteSession(hostDeviceId, projectId, {
         agentRole: action,
         prompt,
         workDir: projectPath,
         taskId: slug,
       })
     - Subscribe to relay session events (event:relay.sessionEnded) for this sessionId
     - Write SessionRecord with isRemote: true, hostDeviceId
  3b. If local:
     - Current behavior: agentManagerService.spawnProjectOwner(...)
     - Write SessionRecord with isRemote: false
```

**Event subscription for remote sessions**: The progress service subscribes to `event:relay.sessionEnded` and maps relay session IDs back to slugs via the `activeSessions` map. When a remote session ends, it calls `handleSessionEnd(slug, action, exitCode)` — the same path as local sessions.

### Modified: `src/main/bootstrap/service-registry.ts`

Pass `relayService` to `createProgressService`.

---

## Layer 3: Universal Session Lifecycle

### `session.config.json` Schema

Lives at `progress/<slug>/session.config.json`. Contains an append-only array of `SessionRecord` objects.

```typescript
interface SessionRecord {
  /** Unique session ID from AgentManagerService or RelayService */
  sessionId: string;

  /** Descriptive agent name: "{role}-{slug}" */
  agentName: string;

  /** What this session is doing */
  phase: 'research' | 'planning' | 'executing' | 'qa' | 'team-lead' | 'workspace' | 'assistant';

  /** Current lifecycle state */
  status: 'active' | 'completed' | 'error' | 'killed';

  /** Everything needed to restart this exact session */
  spawnConfig: {
    prompt: string;
    projectPath: string;
    projectId?: string;
    subProjectPath?: string;
    taskSlug: string;
    phase: string;
    env?: Record<string, string>;
    isRemote: boolean;
    hostDeviceId?: string;
  };

  /** Model used by this session (populated by harness from CLI args) */
  model?: string;

  /** Token usage (populated by JsonlProgressWatcher from session output stream) */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };

  /** Tool usage summary (populated by JsonlProgressWatcher) */
  toolUsage?: Array<{
    tool: string;
    count: number;
  }>;

  /** ISO timestamp when session was spawned */
  startedAt: string;

  /** ISO timestamp when session ended (set by harness on exit) */
  endedAt?: string;

  /** Process exit code (set by harness on exit) */
  exitCode?: number;

  /** Error message if session failed */
  error?: string;

  /** Wave number for team execution phases */
  wave?: number;

  /** Task index within a wave for team execution */
  taskIndex?: number;
}
```

### New file: `src/shared/types/session-config.ts`

The `SessionRecord` interface and related types, shared between main and renderer.

### New file: `src/main/services/progress/session-config-io.ts`

File I/O for `session.config.json`:

```typescript
interface SessionConfigIO {
  /** Read all session records for a task */
  read(slug: string): SessionRecord[];

  /** Append a new session record */
  append(slug: string, record: SessionRecord): void;

  /** Update a session record in-place by sessionId */
  update(slug: string, sessionId: string, updates: Partial<SessionRecord>): void;

  /** Get the latest active session for a task */
  getActive(slug: string): SessionRecord | null;

  /** Scan all progress directories for sessions that were active (crash recovery) */
  scanInterrupted(): Array<{ slug: string; record: SessionRecord }>;
}
```

Factory: `createSessionConfigIO(progressDir: string): SessionConfigIO`

### Harness-Driven Tracking

**Who writes what, and when:**

| Event | Writer | What's written |
|-------|--------|---------------|
| Session spawned | `progress-service.ts` / `workspace-session-manager.ts` | New `SessionRecord` with status `active`, full `spawnConfig`, `startedAt`, `model` |
| Token usage update | `JsonlProgressWatcher` | Updates `tokenUsage` fields on the active record (incremental) |
| Tool call observed | `JsonlProgressWatcher` | Increments `toolUsage` count for the tool |
| Session completed (exit 0) | `progress-service.ts` (via `handleSessionEnd`) | Updates `status: "completed"`, `endedAt`, `exitCode: 0` |
| Session failed (exit != 0) | `progress-service.ts` (via `handleSessionEnd`) | Updates `status: "error"`, `endedAt`, `exitCode`, `error` |
| Session killed | `sessions.kill` handler | Updates `status: "killed"`, `endedAt` |
| App crash recovery | Boot scan | Finds `active` records, marks as `status: "error"`, `error: "App shutdown unexpectedly"` |

**Agents never write to session.config.json.** The harness observes everything externally:
- Spawn config: set by the code that calls spawn
- Model: read from CLI args at spawn time
- Token usage: parsed from the Claude CLI JSONL output stream by `JsonlProgressWatcher`
- Tool calls: parsed from JSONL `tool_use` entries by `JsonlProgressWatcher`
- Exit status: process exit event

### Modified: `src/main/services/agent-orchestrator/jsonl-progress-watcher.ts`

The watcher already tails JSONL progress files. Add:
- Parse `token_usage` entries and call `sessionConfigIO.update()` with accumulated totals
- Parse `tool_use` entries and call `sessionConfigIO.update()` with tool counts
- The watcher needs access to `sessionConfigIO` and a mapping of `progressFile -> (slug, sessionId)`

### Modified: `src/main/services/progress/progress-service.ts`

- `spawnAndTrack()` calls `sessionConfigIO.append()` on spawn
- `handleSessionEnd()` calls `sessionConfigIO.update()` on exit
- `cancelAction()` calls `sessionConfigIO.update()` with status `killed`

### Modified: `src/main/services/workspace/workspace-session-manager.ts`

When a workspace session starts working on a slug:
- Call `sessionConfigIO.append()` with the session record
- On session end, call `sessionConfigIO.update()`

### New IPC Domain: `sessions`

**New file**: `src/shared/ipc/sessions/contract.ts`

```typescript
export const sessionsInvoke = {
  'sessions.list': {
    input: z.object({}),
    output: z.array(SessionRecordSchema),
  },
  'sessions.kill': {
    input: z.object({ sessionId: z.string() }),
    output: SuccessResponseSchema,
  },
  'sessions.restart': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  'sessions.getHistory': {
    input: z.object({ slug: z.string() }),
    output: z.array(SessionRecordSchema),
  },
  'sessions.getInterrupted': {
    input: z.object({}),
    output: z.array(z.object({
      slug: z.string(),
      record: SessionRecordSchema,
    })),
  },
} as const;

export const sessionsEvents = {
  'event:sessions.started': {
    payload: z.object({ slug: z.string(), record: SessionRecordSchema }),
  },
  'event:sessions.ended': {
    payload: z.object({ slug: z.string(), sessionId: z.string(), status: z.string() }),
  },
  'event:sessions.killed': {
    payload: z.object({ slug: z.string(), sessionId: z.string() }),
  },
  'event:sessions.tokenUpdate': {
    payload: z.object({ slug: z.string(), sessionId: z.string(), tokenUsage: TokenUsageSchema }),
  },
} as const;
```

**New file**: `src/shared/ipc/sessions/schemas.ts` — Zod schemas for `SessionRecord`, `TokenUsage`

**New file**: `src/main/ipc/handlers/session-handlers.ts`

| Handler | Implementation |
|---------|---------------|
| `sessions.list` | Scan all progress dirs, collect sessions with `status: "active"` from `session.config.json` files (i.e., what's currently running) |
| `sessions.kill` | Find session across `agentManagerService` or `relayService`, kill it, update config |
| `sessions.restart` | Read `spawnConfig` from the session record, kill if still running, re-spawn with same config |
| `sessions.getHistory` | `sessionConfigIO.read(slug)` |
| `sessions.getInterrupted` | `sessionConfigIO.scanInterrupted()` |

### Restart Logic

`sessions.restart` handler:

```
1. Find the SessionRecord by sessionId (scan session.config.json files)
2. If session is still active, kill it first (agentManagerService.stopSession or relayService.killSession)
3. Read spawnConfig from the record
4. If spawnConfig.isRemote:
     relayService.spawnRemoteSession(hostDeviceId, projectId, payload)
   Else:
     agentManagerService.spawnProjectOwner({ projectPath, prompt, name })
5. Write new SessionRecord with fresh sessionId, status: active
6. Return { sessionId: newSessionId }
```

### Crash Recovery (App Boot)

In `service-registry.ts` bootstrap, after all services are created:

```
1. sessionConfigIO.scanInterrupted() — finds all records with status: "active"
2. For each: update status to "error", error: "App shutdown unexpectedly", endedAt: now
3. Emit event:sessions.interrupted with the list
4. UI can show "N sessions were interrupted" banner with restart buttons
```

### Assistant Tools

**Modified**: `src/main/services/assistant/tool-definitions.ts`

Add 3 new tools:

```typescript
{
  name: 'list_sessions',
  description: 'List all active Claude sessions across all tasks. Shows session ID, agent name, phase, task slug, duration, and whether it is local or remote.',
  input_schema: { type: 'object', properties: {}, required: [] },
  queryKeyRoots: [],
},
{
  name: 'kill_session',
  description: 'Kill a Claude session by ID. Use when a session is stuck, unresponsive, or the user wants to stop it. Works on any session type: research, planning, execution, team-lead, workspace.',
  input_schema: {
    type: 'object',
    properties: {
      sessionId: { type: 'string', description: 'The session ID to kill' },
      reason: { type: 'string', description: 'Why the session is being killed' },
    },
    required: ['sessionId'],
  },
  queryKeyRoots: ['sessions'],
},
{
  name: 'restart_session',
  description: 'Restart a failed, killed, or stuck Claude session. Kills the old session if still running, then re-spawns with the exact same configuration (prompt, project, phase, agent name). Use when a session crashed or needs a fresh start.',
  input_schema: {
    type: 'object',
    properties: {
      sessionId: { type: 'string', description: 'The session ID to restart' },
    },
    required: ['sessionId'],
  },
  queryKeyRoots: ['sessions'],
}
```

**Modified**: `src/main/services/assistant/tool-executor.ts`

Add handlers for `list_sessions`, `kill_session`, `restart_session` that call the `sessions.*` IPC handlers (or the service directly).

### Optional: `/update-session` Command

**New file**: `.claude/commands/update-session.md`

An optional slash command agents can call to annotate their session (e.g., "switching from research to planning", adding notes). This writes a JSONL entry that the watcher picks up. Not required for the system to function — purely additive.

```markdown
---
description: Annotate the current session with status, notes, or phase changes
---

Write a JSONL entry to your progress file with the following structure:
{"type":"session_annotation","annotation":"$ARGUMENTS","timestamp":"<ISO timestamp>"}
```

---

## Files Changed Summary

| File | Action |
|------|--------|
| `src/shared/types/session-config.ts` | **New** — `SessionRecord` interface and related types |
| `src/shared/ipc/sessions/contract.ts` | **New** — 5 invoke + 4 event channels |
| `src/shared/ipc/sessions/schemas.ts` | **New** — Zod schemas for session types |
| `src/shared/ipc/sessions/index.ts` | **New** — barrel export |
| `src/shared/ipc/index.ts` | **Modify** — add sessions domain to barrel |
| `src/main/services/progress/session-config-io.ts` | **New** — read/write/scan session.config.json |
| `src/main/ipc/handlers/session-handlers.ts` | **New** — list/kill/restart/history/interrupted handlers |
| `src/main/ipc/handlers/relay-handlers.ts` | **Modify** — add 5 session relay handlers, accept relayService dep |
| `src/main/services/progress/progress-service.ts` | **Modify** — add relayService dep, write SessionRecords, transparent routing |
| `src/main/services/agent-orchestrator/jsonl-progress-watcher.ts` | **Modify** — parse token/tool usage, update session config |
| `src/main/services/workspace/workspace-session-manager.ts` | **Modify** — write SessionRecords for workspace sessions |
| `src/main/services/assistant/tool-definitions.ts` | **Modify** — add list_sessions, kill_session, restart_session |
| `src/main/services/assistant/tool-executor.ts` | **Modify** — add session tool handlers |
| `src/main/bootstrap/service-registry.ts` | **Modify** — pass relayService to handlers/services, crash recovery boot scan |
| `.claude/commands/update-session.md` | **New** — optional agent annotation command |
| `docs/routing/FEATURES-INDEX.md` | **Modify** — add sessions domain |
| `docs/routing/AI-AGENT-ROUTING-INDEX.md` | **Modify** — add sessions domain trace |

---

## What This Enables

1. **Task row buttons work on remote projects** — research/plan/execute transparently route through relay
2. **Kill any stuck session** — assistant or future UI button, works on any session type
3. **Restart with full context** — spawn config preserved, one-click restart
4. **Crash recovery** — app boot detects interrupted sessions, offers restart
5. **Full session history** — every session that ever worked on a task is logged with timing, model, tokens, tools
6. **Future meta-analysis** — session.config.json is the data source for workflow comparison, performance tracking, token usage analysis, accuracy metrics
