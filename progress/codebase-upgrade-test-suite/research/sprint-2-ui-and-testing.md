# Sprint 2 — Compositional UI Library + Test Suite Hardening

> Research compiled April 9-10, 2026. Sources: E2E-TEST-SUITE.md (136 tests, 15 specs), e2e-testing skill, Playwright Electron research, route audit agent, electron-app-planning skill.

## Objective

Build the compositional UI library that standardizes all ADC pages, then harden the E2E test suite to survive the Sprint 1 refactor and fill coverage gaps.

## Part A: Compositional UI Library

### The Problem

ADC pages are ~80% identical in structure (PageHeader → content grid/list → detail panel → real-time events), but each feature builds its own layout from scratch. This leads to inconsistent UX, duplicated code, and fragile tests that break on every refactor.

### The Solution: Shared Page-Building Toolkit

Every feature slice composes from these shared primitives. A new feature is ~50 lines of wiring, not 500 lines of UI.

```
shared/ui/composition/
  PageHeader.tsx       ← .Row, .Title, .Actions, .Tabs (compound component)
  FilterBar.tsx        ← Configurable filter chips + search, URL-synced
  DetailPanel.tsx      ← Slide-over detail view with sections
  ActionBar.tsx        ← Grouped action buttons with permissions
  StatusFlow.tsx       ← Status badge with allowed transitions
  LiveIndicator.tsx    ← Real-time event dot / streaming indicator

shared/ui/data-display/
  DataGrid.tsx         ← TanStack Table + TanStack Virtual (REQUIRED for >100 rows)
  DataList.tsx         ← Simple list variant
  DataCard.tsx         ← Card grid variant
  StatCard.tsx         ← Metric display card
```

### Critical: TanStack Virtual Required

Any table that could exceed ~100 rows MUST use `@tanstack/react-virtual`. Tables affected: commands, sessions, notifications, tasks, session_logs.

### data-testid Convention

All compositional primitives emit stable test IDs that survive refactors:

```tsx
<PageShell data-testid="page-shell">
<PageHeader data-testid="page-header">
<DataGrid data-testid="data-grid">
<FilterBar data-testid="filter-bar">
<DetailPanel data-testid="detail-panel">
<ActionBar data-testid="action-bar">
```

Feature-specific components use `data-testid="{domain}-{component}"` pattern:
```tsx
<NoteDetail data-testid="notes-detail">
<TaskRow data-testid="tasks-row">
```

### Feature Slice Template

```
features/{domain}/
  index.ts                      ← Public barrel export
  api/
    queryKeys.ts                ← Factory: domainKeys.all, .lists(), .detail(id)
    use{Domain}.ts              ← useQuery hooks
    use{Domain}Mutations.ts     ← useMutation hooks
  components/
    {Domain}Page.tsx            ← Route entry — composes shared primitives
    {Domain}Detail.tsx          ← DetailPanel content (optional)
  hooks/
    use{Domain}Events.ts        ← IPC event subscriptions (optional)
  store.ts                      ← Zustand UI-only state
```

### Rules

- No `<button>` / `<input>` / `<table>` — use @ui primitives
- No `ipc()` calls in components — go through api/ hooks
- No domain data in stores — UI state only (selection, panel open, search)
- No imports from sibling features — compose via shared/ only
- No `useIpcEvent` for data freshness — EventBridge handles it
- No `refetchInterval` — events drive freshness

## Part B: Test Suite Hardening

### Current State (from E2E-TEST-SUITE.md)

- 136 tests across 15 spec files
- 2 THOROUGH, 10 SHALLOW, 11 SMOKE, 13 NONE coverage
- 10 HIGH-priority gaps (zero mutation testing on core features)

### Known Broken Tests (fix FIRST)

1. **`.ag-theme-quartz` selector** in spec 11 — AG-Grid removed, TanStack Table in place. Selector silently fails. Source code has stale AG-Grid comments but uses TanStack Table.
2. **Stale sidebar labels** — specs 03, 05, 08, 09 reference `Briefing`, `Notes`, `Alerts`, `Comms`, `Planner` which moved to Productivity tabs. Tests likely broken.
3. **No `afterEach` cleanup hooks** — zero across 15 specs. State leakage between tests.

### Pre-Refactor Fixes (do before Sprint 1 architecture changes)

| # | Fix | Effort |
|---|---|---|
| 1 | Fix AG-Grid → TanStack Table selector in spec 11 | Small |
| 2 | Update stale sidebar navigation labels in specs 03, 05, 08, 09 | Small |
| 3 | Add `afterEach` cleanup hooks to all 15 specs | Small |
| 4 | Add `--remote-debugging-port=0` to test launch (avoid dev port conflict) | Tiny |
| 5 | Install `electron-playwright-helpers` (ipcMainEmit, stubDialog) | Tiny |

### Page Object Model Conversion

Current tests use raw locators. When routes change in Sprint 1, every test breaks. POM absorbs the change.

```typescript
// tests/e2e/pages/PersonalPage.ts
export class PersonalPage {
  readonly page: Page;
  readonly tabs: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.tabs = page.locator('[data-testid="page-header"] [role="tab"]');
  }
  
  async goto() {
    await this.page.goto('#/personal');
    await this.page.waitForLoadState('networkidle');
  }
  
  async selectTab(name: string) {
    await this.tabs.filter({ hasText: name }).click();
  }
}
```

### Visual Regression

Switch from `takeScreenshot()` (debug-only) to `toHaveScreenshot()` (automated diffing):

```typescript
// Before: debug screenshot (no comparison)
await takeScreenshot(page, 'dashboard');

// After: visual regression with baseline comparison
await expect(page).toHaveScreenshot('dashboard.png');
```

Capture baselines BEFORE refactoring each page.

### Test Infrastructure Upgrades

| Upgrade | What | Why |
|---|---|---|
| `electron-playwright-helpers` | `ipcMainEmit()`, `stubDialog()`, retry-safe evaluate | Test IPC channels, mock file dialogs |
| `--remote-debugging-port=0` | Random port in test launch | Avoid conflict with dev port 9222 |
| `toHaveScreenshot()` | Built-in Playwright visual regression | Catch CSS regressions during refactor |
| SQLite test isolation | `:memory:` DB in test mode or dedicated temp file | Prevent test pollution |
| Agent session mocking | Inject `fakeSpawner` via factory in test mode | Test agent lifecycle without real Claude CLI |
| Mock Hub server | `globalSetup` starts local mock Hub on random port | Test relay/websocket features |

### HIGH-Priority Gap Fill Specs (post-refactor)

From E2E-TEST-SUITE.md gap registry — specs to write after architecture stabilizes:

| Spec | Feature | Target Coverage |
|---|---|---|
| `16-tasks-crud.spec.ts` | tasks | THOROUGH — create, status change, expand, PlanFeedback, CreatePr |
| `17-agents-lifecycle.spec.ts` | agents | THOROUGH — spawn, log retrieval, stop, status transitions |
| `18-github-integration.spec.ts` | github | SHALLOW — PR list, issue create, connection status |
| `20-onboarding-wizard.spec.ts` | onboarding | THOROUGH — full first-run wizard flow |
| `24-terminals-session.spec.ts` | terminals | SHALLOW — create, input, close |
| `25-workflow-pipeline.spec.ts` | workflow | SHALLOW — task select, step config, execution trigger |

### Playwright Built-In Agents (v1.58+)

Playwright now ships with AI agents for test generation/healing:
- `playwright-test-planner` — creates test plans from app analysis
- `playwright-test-generator` — generates specs from plans, using real browser interaction
- `playwright-test-healer` — auto-fixes broken selectors

These can be integrated with our ADC agent orchestration for self-healing test suites.

## Sources

- docs/testing/E2E-TEST-SUITE.md (current suite analysis)
- e2e-testing skill (POM patterns, flaky test strategies)
- Playwright ElectronApplication API docs
- electron-playwright-helpers npm package
- Playwright Visual Regression docs
- TanStack Router testing setup guide
