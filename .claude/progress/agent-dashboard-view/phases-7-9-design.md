# Feature Design: Agent Dashboard Phases 7–9
# ProgressWatcher Wiring · Event Enrichment · QA Pipeline Integration

**Author**: /new-plan
**Created**: 2026-04-01
**Status**: READY FOR IMPLEMENTATION
**Workflow Mode**: standard
**Slug**: agent-dashboard-view
**Branch**: feature/agent-dashboard-view

---

## 1. Overview

Phases 7–9 of the ADC v2 agent dashboard complete the data pipeline from raw JSONL
events and task files (Layer 2 — Workflow Tracking) into the dashboard UI (Layer 3).

Phases 1–6 delivered all services and UI components. The dashboard can already display
agents (Layer 1 visibility), but the "Tasks" tab in expanded/popup panels is empty —
no task state, no workflow phases, no QA results. These three phases fix that.

**Phase 7** introduces `ProgressWatcherV2`, a new main-process service that watches
`.claude/progress/*/tasks/task-*.md` files and `.claude/progress/*/events.jsonl` for
real-time task state. It replaces the old `ProgressWatcher` (which watched
`docs/progress/*.md`) for dashboard purposes.

**Phase 8** is subsumed into Phase 7 — event enrichment is achieved by the parser
extracting richer signal from task file YAML frontmatter and body markdown rather
than adding a separate emission pipeline. The JSONL events serve as change triggers;
the task files are the authoritative state source.

**Phase 9** surfaces QA pipeline data in the dashboard. The `QaRunner` service already
exists at `src/main/services/qa/`. This phase adds IPC channels to query QA sessions,
wires QA events to the renderer, and adds a QA results panel to the expanded/popup views.

---

## 2. Requirements

### Functional Requirements

- Tasks tab in AgentPanelExpanded shows: task number, task name, workflow phases with
  status (✅/🔄/◻), progress bar, acceptance criteria checklist
- Tasks tab derives data from `.claude/progress/<slug>/tasks/task-*.md` YAML frontmatter
  and body markdown, correlated to the agent's `taskId` field
- Tasks tab shows "No task assigned" empty state when `session.taskId` is not set
- QA panel in AgentPanelExpanded and AgentPanelPopup shows: verdict badge (PASS/FAIL/RUNNING),
  verification suite results (lint/typecheck/test/build/docs), issues list with severity,
  QA duration
- QA data comes from the existing `QaRunner` service via new IPC channels
- Task state updates in real-time via IPC events (no polling)
- QA session events update in real-time via IPC events

### Non-Functional Requirements

- ProgressWatcherV2 uses `fs.watch` (same pattern as existing `ProgressWatcher`)
- Service is lazy — only watches a feature slug when first queried
- No polling; all updates are event-driven
- Task file parser handles missing/malformed frontmatter gracefully
- All new IPC channels follow existing Zod schema patterns

### Out of Scope

- Rewriting the event emission in claude-workflow plugin hooks
- Adding task manipulation (create/edit/delete task files from dashboard)
- Showing tasks from multiple simultaneous features
- Guardian integration (codebase-guardian findings are separate from QA runner reports)

---

## 3. Architecture

### Selected Approach

**ProgressWatcherV2 as a new service** (separate from existing `ProgressWatcher`).

The existing `ProgressWatcher` watches `docs/progress/*.md` and syncs to Hub. It serves
a different purpose and should not be modified. ProgressWatcherV2 watches
`.claude/progress/<slug>/tasks/task-*.md` and `.claude/progress/<slug>/events.jsonl`
for dashboard consumption.

The QA data path is simpler: `QaRunner` already emits `QaSessionEvent` callbacks.
We add a thin forwarding layer in the IPC handlers to push those events to the renderer.

### Data Model (new types in `src/shared/types/agent-dashboard.ts`)

```typescript
/** QA verdict for display in dashboard panels */
export type QaVerdict = 'pass' | 'fail' | 'warnings' | 'running' | 'none';

/** Verification suite results for dashboard display */
export interface QaVerificationSuite {
  lint: 'pass' | 'fail' | 'pending';
  typecheck: 'pass' | 'fail' | 'pending';
  test: 'pass' | 'fail' | 'pending';
  build: 'pass' | 'fail' | 'pending';
  docs: 'pass' | 'fail' | 'pending';
}

/** QA issue for dashboard display */
export interface QaDashboardIssue {
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  category: string;
  description: string;
  location?: string;
}

/** QA session summary for dashboard display */
export interface QaDashboardSession {
  sessionId: string;
  taskId: string;
  verdict: QaVerdict;
  checksRun: number;
  checksPassed: number;
  issues: QaDashboardIssue[];
  verificationSuite: QaVerificationSuite;
  duration: number;
  startedAt: string;
  completedAt?: string;
}
```

### New IPC Channels

**Invoke:**
- `agent-dashboard.getTasksForFeature` — list all tasks for a feature slug
- `agent-dashboard.getTask` — get single task by slug + number
- `agent-dashboard.getQaSession` — get QA session for a task ID
- `agent-dashboard.listQaSessions` — list all QA sessions

**Events:**
- `event:agent-dashboard.taskUpdated` — task file changed (phase status, acceptance criteria)
- `event:agent-dashboard.qaSessionUpdated` — QA session state changed

### Integration Points

**New → Existing:**
- `ProgressWatcherV2` uses `node:fs.watch` (same as `ProgressWatcher`)
- `IPC handlers` call `progressWatcherV2.getTasksForFeature()` and `qaRunner.getSession()`
- `QaRunner.onSessionEvent()` callback forwards to IPC router

**Existing → New:**
- `service-registry.ts` instantiates `ProgressWatcherV2` alongside existing services
- `agent-dashboard-handlers.ts` gains ProgressWatcherV2 + QaRunner parameters
- `AgentPanelExpanded` + `AgentPanelPopup` gain Tasks and QA tabs

---

## 4. Task Breakdown

### Task 11: ProgressWatcherV2 Service

**Agent**: service-engineer
**Wave**: 1
**Blocked by**: none
**Estimated complexity**: HIGH
**Context budget**: ~16,000 tokens

**Description**:
Create a new service `ProgressWatcherV2` that watches `.claude/progress/<slug>/tasks/`
for task file changes and `.claude/progress/<slug>/events.jsonl` for workflow events.
Parses task file YAML frontmatter (taskNumber, taskName, wave, complexity, status) and
body markdown (phases checklist, acceptance criteria) into typed `TaskProgress` objects.
Emits `task.updated` events when task files change. Provides synchronous getters for
querying current task state.

**Files to Create**:
- `src/main/services/progress-watcher-v2/index.ts` — barrel export
- `src/main/services/progress-watcher-v2/progress-watcher-v2-service.ts` — main service
- `src/main/services/progress-watcher-v2/task-file-parser.ts` — YAML + markdown parser

**Files to Read for Context**:
- `src/main/services/workflow/progress-watcher.ts` — existing pattern (fs.watch usage)
- `src/main/services/session-jsonl/session-jsonl-reader.ts` — JSONL reading pattern
- `src/shared/types/agent-dashboard.ts` — TaskProgress, TaskPhase, TaskCriterion types
- `.claude/progress/agent-dashboard-view/tasks/task-1.md` — real task file format

**Service Interface**:
```typescript
export interface ProgressWatcherV2 {
  watchFeature: (slug: string) => void;
  stopWatching: (slug: string) => void;
  getTasksForFeature: (slug: string) => TaskProgress[];
  getTask: (slug: string, taskNumber: number) => TaskProgress | null;
  onTaskUpdated: (listener: (slug: string, task: TaskProgress) => void) => void;
  dispose: () => void;
}
```

**Task file parsing rules**:
- YAML frontmatter: extract `taskNumber`, `taskName`, `wave`, `complexity`, `status`
- Body markdown: parse `## Workflow Phases` checklist (`- [x]` = completed, `- [ ]` = pending)
- Body markdown: parse `## Acceptance Criteria` checklist (`- [x]` = met, `- [ ]` = unmet)
- If `status` frontmatter is `"completed"`, all phases → completed, all criteria → met
- If `status` is `"in-progress"`, check body for individual phase states
- Missing fields are tolerated — return defaults (empty arrays, unknown status)

**Acceptance Criteria**:
- [ ] `watchFeature(slug)` starts fs.watch on `.claude/progress/<slug>/tasks/`
- [ ] Task file changes trigger `onTaskUpdated` with parsed `TaskProgress`
- [ ] `getTasksForFeature` returns all parsed tasks sorted by taskNumber
- [ ] `getTask` returns null for nonexistent task (no throw)
- [ ] Parser handles missing frontmatter without throwing
- [ ] `dispose()` cleans up all fs.watch instances
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, Error Handling

**Implementation Notes**:
- Follow the `createProgressWatcher` factory pattern from existing ProgressWatcher
- Use `fs.watch` with `recursive: false` on the tasks directory
- Re-parse the full file on every change (task files are small, <5KB each)
- Do NOT watch `events.jsonl` in this task — that's deferred; task file state is sufficient

---

### Task 12: IPC Schema + Types Extension

**Agent**: schema-designer
**Wave**: 1
**Blocked by**: none
**Estimated complexity**: MEDIUM
**Context budget**: ~14,000 tokens

**Description**:
Extend the agent dashboard IPC contract with channels for task progress and QA session
data. Add new Zod schemas for `WorkflowTask`, `QaReport`, and `QaIssue`. Add new
TypeScript types to `agent-dashboard.ts` for `QaVerdict`, `QaDashboardSession`, etc.

**Files to Modify**:
- `src/shared/ipc/agent-dashboard/schemas.ts` — add `WorkflowTaskSchema`, `TaskPhaseSchema`,
  `TaskCriterionSchema`, `QaDashboardSessionSchema`, `QaIssueSchema`, `QaVerificationSuiteSchema`
- `src/shared/ipc/agent-dashboard/contract.ts` — add 4 invoke channels + 2 event channels
- `src/shared/types/agent-dashboard.ts` — add `QaVerdict`, `QaDashboardSession`,
  `QaDashboardIssue`, `QaVerificationSuite` types (see data model in section 3)

**Files to Read for Context**:
- `src/shared/ipc/agent-dashboard/schemas.ts` — existing schema patterns
- `src/shared/ipc/agent-dashboard/contract.ts` — existing contract structure
- `src/shared/types/agent-dashboard.ts` — existing types (TaskProgress already defined)
- `src/main/services/qa/qa-types.ts` — QaReport, QaIssue, VerificationSuite (map these to new dashboard types)

**New Invoke Channels**:
```typescript
'agent-dashboard.getTasksForFeature': {
  input: z.object({ featureSlug: z.string() }),
  output: z.array(WorkflowTaskSchema),
},
'agent-dashboard.getTask': {
  input: z.object({ featureSlug: z.string(), taskNumber: z.number() }),
  output: WorkflowTaskSchema.nullable(),
},
'agent-dashboard.getQaSession': {
  input: z.object({ taskId: z.string() }),
  output: QaDashboardSessionSchema.nullable(),
},
'agent-dashboard.listQaSessions': {
  input: z.object({}),
  output: z.array(QaDashboardSessionSchema),
},
```

**New Event Channels**:
```typescript
'event:agent-dashboard.taskUpdated': {
  payload: z.object({ featureSlug: z.string(), task: WorkflowTaskSchema }),
},
'event:agent-dashboard.qaSessionUpdated': {
  payload: QaDashboardSessionSchema,
},
```

**Acceptance Criteria**:
- [ ] All new Zod schemas validate correctly against real data
- [ ] `WorkflowTaskSchema` maps to `TaskProgress` type (taskNumber, taskName, phases, acceptanceCriteria)
- [ ] `QaDashboardSessionSchema` omits screenshot paths (frontend doesn't need them)
- [ ] All new channels registered in `agentDashboardInvoke` and `agentDashboardEvents` exports
- [ ] `src/shared/ipc/agent-dashboard/index.ts` re-exports new schemas correctly
- [ ] Automated checks pass (lint, typecheck)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, API Contract

---

### Task 13: IPC Handlers + Bootstrap Wiring

**Agent**: ipc-handler-engineer
**Wave**: 2
**Blocked by**: task-11, task-12
**Estimated complexity**: MEDIUM
**Context budget**: ~16,000 tokens

**Description**:
Wire `ProgressWatcherV2` and `QaRunner` into the agent dashboard IPC handlers.
Register handlers for the 4 new invoke channels. Forward `taskUpdated` and
`qaSessionUpdated` events from services to the renderer via IPC router. Update
`Services` interface in `ipc/index.ts` and instantiate `ProgressWatcherV2` in
`service-registry.ts`.

**Files to Modify**:
- `src/main/ipc/handlers/agent-dashboard-handlers.ts` — add ProgressWatcherV2 and QaRunner params,
  register new invoke handlers, wire event forwarding
- `src/main/ipc/index.ts` — add `progressWatcherV2` to `Services` interface
- `src/main/bootstrap/service-registry.ts` — instantiate `createProgressWatcherV2()`,
  add to services object, pass to `registerAgentDashboardHandlers`

**Files to Read for Context**:
- `src/main/ipc/handlers/agent-dashboard-handlers.ts` — existing handler pattern
- `src/main/ipc/index.ts` — Services interface pattern
- `src/main/bootstrap/service-registry.ts` — instantiation pattern (see qaRunner wiring)
- `src/main/services/progress-watcher-v2/index.ts` — new service interface (from task-11)
- `src/main/services/qa/qa-types.ts` — QaRunner interface, QaSessionEvent

**Handler pattern**:
```typescript
export function registerAgentDashboardHandlers(
  router: IpcRouter,
  agentManager: AgentManagerService,
  teamWatcher: TeamWatcherService,
  progressWatcher: ProgressWatcherV2,  // NEW
  qaRunner: QaRunner,                   // NEW
): void { ... }
```

**Event forwarding for task updates**:
```typescript
progressWatcher.onTaskUpdated((featureSlug, task) => {
  router.emit('event:agent-dashboard.taskUpdated', { featureSlug, task });
});
```

**Event forwarding for QA**:
```typescript
qaRunner.onSessionEvent((event) => {
  if (event.type === 'completed' || event.type === 'progress') {
    const dashboardSession = mapQaSessionToDashboard(event.session);
    router.emit('event:agent-dashboard.qaSessionUpdated', dashboardSession);
  }
});
```

**Acceptance Criteria**:
- [ ] `agent-dashboard.getTasksForFeature` calls `progressWatcher.getTasksForFeature()`
- [ ] `agent-dashboard.getTask` calls `progressWatcher.getTask()`
- [ ] `agent-dashboard.getQaSession` calls `qaRunner.getSessionByTaskId()`
- [ ] `agent-dashboard.listQaSessions` calls `qaRunner.getSession()` for all sessions
- [ ] `event:agent-dashboard.taskUpdated` fires when task file changes
- [ ] `event:agent-dashboard.qaSessionUpdated` fires on QA session progress/completion
- [ ] `progressWatcherV2` instantiated in service-registry before IPC registration
- [ ] Automated checks pass (lint, typecheck, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, Error Handling

**Implementation Notes**:
- `mapQaSessionToDashboard()` maps `QaSession + QaReport` → `QaDashboardSession`
  (strips screenshot file paths, maps `QaResult` → `QaVerdict`, maps `VerificationSuite` → `QaVerificationSuite`)
- `progressWatcher.watchFeature(slug)` should be called when the first query for that
  slug arrives, not at startup (lazy activation)
- QaRunner is already instantiated in service-registry — just pass it through

---

### Task 14: React Query Hooks

**Agent**: hook-engineer
**Wave**: 2
**Blocked by**: task-12
**Estimated complexity**: MEDIUM
**Context budget**: ~15,000 tokens

**Description**:
Add React Query hooks and event subscriptions for task progress and QA session data.
Create `useTaskProgress`, `useQaSession` query hooks. Create `useProgressEvents` and
`useQaEvents` event subscription hooks that invalidate query cache on updates.

**Files to Create**:
- `src/renderer/features/agent-dashboard/api/useTaskProgress.ts`
- `src/renderer/features/agent-dashboard/api/useQaSession.ts`
- `src/renderer/features/agent-dashboard/hooks/useProgressEvents.ts`
- `src/renderer/features/agent-dashboard/hooks/useQaEvents.ts`

**Files to Modify**:
- `src/renderer/features/agent-dashboard/api/queryKeys.ts` — add task and qa keys

**Files to Read for Context**:
- `src/renderer/features/agent-dashboard/api/useAgentSessions.ts` — query hook pattern
- `src/renderer/features/agent-dashboard/api/queryKeys.ts` — key factory pattern
- `src/renderer/shared/lib/ipc.ts` — ipc() helper + event subscription API
- `src/shared/ipc/agent-dashboard/contract.ts` — new channels (from task-12)

**New query keys**:
```typescript
tasks: (featureSlug: string) => [...all, 'tasks', featureSlug] as const,
task: (featureSlug: string, taskNumber: number) => [...all, 'task', featureSlug, taskNumber] as const,
qaSession: (taskId: string) => [...all, 'qa', taskId] as const,
qaSessions: () => [...all, 'qa-sessions'] as const,
```

**Hook signatures**:
```typescript
export function useTasksForFeature(featureSlug: string | undefined)
export function useTask(featureSlug: string | undefined, taskNumber: number | undefined)
export function useQaSession(taskId: string | undefined)
export function useQaSessions()
// Event hooks — call once at dashboard mount, invalidate on events:
export function useProgressEvents()
export function useQaEvents()
```

**Acceptance Criteria**:
- [ ] `useTasksForFeature` disabled when `featureSlug` is undefined
- [ ] `useTask` disabled when either param is undefined
- [ ] `useQaSession` disabled when `taskId` is undefined
- [ ] `useProgressEvents` subscribes to `event:agent-dashboard.taskUpdated` and
  calls `queryClient.invalidateQueries(agentDashboardKeys.tasks(featureSlug))`
- [ ] `useQaEvents` subscribes to `event:agent-dashboard.qaSessionUpdated` and
  calls `queryClient.invalidateQueries(agentDashboardKeys.qaSession(session.taskId))`
- [ ] All hooks follow existing staleTime conventions (tasks: 10s, qa: 5s)
- [ ] Automated checks pass (lint, typecheck)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture,
Error Handling, State Management

---

### Task 15: TasksTab + QaPanel Components

**Agent**: component-engineer
**Wave**: 3
**Blocked by**: task-13, task-14
**Estimated complexity**: HIGH
**Context budget**: ~18,000 tokens

**Description**:
Add Tasks and QA tabs to AgentPanelExpanded and AgentPanelPopup. Create TasksTab
component (workflow phase checklist with progress bar, acceptance criteria).
Create QaPanel component (verdict badge, verification suite grid, issues list).
Update barrel exports in index.ts.

**Files to Create**:
- `src/renderer/features/agent-dashboard/components/TasksTab.tsx`
- `src/renderer/features/agent-dashboard/components/QaPanel.tsx`

**Files to Modify**:
- `src/renderer/features/agent-dashboard/components/AgentPanelExpanded.tsx` — add Tasks tab (4th), add QA section
- `src/renderer/features/agent-dashboard/components/AgentPanelPopup.tsx` — add Tasks tab (4th), add QA section
- `src/renderer/features/agent-dashboard/index.ts` — export TasksTab, QaPanel

**Files to Read for Context**:
- `src/renderer/features/agent-dashboard/components/AgentPanelExpanded.tsx` — existing tabs pattern
- `src/renderer/features/agent-dashboard/components/AgentPanelPopup.tsx` — popup tabs pattern
- `src/renderer/features/agent-dashboard/api/useTaskProgress.ts` — hook signatures (from task-14)
- `src/renderer/features/agent-dashboard/api/useQaSession.ts` — hook signatures (from task-14)
- `src/shared/types/agent-dashboard.ts` — TaskProgress, QaDashboardSession types
- `ai-docs/DESIGN-SYSTEM.md` — color tokens for status indicators
- `docs/features/agent-dashboard-view/plan.md` — Tasks tab spec (section "Popup Tab: Tasks")

**TasksTab spec** (from plan.md):
```
┌──────────────────────────────────────────────┐
│  Task #3 — FileTree Component                │
│  Progress ████████████░░░░░░░░ 60%           │
│                                              │
│  Workflow Phases:                            │
│  ✅ Phase 0: Load rules + read task file     │
│  ✅ Phase 1: Write execution plan            │
│  🔄 Phase 2: Execute plan                   │
│  ◻ Phase 3: Self-review + build             │
│  ◻ Phase 4: Report to team leader           │
│                                              │
│  Acceptance Criteria:                        │
│  ☑ IPC contract defined                     │
│  ☑ Service instantiated                     │
│  ◻ Tests pass                               │
└──────────────────────────────────────────────┘
```

**QaPanel spec**:
```
┌──────────────────────────────────────────────┐
│  QA  [PASS ✓]   2 issues   14s              │
│                                              │
│  Verification Suite:                         │
│  lint ✅  typecheck ✅  test ✅  build ✅   │
│                                              │
│  Issues:                                     │
│  ⚠ minor  Missing loading state in FileTree  │
│  ⚠ minor  No empty state for search results  │
└──────────────────────────────────────────────┘
```

**Component props**:
```typescript
// TasksTab
interface TasksTabProps {
  taskId?: string;         // from agent.taskId
  featureSlug?: string;    // derived from agent.branch or agent.teamName context
}

// QaPanel
interface QaPanelProps {
  taskId?: string;
  className?: string;
}
```

**Acceptance Criteria**:
- [ ] Tasks tab added as 4th tab in AgentPanelExpanded (after Chat, Files, Errors)
- [ ] Tasks tab added as 4th tab in AgentPanelPopup
- [ ] TasksTab shows "No task assigned" when `taskId` is undefined
- [ ] TasksTab shows task name, progress bar (completed phases / total phases), phases checklist
- [ ] Phase icons: ✅ completed, 🔄 in-progress (animate pulse), ◻ pending
- [ ] Acceptance criteria checklist below phases
- [ ] QaPanel shows verdict badge (variant based on verdict: success/destructive/warning)
- [ ] QaPanel shows verification suite as 5-column grid with pass/fail icons
- [ ] QaPanel shows issues list with severity color coding
- [ ] All empty states handled (loading spinner, no-data message)
- [ ] No hardcoded hex/rgba — use CSS custom properties only
- [ ] Automated checks pass (lint, typecheck, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture,
Error Handling, UI Components, UI Design System

**Implementation Notes**:
- Use `useTasksForFeature(featureSlug)` to get all tasks, then find by `taskId`
- `featureSlug` can be derived from agent session branch name: parse `feature/<slug>` or
  `work/<slug>/<task>` patterns, fallback to `'agent-dashboard-view'` for current feature
- Verdict badge colors: pass=`bg-success`, fail=`bg-destructive`, warnings=`bg-warning`,
  running=`bg-info`, none=`bg-muted`
- Use `CheckCircle2`, `Clock`, `Circle` from lucide-react for phase status icons
- Progress bar: use existing `Progress` component from `@ui` if available, else inline div

---

## 5. Wave Plan

### Wave 1: Foundation (parallel, no blockers)
- Task 11: ProgressWatcherV2 Service — service-engineer
- Task 12: IPC Schema + Types Extension — schema-designer

### Wave 2: Integration (parallel, blocked by Wave 1)
- Task 13: IPC Handlers + Bootstrap Wiring — ipc-handler-engineer (blocked by 11 + 12)
- Task 14: React Query Hooks — hook-engineer (blocked by 12 only)

### Wave 3: UI (blocked by Wave 2)
- Task 15: TasksTab + QaPanel Components — component-engineer (blocked by 13 + 14)

### Dependency Graph

```
Task 11 (service) ──────────────────────┐
                                        ▼
Task 12 (schema) ──────────────────► Task 13 (handlers) ──┐
         │                                                  ├──► Task 15 (components)
         └──────────────────────────► Task 14 (hooks) ─────┘
```

### Parallel Opportunities
- Task 11 and Task 12 are fully independent — assign to separate worktrees in Wave 1
- Task 13 and Task 14 are independent (different files) — assign to separate worktrees in Wave 2
- Task 15 is the single Wave 3 task

---

## 6. File Ownership Matrix

| File | Task | Agent |
|------|------|-------|
| `src/main/services/progress-watcher-v2/*` | Task 11 | service-engineer |
| `src/shared/ipc/agent-dashboard/schemas.ts` | Task 12 | schema-designer |
| `src/shared/ipc/agent-dashboard/contract.ts` | Task 12 | schema-designer |
| `src/shared/types/agent-dashboard.ts` | Task 12 | schema-designer |
| `src/main/ipc/handlers/agent-dashboard-handlers.ts` | Task 13 | ipc-handler-engineer |
| `src/main/ipc/index.ts` | Task 13 | ipc-handler-engineer |
| `src/main/bootstrap/service-registry.ts` | Task 13 | ipc-handler-engineer |
| `src/renderer/features/agent-dashboard/api/useTaskProgress.ts` | Task 14 | hook-engineer |
| `src/renderer/features/agent-dashboard/api/useQaSession.ts` | Task 14 | hook-engineer |
| `src/renderer/features/agent-dashboard/hooks/useProgressEvents.ts` | Task 14 | hook-engineer |
| `src/renderer/features/agent-dashboard/hooks/useQaEvents.ts` | Task 14 | hook-engineer |
| `src/renderer/features/agent-dashboard/api/queryKeys.ts` | Task 14 | hook-engineer |
| `src/renderer/features/agent-dashboard/components/TasksTab.tsx` | Task 15 | component-engineer |
| `src/renderer/features/agent-dashboard/components/QaPanel.tsx` | Task 15 | component-engineer |
| `src/renderer/features/agent-dashboard/components/AgentPanelExpanded.tsx` | Task 15 | component-engineer |
| `src/renderer/features/agent-dashboard/components/AgentPanelPopup.tsx` | Task 15 | component-engineer |
| `src/renderer/features/agent-dashboard/index.ts` | Task 15 | component-engineer |

**Conflicts**: NONE

---

## 7. Context Budget

| Task | Base | Files | Margin | Estimate |
|------|------|-------|--------|----------|
| Task 11 (service) | 8,000 | 5×1,000 | 3,000 | ~16,000 |
| Task 12 (schema) | 8,000 | 3×1,000 | 3,000 | ~14,000 |
| Task 13 (handlers) | 8,000 | 5×1,000 | 3,000 | ~16,000 |
| Task 14 (hooks) | 8,000 | 4×1,000 | 3,000 | ~15,000 |
| Task 15 (components) | 8,000 | 7×1,000 | 3,000 | ~18,000 |

All tasks within the 18,000 token threshold. No splits needed.

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Task file parsing edge cases (missing frontmatter) | Medium | Low | Parser returns empty defaults, never throws |
| `featureSlug` derivation from agent branch name | Medium | Medium | Fallback to hardcoded `agent-dashboard-view` during dev; real slug from branch parse |
| QaRunner `onSessionEvent` fires on every progress tick | Low | Low | Only emit on `completed` and `progress` event types |
| service-registry.ts already has `progressWatcherV2` slot | Low | Low | Task 13 checks before adding |
| Wave 2 tasks depend on Task 11 types not yet in shared types | Low | Medium | Task 12 adds the shared types; Task 13 imports from service directly |

---

## 9. QA Strategy

### Per-Task QA Sections
- **Task 11**: Automated Checks, Type Safety, Code Structure, Architecture, Error Handling
- **Task 12**: Automated Checks, Type Safety, Code Structure, Architecture, API Contract
- **Task 13**: Automated Checks, Type Safety, Code Structure, Architecture, Error Handling
- **Task 14**: Automated Checks, Type Safety, Code Structure, Architecture, Error Handling, State Management
- **Task 15**: Automated Checks, Type Safety, Code Structure, Architecture, Error Handling, UI Components, UI Design System

### Feature-Specific QA Checks
- [ ] TasksTab renders correctly with real task-1.md data from `.claude/progress/agent-dashboard-view/tasks/`
- [ ] TasksTab empty state shows when session has no taskId
- [ ] QaPanel shows "No QA data" when no session exists for taskId
- [ ] No `any` types in new service code
- [ ] `dispose()` called properly — no fs.watch leaks on service teardown
- [ ] Event listeners cleaned up on component unmount (useEffect cleanup)

### Guardian Focus Areas
- ProgressWatcherV2 placed in `src/main/services/` (not renderer)
- New components in `src/renderer/features/agent-dashboard/components/`
- No cross-process type imports (types in `@shared/types/`)

---

## 10. Implementation Notes

- `QaRunner` is already instantiated in `service-registry.ts` at line ~443. Task 13
  just needs to pass it through `registerAgentDashboardHandlers`.
- The existing `ProgressWatcher` (for Hub sync) must not be modified — ProgressWatcherV2
  is a new, separate service.
- Task files use real YAML frontmatter with known keys: `taskNumber`, `taskName`,
  `taskSlug`, `wave`, `complexity`, `blockedBy`, `agent`, `status`. Parse all of these.
- The `status` key in task frontmatter uses values: `"pending"`, `"in-progress"`,
  `"completed"`, `"failed"`. Map to `PhaseStatus` type.
- Phases are in the task file body under `## Workflow Phases` as a markdown checklist.
  If no such section exists, derive from `status` field alone.
- For `featureSlug` in the component: use `session.branch` (strip `work/` prefix and
  task slug suffix to get `feature-name`), or use `session.teamName` if set.
- `Progress` UI component: check `@ui` barrel (`src/renderer/shared/components/ui/`) for
  existing `Progress` — use it. If missing, a simple `<div>` with width % is fine.

---

## Task Handoff Files

Per-agent task files generated at `.claude/progress/agent-dashboard-view/tasks/`:
- task-11.md — ProgressWatcherV2 Service
- task-12.md — IPC Schema + Types Extension
- task-13.md — IPC Handlers + Bootstrap Wiring
- task-14.md — React Query Hooks
- task-15.md — TasksTab + QaPanel Components

To execute this plan, run: `/agent-team`
