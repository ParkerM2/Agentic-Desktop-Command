---
taskNumber: 7
taskName: Workspace UI Components
taskSlug: workspace-ui-components
agentRole: frontend-developer
agentDefinition: null
wave: 4
blockedBy: [5, 6]
blocks: [8]
estimatedTokens: 12000
complexity: high
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/workspace-ui-components
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 7: Workspace UI Components

### Context
The WorkspacePage replaces AgentDashboardPage. Two-column layout: Primary Claude session (left 55%) + Team Lead list (right 45%). All components use @ui design system primitives.
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 7.

### Files to Create
- `src/renderer/features/workspace/components/PrimarySessionPanel.tsx`
- `src/renderer/features/workspace/components/TeamLeadPanel.tsx`
- `src/renderer/features/workspace/components/TeamLeadPanelList.tsx`
- `src/renderer/features/workspace/components/WorkspacePage.tsx`
- `src/renderer/features/workspace/index.ts` — barrel exporting WorkspacePage

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 7 for all component code
2. Read `src/renderer/features/agent-dashboard/index.ts` to find the exported hook for streaming messages. Look for `useAgentStream` or equivalent — confirm the exact export name and import path
3. Read the hook's return type to understand the `events` array shape — adjust rendering in PrimarySessionPanel and TeamLeadPanel to match actual event types
4. Read `src/renderer/features/projects/index.ts` (or hooks) to confirm `useProjects` hook and `project.path` field name
5. Read `src/renderer/shared/stores/index.ts` to find how `useLayoutStore` exposes `activeProjectId`
6. Create all 5 files as specified — use `@ui/button`, `@ui/input` primitives, no raw `<button>` or `<input>`
7. Run `npm run lint && npm run typecheck`

### Acceptance Criteria
- [ ] `WorkspacePage.tsx` calls `useWorkspaceInit` + `useWorkspaceSessions` + renders two-column layout
- [ ] `PrimarySessionPanel.tsx` renders message stream + input, status indicator dot
- [ ] `TeamLeadPanel.tsx` renders collapsible card with stream + input + stop button for mortals
- [ ] `TeamLeadPanelList.tsx` renders sorted TL cards + "Spawn Team Lead" button at bottom
- [ ] `index.ts` exports `WorkspacePage`
- [ ] No raw `<button>`, `<input>`, or `<label>` — all from `@ui`
- [ ] `npm run lint` passes clean
- [ ] `npm run typecheck` passes clean

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` — feature module structure
- Read `ai-docs/PATTERNS.md` — component conventions
- ALL UI elements must use design system primitives from `@ui`
- Do NOT import from agent-dashboard internals — only from its public index barrel
- If `useAgentStream` does not exist in agent-dashboard index, find the correct streaming hook name before writing components
