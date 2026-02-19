# Codebase Gap Analysis — UI, Wiring, Backend & Vision Gaps

> Tracker Key: `codebase-gap-analysis` | Status: **IMPLEMENTED** | Created: 2026-02-18

**Branch**: `work/dead-code-cleanup` (active cleanup in progress)
**Audit scope**: All 27 renderer features, 35 main services, ~200 IPC channels, shared types, existing docs

---

## Executive Summary

The codebase is architecturally mature — all major systems (auth, tasks, agents, Hub sync, IPC) are wired end-to-end. However, there are **concrete gaps** in three categories:

| Category | Count | Impact |
|----------|-------|--------|
| **BLOCKER** — Unresolved merge conflicts | 2 files | Branch can't build/typecheck |
| **Missing UI** — Backend exists, no renderer component | 7 | Features users can't access |
| **Missing Wiring** — UI + backend exist, not connected | 9 | Buttons that don't work, events not listened to |
| **Missing Backend/Hub** — Frontend expects it, backend is stub/placeholder | 6 | Features that silently fail |
| **Feature Modules with Thin Barrels** — Internal code exists but not exported | 5 | Dead-ish code, underutilized features |
| **P5 Polish (Planned, Not Done)** | 7 | Planned items from prior audit |
| **Vision Gaps (Future/Deferred)** | 9+ categories | Long-term roadmap |
| **TODOs/Future Markers in Code** | 15+ | In-code debt markers |

---

## 0. BLOCKER — Unresolved Merge Conflicts

Two shared type files have unresolved `<<<<<<<`/`=======`/`>>>>>>>` merge conflict markers:

| File | Status | Conflict Regions |
|------|--------|-----------------|
| `src/shared/types/hub-protocol.ts` | `UU` (unmerged) | 3 regions (lines 7-27, 103-118) |
| `src/shared/types/hub/index.ts` | `UU` (unmerged) | 1 region (lines 94-109) |

**The branch cannot build or typecheck until these are resolved.**

---

## 1. Missing UI — Backend Exists, No Renderer Components

These features have working services, IPC handlers, and contracts, but **no UI for users to interact with them**.

### 1a. Merge Workflow — Diff Preview & Conflict Resolution

| Layer | Status |
|-------|--------|
| Service | `merge-service.ts` — `previewDiff()`, `checkConflicts()`, `mergeBranch()`, `abort()` |
| IPC | 4 channels: `merge.previewDiff`, `merge.checkConflicts`, `merge.mergeBranch`, `merge.abort` |
| Renderer hooks | `useMergeDiff`, `useMergeConflicts`, `useMergeBranch`, `useAbortMerge` |
| UI | **Only `MergeConfirmModal`** — `ConflictResolver.tsx` and `MergePreviewPanel.tsx` deleted on current branch |

**Gap**: Users cannot preview diffs, see conflicts inline, or resolve conflicts. The only UI is the final "confirm merge" modal. The merge workflow is essentially headless.

**Needed**: Diff preview panel (side-by-side or unified), conflict resolution UI (accept ours/theirs/manual), conflict markers display.

### 1b. Screen Capture — No Renderer Feature

| Layer | Status |
|-------|--------|
| Service | `screen/screen-capture-service.ts` — `listSources()`, `capture()`, `checkPermission()` |
| IPC | 3 channels: `screen.listSources`, `screen.capture`, `screen.checkPermission` |
| UI | **Entire `features/screen/` deleted on current branch** (ScreenshotButton, ScreenshotViewer, queryKeys, useScreenCapture) |

**Gap**: Complete feature module was removed during dead code cleanup. Service and IPC exist but there's no way to trigger screen capture from the UI.

**Needed**: If this feature is desired, recreate minimal UI (screenshot button + viewer). If not, clean up the service/IPC contracts too.

### 1c. Workflow Feature — No Renderer Module

| Layer | Status |
|-------|--------|
| Service | `workflow/workflow-service.ts` — progress watcher, task launcher, session management |
| IPC | 5 channels: `workflow.watchProgress`, `workflow.stopWatching`, `workflow.launch`, `workflow.isRunning`, `workflow.stop` |
| UI | **Entire `features/workflow/` deleted on current branch** (store, API hooks, event hooks, barrel) |

**Gap**: Workflow service is functional (file watching, Claude session launching) but renderer feature was removed. No UI to start/stop progress watching or launch workflow sessions.

**Needed**: Decide if workflow UI belongs in the tasks feature or gets its own page. The backend is ready.

### ~~1d. Briefing — Not Accessible from Navigation~~ — **RESOLVED** (2026-02-19)

Briefing IS in the sidebar. `Sidebar.tsx:56` has `{ label: 'Briefing', icon: Newspaper, path: ROUTES.BRIEFING }` in the `topLevelItems` array (second item). Gap analysis was incorrect.

### 1e. Calendar — No OAuth Setup Path

| Layer | Status |
|-------|--------|
| Service | `calendar/calendar-service.ts` — `listEvents()`, `createEvent()`, `deleteEvent()` |
| IPC | 3 channels working |
| UI | `CalendarOverlay` in Planner, `CalendarWidget` in Productivity |

**Gap**: Calendar channels exist but there's **no OAuth setup for Google Calendar** in Settings. The OAuth provider settings only show GitHub and Spotify. Calendar widgets will silently show empty data.

**Needed**: Add Google Calendar OAuth provider to Settings > OAuth Providers with proper scopes (`calendar.readonly` at minimum).

### 1f. Voice — No Microphone UI

| Layer | Status |
|-------|--------|
| Service | `voice/voice-service.ts` — config, permission check |
| IPC | 3 channels: `voice.getConfig`, `voice.updateConfig`, `voice.checkPermission` |
| UI | `VoiceButton` component exists, `VoiceSettings.tsx` deleted on current branch |

**Gap**: Voice config and permission checking exist, but there's no visible microphone button in any page layout. `VoiceButton` is exported but never rendered anywhere in the app shell. Wake word detection noted as "for later."

**Needed**: Mount `VoiceButton` in the app shell (TopBar or floating) and wire to assistant.

### 1g. GitHub Issue Creation — No UI Trigger

| Layer | Status |
|-------|--------|
| Handler | `github.createIssue` in `github-handlers.ts` |
| UI | **No button wires to it** |

**Gap**: Can create GitHub issues via IPC but no UI button or form exists.

**Needed**: "New Issue" button on the GitHub page that opens a creation form.

---

## 2. Missing Wiring — Components Exist But Not Connected

### 2a. CommandBar Not Connected to Assistant

- **Component**: `CommandBar.tsx` renders in TopBar (Cmd+K trigger)
- **Gap**: May not be wired to `assistant.sendCommand` IPC — needs verification
- **Impact**: Users see a command bar but it might not process commands

### 2b. Onboarding ApiKeyStep Disconnected

- **Component**: `ApiKeyStep.tsx` collects API key during onboarding
- **Gap**: Unclear if it calls `settings.createProfile` to actually persist the key
- **Impact**: Users enter API key during onboarding but it may not be saved

### 2c. `projects.initialize` Handler Is a Skeleton

- **Handler**: Returns hardcoded `{ success: true }` with no real logic
- **File**: `src/main/ipc/handlers/project-handlers.ts:49-51`
- **Impact**: Project initialization does nothing

### 2d. Workspace Assignment Not Editable After Creation

- **Gap**: Workspace is set during project creation wizard but there's no UI to change it afterward
- **Impact**: Users stuck with initial workspace assignment

### 2e. Project Description Never Collected

- **Gap**: `Project` type has `description` field but the init wizard never asks for one
- **Impact**: All projects have empty descriptions

### 2f. IPC Events Defined But Never Emitted

| Event | Status |
|-------|--------|
| `event:alert.changed` | Defined in contract, never emitted, never listened to |
| `event:app.updateAvailable` | Stub — auto-updater not wired |
| `event:app.updateDownloaded` | Stub — auto-updater not wired |

### 2g. IPC Invoke Channels With No Renderer Usage

| Channel | Why Unused |
|---------|-----------|
| `tasks.update` | Renderer uses `tasks.updateStatus` variant instead |
| `terminals.invokeClaudeCli` | Reserved, no UI trigger |
| `changelog.addEntry` | Read-only viewer, no "add entry" button |
| `github.createIssue` | Handler exists, no UI form |
| `app.getVersion` | Internal — could be wired to Settings > About |

### ~~2h. Communications Event Hook Is Empty~~ — **RESOLVED** (2026-02-19)

- **File**: `src/renderer/features/communications/hooks/useCommunicationsEvents.ts`
- ~~**Gap**: Hook body is entirely empty — no event subscriptions wired~~
- **Actual**: Hook subscribes to `event:hub.connectionChanged` and updates Slack/Discord status in the store. Was never empty — gap analysis was incorrect.

### ~~2i. Feature Modules Not Exporting Their Internals~~ — **RESOLVED** (2026-02-19)

~~These features have rich internal implementations but their barrel files under-export:~~

| Feature | Claimed Gap | Actual Status |
|---------|------------|---------------|
| ~~**fitness**~~ | "Only exports FitnessPage" | **Already complete** — exports 10 API hooks, queryKeys, event hook, store, and FitnessPage |
| ~~**communications**~~ | "useMcpTool not exported" | **Fixed 2026-02-19** — `useMcpToolCall`, `useMcpConnectionState`, `useMcpConnectedServers` + types now exported |
| ~~**productivity**~~ | "Store not exported" | **Fixed 2026-02-19** — `useProductivityStore` now exported |
| ~~**ideation**~~ | "useIdeaEvents not exported" | **Already complete** — `useIdeaEvents` exported at `index.ts:9` |
| ~~**roadmap**~~ | "useMilestoneEvents not exported" | **Already complete** — `useMilestoneEvents` exported at `index.ts:8` |

---

### 2j. Orphaned Schema Definition

- `HubWsStatusOutputSchema` defined in `src/shared/ipc/hub/schemas.ts` but no IPC invoke or event channel uses it — dead code

### 2k. Duplicate Event Definition Not Merged

- `settingsEvents` in `src/shared/ipc/settings/contract.ts` defines `event:voice.transcript` but is **not imported into the root barrel** (`src/shared/ipc/index.ts`). The same event exists via `voiceEvents` from the misc domain, so this is redundant dead code — not a functional gap.

### 2l. Cost Tracker Deleted — No Replacement

- `src/main/services/workflow/cost-tracker.ts` was deleted on current branch
- If cost tracking per agent session is desired, it needs re-implementation
- The rest of workflow service (progress-watcher, progress-syncer, task-launcher) is intact

---

## 3. Missing Backend / Stub Implementations

**Note**: The main services audit confirmed that **all 35 services are real implementations** — no stubs or placeholders at the service level. **100% IPC contract-to-handler coverage** — every defined channel has a registered handler. The issues below are specific method-level stubs or limitations within otherwise-real services.

### 3a. App Auto-Updater Is a No-Op

- **File**: `src/main/services/app/app-update-service.ts`
- **Status**: Returns stub values. `electron-updater` was removed from package.json.
- **Impact**: No auto-update capability. IPC channels (`app.checkForUpdates`, `app.downloadUpdate`, `app.quitAndInstall`, `app.getUpdateStatus`) return empty results.

### 3b. MCP SSE Transport Is Placeholder

- **File**: `src/main/mcp/mcp-client.ts:329-333`
- **Status**: SSE transport emits error "SSE transport is not yet implemented"
- **Impact**: Only stdio-based MCP servers work. SSE-based servers cannot connect.

### 3c. Planner Weekly Review Returns "Coming Soon"

- **File**: `src/main/services/assistant/executors/planner.executor.ts:87`
- **Status**: `'Weekly review feature coming soon.'` hardcoded response
- **Impact**: Assistant can't generate weekly reviews via natural language command

### 3d. TaskService.executeTask() Returns Fake Agent ID

- **File**: `src/main/services/project/task-service.ts`
- **Status**: Returns hardcoded fake agentId, only marks task as `in_progress`
- **Note**: Real execution is in `AgentService.startAgent()` — this is an orphaned path

### 3e. Profile API Keys Stored in Plaintext

- **File**: `userData/settings.json`
- **Status**: Profile `apiKey` saved as plaintext while webhook secrets use `safeStorage` encryption
- **Impact**: Inconsistent security posture — API keys readable from disk

### 3f. Agent Pause/Resume Is No-Op on Windows

- **Status**: Uses SIGSTOP/SIGCONT which are Unix-only signals
- **Impact**: Pause/Resume buttons do nothing on Windows (the target platform)

---

## 4. Deprecated / Dead Code Still Present

### 4a. Legacy Agent System (5 files, all `@deprecated`)

| File | What It Is |
|------|-----------|
| `src/main/services/agent/agent-service.ts` | Legacy PTY-based agent spawner |
| `src/main/services/agent/agent-queue.ts` | Legacy queue system |
| `src/main/services/agent/agent-spawner.ts` | Legacy spawner |
| `src/main/services/agent/agent-output-parser.ts` | Legacy output parser |
| `src/main/services/agent/token-parser.ts` | Legacy token tracker |

All marked `@deprecated` in favor of `workflow/task-launcher.ts`. Still in codebase "for backward compatibility."

**Removal blocker**: `InsightsService` actively consumes `AgentService` for `agentRunCount`, `agentSuccessRate`, and `activeAgents` metrics. These must be migrated to `AgentOrchestrator` before the deprecated service can be deleted.

### 4b. Deprecated Type Fields

- `assignedComputerId` in `src/shared/types/hub/tasks.ts:28-29` — deprecated in favor of `assignedDeviceId`

### 4c. Dead Code Candidates

- `TaskService.executeTask()` — orphaned stub, real execution elsewhere
- Withings OAuth config — no actual API calls (P5 item #36)
- Background manager handlers — only log, never execute (P5 item #37)

---

## 5. Architecture Gaps

### 5a. No Offline Mode / Graceful Degradation

When the Hub is unreachable:
- Task CRUD fails silently (all tasks are Hub-first)
- No local fallback or queue
- Destructive banner shown but features are broken, not degraded

### 5b. No Database Migration System (Hub)

- Hub SQLite schema applied as raw `db.exec(schema.sql)` on every startup
- No version tracking, no migration history
- Schema changes risk data loss

### 5c. No CI/CD Pipeline

- No GitHub Actions workflow
- No automated lint/typecheck/test/build on PR
- No coverage reporting or minimum thresholds

### 5d. Insights Metrics Are Zero Without Historical Data

- Time-series data depends on tasks having completion timestamps
- Fresh install with no completed tasks shows all-zero metrics
- No sample data or empty state messaging for this case

### 5e. No Batch Operations

- Single-task operations only in AG-Grid
- No multi-select, no bulk status change, no bulk agent assignment
- Vision doc mentions this as Tier 4

### 5f. Worktree-Task Linking Missing

- Worktree CRUD exists, task system exists
- No auto-create worktree on task start
- No task-worktree association

---

## 6. P5 Polish Items (Planned, Not Implemented)

From `docs/plans/2026-02-14-p5-polish.md`:

| # | Item | Status | Plan Exists |
|---|------|--------|-------------|
| 31 | ~~Global Hub connection indicator in sidebar~~ | **RESOLVED** (2026-02-19) — `HubConnectionIndicator` rendered in `Sidebar.tsx:164`, fully implemented with status dots, tooltips, click-to-settings | Yes |
| 32 | Configurable hotkeys UI (wire HotkeySettings) | **Not done** | Yes — detailed in P5 plan |
| 33 | App launch at system startup | **Not done** | Yes — detailed in P5 plan |
| 34 | Database migration versioning for Hub | **Not done** | Yes — detailed in P5 plan |
| 35 | Electron auto-updater wiring | **Not done** | Yes — detailed in P5 plan |
| 36 | Remove Withings dead code | **Not done** | Yes — detailed in P5 plan |
| 37 | Clean up background-manager dead code | **Not done** | Yes — detailed in P5 plan |

---

## 7. Vision / Roadmap Gaps (Deferred Future Work)

From `docs/plans/2026-02-16-future-roadmap.md`:

### 7a. Layout Uplevel — Personal & Workspaces with Breadcrumbs

- Top-level nav restructure: Personal (calendar, fitness, journal) vs Workspaces (projects, tasks, agents)
- Breadcrumb navigation system
- Personal dashboard with customizable widget grid
- Google Calendar multi-email integration

### 7b. GitHub CI/CD Pipeline

- Actions workflow: lint, typecheck, test, build, E2E
- Coverage reporting with minimum thresholds
- PR status checks (required passing before merge)

### 7c. Tier 2 Tests

- IPC handler response shape tests for all 38 handler files
- Hub API client request/response tests
- Agent orchestrator session lifecycle tests
- Service health registry edge cases

### 7d. Tier 3 Tests

- Component rendering tests (React Testing Library)
- Full E2E flows (create project → add tasks → run agent → view results)
- Coverage reporting integration

### 7e. Offline Mode Resilience

- Graceful degradation when Hub is unreachable
- Local-first task queue with sync-on-reconnect

### 7f. Memory Leak Detection

- Long-running app monitoring
- IPC listener cleanup verification

### 7g. Startup Performance

- Cold start profiling and optimization
- Lazy service initialization

### 7h. Accessibility Audit

- Full a11y pass beyond what jsx-a11y catches
- Screen reader testing, focus management, high contrast

### 7i. Persistent Claude Session (Deeper)

- Standing instructions system (per-user preferences)
- Cross-app memory (remembers past interactions)
- Anthropic SDK direct integration (currently shells out to CLI)

---

## 8. Open UI Gaps (from `ai-docs/user-interface-flow.md`)

These are the previously-identified gaps that remain **OPEN**:

| # | Gap | Severity | Area |
|---|-----|----------|------|
| G-6 | `ApiKeyStep.tsx` may not wire to `settings.createProfile` | Low | Onboarding |
| G-7 | Project delete confirmation UX not verified | Low | Projects |
| G-8 | Workspace dropdown in wizard may not persist `workspaceId` | Low | Projects |
| G-9 | `DeviceSelector.tsx` exists but unclear when users would use it | Low | Settings |
| G-10 | `CommandBar.tsx` may not be connected to assistant | Low | Navigation |
| G-11 | Calendar IPC exists but no OAuth setup for Google Calendar | Low | Calendar |
| G-12 | Voice IPC exists but no visible microphone UI | Low | Voice |
| G-14 | `/briefing` not in sidebar — only via direct URL | Low | Navigation |
| G-17 | `projects.initialize` is a skeleton handler | Low | Projects |
| G-18 | Project type has `description` but wizard never asks | Low | Projects |
| G-19 | Workspace not editable after project creation | Low | Projects |
| G-20 | Profile API keys stored in plaintext | Medium | Security |

---

## 9. All TODO / Future / Placeholder Markers in Code

### In-Code Placeholders

| File | Line | Marker | Text |
|------|------|--------|------|
| `src/main/mcp/mcp-client.ts` | 329-333 | PLACEHOLDER | SSE transport placeholder — emits error "not yet implemented" |
| `src/main/services/assistant/executors/planner.executor.ts` | 87 | COMING SOON | `'Weekly review feature coming soon.'` |
| `src/renderer/features/communications/hooks/useCommunicationsEvents.ts` | 4-9 | PLACEHOLDER | "Placeholder for future IPC event subscriptions" — empty hook body |
| `src/main/ipc/handlers/project-handlers.ts` | 49-51 | STUB | `projects.initialize` returns hardcoded `{ success: true }` |
| `src/main/services/app/app-update-service.ts` | 5 | STUB | "return no-op/stub values so the app continues to function" |
| `src/renderer/features/assistant/hooks/useAssistantVoice.ts` | 6 | FUTURE | "allows adding wake word detection later" |

### @deprecated Markers

| File | Lines | What |
|------|-------|------|
| `src/main/services/agent/agent-service.ts` | 4-6 | Legacy agent service → use `workflow/task-launcher.ts` |
| `src/main/services/agent/agent-queue.ts` | 4-5, 11 | Legacy queue → replaced by workflow launcher |
| `src/main/services/agent/agent-spawner.ts` | 4-6 | Legacy spawner → use workflow launcher |
| `src/main/services/agent/agent-output-parser.ts` | 4-5 | Legacy parser → Hub handles parsing |
| `src/main/services/agent/token-parser.ts` | 4-5, 10 | Legacy token parser → Hub handles tracking |
| `src/shared/types/hub/tasks.ts` | 28-29 | `assignedComputerId` → use `assignedDeviceId` |

### Deferred P5 Items (Planned with Full Specs)

| # | Item | Plan Location |
|---|------|---------------|
| 31 | Hub connection indicator | `docs/plans/2026-02-14-p5-polish.md` |
| 32 | Configurable hotkeys UI | `docs/plans/2026-02-14-p5-polish.md` |
| 33 | App launch at startup | `docs/plans/2026-02-14-p5-polish.md` |
| 34 | Database migration versioning | `docs/plans/2026-02-14-p5-polish.md` |
| 35 | Electron auto-updater | `docs/plans/2026-02-14-p5-polish.md` |
| 36 | Remove Withings dead code | `docs/plans/2026-02-14-p5-polish.md` |
| 37 | Background-manager dead code | `docs/plans/2026-02-14-p5-polish.md` |

### Deferred Future Roadmap Items

| Category | Items | Plan Location |
|----------|-------|---------------|
| Layout Uplevel | Personal/Workspaces nav, breadcrumbs, personal dashboard | `docs/plans/2026-02-16-future-roadmap.md` |
| CI/CD | GitHub Actions, coverage, PR checks | `docs/plans/2026-02-16-future-roadmap.md` |
| Tier 2 Tests | Handler shape tests, Hub client tests, orchestrator tests | `docs/plans/2026-02-16-future-roadmap.md` |
| Tier 3 Tests | Component tests, E2E flows, coverage | `docs/plans/2026-02-16-future-roadmap.md` |
| Database Migrations | Versioned schema changes | `docs/plans/2026-02-16-future-roadmap.md` |
| Offline Mode | Local-first queue, sync-on-reconnect | `docs/plans/2026-02-16-future-roadmap.md` |
| Memory Leaks | Long-running monitoring | `docs/plans/2026-02-16-future-roadmap.md` |
| Startup Performance | Cold start profiling | `docs/plans/2026-02-16-future-roadmap.md` |
| Accessibility | Full a11y audit | `docs/plans/2026-02-16-future-roadmap.md` |

---

## 10. Feature Module Completeness Matrix

| Feature | Components | API Hooks | Event Hooks | Store | Assessment |
|---------|-----------|-----------|-------------|-------|------------|
| agents | 1 | 5 | 1 | - | **Full** |
| alerts | 3 | 4 | 1 | Yes | **Full** |
| assistant | 8 | 3 | 1 | Yes | **Full** |
| auth | 3 | 5 | 1 | Yes | **Full** |
| briefing | 2 | 5 | - | - | **Partial** — no events, not in sidebar |
| changelog | 7 | 3 | - | - | **Partial** — no events |
| communications | 6 | 1* | 1 (empty) | Yes | **Partial** — event hook empty, API not exported |
| dashboard | 7 | composite | 1 | Yes | **Full** |
| devices | 0 | 3 | 1 | - | **Partial** — headless, no components |
| fitness | 6 | 1* | 1* | Yes* | **Partial** — barrel under-exports |
| github | 5 | 4 | 1 | Yes | **Full** |
| health | 2 | 5 | 1 | - | **Full** |
| ideation | 1 | 1 | 1* | Yes | **Partial** — event hook not exported |
| insights | 1 | 3 | - | - | **Partial** — no events, no store |
| merge | 1 | 4 | - | - | **Partial** — key components deleted |
| my-work | 1 | 1 | - | - | **Partial** — minimal |
| notes | 4 | 5 | 1 | Yes | **Full** |
| onboarding | 6 | - | - | Yes | **Partial** — wizard-only, expected |
| planner | 12 | 8 | 1 | Yes | **Full** |
| productivity | 3 | 3 | - | Yes* | **Partial** — store not exported |
| projects | 15+ | 16 | 1 | - | **Full** |
| roadmap | 1 | 1 | 1* | Yes | **Partial** — event hook not exported |
| settings | 27 | 8+ | - | - | **Full** |
| tasks | 24+ | 13+ | 3 | Yes | **Full** |
| terminals | 2 | 3 | 1 | Yes | **Full** |
| voice | 1 | 3 | - | - | **Full** — hooks serve as domain logic |
| workspaces | 0 | 4 | 1 | - | **Partial** — headless, no components |

`*` = exists internally but not exported from barrel

**Full**: 15 features | **Partial**: 12 features | **Empty**: 0

---

## Recommended Priority Order

### Immediate (Current Branch Cleanup Decisions)

1. **Decide: Screen, Workflow, Merge components** — Were they deleted intentionally? If so, clean up corresponding services/IPC. If not, restore them.
2. **Fix merge conflicts** in `hub-protocol.ts` and `hub/index.ts` (currently `UU` status)

### Short-Term (Next Sprint)

3. **Wire briefing to sidebar** — 5-minute fix, high discoverability impact
4. **Fix empty communications event hook** — wire MCP connection state events
5. **Export under-exported barrels** (fitness, productivity, ideation, roadmap)
6. **Complete P5 items 31-37** — detailed plans already exist

### Medium-Term

7. **Google Calendar OAuth** in Settings
8. **Mount VoiceButton** in app shell
9. **GitHub issue creation UI**
10. **Merge workflow UI** (diff preview + conflict resolution)
11. **Encrypt profile API keys** (security — G-20)

### Long-Term (Future Roadmap)

12. Layout Uplevel (Personal & Workspaces)
13. CI/CD Pipeline
14. Offline Mode
15. Tier 2/3 Tests
16. Batch Operations
