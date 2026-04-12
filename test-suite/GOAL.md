# ADC Test Suite — Feature Goal

> **Priority:** #1
> **Status:** Goal locked. Implementation pending.
> **Date:** 2026-04-10

---

## What This Is

A Playwright-based test recording and execution system built into ADC. Users record browser interactions against any URL (localhost, preview, staging), save them as reusable test scripts, run them locally with screenshot capture, and export them as GitHub Actions CI workflows. Tests are team-wide — stored in the project repo, usable by all team members.

---

## Core Deliverables

### 1. BrowserView Recorder

Embed the target site in an Electron BrowserView (not webview tag) within ADC's layout. The BrowserView runs at a fixed pixel width/height set by the user — this makes click coordinates deterministic when CSS selectors aren't available.

**Recording captures:**
- Clicks (with selector or coordinate fallback)
- Text input / form fills
- Navigation (URL changes, SPA route transitions)
- Select/dropdown interactions
- Keyboard shortcuts (Enter, Tab, Escape, etc.)
- Wait conditions (element visible, network idle)

**Selector priority** (matches Playwright codegen):
1. `data-testid` / `data-cy` / `data-pw`
2. ARIA role + accessible name
3. Label association
4. Placeholder text
5. Visible text (buttons/links)
6. CSS selector fallback
7. Coordinate click (last resort, uses fixed BrowserView dimensions)

Chrome DevTools MCP selectors are preferred when available. The fixed BrowserView dimensions ensure coordinate-based clicks are reproducible across runs.

### 2. Test Storage System

Tests are saved to `test-suite/` at the project root (the repo being tested, not ADC itself). Structure:

```
test-suite/
  playwright.config.ts          # shared config (baseURL, viewport, screenshot dirs)
  scripts/
    <test-name>.spec.ts         # recorded Playwright test files
  screenshots/
    <test-name>/
      <run-timestamp>/
        <step-name>.png         # per-step screenshots
  fixtures/
    auth.ts                     # reusable auth flows
    helpers.ts                  # shared utilities
  README.md                     # auto-generated docs: how to run, structure, conventions
```

**Storage rules:**
- Each recorded test becomes a standalone `.spec.ts` file
- Tests are committed to the project repo (team-wide access)
- `README.md` is auto-generated and kept in sync with the test inventory
- `playwright.config.ts` is generated on first save if it doesn't exist
- Screenshots are gitignored by default (ephemeral per run)

### 3. Screenshot Capture System

Configurable screenshot triggers:

| Trigger | Description |
|---------|-------------|
| Per click | Screenshot after every click action |
| Per navigation | Screenshot after every URL change |
| Per completed form | Screenshot after form submission / blur of last field |
| Per assertion | Screenshot when an assertion passes or fails |
| Manual | User inserts screenshot step during recording |
| Smart mode | Auto-captures on navigation + form completion + assertion (default) |

**Screenshot output:**
- Saved to `test-suite/screenshots/<test-name>/<run-timestamp>/`
- Temp folder mode: save to OS temp dir for use in PR descriptions, ticket posts, Slack
- In-app viewer: browse screenshots per test run, with share/export/copy actions
- Export options (future): attach to PR description, attach to Jira/Linear ticket, post to Slack

### 4. URL Support

| URL Type | How It Works |
|----------|-------------|
| localhost | BrowserView loads directly. Self-signed cert bypass for HTTPS localhost. |
| Preview URLs | BrowserView loads any `https://` URL. No special handling needed. |
| Staging URLs | Same as preview. Auth cookies may need manual setup or fixture. |
| Authenticated sites | Auth fixture records login flow separately, replays before test. |

The BrowserView is a real Chromium instance — it handles any URL that Chrome can load.

### 5. CI Export

Export a recorded test as a GitHub Actions workflow that runs on PR:

**What gets exported:**
- The `.spec.ts` file (already in `test-suite/scripts/`)
- A `playwright.config.ts` if not already present
- A `.github/workflows/test-suite.yml` workflow file

**Workflow template:**
```yaml
name: Test Suite
on:
  pull_request:
    paths:
      - 'test-suite/**'
      - 'src/**'

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test test-suite/scripts/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            test-suite/screenshots/
            playwright-report/
```

**Export is additive:** exporting a second test adds it to the existing workflow, doesn't replace it.

---

## ADC Integration Points

### Settings — QA Recorder Configuration

Settings > Integrations (or new "Testing" tab) stores:

| Setting | Purpose |
|---------|---------|
| Default target URL | Pre-filled when opening recorder |
| BrowserView width | Fixed pixel width for reproducible coordinates |
| BrowserView height | Fixed pixel height for reproducible coordinates |
| Screenshot mode | Default capture trigger (smart/per-click/per-nav/manual) |
| Preload script path | Path to recorder preload (auto-detected from resources/) |
| Default test directory | Where to save tests (default: `test-suite/`) |

Saved configs are selectable — the last-used config auto-loads on app start.

### Route & Navigation

- Project-scoped route: `/projects/$projectId/test-suite`
- Navigation: "Test Suite" tab in project sidebar under Development section
- Page layout: toolbar + BrowserView (right) + step panel (left) + output panel (bottom)

### Data Layer

- `qa_scripts` table — already exists (rename/extend as needed)
- `qa_runs` table — already exists (extend with screenshot metadata)
- Settings stored in `settings_kv` under category `'qa-recorder'`
- All operations go through CommandBus (auditable, MCP-accessible)

### Existing Infrastructure Reuse

- Playwright runner (`child_process.spawn`) — already built in qa-recorder service
- IPC contract (9 invoke + 3 event channels) — already defined
- Recorder preload script — exists, needs Chrome MCP selector integration
- QaTrigger extension — already wires to task review status

---

## Out of Scope (for now)

- AI-assisted test generation (Claude writing tests from descriptions)
- Visual regression testing (pixel-diff comparison between runs)
- Cross-browser testing (Chromium only for BrowserView)
- Mobile viewport emulation (fixed dimensions only)
- Parallel test execution within ADC (one BrowserView at a time)
- Direct Jira/Slack/Linear integration for screenshot sharing (future, post-MVP)

---

## Success Criteria

1. User can open Test Suite tab, enter a URL, and record a click-through flow
2. Recording saves as a valid `.spec.ts` file in `test-suite/scripts/`
3. User can run saved tests from within ADC with streaming output
4. Screenshots are captured per configured trigger and viewable in-app
5. Tests are exportable as GitHub Actions CI workflows
6. BrowserView renders at user-specified fixed dimensions
7. Saved configuration persists and auto-loads on next session
8. Tests work against localhost, preview URLs, and staging URLs
9. `test-suite/README.md` auto-documents the test inventory

---

## Reference Documents

- [QA Feature Research](../docs/QA-Feature-Research.md) — architecture, IPC contract, preload design
- [E2E Test Suite Reference](../docs/testing/E2E-TEST-SUITE.md) — existing test infrastructure, coverage matrix, gap registry
