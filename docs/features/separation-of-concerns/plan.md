# Feature Design: Codebase Separation of Concerns

> Tracker Key: `separation-of-concerns` | Status: **APPROVED** | Created: 2026-02-16

**Workflow Mode**: standard
**Team Lead**: Orchestrator (delegates to parallel agents per wave)

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

### Barrel Re-export Strategy

The root barrel (`src/shared/ipc/index.ts`) merges all domain contracts via spread:
```typescript
export const ipcInvokeContract = { ...tasksInvoke, ...projectsInvoke, ... } as const;
export const ipcEventContract = { ...tasksEvents, ...projectsEvents, ... } as const;
```

The old `src/shared/ipc-contract.ts` becomes a thin re-export during migration, then is deleted.

### Path Alias Update
Add `@shared/ipc` alias in electron-vite config pointing to `src/shared/ipc/`.
Keep `@shared/ipc-contract` as backward-compat alias to `src/shared/ipc/index.ts`.

---

## 4. Task Breakdown

### Wave 1: Foundation — 5 parallel tasks (no blockers)

> **All Wave 1 tasks run simultaneously.** Each agent works on a completely separate folder.

---

#### Task #1A: Split ipc-contract.ts — Core domains (schemas + contracts)

**Agent**: `schema-designer`
**Wave**: 1
**Blocked by**: none
**Estimated complexity**: HIGH
**Context budget**: ~18,000 tokens (files: 10)

**Description**:
Extract the following domains from `src/shared/ipc-contract.ts` into `src/shared/ipc/<domain>/`:
tasks, projects, planner, fitness, settings, assistant, agents, auth.
Each domain gets a folder with `index.ts` (barrel), `contract.ts` (channels), `schemas.ts` (Zod schemas).

**Files to Create**:
- `src/shared/ipc/types.ts` — InvokeInput, InvokeOutput, EventPayload utility types
- `src/shared/ipc/common/index.ts` — Barrel for shared primitives
- `src/shared/ipc/common/schemas.ts` — Shared Zod primitives (z.string().uuid() patterns)
- `src/shared/ipc/tasks/index.ts` — Barrel
- `src/shared/ipc/tasks/contract.ts` — tasks.* + hub.tasks.* invoke + event channels
- `src/shared/ipc/tasks/schemas.ts` — TaskSchema, SubtaskSchema, HubTaskSchema, ExecutionProgressSchema, etc.
- `src/shared/ipc/projects/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/planner/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/fitness/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/settings/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/assistant/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/agents/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/auth/index.ts`, `contract.ts`, `schemas.ts`

**Files to Read for Context**:
- `src/shared/ipc-contract.ts` — Source file (lines 1-1500 for schemas, relevant channel sections)
- `CLAUDE.md` — ESLint rules, import order

**Acceptance Criteria**:
- [ ] All schemas for the 8 domains extracted to domain `schemas.ts` files
- [ ] All invoke + event channels for the 8 domains extracted to `contract.ts` files
- [ ] Each domain barrel exports `<domain>Invoke`, `<domain>Events`, and all schemas
- [ ] Types utility file exports InvokeInput, InvokeOutput, EventPayload
- [ ] `npm run typecheck` passes (schemas referenced correctly)

---

#### Task #1B: Split ipc-contract.ts — Remaining domains

**Agent**: `schema-designer`
**Wave**: 1
**Blocked by**: none
**Estimated complexity**: HIGH
**Context budget**: ~18,000 tokens (files: 10)

**Description**:
Extract remaining domains from `src/shared/ipc-contract.ts` into `src/shared/ipc/<domain>/`:
hub, git, github, notifications, email, claude, terminals, spotify, workflow, qa, briefing, app.
Also create `src/shared/ipc/misc/` for small domains: voice, screen, notes, ideas, milestones, merge,
insights, changelog, alerts, devices, workspaces, mcp, hotkeys, time.

**Files to Create**:
- `src/shared/ipc/hub/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/git/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/github/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/notifications/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/email/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/claude/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/terminals/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/spotify/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/workflow/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/qa/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/briefing/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/app/index.ts`, `contract.ts`, `schemas.ts`
- `src/shared/ipc/misc/` — subdirs for voice, screen, notes, ideas, milestones, merge, insights, changelog, alerts, devices, workspaces, mcp, hotkeys, time (each with index.ts + contract.ts, schemas.ts if needed)
- `src/shared/ipc/misc/index.ts` — Barrel for all misc domains

**Files to Read for Context**:
- `src/shared/ipc-contract.ts` — Source file (lines 1500-2937 for remaining channels)

**Acceptance Criteria**:
- [ ] All remaining schemas and channels extracted to domain folders
- [ ] Every misc domain has its own subfolder with barrel
- [ ] All 348 IPC channels accounted for across #1A + #1B files
- [ ] `npm run typecheck` passes

---

#### Task #1C: Create ipc-contract root barrel + migrate imports

**Agent**: `schema-designer`
**Wave**: 1 (start after #1A and #1B complete, or run late in Wave 1)
**Blocked by**: #1A, #1B
**Estimated complexity**: MEDIUM
**Context budget**: ~15,000 tokens (files: 7)

**Description**:
Create the root barrel `src/shared/ipc/index.ts` that merges all domain contracts.
Update `src/shared/ipc-contract.ts` to be a thin re-export from the new barrel.
Update electron-vite config to add `@shared/ipc` path alias.

**Files to Create**:
- `src/shared/ipc/index.ts` — Root barrel merging all domain contracts + re-exporting types

**Files to Modify**:
- `src/shared/ipc-contract.ts` — Replace with thin re-export: `export * from './ipc';`
- `electron.vite.config.ts` — Add `@shared/ipc` path alias

**Files to Read for Context**:
- `src/shared/ipc/tasks/index.ts` — Example of domain barrel (from #1A)
- `src/shared/ipc/hub/index.ts` — Example of domain barrel (from #1B)
- `electron.vite.config.ts` — Current alias configuration
- `tsconfig.json` or `tsconfig.*.json` — Path mapping

**Acceptance Criteria**:
- [ ] Root barrel merges all domain invoke + event contracts into single objects
- [ ] `ipcInvokeContract` and `ipcEventContract` types are identical to original
- [ ] `import from '@shared/ipc-contract'` still works (backward compat re-export)
- [ ] `import from '@shared/ipc'` works (new path)
- [ ] All 5 verification commands pass: `npm run lint && npm run typecheck && npm run test && npm run build && npm run check:docs`

---

#### Task #2: Split command-executor.ts into domain executors

**Agent**: `assistant-engineer`
**Wave**: 1 (parallel with #1A, #1B, #3)
**Blocked by**: none
**Estimated complexity**: HIGH
**Context budget**: ~18,000 tokens (files: 10)

**Description**:
Extract all 20+ handler functions from `src/main/services/assistant/command-executor.ts` into
domain-specific executor files in `src/main/services/assistant/executors/`. Create a router that
dispatches classified intents to the appropriate domain executor.

**Files to Create**:
- `src/main/services/assistant/executors/index.ts` — Barrel: exports executeCommand()
- `src/main/services/assistant/executors/types.ts` — CommandExecutorDeps interface
- `src/main/services/assistant/executors/router.ts` — Intent → executor routing (~80 lines)
- `src/main/services/assistant/executors/response-builders.ts` — buildErrorResponse, buildTextResponse, buildActionResponse
- `src/main/services/assistant/executors/task.executor.ts` — handleCreateTask
- `src/main/services/assistant/executors/planner.executor.ts` — handleCreateTimeBlock, executePlanner
- `src/main/services/assistant/executors/notes.executor.ts` — handleNotes, handleStandup, executeNotes
- `src/main/services/assistant/executors/fitness.executor.ts` — executeFitness
- `src/main/services/assistant/executors/email.executor.ts` — executeEmail
- `src/main/services/assistant/executors/github.executor.ts` — executeGitHub
- `src/main/services/assistant/executors/spotify.executor.ts` — handleSpotify
- `src/main/services/assistant/executors/calendar.executor.ts` — executeCalendar
- `src/main/services/assistant/executors/briefing.executor.ts` — executeBriefing
- `src/main/services/assistant/executors/insights.executor.ts` — executeInsights
- `src/main/services/assistant/executors/ideation.executor.ts` — executeIdeation
- `src/main/services/assistant/executors/milestones.executor.ts` — executeMilestones
- `src/main/services/assistant/executors/watch.executor.ts` — handleWatchCreate/Remove/List
- `src/main/services/assistant/executors/device.executor.ts` — executeDeviceQuery
- `src/main/services/assistant/executors/reminder.executor.ts` — handleReminder
- `src/main/services/assistant/executors/search.executor.ts` — handleSearch
- `src/main/services/assistant/executors/launcher.executor.ts` — handleLauncher

**Files to Modify**:
- `src/main/services/assistant/command-executor.ts` — Replace with thin import from `./executors`

**Files to Read for Context**:
- `src/main/services/assistant/command-executor.ts` — Full source (1,100 lines)
- `src/shared/types/assistant.ts` — AssistantResponse, AssistantContext types

**Acceptance Criteria**:
- [ ] All 20+ handler functions extracted to domain executor files
- [ ] Router dispatches to correct executor for every intent type
- [ ] CommandExecutorDeps interface extracted to types.ts
- [ ] Response builder functions shared via import (not duplicated)
- [ ] Each executor file < 120 lines
- [ ] All 5 verification commands pass

---

#### Task #3: Split intent-classifier.ts into domain patterns

**Agent**: `assistant-engineer`
**Wave**: 1 (parallel with #1A, #1B, #2)
**Blocked by**: none
**Estimated complexity**: MEDIUM
**Context budget**: ~15,000 tokens (files: 8)

**Description**:
Extract pattern matching logic from `src/main/services/assistant/intent-classifier.ts` into
domain-specific pattern files in `src/main/services/assistant/intent-classifier/patterns/`.

**Files to Create**:
- `src/main/services/assistant/intent-classifier/index.ts` — Barrel: exports classifyIntent, ClassifiedIntent
- `src/main/services/assistant/intent-classifier/classifier.ts` — Main classifyIntent() + actionToIntentType()
- `src/main/services/assistant/intent-classifier/helpers.ts` — extractTaskId, stripPrefix, resolveWatchCondition, getTimeParser
- `src/main/services/assistant/intent-classifier/types.ts` — ClassifiedIntent interface
- `src/main/services/assistant/intent-classifier/patterns/index.ts` — Barrel
- `src/main/services/assistant/intent-classifier/patterns/task.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/planner.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/fitness.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/notes.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/email.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/github.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/spotify.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/calendar.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/watch.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/device.patterns.ts`
- `src/main/services/assistant/intent-classifier/patterns/misc.patterns.ts`

**Files to Modify**:
- `src/main/services/assistant/intent-classifier.ts` — Replace with thin re-export from `./intent-classifier/`

**Files to Read for Context**:
- `src/main/services/assistant/intent-classifier.ts` — Full source (721 lines)

**Acceptance Criteria**:
- [ ] Pattern matching logic separated by domain
- [ ] classifyIntent() in classifier.ts delegates to domain pattern matchers
- [ ] Helper functions extracted and imported by patterns that need them
- [ ] ClassifiedIntent type exported from types.ts
- [ ] Each pattern file < 80 lines
- [ ] All 5 verification commands pass

---

### Wave 2: Infrastructure — 4 parallel tasks

> **Blocked by Wave 1 completion.** All Wave 2 tasks run simultaneously.

---

#### Task #4: Split main/index.ts into bootstrap modules

**Agent**: `service-engineer`
**Wave**: 2
**Blocked by**: #1C (import paths updated)
**Estimated complexity**: MEDIUM
**Context budget**: ~15,000 tokens (files: 7)

**Description**:
Extract service creation, IPC handler registration, event wiring, and lifecycle management
from `src/main/index.ts` into focused modules in `src/main/bootstrap/`.

**Files to Create**:
- `src/main/bootstrap/index.ts` — Barrel
- `src/main/bootstrap/service-registry.ts` — Creates all ~40 services, returns typed ServiceRegistry
- `src/main/bootstrap/ipc-wiring.ts` — Registers all IPC handlers with router
- `src/main/bootstrap/event-wiring.ts` — Wires inter-service events (watchdog, progress, watch evaluator)
- `src/main/bootstrap/lifecycle.ts` — app.on('before-quit'), cleanup, window focus events

**Files to Modify**:
- `src/main/index.ts` — Slim down to ~100 lines: createWindow + app.whenReady + imports from bootstrap/

**Files to Read for Context**:
- `src/main/index.ts` — Full source (657 lines)
- `src/main/ipc/index.ts` — Handler registration pattern

**Acceptance Criteria**:
- [ ] `index.ts` reduced to ~100 lines
- [ ] ServiceRegistry interface typed with all ~40 services
- [ ] All IPC handler registration in ipc-wiring.ts
- [ ] All event wiring in event-wiring.ts
- [ ] Lifecycle management in lifecycle.ts
- [ ] All 5 verification commands pass

---

#### Task #5: Split hub-protocol.ts into domain types

**Agent**: `schema-designer`
**Wave**: 2 (parallel with #4, #6, #7)
**Blocked by**: none
**Estimated complexity**: MEDIUM
**Context budget**: ~12,000 tokens (files: 5)

**Description**:
Extract all types from `src/shared/types/hub-protocol.ts` into domain-specific type files
in `src/shared/types/hub/`.

**Files to Create**:
- `src/shared/types/hub/index.ts` — Barrel re-exporting everything
- `src/shared/types/hub/enums.ts` — TaskStatus, TaskPriority, DeviceStatus enums
- `src/shared/types/hub/auth.ts` — HubUser, AuthTokens, LoginRequest, RegisterRequest
- `src/shared/types/hub/devices.ts` — HubDevice, DeviceHeartbeat, DeviceRequest
- `src/shared/types/hub/workspaces.ts` — HubWorkspace, WorkspaceRequest
- `src/shared/types/hub/projects.ts` — HubProject, ProjectRequest
- `src/shared/types/hub/tasks.ts` — HubTask, TaskRequest, TaskResponse, TaskProgress
- `src/shared/types/hub/events.ts` — WebSocket event types, WsMessage unions
- `src/shared/types/hub/errors.ts` — HubApiError, ErrorResponse
- `src/shared/types/hub/guards.ts` — Type guard functions
- `src/shared/types/hub/transitions.ts` — VALID_TRANSITIONS, isValidTransition()
- `src/shared/types/hub/legacy.ts` — Deprecated types (Computer*, DeviceAuth*)

**Files to Modify**:
- `src/shared/types/hub-protocol.ts` — Replace with thin re-export from `./hub/`
- `src/shared/types/index.ts` — Update barrel if needed

**Files to Read for Context**:
- `src/shared/types/hub-protocol.ts` — Full source (621 lines)

**Acceptance Criteria**:
- [ ] All types accounted for in domain files
- [ ] Barrel re-exports all types under same names
- [ ] Legacy/deprecated types isolated in legacy.ts
- [ ] All 5 verification commands pass

---

#### Task #6: Split task-handlers.ts

**Agent**: `ipc-handler-engineer`
**Wave**: 2 (parallel)
**Blocked by**: #1C (import paths)
**Estimated complexity**: LOW
**Context budget**: ~10,000 tokens (files: 4)

**Description**:
Split `src/main/ipc/handlers/task-handlers.ts` into focused files in `src/main/ipc/handlers/tasks/`.

**Files to Create**:
- `src/main/ipc/handlers/tasks/index.ts` — Barrel: exports registerTaskHandlers
- `src/main/ipc/handlers/tasks/hub-task-handlers.ts` — hub.tasks.* handlers
- `src/main/ipc/handlers/tasks/legacy-task-handlers.ts` — tasks.* (forwarding to Hub)
- `src/main/ipc/handlers/tasks/status-mapping.ts` — STATUS_MAP, mapping functions
- `src/main/ipc/handlers/tasks/task-transform.ts` — transformHubTask()

**Files to Modify**:
- `src/main/ipc/handlers/task-handlers.ts` — Replace with re-export from `./tasks/`
- `src/main/ipc/index.ts` — Update import path if needed

**Files to Read for Context**:
- `src/main/ipc/handlers/task-handlers.ts` — Full source (331 lines)

**Acceptance Criteria**:
- [ ] Hub and legacy handlers in separate files
- [ ] Status mapping and transform extracted as utilities
- [ ] All 5 verification commands pass

---

#### Task #7: Split router.tsx into route groups

**Agent**: `router-engineer`
**Wave**: 2 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~10,000 tokens (files: 4)

**Description**:
Split `src/renderer/app/router.tsx` into route group files in `src/renderer/app/routes/`.

**Files to Create**:
- `src/renderer/app/routes/index.ts` — Barrel
- `src/renderer/app/routes/auth.routes.ts` — Login, register, redirect-if-authenticated
- `src/renderer/app/routes/dashboard.routes.ts` — Dashboard, my-work
- `src/renderer/app/routes/project.routes.ts` — Project list + nested project views
- `src/renderer/app/routes/productivity.routes.ts` — Planner, notes, alerts, calendar
- `src/renderer/app/routes/communication.routes.ts` — Communications, GitHub
- `src/renderer/app/routes/settings.routes.ts` — Settings page
- `src/renderer/app/routes/misc.routes.ts` — Fitness, briefing, roadmap, onboarding, etc.

**Files to Modify**:
- `src/renderer/app/router.tsx` — Slim to ~60 lines: imports route groups, assembles tree

**Files to Read for Context**:
- `src/renderer/app/router.tsx` — Full source (336 lines)
- `src/shared/constants/routes.ts` — Route constants

**Acceptance Criteria**:
- [ ] Each route group in its own file
- [ ] router.tsx only assembles the tree
- [ ] All route paths work identically
- [ ] All 5 verification commands pass

---

### Wave 3: Services — 8 parallel tasks

> **No blockers — can run in parallel with Wave 2.** Each task touches a different service folder.

---

#### Task #8: Split briefing-service.ts

**Agent**: `service-engineer`
**Wave**: 3
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~8,000 tokens (files: 3)

**Description**: Split `src/main/services/briefing/briefing-service.ts` (511 lines).

**Files to Create**:
- `src/main/services/briefing/index.ts` — Barrel
- `src/main/services/briefing/briefing-generator.ts` — generateBriefing logic
- `src/main/services/briefing/briefing-cache.ts` — Daily cache logic
- `src/main/services/briefing/briefing-config.ts` — Config loading/saving

**Files to Modify**:
- `src/main/services/briefing/briefing-service.ts` — Slim to orchestrator (~150 lines)

**Acceptance Criteria**:
- [ ] Each extracted file < 150 lines
- [ ] All 5 verification commands pass

---

#### Task #9: Split email-service.ts

**Agent**: `service-engineer`
**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~8,000 tokens (files: 3)

**Description**: Split `src/main/services/email/email-service.ts` (502 lines).

**Files to Create**:
- `src/main/services/email/index.ts` — Barrel
- `src/main/services/email/smtp-transport.ts` — SMTP connection + sendMail
- `src/main/services/email/email-queue.ts` — Queue management
- `src/main/services/email/email-encryption.ts` — Secret encryption/decryption
- `src/main/services/email/email-store.ts` — JSON file I/O

**Files to Modify**:
- `src/main/services/email/email-service.ts` — Slim to public API (~150 lines)

**Acceptance Criteria**:
- [ ] Each extracted file < 120 lines
- [ ] All 5 verification commands pass

---

#### Task #10: Split notification-watcher.ts

**Agent**: `service-engineer`
**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~8,000 tokens (files: 3)

**Description**: Split `src/main/services/notifications/notification-watcher.ts` (458 lines).

**Files to Create**:
- `src/main/services/notifications/index.ts` — Barrel
- `src/main/services/notifications/notification-manager.ts` — Manager/orchestrator
- `src/main/services/notifications/notification-store.ts` — JSON persistence
- `src/main/services/notifications/notification-filter.ts` — matchesFilter + config

**Files to Modify**:
- `src/main/services/notifications/notification-watcher.ts` — Slim or remove (replaced by manager)

**Acceptance Criteria**:
- [ ] Each extracted file < 100 lines
- [ ] All 5 verification commands pass

---

#### Task #11: Split settings-service.ts

**Agent**: `service-engineer`
**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~8,000 tokens (files: 3)

**Description**: Split `src/main/services/settings/settings-service.ts` (362 lines).

**Files to Create**:
- `src/main/services/settings/index.ts` — Barrel
- `src/main/services/settings/settings-store.ts` — File I/O: loadSettingsFile, saveSettingsFile
- `src/main/services/settings/settings-encryption.ts` — Webhook secret encryption
- `src/main/services/settings/settings-defaults.ts` — Default values

**Files to Modify**:
- `src/main/services/settings/settings-service.ts` — Slim to public API (~120 lines)

**Acceptance Criteria**:
- [ ] Each extracted file < 100 lines
- [ ] All 5 verification commands pass

---

#### Task #12: Split hub-connection.ts

**Agent**: `service-engineer`
**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~8,000 tokens (files: 3)

**Description**: Split `src/main/services/hub/hub-connection.ts` (426 lines).

**Files to Create**:
- `src/main/services/hub/hub-ws-client.ts` — WebSocket client + reconnect
- `src/main/services/hub/hub-config-store.ts` — Encrypted config persistence
- `src/main/services/hub/hub-event-mapper.ts` — configToConnection, emitTaskEvent helpers

**Files to Modify**:
- `src/main/services/hub/hub-connection.ts` — Slim to manager/facade (~150 lines)
- `src/main/services/hub/index.ts` — Update barrel (if exists)

**Acceptance Criteria**:
- [ ] Each extracted file < 120 lines
- [ ] All 5 verification commands pass

---

#### Task #13: Split agent-service.ts

**Agent**: `service-engineer`
**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~8,000 tokens (files: 3)

**Description**: Split `src/main/services/agent/agent-service.ts` (396 lines).

**Files to Create**:
- `src/main/services/agent/index.ts` — Barrel
- `src/main/services/agent/agent-spawner.ts` — spawnAgent, process management, shell detection
- `src/main/services/agent/agent-output-parser.ts` — parseClaudeOutput, matchesAny

**Files to Modify**:
- `src/main/services/agent/agent-service.ts` — Slim to public API + orchestration (~150 lines)

**Acceptance Criteria**:
- [ ] Each extracted file < 120 lines
- [ ] All 5 verification commands pass

---

#### Task #14: Split task-service.ts

**Agent**: `service-engineer`
**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~8,000 tokens (files: 3)

**Description**: Split `src/main/services/project/task-service.ts` (359 lines).

**Files to Create**:
- `src/main/services/project/index.ts` — Barrel
- `src/main/services/project/task-store.ts` — readTask, readJsonFile, file I/O
- `src/main/services/project/task-spec-parser.ts` — Plan/spec parsing, getPhaseStatus
- `src/main/services/project/task-slug.ts` — slugify, getNextNum

**Files to Modify**:
- `src/main/services/project/task-service.ts` — Slim to public API (~120 lines)

**Acceptance Criteria**:
- [ ] Each extracted file < 80 lines
- [ ] All 5 verification commands pass

---

#### Task #15: Split qa-runner.ts

**Agent**: `service-engineer`
**Wave**: 3 (parallel)
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~8,000 tokens (files: 3)

**Description**: Split `src/main/services/qa/qa-runner.ts` (332 lines).

**Files to Create**:
- `src/main/services/qa/index.ts` — Barrel (update if exists)
- `src/main/services/qa/qa-quiet.ts` — Quiet/background QA tier logic
- `src/main/services/qa/qa-full.ts` — Full/interactive QA tier logic
- `src/main/services/qa/qa-report.ts` — Report generation, storage

**Files to Modify**:
- `src/main/services/qa/qa-runner.ts` — Slim to orchestrator (~100 lines)

**Acceptance Criteria**:
- [ ] Each extracted file < 100 lines
- [ ] All 5 verification commands pass

---

### Wave 4: Components — 6 parallel tasks

> **No blockers — can run in parallel with Waves 2-3.** Each task touches a different component folder.

---

#### Task #16: Split ChangelogPage.tsx

**Agent**: `component-engineer`
**Wave**: 4
**Blocked by**: none
**Estimated complexity**: LOW
**Context budget**: ~8,000 tokens (files: 3)

**Description**: Extract 5 inline sub-components from `src/renderer/features/changelog/components/ChangelogPage.tsx` (447 lines).

**Files to Create**:
- `src/renderer/features/changelog/components/VersionCard.tsx`
- `src/renderer/features/changelog/components/CategorySection.tsx`
- `src/renderer/features/changelog/components/GenerateForm.tsx`
- `src/renderer/features/changelog/components/EditableCategory.tsx`
- `src/renderer/features/changelog/components/EntryPreview.tsx`

**Files to Modify**:
- `src/renderer/features/changelog/components/ChangelogPage.tsx` — Import extracted components

**Acceptance Criteria**:
- [ ] Each extracted component < 100 lines
- [ ] ChangelogPage.tsx < 150 lines
- [ ] All 5 verification commands pass

---

#### Task #17: Split SettingsPage.tsx

**Agent**: `component-engineer`
**Wave**: 4 (parallel)
**Blocked by**: none
**Context budget**: ~8,000 tokens

**Files to Read**: `src/renderer/features/settings/components/SettingsPage.tsx` (354 lines)
**Files to Modify**: Same — extract inline sub-components

---

#### Task #18: Split WeeklyReviewPage.tsx

**Agent**: `component-engineer`
**Wave**: 4 (parallel)
**Blocked by**: none
**Context budget**: ~8,000 tokens

**Files to Read**: `src/renderer/features/planner/components/WeeklyReviewPage.tsx` (462 lines)
**Files to Modify**: Same — extract inline sub-components

---

#### Task #19: Split ProjectInitWizard.tsx

**Agent**: `component-engineer`
**Wave**: 4 (parallel)
**Blocked by**: none
**Context budget**: ~8,000 tokens

**Files to Read**: `src/renderer/features/projects/components/ProjectInitWizard.tsx` (466 lines)
**Files to Modify**: Same — extract wizard step components

---

#### Task #20: Split WebhookSettings.tsx

**Agent**: `component-engineer`
**Wave**: 4 (parallel)
**Blocked by**: none
**Context budget**: ~8,000 tokens

**Files to Read**: `src/renderer/features/settings/components/WebhookSettings.tsx` (452 lines)
**Files to Modify**: Same — extract inline sub-components

---

#### Task #21: Split OAuthProviderSettings.tsx

**Agent**: `component-engineer`
**Wave**: 4 (parallel)
**Blocked by**: none
**Context budget**: ~8,000 tokens

**Files to Read**: `src/renderer/features/settings/components/OAuthProviderSettings.tsx` (375 lines)
**Files to Modify**: Same — extract inline sub-components

---

### Wave 5: Documentation — 2 parallel tasks

> **Blocked by all code tasks.** Both doc tasks run simultaneously.

---

#### Task #22: Add FEATURE.md to every feature domain

**Agent**: `architect`
**Wave**: 5
**Blocked by**: #1-#21 (structure finalized)
**Estimated complexity**: MEDIUM
**Context budget**: ~10,000 tokens

**Description**:
Add a `FEATURE.md` to each restructured feature folder documenting structure, data flow,
how to add new items, key types, and cross-references.

**Files to Create** (14 FEATURE.md files):
- `src/shared/ipc/FEATURE.md`
- `src/shared/ipc/tasks/FEATURE.md`
- `src/main/services/assistant/FEATURE.md`
- `src/main/services/hub/FEATURE.md`
- `src/main/services/agent-orchestrator/FEATURE.md`
- `src/main/services/notifications/FEATURE.md`
- `src/main/services/email/FEATURE.md`
- `src/main/services/briefing/FEATURE.md`
- `src/main/bootstrap/FEATURE.md`
- `src/renderer/features/tasks/FEATURE.md`
- `src/renderer/features/settings/FEATURE.md`
- `src/renderer/features/planner/FEATURE.md`
- `src/renderer/features/changelog/FEATURE.md`
- `src/renderer/app/routes/FEATURE.md`

**Acceptance Criteria**:
- [ ] Every FEATURE.md follows the template (Purpose, Structure table, Data Flow, How to Add, Key Types, Related Features)
- [ ] File paths in FEATURE.md match actual structure
- [ ] All 5 verification commands pass

---

#### Task #23: Update ai-docs for new structure

**Agent**: `architect`
**Wave**: 5 (parallel with #22)
**Blocked by**: #1-#21

**Description**: Update all ai-docs to reflect the new folder structure.

**Files to Modify**:
- `ai-docs/FEATURES-INDEX.md` — Update file paths and counts
- `ai-docs/ARCHITECTURE.md` — Update folder structure diagram
- `ai-docs/CODEBASE-GUARDIAN.md` — Update file placement rules
- `ai-docs/DATA-FLOW.md` — Update import paths in examples
- `CLAUDE.md` — Update quick reference paths

**Acceptance Criteria**:
- [ ] All file paths in docs match new structure
- [ ] Feature counts updated
- [ ] All 5 verification commands pass

---

## 5. Wave Plan

### Wave 1: Foundation (no blockers) — 5 tasks
- **#1A**: IPC contract — core domains (schema-designer)
- **#1B**: IPC contract — remaining domains (schema-designer)
- **#1C**: IPC root barrel + migration (schema-designer) — starts after #1A+#1B
- **#2**: Command executor split (assistant-engineer)
- **#3**: Intent classifier split (assistant-engineer)

> #1A and #1B can run in parallel. #2 and #3 can run in parallel with each other and with #1A/#1B.
> #1C depends on #1A + #1B completing first.

### Wave 2: Infrastructure (blocked by Wave 1) — 4 tasks, all parallel
- **#4**: Bootstrap modules (service-engineer)
- **#5**: Hub protocol types (schema-designer)
- **#6**: Task handlers (ipc-handler-engineer)
- **#7**: Router split (router-engineer)

### Wave 3: Services (no blockers) — 8 tasks, all parallel
- **#8**: Briefing service (service-engineer)
- **#9**: Email service (service-engineer)
- **#10**: Notification watcher (service-engineer)
- **#11**: Settings service (service-engineer)
- **#12**: Hub connection (service-engineer)
- **#13**: Agent service (service-engineer)
- **#14**: Task service (service-engineer)
- **#15**: QA runner (service-engineer)

> Wave 3 CAN run in parallel with Wave 2 — no dependencies between them.

### Wave 4: Components (no blockers) — 6 tasks, all parallel
- **#16**: ChangelogPage (component-engineer)
- **#17**: SettingsPage (component-engineer)
- **#18**: WeeklyReviewPage (component-engineer)
- **#19**: ProjectInitWizard (component-engineer)
- **#20**: WebhookSettings (component-engineer)
- **#21**: OAuthProviderSettings (component-engineer)

> Wave 4 CAN run in parallel with Waves 2-3 — no dependencies.

### Wave 5: Documentation (blocked by all code tasks) — 2 tasks, parallel
- **#22**: FEATURE.md files (architect)
- **#23**: ai-docs updates (architect)

### Dependency Graph

```
Wave 1 (parallel):
  #1A IPC core ─────┐
  #1B IPC remaining ─┤──> #1C IPC barrel ──> Wave 2: #4 Bootstrap, #6 Task Handlers
  #2 Executor ───────┤                       Wave 2: #5 Hub Protocol, #7 Router
  #3 Classifier ─────┘

Wave 3 (independent, can overlap Wave 2):
  #8-#15 Services (all parallel, no dependencies)

Wave 4 (independent, can overlap Waves 2-3):
  #16-#21 Components (all parallel, no dependencies)

Wave 5 (after all code complete):
  #22 FEATURE.md + #23 ai-docs (parallel)
```

### Maximum Parallelism

At peak, the Team Leader can have **up to 12 agents running simultaneously** (Wave 3 + Wave 4 overlapping).
More conservatively, 4-6 agents per wave is practical.

---

## 6. File Ownership Matrix

| Task | Folder(s) Owned | Agent |
|------|----------------|-------|
| #1A | `src/shared/ipc/{tasks,projects,planner,fitness,settings,assistant,agents,auth,common}/` | schema-designer |
| #1B | `src/shared/ipc/{hub,git,github,notifications,email,claude,terminals,spotify,workflow,qa,briefing,app,misc}/` | schema-designer |
| #1C | `src/shared/ipc/index.ts`, `src/shared/ipc-contract.ts`, `electron.vite.config.ts` | schema-designer |
| #2 | `src/main/services/assistant/executors/` | assistant-engineer |
| #3 | `src/main/services/assistant/intent-classifier/` | assistant-engineer |
| #4 | `src/main/bootstrap/`, `src/main/index.ts` | service-engineer |
| #5 | `src/shared/types/hub/` | schema-designer |
| #6 | `src/main/ipc/handlers/tasks/` | ipc-handler-engineer |
| #7 | `src/renderer/app/routes/` | router-engineer |
| #8 | `src/main/services/briefing/` | service-engineer |
| #9 | `src/main/services/email/` | service-engineer |
| #10 | `src/main/services/notifications/` | service-engineer |
| #11 | `src/main/services/settings/` | service-engineer |
| #12 | `src/main/services/hub/` (connection only) | service-engineer |
| #13 | `src/main/services/agent/` | service-engineer |
| #14 | `src/main/services/project/` | service-engineer |
| #15 | `src/main/services/qa/` | service-engineer |
| #16 | `src/renderer/features/changelog/components/` | component-engineer |
| #17 | `src/renderer/features/settings/components/` (SettingsPage only) | component-engineer |
| #18 | `src/renderer/features/planner/components/` | component-engineer |
| #19 | `src/renderer/features/projects/components/` | component-engineer |
| #20 | `src/renderer/features/settings/components/` (WebhookSettings only) | component-engineer |
| #21 | `src/renderer/features/settings/components/` (OAuthProvider only) | component-engineer |
| #22 | FEATURE.md files across codebase | architect |
| #23 | `ai-docs/`, `CLAUDE.md` | architect |

**Conflict check**: Tasks #17, #20, #21 all touch `src/renderer/features/settings/components/` but
each modifies a DIFFERENT file within that folder. No conflict.

---

## 7. Context Budget

| Task | Tokens | Files | Notes |
|------|--------|-------|-------|
| #1A | ~18K | ~24 new | Core domains — within threshold |
| #1B | ~18K | ~40 new | Remaining domains — within threshold |
| #1C | ~15K | 3 | Root barrel + migration |
| #2 | ~18K | ~20 new | Extract functions, create router |
| #3 | ~15K | ~16 new | Extract pattern matches |
| #4 | ~15K | 5 new | Restructure index.ts |
| #5 | ~12K | 12 new | Extract types |
| #6 | ~10K | 5 new | Split handler file |
| #7 | ~10K | 8 new | Split route definitions |
| #8-#15 | ~8K each | 3-5 each | Service decomposition |
| #16-#21 | ~8K each | 3-6 each | Component extraction |
| #22-#23 | ~10K each | Docs only | Documentation |

All tasks under 18K threshold. No further splitting needed.

---

## 8. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Barrel re-exports don't produce identical contract types | Medium | High | TypeScript strict catches mismatches; test with `npm run typecheck` |
| Import path changes break 200+ files | Low | High | Keep `ipc-contract.ts` as thin re-export during migration |
| Circular deps in domain schema imports | Medium | Medium | `common/schemas.ts` for shared primitives; no cross-domain imports |
| electron-vite tree-shaking breaks with barrels | Low | Low | Vite handles barrels well; verify bundle size |

### Scope Risks

| Risk | Mitigation |
|------|----------|
| Refactor accidentally changes behavior | Zero logic changes — pure structural moves |
| FEATURE.md becomes stale | `check:docs` can be extended to verify freshness |

### Integration Risks

| Risk | Mitigation |
|------|----------|
| Two agents edit same file | File ownership matrix verified — no overlaps |
| Tests reference old paths | Tests import from barrels, not internals |

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
- [ ] Merged contracts produce identical TypeScript types
- [ ] Bundle size delta < 5%
- [ ] No circular dependency warnings
- [ ] `import from '@shared/ipc-contract'` still works

### Guardian Focus Areas
- No files in wrong process root
- No cross-domain imports within IPC domain folders
- Barrel exports match file contents

---

## 10. Implementation Notes

### Execution Model
- **Team Lead** orchestrates all waves, delegates to specialist agents
- **Agents work in parallel** within each wave on their own workbranches
- **QA reviewer** validates each task before merge to feature branch
- **Codebase Guardian** runs final structural check before PR

### Gradual Migration Strategy (Task #1C)
1. Create new `src/shared/ipc/` structure alongside old `ipc-contract.ts`
2. Root barrel re-exports everything the old file exported
3. Update `ipc-contract.ts` to thin re-export: `export * from './ipc';`
4. All existing imports continue to work unchanged
5. Future work can use `@shared/ipc/tasks` for domain-specific imports

### Existing Patterns to Follow
- **Barrel exports**: Every feature module uses `index.ts` barrels
- **Zod schemas**: Keep `z.object()` / `z.enum()` pattern
- **Service factory**: Keep `createXxxService()` pattern
- **Handler registration**: Keep `router.handle()` pattern

### What NOT to Change
- Business logic inside any function
- IPC channel names or schemas
- React component props or behavior
- Test files (deferred per user request)
- Build configuration (except path alias addition)
