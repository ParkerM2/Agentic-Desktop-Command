# Feature Design: Codebase Separation of Concerns

**Author**: /create-feature-plan (brainstorming session)
**Created**: 2026-02-16
**Status**: READY FOR IMPLEMENTATION
**Workflow Mode**: standard

---

## 1. Overview

Claude-UI has grown to 56,000+ lines across 200+ source files. Several critical files have become
monoliths — `ipc-contract.ts` at 2,937 lines, `command-executor.ts` at 1,100 lines, `intent-classifier.ts`
at 721 lines — creating merge-conflict bottlenecks that prevent parallel AI agent work.

This refactor splits every file over ~350 lines into focused, single-responsibility modules organized in
domain folders with barrel (`index.ts`) exports. The primary goal is **AI development performance**: enabling
maximum parallel agent work without file conflicts. Secondary goals include human readability, runtime
performance (code splitting, memoization), and long-term maintainability.

**Key principle**: Every domain becomes a folder. Every folder gets an `index.ts` barrel. Every feature
gets a `FEATURE.md` that tells AI agents exactly where everything is and how to modify it.

## 2. Requirements

### Functional Requirements
- Zero behavior changes — pure structural refactor
- All existing imports must continue to work (barrels re-export same names)
- All 5 verification commands must pass after each tier of changes
- TypeScript strict mode catches any broken references

### Non-Functional Requirements
- **AI Agent Performance**: No two agents should need to edit the same file for different domain work
- **Merge Conflict Prevention**: Domain-scoped files mean additive changes don't conflict
- **Indexing Speed**: Small files (~100-300 lines) are faster for agents to read and understand
- **Runtime Performance**: Maintain current bundle size; barrel re-exports are tree-shaken by Vite
- **Human Readability**: Open a folder, see focused files with clear names

### Out of Scope
- Changing Electron's main/renderer/shared build separation
- Rewriting business logic or changing data flows
- Adding new features or fixing bugs (except incidental cleanup)
- Test file restructuring (deferred — user will handle later)

## 3. Architecture

### Selected Approach: Split-Within-Process

Keep the existing `src/main/`, `src/renderer/`, `src/shared/` process roots (required by electron-vite's
separate build targets). Within each root, organize by domain using folders with barrels.

**Why this approach:**
- Zero build config risk — electron-vite just works
- Maximum agent parallelism — each domain has its own files
- Backward-compatible — barrels re-export the same names
- Scales naturally — new domains just add a new folder

**Why NOT true co-location (src/features/tasks/ with main+renderer together):**
- electron-vite compiles main (CJS), preload (ESM), and renderer (bundled) separately
- Mixing process targets in one folder requires major build config rework
- Risk of breaking the build system outweighs the co-location benefit

### File Ownership Matrix — Summary

Every new file maps to exactly one domain. No file is shared between two agents working on different domains.

---

## 4. Task Breakdown

### Tier 1 — Critical (Merge-Conflict Bottlenecks)

---

#### Task #1: Split ipc-contract.ts into domain folders

**Wave**: 1
**Blocked by**: none
**Estimated complexity**: HIGH
**Current file**: `src/shared/ipc-contract.ts` (2,937 lines, 348 channels, ~88 Zod schemas)

**Target structure**:
```
src/shared/ipc/
├── index.ts              # Root barrel — merges all domain contracts + re-exports types
├── types.ts              # InvokeInput<T>, InvokeOutput<T>, EventPayload<T> utility types
├── common/
│   ├── index.ts
│   └── schemas.ts        # Shared Zod primitives reused across domains
│
├── tasks/
│   ├── index.ts          # Barrel: exports tasksInvoke, tasksEvents, all schemas
│   ├── contract.ts       # tasks.* + hub.tasks.* invoke channels + event channels
│   └── schemas.ts        # TaskStatusSchema, SubtaskSchema, TaskSchema, HubTaskSchema,
│                          #   ExecutionProgressSchema, TaskDraftSchema, TaskSuggestionSchema,
│                          #   TaskDecompositionResultSchema, GithubIssueImportSchema,
│                          #   HubTaskStatusSchema, HubTaskPrioritySchema, HubTaskProgressSchema
│
├── projects/
│   ├── index.ts
│   ├── contract.ts       # projects.* invoke + event channels
│   └── schemas.ts        # ProjectSchema, SubProjectSchema, RepoTypeSchema,
│                          #   RepoStructureSchema, ChildRepoSchema, RepoDetectionResultSchema
│
├── planner/
│   ├── index.ts
│   ├── contract.ts       # planner.* invoke + event channels
│   └── schemas.ts        # TimeBlockTypeSchema, TimeBlockSchema, ScheduledTaskSchema,
│                          #   DailyPlanSchema, WeeklyReviewSummarySchema, WeeklyReviewSchema
│
├── fitness/
│   ├── index.ts
│   ├── contract.ts       # fitness.* invoke + event channels
│   └── schemas.ts        # WorkoutTypeSchema, WeightUnitSchema, ExerciseSetSchema,
│                          #   ExerciseSchema, WorkoutSchema, BodyMeasurementSchema,
│                          #   FitnessGoalSchema, FitnessStatsSchema
│
├── settings/
│   ├── index.ts
│   ├── contract.ts       # settings.* invoke + event channels
│   └── schemas.ts        # AppSettingsSchema, ProfileSchema, WebhookConfigSchema,
│                          #   WebhookCommandSchema, WebhookCommandSourceContextSchema
│
├── assistant/
│   ├── index.ts
│   ├── contract.ts       # assistant.* invoke + event channels
│   └── schemas.ts        # IntentTypeSchema, AssistantActionSchema, AssistantContextSchema,
│                          #   AssistantResponseSchema, CommandHistoryEntrySchema
│
├── agents/
│   ├── index.ts
│   ├── contract.ts       # agents.* + agent.* invoke + event channels
│   └── schemas.ts        # AgentSessionSchema, TokenUsageSchema, AggregatedTokenUsageSchema,
│                          #   OrchestratorSessionSchema
│
├── auth/
│   ├── index.ts
│   ├── contract.ts       # auth.* invoke channels
│   └── schemas.ts        # (auth schemas if any exist in contract)
│
├── hub/
│   ├── index.ts
│   ├── contract.ts       # hub.* (connection/sync, non-task) invoke + event channels
│   └── schemas.ts        # Hub connection schemas
│
├── git/
│   ├── index.ts
│   ├── contract.ts       # git.* invoke + event channels
│   └── schemas.ts        # GitStatusSchema, GitBranchSchema, WorktreeSchema,
│                          #   MergeResultSchema, MergeDiffFileSchema, MergeDiffSummarySchema
│
├── github/
│   ├── index.ts
│   ├── contract.ts       # github.* invoke channels
│   └── schemas.ts        # GitHubLabelSchema, GitHubPullRequestSchema,
│                          #   GitHubIssueSchema, GitHubNotificationSchema
│
├── notifications/
│   ├── index.ts
│   ├── contract.ts       # notifications.* invoke + event channels
│   └── schemas.ts        # NotificationSourceSchema, NotificationSchema,
│                          #   SlackWatcherConfigSchema, GitHubWatcherConfigSchema,
│                          #   NotificationFilterSchema
│
├── email/
│   ├── index.ts
│   ├── contract.ts       # email.* invoke + event channels
│   └── schemas.ts        # EmailAttachmentSchema, EmailSchema, SmtpConfigSchema,
│                          #   EmailSendResultSchema, QueuedEmailSchema
│
├── claude/
│   ├── index.ts
│   ├── contract.ts       # claude.* invoke + event channels
│   └── schemas.ts        # ClaudeMessageSchema, ClaudeConversationSchema,
│                          #   ClaudeTokenUsageSchema, ClaudeSendMessageResponseSchema
│
├── terminals/
│   ├── index.ts
│   ├── contract.ts       # terminals.* invoke + event channels
│   └── schemas.ts        # TerminalSessionSchema
│
├── spotify/
│   ├── index.ts
│   ├── contract.ts       # spotify.* invoke channels
│   └── schemas.ts        # (spotify-specific schemas)
│
├── workflow/
│   ├── index.ts
│   ├── contract.ts       # workflow.* invoke + event channels
│   └── schemas.ts
│
├── qa/
│   ├── index.ts
│   ├── contract.ts       # qa.* invoke + event channels
│   └── schemas.ts
│
├── briefing/
│   ├── index.ts
│   ├── contract.ts       # briefing.* invoke + event channels
│   └── schemas.ts
│
├── app/
│   ├── index.ts
│   ├── contract.ts       # app.* invoke + event channels
│   └── schemas.ts
│
├── misc/
│   ├── index.ts          # Barrel for all small domains
│   ├── voice/
│   │   ├── index.ts
│   │   └── contract.ts   # voice.* channels
│   ├── screen/
│   │   ├── index.ts
│   │   └── contract.ts   # screen.* channels
│   ├── notes/
│   │   ├── index.ts
│   │   ├── contract.ts   # notes.* channels
│   │   └── schemas.ts    # NoteSchema
│   ├── ideas/
│   │   ├── index.ts
│   │   ├── contract.ts   # ideas.* channels
│   │   └── schemas.ts    # IdeaSchema, IdeaStatusSchema, IdeaCategorySchema
│   ├── milestones/
│   │   ├── index.ts
│   │   ├── contract.ts   # milestones.* channels
│   │   └── schemas.ts    # MilestoneSchema, MilestoneStatusSchema, MilestoneTaskSchema
│   ├── merge/
│   │   ├── index.ts
│   │   └── contract.ts   # merge.* channels
│   ├── insights/
│   │   ├── index.ts
│   │   ├── contract.ts   # insights.* channels
│   │   └── schemas.ts    # InsightMetricsSchema, InsightTimeSeriesSchema, etc.
│   ├── changelog/
│   │   ├── index.ts
│   │   ├── contract.ts   # changelog.* channels
│   │   └── schemas.ts    # ChangeTypeSchema, ChangeCategorySchema, ChangelogEntrySchema
│   ├── alerts/
│   │   ├── index.ts
│   │   ├── contract.ts   # alerts.* channels
│   │   └── schemas.ts    # AlertTypeSchema, AlertSchema, RecurringConfigSchema
│   ├── devices/
│   │   ├── index.ts
│   │   └── contract.ts   # devices.* channels
│   ├── workspaces/
│   │   ├── index.ts
│   │   └── contract.ts   # workspaces.* channels
│   ├── mcp/
│   │   ├── index.ts
│   │   └── contract.ts   # mcp.* channels
│   ├── hotkeys/
│   │   ├── index.ts
│   │   └── contract.ts   # hotkeys.* channels
│   └── time/
│       ├── index.ts
│       └── contract.ts   # time.* channels
```

**Root barrel pattern** (`src/shared/ipc/index.ts`):
```typescript
// Import domain contracts
import { tasksInvoke, tasksEvents } from './tasks';
import { projectsInvoke, projectsEvents } from './projects';
import { plannerInvoke, plannerEvents } from './planner';
// ... all domains

// Merge into single contracts (backward compat)
export const ipcInvokeContract = {
  ...tasksInvoke,
  ...projectsInvoke,
  ...plannerInvoke,
  // ... spread all domains
} as const;

export const ipcEventContract = {
  ...tasksEvents,
  ...projectsEvents,
  ...plannerEvents,
  // ... spread all domains
} as const;

// Re-export type utilities
export type { InvokeInput, InvokeOutput, EventPayload } from './types';

// Re-export schemas for direct imports
export * from './tasks';
export * from './projects';
// ... all domains
```

**Domain contract file pattern** (e.g., `src/shared/ipc/tasks/contract.ts`):
```typescript
import { z } from 'zod';
import { TaskSchema, HubTaskSchema, ... } from './schemas';

export const tasksInvoke = {
  'tasks.list': { input: z.object({ projectId: z.string() }), output: z.array(TaskSchema) },
  'tasks.get': { ... },
  'hub.tasks.list': { ... },
  // ... all tasks.* and hub.tasks.* channels
} as const;

export const tasksEvents = {
  'event:task.statusChanged': { payload: z.object({ taskId: z.string(), projectId: z.string() }) },
  // ... all task event channels
} as const;
```

**Migration path**:
1. Create `src/shared/ipc/` folder structure
2. Extract schemas domain by domain into `schemas.ts` files
3. Extract channels domain by domain into `contract.ts` files
4. Create barrels for each domain
5. Create root barrel that merges all and re-exports
6. Update the single import in existing code: `from '@shared/ipc-contract'` → `from '@shared/ipc'`
7. Optionally keep `ipc-contract.ts` as a thin re-export for gradual migration
8. Run full verification suite

**Acceptance Criteria**:
- [ ] All 348 IPC channels accounted for in domain files
- [ ] All ~88 Zod schemas extracted to domain schema files
- [ ] Root barrel produces identical merged contracts
- [ ] All existing `import from '@shared/ipc-contract'` still works (via alias or re-export)
- [ ] `npm run lint && npm run typecheck && npm run test && npm run build && npm run check:docs` passes

---

#### Task #2: Split command-executor.ts into domain executors

**Wave**: 1 (parallel with Task #1)
**Blocked by**: none
**Estimated complexity**: HIGH
**Current file**: `src/main/services/assistant/command-executor.ts` (1,100 lines, 20+ handler functions)

**Target structure**:
```
src/main/services/assistant/executors/
├── index.ts               # Barrel: exports executeCommand()
├── router.ts              # Routes ClassifiedIntent → domain executor (~80 lines)
├── response-builders.ts   # buildErrorResponse, buildTextResponse, buildActionResponse (~40 lines)
├── task.executor.ts       # handleCreateTask (~60 lines)
├── planner.executor.ts    # handleCreateTimeBlock, executePlanner (~80 lines)
├── notes.executor.ts      # handleNotes, handleStandup, executeNotes (~80 lines)
├── fitness.executor.ts    # executeFitness (~60 lines)
├── email.executor.ts      # executeEmail (~60 lines)
├── github.executor.ts     # executeGitHub (~60 lines)
├── spotify.executor.ts    # handleSpotify (~50 lines)
├── calendar.executor.ts   # executeCalendar (~60 lines)
├── briefing.executor.ts   # executeBriefing (~40 lines)
├── insights.executor.ts   # executeInsights (~30 lines)
├── ideation.executor.ts   # executeIdeation (~40 lines)
├── milestones.executor.ts # executeMilestones (~40 lines)
├── watch.executor.ts      # handleWatchCreate/Remove/List, executeWatch (~100 lines)
├── device.executor.ts     # executeDeviceQuery (~30 lines)
├── reminder.executor.ts   # handleReminder (~20 lines)
├── search.executor.ts     # handleSearch (~40 lines)
└── launcher.executor.ts   # handleLauncher (~30 lines)
```

**Router pattern** (`router.ts`):
```typescript
import type { ClassifiedIntent } from '../intent-classifier';
import type { CommandExecutorDeps } from './types';
import { executeTask } from './task.executor';
import { executePlanner } from './planner.executor';
// ... all domain executors

export async function executeCommand(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
  context?: AssistantContext,
): Promise<AssistantResponse> {
  switch (intent.type) {
    case 'task_creation': return executeTask(intent, deps, context);
    case 'planner': return executePlanner(intent, deps, context);
    // ... all intent types
    default: return buildErrorResponse(`Unknown intent: ${intent.type}`);
  }
}
```

**Acceptance Criteria**:
- [ ] All 20+ handler functions extracted to domain executor files
- [ ] Router dispatches to correct executor for every intent type
- [ ] Response builder functions shared via import
- [ ] CommandExecutorDeps type extracted to shared types file
- [ ] Full verification suite passes

---

#### Task #3: Split intent-classifier.ts into domain patterns

**Wave**: 1 (parallel with Tasks #1 and #2)
**Blocked by**: none
**Estimated complexity**: MEDIUM
**Current file**: `src/main/services/assistant/intent-classifier.ts` (721 lines)

**Target structure**:
```
src/main/services/assistant/intent-classifier/
├── index.ts              # Barrel: exports classifyIntent, ClassifiedIntent
├── classifier.ts         # Main classifyIntent() + actionToIntentType() (~120 lines)
├── helpers.ts            # extractTaskId, stripPrefix, resolveWatchCondition, getTimeParser (~60 lines)
├── types.ts              # ClassifiedIntent interface + related types (~30 lines)
├── patterns/
│   ├── index.ts          # Barrel: exports all pattern match functions
│   ├── task.patterns.ts
│   ├── planner.patterns.ts
│   ├── fitness.patterns.ts
│   ├── notes.patterns.ts
│   ├── email.patterns.ts
│   ├── github.patterns.ts
│   ├── spotify.patterns.ts
│   ├── calendar.patterns.ts
│   ├── watch.patterns.ts
│   ├── device.patterns.ts
│   └── misc.patterns.ts   # All remaining small-domain patterns
```

**Acceptance Criteria**:
- [ ] Pattern matching logic separated by domain
- [ ] classifyIntent() delegates to domain pattern matchers
- [ ] Helper functions extracted and shared
- [ ] ClassifiedIntent type exported from types.ts
- [ ] Full verification suite passes

---

### Tier 2 — High (Infrastructure Files)

---

#### Task #4: Split main/index.ts into bootstrap modules

**Wave**: 2
**Blocked by**: Task #1 (IPC contract split affects import paths)
**Estimated complexity**: MEDIUM
**Current file**: `src/main/index.ts` (657 lines)

**Target structure**:
```
src/main/
├── index.ts                   # Slim entry: createWindow + app.whenReady (~100 lines)
├── bootstrap/
│   ├── index.ts               # Barrel
│   ├── service-registry.ts    # Creates all ~40 services, returns typed registry (~200 lines)
│   ├── ipc-wiring.ts          # Registers all IPC handlers with router (~80 lines)
│   ├── event-wiring.ts        # Wires inter-service events (watchdog, progress, watch evaluator) (~120 lines)
│   └── lifecycle.ts           # app.on('before-quit'), cleanup, window focus events (~80 lines)
```

**Service registry pattern**:
```typescript
export interface ServiceRegistry {
  settingsService: SettingsService;
  taskService: TaskService;
  agentService: AgentService;
  // ... all 40 services typed
}

export function createServiceRegistry(dataDir: string, router: IpcRouter): ServiceRegistry {
  const settingsService = createSettingsService();
  const hubApiClient = createHubApiClient(settingsService);
  // ... all service creation in dependency order
  return { settingsService, hubApiClient, ... };
}
```

**Acceptance Criteria**:
- [ ] `index.ts` reduced to ~100 lines (window creation + app lifecycle)
- [ ] All service creation in `service-registry.ts`
- [ ] All IPC handler registration in `ipc-wiring.ts`
- [ ] All event wiring in `event-wiring.ts`
- [ ] App lifecycle (before-quit, cleanup) in `lifecycle.ts`
- [ ] Full verification suite passes

---

#### Task #5: Split hub-protocol.ts into domain types

**Wave**: 2 (parallel with Task #4)
**Blocked by**: none
**Estimated complexity**: MEDIUM
**Current file**: `src/shared/types/hub-protocol.ts` (621 lines)

**Target structure**:
```
src/shared/types/hub/
├── index.ts             # Barrel: re-exports everything
├── enums.ts             # TaskStatus, TaskPriority, DeviceStatus, etc. (~30 lines)
├── auth.ts              # HubUser, AuthTokens, LoginRequest, RegisterRequest (~60 lines)
├── devices.ts           # HubDevice, DeviceHeartbeat, DeviceRequest (~60 lines)
├── workspaces.ts        # HubWorkspace, WorkspaceRequest, WorkspaceResponse (~50 lines)
├── projects.ts          # HubProject, ProjectRequest, ProjectResponse (~60 lines)
├── tasks.ts             # HubTask, TaskRequest, TaskResponse, TaskProgress (~100 lines)
├── events.ts            # WebSocket event types, WsMessage unions (~80 lines)
├── errors.ts            # HubApiError, ErrorResponse (~30 lines)
├── guards.ts            # Type guard functions (isWsTaskEvent, isWsDeviceEvent, etc.) (~60 lines)
├── transitions.ts       # VALID_TRANSITIONS, isValidTransition() (~40 lines)
└── legacy.ts            # Deprecated types (Computer*, DeviceAuth*) — marked for removal (~50 lines)
```

**Acceptance Criteria**:
- [ ] All types from hub-protocol.ts accounted for in domain files
- [ ] Barrel re-exports all types under same names
- [ ] Legacy/deprecated types isolated in `legacy.ts`
- [ ] All imports from `@shared/types/hub-protocol` updated or barrel re-exports
- [ ] Full verification suite passes

---

#### Task #6: Split task-handlers.ts

**Wave**: 2 (parallel with Tasks #4, #5)
**Blocked by**: Task #1 (depends on new IPC contract imports)
**Estimated complexity**: LOW
**Current file**: `src/main/ipc/handlers/task-handlers.ts` (331 lines)

**Target structure**:
```
src/main/ipc/handlers/tasks/
├── index.ts               # Barrel: exports registerTaskHandlers
├── hub-task-handlers.ts   # hub.tasks.* handlers (~120 lines)
├── legacy-task-handlers.ts # tasks.* (forwarding to Hub) handlers (~120 lines)
├── status-mapping.ts      # STATUS_MAP, mapHubStatusToLocal, mapLocalStatusToHub (~40 lines)
└── task-transform.ts      # transformHubTask() hub→local Task mapping (~60 lines)
```

**Acceptance Criteria**:
- [ ] Hub task handlers and legacy handlers in separate files
- [ ] Status mapping and transform functions extracted as shared utilities
- [ ] `registerTaskHandlers` function exported from barrel
- [ ] Full verification suite passes

---

#### Task #7: Split router.tsx into route groups

**Wave**: 2 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/renderer/app/router.tsx` (336 lines)

**Target structure**:
```
src/renderer/app/
├── router.tsx             # Root tree assembly only (~60 lines)
├── routes/
│   ├── index.ts           # Barrel
│   ├── auth.routes.ts     # Login, register, redirect-if-authenticated (~30 lines)
│   ├── dashboard.routes.ts # Dashboard, my-work routes (~30 lines)
│   ├── project.routes.ts  # Project list + nested project views (~70 lines)
│   ├── productivity.routes.ts # Planner, notes, alerts, calendar (~40 lines)
│   ├── communication.routes.ts # Communications, GitHub (~20 lines)
│   ├── settings.routes.ts # Settings page route (~15 lines)
│   └── misc.routes.ts     # Fitness, briefing, roadmap, onboarding, etc. (~50 lines)
```

**Acceptance Criteria**:
- [ ] Each route group in its own file
- [ ] `router.tsx` only assembles the tree from imported route groups
- [ ] All route paths still work identically
- [ ] Full verification suite passes

---

### Tier 3 — Medium (Large Services)

---

#### Task #8: Split briefing-service.ts

**Wave**: 3
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/main/services/briefing/briefing-service.ts` (511 lines)

**Target structure**:
```
src/main/services/briefing/
├── index.ts                # Barrel
├── briefing-service.ts     # Main service orchestrator (~150 lines)
├── briefing-generator.ts   # generateBriefing logic (~150 lines)
├── suggestion-engine.ts    # Already exists — may need more extraction
├── briefing-cache.ts       # Daily cache logic (~80 lines)
└── briefing-config.ts      # Config loading/saving (~60 lines)
```

---

#### Task #9: Split email-service.ts

**Wave**: 3 (parallel with Task #8)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/main/services/email/email-service.ts` (502 lines)

**Target structure**:
```
src/main/services/email/
├── index.ts               # Barrel
├── email-service.ts       # Main service API (~150 lines)
├── smtp-transport.ts      # SMTP connection, createTransporter, sendMail (~120 lines)
├── email-queue.ts         # Queue management, processQueue, scheduling (~100 lines)
├── email-encryption.ts    # encryptSecret, decryptSecret, isEncryptedEntry (~80 lines)
└── email-store.ts         # loadEmailStore, saveEmailStore, file I/O (~80 lines)
```

---

#### Task #10: Split notification-watcher.ts

**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/main/services/notifications/notification-watcher.ts` (458 lines)

**Target structure**:
```
src/main/services/notifications/
├── index.ts                  # Barrel
├── notification-manager.ts   # Manager/orchestrator, start/stop (~100 lines)
├── notification-store.ts     # JSON persistence, load/save (~80 lines)
├── notification-filter.ts    # matchesFilter, config defaults (~80 lines)
├── slack-watcher.ts          # Already separate (342 lines)
└── github-watcher.ts         # Already separate (355 lines)
```

---

#### Task #11: Split settings-service.ts

**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/main/services/settings/settings-service.ts` (362 lines)

**Target structure**:
```
src/main/services/settings/
├── index.ts                 # Barrel
├── settings-service.ts      # Public API (~120 lines)
├── settings-store.ts        # File I/O: loadSettingsFile, saveSettingsFile (~100 lines)
├── settings-encryption.ts   # Webhook secret encryption/decryption (~80 lines)
└── settings-defaults.ts     # Default values, schema validation (~60 lines)
```

---

#### Task #12: Split hub-connection.ts

**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/main/services/hub/hub-connection.ts` (426 lines)

**Target structure**:
```
src/main/services/hub/
├── index.ts                # Barrel (already exists — update)
├── hub-connection.ts       # Manager/facade (~150 lines)
├── hub-ws-client.ts        # WebSocket client + reconnect logic (~120 lines)
├── hub-config-store.ts     # Encrypted config persistence, load/save (~80 lines)
├── hub-event-mapper.ts     # configToConnection, emitTaskEvent helpers (~80 lines)
├── hub-api-client.ts       # Already exists (290 lines)
├── hub-auth-service.ts     # Already exists (298 lines)
├── hub-sync.ts             # Already exists (260 lines)
└── webhook-relay.ts        # Already exists
```

---

#### Task #13: Split agent-service.ts

**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/main/services/agent/agent-service.ts` (396 lines)

**Target structure**:
```
src/main/services/agent/
├── index.ts              # Barrel
├── agent-service.ts      # Public API + orchestration (~150 lines)
├── agent-spawner.ts      # spawnAgent, process management, shell detection (~120 lines)
├── agent-output-parser.ts # parseClaudeOutput, matchesAny (~40 lines)
├── agent-queue.ts        # Already exists — processQueueInternal logic
└── agent-types.ts        # AgentSession-related types (~30 lines)
```

---

#### Task #14: Split task-service.ts

**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/main/services/project/task-service.ts` (359 lines)

**Target structure**:
```
src/main/services/project/
├── index.ts             # Barrel
├── task-service.ts      # Public API (~120 lines)
├── task-store.ts        # readTask, readJsonFile, file I/O (~80 lines)
├── task-spec-parser.ts  # Plan/spec parsing, getPhaseStatus (~80 lines)
├── task-slug.ts         # slugify, getNextNum (~30 lines)
└── project-service.ts   # Already exists (separate file)
```

---

#### Task #15: Split qa-runner.ts

**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/main/services/qa/qa-runner.ts` (332 lines)

**Target structure**:
```
src/main/services/qa/
├── index.ts             # Barrel
├── qa-runner.ts         # Public API + orchestration (~100 lines)
├── qa-quiet.ts          # Quiet/background QA tier logic (~100 lines)
├── qa-full.ts           # Full/interactive QA tier logic (~100 lines)
└── qa-report.ts         # Report generation, storage (~60 lines)
```

---

### Tier 4 — Polish (Large Components)

---

#### Task #16: Split ChangelogPage.tsx

**Wave**: 4
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/renderer/features/changelog/components/ChangelogPage.tsx` (447 lines, 6 inline components)

**Target structure**:
```
src/renderer/features/changelog/components/
├── ChangelogPage.tsx       # Main page (~120 lines)
├── VersionCard.tsx         # Single version entry display (~80 lines)
├── CategorySection.tsx     # Category grouping component (~40 lines)
├── GenerateForm.tsx        # AI changelog generation form (~80 lines)
├── EditableCategory.tsx    # Edit mode category component (~60 lines)
└── EntryPreview.tsx        # Preview/edit mode component (~60 lines)
```

---

#### Task #17: Split SettingsPage.tsx

**Wave**: 4 (parallel with Task #16)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/renderer/features/settings/components/SettingsPage.tsx` (354 lines)

Likely contains inline sub-components for different settings sections.

---

#### Task #18: Split WeeklyReviewPage.tsx

**Wave**: 4 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/renderer/features/planner/components/WeeklyReviewPage.tsx` (462 lines)

---

#### Task #19: Split ProjectInitWizard.tsx

**Wave**: 4 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/renderer/features/projects/components/ProjectInitWizard.tsx` (466 lines)

---

#### Task #20: Split WebhookSettings.tsx

**Wave**: 4 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/renderer/features/settings/components/WebhookSettings.tsx` (452 lines)

---

#### Task #21: Split OAuthProviderSettings.tsx

**Wave**: 4 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Current file**: `src/renderer/features/settings/components/OAuthProviderSettings.tsx` (375 lines)

---

### Tier 5 — Documentation

---

#### Task #22: Add FEATURE.md to every feature domain

**Wave**: 5
**Blocked by**: Tasks #1-#21 (structure must be finalized)
**Estimated complexity**: MEDIUM

Add a `FEATURE.md` to each feature's primary folder explaining:
- What the feature does
- Folder structure with file descriptions
- Data flow (user action → IPC → service → response → cache → UI)
- How to add a new channel/command/component
- Key types and where they live
- Cross-references to related features

**Files to create** (one per major feature):
- `src/shared/ipc/FEATURE.md` — IPC contract overview
- `src/shared/ipc/tasks/FEATURE.md` — Tasks domain
- `src/main/services/assistant/FEATURE.md` — Assistant system
- `src/main/services/hub/FEATURE.md` — Hub connection system
- `src/main/services/agent-orchestrator/FEATURE.md` — Agent orchestrator
- `src/main/services/notifications/FEATURE.md` — Notification watchers
- `src/main/services/email/FEATURE.md` — Email system
- `src/main/services/briefing/FEATURE.md` — Briefing system
- `src/main/bootstrap/FEATURE.md` — Service bootstrap/wiring
- `src/renderer/features/tasks/FEATURE.md` — Task UI
- `src/renderer/features/settings/FEATURE.md` — Settings UI
- `src/renderer/features/planner/FEATURE.md` — Planner UI
- `src/renderer/features/changelog/FEATURE.md` — Changelog UI
- `src/renderer/app/routes/FEATURE.md` — Router structure

**FEATURE.md template**:
```markdown
# <Feature Name>

## Purpose
<One-paragraph description>

## Structure
| File | Purpose | Lines |
|------|---------|-------|
| `contract.ts` | IPC channel definitions | ~80 |
| `schemas.ts` | Zod validation schemas | ~60 |
| ... | ... | ... |

## Data Flow
1. <Step 1>
2. <Step 2>
3. ...

## How to Add a New <X>
1. <Step 1>
2. <Step 2>
3. ...

## Key Types
- `TypeName` — `path/to/file.ts` — Description
- ...

## Related Features
- [Feature B](../path/) — How they interact
```

---

#### Task #23: Update ai-docs for new structure

**Wave**: 5 (parallel with Task #22)
**Blocked by**: Tasks #1-#21

Update these documentation files:
- `ai-docs/FEATURES-INDEX.md` — Update file paths and counts
- `ai-docs/ARCHITECTURE.md` — Update folder structure diagram
- `ai-docs/CODEBASE-GUARDIAN.md` — Update file placement rules
- `ai-docs/DATA-FLOW.md` — Update import paths in examples
- `CLAUDE.md` — Update quick reference paths

---

## 5. Wave Plan

### Wave 1: Foundation (no blockers) — 3 tasks, all parallel
- **Task #1**: Split `ipc-contract.ts` into domain folders
- **Task #2**: Split `command-executor.ts` into domain executors
- **Task #3**: Split `intent-classifier.ts` into domain patterns

### Wave 2: Infrastructure (blocked by Wave 1) — 4 tasks, all parallel
- **Task #4**: Split `main/index.ts` into bootstrap modules
- **Task #5**: Split `hub-protocol.ts` into domain types
- **Task #6**: Split `task-handlers.ts` into domain handlers
- **Task #7**: Split `router.tsx` into route groups

### Wave 3: Services (no blockers) — 8 tasks, all parallel
- **Task #8**: Split `briefing-service.ts`
- **Task #9**: Split `email-service.ts`
- **Task #10**: Split `notification-watcher.ts`
- **Task #11**: Split `settings-service.ts`
- **Task #12**: Split `hub-connection.ts`
- **Task #13**: Split `agent-service.ts`
- **Task #14**: Split `task-service.ts`
- **Task #15**: Split `qa-runner.ts`

### Wave 4: Components (no blockers) — 6 tasks, all parallel
- **Task #16**: Split `ChangelogPage.tsx`
- **Task #17**: Split `SettingsPage.tsx`
- **Task #18**: Split `WeeklyReviewPage.tsx`
- **Task #19**: Split `ProjectInitWizard.tsx`
- **Task #20**: Split `WebhookSettings.tsx`
- **Task #21**: Split `OAuthProviderSettings.tsx`

### Wave 5: Documentation (blocked by all above) — 2 tasks, parallel
- **Task #22**: Add FEATURE.md to every domain folder
- **Task #23**: Update ai-docs for new structure

### Dependency Graph

```
Wave 1:  #1 IPC ──────────┐
         #2 Executor ──────┤──> Wave 2:  #4 Bootstrap
         #3 Classifier ────┘             #5 Hub Protocol
                                         #6 Task Handlers
                                         #7 Router

Wave 3:  #8 Briefing ─────┐
         #9 Email ─────────┤
         #10 Notifications ┤
         #11 Settings ─────┤──> (all independent, no blockers)
         #12 Hub Connection┤
         #13 Agent Service ┤
         #14 Task Service ─┤
         #15 QA Runner ────┘

Wave 4:  #16-#21 Components ──> (all independent)

Wave 5:  #22 FEATURE.md ──────> (blocked by ALL above)
         #23 ai-docs update ──> (blocked by ALL above)
```

**Note**: Waves 3 and 4 can actually run in parallel with Wave 2, since they don't
depend on index.ts or hub-protocol changes. The Team Leader can optimize this.

---

## 6. File Ownership Matrix

### New files created (by task):

| Task | Files Created | Domain |
|------|--------------|--------|
| #1 | ~70 files in `src/shared/ipc/` | IPC contracts |
| #2 | ~20 files in `src/main/services/assistant/executors/` | Assistant executors |
| #3 | ~15 files in `src/main/services/assistant/intent-classifier/` | Intent classification |
| #4 | 5 files in `src/main/bootstrap/` | Bootstrap modules |
| #5 | 11 files in `src/shared/types/hub/` | Hub protocol types |
| #6 | 5 files in `src/main/ipc/handlers/tasks/` | Task handlers |
| #7 | 8 files in `src/renderer/app/routes/` | Route groups |
| #8-#15 | 3-5 files each in respective service dirs | Service splits |
| #16-#21 | 3-6 files each in respective component dirs | Component splits |
| #22 | ~14 FEATURE.md files | Documentation |
| #23 | 5 updated docs | Documentation |

**No two tasks create files in the same folder** — maximum parallel safety.

---

## 7. Context Budget

| Task | Estimated | Files | Notes |
|------|-----------|-------|-------|
| #1 | HIGH (~30K) | ~70 new files | Largest task — may need splitting into sub-tasks per domain group |
| #2 | MEDIUM (~18K) | ~20 new files | Extract functions, create router |
| #3 | MEDIUM (~15K) | ~15 new files | Extract pattern matches |
| #4 | MEDIUM (~15K) | 5 new files | Restructure index.ts |
| #5 | MEDIUM (~12K) | 11 new files | Extract types |
| #6 | LOW (~10K) | 5 new files | Split handler file |
| #7 | LOW (~10K) | 8 new files | Split route definitions |
| #8-#15 | LOW (~8K each) | 3-5 each | Service decomposition |
| #16-#21 | LOW (~8K each) | 3-6 each | Component extraction |
| #22-#23 | LOW (~10K each) | Documentation | Writing, not code |

**Task #1 may need splitting** — 2,937 lines across 30 domains is a lot for one context window.
Suggested sub-split: Group A (tasks, projects, planner, fitness, settings) and
Group B (remaining domains) + Group C (root barrel + types).

---

## 8. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Barrel re-exports don't produce identical contract types | Medium | High | TypeScript strict mode catches type mismatches; test existing consumers |
| Import path changes break 200+ files | Low | High | Use `@shared/ipc` alias + keep `ipc-contract.ts` as thin re-export during migration |
| Circular dependencies in domain schema imports | Medium | Medium | `common/schemas.ts` for truly shared primitives; lint rule to prevent cross-domain schema imports |
| electron-vite tree-shaking breaks with barrel pattern | Low | Low | Vite handles barrel re-exports well; verify bundle size stays same |

### Scope Risks

| Risk | Mitigation |
|------|----------|
| Task #1 too large for one agent context | Split into sub-tasks by domain groups |
| Refactor accidentally changes behavior | Zero logic changes — pure structural moves; diff review shows only file moves |
| FEATURE.md becomes stale | `check:docs` script can be extended to verify FEATURE.md freshness |

### Integration Risks

| Risk | Mitigation |
|------|----------|
| Two agents split the same file differently | File ownership matrix ensures no overlaps |
| Barrel imports increase bundle size | Vite tree-shakes unused re-exports; verify with `npm run build` |
| Tests reference old file paths | Tests import from barrel (public API), not internal files |

---

## 9. QA Strategy

### Per-Task QA
Every task must pass all 5 verification commands before merge:
```bash
npm run lint && npm run typecheck && npm run test && npm run build && npm run check:docs
```

### Feature-Specific QA Checks
- [ ] All 348 IPC channels accounted for (count check)
- [ ] All ~88 Zod schemas accounted for (count check)
- [ ] Merged `ipcInvokeContract` and `ipcEventContract` produce identical TypeScript types
- [ ] Bundle size delta < 5% (barrel overhead)
- [ ] No circular dependency warnings from ESLint
- [ ] All FEATURE.md files follow template structure
- [ ] `import from '@shared/ipc-contract'` still works (backward compat)

### Guardian Focus Areas
- No files in wrong process root (main code in renderer, etc.)
- No cross-domain imports within IPC domain folders (tasks/ should not import from planner/)
- Barrel exports match file contents (nothing missing)

---

## 10. Implementation Notes

### Path Alias Update
Add `@shared/ipc` alias pointing to `src/shared/ipc/` in electron-vite config.
Keep `@shared/ipc-contract` as alias to `src/shared/ipc/index.ts` for backward compat.

### Gradual Migration Strategy
1. Create new structure alongside old `ipc-contract.ts`
2. Have new barrel re-export everything old file exported
3. Update `ipc-contract.ts` to just re-export from new barrel
4. Gradually update imports across codebase to use new paths
5. Delete `ipc-contract.ts` when all imports are migrated

### Existing Patterns to Follow
- **Barrel exports**: Every existing feature module uses `index.ts` barrels — follow same pattern
- **Zod schemas**: Keep `z.object()` / `z.enum()` pattern — don't switch to different validation
- **Service factory**: Keep `createXxxService()` factory function pattern
- **Handler registration**: Keep `router.handle()` pattern in handler files

### What NOT to Change
- Business logic inside any function
- IPC channel names or schemas
- React component props or behavior
- Test files (deferred per user request)
- Build configuration (except path alias addition)
