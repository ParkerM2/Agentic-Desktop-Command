# Three Pillars Design — Agent Orchestration, Automated QA, Assistant 2.0

> Tracker Key: `three-pillars` | Status: **APPROVED** | Created: 2026-02-15

> Transform Claude-UI from a task dashboard into an autonomous development orchestrator.

**Branch**: `feature/ai-assistant` (current)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Agent Spawn Infrastructure](#phase-1-agent-spawn-infrastructure)
3. [Phase 2: Task Board Integration](#phase-2-task-board-integration)
4. [Phase 3: Agent Watchdog](#phase-3-agent-watchdog)
5. [Phase 4: Automated QA System](#phase-4-automated-qa-system)
6. [Phase 5: Assistant Voice Integration](#phase-5-assistant-voice-integration)
7. [Phase 6: Assistant Watches & Cross-Device](#phase-6-assistant-watches--cross-device)
8. [Dependency Graph](#dependency-graph)
9. [New File Inventory](#new-file-inventory)
10. [Modified File Inventory](#modified-file-inventory)
11. [New IPC Channels](#new-ipc-channels)
12. [New Types](#new-types)

---

## Executive Summary

Three interconnected systems:

| Pillar | Purpose | Key Outcome |
|--------|---------|-------------|
| **Agent Orchestration** | Task board spawns headless Claude agents for planning + execution | Click "Start Planning" → agent creates plan → table row updates live → approve → execute |
| **Automated QA** | Two-tier quality gate (quiet background + full interactive) | Task reaches "review" → QA auto-runs → results on detail row with screenshots |
| **Assistant 2.0** | Always-on AI with voice, watches, cross-device awareness | "Hey Claude, tell me when task 123 is done" → proactive notification when it completes |

**Architectural principle**: Headless agents communicate via Claude hooks → JSONL progress files → progress watcher → IPC events → table row updates → Hub WebSocket → all devices. No PTY needed. No modals needed to monitor. The AG-Grid table row is the live status view.

---

## Phase 1: Agent Spawn Infrastructure

> Foundation services that all other phases depend on. No UI changes.

### Task 1.1: Agent Spawn Service

**Purpose**: Replace the fire-and-forget `TaskLauncher` with a proper agent lifecycle manager that spawns headless Claude agents, tracks their PIDs, and writes Claude hook configs for progress reporting.

**Files to Create**:
- `src/main/services/agent-orchestrator/agent-orchestrator.ts`
- `src/main/services/agent-orchestrator/hooks-template.ts`
- `src/main/services/agent-orchestrator/types.ts`

**Files to Read**:
- `src/main/services/workflow/task-launcher.ts` (current implementation — fire-and-forget)
- `src/main/services/agent/agent-service.ts` (legacy PTY-based — reference only)
- `C:\Users\Parke\.claude\plugins\cache\claude-workflow-marketplace\claude-workflow\1.0.0\prompts\implementing-features\AGENT-SPAWN-TEMPLATES.md`

**Specification**:

```typescript
// types.ts
interface AgentSession {
  id: string;                    // `agent-${taskId}-${timestamp}`
  taskId: string;
  pid: number;
  status: 'spawning' | 'active' | 'completed' | 'error' | 'killed';
  phase: 'planning' | 'executing' | 'qa';
  spawnedAt: string;
  lastHeartbeat: string;
  progressFile: string;          // path to .claude/progress/{taskId}.jsonl
  hooksConfigPath: string;       // path to temp hooks config
  exitCode: number | null;
  projectPath: string;
  command: string;               // the prompt sent to claude
}

interface SpawnOptions {
  taskId: string;
  projectPath: string;
  subProjectPath?: string;
  prompt: string;                // e.g. "/create-feature-plan {description}"
  phase: 'planning' | 'executing' | 'qa';
  env?: Record<string, string>;
}

interface AgentOrchestrator {
  spawn(options: SpawnOptions): Promise<AgentSession>;
  kill(sessionId: string): void;
  getSession(sessionId: string): AgentSession | undefined;
  getSessionByTaskId(taskId: string): AgentSession | undefined;
  listActiveSessions(): AgentSession[];
  onSessionEvent(handler: (event: AgentSessionEvent) => void): void;
  dispose(): void;
}
```

**Spawn implementation**:
1. Generate session ID and progress file path
2. Write temporary Claude hooks config (`hooks-template.ts`) to the project directory
   - `PostToolUse` hook → shell script that appends `{tool, timestamp, summary}` to progress JSONL
   - `Stop` hook → shell script that writes `{type: 'agent_stopped', exitReason}` and POSTs summary to Hub API
3. Spawn: `child_process.spawn('claude', ['-p', prompt], { cwd, stdio: 'pipe', detached: true, shell: true, env: { ...process.env, ...options.env } })`
   - **Note**: `stdio: 'pipe'` (not `'ignore'`) so we can capture stdout for plan output, but we don't write to stdin
   - Pipe stdout to a log file: `.claude/progress/{taskId}.log`
4. Listen for `exit` event → update session status, emit event
5. Register session in in-memory Map
6. Return session object

**hooks-template.ts**:
```typescript
// Generates a temporary .claude/settings.json with hooks for a specific task
function generateHooksConfig(taskId: string, progressDir: string, hubUrl?: string): object {
  return {
    hooks: {
      PostToolUse: [{
        command: `node -e "const fs=require('fs'); fs.appendFileSync('${progressDir}/${taskId}.jsonl', JSON.stringify({type:'tool_use',tool:process.env.CLAUDE_TOOL_NAME,timestamp:new Date().toISOString()})+'\\n')"`,
        timeout: 5000,
      }],
      Stop: [{
        command: `node -e "const fs=require('fs'); fs.appendFileSync('${progressDir}/${taskId}.jsonl', JSON.stringify({type:'agent_stopped',timestamp:new Date().toISOString(),reason:process.env.CLAUDE_STOP_REASON||'unknown'})+'\\n')"`,
        timeout: 10000,
      }],
    },
  };
}
```

**Acceptance Criteria**:
- [ ] Can spawn a headless Claude agent with a prompt
- [ ] Claude hooks config written before spawn, cleaned up after exit
- [ ] Progress JSONL file receives events from hooks
- [ ] Agent stdout captured to log file
- [ ] Session tracked in memory with PID, status, timestamps
- [ ] `exit` event properly handled (status updated, event emitted)
- [ ] `kill()` sends SIGTERM, waits 5s, then SIGKILL
- [ ] Multiple concurrent sessions supported
- [ ] Passes lint, typecheck, build

---

### Task 1.2: Extended Task Status Types

**Purpose**: Add `planning` and `plan_ready` statuses to represent the planning lifecycle in the task board.

**Files to Modify**:
- `src/shared/types/hub-protocol.ts` — Add new statuses to `HubTaskStatus`
- `src/main/ipc/handlers/task-handlers.ts` — Update status mapping functions
- `src/shared/types/task.ts` — Add new statuses to local `TaskStatus` (if separate)

**Specification**:

Hub TaskStatus additions:
```typescript
// Current: 'backlog' | 'queued' | 'running' | 'paused' | 'review' | 'done' | 'error'
// New:     'backlog' | 'planning' | 'plan_ready' | 'queued' | 'running' | 'paused' | 'review' | 'done' | 'error'
```

Valid transitions update:
```typescript
const VALID_TRANSITIONS = {
  backlog: ['planning', 'queued', 'running'],      // + planning
  planning: ['plan_ready', 'error', 'backlog'],     // NEW
  plan_ready: ['queued', 'running', 'backlog'],     // NEW — approve or reject
  queued: ['backlog', 'running'],
  running: ['paused', 'done', 'error', 'review'],
  paused: ['running', 'queued'],
  review: ['done', 'error', 'running'],             // + running (re-execute after QA issues)
  done: [],
  error: ['queued', 'backlog', 'planning'],         // + planning (retry plan)
};
```

**Acceptance Criteria**:
- [ ] New statuses defined in type system
- [ ] Status mapping functions updated (Hub ↔ local)
- [ ] Valid transitions include new statuses
- [ ] Existing tests still pass
- [ ] Passes lint, typecheck, build

---

### Task 1.3: Progress Watcher Enhancements

**Purpose**: Enhance the existing progress watcher to support per-task JSONL files and emit granular events for table row updates.

**Files to Modify**:
- `src/main/services/workflow/progress-watcher.ts`

**Files to Read**:
- Current progress watcher implementation
- `C:\Users\Parke\.claude\plugins\cache\claude-workflow-marketplace\claude-workflow\1.0.0\prompts\implementing-features\PROGRESS-FILE-TEMPLATE.md`

**Specification**:

Current watcher monitors a single directory. Enhance to:
1. Watch `.claude/progress/*.jsonl` for all active task progress files
2. On file change, parse new lines (tail approach — track last read position)
3. Emit typed IPC events per progress entry:
   - `event:agent.toolUse` → `{ taskId, tool, timestamp }`
   - `event:agent.phaseChange` → `{ taskId, phase, phaseIndex, totalPhases }`
   - `event:agent.planReady` → `{ taskId, planSummary }`
   - `event:agent.stopped` → `{ taskId, reason, exitCode }`
   - `event:agent.error` → `{ taskId, error }`
   - `event:agent.heartbeat` → `{ taskId, timestamp }` (emitted on any activity)
4. Debounce file change events (100ms) to batch rapid writes

**Acceptance Criteria**:
- [ ] Watches per-task JSONL files
- [ ] Parses incremental lines (no re-reading entire file)
- [ ] Emits typed IPC events for each progress entry type
- [ ] Debounces rapid file changes
- [ ] Handles file creation (new task starts) and deletion (cleanup)
- [ ] Passes lint, typecheck, build

---

### Task 1.4: Agent Orchestrator IPC Handlers

**Purpose**: Expose agent orchestration to the renderer via IPC.

**Files to Create**:
- `src/main/ipc/handlers/agent-orchestrator-handlers.ts`

**Files to Modify**:
- `src/shared/ipc-contract.ts` — Add new channels
- `src/main/ipc/index.ts` — Register new handlers

**New IPC Channels**:
```typescript
'agent.startPlanning': {
  input: { taskId: string; projectPath: string; taskDescription: string; subProjectPath?: string }
  output: { sessionId: string; status: 'spawned' }
}

'agent.startExecution': {
  input: { taskId: string; projectPath: string; planRef?: string; taskDescription: string; subProjectPath?: string }
  output: { sessionId: string; status: 'spawned' }
}

'agent.kill': {
  input: { sessionId: string }
  output: { success: boolean }
}

'agent.restartFromCheckpoint': {
  input: { taskId: string; projectPath: string }
  output: { sessionId: string; status: 'spawned' }
}

'agent.getSession': {
  input: { taskId: string }
  output: AgentSession | null
}

'agent.listSessions': {
  input: {}
  output: AgentSession[]
}
```

**New IPC Events** (emitted by progress watcher + orchestrator):
```typescript
'event:agent.progress':    { taskId, type, data, timestamp }
'event:agent.planReady':   { taskId, planSummary, planFilePath }
'event:agent.stopped':     { taskId, reason, exitCode }
'event:agent.error':       { taskId, error }
'event:agent.heartbeat':   { taskId, timestamp }
```

**Handler implementation**:

`agent.startPlanning`:
1. Validate task exists (Hub API)
2. Update task status → `planning` (Hub API)
3. Call `orchestrator.spawn({ taskId, projectPath, prompt: '/create-feature-plan {desc}', phase: 'planning' })`
4. Return session info

`agent.startExecution`:
1. Validate task exists
2. Update task status → `queued` → `running`
3. Call `orchestrator.spawn({ taskId, projectPath, prompt: '/implement-feature {desc|planRef}', phase: 'executing' })`
4. Return session info

`agent.restartFromCheckpoint`:
1. Kill existing session if alive
2. Read progress JSONL for completed steps
3. Read plan file if exists
4. Compose resume prompt (original task + plan + progress + resume instructions)
5. Spawn new agent with composite prompt
6. Update task status → previous phase status

**Acceptance Criteria**:
- [ ] All channels defined in ipc-contract.ts with Zod schemas
- [ ] Handlers registered in ipc/index.ts
- [ ] startPlanning updates task status and spawns agent
- [ ] startExecution updates task status and spawns agent
- [ ] restartFromCheckpoint composes resume prompt from progress file
- [ ] kill terminates agent process
- [ ] Passes lint, typecheck, build

---

## Phase 2: Task Board Integration

> Wire the spawn infrastructure into the AG-Grid table. The table row is the live status view.

### Task 2.1: Status Cell Renderer Updates

**Purpose**: Update `StatusBadgeCell` to render the new statuses with distinct visual treatments.

**Files to Modify**:
- `src/renderer/features/tasks/components/cells/StatusBadgeCell.tsx`

**Specification**:

New status visual treatments:
| Status | Color | Style |
|--------|-------|-------|
| `planning` | Blue | Pulsing dot + "Planning..." text |
| `plan_ready` | Amber | Solid dot + "Plan Ready" text |

These follow the existing pattern of the cell renderer — just adding two new cases to the status→color mapping and the status→label mapping.

**Acceptance Criteria**:
- [ ] `planning` shows blue pulsing badge
- [ ] `plan_ready` shows amber solid badge
- [ ] Existing statuses unchanged
- [ ] Passes lint, typecheck, build

---

### Task 2.2: Actions Cell — Planning & Execution Buttons

**Purpose**: Add "Start Planning" and "Implement Feature" actions to the task row's ActionsCell.

**Files to Modify**:
- `src/renderer/features/tasks/components/cells/ActionsCell.tsx`

**Files to Create**:
- `src/renderer/features/tasks/api/useAgentMutations.ts`

**Specification**:

New actions in ActionsCell dropdown (or inline buttons depending on space):

| Task Status | Available Actions |
|------------|-------------------|
| `backlog` | Start Planning, Implement Feature, Delete |
| `planning` | View Progress, Kill Agent |
| `plan_ready` | Approve & Execute, View Plan, Reject (→ backlog), Delete |
| `queued` | Cancel |
| `running` | View Progress, Kill Agent |
| `paused` | Resume, Kill Agent |
| `review` | View QA Report, Re-execute |
| `done` | View Result, Delete |
| `error` | Restart from Checkpoint, Restart Fresh, View Logs, Delete |

**useAgentMutations.ts**:
```typescript
export function useStartPlanning() {
  return useMutation({
    mutationFn: (input: { taskId: string; projectPath: string; taskDescription: string }) =>
      ipc('agent.startPlanning', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
  });
}

export function useStartExecution() { /* similar */ }
export function useKillAgent() { /* similar */ }
export function useRestartFromCheckpoint() { /* similar */ }
```

**UX details**:
- "Start Planning" click → action fires immediately → modal closes if open → table row updates to "Planning" status
- "Implement Feature" click → action fires immediately → row updates to "Running"
- No confirmation modal for start actions (low risk, reversible via kill)
- Kill and Delete still use ConfirmDialog

**Acceptance Criteria**:
- [ ] Actions dynamically change based on task status
- [ ] "Start Planning" calls `agent.startPlanning` IPC and row updates immediately
- [ ] "Implement Feature" calls `agent.startExecution` IPC
- [ ] "Restart from Checkpoint" available on error status
- [ ] "Kill Agent" available during planning/running
- [ ] No modal stays open after action — table is the live view
- [ ] Passes lint, typecheck, build

---

### Task 2.3: Agent Events → Table Row Updates

**Purpose**: Bridge agent IPC events to React Query cache invalidation so table rows update in real-time.

**Files to Create**:
- `src/renderer/features/tasks/hooks/useAgentEvents.ts`

**Files to Modify**:
- `src/renderer/features/tasks/hooks/useTaskEvents.ts` — Import and call useAgentEvents

**Specification**:

```typescript
export function useAgentEvents() {
  const queryClient = useQueryClient();

  // Agent progress → optimistic update on task row
  useIpcEvent('event:agent.progress', (data) => {
    // Update task's progress field in cache (no refetch)
    queryClient.setQueryData(taskKeys.detail(data.taskId), (old) => ({
      ...old,
      agentProgress: data,
    }));
  });

  // Agent heartbeat → update last activity timestamp
  useIpcEvent('event:agent.heartbeat', (data) => {
    queryClient.setQueryData(taskKeys.detail(data.taskId), (old) => ({
      ...old,
      lastAgentActivity: data.timestamp,
    }));
  });

  // Plan ready → invalidate to get new status
  useIpcEvent('event:agent.planReady', (data) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.taskId) });
  });

  // Agent stopped → full invalidation
  useIpcEvent('event:agent.stopped', () => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  // Agent error → full invalidation
  useIpcEvent('event:agent.error', () => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });
}
```

**Acceptance Criteria**:
- [ ] Table rows update in real-time as agent works (progress, status changes)
- [ ] No polling — event-driven only
- [ ] Optimistic updates for progress (no flicker)
- [ ] Full invalidation for status transitions
- [ ] Passes lint, typecheck, build

---

### Task 2.4: Detail Row — Plan Viewer Tab

**Purpose**: When a task has a plan (status `plan_ready` or later), show the plan content in the expanded detail row.

**Files to Create**:
- `src/renderer/features/tasks/components/detail/PlanViewer.tsx`

**Files to Modify**:
- `src/renderer/features/tasks/components/detail/TaskDetailRow.tsx` (or equivalent master/detail container)

**Specification**:

New tab in the detail row tab bar: `[Execution Log] [Plan] [QA Report] [PR Status]`

PlanViewer shows:
- Plan content rendered as Markdown (use existing markdown renderer if available, or simple `<pre>`)
- "Approve & Execute" button (calls `agent.startExecution`)
- "Reject" button (sets status → `backlog`)
- Plan metadata: created timestamp, agent session ID, file count

Plan content source: Read from `.claude/progress/{taskId}-plan.md` (agent writes plan to this file) or from Hub API if synced.

**Acceptance Criteria**:
- [ ] Plan tab appears in detail row when plan exists
- [ ] Markdown content rendered readably
- [ ] "Approve & Execute" transitions to running
- [ ] "Reject" transitions to backlog
- [ ] Tab hidden when no plan exists
- [ ] Passes lint, typecheck, build

---

## Phase 3: Agent Watchdog

> Health monitoring and crash recovery for active agents.

### Task 3.1: Watchdog Service

**Purpose**: Monitor all active agent sessions for health issues — stale progress, process death, auth failure.

**Files to Create**:
- `src/main/services/agent-orchestrator/agent-watchdog.ts`

**Specification**:

```typescript
interface WatchdogConfig {
  checkIntervalMs: number;       // default: 30_000 (30s)
  warnAfterMs: number;           // default: 300_000 (5 min no progress)
  staleAfterMs: number;          // default: 900_000 (15 min no progress)
  hubHealthCheckMs: number;      // default: 60_000 (1 min)
}

interface AgentWatchdog {
  start(): void;
  stop(): void;
  checkNow(): Promise<WatchdogReport[]>;
  onAlert(handler: (alert: WatchdogAlert) => void): void;
}

interface WatchdogAlert {
  type: 'warning' | 'stale' | 'dead' | 'auth_failed';
  sessionId: string;
  taskId: string;
  message: string;
  suggestedAction: 'restart_checkpoint' | 'restart_fresh' | 'mark_error' | 'retry_auth';
  timestamp: string;
}
```

**Check loop (every 30 seconds)**:
```
For each active session in orchestrator.listActiveSessions():
  1. Process alive? → kill(pid, 0) or check exit event received
     - Dead → emit 'dead' alert, update session status
  2. Last heartbeat age?
     - > 5 min → emit 'warning' alert
     - > 15 min → emit 'stale' alert, suggest restart
  3. Hub API reachable? (periodic, not every loop)
     - Unreachable → emit 'auth_failed' alert
```

**Alert routing**:
- Alerts emitted via IPC → renderer shows on task row (warning/error badge)
- Alerts also sent to assistant (if watches exist for this task)
- Alerts stored in watchdog report log for debugging

**Auto-recovery (configurable, default off)**:
- On context overflow exit (exit code 2): auto-restart from checkpoint
- On stale timeout: kill and mark error (don't auto-restart — could loop)

**Acceptance Criteria**:
- [ ] Monitors all active agent sessions every 30s
- [ ] Detects dead processes via exit event and PID check
- [ ] Detects stale agents via heartbeat age
- [ ] Emits typed alerts with suggested actions
- [ ] Alerts route to IPC (for table row badges)
- [ ] Configurable thresholds
- [ ] Clean shutdown on app close
- [ ] Passes lint, typecheck, build

---

### Task 3.2: Watchdog Alerts on Task Row

**Purpose**: Show watchdog alerts as visual indicators on the task row.

**Files to Modify**:
- `src/renderer/features/tasks/components/cells/StatusBadgeCell.tsx` — Add warning/stale sub-states
- `src/renderer/features/tasks/hooks/useAgentEvents.ts` — Subscribe to watchdog alerts

**Files to Create**:
- `src/renderer/features/tasks/components/cells/WatchdogDropdown.tsx`

**Specification**:

When a watchdog alert fires for a task:
- StatusBadgeCell shows a warning icon overlay (amber triangle for warning, red for stale/dead)
- Clicking the warning icon opens a dropdown:
  ```
  ⚠ Agent stalled (no activity for 8 min)
  ─────────────────────────────────
  ▶ Restart from checkpoint
  ▶ Restart from scratch
  ▶ View logs
  ▶ Mark as error
  ```
- Each action calls the appropriate IPC channel

**Acceptance Criteria**:
- [ ] Warning overlay appears on task status badge when alert received
- [ ] Dropdown shows alert message and available actions
- [ ] Actions call correct IPC channels (restartFromCheckpoint, kill, etc.)
- [ ] Warning clears when agent resumes activity
- [ ] Passes lint, typecheck, build

---

## Phase 4: Automated QA System

> Two-tier QA: quiet (automatic, background) and full (user-initiated, interactive).

### Task 4.1: QA Runner Service

**Purpose**: Orchestrates QA sessions — builds the app, launches with MCP debug port, runs the QA agent, collects results.

**Files to Create**:
- `src/main/services/qa/qa-runner.ts`
- `src/main/services/qa/qa-types.ts`
- `src/main/services/qa/qa-report-parser.ts`

**Specification**:

```typescript
// qa-types.ts
type QaMode = 'quiet' | 'full';

interface QaSession {
  id: string;
  taskId: string;
  mode: QaMode;
  status: 'building' | 'launching' | 'testing' | 'completed' | 'error';
  startedAt: string;
  completedAt?: string;
  report?: QaReport;
  screenshots: string[];       // file paths to screenshots
  agentSessionId?: string;     // links to agent orchestrator session
}

interface QaReport {
  result: 'pass' | 'fail' | 'warnings';
  checksRun: number;
  checksPassed: number;
  issues: QaIssue[];
  verificationSuite: {
    lint: 'pass' | 'fail';
    typecheck: 'pass' | 'fail';
    test: 'pass' | 'fail';
    build: 'pass' | 'fail';
    docs: 'pass' | 'fail';
  };
  screenshots: QaScreenshot[];
  duration: number;            // ms
}

interface QaIssue {
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  category: string;            // 'console_error', 'visual_regression', 'interaction_failure', etc.
  description: string;
  screenshot?: string;
  location?: string;           // page/component where found
}

interface QaScreenshot {
  label: string;
  path: string;
  timestamp: string;
  annotated: boolean;
}

interface QaRunner {
  startQuiet(taskId: string, context: QaContext): Promise<QaSession>;
  startFull(taskId: string, context: QaContext): Promise<QaSession>;
  getSession(sessionId: string): QaSession | undefined;
  getReportForTask(taskId: string): QaReport | undefined;
  cancel(sessionId: string): void;
}

interface QaContext {
  projectPath: string;
  changedFiles: string[];      // from progress JSONL
  taskDescription: string;
  planContent?: string;
}
```

**Quiet QA flow**:
1. Build app: `npm run build` (in project directory)
2. Launch app with MCP: `npm run dev:mcp` (enables port 9222)
3. Wait for app ready (poll port 9222 or check stdout for ready signal)
4. Spawn QA agent (headless Claude) with:
   - Quinn QA agent prompt (`.claude/agents/qa-tester.md`)
   - Task context (description, changed files, plan)
   - MCP Electron tool instructions
   - Directive: "Run quiet QA — check console, take screenshots of affected pages, run verification suite, report findings"
5. Collect output → parse into QaReport
6. Kill the test app instance
7. Store report + screenshots
8. Emit IPC event: `event:qa.completed`

**Full QA flow**:
1. Same as quiet steps 1-3
2. Launch app in **foreground** (visible window)
3. Spawn QA agent with:
   - Full QA directive: "Walk through every page, test interactions, check accessibility, monitor DevTools, take annotated screenshots"
   - Longer timeout (10 min vs 2 min for quiet)
4. Agent uses MCP tools to interact visually with the app
5. Same collection/reporting flow

**Acceptance Criteria**:
- [ ] Quiet QA builds, launches, tests, and reports without user interaction
- [ ] Full QA runs in foreground with user-visible app
- [ ] Reports parsed into structured QaReport
- [ ] Screenshots saved to `.claude/qa/{taskId}/` directory
- [ ] Sessions tracked with status updates
- [ ] Cancel support for long-running sessions
- [ ] Passes lint, typecheck, build

---

### Task 4.2: QA Auto-Trigger on Review Status

**Purpose**: Automatically start quiet QA when a task transitions to "review" status.

**Files to Modify**:
- `src/main/services/agent-orchestrator/agent-watchdog.ts` — or create a separate status listener

**Files to Create**:
- `src/main/services/qa/qa-trigger.ts`

**Specification**:

```typescript
// qa-trigger.ts
// Listens for task status changes via Hub WebSocket events
// When any task transitions to 'review':
//   1. Look up task context (description, project, changed files from progress)
//   2. Call qaRunner.startQuiet(taskId, context)
//   3. Task row shows "QA Running" indicator

function createQaTrigger(deps: {
  qaRunner: QaRunner;
  orchestrator: AgentOrchestrator;
  router: IpcRouter;
}): QaTrigger {
  // Subscribe to Hub WebSocket task status events
  // Filter for status === 'review'
  // Debounce (don't re-trigger if QA already running for this task)
  // Spawn quiet QA
}
```

**Guard conditions** (don't trigger QA if):
- QA session already running for this task
- Task was manually moved to review (no agent progress file) — still trigger, but with limited context
- Project path unknown — skip with warning

**Acceptance Criteria**:
- [ ] Quiet QA auto-starts when task status → review
- [ ] Does not re-trigger if QA already running
- [ ] Works for both agent-executed and manually-moved tasks
- [ ] Passes lint, typecheck, build

---

### Task 4.3: QA IPC Handlers & Events

**Purpose**: Expose QA to the renderer for manual trigger (Full QA) and report retrieval.

**Files to Create**:
- `src/main/ipc/handlers/qa-handlers.ts`

**Files to Modify**:
- `src/shared/ipc-contract.ts` — Add QA channels
- `src/main/ipc/index.ts` — Register handlers

**New IPC Channels**:
```typescript
'qa.startQuiet': {
  input: { taskId: string }
  output: { sessionId: string }
}

'qa.startFull': {
  input: { taskId: string }
  output: { sessionId: string }
}

'qa.getReport': {
  input: { taskId: string }
  output: QaReport | null
}

'qa.cancel': {
  input: { sessionId: string }
  output: { success: boolean }
}

// Events
'event:qa.started':   { taskId: string, mode: QaMode }
'event:qa.progress':  { taskId: string, step: string, total: number, current: number }
'event:qa.completed': { taskId: string, result: 'pass' | 'fail' | 'warnings', issueCount: number }
```

**Acceptance Criteria**:
- [ ] All channels defined in ipc-contract.ts
- [ ] Handlers registered
- [ ] Events emitted during QA lifecycle
- [ ] Passes lint, typecheck, build

---

### Task 4.4: Detail Row — QA Report Tab

**Purpose**: Show QA results in the task detail row.

**Files to Create**:
- `src/renderer/features/tasks/components/detail/QaReportViewer.tsx`
- `src/renderer/features/tasks/api/useQaMutations.ts`

**Files to Modify**:
- `src/renderer/features/tasks/components/detail/TaskDetailRow.tsx` — Add QA tab

**Specification**:

QA Report tab shows:
```
┌─────────────────────────────────────────────────┐
│ QA Report — Task #47                            │
│ Status: ✅ PASSED (12/12 checks)                │
│ Duration: 2m 14s                                │
├─────────────────────────────────────────────────┤
│ Verification Suite                              │
│ ✅ lint  ✅ typecheck  ✅ test  ✅ build  ✅ docs │
├─────────────────────────────────────────────────┤
│ Screenshots (click to expand)                   │
│ [thumb1] [thumb2] [thumb3] [thumb4]             │
├─────────────────────────────────────────────────┤
│ Issues (0 critical, 0 major, 1 minor)           │
│ ⚠ Minor: Button focus ring missing on Settings  │
├─────────────────────────────────────────────────┤
│ [Run Quiet QA] [Run Full QA]                    │
└─────────────────────────────────────────────────┘
```

- Screenshot thumbnails expandable to full size (modal or inline)
- Issues sorted by severity (critical first)
- Re-run buttons for manual QA trigger
- Full QA button shows confirmation notification first

**Acceptance Criteria**:
- [ ] QA tab appears when report exists for task
- [ ] Shows verification suite results (5 checks)
- [ ] Shows issue list with severity colors
- [ ] Screenshot gallery with expand
- [ ] Re-run buttons work
- [ ] Tab hidden when no QA report exists
- [ ] Passes lint, typecheck, build

---

## Phase 5: Assistant Voice Integration

> Wire existing voice infrastructure into the assistant widget.

### Task 5.1: Voice Input in Widget

**Purpose**: Add the existing VoiceButton component to WidgetInput so users can speak commands.

**Files to Modify**:
- `src/renderer/features/assistant/components/WidgetInput.tsx` — Add VoiceButton

**Files to Read**:
- `src/renderer/features/voice/components/VoiceButton.tsx` (existing, ready to use)
- `src/renderer/features/voice/hooks/useSpeechRecognition.ts` (existing)

**Specification**:

WidgetInput layout change:
```
Current:  [textarea                    ] [Send]
New:      [textarea                    ] [🎤] [Send]
```

- Mic button uses existing `VoiceButton` component (or inline `useSpeechRecognition`)
- `onTranscript` callback populates the textarea
- Interim results shown as placeholder text in textarea
- Final result replaces textarea content
- If voice config `inputMode === 'push_to_talk'`: click to start, click to stop
- If `inputMode === 'continuous'`: click to toggle (future)
- Mic button visual states: idle (gray), listening (red pulse), processing (blue)

**Acceptance Criteria**:
- [ ] Mic button visible in WidgetInput
- [ ] Click starts speech recognition
- [ ] Transcript populates textarea
- [ ] Interim results visible as preview
- [ ] Final result auto-sends (configurable) or waits for Send click
- [ ] Error states handled gracefully (no mic, permission denied)
- [ ] Passes lint, typecheck, build

---

### Task 5.2: Voice Output Toggle

**Purpose**: Add option for assistant to speak responses using existing speech synthesis.

**Files to Modify**:
- `src/renderer/features/assistant/components/WidgetPanel.tsx` — Add voice output toggle in header
- `src/renderer/features/assistant/components/WidgetMessageArea.tsx` — Trigger TTS on new responses
- `src/renderer/shared/stores/assistant-widget-store.ts` — Add `voiceOutputEnabled` state

**Files to Read**:
- `src/renderer/features/voice/hooks/useSpeechSynthesis.ts` (existing)

**Specification**:

Widget header gets a speaker icon toggle:
```
┌─ AI Assistant ─────────── [🔊] [🗑] [✕] ─┐
```

When `voiceOutputEnabled`:
- New assistant responses are spoken via `useSpeechSynthesis().speak(response.content)`
- Only `text` and `action` type responses are spoken (not `error`)
- Long responses truncated for TTS (first 200 chars + "see full response in chat")
- Speaking can be interrupted by clicking speaker icon or sending a new command

**Acceptance Criteria**:
- [ ] Speaker toggle in widget header
- [ ] Responses spoken when enabled
- [ ] Error responses not spoken
- [ ] Long responses truncated
- [ ] Interruptible
- [ ] Preference persisted in widget store
- [ ] Passes lint, typecheck, build

---

### Task 5.3: Voice Mode Abstraction

**Purpose**: Design the voice mode layer so push-to-talk, continuous, and wake-word can all plug in.

**Files to Create**:
- `src/renderer/features/assistant/hooks/useAssistantVoice.ts`

**Specification**:

```typescript
type VoiceMode = 'off' | 'push_to_talk' | 'continuous';

interface UseAssistantVoiceReturn {
  mode: VoiceMode;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  setMode: (mode: VoiceMode) => void;
}
```

This hook wraps `useSpeechRecognition` and adds:
- Mode switching (reads from voice config store)
- Auto-send on silence (configurable delay, default 1.5s of silence after speech)
- Wake word stripping (future: when continuous mode, strip "Hey Claude" prefix)
- Transcript → assistant command pipeline
- Cleanup on unmount

AssistantWidget uses this hook instead of raw VoiceButton. This is the abstraction that allows adding wake word detection later without changing the widget.

**Acceptance Criteria**:
- [ ] Hook encapsulates all voice logic
- [ ] Push-to-talk mode works (manual start/stop)
- [ ] Mode stored in config, persisted across sessions
- [ ] Auto-send on silence detection
- [ ] Clean abstraction for future continuous/wake-word modes
- [ ] Passes lint, typecheck, build

---

## Phase 6: Assistant Watches & Cross-Device

> Persistent subscriptions, proactive notifications, and cross-device queries.

### Task 6.1: Watch Store & Evaluator

**Purpose**: Persistent watch/subscription system — "tell me when task 123 is done."

**Files to Create**:
- `src/main/services/assistant/watch-store.ts`
- `src/main/services/assistant/watch-evaluator.ts`
- `src/shared/types/assistant-watch.ts`

**Specification**:

```typescript
// assistant-watch.ts
interface AssistantWatch {
  id: string;
  type: 'task_status' | 'task_completed' | 'agent_error' | 'qa_result' | 'device_status';
  targetId: string;
  condition: {
    field: string;             // 'status', 'qaResult', 'isOnline'
    operator: 'equals' | 'changes' | 'any';
    value?: string;
  };
  action: 'notify' | 'speak' | 'notify_and_speak';
  followUp?: string;           // natural language follow-up
  createdAt: string;
  triggered: boolean;
  expiresAt?: string;
}

// watch-store.ts — persists watches to disk
interface WatchStore {
  add(watch: Omit<AssistantWatch, 'id' | 'createdAt' | 'triggered'>): AssistantWatch;
  remove(id: string): void;
  getActive(): AssistantWatch[];
  markTriggered(id: string): void;
  clear(): void;
}

// watch-evaluator.ts — checks incoming events against active watches
interface WatchEvaluator {
  start(): void;             // subscribe to Hub WebSocket events
  stop(): void;
  onTrigger(handler: (watch: AssistantWatch, eventData: unknown) => void): void;
}
```

**Watch evaluation flow**:
1. Hub WebSocket event arrives (task update, device heartbeat, etc.)
2. WatchEvaluator checks all active watches against event
3. If match → mark watch as triggered → emit trigger event
4. Trigger event → assistant sends notification:
   - Widget: adds proactive message to response history ("Task 123 is done!")
   - Voice (if enabled): speaks the notification
   - If followUp exists: appends "You said: '{followUp}'"
5. One-shot watches (default) auto-deactivate after triggering

**Persistence**: Watches stored as JSON file in `userData/assistant-watches.json`. Loaded on app start.

**Acceptance Criteria**:
- [ ] Watches persist across app restarts
- [ ] Task status changes trigger matching watches
- [ ] Device status changes trigger matching watches
- [ ] Triggered watches send notification to assistant widget
- [ ] One-shot watches deactivate after firing
- [ ] Follow-up text included in notification
- [ ] Passes lint, typecheck, build

---

### Task 6.2: Intent Classifier — Watch Commands

**Purpose**: Teach the intent classifier to recognize watch/subscription commands.

**Files to Modify**:
- `src/main/services/assistant/intent-classifier.ts` — Add regex patterns for watch commands
- `src/main/services/assistant/command-executor.ts` — Add watch creation handler

**Specification**:

New regex patterns for intent-classifier.ts:
```typescript
// Watch creation patterns
/(?:tell|notify|alert|update|let)\s+me\s+(?:know|when)/i     → type: 'watch', subtype: 'create'
/(?:remind|ping)\s+me\s+(?:when|if)/i                         → type: 'watch', subtype: 'create'
/(?:watch|monitor)\s+task\s+/i                                 → type: 'watch', subtype: 'create'

// Watch management
/(?:stop|cancel|remove)\s+(?:watch|notification|alert)/i       → type: 'watch', subtype: 'remove'
/(?:list|show)\s+(?:my\s+)?(?:watches|notifications|alerts)/i  → type: 'watch', subtype: 'list'
```

New command-executor handler:
- Parse target task ID from command text (regex: `task\s+#?(\d+)` or `task\s+"([^"]+)"`)
- Parse condition from text ("is done" → status equals done, "fails" → status equals error)
- Parse follow-up from text (text after comma or "and then" / "and I'll")
- Create watch via watchStore.add()
- Return confirmation: "Got it. I'll notify you when task #123 is done."

**Acceptance Criteria**:
- [ ] "Tell me when task 123 is done" creates a watch
- [ ] "Notify me if the agent on task 45 fails" creates error watch
- [ ] "Stop watching task 123" removes the watch
- [ ] "What am I watching?" lists active watches
- [ ] Follow-up text captured: "tell me when done, and I'll give you the next task"
- [ ] Passes lint, typecheck, build

---

### Task 6.3: Cross-Device Queries

**Purpose**: Let the assistant answer questions about other Claude-UI instances via Hub API.

**Files to Create**:
- `src/main/services/assistant/cross-device-query.ts`

**Files to Modify**:
- `src/main/services/assistant/intent-classifier.ts` — Add device query patterns
- `src/main/services/assistant/command-executor.ts` — Add device query handler

**Specification**:

New intent patterns:
```typescript
/(?:what(?:'s| is))\s+(?:running|happening)\s+on\s+(?:my\s+)?(\w+)/i  → type: 'device_query'
/(?:show|list)\s+(?:my\s+)?devices/i                                    → type: 'device_query'
/(?:status|state)\s+(?:of\s+)?(?:all\s+)?devices/i                      → type: 'device_query'
```

Cross-device query handler:
```typescript
async function handleDeviceQuery(query: string, context: AssistantContext): Promise<AssistantResponse> {
  // 1. Fetch devices from Hub API
  const devices = await hubApiClient.get('/devices');

  // 2. For each device, get running tasks
  const deviceTasks = await Promise.all(
    devices.map(d => hubApiClient.get(`/devices/${d.id}/tasks`))
  );

  // 3. Handle device states
  //    - online: show tasks, agent status
  //    - offline: show "last seen X minutes ago"
  //    - sleeping: show "device sleeping, last seen X"
  //    - unreachable: show "unreachable since X"

  // 4. Format response
  return {
    type: 'text',
    content: formatDeviceStatusReport(devices, deviceTasks),
  };
}
```

**Device state detection**:
| State | How Detected | Display |
|-------|-------------|---------|
| Online | Heartbeat < 2 min ago | Green dot, active tasks listed |
| Sleeping | Heartbeat 2-30 min ago, was online | Amber dot, "sleeping since X" |
| Offline | Heartbeat > 30 min ago | Gray dot, "last seen X ago" |
| Unreachable | Heartbeat exists but Hub connection lost | Red dot, "unreachable" |

**Full data access**: The assistant can query Hub API for any data — task details, progress logs, QA reports, plan content. If a device is offline, Hub still has the last-synced data.

**Future note (not implemented now)**: Local Hub server option where Hub runs on a NAS/home server, making all data always available regardless of which device is on.

**Acceptance Criteria**:
- [ ] "What's running on my MacBook?" returns device status + tasks
- [ ] "Show my devices" lists all registered devices with states
- [ ] Offline/sleeping/unreachable devices handled gracefully
- [ ] Task details from other devices accessible
- [ ] Passes lint, typecheck, build

---

### Task 6.4: Proactive Notifications in Widget

**Purpose**: Allow the assistant to push messages to the widget without user prompt (watch triggers, QA results, agent events).

**Files to Modify**:
- `src/renderer/features/assistant/store.ts` — Proactive message support
- `src/renderer/features/assistant/hooks/useAssistantEvents.ts` — Subscribe to proactive events
- `src/renderer/features/assistant/components/WidgetMessageArea.tsx` — Render proactive messages differently

**Specification**:

New response entry type:
```typescript
interface ResponseEntry {
  id: string;
  input: string;
  response: string;
  type: 'text' | 'action' | 'error' | 'proactive';  // + proactive
  intent?: IntentType;
  timestamp: string;
  source?: 'user' | 'watch' | 'qa' | 'agent';        // + source field
}
```

Proactive messages:
- Appear in message area with a distinct visual (info/primary background, bell icon)
- No associated user input (input field empty or "System notification")
- Increment unread count when widget is closed
- If voice output enabled, spoken aloud
- If follow-up exists, shown as actionable prompt

New IPC event:
```typescript
'event:assistant.proactive': {
  payload: {
    content: string;
    source: 'watch' | 'qa' | 'agent';
    taskId?: string;
    followUp?: string;
  }
}
```

**Acceptance Criteria**:
- [ ] Proactive messages appear in widget without user prompt
- [ ] Distinct visual styling (bell icon, info background)
- [ ] Unread count increments when widget closed
- [ ] Voice output for proactive messages (if enabled)
- [ ] Follow-up text shown as actionable prompt
- [ ] Passes lint, typecheck, build

---

## Dependency Graph

```
Phase 1 (Foundation)                    Phase 5 (Voice)
─────────────────                       ──────────────
1.1 Agent Orchestrator ─────┐           5.1 Voice Input
1.2 Extended Statuses ──────┤           5.2 Voice Output
1.3 Progress Watcher ───────┤           5.3 Voice Abstraction
1.4 IPC Handlers ───────────┤
                            │
Phase 2 (Task Board)        │           Phase 6 (Watches)
────────────────            │           ─────────────────
2.1 Status Cell ◄───── 1.2  │           6.1 Watch Store ◄──── 5.2 (voice notify)
2.2 Actions Cell ◄──── 1.4  │           6.2 Watch Intents
2.3 Agent Events ◄──── 1.3  │           6.3 Cross-Device
2.4 Plan Viewer ◄───── 1.4  │           6.4 Proactive Notifs ◄── 6.1
                            │
Phase 3 (Watchdog)          │
──────────────              │
3.1 Watchdog Service ◄─ 1.1 │
3.2 Watchdog UI ◄───── 3.1  │
                            │
Phase 4 (QA)                │
────────                    │
4.1 QA Runner ◄──────── 1.1 │
4.2 QA Auto-Trigger ◄── 4.1 │
4.3 QA IPC ◄─────────── 4.1 │
4.4 QA Report Tab ◄──── 4.3 │
```

**Parallel opportunities**:
- Phase 1 must complete first (foundation)
- Phase 2 + Phase 3 can run in parallel (different files)
- Phase 4 can run in parallel with Phase 2/3 (different domain)
- Phase 5 is fully independent (no deps on Phase 1-4)
- Phase 6 depends on Phase 5 partially (voice notify) but can start early

**Suggested wave execution**:

| Wave | Phases | Tasks |
|------|--------|-------|
| 1 | Phase 1 + Phase 5 | Foundation infra + voice wiring (parallel, no shared files) |
| 2 | Phase 2 + Phase 3 | Task board UI + watchdog (parallel) |
| 3 | Phase 4 | QA system |
| 4 | Phase 6 | Watches + cross-device + proactive |
| 5 | Polish | Integration testing, docs, edge cases |

---

## New File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `src/main/services/agent-orchestrator/agent-orchestrator.ts` | 1.1 | Agent lifecycle management |
| 2 | `src/main/services/agent-orchestrator/hooks-template.ts` | 1.1 | Claude hooks config generator |
| 3 | `src/main/services/agent-orchestrator/types.ts` | 1.1 | Agent session types |
| 4 | `src/main/ipc/handlers/agent-orchestrator-handlers.ts` | 1.4 | IPC handlers for agent ops |
| 5 | `src/renderer/features/tasks/api/useAgentMutations.ts` | 2.2 | React Query mutations for agent actions |
| 6 | `src/renderer/features/tasks/hooks/useAgentEvents.ts` | 2.3 | Agent event → cache invalidation bridge |
| 7 | `src/renderer/features/tasks/components/detail/PlanViewer.tsx` | 2.4 | Plan content display in detail row |
| 8 | `src/main/services/agent-orchestrator/agent-watchdog.ts` | 3.1 | Health monitoring service |
| 9 | `src/renderer/features/tasks/components/cells/WatchdogDropdown.tsx` | 3.2 | Alert action dropdown on task row |
| 10 | `src/main/services/qa/qa-runner.ts` | 4.1 | QA session orchestrator |
| 11 | `src/main/services/qa/qa-types.ts` | 4.1 | QA domain types |
| 12 | `src/main/services/qa/qa-report-parser.ts` | 4.1 | Parse agent output → structured report |
| 13 | `src/main/services/qa/qa-trigger.ts` | 4.2 | Auto-trigger on review status |
| 14 | `src/main/ipc/handlers/qa-handlers.ts` | 4.3 | IPC handlers for QA ops |
| 15 | `src/renderer/features/tasks/api/useQaMutations.ts` | 4.4 | React Query mutations for QA |
| 16 | `src/renderer/features/tasks/components/detail/QaReportViewer.tsx` | 4.4 | QA report display in detail row |
| 17 | `src/renderer/features/assistant/hooks/useAssistantVoice.ts` | 5.3 | Voice mode abstraction hook |
| 18 | `src/main/services/assistant/watch-store.ts` | 6.1 | Persistent watch storage |
| 19 | `src/main/services/assistant/watch-evaluator.ts` | 6.1 | Event → watch matching |
| 20 | `src/shared/types/assistant-watch.ts` | 6.1 | Watch types |
| 21 | `src/main/services/assistant/cross-device-query.ts` | 6.3 | Hub API queries for other devices |

**Total: 21 new files**

---

## Modified File Inventory

| # | File | Phase | Change |
|---|------|-------|--------|
| 1 | `src/shared/ipc-contract.ts` | 1.4, 4.3 | Add agent + QA channels and events |
| 2 | `src/shared/types/hub-protocol.ts` | 1.2 | Add `planning`, `plan_ready` statuses |
| 3 | `src/shared/types/task.ts` | 1.2 | Add new statuses to local enum |
| 4 | `src/main/ipc/handlers/task-handlers.ts` | 1.2 | Update status mapping functions |
| 5 | `src/main/ipc/index.ts` | 1.4, 4.3 | Register new handler files |
| 6 | `src/main/services/workflow/progress-watcher.ts` | 1.3 | Per-task JSONL + granular events |
| 7 | `src/renderer/features/tasks/components/cells/StatusBadgeCell.tsx` | 2.1, 3.2 | New status colors + warning overlay |
| 8 | `src/renderer/features/tasks/components/cells/ActionsCell.tsx` | 2.2 | Planning/execution/watchdog actions |
| 9 | `src/renderer/features/tasks/hooks/useTaskEvents.ts` | 2.3 | Import useAgentEvents |
| 10 | `src/renderer/features/tasks/components/detail/TaskDetailRow.tsx` | 2.4, 4.4 | Add Plan + QA tabs |
| 11 | `src/renderer/features/assistant/components/WidgetInput.tsx` | 5.1 | Add mic button |
| 12 | `src/renderer/features/assistant/components/WidgetPanel.tsx` | 5.2 | Add voice output toggle |
| 13 | `src/renderer/features/assistant/components/WidgetMessageArea.tsx` | 5.2, 6.4 | TTS trigger + proactive message styling |
| 14 | `src/renderer/shared/stores/assistant-widget-store.ts` | 5.2 | Add voiceOutputEnabled |
| 15 | `src/main/services/assistant/intent-classifier.ts` | 6.2, 6.3 | Watch + device query patterns |
| 16 | `src/main/services/assistant/command-executor.ts` | 6.2, 6.3 | Watch + device query handlers |
| 17 | `src/renderer/features/assistant/store.ts` | 6.4 | Proactive message type + source field |
| 18 | `src/renderer/features/assistant/hooks/useAssistantEvents.ts` | 6.4 | Subscribe to proactive events |
| 19 | `src/shared/types/assistant.ts` | 6.2 | Add watch-related intent/action types |

**Total: 19 modified files**

---

## New IPC Channels

### Request/Response (8 new)

| Channel | Input | Output | Phase |
|---------|-------|--------|-------|
| `agent.startPlanning` | `{ taskId, projectPath, taskDescription, subProjectPath? }` | `{ sessionId, status }` | 1.4 |
| `agent.startExecution` | `{ taskId, projectPath, planRef?, taskDescription, subProjectPath? }` | `{ sessionId, status }` | 1.4 |
| `agent.kill` | `{ sessionId }` | `{ success }` | 1.4 |
| `agent.restartFromCheckpoint` | `{ taskId, projectPath }` | `{ sessionId, status }` | 1.4 |
| `agent.getSession` | `{ taskId }` | `AgentSession \| null` | 1.4 |
| `agent.listSessions` | `{}` | `AgentSession[]` | 1.4 |
| `qa.startQuiet` | `{ taskId }` | `{ sessionId }` | 4.3 |
| `qa.startFull` | `{ taskId }` | `{ sessionId }` | 4.3 |
| `qa.getReport` | `{ taskId }` | `QaReport \| null` | 4.3 |
| `qa.cancel` | `{ sessionId }` | `{ success }` | 4.3 |

### Events (10 new)

| Event | Payload | Phase |
|-------|---------|-------|
| `event:agent.progress` | `{ taskId, type, data, timestamp }` | 1.3 |
| `event:agent.planReady` | `{ taskId, planSummary, planFilePath }` | 1.3 |
| `event:agent.stopped` | `{ taskId, reason, exitCode }` | 1.3 |
| `event:agent.error` | `{ taskId, error }` | 1.3 |
| `event:agent.heartbeat` | `{ taskId, timestamp }` | 1.3 |
| `event:qa.started` | `{ taskId, mode }` | 4.3 |
| `event:qa.progress` | `{ taskId, step, total, current }` | 4.3 |
| `event:qa.completed` | `{ taskId, result, issueCount }` | 4.3 |
| `event:agent.watchdogAlert` | `{ type, sessionId, taskId, message, suggestedAction }` | 3.1 |
| `event:assistant.proactive` | `{ content, source, taskId?, followUp? }` | 6.4 |

---

## New Types

### Agent Orchestrator Types (`src/main/services/agent-orchestrator/types.ts`)
- `AgentSession` — session tracking
- `SpawnOptions` — spawn configuration
- `AgentSessionEvent` — lifecycle events

### QA Types (`src/main/services/qa/qa-types.ts`)
- `QaMode` — 'quiet' | 'full'
- `QaSession` — QA session tracking
- `QaReport` — structured report
- `QaIssue` — individual issue
- `QaScreenshot` — annotated screenshot

### Watch Types (`src/shared/types/assistant-watch.ts`)
- `AssistantWatch` — persistent subscription
- `WatchCondition` — match criteria
- `WatchAction` — notification method

### Extended Status Types
- `HubTaskStatus` — add 'planning' | 'plan_ready'
- `TaskStatus` — corresponding local additions

---

## Test Gate

After ALL phases complete:
```bash
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All tests pass (add new tests for agent orchestrator, watchdog, QA runner, watch store)
npm run build        # Builds successfully
npm run check:docs   # Documentation updated
```

New test files needed:
- `tests/unit/services/agent-orchestrator.test.ts`
- `tests/unit/services/agent-watchdog.test.ts`
- `tests/unit/services/qa-runner.test.ts`
- `tests/unit/services/watch-store.test.ts`
- `tests/integration/ipc-handlers/agent-orchestrator-handlers.test.ts`
- `tests/integration/ipc-handlers/qa-handlers.test.ts`

---

## Phase 7: Device Nicknames & Cross-Device Polish

> Let users name their devices for natural assistant interaction.

### Clarification: Workspaces vs Devices

**Workspaces** are NOT device-specific. A workspace = a poly repo with a main repo and multiple child repos. When initialized, we detect the poly repo structure and treat child directories as independent git repos. This gives AI a full-stack view while keeping git worktrees repo-specific. The same workspace structure can exist on multiple devices.

**Devices** are the machines running Claude-UI. Each registers with Hub independently. Cross-device queries are scoped by device, not workspace.

### Task 7.1: Device Nickname

**Purpose**: Let users assign friendly names to their devices for natural assistant interaction. "Hey Claude, ask Larry how his tasks are going."

**Files to Modify**:
- `src/shared/types/hub-protocol.ts` — Add `nickname` field to Device type
- `src/main/services/device/device-service.ts` — Support nickname in registration/update
- `src/main/ipc/handlers/device-handlers.ts` — Expose nickname update
- `src/renderer/features/devices/` — Add nickname editing in device settings UI
- `src/main/services/assistant/cross-device-query.ts` — Resolve nicknames to device IDs

**Specification**:

Device type addition:
```typescript
interface Device {
  id: string;
  name: string;           // machine hostname (auto-detected)
  nickname?: string;       // user-assigned friendly name ("Larry", "Work PC", "Home Mac")
  platform: string;
  capabilities: string[];
  lastHeartbeat: string;
  // ...existing fields
}
```

Nickname resolution in assistant:
```typescript
// "Ask Larry how his tasks are going"
// → resolve "Larry" → deviceId
// → query Hub for device tasks

function resolveDeviceByNickname(nameOrNickname: string, devices: Device[]): Device | undefined {
  // 1. Exact nickname match (case-insensitive)
  const byNickname = devices.find(d =>
    d.nickname?.toLowerCase() === nameOrNickname.toLowerCase()
  );
  if (byNickname) return byNickname;

  // 2. Partial hostname match
  const byHostname = devices.find(d =>
    d.name.toLowerCase().includes(nameOrNickname.toLowerCase())
  );
  return byHostname;
}
```

Intent classifier addition:
```typescript
// "ask Larry..." or "check on Larry" or "how is Larry doing"
/(?:ask|check\s+on|how\s+is)\s+(\w+)/i → type: 'device_query', extract device name
```

**Acceptance Criteria**:
- [ ] Users can set a nickname for any registered device
- [ ] Nickname stored in Hub (syncs across all devices)
- [ ] Assistant resolves nicknames in voice/text commands
- [ ] "Ask Larry how his tasks are going" returns Larry's task status
- [ ] Fallback to hostname matching if no nickname match
- [ ] Passes lint, typecheck, build

---

## Phase 8: Assistant Full Feature Access

> Extend the assistant command executor to interact with ALL 29 features, not just 7.

### Task 8.1: Expand Intent Classifier

**Purpose**: Add regex patterns for all feature domains the assistant can't currently handle.

**Files to Modify**:
- `src/main/services/assistant/intent-classifier.ts`

**New patterns by domain**:

```typescript
// Fitness
/(?:log|add|record)\s+(?:a\s+)?(?:workout|exercise|run|walk|gym)/i → type: 'fitness', subtype: 'log'
/(?:my|show|get)\s+(?:workouts?|fitness|exercise)/i                → type: 'fitness', subtype: 'query'
/(?:my|show|get)\s+(?:weight|body|measurements?)/i                 → type: 'fitness', subtype: 'measurements'

// Calendar
/(?:what(?:'s| is))\s+on\s+my\s+calendar/i                        → type: 'calendar', subtype: 'query'
/(?:schedule|book|create)\s+(?:a\s+)?(?:meeting|event|block)/i     → type: 'calendar', subtype: 'create'

// Briefing
/(?:daily|morning)\s+(?:briefing|summary|update)/i                 → type: 'briefing', subtype: 'get'
/(?:brief|catch)\s+me\s+up/i                                       → type: 'briefing', subtype: 'get'

// Insights/Analytics
/(?:how\s+many|count|stats?|metrics?|analytics)/i                  → type: 'insights', subtype: 'query'
/(?:completion|success)\s+rate/i                                    → type: 'insights', subtype: 'query'

// Ideation
/(?:add|submit|propose)\s+(?:an?\s+)?idea/i                        → type: 'ideation', subtype: 'create'
/(?:show|list|get)\s+(?:my\s+)?ideas/i                              → type: 'ideation', subtype: 'query'

// Milestones
/(?:milestone|roadmap|deadline)/i                                   → type: 'milestones', subtype: 'query'
/(?:what(?:'s| is))\s+due/i                                         → type: 'milestones', subtype: 'query'

// Email
/(?:send|write|compose)\s+(?:an?\s+)?email/i                       → type: 'email', subtype: 'send'
/(?:check|show)\s+(?:email\s+)?queue/i                              → type: 'email', subtype: 'queue'

// GitHub
/(?:show|list|get)\s+(?:my\s+)?(?:pull\s+requests?|PRs?)/i         → type: 'github', subtype: 'prs'
/(?:show|list|get)\s+(?:my\s+)?(?:issues)/i                         → type: 'github', subtype: 'issues'
/(?:github|gh)\s+notifications?/i                                   → type: 'github', subtype: 'notifications'

// Planner (expanded)
/(?:what(?:'s| is))\s+(?:my\s+)?plan\s+(?:for\s+)?today/i          → type: 'planner', subtype: 'today'
/(?:weekly|week)\s+review/i                                         → type: 'planner', subtype: 'weekly'

// Notes (expanded)
/(?:find|search)\s+(?:my\s+)?notes?\s+(?:about|for|on)/i           → type: 'notes', subtype: 'search'
/(?:show|list|get)\s+(?:my\s+)?notes/i                              → type: 'notes', subtype: 'list'

// Changelog
/(?:generate|create)\s+changelog/i                                  → type: 'changelog', subtype: 'generate'

// Devices (expanded from Phase 7)
/(?:what|which)\s+devices?\s+(?:are\s+)?online/i                   → type: 'device_query', subtype: 'list'
```

**Acceptance Criteria**:
- [ ] All 29 feature domains reachable via natural language
- [ ] Existing patterns unchanged (no regressions)
- [ ] Confidence scores appropriate (direct service calls ≥ 0.85)
- [ ] Passes lint, typecheck, build

---

### Task 8.2: Expand Command Executor

**Purpose**: Add execution handlers for all newly classified intents.

**Files to Modify**:
- `src/main/services/assistant/command-executor.ts`

**Files to Read**:
- All service interfaces to understand available methods

**New Dependencies** (injected via `CommandExecutorDeps`):
```typescript
interface CommandExecutorDeps {
  // existing
  mcpManager: McpManager;
  notesService?: NotesService;
  alertService?: AlertService;
  spotifyService?: SpotifyService;
  taskService?: TaskService;
  plannerService?: PlannerService;
  // NEW
  fitnessService?: FitnessService;
  insightsService?: InsightsService;
  ideasService?: IdeasService;
  milestonesService?: MilestonesService;
  emailService?: EmailService;
  githubService?: GitHubService;
  calendarService?: CalendarService;
  changelogService?: ChangelogService;
  briefingService?: BriefingService;
  deviceService?: DeviceService;
}
```

**Handler implementations** (summary — each follows the existing pattern):

| Intent | Handler | Service Method |
|--------|---------|---------------|
| `fitness.log` | Parse workout type + duration from text | `fitnessService.logWorkout()` |
| `fitness.query` | Return recent workouts | `fitnessService.listWorkouts()` |
| `fitness.measurements` | Return latest measurements | `fitnessService.getMeasurements()` |
| `calendar.query` | Return today's events | `calendarService.listEvents()` |
| `calendar.create` | Parse time + title from text | `calendarService.createEvent()` |
| `briefing.get` | Return or generate daily briefing | `briefingService.getDaily()` |
| `insights.query` | Return metrics for active project | `insightsService.getMetrics()` |
| `ideation.create` | Parse idea title + category | `ideasService.create()` |
| `ideation.query` | Return ideas, optionally sorted by votes | `ideasService.list()` |
| `milestones.query` | Return milestones due soon | `milestonesService.list()` |
| `email.send` | Parse recipient + subject + body | `emailService.send()` |
| `email.queue` | Return queue status | `emailService.getQueue()` |
| `github.prs` | Return open PRs | `githubService.listPrs()` |
| `github.issues` | Return open issues | `githubService.listIssues()` |
| `github.notifications` | Return unread notifications | `githubService.getNotifications()` |
| `planner.today` | Return today's plan | `plannerService.getDay()` |
| `planner.weekly` | Return weekly review | `plannerService.getWeek()` |
| `notes.search` | Search notes by query | `notesService.searchNotes()` |
| `notes.list` | Return recent notes | `notesService.list()` |
| `changelog.generate` | Generate changelog | `changelogService.generateFromGit()` |

**Acceptance Criteria**:
- [ ] All new handlers return formatted AssistantResponse
- [ ] Graceful fallback when service unavailable (returns helpful error, not crash)
- [ ] Active project context used where applicable (insights, github, milestones, ideation)
- [ ] Passes lint, typecheck, build

---

### Task 8.3: Wire New Dependencies in Assistant Service

**Purpose**: Inject the new service dependencies into the assistant service and command executor.

**Files to Modify**:
- `src/main/services/assistant/assistant-service.ts` — Update `AssistantServiceDeps`
- `src/main/index.ts` — Pass new services to assistant service constructor

**Specification**:

In `index.ts`, where `createAssistantService` is called, add all the new service references that were created earlier in the initialization order. All these services already exist and are initialized before the assistant — just need to pass them through.

**Acceptance Criteria**:
- [ ] All new services injected into command executor
- [ ] No circular dependencies introduced
- [ ] Passes lint, typecheck, build

---

## Phase 9: Data Flow Wiring

> Connect agent orchestrator, QA, and watch outputs to existing app systems.

### Task 9.1: Agent Data → Insights

**Purpose**: Feed agent orchestrator metrics into the insights service.

**Files to Modify**:
- `src/main/services/insights/insights-service.ts` — Add agent metrics

**Specification**:

Insights service currently aggregates from `taskService`, `agentService`, `projectService`. Add:
- Agent sessions spawned (count from orchestrator)
- Agent success/failure rate
- Average agent run time
- QA pass/fail rates
- Total token cost (from progress JSONL)

New metrics:
```typescript
interface InsightMetrics {
  // existing fields...
  agentSessionsToday: number;
  agentSuccessRate: number;
  averageAgentDuration: number;
  qaPassRate: number;
  totalTokenCost: number;
}
```

**Acceptance Criteria**:
- [ ] Insights dashboard shows agent activity metrics
- [ ] QA pass/fail rates tracked
- [ ] Token cost aggregated
- [ ] Passes lint, typecheck, build

---

### Task 9.2: Agent + QA Data → Briefing

**Purpose**: Include agent activity and QA results in daily briefings.

**Files to Modify**:
- `src/main/services/briefing/briefing-service.ts` — Add agent summary section

**Specification**:

Daily briefing currently includes: task summaries, agent activity (from legacy agent-service), GitHub notifications, suggestions. Add:
- Agent orchestrator sessions (planned, executed, completed, failed overnight)
- QA results summary (X tasks QA'd, Y issues found)
- Watchdog alerts summary (any stalled/failed agents)
- Cross-device activity ("Larry completed 3 tasks overnight")

**Acceptance Criteria**:
- [ ] Daily briefing includes agent orchestrator activity
- [ ] QA results summarized in briefing
- [ ] Cross-device activity mentioned
- [ ] Passes lint, typecheck, build

---

### Task 9.3: QA + Watchdog → Notification System

**Purpose**: Route QA failures and watchdog alerts through the existing notification manager.

**Files to Modify**:
- `src/main/services/qa/qa-runner.ts` — Emit notifications on completion
- `src/main/services/agent-orchestrator/agent-watchdog.ts` — Emit notifications on alert

**Specification**:

When QA completes with failures:
1. Emit `event:notifications.new` with QA summary
2. If user has email notifications enabled → queue email via emailService
3. Desktop notification via Electron `Notification` API

When watchdog detects stalled/dead agent:
1. Emit `event:notifications.new` with alert details
2. Desktop notification with action buttons (restart, view logs)

**Acceptance Criteria**:
- [ ] QA failures appear in notification list
- [ ] Watchdog alerts appear in notification list
- [ ] Desktop notifications shown for critical alerts
- [ ] Optional email for QA reports
- [ ] Passes lint, typecheck, build

---

### Task 9.4: Task Completion → Milestones

**Purpose**: Auto-update milestone task completion when tasks finish.

**Files to Modify**:
- `src/main/services/agent-orchestrator/agent-orchestrator.ts` — On task completion, check milestone linkage

**Specification**:

When an agent completes a task (status → 'done'):
1. Check if task is linked to a milestone (via milestone task checklist)
2. If linked → call `milestonesService.toggleTask(milestoneId, taskTitle, true)`
3. Milestone progress auto-updates in roadmap view

This is a lightweight hook — just check and update if applicable.

**Acceptance Criteria**:
- [ ] Completed tasks auto-toggle in linked milestones
- [ ] Milestone progress percentage updates
- [ ] No error if task not linked to milestone
- [ ] Passes lint, typecheck, build

---

## Updated Dependency Graph

```
Phase 1 (Foundation)           Phase 5 (Voice)           Phase 7 (Device Names)
─────────────────              ──────────────            ──────────────────────
1.1 Agent Orchestrator ──┐     5.1 Voice Input           7.1 Device Nickname
1.2 Extended Statuses ───┤     5.2 Voice Output
1.3 Progress Watcher ────┤     5.3 Voice Abstraction
1.4 IPC Handlers ────────┤
                         │
Phase 2 (Task Board)     │     Phase 6 (Watches)         Phase 8 (Feature Access)
────────────────         │     ─────────────────         ────────────────────────
2.1 Status Cell ◄── 1.2  │     6.1 Watch Store           8.1 Expand Classifier
2.2 Actions Cell ◄─ 1.4  │     6.2 Watch Intents         8.2 Expand Executor
2.3 Agent Events ◄─ 1.3  │     6.3 Cross-Device ◄── 7.1  8.3 Wire Dependencies
2.4 Plan Viewer ◄── 1.4  │     6.4 Proactive Notifs
                         │
Phase 3 (Watchdog)       │     Phase 9 (Data Wiring)
──────────────           │     ─────────────────────
3.1 Watchdog Service ◄ 1.1     9.1 Agent → Insights ◄── 1.1
3.2 Watchdog UI ◄──── 3.1     9.2 Agent+QA → Briefing ◄── 4.1
                               9.3 QA+Watchdog → Notifications ◄── 4.1, 3.1
Phase 4 (QA)                   9.4 Task → Milestones ◄── 1.1
────────
4.1 QA Runner ◄──── 1.1
4.2 QA Auto-Trigger ◄ 4.1
4.3 QA IPC ◄──────── 4.1
4.4 QA Report Tab ◄── 4.3
```

**Updated wave execution**:

| Wave | Phases | Tasks |
|------|--------|-------|
| 1 | Phase 1 + Phase 5 + Phase 7 | Foundation + voice + device nicknames (all parallel) |
| 2 | Phase 2 + Phase 3 + Phase 8 | Task board + watchdog + assistant feature access (parallel) |
| 3 | Phase 4 + Phase 6 | QA system + watches/cross-device (parallel) |
| 4 | Phase 9 | Data flow wiring (depends on 1, 3, 4) |
| 5 | Polish | Integration testing, docs, edge cases |

---

## Updated File Inventory

### New Files (27 total — was 21, +6)

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1-21 | *(same as before)* | 1-6 | *(unchanged)* |
| 22 | *(no new file — device nickname is a field addition)* | 7.1 | Modify existing device types + service |
| 23 | *(no new file — intent classifier modification)* | 8.1 | Expand existing classifier |
| 24 | *(no new file — command executor modification)* | 8.2 | Expand existing executor |
| 25 | *(no new file — wiring in index.ts)* | 8.3 | Inject deps |
| 26 | *(no new file — insights modification)* | 9.1 | Expand existing insights |
| 27 | *(no new file — briefing modification)* | 9.2 | Expand existing briefing |

**Total new files: 21** (Phases 7-9 are all modifications to existing files)

### Additional Modified Files (+8, total 27)

| # | File | Phase | Change |
|---|------|-------|--------|
| 20 | `src/shared/types/hub-protocol.ts` | 7.1 | Add `nickname` to Device type |
| 21 | `src/main/services/device/device-service.ts` | 7.1 | Support nickname in registration/update |
| 22 | `src/main/ipc/handlers/device-handlers.ts` | 7.1 | Expose nickname update |
| 23 | `src/main/services/insights/insights-service.ts` | 9.1 | Add agent + QA metrics |
| 24 | `src/main/services/briefing/briefing-service.ts` | 9.2 | Add agent + QA + cross-device to briefing |
| 25 | `src/main/services/qa/qa-runner.ts` | 9.3 | Emit notifications on QA completion |
| 26 | `src/main/services/agent-orchestrator/agent-watchdog.ts` | 9.3 | Emit notifications on alerts |
| 27 | `src/main/index.ts` | 8.3 | Pass new services to assistant constructor |

---

## Grand Total

| Metric | Count |
|--------|-------|
| Phases | 9 |
| Tasks | 28 |
| New files | 21 |
| Modified files | 27 |
| New IPC invoke channels | 10 |
| New IPC events | 11 |
| New types | 4 modules |
| New tests needed | 6 files |

---

## Post-Implementation

1. Update `ai-docs/FEATURES-INDEX.md` — Add agent orchestrator, QA runner, watch system, device nicknames
2. Update `ai-docs/ARCHITECTURE.md` — Add orchestration layer diagram, data flow connections
3. Update `ai-docs/DATA-FLOW.md` — Add agent lifecycle + QA + watch + cross-feature data flows
4. Update `ai-docs/user-interface-flow.md` — Mark G-13 (assistant) as RESOLVED
5. Update `ai-docs/PATTERNS.md` — Document Claude hooks pattern, QA runner pattern, watch pattern
6. Commit, push, create PR
