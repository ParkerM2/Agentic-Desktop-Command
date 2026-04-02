---
taskNumber: A
taskName: Fix Route Wiring
taskSlug: adc-fix-route-wiring
agentRole: frontend-developer
agentDefinition: null
wave: 1
blockedBy: []
blocks: []
estimatedTokens: 4000
complexity: low
teamLeaderName: "team-lead"
teamName: adc-fix-first
workbranch: work/adc-fix-first/adc-fix-route-wiring
worktreePath: /Users/parker/Desktop/Agentic-Desktop-Command
status: pending
---

## Task A: Fix Route Wiring

### Context
The agent-dashboard-view feature shipped but is completely unreachable because route files import from the old `@features/agents` module instead of `@features/agent-dashboard`.

### Files to Modify
- `src/renderer/app/routes/dashboard.routes.ts` — line 44 (imports from `@features/agents`)
- `src/renderer/app/routes/project.routes.ts` — line 66 (imports from `@features/agents`)

### What to Do
1. Read both route files to understand the current import and usage
2. Read `src/renderer/features/agent-dashboard/index.ts` to verify the exported name (`AgentDashboardPage`)
3. In both route files, change the import from `@features/agents` to `@features/agent-dashboard` and update the imported name to `AgentDashboardPage`
4. Verify no other references to `@features/agents` remain in these files

### Acceptance Criteria
- [ ] Both route files import `AgentDashboardPage` from `@features/agent-dashboard`
- [ ] No `@features/agents` import remains in dashboard.routes.ts or project.routes.ts
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` and `ai-docs/LINTING.md` before writing any code
- Follow existing patterns in the route files
- Do not add any new routes or features — only fix the import
