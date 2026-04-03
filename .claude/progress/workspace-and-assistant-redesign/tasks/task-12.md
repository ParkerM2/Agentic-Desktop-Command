---
taskNumber: 12
taskName: Final Verification Pass
taskSlug: final-verification
agentRole: backend-developer
agentDefinition: null
wave: 6
blockedBy: [8, 11]
blocks: []
estimatedTokens: 3000
complexity: low
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/final-verification
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 12: Final Verification Pass

### Context
Run all verification checks across the complete feature branch diff. Fix any remaining issues. This task does not write new features — only fixes verification failures.
Full checklist in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 12.

### What to Do
1. Run `npm run lint` — fix any violations
2. Run `npm run typecheck` — fix any type errors
3. Run `npm run build` — fix any compilation errors
4. Run smoke checks:
   - `grep -r "ContentHeader" src/renderer/` — should only appear in ContentHeader.tsx itself (no longer imported)
   - `grep -r "intent-classifier\|IntentType\|AssistantAction" src/ --include="*.ts" --include="*.tsx"` — should return no hits
   - `grep -n "workspaceInvoke\|workspaceEvents" src/shared/ipc/index.ts` — should return 2 hits
5. Fix any failures found
6. Commit a final cleanup commit if any fixes were needed

### Acceptance Criteria
- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm run build` exits 0
- [ ] `ContentHeader` is not imported anywhere in src/renderer/ (except its own file)
- [ ] No `IntentTypeSchema`, `AssistantActionSchema`, or `intent-classifier` references in src/
- [ ] `workspaceInvoke` and `workspaceEvents` appear in `src/shared/ipc/index.ts`

### Rules
- This task ONLY fixes remaining failures — do not add new features
- If a check fails, read the error carefully and fix the root cause — do not suppress with eslint-disable or @ts-ignore unless truly needed
