---
taskNumber: 5
taskName: Workspace Zustand Store
taskSlug: workspace-store
agentRole: frontend-developer
agentDefinition: null
wave: 2
blockedBy: [1]
blocks: [6, 7]
estimatedTokens: 3000
complexity: low
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/workspace-store
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 5: Workspace Zustand Store

### Context
View-only state for the workspace: which project is displayed, team lead collapse state per session, input drafts per session. No session lifecycle — that lives in WorkspaceSessionManager.
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 5.

### Files to Create
- `src/renderer/features/workspace/store.ts`

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 5 for exact code
2. Read an existing store file (e.g., `src/renderer/features/assistant/store.ts` or similar) to confirm the Zustand 5 import and `create()` usage pattern in this codebase
3. Create `src/renderer/features/workspace/store.ts` with `useWorkspaceStore`
4. Run `npm run typecheck`

### Acceptance Criteria
- [ ] `store.ts` exports `useWorkspaceStore` created with Zustand `create<WorkspaceStore>()`
- [ ] Store includes: `viewingProjectId`, `teamLeadCollapsed`, `inputDrafts`
- [ ] Store includes actions: `setViewingProject`, `toggleTeamLeadCollapsed`, `setInputDraft`, `clearInputDraft`
- [ ] `npm run typecheck` passes clean
- [ ] `npm run lint` passes clean

### Rules
- Read `ai-docs/LINTING.md` — use existing Zustand import pattern in the codebase
- Zustand stores hold UI state ONLY — no IPC calls, no session logic
- No persistence (no `persist` middleware) — this store is ephemeral
