# Sprint 3 — QA Recorder: BrowserView + Claude + Playwright

> Research compiled April 9-10, 2026. Sources: docs/QA-Feature-Research.md (PR #109, master), webview + Playwright + AI research agent, chrome-devtools-mcp patterns, Playwright MCP server analysis.

## Objective

Build a QA Recorder feature that uses Electron's `<webview>` to load any website, records user interactions as Playwright test steps, saves as `.spec.ts` files, runs them locally, and eventually lets Claude operate the recorder via the CommandBus MCP bridge.

## Architecture Summary

```
┌──────────────────────────────────────────── Electron Window ──┐
│                                                                │
│  ┌──── Step Panel ─────┐  ┌──── <webview> ─────────────────┐  │
│  │ navigate /          │  │  [Target Website]               │  │
│  │ click [Add Task]    │  │                                 │  │
│  │ fill title → "..."  │  │  recorder-preload.js captures   │  │
│  │ screenshot          │  │  sendToHost('rec:action', {...})│  │
│  │                     │  │                                 │  │
│  │ [Stop] [Save] [Run] │  │                                 │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Record**: `<webview>` loads target URL. Injected `recorder-preload.js` captures clicks, fills, navigation via `ipcRenderer.sendToHost`. Steps appear live in Step Panel.
2. **Save**: Steps convert to valid Playwright `.spec.ts` file at `{projectPath}/.adc/qa-recorder/{name}.spec.ts`
3. **Run**: `child_process.spawn('npx', ['playwright', 'test', specPath])` — output streamed via IPC events
4. **Commit**: Optional `simple-git` commit/push to project repo
5. **Auto-trigger**: When task moves to `review` status, QaTrigger runs all project scripts
6. **Claude operates**: CommandBus MCP bridge gives Claude access to `qa-recorder.run.script` — same channel as UI

## CDP Connection Pattern (for AI analysis)

In addition to the recorder preload, Playwright can connect to the webview via CDP for programmatic interaction:

```typescript
// Electron already runs with --remote-debugging-port=9222
const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();
// Each BrowserView/webview appears as a separate page
const pages = contexts[0].pages();
const targetPage = pages.find(p => p.url().includes('target-site.com'));
```

**Key finding:** `--remote-debugging-port` exposes ALL renderer processes — main window AND webviews. Playwright sees each as a separate page within contexts.

## AI Test Generation Pipeline

```typescript
// 1. Capture from webview page
const screenshot = await targetPage.screenshot({ fullPage: true });
const accessibilityTree = await targetPage.accessibility.snapshot();

// 2. Send to Claude
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', data: screenshot.toString('base64'), media_type: 'image/png' }},
      { type: 'text', text: `Accessibility tree:\n${JSON.stringify(accessibilityTree)}\n\nGenerate Playwright test suite. Use accessible selectors.` }
    ]
  }]
});

// 3. Save + execute
const testCode = response.content[0].text;
fs.writeFileSync(specPath, testCode);
spawn('npx', ['playwright', 'test', specPath]);
```

## Recorder Preload Selector Priority

Matches Playwright codegen priority:
1. `data-testid` / `data-cy` / `data-pw` → `page.getByTestId('add-task')`
2. ARIA role + accessible name → `page.getByRole('button', { name: 'Save' })`
3. Label association → `page.getByLabel('Email')`
4. Placeholder → `page.getByPlaceholder('Search...')`
5. Visible text → `page.getByText('Submit')`
6. CSS fallback → `page.locator('input').nth(2)` (last resort)

## SQLite Tables (2 new)

```sql
CREATE TABLE `qa_scripts` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `name` text NOT NULL,
  `base_url` text NOT NULL,
  `steps` text NOT NULL,           -- JSON: Step[]
  `file_path` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);

CREATE TABLE `qa_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `script_id` text NOT NULL,
  `project_id` text NOT NULL,
  `task_id` text,
  `session_id` text,               -- links to sessions table
  `status` text NOT NULL,          -- pending|running|passed|failed|error
  `triggered_by` text NOT NULL,    -- 'user' | 'qa-trigger' | 'claude'
  `report` text,                   -- JSON: QaRunReport
  `started_at` text NOT NULL,
  `completed_at` text
);
```

## IPC Channels (9 invoke + 3 event)

```
qa-recorder.list.scripts    → QaScript[]
qa-recorder.get.script      → QaScript
qa-recorder.save.script     → QaScript
qa-recorder.delete.script   → void
qa-recorder.run.script      → { runId }
qa-recorder.get.run         → QaRun
qa-recorder.list.runs       → QaRun[]
qa-recorder.export.file     → { filePath }
qa-recorder.export.github   → { commitHash }

event:qa-recorder.output      → { runId, line, type }
event:qa-recorder.screenshot  → { runId, name, dataUrl }
event:qa-recorder.complete    → { runId, passed, report }
```

## Electron Config Changes (2 lines)

```typescript
// src/main/index.ts
webPreferences: {
  webviewTag: true,  // ← enable <webview>
}

// Before createWindow()
app.on('certificate-error', (event, _wc, url, _err, _cert, cb) => {
  if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
    event.preventDefault();
    cb(true);
  } else cb(false);
});
```

## Webview Security for External Content

```html
<webview
  src="https://external-site.com"
  partition="persist:qa-sandbox"
  webpreferences="contextIsolation=yes, nodeIntegration=no, sandbox=yes"
  preload="resources/recorder-preload.js"
/>
```

- `partition` isolation prevents cookie/storage leakage to host app
- `sandbox=yes` + `nodeIntegration=no` for untrusted content
- `will-navigate` / `will-redirect` listeners to block unexpected navigation

## Integration Points

### QaTrigger Extension
```typescript
// In qa-trigger.ts handleTaskReview()
const scripts = db.select().from(qaScripts)
  .where(eq(qaScripts.projectId, projectId)).all();
for (const script of scripts) {
  await commandBus.dispatch('qa-recorder.run.script', { scriptId: script.id, taskId }, { type: 'system' });
}
```

### Playwright Runs as Sessions
```typescript
db.insert(sessions).values({
  id: runId, name: `QA: ${scriptName}`, type: 'playwright',
  phase: 'testing', status: 'running', projectId,
  startedAt: new Date().toISOString(),
});
```

### Claude via MCP Bridge
```
Claude → MCP bridge → commandBus.dispatch('qa-recorder.run.script')
       → sessions row (type: 'playwright', sourceType: 'agent')
       → event:qa-recorder.output streamed to renderer
       → qa_runs.status updated
```

## Related Tools and References

- `chrome-devtools-mcp` plugin — already installed, CDP-based browser interaction
- `playwright` MCP plugin — already installed, Playwright actions as MCP tools
- Playwright built-in agents (v1.58+) — test planner, generator, healer
- `terryso/claude-code-playwright-mcp-test` — YAML test framework for Claude + Playwright
- `ranger.net` — production AI-driven adaptive Playwright tests
- `alexop.dev` — Claude + Playwright MCP stack walkthrough

## File Map

### Create
```
resources/recorder-preload.js
src/renderer/features/qa-recorder/ (components, api, store)
src/shared/ipc/qa-recorder/ (schemas, contract, channels)
src/main/features/qa-recorder/ (service, script-store, runner, exporter)
drizzle/XXXX_qa_recorder.sql
```

### Modify
```
src/main/index.ts (webviewTag + cert handler)
src/main/features/qa/qa-trigger.ts (add Playwright suite run)
src/main/bootstrap/service-registry.ts (register qa-recorder service)
Route + nav files (add QA tab to project views)
```
