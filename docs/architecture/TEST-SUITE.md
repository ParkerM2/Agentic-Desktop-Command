# Test Suite Feature — Technical Reference

## Overview

Record browser interactions, save them as Playwright test scripts, run them, and view results. The feature spans all three processes (main, preload, renderer).

## DB Tables

### `test_suite_scripts` (migration 0009, renamed from `qa_scripts` in 0016)

| Column | Type | Source |
|--------|------|--------|
| id | text PK | `nanoid()` in `script-store.ts:save()` |
| project_id | text NOT NULL | from IPC input `SAVE.SCRIPT` |
| name | text NOT NULL | from IPC input |
| description | text | from IPC input (optional) |
| base_url | text NOT NULL | set to `config.targetUrl` via `index.ts:saveScript()` |
| steps | text NOT NULL | JSON-stringified step array, from recorded steps |
| file_path | text | absolute path from `writeSpecFile()` in `recorder-handlers.ts:165` |
| target_url | text NOT NULL | same as base_url (added in 0022) |
| step_count | integer NOT NULL | `steps.length` computed in `script-store.ts:save()` |
| last_status | text | **NEVER UPDATED** — always null. Dead column. |
| last_run_at | text | **NEVER UPDATED** — always null. Dead column. |
| created_at | text NOT NULL | ISO timestamp |
| updated_at | text NOT NULL | ISO timestamp |

### `test_suite_runs` (migration 0009, renamed from `qa_runs` in 0016)

| Column | Type | Written By | When |
|--------|------|------------|------|
| id | text PK | `runner.ts:run()` | on run start |
| script_id | text NOT NULL | `runner.ts:run()` | on run start |
| project_id | text NOT NULL | `runner.ts:run()` | on run start |
| status | text NOT NULL | `runner.ts:run()` sets `'running'`, `close` handler sets `'passed'`/`'failed'`, `cancel()` sets `'cancelled'` | start → completion |
| triggered_by | text NOT NULL | from `runScript()` input: `'manual'`, `'scheduled'`, `'ci'`, or `'auto-trigger'` | on run start |
| report | text | **NEVER WRITTEN** — always null | — |
| duration_ms | integer NOT NULL | `runner.ts` close/error handler: `endMs - startMs` | on completion |
| steps_passed | integer NOT NULL | **NEVER UPDATED** — always 0 | — |
| steps_failed | integer NOT NULL | **NEVER UPDATED** — always 0 | — |
| output | text | `runner.ts` close/error handler: `JSON.stringify({ outputLines, screenshots, error? })` | on completion |
| started_at | text NOT NULL | `runner.ts:run()` | on run start |
| completed_at | text | `runner.ts` close/error/cancel handler | on completion |
| task_id | text | `attachRunToTask` handler in `recorder-handlers.ts` | manual attachment |
| session_id | text | **NEVER WRITTEN** — always null | — |

### `test_suite_screenshots` (migration 0016)

Populated by `screenshot-capture.ts:index()` after run completion if `screenshotMode !== 'manual'`.

### `test_suite_schedules` (schema-schedules.ts)

Managed by `scheduler.ts`. Polls every 30s, fires `runScript({ triggeredBy: 'scheduled' })`.

### `test_suite_shared_steps` (schema-shared-steps.ts)

Managed by `shared-steps-store.ts`. Reusable step groups.

### `test_suite_diffs` (schema-baselines.ts)

Screenshot baseline comparisons via `diff-engine.ts`.

### Config storage

Configs are stored in `settings_kv` table with `category='test-suite'`, key=`${projectId}:${configId}`. Managed by `config-store.ts`. **Not** in a dedicated table.

---

## Data Flows

### Recording Flow

```
User clicks Record in RecordingPanel
  → clearSteps(), setRecordingActive(true) [Zustand store]
  → BrowserViewPanel renders <webview> with recorder preload
  → User interacts with the app in the webview
  → test-suite-recorder.ts (preload) captures click/fill/select/press/navigate
  → ipcRenderer.sendToHost('adc.test-suite.step', step)
  → BrowserViewPanel listens for 'ipc-message' event on <webview>
  → addStep() writes to Zustand store
  → StepList component renders live steps

User clicks Stop
  → setRecordingActive(false)
  → SaveRecordingDialog opens

User clicks Save
  → useSaveScript mutation → IPC: TEST_SUITE.SAVE.SCRIPT
  → recorder-handlers.ts:154:
      1. Gets projectPath from projectService
      2. Gets active config from configStore
      3. writeSpecFile() → writes .spec.ts to <projectRoot>/<testDir>/scripts/<slug>.spec.ts
      4. ensurePlaywrightConfig() → writes playwright.config.ts if missing
      5. Calls testSuiteService.saveScript() → scriptStore.save()
      6. Script record saved to test_suite_scripts table
```

### Run Flow (clicking Run)

```
User clicks Run in ResultsPanel or LibraryPanel
  → useRunScript mutation → IPC: TEST_SUITE.RUN.SCRIPT { scriptId, triggeredBy: 'manual' }
  → recorder-handlers.ts:186: testSuiteService.runScript(input)
  → index.ts:234: runScript()
      1. scriptStore.get(scriptId) → gets filePath, projectId
      2. deps.getProjectPath(projectId) → gets absolute project path
      3. configStore.getActive(projectId) → gets screenshotMode, testDir
      4. runner.run({ scriptId, projectId, filePath, projectPath, triggeredBy, screenshotDir, handlers })

  → runner.ts:77: run()
      1. INSERT into test_suite_runs: status='running'
      2. spawn('npx', ['playwright', 'test', filePath, '--reporter=line'], { cwd: projectPath, shell: win32 })
      3. stdout/stderr → emitLine() → handlers.onLine() → router.emit(OUTPUT.LINE) → useRunOutput hook
      4. On close(code):
         - code === 0 → status = 'passed'
         - code !== 0 → status = 'failed'
         - UPDATE test_suite_runs: status, completedAt, durationMs, output (JSON with outputLines)
         - handlers.onComplete() → router.emit(RUN.COMPLETED)
      5. On error(err):
         - status = 'failed', error = err.message
         - UPDATE test_suite_runs: status, completedAt, durationMs, output (JSON with error)
         - handlers.onComplete()

  → recorder-handlers.ts:188: router.emit(RUN.STARTED)
  → Returns { runId } to renderer
  → ResultsPanel: setSelectedRunId(data.runId) via onSuccess callback
```

### Pass/Fail Determination

**The ONLY determination is the Playwright process exit code.** `runner.ts:136`:
```
code === 0 → 'passed'
code !== 0 (or null) → 'failed'
```

There is no step-level pass/fail tracking. `steps_passed` and `steps_failed` columns are always 0.

### Results Display Flow

```
ResultsPanel renders:
  1. useTestSuiteScripts(projectId) → script list for dropdown
  2. useTestSuiteRuns(scriptId) → run list for dropdown
  3. useRunOutput(activeRunId) → live IPC event accumulation (keyed by runId)
  4. useRun(activeRunId) → stored run record from DB (has outputLines after completion)
  5. useMemo merges: live lines preferred if any, else stored outputLines
  6. useRunSteps(activeRunId) → live step events (keyed by runId)
  7. For completed runs: steps reconstructed from script.steps via stepToLabel()

Status badge: runRecord?.status ?? (activeRunId ? 'running' : 'pending')
```

### Analytics Data Source

All analytics queries are in `analytics.ts`. They query `test_suite_runs` directly via SQL.

| Metric | Query |
|--------|-------|
| Pass rate | `sum(case when status = 'passed' then 1 else 0 end) / count(*)` |
| Trend | Same, grouped by `date(started_at)` |
| Top failures | Count of `status = 'failed'` grouped by script_id |
| Flaky detection | Last 10 runs per script, count status flips (pass↔fail), flakeRate >= 0.2 |
| Error patterns | Parse `output` JSON for failed runs, extract lines containing "error" |

### Library (Listing) Status

`LibraryPanel` fetches ALL runs via `useAllTestSuiteRuns()`, iterates to find the latest run per script (by `startedAt`), and uses that run's `status` as the script's current status. Does **not** use `last_status` column (which is always null).

### Scheduled Runs

```
scheduler.ts polls every 30s:
  → Finds schedules where nextRunAt <= now AND enabled = true
  → Calls onTrigger callback (set in index.ts:318)
  → index.ts:320: service.runScript({ scriptId, triggeredBy: 'scheduled' })
  → Same runner flow as manual runs
```

### Watch Mode

```
watcher.ts: fs.watch() on spec file path
  → On file change (debounced 500ms):
  → recorder-handlers.ts:394: runScript({ triggeredBy: 'auto-trigger' })
  → router.emit(WATCH.TRIGGERED)
```

---

## File Map

### Main Process (`src/main/features/test-suite/`)

| File | Purpose |
|------|---------|
| `index.ts` | Service factory. Creates all sub-services, wires event handlers, exposes facade interface |
| `recorder-handlers.ts` | IPC handler layer. 47 channels. Thin bridge between IPC and service |
| `runner.ts` | Spawns `npx playwright test`. Manages active processes. Writes run records to DB |
| `script-store.ts` | CRUD for test_suite_scripts. Stores steps as JSON |
| `config-store.ts` | CRUD for configs in settings_kv table |
| `script-writer.ts` | Generates `.spec.ts` files from step arrays |
| `playwright-config-writer.ts` | Writes `playwright.config.ts` if missing |
| `browser-view-manager.ts` | BrowserView lifecycle (create, navigate, destroy, bounds) |
| `analytics.ts` | SQL aggregation queries for dashboard metrics |
| `exporter.ts` | Generates exportable spec files from step JSON |
| `workflow-exporter.ts` | CI/CD YAML generation (GitHub Actions) |
| `scheduler.ts` | setInterval-based periodic run triggers |
| `watcher.ts` | fs.watch on spec files for auto-rerun |
| `screenshot-capture.ts` | Indexes screenshot files after run completion |
| `baseline-store.ts` | Screenshot baseline records for visual diff |
| `diff-engine.ts` | Pixel-level screenshot comparison |
| `shared-steps-store.ts` | Reusable step group CRUD |
| `schema.ts` | Drizzle table definitions: test_suite_scripts, test_suite_runs, test_suite_screenshots |

### Preload (`src/preload/`)

| File | Purpose |
|------|---------|
| `test-suite-recorder.ts` | Injected into webview. Captures DOM events → `ipcRenderer.sendToHost()` |
| `selector-builder.ts` | Builds CSS selectors: testid > id > name > aria-label > role > css-path |

### Renderer (`src/renderer/features/test-suite/`)

| File | Purpose |
|------|---------|
| `test-suite-store.ts` | Zustand store: activeTab, recordedSteps, selectedScriptId, selectedRunId, recordingActive |
| `api/useRuns.ts` | `useRun(id)`, `useRuns(scriptId)`, `useRunScript()` — query + mutation hooks |
| `api/useTestSuiteRuns.ts` | `useTestSuiteRuns(scriptId)`, `useAllTestSuiteRuns()` |
| `api/useTestSuiteScripts.ts` | `useTestSuiteScripts(projectId)` |
| `api/testSuiteKeys.ts` | React Query key factory |
| `hooks/useRunOutput.ts` | Accumulates live `OUTPUT.LINE` IPC events, keyed by runId |
| `hooks/useRunSteps.ts` | Accumulates live `RUN.STEP` IPC events, keyed by runId |
| `hooks/useTestSuiteEvents.ts` | Invalidates query cache on `RUN.COMPLETED` and `CONFIG.CHANGED` |
| `components/TestSuitePage.tsx` | Tab container: Recording, Library, Results, Screenshots, Analytics, Shared Steps, Export |
| `components/RecordingPanel.tsx` | Dev server control + webview + step list + save dialog |
| `components/BrowserViewPanel.tsx` | `<webview>` wrapper with address bar, nav buttons, recorder preload |
| `components/ResultsPanel.tsx` | Script/run selectors, run button, status badge, step timeline, output log |
| `components/LibraryPanel.tsx` | Script table with search, filters, sparklines, batch actions |
| `components/AnalyticsPanel.tsx` | Summary cards, trend chart, top failures, flaky tests |

---

## Known Dead Columns

| Table | Column | Status |
|-------|--------|--------|
| test_suite_scripts | last_status | Never written. LibraryPanel uses useAllTestSuiteRuns() instead |
| test_suite_scripts | last_run_at | Never written |
| test_suite_runs | report | Never written |
| test_suite_runs | session_id | Never written |
| test_suite_runs | steps_passed | Written as 0, never updated |
| test_suite_runs | steps_failed | Written as 0, never updated |

## Known Dead Files

| File | Reason |
|------|--------|
| `renderer/features/test-suite/store.ts` | Old Zustand store, replaced by `test-suite-store.ts` |
| `api/useStartRecording.ts` | IPC-based recording replaced by webview `ipc-message` events |
| `api/useStopRecording.ts` | Same |
| `hooks/useBrowserViewBounds.ts` | BrowserView replaced by inline `<webview>` |

## IPC Events (emitted by main, consumed by renderer)

| Event | Emitted By | Consumed By |
|-------|-----------|-------------|
| `OUTPUT.LINE` | `runner.ts` via `onLine` handler → `recorder-handlers.ts:114` | `useRunOutput.ts` |
| `RUN.STARTED` | `recorder-handlers.ts:188` (after runScript resolves) | — (not consumed) |
| `RUN.STEP` | **Never emitted** — no code emits this event | `useRunSteps.ts` (always empty) |
| `RUN.COMPLETED` | `runner.ts` via `onComplete` handler → `recorder-handlers.ts:136` | `useTestSuiteEvents.ts` → invalidates all queries |
| `RUN.SCREENSHOT` | `recorder-handlers.ts:127` | — (not consumed by hooks) |
| `RECORDER.STEP` | — (not used; webview uses `ipc-message` instead) | — |
| `RECORDER.STOPPED` | — (not used) | — |
| `CONFIG.CHANGED` | `recorder-handlers.ts` (config save/delete/set-active handlers) | `useTestSuiteEvents.ts` → invalidates config query |
| `WATCH.TRIGGERED` | `recorder-handlers.ts:397` | — (not consumed) |
