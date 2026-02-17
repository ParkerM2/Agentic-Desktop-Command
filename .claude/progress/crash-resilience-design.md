# Feature Design: Crash Resilience & Error Handling

**Author**: /create-feature-plan
**Created**: 2026-02-16
**Status**: READY FOR IMPLEMENTATION
**Workflow Mode**: standard
**Source Design**: `docs/plans/2026-02-16-crash-resilience-design.md`

---

## 1. Overview

ADC currently has zero React error boundaries, no main process exception handlers, no atomic file writes, and no service health monitoring. A single unhandled error crashes the entire app, errors are scattered across `console.error` calls with no collection, and JSON file corruption silently loses user data.

This feature introduces a comprehensive crash resilience system across all layers: a centralized ErrorCollector with severity tiers and rich context enrichment, 4-tier React error boundaries (root, route, feature, widget), main process exception/rejection handlers with renderer crash recovery, atomic file writes with backup/recovery, a health registry for background service monitoring, and a 3-tier error surfacing UI (title bar health dot, project error header, enhanced toast system).

The implementation targets the current master branch state: monolithic `ipc-contract.ts`, monolithic `src/main/index.ts` (~658 lines), existing toast system (`toast-store.ts` + `MutationErrorToast.tsx`), and TopBar with `HubStatus` component.

## 2. Requirements

### Functional Requirements
- Centralized ErrorCollector persists errors to `{appData}/adc/error-log.json` (7-day retention, 50-entry session capacity alert)
- 4-tier React error boundaries prevent white screens (root → route → feature → widget)
- Main process `uncaughtException` handler shows native dialog and quits gracefully
- Main process `unhandledRejection` handler logs + forwards to renderer (no quit)
- Renderer crash recovery auto-recreates BrowserWindow (max 3 crashes in 60s)
- Service initialization resilience (critical vs non-critical services, try/catch wrapping)
- Atomic file writes via `safeWriteJson()` (write-to-tmp + fsync + rename)
- Health registry monitors 7 background services with pulse-based detection
- App health indicator (green/amber/red dot) in TopBar next to HubStatus
- Health panel popover with service status table + scrollable error log
- Enhanced toast system with warning support and click-to-navigate
- Error context enrichment: route history, project info, task state, agent logs

### Non-Functional Requirements
- Error log survives app crashes and restarts (persisted to disk, NOT cleared on restart)
- Atomic writes prevent data corruption during unexpected shutdowns
- Error boundaries must not break existing routing or sidebar functionality
- All new components must follow design system (theme-aware, accessible)

### Out of Scope
- Personal error handling / personal dashboard (tracked in future roadmap)
- Project error header markdown editing (future)
- Assistant error integration Phase 8 (will be a follow-up feature)
- Modifying existing services to add `safeWriteJson()` calls (separate migration task)

## 3. Architecture

### Selected Approach
Single ErrorCollector singleton in main process, event-driven forwarding to renderer. Error boundaries are class components (React requirement) wrapped in functional component patterns. Health registry uses pulse-based monitoring (services call `pulse()`, registry sweeps). All new IPC channels added to the existing monolithic `ipc-contract.ts`.

### Data Model

```typescript
// src/shared/types/health.ts

export type ErrorSeverity = 'error' | 'warning' | 'info';
export type ErrorTier = 'app' | 'project' | 'personal';
export type ErrorCategory = 'connection' | 'filesystem' | 'service' | 'agent' | 'ipc' | 'renderer' | 'general';

export interface ErrorContext {
  route?: string;
  routeHistory?: string[];
  projectId?: string;
  projectName?: string;
  task?: {
    taskId: string;
    taskSlug: string;
    status: string;
    lastSavedState?: string;
  };
  agent?: {
    sessionId: string;
    agentName: string;
    lastToolUse?: string;
    lastLogLines?: string[];
    progressFile?: string;
  };
}

export interface ErrorEntry {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  tier: ErrorTier;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context: ErrorContext;
}

export interface ErrorStats {
  total: number;
  byTier: Record<string, number>;
  bySeverity: Record<string, number>;
  last24h: number;
}

export type ServiceHealthStatus = 'healthy' | 'unhealthy' | 'stopped';

export interface ServiceHealth {
  name: string;
  status: ServiceHealthStatus;
  lastPulse: string;
  missedCount: number;
}

export interface HealthStatus {
  services: ServiceHealth[];
}
```

### API Surface (New IPC Channels)

**Invoke channels:**
- `app.getErrorLog` — input: `{ since?: string }`, output: `{ entries: ErrorEntry[] }`
- `app.getErrorStats` — input: `{}`, output: `ErrorStats`
- `app.clearErrorLog` — input: `{}`, output: `{ success: boolean }`
- `app.reportRendererError` — input: `{ severity, tier, category, message, stack?, route?, routeHistory?, projectId? }`, output: `{ success: boolean }`
- `app.getHealthStatus` — input: `{}`, output: `HealthStatus`

**Event channels:**
- `event:app.error` — payload: `ErrorEntry` (fires on every new error)
- `event:app.dataRecovery` — payload: `{ store, recoveredFrom, message }` (fires on backup/default recovery)
- `event:app.capacityAlert` — payload: `{ count, message }` (fires at 50+ errors/session)
- `event:app.serviceUnhealthy` — payload: `{ serviceName, missedCount }` (fires when service misses 3 pulses)

### UI Flow

**TopBar Health Indicator:**
- Green pulsing dot → "ADC is healthy" tooltip
- Amber dot + "N warnings" label → warnings exist
- Red dot + "N errors" label → errors exist
- Click → Health panel popover (service table + error log + severity filter + copy/clear)

**Error Boundaries:**
- Root: full-screen "Something went wrong" with reload button
- Route: inline error card in content area, sidebar stays functional
- Feature: feature-level error card with retry, rest of page alive
- Widget: small "Failed to load" placeholder

**Enhanced Toast:**
- Extend existing toast store with 'warning' type
- Errors stay 8 seconds (currently 5s for all)
- Click toast → navigate to health panel or project error context

### Integration Points

**New → Existing:**
- ErrorCollector → `IpcRouter.emit()` for event forwarding
- HealthRegistry → `IpcRouter.emit()` for unhealthy notifications
- Error boundaries → `window.api.invoke('app.reportRendererError', ...)` for logging
- Route history store → `@tanstack/react-router` `useRouterState()` for tracking
- Health indicator → `TopBar.tsx` (placed next to existing `<HubStatus />`)
- Error event hooks → existing `useIpcEvent()` shared hook

**Existing → New (modifications):**
- `src/main/index.ts` → instantiate ErrorCollector + HealthRegistry, add crash handlers
- `src/main/ipc/index.ts` → register error + health handlers
- `src/renderer/app/router.tsx` → wrap routes with error boundaries
- `src/renderer/app/layouts/RootLayout.tsx` → add root error boundary
- `src/renderer/app/layouts/TopBar.tsx` → add health indicator
- `src/renderer/shared/stores/toast-store.ts` → add 'warning' type, variable dismiss time
- `src/renderer/shared/components/MutationErrorToast.tsx` → render warnings, click-to-navigate

## 4. Task Breakdown

### Task #1: Define Error/Health Types & IPC Contract

**Agent**: schema-designer
**Wave**: 1
**Blocked by**: none
**Estimated complexity**: MEDIUM
**Context budget**: ~14,000 tokens (files: 3 create/modify, 5 read)

**Description**:
Add all error/health types, Zod schemas, and IPC channel definitions to the codebase. Create the `health.ts` type file, add matching Zod schemas and invoke/event channels to `ipc-contract.ts`, and export from the types barrel.

**Files to Create**:
- `src/shared/types/health.ts` — ErrorEntry, ErrorContext, ErrorStats, ServiceHealth, HealthStatus types

**Files to Modify**:
- `src/shared/ipc-contract.ts` — Add Zod schemas (ErrorContextSchema, ErrorEntrySchema, ErrorStatsSchema, ServiceHealthSchema, HealthStatusSchema), 5 new invoke channels (app.getErrorLog, app.getErrorStats, app.clearErrorLog, app.reportRendererError, app.getHealthStatus), 4 new event channels (event:app.error, event:app.dataRecovery, event:app.capacityAlert, event:app.serviceUnhealthy)
- `src/shared/types/index.ts` — Add `export type * from './health'` barrel export

**Files to Read for Context**:
- `src/shared/ipc-contract.ts` — Existing app channels pattern (line ~1978)
- `src/shared/types/agent.ts` — Agent type patterns for reference
- `src/shared/types/index.ts` — Current barrel exports
- `CLAUDE.md` — IPC contract rules
- `ai-docs/CODEBASE-GUARDIAN.md` — IPC contract structural rules

**Acceptance Criteria**:
- [ ] `ErrorEntry`, `ErrorContext`, `ErrorStats`, `ServiceHealth`, `HealthStatus` types defined in `health.ts`
- [ ] All Zod schemas match TypeScript interfaces exactly (field names, optional fields)
- [ ] 5 invoke channels added to `ipcInvokeContract`
- [ ] 4 event channels added to `ipcEventContract`
- [ ] Types exported from barrel
- [ ] Channel naming follows `app.actionName` / `event:app.eventName` convention
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, API Contract, Documentation

**Feature-Specific QA Checks**:
- [ ] ErrorContext includes route, routeHistory, projectId, projectName, task, agent fields
- [ ] ErrorEntry severity is enum of 'error' | 'warning' | 'info'
- [ ] ErrorEntry tier is enum of 'app' | 'project' | 'personal'
- [ ] Schemas don't duplicate existing ones (reuse SuccessResponseSchema where applicable)

**Implementation Notes**:
- Place schemas in the `// ── App ──` section of `ipcInvokeContract` (after existing app channels around line 2031)
- Place event schemas in the `// ── App Events ──` section of `ipcEventContract` (after existing update events around line 2516)
- Use `z.enum()` for severity, tier, category (not `z.string()`)
- The `app.reportRendererError` input should use flat fields (not nested ErrorEntry) to keep the renderer's reporting API simple

---

### Task #2: Create ErrorCollector, HealthRegistry & Atomic Write Utility

**Agent**: service-engineer
**Wave**: 1
**Blocked by**: none
**Estimated complexity**: MEDIUM
**Context budget**: ~14,000 tokens (files: 3 create, 5 read)

**Description**:
Create three new files in the main process: (1) `safeWriteJson` atomic write utility, (2) ErrorCollector service for centralized error pipeline with persistence, and (3) HealthRegistry service for background service monitoring. All follow the factory pattern with interface + implementation.

**Files to Create**:
- `src/main/lib/safe-write-json.ts` — Atomic JSON write: serialize → write `.tmp` → fsync → rename
- `src/main/services/health/error-collector.ts` — ErrorCollector interface + `createErrorCollector(dataDir)` factory. Persists to `error-log.json`, prunes entries >7 days on init, emits events via callbacks, tracks session count with capacity alert at 50.
- `src/main/services/health/health-registry.ts` — HealthRegistry interface + `createHealthRegistry()` factory. Services register with expected interval, call `pulse()`, registry sweeps every 30s, flags unhealthy after 3 missed pulses.

**Files to Read for Context**:
- `src/main/services/settings/settings-service.ts` — JSON persistence pattern reference
- `src/main/services/project/project-service.ts` — Factory pattern reference
- `ai-docs/ARCHITECTURE.md` — Service architecture rules
- `CLAUDE.md` — Service pattern rules (sync returns, factory pattern)
- `ai-docs/PATTERNS.md` — JSON file reading pattern

**Acceptance Criteria**:
- [ ] `safeWriteJson(filePath, data)` writes to `.tmp`, calls `fsyncSync`, renames atomically
- [ ] ErrorCollector `report()` returns ErrorEntry, persists to disk, notifies listeners
- [ ] ErrorCollector `getLog(since?)` filters by date
- [ ] ErrorCollector `getStats()` returns total, byTier, bySeverity, last24h counts
- [ ] ErrorCollector `clear()` empties log and resets session count
- [ ] ErrorCollector prunes entries older than 7 days on initialization
- [ ] ErrorCollector fires capacity alert at 50+ errors in a session
- [ ] HealthRegistry `register(name, expectedInterval)` + `pulse(name)` + `getStatus()` API
- [ ] HealthRegistry sweeps every 30s, flags unhealthy after 3 missed pulses
- [ ] All services use `onError`/`onCapacityAlert`/`onUnhealthy` callback patterns for event emission
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, Error Handling, Security, Documentation

**Feature-Specific QA Checks**:
- [ ] ErrorCollector uses `safeWriteJson` for persistence (not raw `writeFileSync`)
- [ ] ErrorCollector handles corrupted log file gracefully (try/catch on JSON.parse, start fresh)
- [ ] HealthRegistry sweep interval is cleaned up in a `dispose()` method
- [ ] No `any` types — use `unknown` with narrowing for JSON.parse
- [ ] ErrorCollector generates unique IDs (timestamp + random, not UUID dependency)

**Implementation Notes**:
- ErrorCollector does NOT import IpcRouter — it uses callback hooks (`onError`, `onCapacityAlert`). The main process wiring task (Task #4) connects these to `router.emit()`.
- HealthRegistry similarly uses `onUnhealthy` callback, not direct IPC.
- This keeps services decoupled from IPC infrastructure.
- Use `createErrorCollector(dataDir: string)` factory pattern.
- `src/main/lib/` directory may not exist — create it.

---

### Task #3: Wire Error & Health IPC Handlers

**Agent**: ipc-handler-engineer
**Wave**: 2
**Blocked by**: Task #1, Task #2
**Estimated complexity**: LOW
**Context budget**: ~14,000 tokens (files: 1 create, 1 modify, 6 read)

**Description**:
Create IPC handler file for error/health channels. Wire ErrorCollector and HealthRegistry methods to the 5 new invoke channels. Register in the handler index.

**Files to Create**:
- `src/main/ipc/handlers/error-handlers.ts` — `registerErrorHandlers(router, errorCollector, healthRegistry)`: wires `app.getErrorLog`, `app.getErrorStats`, `app.clearErrorLog`, `app.reportRendererError`, `app.getHealthStatus`

**Files to Modify**:
- `src/main/ipc/index.ts` — Import `registerErrorHandlers`, add to `registerAllHandlers()`, add `errorCollector` and `healthRegistry` to `Services` interface

**Files to Read for Context**:
- `src/main/ipc/index.ts` — Current `Services` interface and registration pattern
- `src/main/ipc/router.ts` — Router API (`router.handle()`)
- `src/main/ipc/handlers/settings-handlers.ts` — Handler pattern reference
- `src/shared/ipc-contract.ts` — Channel definitions (input/output shapes)
- `src/main/services/health/error-collector.ts` — ErrorCollector interface
- `src/main/services/health/health-registry.ts` — HealthRegistry interface

**Acceptance Criteria**:
- [ ] All 5 invoke channels have corresponding `router.handle()` calls
- [ ] Handlers are thin — call service method, wrap in `Promise.resolve()`
- [ ] `app.reportRendererError` handler constructs ErrorReportInput from flat input fields
- [ ] `app.getHealthStatus` returns `{ services: [...] }` from healthRegistry
- [ ] `Services` interface updated with `errorCollector` and `healthRegistry` entries
- [ ] Registration added to `registerAllHandlers()`
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, API Contract, Documentation

**Feature-Specific QA Checks**:
- [ ] Handler file ≤200 lines
- [ ] No business logic in handlers (only service delegation)
- [ ] Channel strings match exactly between contract and handler

**Implementation Notes**:
- The `app.reportRendererError` handler receives flat fields (severity, tier, category, message, stack, route, routeHistory, projectId) and must construct the `ErrorReportInput` with nested `context` object before passing to `errorCollector.report()`.

---

### Task #4: Main Process Crash Protection & Service Wiring

**Agent**: general-purpose (this file is outside all specialist scopes)
**Wave**: 2
**Blocked by**: Task #1, Task #2
**Estimated complexity**: HIGH
**Context budget**: ~16,000 tokens (files: 1 modify (large), 8 read)

**Description**:
Modify `src/main/index.ts` to add crash protection and wire ErrorCollector + HealthRegistry into the app lifecycle. This includes: (1) global exception handlers, (2) renderer crash recovery, (3) service init resilience with critical/non-critical classification, (4) ErrorCollector and HealthRegistry instantiation, (5) event forwarding from ErrorCollector/HealthRegistry to IpcRouter, (6) health registry enrollment for background services.

**Files to Modify**:
- `src/main/index.ts` — Add ~80-100 lines of crash protection, service wiring, and health enrollment

**Files to Read for Context**:
- `src/main/index.ts` — Full file (658 lines, understand structure before modifying)
- `src/main/services/health/error-collector.ts` — ErrorCollector API
- `src/main/services/health/health-registry.ts` — HealthRegistry API
- `src/main/ipc/index.ts` — Services interface (to match)
- `src/shared/ipc-contract.ts` — Event channel shapes for router.emit()
- `CLAUDE.md` — Project rules
- `ai-docs/ARCHITECTURE.md` — Service architecture

**Acceptance Criteria**:
- [ ] `process.on('uncaughtException', ...)` logs error, shows `dialog.showErrorBox`, quits gracefully
- [ ] `process.on('unhandledRejection', ...)` logs error, forwards to renderer via `event:app.error`, does NOT quit
- [ ] `webContents.on('render-process-gone', ...)` recreates window after 1s delay, tracks consecutive crashes (3 in 60s → native dialog)
- [ ] ErrorCollector created early in `initializeApp()` with `app.getPath('userData')`
- [ ] HealthRegistry created early in `initializeApp()`
- [ ] ErrorCollector `onError` callback wired to `router.emit('event:app.error', entry)`
- [ ] ErrorCollector `onCapacityAlert` callback wired to `router.emit('event:app.capacityAlert', ...)`
- [ ] HealthRegistry `onUnhealthy` callback wired to `router.emit('event:app.serviceUnhealthy', ...)`
- [ ] `errorCollector` and `healthRegistry` passed to `registerAllHandlers()` in `services` object
- [ ] Non-critical services wrapped in try/catch (spotify, fitness, calendar, changelog, ideas, milestones, voice, screenCapture)
- [ ] Critical services NOT wrapped (settings, hubAuth, projectService, ipcRouter) — failure aborts startup
- [ ] Health registry enrolls: hub heartbeat (60s), hub WebSocket (30s), notification watchers (60s), alert scheduler (60s), watch evaluator (30s), JSONL watcher (10s)
- [ ] ErrorCollector and HealthRegistry disposed in `before-quit` handler
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, Error Handling, Security, Documentation

**Feature-Specific QA Checks**:
- [ ] Exception handlers are registered BEFORE `initializeApp()` (top of lifecycle)
- [ ] Renderer crash recovery timeout cleaned up in `before-quit`
- [ ] Service init resilience doesn't change behavior for services that currently work
- [ ] Console.log used for crash handler output (main process, no-console allowed)
- [ ] Non-critical service failure logs error and continues (no throw)

**Implementation Notes**:
- Register `process.on('uncaughtException')` and `process.on('unhandledRejection')` at the TOP of the async IIFE, before `app.whenReady()`.
- For renderer crash recovery, track `crashCount` and `lastCrashTime` in module scope. Reset counter if >60s since last crash.
- For service init resilience, wrap each non-critical service's `create*` call in try/catch. On catch, log error, report to ErrorCollector, and assign `null` to the service ref. The `services` object passed to `registerAllHandlers` must handle null services gracefully.
- For health enrollment, add `healthRegistry.pulse('hubHeartbeat')` calls alongside existing interval operations.
- This task modifies a large file — be careful to preserve all existing functionality.

---

### Task #5: Route History Store & Enhanced Toast Store

**Agent**: store-engineer
**Wave**: 3
**Blocked by**: Task #1
**Estimated complexity**: LOW
**Context budget**: ~14,000 tokens (files: 1 create, 2 modify, 4 read)

**Description**:
Create a route history store that tracks the last 5 navigation routes (used as error context). Enhance the existing toast store to support 'warning' type and variable auto-dismiss times (5s for success/warning, 8s for errors).

**Files to Create**:
- `src/renderer/shared/stores/route-history-store.ts` — Zustand store with `routes: string[]` (ring buffer, max 5), `pushRoute(path)`, `getHistory()`. Components will call `pushRoute()` on navigation.

**Files to Modify**:
- `src/renderer/shared/stores/toast-store.ts` — Add 'warning' to Toast type union, change auto-dismiss to 8s for errors / 5s for others, add optional `onClick` callback field to Toast interface
- `src/renderer/shared/stores/index.ts` — Export `useRouteHistoryStore` from barrel

**Files to Read for Context**:
- `src/renderer/shared/stores/toast-store.ts` — Current implementation (to enhance, not rewrite)
- `src/renderer/shared/stores/layout-store.ts` — Store pattern reference
- `src/renderer/shared/stores/index.ts` — Current barrel exports
- `CLAUDE.md` — State management rules

**Acceptance Criteria**:
- [ ] Route history store maintains ring buffer of last 5 routes
- [ ] `pushRoute(path)` adds to front, trims to 5
- [ ] `getHistory()` returns current route array
- [ ] Toast store accepts 'warning' type
- [ ] Error toasts auto-dismiss after 8 seconds
- [ ] Success/warning toasts auto-dismiss after 5 seconds
- [ ] Toast interface has optional `onClick?: () => void` callback
- [ ] Both stores exported from barrel
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, State Management, Documentation

**Feature-Specific QA Checks**:
- [ ] Route history store uses `set()` correctly (Zustand pattern)
- [ ] Ring buffer never exceeds 5 entries
- [ ] Enhanced toast store is backward-compatible (existing 'error'|'success' callers still work)

---

### Task #6: Health/Error API Hooks & Event Hooks

**Agent**: hook-engineer
**Wave**: 3
**Blocked by**: Task #1, Task #3
**Estimated complexity**: MEDIUM
**Context budget**: ~15,000 tokens (files: 4 create, 5 read)

**Description**:
Create the renderer data access layer for the health/error feature. Query hooks for fetching error log, error stats, and health status. Event hooks for subscribing to real-time error/health events and invalidating queries.

**Files to Create**:
- `src/renderer/features/health/api/queryKeys.ts` — Query key factory: `healthKeys.errorLog(since?)`, `healthKeys.errorStats()`, `healthKeys.status()`
- `src/renderer/features/health/api/useHealth.ts` — React Query hooks: `useErrorLog(since?)`, `useErrorStats()`, `useHealthStatus()`, `useClearErrorLog()` mutation, `useReportError()` mutation
- `src/renderer/features/health/hooks/useErrorEvents.ts` — Event subscription hook: listens to `event:app.error`, `event:app.dataRecovery`, `event:app.capacityAlert`, `event:app.serviceUnhealthy` → invalidates relevant queries + shows toasts
- `src/renderer/features/health/index.ts` — Barrel export

**Files to Read for Context**:
- `src/renderer/features/tasks/api/queryKeys.ts` — Query key factory pattern
- `src/renderer/features/tasks/api/useTasks.ts` — Query hook pattern
- `src/renderer/features/tasks/hooks/useTaskEvents.ts` — Event hook pattern
- `src/renderer/shared/hooks/useIpcEvent.ts` — Event subscription primitive
- `src/shared/ipc-contract.ts` — Channel definitions for type inference

**Acceptance Criteria**:
- [ ] Query key factory follows established pattern (`healthKeys.all`, `healthKeys.errorLog(since)`, etc.)
- [ ] `useErrorLog(since?)` returns `{ data: { entries: ErrorEntry[] }, isLoading, error }`
- [ ] `useErrorStats()` returns current error statistics
- [ ] `useHealthStatus()` returns service health array
- [ ] `useClearErrorLog()` mutation invalidates error log query on success
- [ ] Event hook invalidates `healthKeys.errorLog()` and `healthKeys.errorStats()` on `event:app.error`
- [ ] Event hook shows toast on `event:app.capacityAlert`
- [ ] Event hook shows toast on `event:app.serviceUnhealthy`
- [ ] All hooks use `import type` for type-only imports
- [ ] Barrel exports all hooks
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, Error Handling, State Management, Documentation

**Feature-Specific QA Checks**:
- [ ] Event hook uses `useIpcEvent()` (not raw `window.api.on()`)
- [ ] Toast calls use `useToastStore` from shared stores
- [ ] Query hooks call `ipc()` helper (not `window.api.invoke()` directly)

---

### Task #7: 4-Tier Error Boundary Components

**Agent**: component-engineer
**Wave**: 3
**Blocked by**: Task #1
**Estimated complexity**: MEDIUM
**Context budget**: ~16,000 tokens (files: 5 create, 5 read)

**Description**:
Create four React error boundary components with increasing granularity. React error boundaries must be class components, but wrap them with clean functional component APIs. Each tier has a different fallback UI and recovery strategy.

**Files to Create**:
- `src/renderer/shared/components/error-boundaries/RootErrorBoundary.tsx` — Full-screen "Something went wrong" page with reload + copy stack buttons. Catches anything that escapes all lower boundaries. Reports to main process via `app.reportRendererError`.
- `src/renderer/shared/components/error-boundaries/RouteErrorBoundary.tsx` — Inline error card in content area. "Go to Dashboard" + "Retry" buttons. Resets on navigation (uses key from route path). Sidebar/command bar remain functional.
- `src/renderer/shared/components/error-boundaries/FeatureErrorBoundary.tsx` — Feature-level error card with "Retry" button. Wraps individual feature components. Rest of page stays alive.
- `src/renderer/shared/components/error-boundaries/WidgetErrorBoundary.tsx` — Small "Failed to load" placeholder. Silent recovery, no modal. For AssistantWidget, SpotifyWidget, etc.
- `src/renderer/shared/components/error-boundaries/index.ts` — Barrel export

**Files to Read for Context**:
- `src/renderer/shared/components/MutationErrorToast.tsx` — Component pattern reference
- `src/renderer/app/layouts/RootLayout.tsx` — Where root boundary wraps
- `src/renderer/app/router.tsx` — Where route boundary wraps
- `CLAUDE.md` — Component patterns, accessibility rules
- `ai-docs/PATTERNS.md` — Component conventions

**Acceptance Criteria**:
- [ ] All 4 error boundaries are class components (React requirement for error boundaries)
- [ ] RootErrorBoundary shows full-screen error with "Reload App" and "Copy Error Details" buttons
- [ ] RouteErrorBoundary shows inline card with "Go to Dashboard" and "Retry" buttons
- [ ] FeatureErrorBoundary shows error card with "Retry" button
- [ ] WidgetErrorBoundary shows small "Failed to load" text
- [ ] All boundaries call `window.api.invoke('app.reportRendererError', ...)` on catch
- [ ] All boundaries include route history from `useRouteHistoryStore` in error context
- [ ] RouteErrorBoundary resets state on navigation (key prop from route)
- [ ] All components use theme-aware Tailwind classes (no hardcoded colors)
- [ ] All interactive elements have keyboard handlers + ARIA attributes
- [ ] Barrel export from `index.ts`
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, UI: Components, UI: Accessibility, UI: Design System, Documentation

**Feature-Specific QA Checks**:
- [ ] Class component `componentDidCatch` calls `window.api.invoke()` (not the `ipc()` helper, since error boundaries might catch React Query errors)
- [ ] "Copy Error Details" copies stack trace to clipboard via `navigator.clipboard.writeText()`
- [ ] Error boundary components don't import heavy dependencies (keep fallback UI light)
- [ ] Each boundary has `displayName` set for React DevTools

**Implementation Notes**:
- React error boundaries MUST be class components (React limitation, no hook equivalent).
- Wrap in a pattern like: `class RouteErrorBoundaryInner extends Component<Props, State> { ... }` then export a functional wrapper that passes the `key` prop.
- For RouteErrorBoundary, use the route path as the `key` so state resets on navigation.
- Error reporting from class components can't use hooks, so use `window.api.invoke()` directly.

---

### Task #8: Health Indicator & Health Panel Components

**Agent**: component-engineer
**Wave**: 4
**Blocked by**: Task #6, Task #7
**Estimated complexity**: MEDIUM
**Context budget**: ~14,000 tokens (files: 2 create, 1 modify, 5 read)

**Description**:
Create the health indicator dot and health panel popover. Enhance the existing MutationErrorToast to render warnings and support click-to-navigate. The health indicator shows green/amber/red based on error counts and service health, clicking opens a panel with service status table and error log.

**Files to Create**:
- `src/renderer/features/health/components/HealthIndicator.tsx` — Small dot component with tooltip. Green pulsing when healthy, amber with count for warnings, red with count for errors. Click opens HealthPanel popover.
- `src/renderer/features/health/components/HealthPanel.tsx` — Popover panel with: service health table (name, status badge, last pulse), scrollable error log with context expansion, severity filter tabs (all/errors/warnings/info), "Copy all" button, "Clear" button with confirmation.

**Files to Modify**:
- `src/renderer/shared/components/MutationErrorToast.tsx` — Add warning icon variant (amber), support `onClick` callback on toast items (click-to-navigate to health panel), add different timing display for errors vs warnings

**Files to Read for Context**:
- `src/renderer/features/health/api/useHealth.ts` — Query hooks to consume
- `src/renderer/features/health/hooks/useErrorEvents.ts` — Event hooks to use
- `src/renderer/shared/components/HubStatus.tsx` — Adjacent component pattern (for TopBar placement)
- `src/renderer/shared/stores/toast-store.ts` — Enhanced toast interface
- `CLAUDE.md` — Design system rules, accessibility

**Acceptance Criteria**:
- [ ] HealthIndicator shows green pulsing dot when no errors/warnings
- [ ] HealthIndicator shows amber dot + count for warnings only
- [ ] HealthIndicator shows red dot + count when errors exist
- [ ] HealthIndicator tooltip says "ADC is healthy" / "N warnings" / "N errors"
- [ ] Click HealthIndicator → HealthPanel popover appears anchored below
- [ ] HealthPanel shows service health table with status badges
- [ ] HealthPanel shows scrollable error log with expandable context
- [ ] HealthPanel has severity filter tabs
- [ ] HealthPanel has "Copy all" and "Clear" buttons
- [ ] MutationErrorToast renders warning toasts with amber icon (AlertTriangle → yellow variant)
- [ ] Toast items with `onClick` are clickable (navigate somewhere)
- [ ] All theme-aware, accessible, lint-clean
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, UI: Components, UI: Accessibility, UI: Design System, Documentation

**Feature-Specific QA Checks**:
- [ ] Pulsing dot animation uses CSS (not JS timer)
- [ ] Popover dismisses on outside click
- [ ] Error log scrollable area has max-height constraint
- [ ] "Clear" button has confirmation dialog (not instant)
- [ ] Color-mix used for status colors (not hardcoded rgba)

---

### Task #9: Wire Error Boundaries & Health Indicator into Layout

**Agent**: router-engineer
**Wave**: 4
**Blocked by**: Task #7, Task #8
**Estimated complexity**: LOW
**Context budget**: ~14,000 tokens (files: 0 create, 3 modify, 4 read)

**Description**:
Wire the error boundary components into the router and layout. Add RootErrorBoundary around the AppRouter, RouteErrorBoundary around the Outlet (route content), and HealthIndicator into the TopBar next to HubStatus. Add route history tracking.

**Files to Modify**:
- `src/renderer/app/router.tsx` — Wrap `<RouterProvider>` with `<RootErrorBoundary>`. For route-level boundaries, wrap `<Outlet />` in RootLayout or add `errorComponent` to route definitions.
- `src/renderer/app/layouts/RootLayout.tsx` — Wrap `<Outlet />` with `<RouteErrorBoundary>`. Import and render `useErrorEvents()` hook for event subscriptions. Add route history tracking with `useRouteHistoryStore`.
- `src/renderer/app/layouts/TopBar.tsx` — Add `<HealthIndicator />` next to `<HubStatus />` in the right section.

**Files to Read for Context**:
- `src/renderer/shared/components/error-boundaries/index.ts` — Error boundary exports
- `src/renderer/features/health/components/HealthIndicator.tsx` — HealthIndicator component
- `src/renderer/features/health/index.ts` — Hook exports
- `src/renderer/shared/stores/route-history-store.ts` — Route history store

**Acceptance Criteria**:
- [ ] `AppRouter()` wraps `<RouterProvider>` in `<RootErrorBoundary>`
- [ ] `RootLayout` wraps `<Outlet />` in `<RouteErrorBoundary key={currentPath}>`
- [ ] `RootLayout` calls `useErrorEvents()` for real-time event subscriptions
- [ ] `RootLayout` tracks route changes via `useRouteHistoryStore.pushRoute()`
- [ ] `TopBar` renders `<HealthIndicator />` next to `<HubStatus />`
- [ ] Route boundary uses current path as `key` prop (resets on navigation)
- [ ] Existing navigation, sidebar, command bar all still work
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Architecture, UI: Components, Documentation

**Feature-Specific QA Checks**:
- [ ] Error boundaries don't interfere with TanStack Router's own error handling
- [ ] Route history tracking uses `useRouterState()` or equivalent
- [ ] No layout shift when health indicator is added to TopBar

**Implementation Notes**:
- For route history tracking, use `useEffect` with router state to push route changes.
- RouteErrorBoundary `key` should use `router.state.location.pathname` so it resets on navigation.
- FeatureErrorBoundary wrapping is NOT done here — individual features can opt-in by wrapping their page components later.

---

### Task #10: Unit & Integration Tests

**Agent**: test-engineer (general-purpose with test focus)
**Wave**: 5
**Blocked by**: Task #2, Task #3, Task #4
**Estimated complexity**: MEDIUM
**Context budget**: ~15,000 tokens (files: 3 create, 6 read)

**Description**:
Write unit tests for the core crash resilience services and integration tests for the IPC handlers. Focus on data-critical paths: ErrorCollector persistence/pruning, safeWriteJson atomicity, HealthRegistry pulse detection, and error handler wiring.

**Files to Create**:
- `tests/unit/services/error-collector.test.ts` — Tests for: report + persist, getLog with date filter, getStats calculation, clear, 7-day pruning, capacity alert at 50, corrupted file recovery
- `tests/unit/services/safe-write-json.test.ts` — Tests for: atomic write (tmp + rename), fsync called, original file untouched on failure
- `tests/integration/ipc-handlers/error-handlers.test.ts` — Tests for: all 5 IPC channels wired, error reporting creates entry, getErrorLog returns entries, clearErrorLog empties log

**Files to Read for Context**:
- `tests/unit/services/` — Existing test patterns
- `tests/integration/ipc-handlers/` — Existing integration test patterns
- `tests/setup/vitest.setup.ts` — Test setup
- `tests/setup/mocks/` — Available mocks (electron, fs, etc.)
- `src/main/services/health/error-collector.ts` — Implementation to test
- `src/main/lib/safe-write-json.ts` — Implementation to test

**Acceptance Criteria**:
- [ ] ErrorCollector tests cover: report, getLog, getStats, clear, pruning, capacity alert, corrupted file
- [ ] safeWriteJson tests cover: atomic write pattern, error handling
- [ ] Integration tests cover: all 5 IPC handler channels
- [ ] All tests pass with `npm run test`
- [ ] No flaky tests (deterministic, no timers unless mocked)
- [ ] Automated checks pass (lint, typecheck, test, build)

**QA Sections**: Automated Checks, Type Safety, Code Structure, Documentation

**Feature-Specific QA Checks**:
- [ ] Tests mock filesystem (don't write to real disk)
- [ ] Tests mock Date.now() for deterministic pruning tests
- [ ] Integration tests use existing IPC mock patterns

## 5. Wave Plan

### Wave 1: Foundation (no blockers) — 2 tasks parallel
- Task #1: Define types and IPC contract — schema-designer
- Task #2: Create ErrorCollector + HealthRegistry + safeWriteJson — service-engineer

### Wave 2: Wiring (blocked by Wave 1) — 2 tasks parallel
- Task #3: Wire error/health IPC handlers — ipc-handler-engineer
- Task #4: Main process crash protection + wiring — general-purpose

### Wave 3: Renderer Data Layer (blocked by Wave 2) — 3 tasks parallel
- Task #5: Route history + enhanced toast store — store-engineer
- Task #6: Health/error API hooks + event hooks — hook-engineer
- Task #7: 4-tier error boundary components — component-engineer

### Wave 4: UI Assembly (blocked by Wave 3) — 2 tasks parallel
- Task #8: Health indicator + health panel + enhanced toast — component-engineer
- Task #9: Wire error boundaries + health indicator into layout — router-engineer

### Wave 5: Tests (blocked by Waves 2-4) — 1 task
- Task #10: Unit + integration tests — test-engineer

### Dependency Graph
```
#1 Schema ─────┐
               ├──> #3 Handlers ──┐
#2 Services ───┤                  ├──> #5 Stores ──┐
               ├──> #4 Main ──────┤                ├──> #8 Health UI ──┐
               │                  ├──> #6 Hooks ───┤                  ├──> #10 Tests
               │                  │                ├──> #9 Router ─────┘
               │                  └──> #7 Errors ──┘
               │
               └──────────────────────────────────────> #10 Tests
```

### Parallel Opportunities
- Wave 1: Tasks #1 and #2 touch completely different files — full parallel
- Wave 2: Tasks #3 and #4 touch different files (handlers vs index.ts) — full parallel
- Wave 3: Tasks #5, #6, #7 touch different directories — full parallel (max concurrency)
- Wave 4: Tasks #8 and #9 touch different files — full parallel
- Wave 5: Single task, runs after all others

## 6. File Ownership Matrix

| File | Task | Agent |
|------|------|-------|
| `src/shared/types/health.ts` | #1 | schema-designer |
| `src/shared/types/index.ts` | #1 | schema-designer |
| `src/shared/ipc-contract.ts` | #1 | schema-designer |
| `src/main/lib/safe-write-json.ts` | #2 | service-engineer |
| `src/main/services/health/error-collector.ts` | #2 | service-engineer |
| `src/main/services/health/health-registry.ts` | #2 | service-engineer |
| `src/main/ipc/handlers/error-handlers.ts` | #3 | ipc-handler-engineer |
| `src/main/ipc/index.ts` | #3 | ipc-handler-engineer |
| `src/main/index.ts` | #4 | general-purpose |
| `src/renderer/shared/stores/route-history-store.ts` | #5 | store-engineer |
| `src/renderer/shared/stores/toast-store.ts` | #5 | store-engineer |
| `src/renderer/shared/stores/index.ts` | #5 | store-engineer |
| `src/renderer/features/health/api/queryKeys.ts` | #6 | hook-engineer |
| `src/renderer/features/health/api/useHealth.ts` | #6 | hook-engineer |
| `src/renderer/features/health/hooks/useErrorEvents.ts` | #6 | hook-engineer |
| `src/renderer/features/health/index.ts` | #6 | hook-engineer |
| `src/renderer/shared/components/error-boundaries/*.tsx` | #7 | component-engineer |
| `src/renderer/features/health/components/HealthIndicator.tsx` | #8 | component-engineer |
| `src/renderer/features/health/components/HealthPanel.tsx` | #8 | component-engineer |
| `src/renderer/shared/components/MutationErrorToast.tsx` | #8 | component-engineer |
| `src/renderer/app/router.tsx` | #9 | router-engineer |
| `src/renderer/app/layouts/TopBar.tsx` | #9 | router-engineer |
| `src/renderer/app/layouts/RootLayout.tsx` | #9 | router-engineer |
| `tests/unit/services/error-collector.test.ts` | #10 | test-engineer |
| `tests/unit/services/safe-write-json.test.ts` | #10 | test-engineer |
| `tests/integration/ipc-handlers/error-handlers.test.ts` | #10 | test-engineer |

**Conflicts: NONE** — every file is owned by exactly one task.

## 7. Context Budget

| Task | Files (Create/Modify) | Files (Read) | Estimated Tokens |
|------|----------------------|-------------|-----------------|
| #1 Schema | 3 | 5 | ~14,000 |
| #2 Services | 3 | 5 | ~14,000 |
| #3 Handlers | 2 | 6 | ~14,000 |
| #4 Main Process | 1 (large) | 7 | ~16,000 |
| #5 Stores | 3 | 4 | ~14,000 |
| #6 Hooks | 4 | 5 | ~15,000 |
| #7 Error Boundaries | 5 | 5 | ~16,000 |
| #8 Health UI | 3 | 5 | ~14,000 |
| #9 Router Wiring | 3 | 4 | ~14,000 |
| #10 Tests | 3 | 6 | ~15,000 |

All tasks under the 18,000-token threshold. No splitting required.

## 8. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Class component error boundaries don't integrate cleanly with functional patterns | Medium | Medium | Wrapper pattern documented in implementation notes; existing React 19 support confirmed |
| Modifying `index.ts` (658 lines) introduces regressions | Medium | High | Task #4 agent reads full file first; comprehensive integration tests in Task #10 |
| Toast store enhancement breaks existing callers | Low | Medium | Enhancement is additive (new 'warning' type); backward compatible |
| HealthRegistry sweep timer leaks on app quit | Low | Medium | `dispose()` method clears interval; wired to `before-quit` |

### Scope Risks

| Risk | Mitigation |
|------|----------|
| Project error header (design Phase 7) adds complexity | Deferred — marked out of scope, can be added later |
| Assistant integration (design Phase 8) touches complex service | Deferred — will be a follow-up feature |
| Applying safeWriteJson to all existing stores (5 stores) is a big migration | Deferred — only ErrorCollector uses it initially; store migration is separate task |

### Integration Risks

| Risk | Mitigation |
|------|----------|
| Wave 3 depends on Wave 1+2 being correct | Schemas + services are well-defined; Wave 2 agents read the schema output |
| Task #4 must pass null services gracefully to handlers | IPC handler engineer accounts for optional services; handlers check for null |
| Multiple agents editing adjacent files in same wave | File ownership matrix verified — no overlaps within any wave |

## 9. QA Strategy

### Per-Task QA Sections

| Task | Automated | Type Safety | Code Structure | Architecture | Error Handling | Security | UI Components | UI A11y | UI Design | API Contract | State Mgmt | Documentation |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| #1 Schema | Y | Y | Y | Y | — | — | — | — | — | Y | — | Y |
| #2 Services | Y | Y | Y | Y | Y | Y | — | — | — | — | — | Y |
| #3 Handlers | Y | Y | Y | Y | — | — | — | — | — | Y | — | Y |
| #4 Main Process | Y | Y | Y | Y | Y | Y | — | — | — | — | — | Y |
| #5 Stores | Y | Y | Y | Y | — | — | — | — | — | — | Y | Y |
| #6 Hooks | Y | Y | Y | Y | Y | — | — | — | — | — | Y | Y |
| #7 Boundaries | Y | Y | Y | Y | — | — | Y | Y | Y | — | — | Y |
| #8 Health UI | Y | Y | Y | Y | — | — | Y | Y | Y | — | — | Y |
| #9 Router | Y | Y | Y | Y | — | — | Y | — | — | — | — | Y |
| #10 Tests | Y | — | Y | — | — | — | — | — | — | — | — | — |

### Feature-Specific QA Checks (consolidated)
- [ ] ErrorCollector persists across app restarts (not cleared)
- [ ] Error log prunes entries >7 days on startup
- [ ] Capacity alert fires at 50+ session errors
- [ ] safeWriteJson writes atomically (tmp + fsync + rename)
- [ ] Corrupted JSON files recovered from backup or defaults
- [ ] All 4 error boundaries report to main process
- [ ] Error boundaries don't break existing routing
- [ ] Health indicator renders in TopBar without layout shift
- [ ] Health panel popover is accessible (keyboard, screen reader)
- [ ] Toast enhancements are backward-compatible
- [ ] Main process crash handlers don't interfere with normal operation

### Guardian Focus Areas
- File placement: new files in correct directories per CODEBASE-GUARDIAN rules
- Import paths: all use path aliases (@shared, @main, @renderer, @features)
- IPC contract integrity: all new channels have matching handlers
- Design system: no hardcoded colors, all theme-aware
- Accessibility: all interactive elements keyboard-accessible

## 10. Implementation Notes

### Patterns to Follow
- Service factory pattern: `createErrorCollector(dataDir)` returns interface (see `settings-service.ts`)
- IPC handler pattern: thin `router.handle()` wrappers with `Promise.resolve()` (see `settings-handlers.ts`)
- React Query hooks: `useQuery`/`useMutation` with `ipc()` helper (see `useTasks.ts`)
- Event hooks: `useIpcEvent()` with `queryClient.invalidateQueries()` (see `useTaskEvents.ts`)
- Zustand stores: `create<State>()(...)` with named interface (see `toast-store.ts`)
- Component pattern: named function declaration, hooks → derived → handlers → render

### Known Gotchas
- React error boundaries MUST be class components — no hook-based alternative exists in React 19
- `src/main/index.ts` uses `void (async () => { ... })()` pattern — crash handlers go before `app.whenReady()`
- ESLint `promise/always-return` conflicts with void callbacks — use async IIFE pattern
- `strict-boolean-expressions` — numbers can't be booleans, use explicit `> 0`
- TanStack Router `redirect()` needs eslint-disable comment for `only-throw-error`
- Toast store uses `window.setTimeout` — ensure cleanup on unmount

### Branch Strategy
- Feature branch: `feature/crash-resilience` from master
- Each task gets a workbranch: `work/crash-resilience/<task-slug>`
- Workbranches merged to feature branch after QA pass
- Feature branch gets PR to master after all tasks + Guardian pass
