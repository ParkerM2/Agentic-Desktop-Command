---
taskNumber: B
taskName: Wire getFilesChanged and listQaSessions
taskSlug: adc-fix-ipc-stubs
agentRole: ipc-handler-engineer
agentDefinition: null
wave: 1
blockedBy: []
blocks: []
estimatedTokens: 6000
complexity: medium
teamLeaderName: "team-lead"
teamName: adc-fix-first
workbranch: work/adc-fix-first/adc-fix-ipc-stubs
worktreePath: /Users/parker/Desktop/Agentic-Desktop-Command
status: pending
---

## Task B: Wire getFilesChanged + listQaSessions

### Context
Two IPC handlers in agent-dashboard-handlers.ts return stub empty arrays instead of real data. Both must call real service methods.

### Files to Modify
- `src/main/ipc/handlers/agent-dashboard-handlers.ts` — replace two stubs
- `src/main/bootstrap/ipc-wiring.ts` — add gitService param if needed
- `src/main/services/qa/qa-runner.ts` (or `qa-types.ts`) — add `listSessions()` to QaRunner interface if missing

### What to Do

**B1 — getFilesChanged (line ~59 in agent-dashboard-handlers.ts)**:
- Currently returns `Promise.resolve([])`
- Replace with `gitService.getFilesChanged(branch)` call
- If `gitService` is not already a param of `registerAgentDashboardHandlers()`, add it and update the call site in `src/main/bootstrap/ipc-wiring.ts`
- Read existing git service to find the correct method name and signature

**B2 — listQaSessions stub**:
- Currently returns `Promise.resolve([])`
- Replace with `qaRunner.listSessions()` mapped through `mapQaSessionToDashboard()` (helper already in the file)
- If `listSessions(): QaSession[]` doesn't exist on QaRunner interface, add it to `src/main/services/qa/qa-types.ts` and implement it in the QaRunner class

### Files to Read First
- `src/main/ipc/handlers/agent-dashboard-handlers.ts` — current handler (find the stubs)
- `src/main/bootstrap/ipc-wiring.ts` — how handlers are registered
- `src/main/services/qa/qa-types.ts` — QaRunner interface
- `src/main/services/git/git-service.ts` (or similar) — find getFilesChanged method

### Acceptance Criteria
- [ ] `getFilesChanged` calls real git service method
- [ ] `listQaSessions` calls `qaRunner.listSessions()` and maps through `mapQaSessionToDashboard`
- [ ] Handler stays thin — no business logic
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` and `ai-docs/LINTING.md` before writing any code
- Handler pattern: thin wrappers only — one service call per handler, wrapped in `Promise.resolve()`
- Use `import type` for all interfaces
- Never modify `src/shared/ipc/**` files
