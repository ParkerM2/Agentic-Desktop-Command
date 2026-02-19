# Feature: Medium-Term UI Gaps

**Status**: COMPLETE
**Team**: medium-term-ui-gaps
**Base Branch**: master
**Feature Branch**: feature/medium-term-ui-gaps
**Design Doc**: docs/plans/2026-02-18-codebase-gap-analysis.md (Sections 1-3)
**Started**: 2026-02-18 23:30
**Last Updated**: 2026-02-18 23:30
**Updated By**: team-lead

---

## Scope

1. **Merge Workflow UI** — GitHub-quality diff viewer using `@git-diff-view/react`, conflict resolution
2. **Mount VoiceButton** — Add to CommandBar in TopBar
3. **Google Calendar OAuth Flow** — Add Connect/Disconnect buttons + IPC channels
4. **Security Polish** — Add `oauthToken` to encrypted secret keys

**Excluded**: GitHub issue creation UI (not needed), Profile API key encryption (already implemented)

---

## Agent Registry

| Agent Name | Role | Task ID | Status | QA Round | Notes |
|------------|------|---------|--------|----------|-------|
| schema-designer | Schema Designer | #1 | PENDING | 0/3 | IPC contracts |
| service-engineer | Service Engineer | #2 | PENDING | 0/3 | Backend handlers |
| merge-ui-engineer | Component Engineer | #3 | PENDING | 0/3 | Merge UI overhaul |
| ui-wiring-engineer | Component Engineer | #4 | PENDING | 0/3 | VoiceButton + OAuth UI |
| doc-guardian | Codebase Guardian | #5 | PENDING | 0/3 | Docs + security polish |

---

## Task Progress

### Task #1: IPC contracts for merge.getFileDiff + OAuth flow [PENDING]
- **Agent**: schema-designer
- **Files to Create**: `src/shared/ipc/oauth/contract.ts`, `src/shared/ipc/oauth/schemas.ts`, `src/shared/ipc/oauth/index.ts`
- **Files to Modify**: `src/shared/ipc/misc/merge.contract.ts`, `src/shared/ipc/index.ts`
- **QA Status**: NOT STARTED

### Task #2: Backend — merge getFileDiff + OAuth IPC handlers [PENDING]
- **Blocked By**: Task #1
- **Agent**: service-engineer
- **Files to Modify**: `src/main/services/merge/merge-service.ts`, `src/main/ipc/handlers/merge-handlers.ts`
- **Files to Create**: `src/main/ipc/handlers/oauth-handlers.ts`
- **Files to Modify**: `src/main/ipc/index.ts`
- **QA Status**: NOT STARTED

### Task #3: Merge UI overhaul with @git-diff-view/react [PENDING]
- **Blocked By**: Task #2
- **Agent**: merge-ui-engineer
- **NPM Install**: `@git-diff-view/react`, `@git-diff-view/core`
- **Files to Modify**: All files in `src/renderer/features/merge/components/`, `src/renderer/features/merge/api/useMerge.ts`
- **QA Status**: NOT STARTED

### Task #4: Mount VoiceButton + OAuth Connect/Disconnect UI [PENDING]
- **Blocked By**: Task #2
- **Agent**: ui-wiring-engineer
- **Files to Modify**: `src/renderer/app/layouts/CommandBar.tsx`, `src/renderer/features/settings/components/OAuthProviderSettings.tsx` (or related)
- **QA Status**: NOT STARTED

### Task #5: Documentation + security polish [PENDING]
- **Blocked By**: Task #3, Task #4
- **Agent**: doc-guardian
- **Files to Modify**: `ai-docs/ARCHITECTURE.md`, `ai-docs/DATA-FLOW.md`, `ai-docs/FEATURES-INDEX.md`, `ai-docs/user-interface-flow.md`, `src/main/services/settings/settings-encryption.ts`
- **QA Status**: NOT STARTED

---

## Dependency Graph

```
#1 IPC Contracts ──► #2 Backend Handlers ──► #3 Merge UI ──► #5 Docs
                                          ──► #4 Voice + OAuth UI ──┘
```

Tasks #3 and #4 can run in parallel (Wave 3).

---

## QA Results

(none yet)

---

## Blockers

| Blocker | Affected Task | Reported By | Status | Resolution |
|---------|---------------|-------------|--------|------------|
| None | | | | |

---

## Integration Checklist

- [ ] All tasks COMPLETE with QA PASS
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `npm run check:docs` passes
- [ ] Documentation updated
- [ ] Progress file status set to COMPLETE
- [ ] Committed with descriptive message

---

## Recovery Notes

If this feature is resumed by a new session:

1. Read this file for current state
2. Run `git status` to check uncommitted work
3. Check `~/.claude/teams/medium-term-ui-gaps/config.json` for team state
4. Use `TaskList` to get current task status
5. Resume from the first non-COMPLETE task
6. Update "Last Updated" and "Updated By" fields
