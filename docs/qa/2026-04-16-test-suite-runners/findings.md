# Test Suite + Runners UX/UI QA — 2026-04-16

Branch: `feature/project-runners`
Tested against: dev build (Electron, localhost:5173)
Scope: All 7 test-suite tabs + new RunnerPanel integration

## Coverage Matrix

| Tab | Empty State | Functional | Screenshot |
|---|---|---|---|
| Recording (+ Runners) | ok | partial | 01, 02, 09 |
| Library | ok | not exercised (no tests) | 03 |
| Results | ok | not exercised | 04 |
| Screenshots | **missing** | not exercised | 05 |
| Analytics | ok | not exercised | 06 |
| Shared Steps | ok | not exercised | 07 |
| CI Export | ok (but bugs) | **broken** | 08 |

## Critical Findings (block ship)

### F1 — Runner ProfileEditDialog saves silently fail, dialog stays open
- **Where**: `src/renderer/features/runners/components/ProfileEditDialog.tsx:34-41`
- **Repro**: Click "New" runner profile → fill form → Save. Dialog does NOT close, profile does NOT appear in dropdown, no error shown.
- **Root cause**: `save.mutate(...)` has no `onError` handler. When the main-process channel is missing (e.g., `"Unknown IPC channel: runners.profile.save"`), the promise resolves with `{ success: false, error }` but `onSuccess` still fires in react-query's default mutation. Actually the issue is worse — the IPC bridge returns the error object as a resolved value, so `onSuccess` runs on `{success:false}` payloads. Need to either throw in `ipc()` on `success:false` or inspect the response.
- **Verified**: direct console call `window.api.invoke('runners.profile.save', ...)` returns `{success: false, error: "Unknown IPC channel: runners.profile.save"}` — channel not registered at runtime (requires main-process restart since Vite HMR only reloads renderer).
- **Fix**:
  1. Make `@renderer/shared/lib/ipc` throw when the response is `{success:false}` so react-query's `onError` fires.
  2. Add toast/inline error in ProfileEditDialog `onError`.
  3. Confirm main-process restart picks up runners handlers (it should — bootstrap wires them).

### F2 — CI Export Preview button silently fails
- **Where**: `src/renderer/features/test-suite/components/ExportPanel.tsx:41-53`
- **Repro**: Click "Preview YAML". Console shows `Uncaught (in promise)` — no dialog opens.
- **Root cause**: `try { ... } finally { setLoading(false) }` with NO `catch`. Any rejection from `ipc(TEST_SUITE.EXPORT['CI-PREVIEW'])` is silently swallowed into an unhandled promise.
- **Fix**: add `catch (err) { toast.error(err.message) }`.

### F3 — Same silent-failure anti-pattern in CI Commit
- **Where**: `src/renderer/features/test-suite/components/ExportPanel.tsx:55-67`
- Same bug as F2.

## Important Findings

### F4 — [FALSE POSITIVE, closed]
- Screenshots tab does render a toolbar + EmptyState ("No run selected — Select a test run from the dropdown..."). Verified via DOM inspection (`textContent` includes the empty-state copy). The a11y snapshot tool didn't surface it because the empty state's wrapper divs carry no ARIA roles.
- No code change needed. Follow-up: consider adding `role="region"` + aria-label to EmptyState wrapper for better a11y surfacing.

### F5 — CI Export path double-slash bug
- **Where**: `ExportPanel.tsx:145` and `:159`
- **Display**: `test-suite//**, src/**` and `test-suite//screenshots/`
- **Root cause**: `testDir` from `config.testDirectory` already contains a trailing `/` (stored as `"test-suite/"` in DB), then template literal appends another `/`.
- **Fix**: either strip trailing slash in presenter — `const normalizedTestDir = testDir.replace(/\/$/, '')` — or strip on write in the config service.

### F6 — DialogContent missing aria-describedby (a11y warnings)
- **Where**: every @ui Dialog currently missing description (2+ warnings in console).
- **Fix**: add `<DialogDescription>` or `aria-describedby={undefined}` to silence. Non-blocking but affects screen readers.

## Minor Findings

### F7 — Runner "Dev Server" heading styling differs from sibling panels
- RunnerPanel uses h3 with different spacing from the adjacent Recording h3 below. Visual rhythm would improve if both used the same heading pattern (consistent margin + tracking).

### F8 — "No runner selected." is terse
- Current: `No runner selected.`
- Better: `Create a runner profile (e.g. "npm run dev") to start a dev server from here.`

### F9 — Start button disabled with no explanation
- When there are 0 profiles, Start is disabled. User can't tell why without hovering (no tooltip wired).
- Fix: add Tooltip wrapping the Button + `disabled` reason.

### F10 — No scope indicator in RunnerPanel
- Panel heading says "Dev Server" but doesn't tell user which scope (project vs worktree) it's attached to. If a user switches worktree context, it's not obvious instances are per-scope.

## Not-Yet-Exercised (backend restart required)

These flows could not be tested live because main-process IPC handlers for `runners.*` channels returned "Unknown IPC channel" at runtime (dev HMR limitation — main process needs restart to pick up newly-registered handlers from this branch):

- Profile save → persist → list refetch
- Instance start → spawn → health-check → ready status
- Instance stop → supervisor.kill → stopped status
- Instance restart → kill + start cycle
- auto-restart on abnormal exit
- OUTPUT/STATUS/HEALTH event stream into console
- Stop while starting (health controller abort path)
- Rapid start of two profiles (setQueryData dedupe path)

**Recommend**: restart main process (or issue `npm run dev` full relaunch), then execute these paths. After F1/F2/F3 fixes land, repeat full tour.

## Artifacts

Screenshots in `docs/qa/2026-04-16-test-suite-runners/`:
- 01-test-suite-recording-initial.png
- 02-runner-new-profile-dialog.png
- 03-library-empty.png
- 04-results-empty.png
- 05-screenshots-empty.png
- 06-analytics-empty.png
- 07-shared-steps-empty.png
- 08-ci-export.png
- 09-recording-runner-panel.png

## Recommended Fix Batch

1. Wrap `@renderer/shared/lib/ipc` to throw on `{success:false}` responses. This is a single codebase-wide fix that silently resolves F1 + F2 + F3 and prevents recurrence. Cross-reference with silent-failure-hunter agent.
2. Add Screenshots tab empty state (F4).
3. Normalize `testDirectory` trailing slash (F5).
4. Add DialogDescription to all @ui Dialog usages (F6).
5. Polish RunnerPanel empty copy + tooltips (F7–F10).
