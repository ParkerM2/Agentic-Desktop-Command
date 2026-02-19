# Feature: P5 Polish — Final Polish Pass

**Status**: COMPLETE
**Team**: p5-polish
**Base Branch**: master
**Feature Branch**: feature/p5-polish
**Design Doc**: docs/plans/2026-02-14-p5-polish.md
**Started**: 2026-02-14
**Last Updated**: 2026-02-14
**Updated By**: team-lead (session 2 — resumed from context crash)

---

## Scope

7 audit items (P5 #31-37): Hub indicator, configurable hotkeys, app startup, DB migrations, auto-updater, Withings cleanup, background-manager cleanup.

---

## Agent Registry

| Agent Name | Role | Task IDs | Status | Notes |
|------------|------|----------|--------|-------|
| cleanup-eng | Cleanup Engineer | T1, T2 | COMPLETE | Wave 1: Withings + BG manager removed |
| schema-eng | Schema Designer | T3 | COMPLETE | Wave 2: Types + IPC contract done |
| migration-eng | Database Engineer | T4 | COMPLETE | Wave 1: Migration runner + v001 created |
| services-eng | Service Engineer | T5, T6, T7, T8 | COMPLETE | Wave 3: All services wired |
| ui-eng | Component Engineer | T9, T10, T11 | COMPLETE | Wave 3: All UI components done |
| doc-eng | Documentation | T12 | COMPLETE | Wave 4: Docs updated by team-lead |

---

## Task Progress

### T1: Remove Withings dead code [COMPLETE]
- **Agent**: cleanup-eng
- **Item**: P5 #36
- **Files deleted**: `src/main/auth/providers/withings.ts`
- **Files modified**: `src/main/index.ts`, `OAuthProviderSettings.tsx`, `fitness.ts`, `fitness-service.ts`, `ipc-contract.ts`
- **Verified**: tsc --noEmit passes

### T2: Remove background-manager dead code [COMPLETE]
- **Agent**: cleanup-eng
- **Item**: P5 #37
- **Files deleted**: `background-manager.ts`, `scheduler.ts`
- **Verified**: No remaining references in codebase

### T3: Add settings types + IPC contract channels [COMPLETE]
- **Agent**: schema-eng
- **Item**: P5 #31-33, #35
- **Files modified**: `src/shared/types/settings.ts`, `src/shared/ipc-contract.ts`
- **Changes**: Added hotkeys, openAtLogin, minimizeToTray, startMinimized, keepRunning to AppSettings + AppSettingsSchema; Added hotkeys.get/update/reset, app.setOpenAtLogin/getOpenAtLogin, app.checkForUpdates/downloadUpdate/quitAndInstall/getUpdateStatus channels
- **Verified**: tsc --noEmit passes

### T4: Hub database migration system [COMPLETE]
- **Agent**: migration-eng
- **Item**: P5 #34
- **Files created**: `hub/src/db/migration-runner.ts`, `hub/src/db/migrations/001_initial_schema.sql`
- **Files modified**: `hub/src/db/database.ts` (replaced raw schema.sql exec with runMigrations())
- **Verified**: schema_version table, transactional migration runner, numeric prefix ordering

### T5: Hotkey persistence + re-registration [COMPLETE]
- **Agent**: services-eng
- **Item**: P5 #32
- **Files created**: `src/main/ipc/handlers/hotkey-handlers.ts`
- **Files modified**: `src/main/tray/hotkey-manager.ts` (added registerFromConfig, getCallbackForAction, changed deps to use getMainWindow)

### T6: App startup + background settings wiring [COMPLETE]
- **Agent**: services-eng
- **Item**: P5 #33
- **Files modified**: `src/main/ipc/handlers/app-handlers.ts` (added setOpenAtLogin, getOpenAtLogin handlers)

### T7: Auto-updater service [COMPLETE]
- **Agent**: services-eng
- **Item**: P5 #35
- **Files created**: `src/main/services/app/app-update-service.ts`, `src/main/ipc/handlers/app-update-handlers.ts`
- **Note**: electron-updater loaded via try/catch require() for graceful fallback

### T8: Main process wiring (index.ts + ipc/index.ts) [COMPLETE]
- **Agent**: services-eng
- **Files modified**: `src/main/index.ts` (hotkey setup, startMinimized, minimizeToTray, appUpdateService), `src/main/ipc/index.ts` (wired hotkeyHandlers + appUpdateHandlers), `package.json` (added electron-updater)

### T9: Hub connection indicator component [COMPLETE]
- **Agent**: ui-eng
- **Item**: P5 #31
- **Files created**: `src/renderer/shared/components/HubConnectionIndicator.tsx`
- **Files modified**: `src/renderer/app/layouts/Sidebar.tsx` (added indicator to footer)

### T10: Auto-updater notification component [COMPLETE]
- **Agent**: ui-eng
- **Item**: P5 #35
- **Files created**: `src/renderer/shared/components/AppUpdateNotification.tsx`
- **Files modified**: `src/renderer/app/layouts/RootLayout.tsx` (added component)

### T11: Settings page assembly [COMPLETE]
- **Agent**: ui-eng
- **Item**: P5 #32, #33
- **Files modified**: `SettingsPage.tsx` (added BackgroundSettings + HotkeySettings sections), `HotkeySettings.tsx` (IPC-backed load/save + reset), `BackgroundSettings.tsx` (launch at startup toggle + settings hydration)

### T12: Update documentation [COMPLETE]
- **Agent**: team-lead (handled directly)
- **Item**: All
- **Files modified**: `ai-docs/FEATURES-INDEX.md` (updated services table, handler table, removed Withings/background references, added app-update + hotkey entries)

---

## Dependency Graph

```
Wave 1: T1, T2 (cleanup, no deps)
Wave 2: T3 (schema), T4 (migrations) — T3 unblocked after T1
Wave 3: T5-T8 (services), T9-T11 (UI) — depend on T3
Wave 4: T12 (docs) — depends on all
```

---

## Blockers

| Blocker | Affected Task | Status | Resolution |
|---------|---------------|--------|------------|
| None | | | |

---

## Integration Checklist

- [x] All tasks COMPLETE with QA PASS
- [x] `npm run lint` passes (0 errors, 0 warnings on P5 files)
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` passes (main: 361kB, preload: 0.42kB, renderer JS: 2218kB, CSS: 77kB)
- [x] Documentation updated (FEATURES-INDEX.md)
- [x] Progress file status set to COMPLETE

---

## Recovery Notes

If resuming from crash:
1. Read this file for current state
2. Check TaskList for team task status
3. Resume from the first non-COMPLETE task
4. Update "Last Updated" and "Updated By" fields
