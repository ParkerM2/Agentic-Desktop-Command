# Test Suite Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 11 gaps in the test-suite feature — runtime crashes, IPC schema mismatches, dead UI buttons, broken exports, and duplicate hooks/query keys.

**Architecture:** Fix the IPC contract first (shared layer), then backend service/handler layer, then renderer hooks and components. Each task produces a committable unit. No new files except one extracted hook (`useExportRun.ts`).

**Tech Stack:** TypeScript, Zod, Drizzle ORM, React Query, Zustand, Electron IPC

**Spec:** `docs/superpowers/specs/2026-04-17-test-suite-gap-closure-design.md`

---

### Task 1: Expand QaScriptSchema and LIST.SCRIPTS contract

**Files:**
- Modify: `src/shared/ipc/test-suite/schemas.ts:82-89`
- Modify: `src/shared/ipc/test-suite/contract.ts:47-49`

- [ ] **Step 1: Expand QaScriptSchema in schemas.ts**

Replace the existing `QaScriptSchema` (lines 82-89) with the full shape matching the DB store:

```ts
export const QaScriptSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  steps: z.array(TestSuiteStepSchema),
  filePath: z.string(),
  projectId: z.string(),
  targetUrl: z.string(),
  stepCount: z.number().int(),
  lastStatus: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

- [ ] **Step 2: Add projectId to LIST.SCRIPTS input in contract.ts**

Replace the LIST.SCRIPTS entry (lines 47-49):

```ts
[TEST_SUITE.LIST.SCRIPTS]: {
  input: z.object({ projectId: z.string() }),
  output: z.array(QaScriptSchema),
},
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: Type errors in renderer files that derive `QaScript` from the old schema shape (e.g., `useScripts.ts`). These are expected — they get fixed in later tasks. Backend files should have no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ipc/test-suite/schemas.ts src/shared/ipc/test-suite/contract.ts
git commit -m "fix(test-suite): expand QaScriptSchema, add projectId to LIST.SCRIPTS contract"
```

---

### Task 2: Fix service facade — listScriptsByProject, runner.run() projectId, exportFile steps

**Files:**
- Modify: `src/main/features/test-suite/index.ts:86-131` (interface) and `215-293` (methods)
- Modify: `src/main/features/test-suite/recorder-handlers.ts:69-99` (local interface) and `145-146` (handler)
- Modify: `src/main/features/qa/qa-trigger.ts:131`

- [ ] **Step 1: Add listScriptsByProject to TestSuiteService interface in index.ts**

In the `TestSuiteService` interface (around line 103), add after `listScripts`:

```ts
listScriptsByProject: (projectId: string) => Promise<QaScript[]>;
```

- [ ] **Step 2: Add listScriptsByProject facade method in index.ts**

After the `listScripts` method (around line 215), add:

```ts
listScriptsByProject: (projectId) => Promise.resolve(scriptStore.listByProject(projectId)),
```

- [ ] **Step 3: Fix runScript() — add projectId to runner.run() call in index.ts**

In the `runScript` method (around line 259), change the `runner.run()` call from:

```ts
const runId = runner.run({
  scriptId,
  filePath: script.filePath,
  projectPath,
  triggeredBy,
  screenshotDir,
  handlers: sharedHandlers,
});
```

To:

```ts
const runId = runner.run({
  scriptId,
  projectId: script.projectId,
  filePath: script.filePath,
  projectPath,
  triggeredBy,
  screenshotDir,
  handlers: sharedHandlers,
});
```

- [ ] **Step 4: Fix exportFile() — pass actual steps in index.ts**

In the `exportFile` method (around line 291), change:

```ts
steps: [],
```

To:

```ts
steps: script.steps,
```

- [ ] **Step 5: Update local TestSuiteService interface in recorder-handlers.ts**

In the local `TestSuiteService` interface (around line 69), add after `listScripts`:

```ts
listScriptsByProject: (projectId: string) => Promise<unknown[]>;
```

- [ ] **Step 6: Update LIST.SCRIPTS handler in recorder-handlers.ts**

Change the handler (around line 145) from:

```ts
router.handle(TEST_SUITE.LIST.SCRIPTS, () =>
  testSuiteService.listScripts() as never,
);
```

To:

```ts
router.handle(TEST_SUITE.LIST.SCRIPTS, ({ projectId }) =>
  testSuiteService.listScriptsByProject(projectId) as never,
);
```

- [ ] **Step 7: Fix runner.run() call in qa-trigger.ts**

In `qa-trigger.ts` (around line 131), change:

```ts
testSuiteService.runner.run({
  scriptId: script.id,
  filePath: script.filePath,
  projectPath,
  triggeredBy: 'auto-trigger',
  taskId,
});
```

To:

```ts
testSuiteService.runner.run({
  scriptId: script.id,
  projectId: script.projectId,
  filePath: script.filePath,
  projectPath,
  triggeredBy: 'auto-trigger',
  taskId,
});
```

- [ ] **Step 8: Run typecheck on backend files**

Run: `npx tsc --noEmit 2>&1 | grep -E "src/main/" | head -20`

Expected: Zero backend errors. Renderer errors still expected (fixed in later tasks).

- [ ] **Step 9: Commit**

```bash
git add src/main/features/test-suite/index.ts src/main/features/test-suite/recorder-handlers.ts src/main/features/qa/qa-trigger.ts
git commit -m "fix(test-suite): add listScriptsByProject, fix runner.run() projectId, fix exportFile steps"
```

---

### Task 3: Consolidate query keys — delete queryKeys.ts, update testSuiteKeys.ts

**Files:**
- Delete: `src/renderer/features/test-suite/api/queryKeys.ts`
- Modify: `src/renderer/features/test-suite/api/testSuiteKeys.ts`
- Modify: `src/renderer/features/test-suite/api/useRuns.ts`

- [ ] **Step 1: Update testSuiteKeys.ts — add allRuns and configs keys**

Replace the entire file with:

```ts
const ANALYTICS = 'analytics';

export const testSuiteKeys = {
  all: ['test-suite'] as const,
  config: (projectId: string) => [...testSuiteKeys.all, 'config', projectId] as const,
  configs: (projectId: string) => [...testSuiteKeys.all, 'configs', projectId] as const,
  scripts: (projectId: string) => [...testSuiteKeys.all, 'scripts', projectId] as const,
  script: (id: string) => [...testSuiteKeys.all, 'script', id] as const,
  runs: (scriptId: string) => [...testSuiteKeys.all, 'runs', scriptId] as const,
  allRuns: (projectId: string) => [...testSuiteKeys.all, 'runs', 'all', projectId] as const,
  run: (runId: string) => [...testSuiteKeys.all, 'run', runId] as const,
  screenshots: (runId: string) => [...testSuiteKeys.all, 'screenshots', runId] as const,
  analytics: {
    all: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, projectId] as const,
    summary: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'summary', projectId] as const,
    trend: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'trend', projectId] as const,
    topFailures: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'top-failures', projectId] as const,
    slowest: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'slowest', projectId] as const,
    errorPatterns: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'error-patterns', projectId] as const,
    flaky: (projectId: string) => [...testSuiteKeys.all, ANALYTICS, 'flaky', projectId] as const,
    runHistory: (scriptId: string) => [...testSuiteKeys.all, ANALYTICS, 'run-history', scriptId] as const,
  },
};
```

- [ ] **Step 2: Rewrite useRuns.ts — switch from queryKeys to testSuiteKeys**

Replace the entire file with:

```ts
/**
 * React Query hooks for QA run queries and mutations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { testSuiteKeys } from './testSuiteKeys';

/** Fetch all runs, optionally filtered by scriptId */
export function useRuns(scriptId?: string) {
  return useQuery({
    queryKey: scriptId ? testSuiteKeys.runs(scriptId) : testSuiteKeys.all,
    queryFn: () => ipc(TEST_SUITE.LIST.RUNS, { scriptId }),
    staleTime: 10_000,
  });
}

/** Fetch a single run by id */
export function useRun(runId: string | null) {
  return useQuery({
    queryKey: testSuiteKeys.run(runId ?? ''),
    queryFn: () => ipc(TEST_SUITE.GET.RUN, { runId: runId ?? '' }),
    enabled: runId !== null && runId.length > 0,
    staleTime: 5_000,
  });
}

/** Run a QA script */
export function useRunScript() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({
      scriptId,
      triggeredBy = 'manual',
    }: {
      scriptId: string;
      triggeredBy?: 'manual' | 'scheduled' | 'ci';
    }) => ipc(TEST_SUITE.RUN.SCRIPT, { scriptId, triggeredBy }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testSuiteKeys.all });
    },
    onError: onError('run QA script'),
  });
}
```

- [ ] **Step 3: Delete queryKeys.ts**

```bash
rm src/renderer/features/test-suite/api/queryKeys.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/features/test-suite/api/testSuiteKeys.ts src/renderer/features/test-suite/api/useRuns.ts
git rm src/renderer/features/test-suite/api/queryKeys.ts
git commit -m "refactor(test-suite): consolidate to single testSuiteKeys query key factory"
```

---

### Task 4: Delete duplicate hooks, extract useExportRun, fix useTestSuiteScripts

**Files:**
- Delete: `src/renderer/features/test-suite/api/useScriptMutations.ts`
- Delete: `src/renderer/features/test-suite/api/useScripts.ts`
- Create: `src/renderer/features/test-suite/api/useExportRun.ts`
- Modify: `src/renderer/features/test-suite/api/useTestSuiteScripts.ts`
- Modify: `src/renderer/features/test-suite/store.ts:10`
- Modify: `src/renderer/features/test-suite/components/StepPanel.tsx:31`
- Modify: `src/renderer/features/test-suite/components/ScriptSelector.tsx:17-21`
- Modify: `src/renderer/features/test-suite/api/index.ts`

- [ ] **Step 1: Create useExportRun.ts — extracted from useScriptMutations.ts**

Create `src/renderer/features/test-suite/api/useExportRun.ts`:

```ts
import { useMutation } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

/** Export a run to file */
export function useExportRun() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ runId, format }: { runId: string; format: 'json' | 'html' | 'csv' }) =>
      ipc(TEST_SUITE.EXPORT.FILE, { runId, format }),
    onError: onError('export run'),
  });
}
```

- [ ] **Step 2: Fix store.ts — switch TestSuiteStep import source**

In `src/renderer/features/test-suite/store.ts`, change line 10 from:

```ts
import type { TestSuiteStep } from './api/useScriptMutations';
```

To:

```ts
import type { TestSuiteStep } from '@shared/types/test-suite';
```

- [ ] **Step 3: Fix StepPanel.tsx — switch TestSuiteStep import source**

In `src/renderer/features/test-suite/components/StepPanel.tsx`, change line 31 from:

```ts
import type { TestSuiteStep } from '../api/useScriptMutations';
```

To:

```ts
import type { TestSuiteStep } from '@shared/types/test-suite';
```

- [ ] **Step 4: Fix ScriptSelector.tsx — switch from useScripts to useTestSuiteScripts**

Replace lines 17-21 in `src/renderer/features/test-suite/components/ScriptSelector.tsx`:

```ts
import { useScripts } from '../api/useScripts';
import { useTestSuiteStore } from '../store';

export function ScriptSelector() {
  const { data: scripts, isLoading } = useScripts();
```

With:

```ts
import { useLooseParams } from '@renderer/shared/hooks';

import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useTestSuiteStore } from '../store';

export function ScriptSelector() {
  const { projectId } = useLooseParams();
  const { data: scripts, isLoading } = useTestSuiteScripts(projectId);
```

- [ ] **Step 5: Fix useTestSuiteScripts.ts — pass projectId to IPC call**

In `src/renderer/features/test-suite/api/useTestSuiteScripts.ts`, change the `queryFn` from:

```ts
queryFn: () => ipc(TEST_SUITE.LIST.SCRIPTS, {}),
```

To:

```ts
queryFn: () => ipc(TEST_SUITE.LIST.SCRIPTS, { projectId: projectId! }),
```

- [ ] **Step 6: Delete useScriptMutations.ts and useScripts.ts**

```bash
rm src/renderer/features/test-suite/api/useScriptMutations.ts
rm src/renderer/features/test-suite/api/useScripts.ts
```

- [ ] **Step 7: Update api/index.ts barrel — remove deleted exports, add useExportRun**

Replace the entire file with:

```ts
export { testSuiteKeys } from './testSuiteKeys';
export { useAttachRunToTask } from './useAttachRunToTask';
export { useTestSuiteConfig } from './useTestSuiteConfig';
export { useTestSuiteConfigs } from './useTestSuiteConfigs';
export { useTestSuiteScripts } from './useTestSuiteScripts';
export { useTestSuiteRuns } from './useTestSuiteRuns';
export { useTestSuiteScreenshots } from './useTestSuiteScreenshots';
export { useSaveTestSuiteConfig } from './useSaveTestSuiteConfig';
export { useDeleteTestSuiteConfig } from './useDeleteTestSuiteConfig';
export { useSetActiveTestSuiteConfig } from './useSetActiveTestSuiteConfig';
export { useStartRecording } from './useStartRecording';
export { useStopRecording } from './useStopRecording';
export { useSaveScript } from './useSaveScript';
export { useDeleteScript } from './useDeleteScript';
export { useExportRun } from './useExportRun';
```

- [ ] **Step 8: Commit**

```bash
git add src/renderer/features/test-suite/api/useExportRun.ts src/renderer/features/test-suite/api/useTestSuiteScripts.ts src/renderer/features/test-suite/api/index.ts src/renderer/features/test-suite/store.ts src/renderer/features/test-suite/components/StepPanel.tsx src/renderer/features/test-suite/components/ScriptSelector.tsx
git rm src/renderer/features/test-suite/api/useScriptMutations.ts src/renderer/features/test-suite/api/useScripts.ts
git commit -m "refactor(test-suite): delete duplicate hooks, extract useExportRun, fix imports"
```

---

### Task 5: Wire Run and Run Selected buttons in LibraryPanel

**Files:**
- Modify: `src/renderer/features/test-suite/components/LibraryPanel.tsx`

- [ ] **Step 1: Import useRunScript**

In `LibraryPanel.tsx`, add this import alongside the existing test-suite API imports (around line 40):

```ts
import { useRunScript } from '../api/useRuns';
```

- [ ] **Step 2: Instantiate useRunScript in the component**

Inside the `LibraryPanel` function body, after the existing hook calls (around line 71), add:

```ts
const runScript = useRunScript();
```

- [ ] **Step 3: Wire the per-script Run button**

Find the Run button (around line 243):

```tsx
<Button size="icon" title="Run" variant="ghost">
  <Play className="h-4 w-4" />
</Button>
```

Replace with:

```tsx
<Button
  size="icon"
  title="Run"
  variant="ghost"
  onClick={() => runScript.mutate({ scriptId: script.id })}
>
  <Play className="h-4 w-4" />
</Button>
```

- [ ] **Step 4: Wire the Run Selected bulk button**

Find the Run Selected button (around line 322):

```tsx
<Button size="sm" variant="ghost">
  <Play className="h-3 w-3" /> Run Selected
</Button>
```

Replace with:

```tsx
<Button
  size="sm"
  variant="ghost"
  onClick={() => {
    for (const id of selected) runScript.mutate({ scriptId: id });
  }}
>
  <Play className="h-3 w-3" /> Run Selected
</Button>
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/features/test-suite/components/LibraryPanel.tsx
git commit -m "fix(test-suite): wire Run and Run Selected buttons in LibraryPanel"
```

---

### Task 6: Typecheck, lint, and verify

**Files:** All files modified in tasks 1-5

- [ ] **Step 1: Run full typecheck**

Run: `npx tsc --noEmit`

Expected: Zero errors.

- [ ] **Step 2: Lint changed files**

Run:
```bash
npx eslint src/shared/ipc/test-suite/schemas.ts src/shared/ipc/test-suite/contract.ts src/main/features/test-suite/index.ts src/main/features/test-suite/recorder-handlers.ts src/main/features/qa/qa-trigger.ts src/renderer/features/test-suite/api/testSuiteKeys.ts src/renderer/features/test-suite/api/useRuns.ts src/renderer/features/test-suite/api/useExportRun.ts src/renderer/features/test-suite/api/useTestSuiteScripts.ts src/renderer/features/test-suite/api/index.ts src/renderer/features/test-suite/store.ts src/renderer/features/test-suite/components/StepPanel.tsx src/renderer/features/test-suite/components/ScriptSelector.tsx src/renderer/features/test-suite/components/LibraryPanel.tsx
```

Expected: Zero errors. Fix any import ordering or lint issues.

- [ ] **Step 3: Kill Electron and restart**

Run: `taskkill //F //IM electron.exe 2>/dev/null; cd C:/Users/Parke/Desktop/Agent-Desktop-Command && npm run dev`

- [ ] **Step 4: Verify manually**

Open the app. Navigate to a project's Test Suite tab.
1. Library should show only scripts for the current project (not all projects)
2. Record a test → Save → Library shows the test with correct step count and description
3. Click Run on a script → run executes (check Results tab for output)
4. Select multiple scripts → Run Selected → all selected scripts run

- [ ] **Step 5: Commit any lint fixes**

If lint found issues:
```bash
git add -u
git commit -m "fix(test-suite): lint fixes for gap closure"
```
