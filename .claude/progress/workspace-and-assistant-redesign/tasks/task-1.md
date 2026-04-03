---
taskNumber: 1
taskName: IPC Workspace Domain
taskSlug: ipc-workspace-domain
agentRole: backend-developer
agentDefinition: null
wave: 1
blockedBy: []
blocks: [3, 6, 7]
estimatedTokens: 6000
complexity: medium
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/ipc-workspace-domain
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 1: IPC Workspace Domain

### Context
The workspace feature needs its own IPC domain for always-on Primary Claude + Team Lead sessions.
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 1.

### Files to Create
- `src/shared/ipc/workspace/schemas.ts` — SessionKeySchema, WorkspaceSessionSchema, SessionTypeSchema, WorkspaceSessionStatusSchema
- `src/shared/ipc/workspace/contract.ts` — workspaceInvoke (initProject, getSessions, spawnTeamLead, stopTeamLead, sendMessage) + workspaceEvents (sessionReady, sessionCrashed, sessionRestarted)
- `src/shared/ipc/workspace/index.ts` — barrel re-exporting all

### Files to Modify
- `src/shared/ipc/index.ts` — add `import { workspaceEvents, workspaceInvoke } from './workspace'`, spread both into the merged contracts, add schema re-exports

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 1 for exact code
2. Read `src/shared/ipc/agent-dashboard/schemas.ts` and `contract.ts` as pattern reference
3. Read `src/shared/ipc/common/schemas.ts` to import `SuccessResponseSchema`
4. Create the three workspace IPC files as specified in the plan
5. Add workspace to the root barrel `src/shared/ipc/index.ts`
6. Run `npm run typecheck` — must pass clean

### Acceptance Criteria
- [ ] `src/shared/ipc/workspace/schemas.ts` exports SessionKeySchema, WorkspaceSessionSchema, SessionTypeSchema, WorkspaceSessionStatusSchema and their inferred types
- [ ] `src/shared/ipc/workspace/contract.ts` exports workspaceInvoke (5 channels) and workspaceEvents (3 channels)
- [ ] `src/shared/ipc/workspace/index.ts` barrel re-exports all of the above
- [ ] `src/shared/ipc/index.ts` imports and spreads workspaceInvoke + workspaceEvents
- [ ] `npm run typecheck` passes clean
- [ ] `npm run lint` passes clean

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` and `ai-docs/LINTING.md` before writing any code
- Follow the exact same pattern as `src/shared/ipc/agent-dashboard/` — schemas separate from contract, barrel index
- Do not add business logic to schemas or contracts — Zod only
