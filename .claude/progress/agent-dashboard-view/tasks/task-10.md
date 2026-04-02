---
taskNumber: 10
taskName: Dashboard Integration + Routing + Sidebar
taskSlug: dashboard-integration
wave: 4
complexity: medium
blockedBy: task-7,task-8,task-9
agent: integration-engineer
files_create: []
files_modify:
  - src/renderer/app/routes/dashboard.ts
  - src/renderer/features/agent-dashboard/index.ts
---

## Task: Wire Agent Dashboard into routing, sidebar, and existing dashboard

### Context

Final integration task — connect the agent dashboard feature module to the app routing, sidebar navigation, and existing dashboard infrastructure.

Read:
- `ai-docs/user-interface-flow.md` — Navigation flow
- `ai-docs/FEATURES-INDEX.md` — Feature inventory
- `src/renderer/app/routes/` — existing route files for pattern reference
- `docs/features/agent-dashboard-view/plan.md` — Sidebar Integration section

### Requirements

1. **Route registration** — Add agent dashboard route in `src/renderer/app/routes/`
   - Path: `/agents` or appropriate path per existing routing convention
   - Lazy-load the AgentDashboardPage component
   - Add to route tree following TanStack Router patterns

2. **Sidebar entry** — Add "Agents" item to sidebar navigation
   - Icon: appropriate lucide-react icon (e.g., `Bot`, `Users`, `Monitor`)
   - Position: alongside existing nav items (Dashboard, Tasks, etc.)
   - Active state indicator when on agents route
   - Show agent count badge when agents are running

3. **Barrel exports** — Ensure `src/renderer/features/agent-dashboard/index.ts` exports:
   - `AgentDashboardPage` (main page component)
   - `AgentPanelCompact` (for embedding in sidebar)
   - `useAgentSessions`, `useAgentSession` (for sidebar badge)
   - `useAgentDashboardStore` (for layout control)

4. **Dashboard integration** — If existing dashboard feature has an agent section, update it to use the new agent data hooks instead of terminal-service

### Critical Notes

- Follow TanStack Router patterns from existing routes (check `src/renderer/app/routes/` for examples)
- Use `throw redirect()` pattern with the eslint-disable comment for redirects
- Sidebar modifications should use existing sidebar component patterns
- Do NOT remove terminal-related routes yet — just add the new agents route alongside

### Acceptance Criteria

1. `/agents` route renders AgentDashboardPage
2. Sidebar shows "Agents" nav item with active state
3. Navigation between routes works correctly
4. All barrel exports are correct
5. `npm run lint && npm run typecheck && npm run build` pass
6. No import cycle introduced
