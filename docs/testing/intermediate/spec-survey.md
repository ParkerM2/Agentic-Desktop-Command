# E2E Spec File Survey

Produced by: qa-tester (Quinn) — Task #1, team "e2e-documentation"
Date: 2026-04-06
Source files surveyed: `tests/e2e/` — 21 files (1 setup + 5 helpers + 15 specs)

---

## Total Test Count Summary

| File | describe blocks | test() count |
|------|----------------|-------------|
| 01-auth.spec.ts | 2 | 8 |
| 02-navigation-sweep.spec.ts | 1 | 7 |
| 03-sidebar-mechanics.spec.ts | 1 | 9 |
| 04-dashboard.spec.ts | 1 | 10 |
| 05-briefing.spec.ts | 1 | 5 |
| 06-my-work.spec.ts | 1 | 5 |
| 07-notes.spec.ts | 1 | 6 |
| 08-personal-tools.spec.ts | 3 | 17 |
| 09-alerts-comms.spec.ts | 2 | 16 |
| 10-project-management.spec.ts | 1 | 12 |
| 11-project-scoped-pages.spec.ts | 1 | 11 |
| 12-settings-full.spec.ts | 1 | 17 |
| 13-global-overlays.spec.ts | 1 | 7 |
| 14-theme-visual.spec.ts | 1 | 5 |
| 15-smoke-flow.spec.ts | 1 | 1 |
| **TOTAL** | **18** | **136** |

Test count verified by running `grep -cE "^\s+test\('[^']+'"` on each file.

---

## Infrastructure Files

### `tests/e2e/electron.setup.ts`

**Purpose:** Extends Playwright's base `test` with three Electron-specific fixtures. Exports the extended `test` object and re-exports `expect`. All spec files import `{ test, expect }` from this file.

**Exports:**
- `test` — extended Playwright test with three fixtures:
  - `electronApp` — launches `out/main/index.cjs` via `electron.launch()`, tears down via `app.close()`
  - `mainWindow` — gets the first window, waits for `domcontentloaded`; used for unauthenticated tests
  - `authenticatedWindow` — gets the first window, waits for load, calls `loginWithTestAccount()`; used for all post-login tests
- `expect` — re-exported from `@playwright/test`

**Environment:** Reads `.env.test` from project root for `TEST_EMAIL` / `TEST_PASSWORD`. Sets `NODE_ENV=test` and `ELECTRON_IS_TEST=1` on the launched process.

**Usage:** Imported by all 15 spec files as `import { test, expect } from './electron.setup'`.

---

### `tests/e2e/helpers/auth.ts`

**Purpose:** UI-level authentication helpers. Handles the login form interaction including Hub-connection wait logic and retry on `hub_error`.

**Exports:**

| Export | Signature | Purpose |
|--------|-----------|---------|
| `loginWithTestAccount` | `(page: Page) => Promise<void>` | Fills email + password from `TEST_EMAIL` / `TEST_PASSWORD` env vars, clicks "Sign In", waits for `/dashboard` redirect and sidebar visibility. Retries up to 3 times on Hub connection errors. |
| `ensureLoggedIn` | `(page: Page) => Promise<void>` | Checks if `aside` is already visible; if not, calls `loginWithTestAccount`. |

**Usage:** `loginWithTestAccount` is called internally by the `authenticatedWindow` fixture in `electron.setup.ts`. `ensureLoggedIn` is available for tests that may already be on an authenticated page.

---

### `tests/e2e/helpers/navigation.ts`

**Purpose:** Click-based navigation helpers. Zero programmatic navigation — all functions use real Playwright clicks on DOM elements. Exports navigation constants and helper functions.

**Exports:**

| Export | Type | Purpose |
|--------|------|---------|
| `TOP_LEVEL_NAV_ITEMS` | `const string[]` | `['Dashboard', 'My Work', 'Fitness', 'Productivity']` — top-level sidebar labels |
| `ROUTE_URL_MAP` | `Record<string, string>` | Maps sidebar label to URL path: Dashboard→`/dashboard`, My Work→`/my-work`, Fitness→`/fitness`, Productivity→`/productivity` |
| `PROJECT_NAV_ITEMS` | `const string[]` | `['Tasks', 'Terminals', 'Agents', 'Pipeline', 'Roadmap', 'Ideation', 'GitHub', 'Changelog', 'Insights']` — project-scoped sidebar labels |
| `navigateToSidebarItem` | `(page, label) => Promise<void>` | Clicks `aside nav button` matching label, waits for `networkidle` |
| `navigateToSettings` | `(page) => Promise<void>` | Clicks `aside button` with text "Settings" (in footer, not nav), asserts URL `/settings` |
| `navigateToProjectView` | `(page, label) => Promise<void>` | Clicks project-scoped nav button, asserts enabled first |
| `toggleSidebarCollapse` | `(page) => Promise<void>` | Clicks whichever of collapse/expand button is visible |
| `isSidebarCollapsed` | `(page) => Promise<boolean>` | Returns true if expand button is visible |
| `navigateToProjectsList` | `(page) => Promise<void>` | Clicks `button[title="Open project"]` in TopBar, asserts URL `/projects` |
| `openFirstProject` | `(page) => Promise<boolean>` | Clicks first `button:has(.lucide-folder-open)` on projects page; returns false if empty |
| `assertPageLoaded` | `(page) => Promise<void>` | Asserts no "Something went wrong" error boundary and non-blank body text |
| `waitForRoute` | `(page, urlPattern) => Promise<void>` | Waits for URL to match string or RegExp pattern |

**Usage:** Imported by specs 02–11, 15.

---

### `tests/e2e/helpers/page-helpers.ts`

**Purpose:** Shared patterns for page content interaction — empty state detection, tab clicks, modal open/close, form fills, and loading waits.

**Exports:**

| Export | Signature | Purpose |
|--------|-----------|---------|
| `hasEmptyState` | `(page) => Promise<boolean>` | Returns true if `[data-slot="empty-state"]` is visible |
| `verifyEmptyState` | `(page) => Promise<void>` | Asserts empty state is visible and has non-blank `h3` title |
| `clickTab` | `(page, label) => Promise<void>` | Clicks button by label, waits for `networkidle` |
| `verifyButtonClickable` | `(page, name) => Promise<void>` | Asserts button is visible and enabled |
| `openModalViaButton` | `(page, buttonName) => Promise<void>` | Clicks button, checks for `dialog` role or falls back to 500ms wait |
| `closeModal` | `(page) => Promise<void>` | Presses Escape, waits 300ms |
| `fillByPlaceholder` | `(page, placeholder, value) => Promise<void>` | Fills input by placeholder text |
| `clearByPlaceholder` | `(page, placeholder) => Promise<void>` | Clears input by placeholder text |
| `waitForLoadingComplete` | `(page) => Promise<void>` | Waits for `.animate-spin` to disappear if visible |
| `waitForPageContent` | `(page) => Promise<void>` | Calls `networkidle` + `waitForLoadingComplete` |

**Usage:** Imported by specs 04, 05, 06, 07, 15.

---

### `tests/e2e/helpers/console-collector.ts`

**Purpose:** Attaches a `page.on('console')` listener and categorizes messages into errors and warnings. Provides assertion helper that filters known acceptable noise.

**Exports:**

| Export | Type | Purpose |
|--------|------|---------|
| `ConsoleCollector` | `interface { errors: string[], warnings: string[] }` | Type for the live-updating collector object |
| `createConsoleCollector` | `(page) => ConsoleCollector` | Attaches listener, returns collector |
| `assertNoConsoleErrors` | `(collector, options?) => void` | Throws if any errors not matching ignore patterns |

**Ignored patterns (built-in):** `/DevTools/i`, `/favicon/i`, `/ERR_CONNECTION_REFUSED/i`, `/Download the React DevTools/i`

**Usage:** Imported by all 15 spec files.

---

### `tests/e2e/helpers/screenshot.ts`

**Purpose:** Saves Playwright screenshots to `tests/e2e/screenshots/` directory (created on import via `mkdirSync`).

**Exports:**

| Export | Signature | Purpose |
|--------|-----------|---------|
| `takeScreenshot` | `(page, name) => Promise<string>` | Takes viewport screenshot, saves as `<name>.png`, returns path |
| `takeFullPageScreenshot` | `(page, name) => Promise<string>` | Takes full-page screenshot, saves as `<name>.png`, returns path |

**Usage:** Imported by specs 03, 04, 12, 14, 15.

---

## Spec Files

### `tests/e2e/01-auth.spec.ts`

**Purpose comment:** "Verifies login page rendering, successful authentication, validation, register page navigation, and clean console output."

**Fixture used:** `mainWindow` (unauthenticated tests) and `authenticatedWindow` (login success test).

**describe blocks:** `Auth — Login Page` (7 tests), `Auth — Successful Login` (1 test)

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `login page loads with email and password inputs and Sign In button` | Auth — Login Page | smoke | Unauthenticated landing page shows Sign In heading, email/password labels+placeholders, Sign In button |
| `empty form submission shows validation or error` | Auth — Login Page | interaction | Clicks Sign In with empty form; asserts still on login page (no navigation, button still visible) |
| `register link navigates to register page` | Auth — Login Page | interaction | Clicks "Sign up" button; asserts "Create Account" heading appears |
| `register page has all required fields` | Auth — Login Page | smoke | Navigates to register; asserts Display Name, Email, Password, Confirm Password inputs and Create Account button |
| `back to login from register page` | Auth — Login Page | interaction | Navigates to register, clicks "Sign in" link; asserts return to Sign In heading |
| `Hub setup link exists on login page` | Auth — Login Page | smoke | Asserts "Change Hub server" button is visible on login page |
| `no unexpected console errors during unauthenticated flows` | Auth — Login Page | console | Asserts no unexpected errors collected during unauthenticated page flows |
| `successful login redirects to dashboard with sidebar visible` | Auth — Successful Login | smoke | Uses `authenticatedWindow`; asserts `/dashboard` URL, sidebar visible, Sign In heading gone, no console errors |

**test() count: 8**

---

### `tests/e2e/02-navigation-sweep.spec.ts`

**Purpose comment:** "Verifies every top-level sidebar nav item + Settings are reachable via real clicks. No programmatic navigation."

**describe blocks:** `Navigation Sweep` (7 tests)

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `click Dashboard navigates to /dashboard` | Navigation Sweep | smoke | Clicks Dashboard in sidebar; asserts `/dashboard` URL and page loaded |
| `click My Work navigates to /my-work` | Navigation Sweep | smoke | Clicks My Work in sidebar; asserts `/my-work` URL and page loaded |
| `click Fitness navigates to /fitness` | Navigation Sweep | smoke | Clicks Fitness in sidebar; asserts `/fitness` URL and page loaded |
| `click Productivity navigates to /productivity` | Navigation Sweep | smoke | Clicks Productivity in sidebar; asserts `/productivity` URL and page loaded |
| `click Settings navigates to /settings` | Navigation Sweep | smoke | Clicks Settings footer button; asserts `/settings` URL and page loaded |
| `full sequential sweep — all items, no error boundaries, no console errors` | Navigation Sweep | interaction | Iterates all `TOP_LEVEL_NAV_ITEMS` + Settings; checks URL, `assertPageLoaded`, and no console errors |
| `every page has content` | Navigation Sweep | smoke | Iterates all nav items + Settings; checks body text is non-empty |

**test() count: 7**

---

### `tests/e2e/03-sidebar-mechanics.spec.ts`

**Purpose comment:** "Verifies sidebar visibility, collapse/expand, active state tracking, Settings footer placement, persistence, and project-scoped item states."

**describe blocks:** `Sidebar Mechanics` (9 tests)

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `sidebar visible after login` | Sidebar Mechanics | smoke | Asserts `aside` visible and "ADC" brand text visible; takes screenshot |
| `collapse toggle hides ADC text and narrows sidebar` | Sidebar Mechanics | visual | Clicks collapse button; asserts ADC text hidden and sidebar bounding box width narrows; takes screenshot |
| `expand toggle restores ADC text` | Sidebar Mechanics | interaction | Collapses then expands sidebar; asserts ADC text reappears |
| `active item highlighted on Dashboard` | Sidebar Mechanics | visual | Navigates to Dashboard; asserts Dashboard button has `bg-accent` and `font-medium` CSS classes |
| `active state changes on navigation` | Sidebar Mechanics | interaction | Navigates Dashboard→Notes; asserts Dashboard loses `bg-accent`, Notes gains `bg-accent font-medium` |
| `Settings button is in footer outside nav and still clickable` | Sidebar Mechanics | smoke | Asserts Settings NOT in `aside nav`; asserts it IS in sidebar and navigates to `/settings` |
| `sidebar persists across navigation` | Sidebar Mechanics | interaction | Navigates through Dashboard, Briefing, Notes, Fitness, Alerts, Settings; asserts `aside` visible at each step |
| `project-scoped items disabled without active project` | Sidebar Mechanics | smoke | On Dashboard (no active project); iterates `PROJECT_NAV_ITEMS` and asserts each button is disabled |
| `no console errors throughout sidebar interactions` | Sidebar Mechanics | console | Navigates Dashboard→Notes→Fitness, collapse/expand twice, Settings; asserts no console errors |

**test() count: 9**

---

### `tests/e2e/04-dashboard.spec.ts`

**Purpose comment:** "Verifies all dashboard widgets render correctly: GreetingHeader, QuickCapture (add/delete), RecentProjects, DailyStats, ActiveAgents, and console cleanliness."

**describe blocks:** `Dashboard` (10 tests)

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `loads after login` | Dashboard | smoke | Asserts `/dashboard` URL and non-empty body text; takes screenshot |
| `greeting header shows time-aware greeting` | Dashboard | smoke | Asserts `h1` text matches `/Good (morning\|afternoon\|evening)/` |
| `QuickCapture input and add button visible` | Dashboard | smoke | Asserts quick-capture placeholder input and Plus icon button are visible |
| `QuickCapture: add a capture` | Dashboard | interaction | Types text, clicks add button, asserts input clears and capture text appears in `li p` |
| `QuickCapture: delete a capture` | Dashboard | interaction | Adds a capture, then clicks `button[aria-label="Remove capture"]`; asserts list item disappears |
| `Recent Projects section visible` | Dashboard | smoke | Asserts `h2` "Recent Projects" visible; asserts either project folder buttons or "No projects yet" text |
| `Daily stats visible` | Dashboard | smoke | Asserts "tasks completed" text visible (from DailyStats widget) |
| `Active agents section visible` | Dashboard | smoke | Asserts `h2` "Active Agents" visible; asserts either "No agents running" or "Task:" entries |
| `no error boundaries` | Dashboard | smoke | Asserts "Something went wrong" text is NOT visible |
| `no console errors` | Dashboard | console | Navigates to dashboard, waits 2s; asserts no unexpected console errors |

**test() count: 10**

---

### `tests/e2e/05-briefing.spec.ts`

**Purpose comment:** "Verifies the daily briefing page loads, shows the generate button, handles the generate action, displays stats or empty state, and produces no unexpected console errors."

**describe blocks:** `Briefing Page` (5 tests) — `beforeEach` navigates to `/briefing`.

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `briefing page loads with header and content` | Briefing Page | smoke | Asserts `/briefing` URL, "Daily Briefing" text, non-blank body |
| `generate button is visible` | Briefing Page | smoke | Asserts button matching `/Generate/i` is visible |
| `generate button is clickable and responds` | Briefing Page | interaction | Clicks generate button; asserts it remains visible (button may change label) |
| `shows stats cards or empty state` | Briefing Page | smoke | Checks `hasEmptyState`; if empty, verifies structure + generate text; if data, checks Tasks/Agent Activity/rounded card |
| `no unexpected console errors` | Briefing Page | console | Asserts no errors collected since `beforeEach` |

**test() count: 5**

---

### `tests/e2e/06-my-work.spec.ts`

**Purpose comment:** "Verifies the cross-project task view loads, status filter is present and interactive, task list or empty state renders, and no unexpected console errors occur."

**describe blocks:** `My Work Page` (5 tests) — `beforeEach` navigates to `/my-work`.

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `my work page loads with header` | My Work Page | smoke | Asserts `/my-work` URL, "My Work" heading, "All tasks across your projects" subtitle |
| `status filter dropdown is present` | My Work Page | smoke | Asserts `select` element visible with default value `'all'` |
| `filter interaction changes selection` | My Work Page | interaction | Selects `'running'`, asserts value changed; changes back to `'all'`; asserts task count label visible |
| `shows task list or empty state` | My Work Page | smoke | Handles three states: EmptyState, Hub disconnected (Retry button), or `.rounded-lg` project group cards |
| `no unexpected console errors` | My Work Page | console | Asserts no errors collected since `beforeEach` |

**test() count: 5**

---

### `tests/e2e/07-notes.spec.ts`

**Purpose comment:** "Verifies the notes split panel layout, new note creation, note selection, note editing, and no unexpected console errors."

**describe blocks:** `Notes Page` (6 tests) — `beforeEach` navigates to `/notes`.

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `notes page loads` | Notes Page | smoke | Asserts `/notes` URL and non-blank body |
| `split panel layout with list and editor area` | Notes Page | smoke | Asserts "Search notes..." input visible; asserts either "Select a note…" empty editor text or note title input |
| `new note button is present and clickable` | Notes Page | interaction | Clicks "New Note" button; asserts "Note title..." placeholder input appears |
| `note selection populates editor` | Notes Page | interaction | Creates note; asserts title, tags, content inputs and pin/save toolbar buttons visible |
| `note editor accepts text input` | Notes Page | interaction | Creates note; fills title with "E2E Test Note" and content with test string; asserts values; asserts save button enabled |
| `no unexpected console errors` | Notes Page | console | Asserts no errors collected since `beforeEach` |

**test() count: 6**

---

### `tests/e2e/08-personal-tools.spec.ts`

**Purpose comment:** "E2E tests for Personal Tools pages: Fitness, Planner, Productivity."

**describe blocks:** `Fitness Page` (5 tests), `Planner Page` (8 tests), `Productivity Page` (4 tests)

#### Fitness Page

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `page loads via sidebar click` | Fitness Page | smoke | Clicks Fitness in sidebar; asserts `/fitness` URL, page loaded, "Fitness" heading |
| `tabs are visible — Overview, Workouts, Body, Goals` | Fitness Page | smoke | Asserts four tab buttons are visible |
| `tab switching changes content` | Fitness Page | interaction | Clicks Workouts/Body/Goals/Overview tabs; asserts "Recent Workouts" heading appears/disappears correctly |
| `Log Workout button is visible and clickable` | Fitness Page | interaction | Clicks "Log Workout" button; asserts "Recent Workouts" content hides (tab switched) |
| `no console errors` | Fitness Page | console | Navigates to Fitness, clicks all four tabs; asserts no console errors |

#### Planner Page

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `page loads via sidebar click` | Planner Page | smoke | Asserts `/planner` URL, page loaded, "Daily Planner" heading |
| `date navigation — previous/next buttons visible and clickable` | Planner Page | interaction | Clicks Next day, asserts date text changes; clicks Previous, asserts date reverts |
| `Day/Week toggle buttons visible and switching works` | Planner Page | interaction | Asserts Day/Week buttons visible; clicks Week then Day |
| `Today button appears after navigating away and returns to today` | Planner Page | interaction | Navigates to previous day; asserts "Today" button appears; clicks it; asserts it disappears |
| `Weekly Review link navigates to /planner/weekly` | Planner Page | smoke | Clicks "Weekly Review" link; asserts `/planner/weekly` URL |
| `Weekly Review page loads with content` | Planner Page | smoke | Navigates to Weekly Review; asserts page loaded and "Weekly Review" heading |
| `back to Daily Planner from Weekly Review` | Planner Page | interaction | Navigates to Weekly Review, clicks "Daily Planner" link; asserts URL returns to `/planner$` |
| `no console errors` | Planner Page | console | Navigates Planner→next day→Weekly Review; asserts no console errors |

#### Productivity Page

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `page loads via sidebar click` | Productivity Page | smoke | Asserts `/productivity` URL, page loaded, "Productivity" heading |
| `tabs are visible — Overview, Calendar, Spotify` | Productivity Page | smoke | Asserts three tab buttons visible |
| `tab switching changes content` | Productivity Page | interaction | Clicks Calendar/Spotify/Overview tabs; asserts `networkidle` after each |
| `no console errors` | Productivity Page | console | Clicks all three tabs; asserts no console errors |

**test() count: 17**

---

### `tests/e2e/09-alerts-comms.spec.ts`

**Purpose comment:** "Verifies the Alerts page (tabs, create modal, alert actions) and Communications page (tabs, integration panels, notification rules)."

**describe blocks:** `Alerts Page` (8 tests), `Communications Page` (8 tests)

#### Alerts Page

`beforeEach` navigates to Alerts sidebar item.

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `page loads at /alerts with heading visible` | Alerts Page | smoke | Asserts `/alerts` URL and "Alerts" heading |
| `Active, Dismissed, and Recurring tabs are visible` | Alerts Page | smoke | Asserts three tab buttons present |
| `tab switching renders content or empty state` | Alerts Page | interaction | Clicks Active/Dismissed/Recurring tabs; asserts either "No alerts" or `.space-y-2` list visible |
| `New Alert button opens create modal` | Alerts Page | interaction | Clicks "New Alert"; asserts "Create Alert" heading, message input, and type buttons (Reminder, Deadline, Notification, Recurring) |
| `close create modal via close button` | Alerts Page | interaction | Opens modal, clicks Cancel; asserts heading disappears |
| `close create modal via backdrop click` | Alerts Page | interaction | Opens modal, clicks "Close modal" backdrop button; asserts heading disappears |
| `alert actions visible when alerts exist` | Alerts Page | smoke | Conditional: if dismiss/delete buttons exist asserts visibility; otherwise asserts "No alerts" empty state |
| `no unexpected console errors on alerts page` | Alerts Page | console | Asserts no errors collected since `beforeEach` |

#### Communications Page

`beforeEach` navigates to Comms sidebar item.

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `page loads at /communications with heading visible` | Communications Page | smoke | Asserts `/communications` URL and "Communications" heading |
| `Overview, Slack, Discord, and Rules tabs are visible` | Communications Page | smoke | Asserts four tab buttons present |
| `Overview tab shows Slack and Discord panels` | Communications Page | smoke | Default tab; asserts both "Slack" and "Discord" headings visible |
| `Slack tab shows Slack panel content` | Communications Page | smoke | Clicks Slack tab; asserts "Slack" heading and "Send Message" button |
| `Discord tab shows Discord panel content` | Communications Page | smoke | Clicks Discord tab; asserts "Discord" heading and "Call User" button |
| `Rules tab shows notification rules panel` | Communications Page | smoke | Clicks Rules tab; asserts "Notification Rules" heading, keyword input, and either rules list or "No rules configured" |
| `each tab renders non-blank content` | Communications Page | interaction | Iterates all four tabs; asserts body text non-empty after each |
| `no unexpected console errors on communications page` | Communications Page | console | Asserts no errors collected since `beforeEach` |

**test() count: 16**

---

### `tests/e2e/10-project-management.spec.ts`

**Purpose comment:** "Verifies the project list page, Init Wizard modal, Create Project wizard, empty/populated states, project row navigation, TopBar tabs, and clean console output."

**describe blocks:** `Project Management` (12 tests)

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `navigate to projects via TopBar "+" button` | Project Management | smoke | Clicks TopBar "Open project" button; asserts `/projects` URL |
| `projects page displays "Projects" heading` | Project Management | smoke | Navigates to projects; asserts "Projects" heading visible |
| `Init Wizard button is visible and clickable` | Project Management | smoke | Asserts "Init Wizard" button visible and enabled |
| `Init Wizard opens modal with step indicators` | Project Management | interaction | Clicks Init Wizard; asserts dialog with aria-label "Initialize project", "Initialize Project" heading, and step labels (Select Folder, Detection, Configure, Confirm) |
| `Init Wizard closes via close button` | Project Management | interaction | Opens wizard, clicks Close (aria-label="Close"); asserts dialog not visible |
| `New Project button is visible and clickable` | Project Management | smoke | Asserts "New Project" button visible and enabled |
| `New Project opens wizard modal with step indicators` | Project Management | interaction | Clicks New Project; asserts dialog with aria-label "Create new project", step labels (Details, Tech Stack, GitHub, Review) |
| `New Project wizard closes via close button` | Project Management | interaction | Opens wizard, clicks Close; asserts dialog not visible |
| `shows empty state or project list with rows` | Project Management | smoke | After 2s wait: asserts either "No projects yet" + message, or project folder buttons present |
| `clicking a project row navigates to project tasks page` | Project Management | interaction | Clicks first project row (skips if none); asserts `/projects/<id>/tasks` URL |
| `TopBar shows project tab after opening a project` | Project Management | interaction | Opens first project (skips if none); asserts TopBar button with project name and folder icon |
| `no unexpected console errors during project management` | Project Management | console | Asserts no errors collected across all tests |

**test() count: 12**

---

### `tests/e2e/11-project-scoped-pages.spec.ts`

**Purpose comment:** "Verifies every page that requires an active project: Tasks, Terminals, Agents, Pipeline, Roadmap, Ideation, GitHub, Changelog, and Insights. Each test navigates via real sidebar clicks and asserts page-specific elements or correct empty-state UI."

**describe blocks:** `Project-Scoped Pages` (11 tests) — `beforeEach` navigates to projects list, opens first project, skips if no project exists.

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `Tasks page — AG-Grid renders with toolbar and search input` | Project-Scoped Pages | smoke | Asserts `.ag-theme-quartz` grid, search input, fills/clears search text, asserts "New Task" button |
| `Tasks page — expand toggle shows detail row when rows exist` | Project-Scoped Pages | interaction | Clicks first row's first cell; asserts `.ag-full-width-row-detail` appears; or asserts "No tasks found" if empty |
| `Terminals page — renders terminal grid or empty state` | Project-Scoped Pages | smoke | Navigates to Terminals; asserts either "Create Terminal" button (empty) or `button[title="New terminal"]` |
| `Agents page — renders agent dashboard or empty state` | Project-Scoped Pages | smoke | Navigates to Agents; asserts "Agents" heading; asserts either "Execute a task to start an agent" or session cards |
| `Pipeline page — renders workflow pipeline with task selector` | Project-Scoped Pages | smoke | Navigates to Pipeline; asserts "Workflow Pipeline"; asserts either "Select a task..." prompt or pipeline step nodes |
| `Roadmap page — renders milestones or empty state with New Milestone button` | Project-Scoped Pages | smoke | Navigates to Roadmap; asserts "Roadmap" heading and "New Milestone" button; asserts empty or milestone stats |
| `Ideation page — renders ideas with filter pills and New Idea button` | Project-Scoped Pages | smoke | Navigates to Ideation; asserts heading, "New Idea" button, category filter pills (All, Features, Improvements, Bugs, Performance); asserts ideas or empty state |
| `GitHub page — renders with tabs and connection status` | Project-Scoped Pages | smoke | Navigates to GitHub; asserts "GitHub" heading, PR/Issues/Notifications tabs, "Open PRs" and "Open Issues" stats |
| `Changelog page — renders timeline or empty state with Generate button` | Project-Scoped Pages | smoke | Navigates to Changelog; asserts "Changelog" heading and "Generate from Git" button; asserts empty or timeline |
| `Insights page — renders stats cards and chart areas` | Project-Scoped Pages | smoke | Navigates to Insights; asserts heading, subtitle, stat cards (Tasks Complete, Agent Runs, Success Rate, Active Agents), distribution sections |
| `no unexpected console errors across project-scoped pages` | Project-Scoped Pages | console | Asserts no errors collected across all tests |

**test() count: 11**

---

### `tests/e2e/12-settings-full.spec.ts`

**Purpose comment:** "Verifies all Settings page sections render correctly, theme mode toggling works (light/dark), Customize Theme button navigates to theme editor, and interactive controls are visible."

**describe blocks:** `Settings Page` (17 tests)

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `Settings loads via sidebar footer click` | Settings Page | smoke | Navigates to Settings; asserts `/settings` URL |
| `Settings heading visible` | Settings Page | smoke | Asserts `h1` with text "Settings" |
| `Appearance section visible` | Settings Page | smoke | Asserts `h2` "Appearance" heading |
| `Light, Dark, System mode buttons visible` | Settings Page | smoke | Asserts three theme mode buttons present |
| `Click Light mode applies light class to html` | Settings Page | interaction | Clicks Light; asserts `html` class contains `'light'` and not `'dark'`; takes screenshot |
| `Click Dark mode applies dark class to html` | Settings Page | interaction | Clicks Light then Dark; asserts `html` class contains `'dark'`; takes screenshot |
| `Color Theme section visible` | Settings Page | smoke | Scrolls to `h2` "Color Theme"; asserts visible |
| `Customize Theme button navigates to theme editor` | Settings Page | interaction | Clicks "Customize Theme"; asserts `/settings/themes` URL; takes screenshot |
| `UI Scale section visible with range input` | Settings Page | smoke | Scrolls to `h2` "UI Scale"; asserts `input[type="range"][aria-label="UI scale percentage"]` visible |
| `Typography section visible with font controls` | Settings Page | smoke | Scrolls to Font Family/Font Size headings; asserts `button[role="combobox"]` font dropdown and font-size range input |
| `Language section visible with English` | Settings Page | smoke | Scrolls to "Language" heading; asserts "English" and "Only language available" text |
| `Hub Connection section visible with status` | Settings Page | smoke | Scrolls to "Hub Connection" heading; asserts visible content |
| `Profiles section visible` | Settings Page | smoke | Scrolls to "Profiles" heading; asserts visible |
| `Storage Management section visible` | Settings Page | smoke | Scrolls to "Storage Management" heading; asserts visible |
| `About section visible with ADC version text` | Settings Page | smoke | Scrolls to "About"; asserts `h2` and "ADC v0.1.0" text |
| `Reset to Dark mode as default` | Settings Page | interaction | Clicks Light then Dark; asserts `html` class contains `'dark'` |
| `No console errors during settings interaction` | Settings Page | console | Toggles Light→Dark, scrolls to About, waits 1s; asserts no console errors |

**test() count: 17**

---

### `tests/e2e/13-global-overlays.spec.ts`

**Purpose comment:** "Verifies AssistantWidget (FAB, panel open/close, chat input, Ctrl+J toggle)."

**describe blocks:** `Assistant Widget` (7 tests) — `beforeEach` asserts on `/dashboard` with sidebar visible.

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `FAB button visible in bottom-right` | Assistant Widget | smoke | Asserts button `aria-label="Open assistant"` is visible |
| `click FAB opens assistant panel` | Assistant Widget | interaction | Clicks FAB; asserts "Assistant" heading appears |
| `chat input visible when panel is open` | Assistant Widget | interaction | Opens panel; asserts `aria-label="Message assistant"` textarea visible |
| `type in chat input` | Assistant Widget | interaction | Opens panel; fills textarea with "hello from e2e test"; asserts value |
| `close panel via close button` | Assistant Widget | interaction | Opens panel, clicks "Close assistant" button; asserts heading disappears and FAB reverts |
| `Ctrl+J toggles assistant panel` | Assistant Widget | keyboard | Presses `Control+j`; asserts panel opens; presses again; asserts panel closes |
| `no unexpected console errors during Assistant Widget interactions` | Assistant Widget | console | Asserts no errors collected since `beforeEach` |

**test() count: 7**

---

### `tests/e2e/14-theme-visual.spec.ts`

**Purpose comment:** "Verifies that theme mode switching (dark/light) actually changes computed styles on DOM elements. Goes beyond data-attribute checks to confirm visual rendering by inspecting computed backgroundColor values."

**describe blocks:** `Theme Visual Verification` (5 tests)

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `Default dark mode — html has class "dark" and no data-theme` | Theme Visual Verification | visual | Asserts `html` class contains `'dark'` and `data-theme` attribute is null; takes screenshot |
| `Light mode changes body background` | Theme Visual Verification | visual | Captures dark body `backgroundColor` via `getComputedStyle`; switches to Light; asserts `html` class `'light'` and body background changed; takes screenshot |
| `Dark mode restores after Light mode` | Theme Visual Verification | visual | Captures initial dark background; switches Light then Dark; asserts background matches original |
| `Customize Theme button navigates to theme editor` | Theme Visual Verification | smoke | Clicks "Customize Theme" in Settings; asserts `/settings/themes` URL; takes screenshot |
| `No console errors during theme mode switching` | Theme Visual Verification | console | Cycles Light→Dark→System→Dark with 200ms waits; asserts no console errors |

**test() count: 5**

---

### `tests/e2e/15-smoke-flow.spec.ts`

**Purpose comment:** "ONE sequential canary test that walks the entire app via real clicks. If this test passes, the core app is functional end-to-end."

**Steps (documented in file):** Dashboard → all top-level sidebar items → Projects list → open first project → all project-scoped sidebar items → Settings (theme toggle) → Ctrl+J keyboard shortcut → Dashboard → clean console assertion.

**describe blocks:** `Full Smoke Flow` (1 test)

| Test Name | Describe Block | Type | What It Exercises |
|-----------|---------------|------|-------------------|
| `complete app walkthrough via real clicks` | Full Smoke Flow | smoke | 3-minute timeout; walks entire app: dashboard load + sidebar visible; all `TOP_LEVEL_NAV_ITEMS` via click; projects list via TopBar; optionally all `PROJECT_NAV_ITEMS` if a project exists; Settings with Light/Dark toggle; Ctrl+J assistant open/close; return to Dashboard; clean console |

**test() count: 1**

---

## Cross-File Tags Summary

| Tag | Count | Spec Files |
|-----|-------|-----------|
| smoke | 76 | All 15 spec files |
| interaction | 42 | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13 |
| console | 15 | All 15 spec files (one per file minimum) |
| visual | 5 | 03, 12, 14 |
| keyboard | 1 | 13 |

---

## Notes and Observations

1. **Briefing and Planner navigate old sidebar labels.** `05-briefing.spec.ts` calls `navigateToSidebarItem(page, 'Briefing')` and `09-alerts-comms.spec.ts` calls `navigateToSidebarItem(page, 'Comms')`. These labels are NOT in `TOP_LEVEL_NAV_ITEMS` (which lists Dashboard, My Work, Fitness, Productivity). Similarly, `03-sidebar-mechanics.spec.ts` navigates to Briefing, Notes, Alerts in `sidebar persists` and `active state changes` tests, and `08-personal-tools.spec.ts` navigates to 'Planner' in its `Planner Page` describe block — but Notes, Alerts, Briefing, Comms, Planner are NOT in the current `TOP_LEVEL_NAV_ITEMS` constant. Affected specs: 03, 05, 08, 09. These tests may fail if those sidebar items were removed during the ui-layout-refactor.

2. **Tasks page references AG-Grid.** `11-project-scoped-pages.spec.ts` asserts `.ag-theme-quartz` class. Project docs note AG-Grid was replaced with TanStack Table (PR #79). This test assertion is likely broken.

3. **`test.skip()` used conditionally.** Tests in `10-project-management.spec.ts` and `11-project-scoped-pages.spec.ts` call `test.skip(true, reason)` when no projects exist — these are graceful skips, not failures.

4. **`afterEach` / `afterAll` absent.** No cleanup hooks exist; the `electronApp` fixture handles teardown via `app.close()`.

5. **Screenshots.** Specs 03, 04, 12, 14, 15 call `takeScreenshot`; screenshots saved to `tests/e2e/screenshots/`. `takeFullPageScreenshot` is exported but not used by any spec.
