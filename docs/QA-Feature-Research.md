# QA Recorder — Feature Research & Integration Plan

> **Status:** Research complete. Ready for implementation.
> **Target:** New project-scoped tab in the Electron app for recording, saving, and running Playwright browser tests against localhost.

---

## The Vision

A **QA Recorder tab** per project that lets you:

1. Load your running app in an embedded webview
2. Click through a user flow naturally — steps are captured in real time
3. Save the recording as a valid `.spec.ts` Playwright test file
4. Run it locally from within the app (streamed output + screenshots)
5. Commit it to the project's GitHub repo via `simple-git`
6. Have it auto-fire when a task moves to `review` status (same trigger point as the existing agent QA)
7. Eventually let Claude operate it via the CommandBus MCP bridge

---

## Architecture: How Recordings Work

### Electron WebView + Preload Injection

The recording happens inside a `<webview>` tag embedded in the app. A preload script is injected into the webview that captures DOM events and sends them to the parent frame via `ipcRenderer.sendToHost`.

```
┌──────────────────────────────────────────── Electron Window ──┐
│                                                                │
│  ┌──── Step Panel ─────┐  ┌──── <webview> ─────────────────┐  │
│  │ navigate /          │  │  [Your App — https://localhost] │  │
│  │ click [Add Task]    │  │                                 │  │
│  │ fill title → "..."  │  │  User clicks here →             │  │
│  │ screenshot          │  │  preload captures event         │  │
│  │                     │  │  sendToHost('rec:action', {...})│  │
│  │ [Stop] [Save] [Run] │  │                                 │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
             ↑ ipc-message event → step appended in real time
```

### Two Changes Needed in `src/main/index.ts`

**1. Enable webviewTag in BrowserWindow:**
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.mjs'),
  sandbox: false,
  contextIsolation: true,
  nodeIntegration: false,
  webviewTag: true,  // ← ADD THIS
},
```

**2. Bypass self-signed cert for HTTPS localhost** (add before `createWindow()` call):
```typescript
app.on('certificate-error', (event, _webContents, url, _error, _cert, callback) => {
  if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
    event.preventDefault();
    callback(true); // trust self-signed cert for local dev
  } else {
    callback(false);
  }
});
```

### The Recorder Preload (`resources/recorder-preload.js`)

Injected into the webview. Captures clicks, fills, and navigation — converts each to a Playwright-compatible locator string, then sends to parent frame.

**Selector priority (matches Playwright codegen):**
```
data-testid / data-cy / data-pw  →  page.getByTestId('add-task')
aria role + accessible name      →  page.getByRole('button', { name: 'Save' })
label association                →  page.getByLabel('Email')
placeholder                      →  page.getByPlaceholder('Search...')
visible text (buttons/links)     →  page.getByText('Submit')
CSS fallback                     →  page.locator('input').nth(2)   ← last resort
```

```javascript
// Capture clicks
document.addEventListener('click', (e) => {
  ipcRenderer.sendToHost('rec:action', {
    type: 'click',
    locator: bestLocator(e.target),
    label: e.target.textContent?.trim().slice(0, 40),
  });
}, true); // capture phase — fires before page handles it

// Capture fills (on blur, not every keystroke)
document.addEventListener('blur', (e) => {
  if (e.target.matches('input,textarea,select')) {
    ipcRenderer.sendToHost('rec:action', {
      type: 'fill',
      locator: bestLocator(e.target),
      value: e.target.value,
    });
  }
}, true);

// Capture SPA navigation (history.pushState)
const _pushState = history.pushState.bind(history);
history.pushState = (...args) => {
  _pushState(...args);
  ipcRenderer.sendToHost('rec:action', { type: 'navigate', url: location.href });
};
```

### What Gets Saved

Steps convert directly to a valid Playwright test file saved at `{projectPath}/.adc/qa-recorder/{name}.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('Tasks CRUD Flow', async ({ page }) => {
  await page.goto('https://localhost:3000/tasks');
  await page.getByRole('button', { name: 'Add Task' }).click();
  await page.getByLabel('Title').fill('My test task');
  await page.screenshot({ path: 'screenshots/after-create.png' });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('task-list')).toContainText('My test task');
});
```

No intermediate format — the step panel shows valid Playwright code in real time. What you see is what gets saved and run.

---

## Integration with the Existing System

### The Existing QA System is Agent-Based

The current `QaRunner` + `QaTrigger` fires **Claude as an agent** to review code quality (lint, typecheck, build, docs). The Playwright recorder adds a **complementary browser test layer**. Same trigger point, different runtime:

```
Task → 'review' status
  ├── QaTrigger.startQuiet()       ← existing: Claude agent QA (code review)
  └── PlaywrightSuite.runAll()     ← new: run all .spec.ts for this project
```

### SQLite — Two New Drizzle Tables

New migration (`drizzle/XXXX_qa_recorder.sql`):

```sql
-- Recorded test scripts (metadata + steps)
CREATE TABLE `qa_scripts` (
  `id`         text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `name`       text NOT NULL,
  `base_url`   text NOT NULL,
  `steps`      text NOT NULL,   -- JSON: Step[]
  `file_path`  text,            -- path to generated .spec.ts
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE INDEX `idx_qa_scripts_project_id` ON `qa_scripts` (`project_id`);

-- Every execution run, regardless of who triggered it
CREATE TABLE `qa_runs` (
  `id`           text PRIMARY KEY NOT NULL,
  `script_id`    text NOT NULL,
  `project_id`   text NOT NULL,
  `task_id`      text,           -- set when triggered by QaTrigger
  `session_id`   text,           -- links to sessions table
  `status`       text NOT NULL,  -- pending|running|passed|failed|error
  `triggered_by` text NOT NULL,  -- 'user' | 'qa-trigger' | 'claude'
  `report`       text,           -- JSON: { passed, failed, errors[], screenshots[] }
  `started_at`   text NOT NULL,
  `completed_at` text
);
CREATE INDEX `idx_qa_runs_project_id` ON `qa_runs` (`project_id`);
CREATE INDEX `idx_qa_runs_script_id`  ON `qa_runs` (`script_id`);
CREATE INDEX `idx_qa_runs_task_id`    ON `qa_runs` (`task_id`);
```

`project_id` and `session_id` match existing `sessions` and `commands` columns — cross-bus queries work immediately.

### CommandBus — Every Operation is Audited

All QA recorder IPC routes through `commandBus.dispatch()`. Every run shows up in the `commands` table with full source tracking:

```typescript
// User triggers from UI
commandBus.dispatch('qa-recorder.run.script', { scriptId }, { type: 'user' })

// QaTrigger fires automatically on task review
commandBus.dispatch('qa-recorder.run.suite', { projectId, taskId }, { type: 'system', id: 'qa-trigger' })

// Claude fires it as an agent (future)
commandBus.dispatch('qa-recorder.run.script', { scriptId }, { type: 'agent', id: sessionId })
```

`sourceType: 'agent'` is already supported by the bus — no new infrastructure.

### Playwright Runs Register as Sessions

Each run gets a row in the existing `sessions` table:

```typescript
db.insert(sessions).values({
  id: runId,
  name: `QA: ${scriptName}`,
  type: 'playwright',     // alongside 'agent', 'planning', etc.
  phase: 'testing',
  status: 'running',
  projectId,
  taskSlug: taskId ?? null,
  startedAt: new Date().toISOString(),
});
```

The agent dashboard, analytics views, and Claude session queries all see Playwright runs alongside agent sessions automatically.

### QaTrigger Extension (one loop added)

In `src/main/features/qa/qa-trigger.ts`, inside `handleTaskReview()`:

```typescript
// Existing — Claude agent QA (unchanged)
await qaRunner.startQuiet(taskId, context);

// New — run all Playwright scripts recorded for this project
const scripts = db.select().from(qaScripts)
  .where(eq(qaScripts.projectId, projectId)).all();

for (const script of scripts) {
  await commandBus.dispatch(
    'qa-recorder.run.script',
    { scriptId: script.id, taskId },
    { type: 'system', id: 'qa-trigger' }
  );
}
```

One addition. Everything else already works.

### Claude Operating It (the eventual goal)

The CommandBus already has an MCP bridge (`src/main/bus/mcp-bridge.ts`). When QA recorder channels are registered on the bus, Claude gets access through the same mechanism it uses for everything else — no new tool definitions required:

```
Claude → MCP bridge → commandBus.dispatch('qa-recorder.run.script')
       → sessions row (type: 'playwright', sourceType: 'agent')
       → event:qa.output streamed to renderer
       → qa_runs.status updated: passed | failed
       → event:qa.complete → report shown in UI
```

---

## File Map

### Files to Create

```
resources/
  recorder-preload.js              # webview event capture + selector generator

src/renderer/features/qa-recorder/
  components/
    QaRecorderPage.tsx             # root — splits StepPanel + WebviewPanel
    WebviewPanel.tsx               # <webview> + URL bar + record/stop toolbar
    StepPanel.tsx                  # live step list + save/export controls
    StepItem.tsx                   # single step row with edit/delete
    RunOutput.tsx                  # streaming log output + inline screenshots
    GithubExport.tsx               # commit to project git remote
  api/
    useQaScripts.ts                # useQuery → qa-recorder.list.scripts
    useRunScript.ts                # useMutation → qa-recorder.run.script
    useSaveScript.ts               # useMutation → qa-recorder.save.script
  index.ts
  store.ts                         # isRecording, steps[], activeScript, runLog[]

src/shared/ipc/qa-recorder/
  schemas.ts
  contract.ts
  index.ts

src/main/features/qa-recorder/
  index.ts                         # service factory (createQaRecorderService)
  script-store.ts                  # CRUD against qa_scripts table
  runner.ts                        # spawns playwright, streams output via IPC event
  exporter.ts                      # write .spec.ts + optional simple-git commit/push

src/main/db/
  schema.ts                        # add qaScripts + qaRuns table definitions

drizzle/
  XXXX_qa_recorder.sql             # migration for the two new tables
```

### Files to Modify

```
src/main/index.ts
  + webviewTag: true  in webPreferences
  + certificate-error handler for https://localhost

src/shared/constants/routes.ts
  + QA_RECORDER: 'qa-recorder'  in PROJECT_VIEWS
  + ROUTE_PATTERNS.PROJECT_QA_RECORDER

src/renderer/app/routes/project.routes.ts
  + qaRecorderRoute

src/renderer/app/layouts/sidebar-layouts/shared-nav.ts
  + { label: 'QA', icon: FlaskConical, path: PROJECT_VIEWS.QA_RECORDER }
    in developmentItems

src/main/features/qa/qa-trigger.ts
  + loop to dispatch qa-recorder.run.script for all project scripts

src/main/bootstrap/service-registry.ts
  + createQaRecorderService(...)
  + wireQaRecorderHandlers(...)

src/main/bootstrap/ipc-wiring.ts
  + register qa-recorder IPC handlers
```

---

## IPC Contract

```typescript
// Invoke channels
'qa-recorder.list.scripts'   → QaScript[]
'qa-recorder.get.script'     → QaScript
'qa-recorder.save.script'    → QaScript
'qa-recorder.delete.script'  → void
'qa-recorder.run.script'     → { runId: string }
'qa-recorder.get.run'        → QaRun
'qa-recorder.list.runs'      → QaRun[]
'qa-recorder.export.file'    → { filePath: string }
'qa-recorder.export.github'  → { commitHash: string }

// Event channels (main → renderer)
'event:qa-recorder.output'      → { runId: string; line: string; type: 'stdout' | 'stderr' }
'event:qa-recorder.screenshot'  → { runId: string; name: string; dataUrl: string }
'event:qa-recorder.complete'    → { runId: string; passed: boolean; report: QaRunReport }
```

---

## GitHub Actions Integration (optional, generated by the app)

The Export tab can generate and commit this workflow alongside the spec:

```yaml
# .github/workflows/qa-recorder.yml
name: QA Recorder Tests
on:
  pull_request:
    types: [labeled]
    # Add label "run-qa" to trigger

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test .adc/qa-recorder/ --reporter=html
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Prior Art / Reference Projects

- [terryso/claude-code-playwright-mcp-test](https://github.com/terryso/claude-code-playwright-mcp-test) — YAML-based test framework for Claude Code + Playwright MCP. Closest existing analog to this feature.
- [lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill) — Claude Code skill that writes and executes Playwright code, returns screenshots + console output.
- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) — Official MCP server. Relevant once Claude is operating the QA runner.
- [ranger.net](https://www.ranger.net/) — Most production-ready version of AI-driven adaptive Playwright tests. Good reference for the UX and report format.
- [alexop.dev — Building an AI QA Engineer](https://alexop.dev/posts/building_ai_qa_engineer_claude_code_playwright/) — Best end-to-end walkthrough of the Claude + Playwright MCP stack.
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer) — The trace artifact format: DOM snapshots + network requests + console at every step. Target output format for run results.

---

## Implementation Order (suggested)

1. **Drizzle migration** — `qa_scripts` + `qa_runs` tables, schema definitions
2. **`src/main/index.ts`** — `webviewTag: true` + cert bypass (2 lines each)
3. **`resources/recorder-preload.js`** — event capture + selector generator
4. **IPC contract** — schemas, contract, barrel in `src/shared/ipc/qa-recorder/`
5. **Main service** — script-store, runner, exporter, factory
6. **Route + nav wiring** — constant, route file, sidebar nav item
7. **Renderer feature** — store, API hooks, page components
8. **QaTrigger extension** — add Playwright suite run on task review
9. **GitHub Actions template** — generated by the Export tab on first use
