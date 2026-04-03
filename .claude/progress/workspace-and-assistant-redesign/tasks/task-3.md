---
taskNumber: 3
taskName: Workspace IPC Handlers and Bootstrap Wiring
taskSlug: workspace-handlers-bootstrap
agentRole: backend-developer
agentDefinition: null
wave: 3
blockedBy: [1, 2]
blocks: []
estimatedTokens: 5000
complexity: medium
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/workspace-handlers-bootstrap
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 3: Workspace IPC Handlers and Bootstrap Wiring

### Context
Thin IPC handlers for the workspace domain. No business logic — one service call per handler. Wire WorkspaceSessionManager into the service registry.
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 3.

### Files to Create
- `src/main/ipc/handlers/workspace-handlers.ts` — `registerWorkspaceHandlers(router, workspace)`

### Files to Modify
- `src/main/bootstrap/service-registry.ts` — import createWorkspaceSessionManager, add to ServiceRegistryResult interface, instantiate after agentManagerService, register handlers, include in returned object

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 3 for exact code
2. Read an existing handler file (e.g., `src/main/ipc/handlers/agent-dashboard-handlers.ts`) to confirm the exact `router.handle(...)` call signature
3. Read `src/main/bootstrap/service-registry.ts` in full — find where agentManagerService is instantiated and where handlers are registered
4. Create `workspace-handlers.ts` with 5 thin handlers
5. Add workspaceSessionManager to service-registry.ts at the correct locations

### Acceptance Criteria
- [ ] `workspace-handlers.ts` exports `registerWorkspaceHandlers` with 5 handlers matching the workspaceInvoke contract
- [ ] `service-registry.ts` imports and instantiates `createWorkspaceSessionManager` after `agentManagerService`
- [ ] `service-registry.ts` calls `registerWorkspaceHandlers(router, workspaceSessionManager)`
- [ ] `ServiceRegistryResult` interface includes `workspaceSessionManager`
- [ ] `npm run typecheck` passes clean
- [ ] `npm run lint` passes clean
- [ ] `npm run build` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` before writing
- Handlers must be THIN: one service call, `Promise.resolve()` where needed, no business logic
- Do not change any existing handler — only add the workspace ones
