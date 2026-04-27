# Test Suite Compositional Audit & Standards Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring every file in `src/renderer/features/test-suite/` and `src/main/features/test-suite/` into full compliance with codebase standards — @ui primitives everywhere, magic numbers extracted to constants, oversized components decomposed into compositional sub-components, and recorder-handlers.ts fully split into domain handler files.

**Architecture:** Bottom-up approach: first fix constants and shared utilities, then replace raw HTML across all files, then decompose the 6 largest components into compositional structures where each sub-component owns its own data. Finally split the remaining recorder-handlers.ts monolith into focused handler files.

**Tech Stack:** React 19, TypeScript, `@ui` design system (Flex, Stack, Text, Label, Badge, Button, Input, Select, SearchInput, MetricCard, SectionHeader, Separator, ScrollArea, Grid, Progress), Zustand, TanStack Query, Drizzle ORM

**Codebase Rules (every subagent MUST follow):**
1. **NEVER use raw HTML** — no `<div>` for layout (use `Flex`/`Stack`/`Grid`), no `<p>`/`<span>` (use `Text`), no `<button>` (use `Button`), no `<input>` (use `Input`), no `<label>` (use `Label`), no `<select>` (use `Select`), no `<textarea>` (use `Textarea`). Exception: `<div>` is acceptable for CSS-only containers (absolute positioning, animation targets) that have no semantic layout role.
2. **Import from `@ui` barrel** — `import { Text, Flex, Stack } from '@ui'`
3. **Flex/Stack CVA defaults** — `Flex` defaults to `gap="md"` (gap-4), `align="center"`, `wrap="wrap"`. Override explicitly: `<Flex gap="none" align="stretch" wrap="nowrap">`. `Stack` defaults to `gap="md"` (gap-4). Override: `<Stack gap="sm">`.
4. **No magic numbers** — extract timeouts, sizes, thresholds to `lib/constants.ts`
5. **Compositional structure** — each component owns its own data. Parent is a thin composition shell that renders children. Logic in custom hooks, not in the component body.
6. **Lint only changed files** — `npx eslint <file1> <file2> ...`
7. **Typecheck after every task** — `npx tsc --noEmit`
8. **Commit after every task**
9. **Props alphabetical** — ESLint `react/jsx-sort-props` requires callbacks after all other props

---

## File Structure

### Constants (modify)
- `src/renderer/features/test-suite/lib/constants.ts` — add magic numbers from all components

### Components to fix (raw HTML → @ui, no decomposition needed)
- `src/renderer/features/test-suite/components/ResultsToolbar.tsx` — 1 raw `<div>` → `Flex`
- `src/renderer/features/test-suite/components/TestSuitePage.tsx` — 2 raw `<div>` → `Text`
- `src/renderer/features/test-suite/components/RunStatusBadge.tsx` — 1 raw `<div>` → `StatusIndicator` or styled `<div>` (CSS-only dot, acceptable exception)
- `src/renderer/features/test-suite/components/RunSparkline.tsx` — 2 raw `<div>` containers
- `src/renderer/features/test-suite/components/ShortcutHelpDialog.tsx` — 2 raw `<div>`
- `src/renderer/features/test-suite/components/ScheduleDialog.tsx` — 2 raw `<div>`
- `src/renderer/features/test-suite/components/TrendChart.tsx` — 1 raw `<div>`
- `src/renderer/features/test-suite/components/RunLogDialog.tsx` — 4 raw `<div>`
- `src/renderer/features/test-suite/components/DataRunDialog.tsx` — 5 raw `<div>`
- `src/renderer/features/test-suite/components/DiffViewer.tsx` — 15 raw `<div>`
- `src/renderer/features/test-suite/components/ResultsWorkflowActions.tsx` — 1 raw `<div>`
- `src/renderer/features/test-suite/components/StepList.tsx` — 5 raw `<div>`
- `src/renderer/features/test-suite/components/StepTimeline.tsx` — 4 raw `<div>` (CSS-only: progress bar div is acceptable)

### Components to decompose AND fix raw HTML
- `src/renderer/features/test-suite/components/LibraryPanel.tsx` (451 lines) → extract LibraryToolbar, LibraryTagFilter, LibraryScriptRow, LibraryBulkActions
- `src/renderer/features/test-suite/components/ConfigEditDialog.tsx` (390 lines) → extract ConfigBrowsersField, ConfigEnvironmentsList, ConfigAuthSection
- `src/renderer/features/test-suite/components/ScreenshotsPanel.tsx` (312 lines) → extract ScreenshotThumbnailStrip, ScreenshotPreview, ScreenshotCompareToolbar
- `src/renderer/features/test-suite/components/AnalyticsPanel.tsx` (284 lines) → extract HealthScoreCard, AnalyticsSummaryMetrics, AnalyticsDetailCards; move scoring functions to lib/
- `src/renderer/features/test-suite/components/SaveRecordingDialog.tsx` (292 lines) → extract AssertionSuggestionsList; fix raw `<label>`
- `src/renderer/features/test-suite/components/RecordingPanel.tsx` (236 lines) → fix raw `<div>` layout containers
- `src/renderer/features/test-suite/components/BrowserViewPanel.tsx` (185 lines) → fix raw `<div>` layout containers
- `src/renderer/features/test-suite/components/SetupCard.tsx` (216 lines) → fix raw `<div>` form groups
- `src/renderer/features/test-suite/components/SharedStepsPanel.tsx` (213 lines) → fix raw `<div>` layout
- `src/renderer/features/test-suite/components/ExportPanel.tsx` (197 lines) → fix raw `<div>` layout

### Hooks to extract (during decomposition)
- `src/renderer/features/test-suite/hooks/useLibraryFilters.ts` — search, status filter, tag filter logic from LibraryPanel
- `src/renderer/features/test-suite/hooks/useHealthScore.ts` — scoring computation from AnalyticsPanel

### Main process handler split
- `src/main/features/test-suite/handlers/script-handlers.ts` — LIST/GET/SAVE/DELETE SCRIPTS
- `src/main/features/test-suite/handlers/run-handlers.ts` — RUN.SCRIPT, GET.RUN, LIST.RUNS
- `src/main/features/test-suite/handlers/browser-view-handlers.ts` — BROWSER-VIEW.*
- `src/main/features/test-suite/handlers/config-handlers.ts` — CONFIG.*
- `src/main/features/test-suite/handlers/screenshot-handlers.ts` — SCREENSHOT.*
- `src/main/features/test-suite/handlers/data-run-handlers.ts` — DATA-RUN.*
- `src/main/features/test-suite/handlers/export-handlers.ts` — EXPORT.*
- `src/main/features/test-suite/handlers/auth-handlers.ts` — AUTH.*

---

### Task 1: Extract magic numbers to constants

**Files:**
- Modify: `src/renderer/features/test-suite/lib/constants.ts`

- [ ] **Step 1: Add all magic numbers as named constants**

Add to `src/renderer/features/test-suite/lib/constants.ts`:

```ts
// ── Default timeouts (ms) ──
export const DEFAULT_NAVIGATION_TIMEOUT = 30_000;
export const DEFAULT_ACTION_TIMEOUT = 10_000;

// ── Default viewport ──
export const DEFAULT_VIEWPORT_WIDTH = 1280;
export const DEFAULT_VIEWPORT_HEIGHT = 720;
export const MIN_VIEWPORT_WIDTH = 320;
export const MIN_VIEWPORT_HEIGHT = 240;

// ── Playwright config ──
export const MAX_WORKERS = 16;
export const MAX_RETRIES = 5;

// ── Analytics thresholds ──
export const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A', color: 'text-green-500' },
  { min: 80, grade: 'B', color: 'text-blue-500' },
  { min: 70, grade: 'C', color: 'text-yellow-500' },
  { min: 60, grade: 'D', color: 'text-orange-500' },
  { min: 0, grade: 'F', color: 'text-destructive' },
] as const;

export const HEALTH_WEIGHTS = {
  passRate: 40,
  stability: 30,
  speed: 30,
} as const;

export const SPEED_THRESHOLDS = {
  fast: 5,
  medium: 30,
  curve: 25,
} as const;

// ── UI constants ──
export const COPY_FEEDBACK_MS = 2_000;
export const ERROR_LINE_TRUNCATION = 20;
export const SPARKLINE_RUN_LIMIT = 10;
```

- [ ] **Step 2: Lint and typecheck**

```bash
npx eslint src/renderer/features/test-suite/lib/constants.ts
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/features/test-suite/lib/constants.ts
git commit -m "refactor(test-suite): extract magic numbers to lib/constants.ts"
```

---

### Task 2: Fix raw HTML in small components (batch 1 — toolbar/page/dialog files)

**Files:**
- Modify: `src/renderer/features/test-suite/components/ResultsToolbar.tsx`
- Modify: `src/renderer/features/test-suite/components/TestSuitePage.tsx`
- Modify: `src/renderer/features/test-suite/components/ShortcutHelpDialog.tsx`
- Modify: `src/renderer/features/test-suite/components/ScheduleDialog.tsx`
- Modify: `src/renderer/features/test-suite/components/TrendChart.tsx`
- Modify: `src/renderer/features/test-suite/components/ResultsWorkflowActions.tsx`

- [ ] **Step 1: Fix ResultsToolbar.tsx — replace root `<div>` with `Flex`**

In `src/renderer/features/test-suite/components/ResultsToolbar.tsx`, line 74:

Replace:
```tsx
<div className="flex items-center gap-2 border-b border-border px-4 py-2">
```
With:
```tsx
<Flex align="center" className="border-b border-border px-4 py-2" gap="sm" wrap="nowrap">
```

And the matching closing tag:
```tsx
</div>
```
→
```tsx
</Flex>
```

Add `Flex` to the `@ui` import.

- [ ] **Step 2: Fix TestSuitePage.tsx — replace raw `<div>` text with `<Text>`**

In `src/renderer/features/test-suite/components/TestSuitePage.tsx`:

Line 49: Replace:
```tsx
<div className="p-6 text-text-muted">No project selected.</div>
```
With:
```tsx
<Text className="p-6" variant="muted">No project selected.</Text>
```

Line 55: Replace:
```tsx
<PageLayout><div className="p-6">Loading…</div></PageLayout>
```
With:
```tsx
<PageLayout><Text className="p-6">Loading…</Text></PageLayout>
```

Add `Text` to the `@ui` import.

- [ ] **Step 3: Fix ShortcutHelpDialog.tsx — replace raw `<div>` wrappers**

In `src/renderer/features/test-suite/components/ShortcutHelpDialog.tsx`:

Line 33: Replace:
```tsx
<div className="space-y-2">
```
With:
```tsx
<Stack gap="sm">
```

Line 35: Replace:
```tsx
<div key={s.keys} className="flex items-center justify-between text-sm">
```
With:
```tsx
<Flex key={s.keys} align="center" justify="between">
```

Update matching closing tags. Add `Flex, Stack` to imports.

- [ ] **Step 4: Fix ScheduleDialog.tsx — replace raw `<div>` wrappers**

In `src/renderer/features/test-suite/components/ScheduleDialog.tsx`:

Line 54: Replace:
```tsx
<div className="space-y-3">
```
With:
```tsx
<Stack gap="md">
```

Line 55: Replace:
```tsx
<div>
```
With:
```tsx
<Stack gap="xs">
```

Update matching closing tags. Add `Stack` to imports.

- [ ] **Step 5: Fix TrendChart.tsx — replace raw `<div>`**

Line 16: Replace:
```tsx
<div className="flex h-48 items-center justify-center text-sm text-text-muted">
```
With:
```tsx
<Flex align="center" className="h-48" justify="center">
  <Text size="sm" variant="muted">
```

Update matching closing tag. Note: the `<line>` on line 48 is an SVG element, not HTML — leave it.

Add `Flex, Text` to imports.

- [ ] **Step 6: Fix ResultsWorkflowActions.tsx — replace raw `<div>`**

Line 86: Replace:
```tsx
<div className="ml-auto flex items-center gap-2">
```
With:
```tsx
<Flex align="center" className="ml-auto" gap="sm" wrap="nowrap">
```

Add `Flex` to imports.

- [ ] **Step 7: Lint and typecheck**

```bash
npx eslint src/renderer/features/test-suite/components/ResultsToolbar.tsx src/renderer/features/test-suite/components/TestSuitePage.tsx src/renderer/features/test-suite/components/ShortcutHelpDialog.tsx src/renderer/features/test-suite/components/ScheduleDialog.tsx src/renderer/features/test-suite/components/TrendChart.tsx src/renderer/features/test-suite/components/ResultsWorkflowActions.tsx
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/renderer/features/test-suite/components/ResultsToolbar.tsx src/renderer/features/test-suite/components/TestSuitePage.tsx src/renderer/features/test-suite/components/ShortcutHelpDialog.tsx src/renderer/features/test-suite/components/ScheduleDialog.tsx src/renderer/features/test-suite/components/TrendChart.tsx src/renderer/features/test-suite/components/ResultsWorkflowActions.tsx
git commit -m "refactor(test-suite): replace raw HTML with @ui primitives in toolbar/page/dialog files"
```

---

### Task 3: Fix raw HTML in small components (batch 2 — step/run/data/diff files)

**Files:**
- Modify: `src/renderer/features/test-suite/components/RunLogDialog.tsx`
- Modify: `src/renderer/features/test-suite/components/DataRunDialog.tsx`
- Modify: `src/renderer/features/test-suite/components/DiffViewer.tsx`
- Modify: `src/renderer/features/test-suite/components/StepList.tsx`
- Modify: `src/renderer/features/test-suite/components/RunSparkline.tsx`

- [ ] **Step 1: Fix RunLogDialog.tsx**

Read the file first. Replace all raw `<div>` elements:

Line 70: `<div className="flex items-center gap-4 border-b pb-2">` → `<Flex align="center" className="border-b pb-2" gap="lg" wrap="nowrap">`
Line 102: `<div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">` → `<Text className="rounded-md border border-destructive/30 bg-destructive/10 p-3" size="sm" variant="error">`
Line 111: `<div key={l.timestamp} className={getOutputLineClass(l.line)}>` → `<Text key={l.timestamp} as="div" className={getOutputLineClass(l.line)} size="sm">`

Add `Flex, Text` to `@ui` imports. Update matching closing tags.

- [ ] **Step 2: Fix DataRunDialog.tsx**

Read the file first. Replace:

Line 58: `<div className="space-y-3">` → `<Stack gap="md">`
Line 59: `<div>` → `<Stack gap="xs">`
Line 61: `<div className="flex gap-2">` → `<Flex gap="sm" wrap="nowrap">`
Line 75: `<div className="flex items-center gap-2">` → `<Flex align="center" gap="sm">`
Line 80: `<div className="max-h-48 overflow-auto rounded border border-border">` → `<ScrollArea className="max-h-48 rounded border border-border">`

Add `Flex, Stack, ScrollArea` to `@ui` imports. Update matching closing tags.

- [ ] **Step 3: Fix DiffViewer.tsx**

Read the file first. This has 15 raw `<div>` elements. Replace layout divs:

Line 49: `<div className="space-y-3">` → `<Stack gap="md">`
Line 51: `<div className="flex items-center gap-3">` → `<Flex align="center" gap="md">`
Line 69: `<div className="grid grid-cols-3 gap-2">` → `<Grid columns={3} gap="sm">`
Lines 70, 78, 86: `<div>` → `<Stack gap="xs">`
Line 95: `<div className="flex h-full items-center justify-center ...">` → `<Flex align="center" className="h-full ..." justify="center">`
Line 104: `<div className="space-y-2">` → `<Stack gap="sm">`
Line 105: `<div className="relative overflow-hidden rounded border border-border">` → Keep as `<div>` (CSS-only positioning container)
Lines 107, 113: Keep as `<div>` (absolute-positioned overlay layers)
Line 125: `<div className="flex justify-between">` → `<Flex justify="between">`
Line 133: `<div>` → `<Stack gap="xs">`
Line 141: `<div className="flex h-48 items-center justify-center ...">` → `<Flex align="center" className="h-48 ..." justify="center">`

Add `Flex, Stack, Grid` to `@ui` imports.

- [ ] **Step 4: Fix StepList.tsx**

Read the file first. Replace:

Line 59: `<div className="flex flex-col gap-1 overflow-y-auto p-3 text-sm">` → `<Stack className="overflow-y-auto p-3 text-sm" gap="xs">`
Lines 124, 129: These are the draggable step card `<div>` — keep as `<div>` since they are DnD targets with data attributes and event handlers.
Line 140: `<div className="flex items-center gap-1">` → `<Flex align="center" gap="xs">`
Line 157: `<div className="flex shrink-0 items-center gap-0.5">` → `<Flex align="center" className="shrink-0" gap="none">`

Add `Flex, Stack` to `@ui` imports.

- [ ] **Step 5: Fix RunSparkline.tsx**

Line 28: `<div className="flex items-center gap-0.5">` → `<Flex align="center" gap="none">`
Line 38: `<div ...>` — This is a sparkline bar (CSS-only visual element with dynamic height/color). Keep as `<div>`.

Add `Flex` to `@ui` imports.

- [ ] **Step 6: Lint and typecheck**

```bash
npx eslint src/renderer/features/test-suite/components/RunLogDialog.tsx src/renderer/features/test-suite/components/DataRunDialog.tsx src/renderer/features/test-suite/components/DiffViewer.tsx src/renderer/features/test-suite/components/StepList.tsx src/renderer/features/test-suite/components/RunSparkline.tsx
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/features/test-suite/components/RunLogDialog.tsx src/renderer/features/test-suite/components/DataRunDialog.tsx src/renderer/features/test-suite/components/DiffViewer.tsx src/renderer/features/test-suite/components/StepList.tsx src/renderer/features/test-suite/components/RunSparkline.tsx
git commit -m "refactor(test-suite): replace raw HTML with @ui primitives in step/run/data/diff files"
```

---

### Task 4: Fix raw HTML and form controls in layout-heavy components

**Files:**
- Modify: `src/renderer/features/test-suite/components/RecordingPanel.tsx`
- Modify: `src/renderer/features/test-suite/components/BrowserViewPanel.tsx`
- Modify: `src/renderer/features/test-suite/components/SetupCard.tsx`
- Modify: `src/renderer/features/test-suite/components/SharedStepsPanel.tsx`
- Modify: `src/renderer/features/test-suite/components/ExportPanel.tsx`

- [ ] **Step 1: Fix RecordingPanel.tsx**

Read the file first. Replace layout `<div>` elements:

Line 66: `<div className={`h-2 w-2 shrink-0 rounded-full ...`} />` → Keep as `<div>` (CSS-only indicator dot)
Line 142: `<div className="flex h-full flex-col overflow-hidden rounded-md border border-border">` → `<Stack className="h-full overflow-hidden rounded-md border border-border" gap="none">`
Line 144: `<div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">` → `<Flex align="center" className="shrink-0 border-b border-border px-3 py-1.5" gap="sm" wrap="nowrap">`
Line 172: `<div className="mx-1 h-4 w-px bg-border" />` → `<Separator className="mx-1 h-4" orientation="vertical" />`
Line 179: `<div title={recordTooltip || undefined}>` → Keep as `<div>` (tooltip wrapper, no layout role)
Line 194: `<div className="ml-auto flex items-center gap-2">` → `<Flex align="center" className="ml-auto" gap="sm" wrap="nowrap">`
Line 207: `<div className="flex flex-1 overflow-hidden">` → `<Flex className="flex-1 overflow-hidden" gap="none" wrap="nowrap">`
Line 209: `<div className="flex h-10 shrink-0 items-center border-b border-border px-3">` → `<Flex align="center" className="h-10 shrink-0 border-b border-border px-3" gap="none">`

Also replace hardcoded viewport defaults `1280`, `720` with imports from `lib/constants.ts`:
```ts
import { DEFAULT_VIEWPORT_WIDTH, DEFAULT_VIEWPORT_HEIGHT } from '../lib/constants';
```

Add `Flex, Stack, Separator` to `@ui` imports. Update matching closing tags.

- [ ] **Step 2: Fix BrowserViewPanel.tsx**

Read the file first. Replace:

Line 112: `<div className="flex h-full flex-1 flex-col overflow-hidden">` → `<Stack className="h-full flex-1 overflow-hidden" gap="none">`
Line 114: `<div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">` → `<Flex align="center" className="h-10 shrink-0 border-b border-border px-3" gap="sm" wrap="nowrap">`
Line 115: `<div className="flex items-center gap-1">` → `<Flex align="center" gap="xs">`
Line 151: `<div className="relative flex-1 overflow-hidden">` → Keep as `<div>` (positioning container for webview)
Line 163-164: Keep as `<div>` (absolute-positioned recording indicator, CSS-only animation)
Line 175: `<div className="flex items-center gap-1 text-xs text-warning">` → `<Flex align="center" gap="xs">` with inner `<Text size="sm" variant="muted">`

Add `Flex, Stack, Text` to `@ui` imports.

- [ ] **Step 3: Fix SetupCard.tsx**

Read the file first. Replace form layout `<div>` elements with `Stack`:

Line 132: `<div className="flex flex-col gap-2">` → `<Stack gap="sm">`
Lines 148, 159: Same pattern → `<Stack gap="sm">`
Line 147: `<div className="grid grid-cols-2 gap-4">` → `<Grid columns={2} gap="md">`
Line 172: `<div className="flex flex-col gap-2">` → `<Stack gap="sm">`
Line 191: `<div className="flex flex-col gap-2">` → `<Stack gap="sm">`
Line 206: `<div className="flex justify-end">` → `<Flex justify="end">`

Replace hardcoded timeouts `30000`, `10000` with constants:
```ts
import { DEFAULT_NAVIGATION_TIMEOUT, DEFAULT_ACTION_TIMEOUT, MIN_VIEWPORT_WIDTH, MIN_VIEWPORT_HEIGHT } from '../lib/constants';
```

Add `Flex, Stack, Grid` to `@ui` imports.

- [ ] **Step 4: Fix SharedStepsPanel.tsx**

Read the file first. Replace:

Line 66: `<div className="flex items-center gap-2 border-b border-border px-4 py-3">` → `<Flex align="center" className="border-b border-border px-4 py-3" gap="sm" wrap="nowrap">`
Line 89: `<div className="grid gap-3 p-4 md:grid-cols-2">` → `<Grid className="p-4" columns={2} gap="md">`
Line 94: `<div className="flex items-center gap-2">` → `<Flex align="center" gap="sm">`
Line 108: `<div className="flex gap-1">` → `<Flex gap="xs">`
Lines 174, 175, 183, 191: `<div className="space-y-3">` → `<Stack gap="md">` and `<div>` → `<Stack gap="xs">`

Add `Flex, Stack, Grid` to `@ui` imports.

- [ ] **Step 5: Fix ExportPanel.tsx**

Read the file first. Replace:

Line 82: `<div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">` → `<Grid className="p-6" columns={2} gap="lg">`
Line 92: `<div className="rounded-md border border-border bg-surface-base p-3 font-mono text-sm">` → `<Code className="rounded-md border border-border bg-surface-base p-3">`  (or keep as `<div>` since this is a code preview block — check if `Code` component supports block display)
Lines 93, 97, 101: `<div className="flex items-center gap-2 ...">` → `<Flex align="center" gap="sm">`
Line 111: `<div className="rounded-md border border-border-success bg-surface-success/10 p-3 text-sm text-text-success">` → `<Text className="rounded-md border border-border-success bg-surface-success/10 p-3" size="sm" variant="success">`
Line 116: `<div className="flex gap-2">` → `<Flex gap="sm">`
Lines 149, 153, 159, 163, 167, 173: `<div className="flex justify-between">` → `<Flex justify="between">`

Add `Flex, Grid, Text` to `@ui` imports.

- [ ] **Step 6: Lint and typecheck**

```bash
npx eslint src/renderer/features/test-suite/components/RecordingPanel.tsx src/renderer/features/test-suite/components/BrowserViewPanel.tsx src/renderer/features/test-suite/components/SetupCard.tsx src/renderer/features/test-suite/components/SharedStepsPanel.tsx src/renderer/features/test-suite/components/ExportPanel.tsx
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/features/test-suite/components/RecordingPanel.tsx src/renderer/features/test-suite/components/BrowserViewPanel.tsx src/renderer/features/test-suite/components/SetupCard.tsx src/renderer/features/test-suite/components/SharedStepsPanel.tsx src/renderer/features/test-suite/components/ExportPanel.tsx
git commit -m "refactor(test-suite): replace raw HTML with @ui primitives in layout-heavy components"
```

---

### Task 5: Fix raw `<label>` and decompose ConfigEditDialog

**Files:**
- Modify: `src/renderer/features/test-suite/components/ConfigEditDialog.tsx`
- Modify: `src/renderer/features/test-suite/components/SaveRecordingDialog.tsx`

- [ ] **Step 1: Fix ConfigEditDialog.tsx — replace raw `<label>` with @ui `Label`, replace `<div>` layout with @ui**

Read the file first.

Line 242: Replace:
```tsx
<label key={b} className="flex items-center gap-1.5 text-sm">
```
With:
```tsx
<Label key={b} className="flex items-center gap-1.5">
```

Replace ALL `<div className="flex flex-col gap-2">` patterns (lines 162, 173, 189, 202, 217, 238, 256, 268, 281, 328, 363) with `<Stack gap="sm">`.

Replace `<div className="grid grid-cols-2 gap-4">` (line 188) with `<Grid columns={2} gap="md">`.

Replace `<div className="flex gap-3">` (line 240) with `<Flex gap="md">`.

Replace `<div className="flex gap-2">` (line 285) with `<Flex gap="sm">`.

Replace `<div className="flex items-center gap-2">` (line 331) with `<Flex align="center" gap="sm">`.

Replace hardcoded timeout defaults `30000`, `10000` and viewport `1280`, `720`, min values `320`, `240`, max workers `16`, max retries `5` with constants from `lib/constants.ts`.

Add `Flex, Stack, Grid, Label` to `@ui` imports.

- [ ] **Step 2: Fix SaveRecordingDialog.tsx — replace raw `<label>` with @ui `Label`, replace `<div>` layout with @ui**

Read the file first.

Line 200: Replace:
```tsx
<label key={`${s.selector}-${s.expected}-${i}`} className="flex items-start gap-2 text-sm">
```
With:
```tsx
<Label key={`${s.selector}-${s.expected}-${i}`} className="flex items-start gap-2">
```

Replace ALL `<div className="space-y-*">` patterns with `<Stack gap="...">`:
- `space-y-4` → `<Stack gap="md">`
- `space-y-2` → `<Stack gap="sm">`
- `space-y-1.5` → `<Stack gap="xs">`
- `space-y-1` → `<Stack gap="xs">`

Line 240: `<div key={s.stepIndex} className="flex items-baseline gap-2 text-sm">` → `<Flex key={s.stepIndex} align="baseline" gap="sm">`

Add `Flex, Stack, Label` to `@ui` imports.

- [ ] **Step 3: Lint and typecheck**

```bash
npx eslint src/renderer/features/test-suite/components/ConfigEditDialog.tsx src/renderer/features/test-suite/components/SaveRecordingDialog.tsx
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/features/test-suite/components/ConfigEditDialog.tsx src/renderer/features/test-suite/components/SaveRecordingDialog.tsx
git commit -m "refactor(test-suite): replace raw label/div with @ui Label/Stack/Flex in config and save dialogs"
```

---

### Task 6: Decompose AnalyticsPanel into compositional components

**Files:**
- Create: `src/renderer/features/test-suite/lib/health-score.ts`
- Create: `src/renderer/features/test-suite/components/HealthScoreCard.tsx`
- Create: `src/renderer/features/test-suite/components/AnalyticsSummaryMetrics.tsx`
- Create: `src/renderer/features/test-suite/components/AnalyticsDetailCards.tsx`
- Modify: `src/renderer/features/test-suite/components/AnalyticsPanel.tsx`

- [ ] **Step 1: Create `lib/health-score.ts` — move pure scoring functions**

Read `AnalyticsPanel.tsx` first to find all scoring functions.

Create `src/renderer/features/test-suite/lib/health-score.ts`:
```ts
import { GRADE_THRESHOLDS, HEALTH_WEIGHTS, SPEED_THRESHOLDS } from './constants';

export interface HealthScore {
  score: number;
  grade: string;
  color: string;
  passRate: number;
  stability: number;
  speed: number;
}

export function computeHealthScore(analytics: {
  totalRuns: number;
  passedRuns: number;
  flakyTests: Array<{ flakyRate: number }>;
  avgDurationSec: number;
}): HealthScore {
  if (analytics.totalRuns === 0) {
    return { score: 0, grade: 'N/A', color: 'text-text-muted', passRate: 0, stability: 0, speed: 0 };
  }

  const passRate = (analytics.passedRuns / analytics.totalRuns) * 100;
  const stability = analytics.flakyTests.length === 0
    ? 100
    : 100 - analytics.flakyTests.reduce((sum, f) => sum + f.flakyRate, 0) / analytics.flakyTests.length;
  const speed = speedFromAvgSec(analytics.avgDurationSec);
  const score = Math.round(
    (passRate * HEALTH_WEIGHTS.passRate +
      stability * HEALTH_WEIGHTS.stability +
      speed * HEALTH_WEIGHTS.speed) / 100,
  );

  const { grade, color } = gradeFromScore(score);
  return { score, grade, color, passRate, stability, speed };
}

function gradeFromScore(score: number): { grade: string; color: string } {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return { grade: t.grade, color: t.color };
  }
  return { grade: 'F', color: 'text-destructive' };
}

function speedFromAvgSec(avg: number): number {
  if (avg <= SPEED_THRESHOLDS.fast) return 100;
  if (avg >= SPEED_THRESHOLDS.medium) return 0;
  return Math.round(100 * (1 - (avg - SPEED_THRESHOLDS.fast) / SPEED_THRESHOLDS.curve));
}
```

- [ ] **Step 2: Create `HealthScoreCard.tsx`**

Read `AnalyticsPanel.tsx` lines 120-145 to extract the health score display card.

Create `src/renderer/features/test-suite/components/HealthScoreCard.tsx`:
```tsx
import { Flex, Progress, Stack, Text } from '@ui';

import type { HealthScore } from '../lib/health-score';

interface HealthScoreCardProps {
  health: HealthScore;
}

export function HealthScoreCard({ health }: HealthScoreCardProps) {
  return (
    <Flex align="start" gap="lg" wrap="nowrap">
      <Text className={`text-6xl font-bold ${health.color}`}>{health.grade}</Text>
      <Stack className="flex-1" gap="sm">
        <Flex align="center" justify="between">
          <Text size="sm" variant="muted">Overall Score</Text>
          <Text className="font-semibold">{health.score}/100</Text>
        </Flex>
        <Stack gap="xs">
          <ScoreRow label="Pass Rate" value={health.passRate} />
          <ScoreRow label="Stability" value={health.stability} />
          <ScoreRow label="Speed" value={health.speed} />
        </Stack>
      </Stack>
    </Flex>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <Flex align="center" gap="sm">
      <Text className="w-20" size="sm" variant="muted">{label}</Text>
      <Progress className="h-1.5 flex-1" value={value} />
      <Text className="w-10 text-right" size="sm">{Math.round(value)}%</Text>
    </Flex>
  );
}
```

- [ ] **Step 3: Create `AnalyticsSummaryMetrics.tsx`**

Read `AnalyticsPanel.tsx` lines 88-100 to extract the 4-column metrics grid.

Create `src/renderer/features/test-suite/components/AnalyticsSummaryMetrics.tsx`:
```tsx
import { MetricCard } from '@ui';

interface AnalyticsSummaryMetricsProps {
  totalScripts: number;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  avgDurationSec: number;
}

export function AnalyticsSummaryMetrics({
  totalScripts,
  totalRuns,
  passedRuns,
  failedRuns,
  avgDurationSec,
}: AnalyticsSummaryMetricsProps) {
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;

  return (
    <div className="grid grid-cols-4 gap-4 p-6">
      <MetricCard label="Scripts" value={totalScripts} />
      <MetricCard label="Total Runs" value={totalRuns} />
      <MetricCard label="Pass Rate" value={`${passRate}%`} />
      <MetricCard label="Avg Duration" value={`${avgDurationSec.toFixed(1)}s`} />
    </div>
  );
}
```

Note: Check if `MetricCard` accepts the right props — read the file at `src/renderer/shared/components/ui/metric-card.tsx` first. If not, use `<Stack>` + `<Text>` to build the card manually using @ui primitives.

- [ ] **Step 4: Create `AnalyticsDetailCards.tsx`**

Read `AnalyticsPanel.tsx` lines 160-270 to extract the detail cards section (flaky tests, slowest tests, most failing, error patterns).

Create `src/renderer/features/test-suite/components/AnalyticsDetailCards.tsx`. This contains 4 card sections. Replace all raw `<div>` with @ui primitives:
- `<div className="space-y-*">` → `<Stack gap="...">`
- `<div className="flex items-center ...">` → `<Flex align="center" ...>`
- `<div className="grid grid-cols-* ...">` → `<Grid columns={...} ...>`

Use `Text` for all text content.

- [ ] **Step 5: Rewrite `AnalyticsPanel.tsx` as thin composition shell**

Replace `AnalyticsPanel.tsx` to compose the extracted components:

```tsx
import { useLooseParams } from '@renderer/shared/hooks';
import { PageContent, SectionHeader, Stack } from '@ui';

import { useTestSuiteAnalytics, useRunHistory } from '../api/useTestSuiteAnalytics';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { computeHealthScore } from '../lib/health-score';

import { AnalyticsDetailCards } from './AnalyticsDetailCards';
import { AnalyticsSummaryMetrics } from './AnalyticsSummaryMetrics';
import { HealthScoreCard } from './HealthScoreCard';
import { TrendChart } from './TrendChart';

export function AnalyticsPanel() {
  const { projectId } = useLooseParams();
  if (!projectId) return null;
  return <AnalyticsPanelInner projectId={projectId} />;
}

function AnalyticsPanelInner({ projectId }: { projectId: string }) {
  const { data: analytics } = useTestSuiteAnalytics(projectId);
  const { data: scripts = [] } = useTestSuiteScripts(projectId);
  // ... remaining hook calls

  if (!analytics) return null;

  const health = computeHealthScore(analytics);

  return (
    <PageContent className="overflow-auto">
      <AnalyticsSummaryMetrics
        avgDurationSec={analytics.avgDurationSec}
        failedRuns={analytics.failedRuns}
        passedRuns={analytics.passedRuns}
        totalRuns={analytics.totalRuns}
        totalScripts={scripts.length}
      />
      <Stack className="p-6" gap="lg">
        <SectionHeader title="Test Health" />
        <HealthScoreCard health={health} />
        <SectionHeader title="Trends" />
        <TrendChart />
        <SectionHeader title="Details" />
        <AnalyticsDetailCards analytics={analytics} />
      </Stack>
    </PageContent>
  );
}
```

Adjust exact props and hooks based on what you find when reading the current file.

- [ ] **Step 6: Lint and typecheck**

```bash
npx eslint src/renderer/features/test-suite/lib/health-score.ts src/renderer/features/test-suite/components/HealthScoreCard.tsx src/renderer/features/test-suite/components/AnalyticsSummaryMetrics.tsx src/renderer/features/test-suite/components/AnalyticsDetailCards.tsx src/renderer/features/test-suite/components/AnalyticsPanel.tsx
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/features/test-suite/lib/health-score.ts src/renderer/features/test-suite/components/HealthScoreCard.tsx src/renderer/features/test-suite/components/AnalyticsSummaryMetrics.tsx src/renderer/features/test-suite/components/AnalyticsDetailCards.tsx src/renderer/features/test-suite/components/AnalyticsPanel.tsx
git commit -m "refactor(test-suite): decompose AnalyticsPanel into compositional sub-components"
```

---

### Task 7: Decompose ScreenshotsPanel into compositional components

**Files:**
- Create: `src/renderer/features/test-suite/components/ScreenshotThumbnailStrip.tsx`
- Create: `src/renderer/features/test-suite/components/ScreenshotPreview.tsx`
- Modify: `src/renderer/features/test-suite/components/ScreenshotsPanel.tsx`

- [ ] **Step 1: Read ScreenshotsPanel.tsx**

Read the full file to understand the three visual regions: script/run selector toolbar, thumbnail strip (sidebar), and main preview pane.

- [ ] **Step 2: Create `ScreenshotThumbnailStrip.tsx`**

Extract the thumbnail sidebar (the scrollable column of screenshot thumbnails). Replace all raw `<div>` with @ui primitives:
- `<div className="flex flex-col gap-1.5 p-2">` → `<Stack className="p-2" gap="xs">`

The component should accept:
```ts
interface ScreenshotThumbnailStripProps {
  screenshots: Array<{ id: string; path: string; stepIndex: number }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}
```

- [ ] **Step 3: Create `ScreenshotPreview.tsx`**

Extract the main preview pane. Replace raw `<div>` with @ui primitives. The component should accept:
```ts
interface ScreenshotPreviewProps {
  screenshotPath: string | null;
  stepLabel: string;
  comparison?: { baselinePath: string; diffPercent: number };
}
```

- [ ] **Step 4: Rewrite `ScreenshotsPanel.tsx` as composition shell**

The rewritten file should:
1. Own the data fetching hooks
2. Manage selection state
3. Compose `ScreenshotThumbnailStrip` and `ScreenshotPreview`
4. Replace all remaining raw `<div>` with @ui primitives

- [ ] **Step 5: Lint and typecheck**

```bash
npx eslint src/renderer/features/test-suite/components/ScreenshotThumbnailStrip.tsx src/renderer/features/test-suite/components/ScreenshotPreview.tsx src/renderer/features/test-suite/components/ScreenshotsPanel.tsx
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/features/test-suite/components/ScreenshotThumbnailStrip.tsx src/renderer/features/test-suite/components/ScreenshotPreview.tsx src/renderer/features/test-suite/components/ScreenshotsPanel.tsx
git commit -m "refactor(test-suite): decompose ScreenshotsPanel into compositional sub-components"
```

---

### Task 8: Decompose LibraryPanel into compositional components

**Files:**
- Create: `src/renderer/features/test-suite/hooks/useLibraryFilters.ts`
- Create: `src/renderer/features/test-suite/components/LibraryToolbar.tsx`
- Create: `src/renderer/features/test-suite/components/LibraryTagFilter.tsx`
- Create: `src/renderer/features/test-suite/components/LibraryScriptRow.tsx`
- Create: `src/renderer/features/test-suite/components/LibraryBulkActions.tsx`
- Modify: `src/renderer/features/test-suite/components/LibraryPanel.tsx`

- [ ] **Step 1: Read LibraryPanel.tsx**

Read the full 451-line file to understand all regions: search bar + filters, tag filter strip, scrollable script table, and bulk action footer bar.

- [ ] **Step 2: Create `hooks/useLibraryFilters.ts`**

Extract the filter state and filtering logic (search term, status filter, tag filter, selection set) from LibraryPanel:

```ts
import { useMemo, useState } from 'react';

import type { StatusFilter } from '../lib/constants';

interface Script {
  id: string;
  name: string;
  tags?: string[];
}

interface LibraryFilters {
  search: string;
  setSearch: (s: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (f: StatusFilter) => void;
  activeTags: string[];
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  selected: Set<string>;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelected: () => void;
}

export function useLibraryFilters(): LibraryFilters {
  // implement state management for all filters
}
```

- [ ] **Step 3: Create `LibraryToolbar.tsx`**

Extract the search bar + status filter + action buttons row. Replace all raw `<div>` with @ui primitives:
- `<div className="flex flex-col gap-2 border-b ...">` → `<Stack gap="sm" className="border-b ...">`
- `<div className="flex items-center gap-2">` → `<Flex align="center" gap="sm">`
- `<div className="relative flex-1">` → Keep as `<div>` (positioning container for SearchInput)
- `<div className="flex items-center gap-1">` → `<Flex align="center" gap="xs">`

Use `SearchInput` from `@ui` instead of raw `Input` with search icon.

- [ ] **Step 4: Create `LibraryTagFilter.tsx`**

Extract the tag filter strip (the horizontal row of clickable tag badges). Replace:
- `<div className="flex flex-wrap items-center gap-1 px-4 py-1.5 border-b border-border">` → `<Flex align="center" className="px-4 py-1.5 border-b border-border" gap="xs">`

- [ ] **Step 5: Create `LibraryScriptRow.tsx`**

Extract a single script row from the table body. This is the `.map()` callback body from LibraryPanel. Replace:
- `<div className="flex items-center gap-1">` → `<Flex align="center" gap="xs">`

The component should accept:
```ts
interface LibraryScriptRowProps {
  script: Script;
  isSelected: boolean;
  lastStatus: string;
  flakyIndicator: boolean;
  onToggleSelect: () => void;
  onSelect: () => void;
  onDelete: () => void;
}
```

- [ ] **Step 6: Create `LibraryBulkActions.tsx`**

Extract the bulk action footer bar. Replace:
- `<div className="flex items-center gap-3 border-t border-border bg-bg-surface px-4 py-2">` → `<Flex align="center" className="border-t border-border bg-bg-surface px-4 py-2" gap="md" wrap="nowrap">`

- [ ] **Step 7: Rewrite `LibraryPanel.tsx` as composition shell**

The rewritten file should:
1. Use `useLibraryFilters()` for all filter state
2. Compose: `LibraryToolbar`, `LibraryTagFilter`, scrollable area with `LibraryScriptRow` map, `LibraryBulkActions`
3. Own data-fetching hooks (scripts, flaky tests, analytics)
4. Replace remaining raw `<div>` (the outer scroll area `<div className="flex-1 overflow-auto">` → `<ScrollArea className="flex-1">`)

Replace hardcoded `10` for sparkline limit with `SPARKLINE_RUN_LIMIT` from `lib/constants.ts`.

- [ ] **Step 8: Lint and typecheck**

```bash
npx eslint src/renderer/features/test-suite/hooks/useLibraryFilters.ts src/renderer/features/test-suite/components/LibraryToolbar.tsx src/renderer/features/test-suite/components/LibraryTagFilter.tsx src/renderer/features/test-suite/components/LibraryScriptRow.tsx src/renderer/features/test-suite/components/LibraryBulkActions.tsx src/renderer/features/test-suite/components/LibraryPanel.tsx
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/renderer/features/test-suite/hooks/useLibraryFilters.ts src/renderer/features/test-suite/components/LibraryToolbar.tsx src/renderer/features/test-suite/components/LibraryTagFilter.tsx src/renderer/features/test-suite/components/LibraryScriptRow.tsx src/renderer/features/test-suite/components/LibraryBulkActions.tsx src/renderer/features/test-suite/components/LibraryPanel.tsx
git commit -m "refactor(test-suite): decompose LibraryPanel into compositional sub-components with extracted filter hook"
```

---

### Task 9: Split recorder-handlers.ts into domain handler files

**Files:**
- Create: `src/main/features/test-suite/handlers/script-handlers.ts`
- Create: `src/main/features/test-suite/handlers/run-handlers.ts`
- Create: `src/main/features/test-suite/handlers/browser-view-handlers.ts`
- Create: `src/main/features/test-suite/handlers/config-handlers.ts`
- Create: `src/main/features/test-suite/handlers/screenshot-handlers.ts`
- Create: `src/main/features/test-suite/handlers/data-run-handlers.ts`
- Create: `src/main/features/test-suite/handlers/export-handlers.ts`
- Create: `src/main/features/test-suite/handlers/auth-handlers.ts`
- Modify: `src/main/features/test-suite/recorder-handlers.ts`

- [ ] **Step 1: Read the current recorder-handlers.ts**

Read the full 455-line file. Identify all `router.handle(...)` calls and group them by domain:
- **Scripts**: `LIST.SCRIPTS`, `GET.SCRIPT`, `SAVE.SCRIPT`, `DELETE.SCRIPT`
- **Runs**: `RUN.SCRIPT`, `GET.RUN`, `LIST.RUNS`, `BATCH.RUN`
- **Browser View**: `BROWSER-VIEW.CREATE/NAVIGATE/BACK/FORWARD/RELOAD/SET-BOUNDS/DESTROY`
- **Config**: `CONFIG.GET/LIST/SAVE/DELETE/SET-ACTIVE`
- **Screenshots**: `SCREENSHOT.LIST/EXPORT-ZIP/COPY`
- **Data Run**: `DATA-RUN.PARSE/EXECUTE`
- **Export**: `EXPORT.FILE/GITHUB/CI-PREVIEW/CI-COMMIT`
- **Auth**: `AUTH.SAVE/CLEAR`
- **Report**: `OPEN.REPORT`
- **Task**: `TASK.ATTACH-RUN`

- [ ] **Step 2: Create `handlers/script-handlers.ts`**

Follow the exact same pattern as existing handler files (e.g., `handlers/analytics-handlers.ts`). Each handler file exports a single `register*Handlers` function:

```ts
import type { IpcRouter } from '@main/ipc';
import { TEST_SUITE } from '@shared/ipc/test-suite/channels';
import { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';
import type { TestSuiteService } from '../test-suite-service-types';

export function registerScriptHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
): void {
  router.handle(TEST_SUITE.LIST.SCRIPTS, ({ projectId }) =>
    testSuiteService.listScriptsByProject(projectId) as never,
  );

  router.handle(TEST_SUITE.GET.SCRIPT, ({ id }) =>
    testSuiteService.getScript(id) as never,
  );

  router.handle(TEST_SUITE.SAVE.SCRIPT, (input) => {
    // Move the full body from recorder-handlers.ts
  });

  router.handle(TEST_SUITE.DELETE.SCRIPT, ({ id }) =>
    testSuiteService.deleteScript(id) as never,
  );
}
```

Read the actual handler bodies from `recorder-handlers.ts` and move them verbatim.

- [ ] **Step 3: Create `handlers/run-handlers.ts`**

Move `RUN.SCRIPT`, `GET.RUN`, `LIST.RUNS`, `BATCH.RUN`, `TASK.ATTACH-RUN`, `OPEN.REPORT` handlers. These need `testSuiteService`, `projectService`, and imports for config/runner dependencies.

- [ ] **Step 4: Create `handlers/browser-view-handlers.ts`**

Move all 7 `BROWSER-VIEW.*` handlers.

- [ ] **Step 5: Create `handlers/config-handlers.ts`**

Move all 5 `CONFIG.*` handlers.

- [ ] **Step 6: Create `handlers/screenshot-handlers.ts`**

Move all 3 `SCREENSHOT.*` handlers plus the `COPY` handler with its `copyFile` logic.

- [ ] **Step 7: Create `handlers/data-run-handlers.ts`**

Move `DATA-RUN.PARSE` and `DATA-RUN.EXECUTE` handlers. These need `parseDataFile` and `substituteDataInSteps` imports.

- [ ] **Step 8: Create `handlers/export-handlers.ts`**

Move `EXPORT.FILE`, `EXPORT.GITHUB`, `EXPORT.CI-PREVIEW`, `EXPORT.CI-COMMIT` handlers.

- [ ] **Step 9: Create `handlers/auth-handlers.ts`**

Move `AUTH.SAVE` and `AUTH.CLEAR` handlers.

- [ ] **Step 10: Rewrite `recorder-handlers.ts` as thin registration shell**

The file should only:
1. Import all `register*Handlers` functions
2. Set up event forwarding (the `onRunEvent` listener — ~30 lines)
3. Call each registration function

```ts
export function registerTestSuiteHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
  projectService: ProjectService,
): void {
  // Event forwarding (keep here — it's cross-cutting)
  testSuiteService.onRunEvent((event) => {
    // ... existing event forwarding code ...
  });

  // Domain handler registration
  registerScriptHandlers(router, testSuiteService);
  registerRunHandlers(router, testSuiteService, projectService);
  registerBrowserViewHandlers(router, testSuiteService);
  registerConfigHandlers(router, testSuiteService);
  registerScreenshotHandlers(router, testSuiteService);
  registerDataRunHandlers(router, testSuiteService);
  registerExportHandlers(router, testSuiteService, projectService);
  registerAuthHandlers(router, testSuiteService);
  registerAnalyticsHandlers(router, testSuiteService);
  registerBaselineHandlers(router, testSuiteService);
  registerScheduleHandlers(router, testSuiteService);
  registerSetupHandlers(router, testSuiteService, projectService);
  registerSharedStepsHandlers(router, testSuiteService);
  registerWatchHandlers(router, testSuiteService);
}
```

The file should drop from 455 lines to ~70 lines.

- [ ] **Step 11: Lint and typecheck**

```bash
npx eslint src/main/features/test-suite/recorder-handlers.ts src/main/features/test-suite/handlers/script-handlers.ts src/main/features/test-suite/handlers/run-handlers.ts src/main/features/test-suite/handlers/browser-view-handlers.ts src/main/features/test-suite/handlers/config-handlers.ts src/main/features/test-suite/handlers/screenshot-handlers.ts src/main/features/test-suite/handlers/data-run-handlers.ts src/main/features/test-suite/handlers/export-handlers.ts src/main/features/test-suite/handlers/auth-handlers.ts
npx tsc --noEmit
```

- [ ] **Step 12: Commit**

```bash
git add src/main/features/test-suite/recorder-handlers.ts src/main/features/test-suite/handlers/
git commit -m "refactor(test-suite): split recorder-handlers.ts into 8 domain-specific handler files"
```

---

### Task 10: Final verification and cleanup

**Files:**
- All modified/created files from Tasks 1-9

- [ ] **Step 1: Run full raw HTML audit**

Search for any remaining violations:

```bash
# Raw form controls (should be zero)
npx grep -rn '<button\|<input\|<label\|<select\|<textarea' src/renderer/features/test-suite/components/

# Raw layout divs (review each — CSS-only containers are acceptable)
npx grep -rn '<div' src/renderer/features/test-suite/components/ | wc -l
```

- [ ] **Step 2: Run full lint on all test-suite renderer files**

```bash
npx eslint src/renderer/features/test-suite/**/*.{ts,tsx}
```

- [ ] **Step 3: Run full typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Verify file sizes**

```bash
find src/renderer/features/test-suite -name '*.tsx' | while read f; do lines=$(wc -l < "$f"); if [ "$lines" -gt 200 ]; then echo "WARNING: $lines $f"; fi; done
```

Target: no component file over 200 lines (except dialog files with complex forms).

- [ ] **Step 5: Verify no duplicate utility functions**

```bash
grep -rn 'function formatDuration\|function getOutputLineClass\|function stepToLabel\|function gradeFromScore\|function computeHealthScore' src/renderer/features/test-suite/
```

Each function should appear exactly once (in `lib/format.ts` or `lib/health-score.ts`).

- [ ] **Step 6: Commit if any fixes needed**

```bash
git add -A
git commit -m "refactor(test-suite): final cleanup from compositional audit"
```
