---
taskNumber: 8
taskName: Route Update and Sidebar Label
taskSlug: route-and-sidebar-update
agentRole: frontend-developer
agentDefinition: null
wave: 5
blockedBy: [7]
blocks: []
estimatedTokens: 2000
complexity: low
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/route-and-sidebar-update
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 8: Route Update and Sidebar Label

### Context
Swap the agents route component from AgentDashboardPage to WorkspacePage, and rename the sidebar label from "Agents" to "Workspace".
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 8.

### Files to Modify
- `src/renderer/app/routes/project.routes.ts` — agentsRoute: change import from `@features/agent-dashboard`/`AgentDashboardPage` to `@features/workspace`/`WorkspacePage`, change breadcrumbLabel to 'Workspace'
- `src/renderer/app/layouts/Sidebar.tsx` — change `{ label: 'Agents', ... }` to `{ label: 'Workspace', ... }` for the project nav item (line ~67)
- `src/renderer/app/layouts/sidebar-layouts/shared-nav.ts` — same label change (line ~55)

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 8
2. Read `src/renderer/app/routes/project.routes.ts` — find the agentsRoute definition
3. Read `src/renderer/app/layouts/Sidebar.tsx` — find the project nav item with label 'Agents'
4. Read `src/renderer/app/layouts/sidebar-layouts/shared-nav.ts` — find the same
5. Make the three targeted edits
6. Verify `@features/workspace` alias resolves — check `electron.vite.config.ts` or `tsconfig.json` for the `@features` alias

### Acceptance Criteria
- [ ] `agentsRoute` in `project.routes.ts` lazy-imports `WorkspacePage` from `@features/workspace`
- [ ] `agentsRoute.staticData.breadcrumbLabel` is `'Workspace'`
- [ ] Both `Sidebar.tsx` and `shared-nav.ts` show `'Workspace'` for the project nav item that was `'Agents'`
- [ ] `npm run typecheck` passes clean
- [ ] `npm run lint` passes clean
- [ ] `npm run build` passes

### Rules
- Do NOT change the route path (`ROUTE_PATTERNS.PROJECT_AGENTS`) — only the component and label
- Do NOT rename the import on dashboard.routes.ts (there may be a separate personal Agents entry there — leave it alone)
