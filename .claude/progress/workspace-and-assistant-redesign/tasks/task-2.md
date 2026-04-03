---
taskNumber: 2
taskName: WorkspaceSessionManager Service
taskSlug: workspace-session-manager
agentRole: backend-developer
agentDefinition: null
wave: 2
blockedBy: [1]
blocks: [3]
estimatedTokens: 8000
complexity: high
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/workspace-session-manager
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 2: WorkspaceSessionManager Service

### Context
Always-on Primary Claude + Team Lead sessions need a lifecycle manager. Primary + TL[0] are immortal (auto-restart on crash). TL[1..N] are mortal (user-stopped, no restart).
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 2.

### Files to Create
- `src/main/services/workspace/workspace-session-manager.ts` — service factory + interface

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 2 for the full service code
2. Read `src/main/services/agent-manager/agent-manager-service.ts` to confirm the AgentManagerService interface (spawnProjectOwner, spawnTeamLead, stopSession, sendMessage, onEvent signatures)
3. Implement `createWorkspaceSessionManager(agentManager, getWindow)` exactly as specified in the plan
4. The `onEvent` callback from AgentManagerService — read the actual event shape before writing the guard (`event.type` and `event.sessionId` field names may differ from what the plan assumes)
5. Run `npm run typecheck` — must pass clean

### Acceptance Criteria
- [ ] `src/main/services/workspace/workspace-session-manager.ts` exists and exports `createWorkspaceSessionManager` and `WorkspaceSessionManager` interface
- [ ] `initProject` spawns primary + immortal TL[0], returns both sessionIds — idempotent (won't re-spawn if already live)
- [ ] Immortal sessions auto-restart 2 seconds after crash via `agentManager.onEvent`
- [ ] Mortal TL[1..N] `stopTeamLead` delegates to `agentManager.stopSession` and removes from Map
- [ ] `npm run typecheck` passes clean
- [ ] `npm run lint` passes clean

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` and `ai-docs/LINTING.md` before writing any code
- Read `src/main/services/agent-manager/agent-manager-service.ts` — do NOT guess the AgentManagerService interface
- Factory function pattern: `createWorkspaceSessionManager()` returning `WorkspaceSessionManager` interface
- Use `import type` for all interface imports
- Do NOT modify service-registry.ts in this task — that is Task 3
