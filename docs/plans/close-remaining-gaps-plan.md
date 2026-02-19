# Plan: Close Remaining Gap Analysis Items

## Summary

Investigation of all 9 remaining open gaps (G-6b, G-7, G-8, G-9, G-10, G-17, G-18, G-19, G-20) reveals they are **already resolved in the current codebase**. The gap analysis table in `ai-docs/user-interface-flow.md` is stale — it still lists these as open when the code already addresses them. The only work needed is a documentation update to mark all gaps as RESOLVED with evidence.

## Investigation Results

| Gap | Claim | Evidence | Verdict |
|-----|-------|----------|---------|
| **G-20** | Profile API keys in plaintext | `settings-encryption.ts` defines `PROFILE_SECRET_KEYS = ['apiKey', 'oauthToken']`. `settings-store.ts` encrypts all profile secrets via `safeStorage` on save, decrypts on load, and auto-migrates plaintext → encrypted. | **RESOLVED** |
| **G-6b** | Onboarding API key step disconnected | `ApiKeyStep.tsx` calls `useSettings()` + `useUpdateSettings()` mutation to save `anthropicApiKey` via `settings.update` IPC. All 5 wizard steps make real IPC calls. `OnboardingWizard` is mounted in `RootLayout.tsx`. | **RESOLVED** |
| **G-7** | Project delete confirmation not verified | `ProjectEditDialog.tsx` imports `ConfirmDialog`, renders it with `variant="destructive"`, `title="Delete Project"`, wired to `removeProject.mutate()`. | **RESOLVED** |
| **G-8** | Workspace not persisted in wizard | `StepConfigure.tsx` renders workspace `<select>`, `ProjectInitWizard.tsx` passes `workspaceId` to `addProject.mutateAsync()`, handler passes it through to service. | **RESOLVED** |
| **G-9** | Device selector unused | `DeviceSelector.tsx` is imported by `WorkspaceEditor.tsx` (Settings > Workspaces > Edit), renders device dropdown from `useDevices()`. | **RESOLVED** |
| **G-10** | CommandBar not wired | `CommandBar.tsx` imports `useSendCommand` + `useAssistantEvents` from `@features/assistant`, calls `ipc('assistant.sendCommand')`, subscribes to 4 assistant IPC events. Supports Ctrl+K, history, voice input. | **RESOLVED** |
| **G-17** | projects.initialize is skeleton | `project-service.ts` lines 96-118: looks up project, creates `.adc/` + `.adc/specs/` directories, returns success/error. Real implementation (minimal but functional). | **RESOLVED** |
| **G-18** | No description field in wizard | `StepConfigure.tsx` renders description `<textarea>`, `ProjectInitWizard.tsx` includes it in `handleConfirm()`, `StepConfirm.tsx` displays it in summary. | **RESOLVED** |
| **G-19** | Workspace not editable | `ProjectEditDialog.tsx` renders workspace `<select>` from `useWorkspaces()`, tracks changes, sends update via `projects.update` IPC. | **RESOLVED** |

## Impact Analysis

- **Only file changed:** `ai-docs/user-interface-flow.md` (gap analysis table)
- **No code changes needed** — all features are already implemented

## Task Breakdown

### Task 1: Update gap analysis table
- **Agent:** general-purpose
- **Files:** `ai-docs/user-interface-flow.md`
- **Depends on:** none
- **Acceptance criteria:**
  - [ ] All 9 gaps marked as ~~strikethrough~~ with **RESOLVED** and date (2026-02-18)
  - [ ] Each entry includes brief evidence (which file/component addresses it)
  - [ ] `npm run check:docs` passes

## Wave Plan

Wave 1 (single task): Update documentation. No parallelization needed — this is a single-file doc update.

## Testing Strategy

```bash
npm run check:docs  # Verify doc update passes the check
```

No code changes → no lint/typecheck/test/build verification needed.

## Risks & Mitigations

- **Risk:** Some gap resolutions may be partial (e.g., G-17 is minimal).
  **Mitigation:** Mark as RESOLVED with a note about scope (e.g., "creates directory scaffolding; future enhancement may add config templates").
