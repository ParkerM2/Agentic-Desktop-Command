---
taskNumber: 6
taskName: Workspace React Query Hooks
taskSlug: workspace-hooks
agentRole: frontend-developer
agentDefinition: null
wave: 3
blockedBy: [1, 5]
blocks: [7]
estimatedTokens: 5000
complexity: medium
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/workspace-hooks
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 6: Workspace React Query Hooks

### Context
Hooks for session data fetching, project initialization, and mutations. Subscribes to IPC events to invalidate queries on session state changes.
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 6.

### Files to Create
- `src/renderer/features/workspace/api/useWorkspace.ts`

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 6 for the hook code
2. Read an existing API hook file (e.g., `src/renderer/features/agent-dashboard/api/useAgentDashboard.ts` or similar) to find the exact IPC invoke call pattern — confirm the import path and method name (e.g., `ipc.invoke`, `window.electron.invoke`, or similar)
3. Read `src/renderer/shared/hooks/useIpcEvent.ts` (or wherever `useIpcEvent` is exported from) to confirm import path
4. Create `src/renderer/features/workspace/api/useWorkspace.ts` with hooks: `useWorkspaceSessions`, `useWorkspaceInit`, `useWorkspaceSend`, `useSpawnTeamLead`, `useStopTeamLead`
5. Adjust IPC invoke pattern to match what this codebase uses — do NOT guess

### Acceptance Criteria
- [ ] `useWorkspaceSessions(projectId)` uses useQuery + refetchInterval + invalidates on all 3 workspace session events
- [ ] `useWorkspaceInit(projectId, projectPath)` calls `workspace.initProject` in a useEffect (idempotent)
- [ ] `useWorkspaceSend()` is a useMutation for `workspace.sendMessage`
- [ ] `useSpawnTeamLead(projectId)` is a useMutation for `workspace.spawnTeamLead`
- [ ] `useStopTeamLead(projectId)` is a useMutation for `workspace.stopTeamLead`
- [ ] `npm run typecheck` passes clean
- [ ] `npm run lint` passes clean

### Rules
- Read `ai-docs/PATTERNS.md` — React Query key conventions
- NEVER access IPC directly from renderer — use the established typed invoke helper
- Confirm the actual `useIpcEvent` import path before using it
