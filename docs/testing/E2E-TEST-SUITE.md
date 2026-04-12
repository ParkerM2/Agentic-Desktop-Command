# E2E Test Suite — Complete Reference

> **Generated:** 2026-04-06
> **Source data:** spec-survey.md (Task #1), feature-metadata.md (Task #2), coverage-analysis.md (Task #3)
> **Total tests:** 136 across 15 spec files
> **Coverage:** 2 THOROUGH, 10 SHALLOW, 11 SMOKE, 13 NONE (out of 36 features)

---

## Table of Contents

1. [Infrastructure Guide](#1-infrastructure-guide)
2. [Spec File Inventory](#2-spec-file-inventory)
3. [Feature Coverage Matrix](#3-feature-coverage-matrix)
4. [Gap Registry](#4-gap-registry)
5. [Recommendations](#5-recommendations)

---

## 1. Infrastructure Guide

All 15 spec files share a common infrastructure layer in `tests/e2e/`. The entry point is `electron.setup.ts`, which extends Playwright's `test` with Electron-specific fixtures. Five helper modules provide reusable utilities for auth, navigation, page interaction, console assertion, and screenshots.

### 1.1 `tests/e2e/electron.setup.ts` — Fixture Setup

This file extends Playwright's base `test` with three custom fixtures and re-exports `expect`. Every spec file imports from it instead of importing directly from `@playwright/test`.

**Environment:** Reads `.env.test` from the project root for `TEST_EMAIL` and `TEST_PASSWORD`. Sets `NODE_ENV=test` and `ELECTRON_IS_TEST=1` on the Electron process.

**Fixtures:**

| Fixture | Description |
|---------|-------------|
| `electronApp` | Launches `out/main/index.cjs` via `electron.launch()`. Torn down via `app.close()` after each test. |
| `mainWindow` | Gets the first window and waits for `domcontentloaded`. For unauthenticated tests only. |
| `authenticatedWindow` | Gets the first window, waits for full load, then calls `loginWithTestAccount()`. Used by all post-login tests. |

**Usage in a spec file:**

```typescript
import { test, expect } from './electron.setup';

// Unauthenticated — use mainWindow
test('login page loads', async ({ mainWindow }) => {
  await expect(mainWindow.locator('h1')).toContainText('Sign In');
});

// Authenticated — use authenticatedWindow
test('dashboard loads', async ({ authenticatedWindow }) => {
  await expect(authenticatedWindow).toHaveURL('/dashboard');
});
```

---

### 1.2 `tests/e2e/helpers/auth.ts` — Authentication Helpers

Handles UI-level login form interaction, including Hub-connection wait logic and retry on `hub_error`.

**Exports:**

| Export | Signature | Purpose |
|--------|-----------|---------|
| `loginWithTestAccount` | `(page: Page) => Promise<void>` | Fills email + password from env vars, clicks Sign In, waits for `/dashboard` redirect and sidebar visibility. Retries up to 3 times on Hub connection errors. |
| `ensureLoggedIn` | `(page: Page) => Promise<void>` | Checks if `aside` is already visible; if not, calls `loginWithTestAccount`. |

**Code example:**

```typescript
import { loginWithTestAccount, ensureLoggedIn } from './helpers/auth';

// Direct login (used internally by authenticatedWindow fixture)
test('manual login', async ({ mainWindow }) => {
  await loginWithTestAccount(mainWindow);
  await expect(mainWindow).toHaveURL('/dashboard');
});

// Idempotent — safe to call even if already logged in
test('already on dashboard', async ({ authenticatedWindow }) => {
  await ensureLoggedIn(authenticatedWindow); // no-op if sidebar visible
});
```

---

### 1.3 `tests/e2e/helpers/navigation.ts` — Navigation Helpers and Constants

Click-based navigation helpers. All functions use real Playwright DOM clicks — zero programmatic URL changes.

**Constants:**

```typescript
export const TOP_LEVEL_NAV_ITEMS = [
  'Dashboard',
  'My Work',
  'Fitness',
  'Productivity',
] as const;

export const PROJECT_NAV_ITEMS = [
  'Tasks',
  'Terminals',
  'Agents',
  'Pipeline',
  'Roadmap',
  'Ideation',
  'GitHub',
  'Changelog',
  'Insights',
] as const;

export const ROUTE_URL_MAP: Record<string, string> = {
  Dashboard: '/dashboard',
  'My Work': '/my-work',
  Fitness: '/fitness',
  Productivity: '/productivity',
};
```

> **Note:** `Settings` is NOT inside `<nav>` — it lives in the sidebar footer (`aside button`). `Briefing`, `Notes`, `Planner`, `Alerts`, and `Comms` were moved to Productivity tabs during the ui-layout-refactor and are no longer sidebar items. Project nav items require an active project; without one, the buttons are disabled.

**Exports:**

| Export | Signature | Purpose |
|--------|-----------|---------|
| `navigateToSidebarItem` | `(page, label) => Promise<void>` | Clicks `aside nav button` matching label, waits for `networkidle` |
| `navigateToSettings` | `(page) => Promise<void>` | Clicks `aside button` with text "Settings" (footer, not nav), asserts URL `/settings` |
| `navigateToProjectView` | `(page, label) => Promise<void>` | Clicks a project-scoped nav button, asserts it is enabled first |
| `toggleSidebarCollapse` | `(page) => Promise<void>` | Clicks whichever of collapse/expand button is currently visible |
| `isSidebarCollapsed` | `(page) => Promise<boolean>` | Returns `true` if the expand button is visible |
| `navigateToProjectsList` | `(page) => Promise<void>` | Clicks `button[title="Open project"]` in TopBar, asserts URL `/projects` |
| `openFirstProject` | `(page) => Promise<boolean>` | Clicks the first `button:has(.lucide-folder-open)` on the projects page; returns `false` if empty |
| `assertPageLoaded` | `(page) => Promise<void>` | Asserts no "Something went wrong" error boundary and non-blank body text |
| `waitForRoute` | `(page, urlPattern) => Promise<void>` | Waits for URL to match a string or RegExp pattern |

**Code example:**

```typescript
import {
  navigateToSidebarItem,
  navigateToSettings,
  navigateToProjectsList,
  openFirstProject,
  navigateToProjectView,
  assertPageLoaded,
  TOP_LEVEL_NAV_ITEMS,
} from './helpers/navigation';

test('navigate to all top-level pages', async ({ authenticatedWindow: page }) => {
  for (const label of TOP_LEVEL_NAV_ITEMS) {
    await navigateToSidebarItem(page, label);
    await assertPageLoaded(page);
  }
});

test('open a project and navigate to tasks', async ({ authenticatedWindow: page }) => {
  await navigateToProjectsList(page);
  const opened = await openFirstProject(page);
  test.skip(!opened, 'No projects exist');
  await navigateToProjectView(page, 'Tasks');
});

test('navigate to settings', async ({ authenticatedWindow: page }) => {
  await navigateToSettings(page);
  await expect(page).toHaveURL('/settings');
});
```

---

### 1.4 `tests/e2e/helpers/page-helpers.ts` — Page Content Helpers

Shared patterns for empty-state detection, tab navigation, modal open/close, form fill, and loading waits.

**Exports:**

| Export | Signature | Purpose |
|--------|-----------|---------|
| `hasEmptyState` | `(page) => Promise<boolean>` | Returns `true` if `[data-slot="empty-state"]` is visible |
| `verifyEmptyState` | `(page) => Promise<void>` | Asserts empty state is visible and has non-blank `h3` title |
| `clickTab` | `(page, label) => Promise<void>` | Clicks a button by label, waits for `networkidle` |
| `verifyButtonClickable` | `(page, name) => Promise<void>` | Asserts a button is visible and enabled |
| `openModalViaButton` | `(page, buttonName) => Promise<void>` | Clicks a button, checks for `dialog` role or falls back to 500ms wait |
| `closeModal` | `(page) => Promise<void>` | Presses Escape, waits 300ms |
| `fillByPlaceholder` | `(page, placeholder, value) => Promise<void>` | Fills an input by placeholder text |
| `clearByPlaceholder` | `(page, placeholder) => Promise<void>` | Clears an input by placeholder text |
| `waitForLoadingComplete` | `(page) => Promise<void>` | Waits for `.animate-spin` to disappear if visible |
| `waitForPageContent` | `(page) => Promise<void>` | Calls `networkidle` then `waitForLoadingComplete` |

**Code example:**

```typescript
import {
  hasEmptyState,
  verifyEmptyState,
  clickTab,
  openModalViaButton,
  closeModal,
  fillByPlaceholder,
  waitForPageContent,
} from './helpers/page-helpers';

test('create note form', async ({ authenticatedWindow: page }) => {
  await navigateToSidebarItem(page, 'Notes'); // hypothetical
  await waitForPageContent(page);

  if (await hasEmptyState(page)) {
    await verifyEmptyState(page);
  }

  await openModalViaButton(page, 'New Note');
  await fillByPlaceholder(page, 'Note title...', 'My test note');
  await closeModal(page);
});

test('tab navigation', async ({ authenticatedWindow: page }) => {
  await clickTab(page, 'Workouts');
  // page now shows Workouts tab content
});
```

---

### 1.5 `tests/e2e/helpers/console-collector.ts` — Console Error Assertion

Attaches a `page.on('console')` listener and categorizes messages into errors and warnings. Provides an assertion helper that filters known acceptable noise.

**Ignored patterns (built-in):** `/DevTools/i`, `/favicon/i`, `/ERR_CONNECTION_REFUSED/i`, `/Download the React DevTools/i`

**Exports:**

| Export | Type | Purpose |
|--------|------|---------|
| `ConsoleCollector` | `interface { errors: string[], warnings: string[] }` | Type for the live-updating collector object |
| `createConsoleCollector` | `(page) => ConsoleCollector` | Attaches listener, returns collector |
| `assertNoConsoleErrors` | `(collector, options?) => void` | Throws if any errors do not match the ignore patterns |

**Code example:**

```typescript
import { createConsoleCollector, assertNoConsoleErrors } from './helpers/console-collector';

test('no console errors on dashboard', async ({ authenticatedWindow: page }) => {
  const collector = createConsoleCollector(page);

  await page.goto('/dashboard');
  await page.waitForTimeout(2000);

  assertNoConsoleErrors(collector);
});
```

---

### 1.6 `tests/e2e/helpers/screenshot.ts` — Screenshot Capture

Saves Playwright screenshots to `tests/e2e/screenshots/` (directory is created on import via `mkdirSync`).

**Exports:**

| Export | Signature | Purpose |
|--------|-----------|---------|
| `takeScreenshot` | `(page, name) => Promise<string>` | Takes a viewport screenshot, saves as `<name>.png`, returns the file path |
| `takeFullPageScreenshot` | `(page, name) => Promise<string>` | Takes a full-page screenshot, saves as `<name>.png`, returns the file path |

> **Note:** `takeFullPageScreenshot` is exported but not called by any current spec file.

**Code example:**

```typescript
import { takeScreenshot, takeFullPageScreenshot } from './helpers/screenshot';

test('capture dashboard state', async ({ authenticatedWindow: page }) => {
  await page.goto('/dashboard');
  const path = await takeScreenshot(page, 'dashboard-loaded');
  console.log('Screenshot saved to:', path);
});

test('capture full settings page', async ({ authenticatedWindow: page }) => {
  await navigateToSettings(page);
  await takeFullPageScreenshot(page, 'settings-full');
});
```

---

## 2. Spec File Inventory

All 15 spec files, with their describe blocks, test count, coverage focus, and test type tags.

| # | File | Describe Block(s) | Tests | Coverage Focus | Type Tags |
|---|------|-------------------|-------|---------------|-----------|
| 01 | `01-auth.spec.ts` | Auth — Login Page; Auth — Successful Login | 8 | Login form render, empty form validation, register navigation, Hub setup link, successful login redirect | smoke, interaction, console |
| 02 | `02-navigation-sweep.spec.ts` | Navigation Sweep | 7 | Every top-level sidebar item + Settings reachable via real clicks; no error boundaries; non-blank body | smoke, interaction |
| 03 | `03-sidebar-mechanics.spec.ts` | Sidebar Mechanics | 9 | Sidebar visibility, collapse/expand, active item highlighting, Settings footer placement, project-item disabled states | smoke, interaction, visual, console |
| 04 | `04-dashboard.spec.ts` | Dashboard | 10 | All widgets render (Greeting, QuickCapture, RecentProjects, DailyStats, ActiveAgents); QuickCapture add + delete mutations | smoke, interaction, console |
| 05 | `05-briefing.spec.ts` | Briefing Page | 5 | Briefing page loads, Generate button visible and clickable, stats-or-empty-state branch handled | smoke, interaction, console |
| 06 | `06-my-work.spec.ts` | My Work Page | 5 | Page loads, status filter `<select>` present, filter interaction, task-list-or-empty-state | smoke, interaction, console |
| 07 | `07-notes.spec.ts` | Notes Page | 6 | Split panel layout, New Note button, note selection populates editor, text input accepted | smoke, interaction, console |
| 08 | `08-personal-tools.spec.ts` | Fitness Page; Planner Page; Productivity Page | 17 | Fitness tabs + Log Workout button; Planner date nav, Day/Week toggle, Weekly Review; Productivity tabs | smoke, interaction, console |
| 09 | `09-alerts-comms.spec.ts` | Alerts Page; Communications Page | 16 | Alerts tab switching, New Alert modal open/close; Communications tabs render with correct headings | smoke, interaction, console |
| 10 | `10-project-management.spec.ts` | Project Management | 12 | Projects list, Init Wizard modal open/close, New Project wizard open/close, project row click, TopBar tab | smoke, interaction, console |
| 11 | `11-project-scoped-pages.spec.ts` | Project-Scoped Pages | 11 | Tasks, Terminals, Agents, Pipeline, Roadmap, Ideation, GitHub, Changelog, Insights — all render or show correct empty state | smoke, interaction, console |
| 12 | `12-settings-full.spec.ts` | Settings Page | 17 | All settings sections render, Light/Dark mode toggle applies CSS class + computed style, Customize Theme navigates to `/settings/themes` | smoke, interaction, visual, console |
| 13 | `13-global-overlays.spec.ts` | Assistant Widget | 7 | FAB visible, panel open/close, chat input visible and accepts text, Ctrl+J keyboard toggle | smoke, interaction, keyboard, console |
| 14 | `14-theme-visual.spec.ts` | Theme Visual Verification | 5 | Default dark class verified, Light mode changes computed `backgroundColor`, dark mode restores, Customize Theme navigation | smoke, visual, console |
| 15 | `15-smoke-flow.spec.ts` | Full Smoke Flow | 1 | Sequential canary: entire app walkthrough via real clicks — all nav, projects, project pages, theme toggle, assistant | smoke |
| — | **TOTAL** | **18 describe blocks** | **136** | — | — |

---

## 3. Feature Coverage Matrix

Sorted NONE first, then SMOKE, SHALLOW, THOROUGH within each group.

> **Coverage definitions:**
> - **NONE** — No spec file references the feature at all
> - **SMOKE** — Page loads / renders verified, no user interactions tested
> - **SHALLOW** — 1–2 user interactions tested
> - **THOROUGH** — CRUD operations or multi-state flows tested

| # | Feature | Coverage Level | Spec File(s) | Notes |
|---|---------|---------------|--------------|-------|
| 1 | agent-dashboard | NONE | — | No spec tests AgentDashboardPage, AgentChatPanel, or any `agent-dashboard.*` IPC channel |
| 2 | devices | NONE | — | No spec references DeviceCard, DeviceSelector, or `devices.*` IPC channels |
| 3 | merge | NONE | — | No spec references MergeConfirmModal, MergePreviewPanel, ConflictResolver, or `merge.*` IPC channels |
| 4 | onboarding | NONE | — | No spec references OnboardingWizard, ClaudeCliStep, ApiKeyStep, or `app.*`/`settings.*` onboarding IPC paths |
| 5 | screen | NONE | — | No spec references ScreenshotButton, ScreenshotViewer, or `screen.*` IPC channels |
| 6 | visualization | NONE | — | No spec references VisualizationPage, VisualizationCanvas (React Flow), or `visualization.*` IPC channels |
| 7 | voice | NONE | — | No spec references VoiceButton, VoiceSettings, or `voice.*` IPC channels |
| 8 | workspaces | NONE | — | No spec references WorkspaceCard, WorkspacesTab, WorkspaceEditor, or `workspaces.*` IPC channels |
| 9 | diff-viewer *(undocumented)* | NONE | — | Undocumented feature directory; no spec references its components |
| 10 | file-explorer *(undocumented)* | NONE | — | Undocumented feature directory; no spec references its components |
| 11 | health *(undocumented)* | NONE | — | Undocumented feature directory; no spec references its components |
| 12 | tools *(undocumented)* | NONE | — | Undocumented feature directory; no spec references its components |
| 13 | workflow *(undocumented)* | NONE | — | Undocumented feature directory (distinct from `workflow-pipeline`); no spec references its components |
| 14 | agents | SMOKE | `11-project-scoped-pages.spec.ts` | "Agents" heading renders; empty state or session cards asserted. No agent spawn, stop, or log interaction tested |
| 15 | changelog | SMOKE | `11-project-scoped-pages.spec.ts` | "Changelog" heading and "Generate from Git" button render asserted. Button not clicked; `changelog.*` IPC never called |
| 16 | communications | SMOKE | `09-alerts-comms.spec.ts` | Four tabs render with correct headings; tab iteration confirms non-blank content. No message send, webhook, or rule creation tested |
| 17 | github | SMOKE | `11-project-scoped-pages.spec.ts` | "GitHub" heading, PR/Issues/Notifications tabs, and stat text asserted. No tab click or CRUD interaction; `github.*` IPC never called |
| 18 | hub-setup | SMOKE | `01-auth.spec.ts` | "Change Hub server" button visibility asserted. URL input, validation, and connection flow never exercised |
| 19 | ideation | SMOKE | `11-project-scoped-pages.spec.ts` | "Ideation" heading, "New Idea" button, and category filter pills render asserted. Button not clicked; `ideas.*` IPC never called |
| 20 | insights | SMOKE | `11-project-scoped-pages.spec.ts` | Heading, subtitle, four stat cards, and distribution sections asserted. No chart or filter interaction; `insights.*` IPC never called |
| 21 | roadmap | SMOKE | `11-project-scoped-pages.spec.ts` | "Roadmap" heading and "New Milestone" button render asserted; empty state or milestone stats asserted. Button not clicked |
| 22 | tasks | SMOKE | `11-project-scoped-pages.spec.ts` | Asserts `.ag-theme-quartz` grid (WARNING: broken — PR #79 replaced AG-Grid with TanStack Table). Expand toggle exercised. No task create, status change, or delete tested |
| 23 | terminals | SMOKE | `11-project-scoped-pages.spec.ts` | "Create Terminal" button or `button[title="New terminal"]` asserted. No terminal creation, input, or session management tested |
| 24 | workflow-pipeline | SMOKE | `11-project-scoped-pages.spec.ts` | "Workflow Pipeline" heading and task selector prompt or step nodes asserted. No task selection, step configuration, or pipeline execution tested |
| 25 | alerts | SHALLOW | `09-alerts-comms.spec.ts` | Tab switching, "New Alert" modal opens with correct fields, close modal via Cancel and backdrop. No alert create submission, edit, or delete tested |
| 26 | assistant | SHALLOW | `13-global-overlays.spec.ts` | FAB visible, click opens panel, chat textarea visible, text typed into input, close via button, Ctrl+J keyboard toggle. No message send or response cycle; `assistant.sendCommand` IPC never called |
| 27 | briefing | SHALLOW | `05-briefing.spec.ts` | Page loads, Generate button visible and clicked (response observed), stats-or-empty-state branch handled. No saved briefing mutation tested |
| 28 | fitness | SHALLOW | `08-personal-tools.spec.ts` | Page loads, four tabs visible, tab switching, "Log Workout" button clicked. No workout data entry or save tested |
| 29 | my-work | SHALLOW | `06-my-work.spec.ts` | Page loads, status filter present, filter changed to `'running'` and back, task count label visible. No task open, edit, or delete tested |
| 30 | notes | SHALLOW | `07-notes.spec.ts` | Page loads, split panel, "New Note" clicked, title/tags/content inputs appear, title and content filled, save button enabled. No save completion (IPC call) or delete tested |
| 31 | planner | SHALLOW | `08-personal-tools.spec.ts` | Page loads, date nav (previous/next) changes date text, Day/Week toggle, Today button, Weekly Review navigation. No time block creation or edit tested |
| 32 | productivity | SHALLOW | `08-personal-tools.spec.ts` | Page loads via sidebar click, Overview/Calendar/Spotify tabs visible, tab switching tested. No widget-level interactions tested |
| 33 | projects | SHALLOW | `10-project-management.spec.ts` | TopBar "+" navigation, Init Wizard modal open/close, New Project wizard open/close, project list or empty state, clicking row navigates to tasks URL, TopBar tab appears. No project create/save or delete mutation sent to server |
| 34 | settings | SHALLOW | `12-settings-full.spec.ts`, `14-theme-visual.spec.ts` | All settings sections render, Light/Dark mode toggle applied and verified via CSS class and computed style, "Customize Theme" navigates to `/settings/themes`. No form submissions tested |
| 35 | auth | THOROUGH | `01-auth.spec.ts` | Login render, empty form validation, register navigation, back-to-login, Hub setup link, successful login redirect with sidebar visible. Multiple flows including validation feedback and redirect |
| 36 | dashboard | THOROUGH | `04-dashboard.spec.ts` | All widgets render; QuickCapture add (type + click → item appears) and delete (click remove → item disappears) both verified as mutations |

---

## 4. Gap Registry

All features with NONE or SMOKE coverage, sorted HIGH → MEDIUM → LOW.

> **Priority definitions:**
> - **HIGH** — User-facing feature with no or smoke-only coverage where IPC mutation paths are never exercised
> - **MEDIUM** — Page renders tested but no interactions tested
> - **LOW** — Read-only or minor feature where smoke coverage is sufficient, or undocumented feature

### HIGH Priority Gaps

| Feature | Level | Gap Type | Priority | What Is Missing |
|---------|-------|----------|----------|-----------------|
| tasks | SMOKE | Mutation paths untested | HIGH | No task create, status change, plan feedback, QA review, or PR creation exercised. `hub.tasks.*`, `agent.*`, `qa.*`, `git.createPr` IPC channels entirely unexercised. AG-Grid selector also broken (replaced by TanStack Table in PR #79). |
| agents | SMOKE | Mutation paths untested | HIGH | No agent spawn, stop, or log retrieval tested. `agents.*` IPC channels entirely unexercised. Agents are a core workflow feature. |
| github | SMOKE | Mutation paths untested | HIGH | No PR/issue CRUD exercised. `github.*` IPC channels unexercised. Issue creation form (`useCreateIssue`) never invoked. GitHub is a primary integration feature. |
| merge | NONE | No coverage at all | HIGH | MergeConfirmModal, MergePreviewPanel, ConflictResolver, FileDiffViewer, and all `merge.*` IPC channels never tested. Used in active task flows with zero tests. |
| onboarding | NONE | No coverage at all | HIGH | First-run wizard (OnboardingWizard, ClaudeCliStep, ApiKeyStep) covering `app.*` and `settings.*` IPC never tested. Critical new-user path with zero coverage. |
| workspaces | NONE | No coverage at all | HIGH | WorkspaceCard, WorkspacesTab, WorkspaceEditor, and all `workspaces.*` IPC channels fully untested. |
| visualization | NONE | No coverage at all | HIGH | VisualizationPage, VisualizationCanvas (React Flow + dagre), and all `visualization.*` IPC channels never exercised. Complex interactive feature with zero tests. |
| agent-dashboard | NONE | No coverage at all | HIGH | AgentDashboardPage, AgentChatPanel, and all `agent-dashboard.*` IPC channels (getTask, getQaSession, listQaSessions, getFilesChanged, events) never exercised. Direct task-context agent view has zero tests. |
| terminals | SMOKE | Mutation paths untested | HIGH | Terminal creation, input, and session management entirely absent. `terminals.*` IPC channels never called. Core project feature. |
| workflow-pipeline | SMOKE | Mutation paths untested | HIGH | Pipeline renders heading and task selector prompt but no task is selected, no step is configured, and no pipeline execution is triggered. `hub.tasks.*` IPC for pipeline never called. |

### MEDIUM Priority Gaps

| Feature | Level | Gap Type | Priority | What Is Missing |
|---------|-------|----------|----------|-----------------|
| changelog | SMOKE | No interactions tested | MEDIUM | "Generate from Git" button rendered but never clicked. `changelog.*` IPC (generation mutation) never exercised. |
| ideation | SMOKE | No interactions tested | MEDIUM | "New Idea" button and category filters render but are never clicked. `ideas.*` IPC channels never called. |
| roadmap | SMOKE | No interactions tested | MEDIUM | "New Milestone" button renders but is never clicked. `milestones.*` IPC channels never called. |
| insights | SMOKE | No interactions tested | MEDIUM | Stat cards and distribution sections render. No filter, date-range, or chart interaction tested. `insights.*` IPC never called in tests. |
| communications | SMOKE | No interactions tested | MEDIUM | Slack/Discord/Rules tabs render correctly. No message send, webhook trigger, or rule creation tested. MCP tool calls never exercised. |
| hub-setup | SMOKE | No interactions tested | MEDIUM | "Change Hub server" button visible. URL input, validation, and connection flow (`hub.getConfig`, `hub.connect`) never exercised. Pre-auth setup path untested. |

### LOW Priority Gaps

| Feature | Level | Gap Type | Priority | What Is Missing |
|---------|-------|----------|----------|-----------------|
| devices | NONE | No coverage at all | LOW | DeviceCard/DeviceSelector embedded in Settings; no dedicated route. `devices.*` IPC is minor read-only hardware enumeration. Smoke coverage would be sufficient. |
| screen | NONE | No coverage at all | LOW | ScreenshotButton in TopBar is a utility widget. `screen.*` IPC triggered by single button click; read-only output. Low mutation risk. |
| voice | NONE | No coverage at all | LOW | VoiceButton in TopBar and VoiceSettings in SettingsPage. `voice.*` IPC handles audio toggle; no data mutations. Low impact if untested at smoke level. |
| diff-viewer *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory. No routes, IPC, or components documented. Cannot assess user-facing impact. Low priority until documented. |
| file-explorer *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory with components, hooks, and store. No documented routes or IPC channels. Low priority until documented. |
| health *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory. No known user-facing role. Low priority until documented. |
| tools *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory with store but no hooks. No known user-facing role. Low priority until documented. |
| workflow *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory (distinct from `workflow-pipeline`). No documented routes or IPC channels. Low priority until documented. |

---

## 5. Recommendations

For each HIGH-priority gap, a named new spec file is suggested along with a paragraph describing its scope.

---

### `16-tasks-crud.spec.ts` — Tasks CRUD and IPC

**Gap addressed:** tasks (SMOKE → target THOROUGH)

This spec should cover the full task lifecycle within a project: creating a task via the CreateTaskDialog (filling title, description, and status fields and confirming submission via the `tasks.*` IPC channel), verifying the newly created row appears in the TanStack Table grid (replacing the broken `.ag-theme-quartz` selector from `11-project-scoped-pages.spec.ts`), changing a task's status via TaskStatusBadge (asserting the mutation is reflected in the grid), expanding a task row to verify TaskDetailRow renders correctly, opening the PlanFeedbackDialog and submitting feedback, and triggering CreatePrDialog from a completed task to exercise `git.createPr`. Each mutation should assert both the IPC response and the resulting DOM update.

---

### `17-agents-lifecycle.spec.ts` — Agent Spawn and Log Retrieval

**Gap addressed:** agents (SMOKE → target THOROUGH)

This spec should exercise the full agent lifecycle visible from the Agents project page: navigating to the Agents tab via a real sidebar click, verifying the empty state ("Execute a task to start an agent") renders correctly, opening AgentControls to start an agent run (exercising relevant `agents.*` IPC), waiting for the agent to appear as a session card, clicking into the agent session to verify AgentLogs renders streamed output, and using AgentControls to stop the agent and confirm it transitions to a stopped/complete state. The spec should also assert that no console errors occur throughout the lifecycle and that the `agents.*` IPC channels are exercised end-to-end rather than only checked for DOM presence.

---

### `18-github-integration.spec.ts` — GitHub PR and Issue Interactions

**Gap addressed:** github (SMOKE → target SHALLOW/THOROUGH)

This spec should test the GitHub feature beyond heading and tab renders: clicking the PRs tab to load the PR list (`useGitHubPrs` hook call), clicking the Issues tab to load the issue list, clicking the Notifications tab, verifying the GitHubConnectionStatus component shows either connected or a connect prompt, clicking "Create Issue" to open IssueCreateForm and filling in title and body fields, submitting the form to exercise the `useCreateIssue` hook and assert the new issue appears in the list, and verifying that the `github.*` IPC round-trip completes without console errors. If GitHub is not connected in the test environment, the spec should gracefully assert the connection-required state rather than skip entirely.

---

### `19-merge-workflow.spec.ts` — Merge Modal and Conflict Resolution

**Gap addressed:** merge (NONE → target SHALLOW)

This spec should trigger the merge workflow from a task context where a PR-ready task exists: opening a completed task in the ProgressTaskGrid, clicking the "Merge" action to open MergeConfirmModal, asserting that the modal contains MergePreviewPanel with the expected diff summary, exercising ConflictResolver by asserting it renders when conflicts are present or is hidden when the merge is clean, verifying FileDiffViewer (`@git-diff-view/react`) renders file diff content, and clicking Confirm to exercise the `merge.*` IPC channel. The spec should also verify the close and cancel paths to ensure the modal dismisses cleanly without leaving state behind.

---

### `20-onboarding-wizard.spec.ts` — First-Run Onboarding Flow

**Gap addressed:** onboarding (NONE → target THOROUGH)

This spec should simulate a first-launch scenario by clearing onboarding completion state before the test (via IPC or test-env flags), then verify that OnboardingWizard appears automatically, that ClaudeCliStep renders a CLI status check and a copy-command link, that ApiKeyStep renders the API key input field and accepts a test key via `fillByPlaceholder`, that the wizard advances through all steps via Next buttons, and that completing the wizard calls the appropriate `app.*` and `settings.*` IPC channels to persist the onboarding state. The spec should also verify that after completion the wizard does not reappear on subsequent launches, and that no console errors are emitted throughout the flow.

---

### `21-workspaces-crud.spec.ts` — Workspace Management

**Gap addressed:** workspaces (NONE → target SHALLOW)

This spec should navigate to the Workspaces UI (embedded in Settings or project context), verify WorkspaceCard renders with correct workspace names, click WorkspacesTab to switch between workspace views, open WorkspaceEditor by clicking an edit action on a card, fill in workspace name and configuration fields, submit the form to exercise `workspaces.*` IPC mutation channels, and assert the updated workspace name appears in the card list. The spec should also test workspace deletion (if available) to confirm the card is removed from the list after the `workspaces.*` delete IPC call returns successfully.

---

### `22-visualization.spec.ts` — Codebase Visualization Canvas

**Gap addressed:** visualization (NONE → target SMOKE/SHALLOW)

This spec should navigate directly to the VisualizationPage (via URL, since it has no sidebar entry), wait for `visualization.getCodebaseGraph` IPC to resolve, assert that VisualizationCanvas renders (React Flow container visible), verify that at least one node type (FileGroupNode, FileNode, AgentTaskNode, or FeatureGroupNode) is present in the canvas, click a node to open NodeDetailPanel and assert it shows non-blank content, use LayerToggleToolbar to toggle a layer off and verify the corresponding nodes disappear, and assert `visualization.getAgentTeams` is called when agent team data is requested. The spec should handle the empty-canvas state gracefully if no codebase graph data is available in the test environment.

---

### `23-agent-dashboard-view.spec.ts` — Agent Dashboard and QA Session View

**Gap addressed:** agent-dashboard (NONE → target SHALLOW)

This spec should navigate to AgentDashboardPage from a task context (since there is no sidebar entry), assert that AgentChatPanel renders with a message history area, verify that ToolCallCard components are visible when tool calls exist in the session, exercise `agent-dashboard.getQaSession` by navigating to a QA session view and asserting QaSession content renders, test `agent-dashboard.listQaSessions` by asserting the session list populates, verify that `event:agent-dashboard.taskUpdated` is handled by confirming the UI updates when a task status change event is emitted (using a test IPC trigger), and assert that AgentStatusBar shows the correct running/complete state. The spec should also confirm `agent-dashboard.getFilesChanged` is exercised by asserting the file-change diff panel renders.

---

### `24-terminals-session.spec.ts` — Terminal Creation and Input

**Gap addressed:** terminals (SMOKE → target SHALLOW)

This spec should navigate to the Terminals project page via a real sidebar click, click "Create Terminal" (empty state button) or `button[title="New terminal"]` to exercise terminal creation via `terminals.*` IPC, wait for TerminalInstance to appear in the TerminalGrid, verify the terminal renders a visible input area or xterm container, type a simple command string into the terminal input and assert it echoes in the output area, and open a second terminal to verify TerminalGrid displays multiple instances side by side. The spec should also test closing a terminal session and confirming it is removed from the grid.

---

### `25-workflow-pipeline-execution.spec.ts` — Pipeline Task Selection and Execution

**Gap addressed:** workflow-pipeline (SMOKE → target SHALLOW)

This spec should navigate to the Pipeline page via a real sidebar click ("Pipeline" in PROJECT_NAV_ITEMS), verify WorkflowPipelinePage renders with the "Workflow Pipeline" heading, use TaskSelector to select an available task from the dropdown (exercising `hub.tasks.*` IPC to populate the list), assert that PipelineDiagram renders PipelineStepNode components and PipelineConnector edges after task selection, click the first step panel to open its configuration view and verify MarkdownEditor renders, use MarkdownEditor to input configuration text and assert the content is reflected in MarkdownRenderer preview, and click a pipeline execution trigger to confirm the step progression UI updates. The spec should gracefully skip execution if no tasks are available in the test environment.

---

## Known Test Quality Issues

The following issues affect the reliability of existing coverage claims and should be addressed before the coverage levels in Section 3 are considered accurate:

1. **Broken Tasks selector.** `11-project-scoped-pages.spec.ts` asserts `.ag-theme-quartz`. PR #79 replaced AG-Grid with TanStack Table. This test is likely failing silently. The Tasks SMOKE coverage level may not actually be passing.

2. **Stale sidebar labels.** Specs 03, 05, 08, and 09 navigate to sidebar labels (`Briefing`, `Notes`, `Alerts`, `Comms`, `Planner`) that are NOT in the current `TOP_LEVEL_NAV_ITEMS` constant. These labels were moved to Productivity tabs in the ui-layout-refactor. Coverage claimed for `briefing`, `notes`, `alerts`, and `planner` may be based on tests that are currently broken.

3. **No cleanup hooks.** Zero `afterEach`/`afterAll` hooks across all 15 spec files. State leakage between tests is possible when tests share fixture sessions.
