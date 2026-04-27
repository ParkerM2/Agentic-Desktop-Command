# Test Suite Full IPC Contract Refactor

**Date:** 2026-04-17
**Branch:** develop
**Scope:** Close all 11 gaps found in gap analysis — runtime crashes, schema mismatches, dead UI, broken exports, duplicate hooks

## Problem

The test-suite feature has 11 gaps across backend, IPC contract, and renderer layers:

- 2 runtime crashes (runner.run() missing projectId at both call sites)
- 3 data/type mismatches (QaScriptSchema missing 6 fields, two competing query key factories, duplicate mutation hooks with different cache invalidation)
- 3 broken UI elements (Run button, Run Selected button, exportFile passes empty steps)
- 1 intentional stub (exportGithub — no action needed)
- 2 compounding issues (duplicate hooks, allRuns unscoped — fixed by other gaps)

Root causes:
1. Migration 0016 renamed tables but never added columns added later to the Drizzle schema. Fixed by migrations 0022-0024 (already created).
2. QaScriptSchema was written for the original minimal IPC shape and never updated when the DB store grew.
3. Two separate developers (or sessions) created competing query key files with incompatible signatures.
4. Run buttons were scaffolded as UI but never wired to mutations.

## Design

### 1. IPC Contract — Single Source of Truth

**File: `src/shared/ipc/test-suite/schemas.ts`**

Expand `QaScriptSchema` to include all fields the DB store returns:

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

**File: `src/shared/ipc/test-suite/contract.ts`**

Add `projectId` to `LIST.SCRIPTS` input:

```ts
[TEST_SUITE.LIST.SCRIPTS]: {
  input: z.object({ projectId: z.string() }),
  output: z.array(QaScriptSchema),
},
```

### 2. Handler & Service Layer

**File: `src/main/features/test-suite/recorder-handlers.ts`**

LIST.SCRIPTS handler filters by project:

```ts
router.handle(TEST_SUITE.LIST.SCRIPTS, ({ projectId }) =>
  testSuiteService.listScriptsByProject(projectId) as never,
);
```

Update the local `TestSuiteService` interface to include `listScriptsByProject`.

**File: `src/main/features/test-suite/index.ts`**

Three changes:

1. Add `listScriptsByProject` facade method → delegates to `scriptStore.listByProject(projectId)`
2. Fix `runScript()` → pass `projectId: script.projectId` to `runner.run()`
3. Fix `exportFile()` → pass `steps: script.steps` instead of `steps: []`

Add `listScriptsByProject` to the `TestSuiteService` interface.

**File: `src/main/features/qa/qa-trigger.ts`**

Add `projectId: script.projectId` to the `runner.run()` call at line 131.

### 3. Renderer — Single Query Key Factory & Hook Consolidation

**Delete:** `src/renderer/features/test-suite/api/queryKeys.ts`

**Canonical key factory:** `src/renderer/features/test-suite/api/testSuiteKeys.ts`

Add missing keys:

```ts
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
  analytics: { /* unchanged */ },
};
```

**Delete:** `src/renderer/features/test-suite/api/useScriptMutations.ts`
- `useSaveScript()` and `useDeleteScript()` are duplicates of the projectId-based versions in their own files
- Extract `useExportRun()` to new file `src/renderer/features/test-suite/api/useExportRun.ts`

**Delete:** `src/renderer/features/test-suite/api/useScripts.ts`
- Duplicate of `useTestSuiteScripts.ts`
- One importer: `ScriptSelector.tsx` — switch to `useTestSuiteScripts(projectId)` with projectId from `useLooseParams()`

**Update hooks importing from `queryKeys`:**
- `useRuns.ts` → import from `testSuiteKeys`, use `testSuiteKeys.runs(scriptId)`

**Fix `useTestSuiteScripts.ts`:**
- Pass `projectId` to IPC call: `ipc(TEST_SUITE.LIST.SCRIPTS, { projectId: projectId! })`

**Update `api/index.ts` barrel** — remove deleted exports, add `useExportRun`.

### 4. LibraryPanel — Wire Dead Buttons

**File: `src/renderer/features/test-suite/components/LibraryPanel.tsx`**

Import and instantiate `useRunScript()` from `useRuns.ts`.

Wire Run button per script:

```tsx
onClick={() => runScript.mutate({ scriptId: script.id })}
```

Wire Run Selected bulk button:

```tsx
onClick={() => {
  for (const id of selected) runScript.mutate({ scriptId: id });
}}
```

## Not In Scope

- No new database migrations (0022-0024 already created)
- No new IPC channels
- No new components
- No changes to: recording flow, browser view, screenshots, baselines, schedules, shared steps, analytics, diff engine, config store, watcher, scheduler
- No Zod output validation enforcement on handlers (leave `as never` casts)
- `exportGithub` stays as a stub — no GitHub integration

## Files Modified

| File | Action |
|------|--------|
| `src/shared/ipc/test-suite/schemas.ts` | Expand QaScriptSchema |
| `src/shared/ipc/test-suite/contract.ts` | Add projectId to LIST.SCRIPTS |
| `src/main/features/test-suite/recorder-handlers.ts` | Filter LIST.SCRIPTS by project, update local interface |
| `src/main/features/test-suite/index.ts` | Add listScriptsByProject, fix runner.run() projectId, fix exportFile steps |
| `src/main/features/qa/qa-trigger.ts` | Add projectId to runner.run() |
| `src/renderer/features/test-suite/api/queryKeys.ts` | DELETE |
| `src/renderer/features/test-suite/api/useScriptMutations.ts` | DELETE |
| `src/renderer/features/test-suite/api/useScripts.ts` | DELETE |
| `src/renderer/features/test-suite/api/useExportRun.ts` | CREATE (extracted from useScriptMutations) |
| `src/renderer/features/test-suite/api/testSuiteKeys.ts` | Add allRuns, configs keys |
| `src/renderer/features/test-suite/api/useRuns.ts` | Switch to testSuiteKeys, fix imports |
| `src/renderer/features/test-suite/api/useTestSuiteScripts.ts` | Pass projectId to IPC |
| `src/renderer/features/test-suite/api/index.ts` | Update barrel exports |
| `src/renderer/features/test-suite/components/LibraryPanel.tsx` | Wire Run + Run Selected buttons |
| `src/renderer/features/test-suite/components/ScriptSelector.tsx` | Switch from useScripts to useTestSuiteScripts(projectId) |

## Verification

1. `npx tsc --noEmit` — zero errors
2. `npx eslint <changed files>` — zero warnings
3. Kill Electron + restart: `taskkill //F //IM electron.exe 2>/dev/null; npm run dev`
4. Manual flow: record a test → save → library shows it with correct step count → Run button triggers execution
