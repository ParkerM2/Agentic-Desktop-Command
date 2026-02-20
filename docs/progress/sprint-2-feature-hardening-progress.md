# Sprint 2: Feature Hardening — Progress

## Status: COMPLETE

**Branch:** `feature/sprint-2-feature-hardening`
**Started:** 2026-02-20
**Completed:** 2026-02-20

## Summary

Implemented all 3 P0 user-reported UX fixes from Sprint 2:

1. **P0-1: Persist Auth Session (safeStorage)** — Auth session now restores on app restart via encrypted token storage + IPC restore channel
2. **P0-2: Route All GitHub Through gh CLI** — Replaced HTTP-based GitHub client with `gh` CLI subprocess calls; added connection status detection
3. **P0-3: AG-Grid Card Wrapper + Theme** — Wrapped AG-Grid in Card design system primitive; enhanced theme CSS with full CSS custom property integration

## Tasks Completed

| # | Task | Wave | Agent | Files Changed |
|---|------|------|-------|--------------|
| 1 | Auth IPC — auth.restore channel | 1 | schema-w1 | 5 |
| 2 | GitHub IPC — github.authStatus + getRepos | 1 | schema-w1b | 4 |
| 3 | AG-Grid Card wrapper + theme | 1 | comp-w1 | 4 |
| 4 | Auth session restore service + handler | 2 | svc-w2a | 4 |
| 5 | GitHub CLI client rewrite | 2 | svc-w2b | 6 |
| 6 | Auth restore renderer integration | 3 | hook-w3a | 3 |
| 7 | GitHub connection status UI | 3 | comp-w3b | 6 |

## Verification

| Check | Result |
|-------|--------|
| Lint | 0 errors (20 warnings — pre-existing) |
| Typecheck | Clean |
| Tests | 156/156 passing (+4 new auth restore tests) |
| Build | Success |
| Guardian | PASS — no structural issues |

## Files Changed (vs master)

### IPC Contracts
- `src/shared/ipc/auth/schemas.ts` — Added RestoreOutputSchema
- `src/shared/ipc/auth/contract.ts` — Added auth.restore channel
- `src/shared/ipc/auth/index.ts` — Updated exports
- `src/shared/ipc/github/schemas.ts` — Added GitHubAuthStatusSchema, GitHubRepoSchema
- `src/shared/ipc/github/contract.ts` — Added github.authStatus, github.getRepos channels
- `src/shared/ipc/github/index.ts` — Updated exports

### Main Process
- `src/main/services/hub/hub-auth-service.ts` — Added restoreSession() method
- `src/main/ipc/handlers/auth-handlers.ts` — Added auth.restore handler
- `src/main/mcp-servers/github/github-client.ts` — Replaced HTTP fetch with gh CLI subprocess
- `src/main/mcp-servers/github/index.ts` — Updated exports
- `src/main/services/github/github-service.ts` — Added getAuthStatus, getRepos; updated to gh client
- `src/main/services/notifications/github-watcher.ts` — Updated for gh client API
- `src/main/bootstrap/service-registry.ts` — Updated GitHub service creation
- `src/main/ipc/handlers/github-handlers.ts` — Added authStatus, getRepos handlers

### Renderer
- `src/renderer/features/auth/components/AuthGuard.tsx` — Session restore on mount
- `src/renderer/features/auth/hooks/useAuthEvents.ts` — Auth restore integration
- `src/renderer/features/tasks/components/grid/TaskDataGrid.tsx` — Card wrapper
- `src/renderer/features/tasks/components/grid/ag-grid-theme.css` — Enhanced theme tokens
- `src/renderer/features/github/components/GitHubConnectionStatus.tsx` — NEW: connection status UI
- `src/renderer/features/github/components/GitHubPage.tsx` — Integrated connection status
- `src/renderer/features/github/api/queryKeys.ts` — Added authStatus, repos keys
- `src/renderer/features/github/api/useGitHub.ts` — Added useGitHubAuthStatus, useGitHubRepos
- `src/renderer/features/github/index.ts` — Updated exports

### Tests
- `tests/integration/ipc-handlers/auth-handlers.test.ts` — Added auth.restore tests

### Documentation
- `ai-docs/ARCHITECTURE.md` — Updated for gh CLI and Card wrapper
- `ai-docs/DATA-FLOW.md` — Added auth restore flow
- `ai-docs/FEATURES-INDEX.md` — Updated feature inventory
- `ai-docs/user-interface-flow.md` — Updated auth + GitHub flows
