# Task Planning Pipeline — Quick Reference

> End-to-end flow: **idea → plan → review → approve/reject/request changes → execute**
>
> This doc is for Claude instances working on the ADC codebase. It consolidates
> the planning pipeline into a single reference so you don't need to cross-read
> ARCHITECTURE.md, DATA-FLOW.md, and FEATURES-INDEX.md.
>
> **Local-first:** All pipeline stages work offline. Task creation, status transitions,
> and plan completion go through `TaskRepository` which writes locally (`.adc/specs/`)
> and mirrors to Hub when connected. Hub is optional for all operations except
> `executeTask`/`cancelTask` (remote dispatch).

---

## Pipeline Overview

```
User creates task (backlog)
  │
  ▼
"Start Planning" clicked (ActionsCell)
  │
  ▼
ipc('agent.startPlanning') ──► taskRepository: backlog → planning (local + Hub mirror)
  │                              Orchestrator spawns: claude -p "/plan-feature ..."
  │                              Hooks merged into .claude/settings.local.json
  │                              JSONL progress: {dataDir}/progress/{taskId}.jsonl
  │
  ▼
Agent writes plan file → exits
  │
  ▼
event-wiring.ts detects plan file
  │  ├── Scan log for PLAN_FILE:<path> marker
  │  └── Fallback: scan docs/features/*/plan.md (most recent)
  │
  ▼
taskRepository: planning → plan_ready (local + Hub mirror)
  │  planContent + planFilePath stored in task metadata (local + Hub mirror)
  │  emit('event:agent.orchestrator.planReady')
  │  Restore original .claude/settings.local.json
  │
  ▼
PlanViewer renders plan content
  │
  ├── "Approve & Execute" ──► ipc('agent.startExecution', { planRef })
  │                            taskRepository: plan_ready → running (local + Hub mirror)
  │
  ├── "Request Changes"   ──► PlanFeedbackDialog opens
  │                            User enters feedback
  │                            ipc('agent.replanWithFeedback', { feedback })
  │                            taskRepository: plan_ready → planning (local + Hub mirror)
  │                            (cycle repeats)
  │
  └── "Reject"            ──► taskRepository: status → backlog (local + Hub mirror)
```

---

## Task Status Transitions (Hub)

```
backlog ──► planning ──► plan_ready ──► queued ──► running ──► review ──► done
   ▲           │             │                        │           │
   │           ▼             ▼                        ▼           │
   └──────── error ◄────── backlog                  error ◄──────┘
                              ▲
                              │
                        (reject plan)
```

Hub statuses (source of truth: `src/shared/types/hub/enums.ts`):
`backlog | planning | plan_ready | queued | running | paused | review | done | error`

Valid transitions enforced by: `src/shared/types/hub/transitions.ts`

> **Note:** `TaskStatus` in `src/shared/types/task.ts` is now a re-export of the Hub
> enum from `src/shared/types/hub/enums.ts`. Legacy on-disk statuses (`queue`,
> `in_progress`, `ai_review`, etc.) are auto-mapped to Hub values via
> `LEGACY_STATUS_MAP` when reading spec files.

---

## IPC Channels

### Invoke Channels (renderer → main)

| Channel | Input | Output | Purpose |
|---------|-------|--------|---------|
| `agent.startPlanning` | `{ taskId, projectPath, taskDescription, subProjectPath? }` | `{ sessionId, status: 'spawned' }` | Start planning agent |
| `agent.startExecution` | `{ taskId, projectPath, taskDescription, planRef?, subProjectPath? }` | `{ sessionId, status: 'spawned' }` | Start execution agent (with optional plan reference) |
| `agent.replanWithFeedback` | `{ taskId, projectPath, taskDescription, feedback, previousPlanPath?, subProjectPath? }` | `{ sessionId, status: 'spawned' }` | Re-plan with user feedback |
| `agent.killSession` | `{ sessionId }` | `{ success }` | Kill a running agent |
| `agent.restartFromCheckpoint` | `{ taskId, projectPath }` | `{ sessionId, status: 'spawned' }` | Resume from last checkpoint |
| `agent.getOrchestratorSession` | `{ taskId }` | `OrchestratorSession \| null` | Get session for a task |
| `agent.listOrchestratorSessions` | `{}` | `OrchestratorSession[]` | List all active sessions |

### Event Channels (main → renderer)

| Event | Payload | When |
|-------|---------|------|
| `event:agent.orchestrator.planReady` | `{ taskId, planSummary, planFilePath }` | Plan file detected after planning agent exits |
| `event:agent.orchestrator.progress` | `{ taskId, type, data, timestamp }` | JSONL progress entry (tool_use, phase_change) |
| `event:agent.orchestrator.stopped` | `{ taskId, reason, exitCode }` | Agent process exited |
| `event:agent.orchestrator.error` | `{ taskId, error }` | Agent errored |
| `event:agent.orchestrator.heartbeat` | `{ taskId, timestamp }` | Periodic heartbeat |
| `event:agent.orchestrator.watchdogAlert` | `{ type, sessionId, taskId, message, suggestedAction, timestamp }` | Watchdog detected stale/dead agent |

Contract source: `src/shared/ipc/agents/contract.ts`

---

## Key Files

### Backend (main process)

| File | Role |
|------|------|
| `src/main/services/tasks/types.ts` | `TaskRepository` interface and `TaskRepositoryDeps` |
| `src/main/services/tasks/task-repository.ts` | Local-first implementation — reads/writes via TaskService, mirrors to Hub when connected |
| `src/main/services/agent-orchestrator/agent-orchestrator.ts` | Spawns/kills Claude CLI processes, manages sessions |
| `src/main/services/agent-orchestrator/hooks-template.ts` | Merges progress-tracking hooks into `.claude/settings.local.json` |
| `src/main/services/agent-orchestrator/types.ts` | `AgentSession` interface (includes `originalSettingsContent`) |
| `src/main/services/agent-orchestrator/jsonl-progress-watcher.ts` | Watches JSONL files for progress entries |
| `src/main/ipc/handlers/agent-orchestrator-handlers.ts` | 7 IPC handlers (planning, execution, replan, kill, restart, get, list) — uses `taskRepository` for status updates |
| `src/main/ipc/handlers/tasks/hub-task-handlers.ts` | 8 `hub.tasks.*` IPC handlers — all proxy to `taskRepository` (local-first) |
| `src/main/bootstrap/event-wiring.ts` | Forwards orchestrator events → IPC; plan detection uses `taskRepository` for status + metadata updates |
| `src/main/bootstrap/service-registry.ts` | Creates and exposes all services including `taskRepository` |

### Frontend (renderer)

| File | Role |
|------|------|
| `src/renderer/features/tasks/api/useAgentMutations.ts` | 5 mutation hooks: `useStartPlanning`, `useStartExecution`, `useReplanWithFeedback`, `useKillAgent`, `useRestartFromCheckpoint` |
| `src/renderer/features/tasks/hooks/useAgentEvents.ts` | Subscribes to `event:agent.orchestrator.*` → invalidates React Query cache |
| `src/renderer/features/tasks/components/detail/PlanViewer.tsx` | Renders plan content + Approve/Request Changes buttons |
| `src/renderer/features/tasks/components/detail/PlanFeedbackDialog.tsx` | Textarea dialog for feedback when requesting plan changes |
| `src/renderer/features/tasks/components/cells/ActionsCell.tsx` | Brain icon (Start Planning), play icon (Start Execution), feedback actions |
| `src/renderer/features/tasks/components/detail/TaskDetailRow.tsx` | Expandable detail row — shows PlanViewer when plan exists |
| `src/renderer/features/tasks/components/grid/TaskDataGrid.tsx` | Main grid — wires `handleStartExecution` with `planRef` from metadata |

### Shared

| File | Role |
|------|------|
| `src/shared/ipc/agents/contract.ts` | Zod-validated invoke + event channel definitions |
| `src/shared/ipc/agents/schemas.ts` | `OrchestratorSessionSchema` (includes `originalSettingsContent`) |
| `src/shared/types/hub/enums.ts` | `TaskStatus` enum (authoritative) |
| `src/shared/types/hub/transitions.ts` | `isValidStatusTransition()`, `getValidNextStatuses()` |

### CLI Commands (used BY the application at runtime)

| File | Purpose |
|------|---------|
| `.claude/commands/plan-feature.md` | Prompt template for the planning agent — Claude CLI executes this via `/plan-feature` |
| `.claude/commands/resume-feature.md` | Prompt template for checkpoint recovery — executed via `/resume-feature` |
| `.claude/commands/implement-feature.md` | Prompt template for execution agent |

---

## How Plan Detection Works

When a planning-phase agent completes (exit code 0), `event-wiring.ts` runs `detectPlanFile()`:

1. **Strategy 1 — Log marker:** Scans the agent's log file (last line first) for `PLAN_FILE:<relative-path>`. The `/plan-feature` command is instructed to output this marker.
2. **Strategy 2 — Filesystem fallback:** Scans `docs/features/` for subdirectories containing `plan.md`, sorted reverse-alphabetically (most recent first).

If found:
- Reads the plan file content
- Calls `taskRepository.updateTaskStatus(taskId, 'plan_ready')` (local + Hub mirror)
- Calls `taskRepository.updateTask(taskId, { metadata: { planContent, planFilePath } })` (local + Hub mirror)
- Emits `event:agent.orchestrator.planReady` IPC event

---

## How Hooks Config Works

Claude CLI reads hooks from `.claude/settings.local.json` under the `hooks` key.

**On agent spawn:**
1. Read existing `.claude/settings.local.json` (if any)
2. Back up the original content in `session.originalSettingsContent`
3. Merge progress-tracking hooks (PostToolUse, Stop) into the `hooks` object
4. Write merged config back to `.claude/settings.local.json`

**On agent exit/kill:**
1. Check if other active sessions still need hooks
2. If no other sessions: restore `originalSettingsContent` (or delete the file if it didn't exist)
3. If other sessions exist: leave hooks in place

Source: `src/main/services/agent-orchestrator/hooks-template.ts`

---

## Re-plan with Feedback Flow

When the user clicks "Request Changes" in PlanViewer:

1. `PlanFeedbackDialog` opens — user types feedback text
2. On submit → `useReplanWithFeedback().mutate({ taskId, projectPath, taskDescription, feedback, previousPlanPath })`
3. Handler builds an augmented prompt:
   ```
   /plan-feature <description>

   IMPORTANT: A previous plan was rejected. The user provided this feedback:
   <feedback text>

   Previous plan is at: <plan file path>
   Read it and address the feedback.
   ```
4. Hub task status transitions: `plan_ready → planning`
5. New planning agent spawns — cycle repeats until approved

---

## Doc Classification

This project has two categories of documentation:

### Development Docs (`ai-docs/`)
For Claude instances and developers working **on** the application:
- `ARCHITECTURE.md` — System architecture
- `DATA-FLOW.md` — Data flow diagrams
- `FEATURES-INDEX.md` — Feature inventory
- `PATTERNS.md` — Code conventions
- `TASK-PLANNING-PIPELINE.md` — This file (pipeline reference)
- `AGENT-WORKFLOW.md` — Agent team orchestration workflow
- `LINTING.md` — ESLint rules
- `CODEBASE-GUARDIAN.md` — Structural rules
- `user-interface-flow.md` — UX flow and gap analysis

### Runtime Docs (`.claude/commands/`, `docs/features/`)
Used **by** the application at runtime (Claude CLI reads these):
- `.claude/commands/plan-feature.md` — Planning agent instructions
- `.claude/commands/resume-feature.md` — Resume agent instructions
- `.claude/commands/implement-feature.md` — Execution agent instructions
- `docs/features/<slug>/plan.md` — Generated plan files (output of planning agents)
