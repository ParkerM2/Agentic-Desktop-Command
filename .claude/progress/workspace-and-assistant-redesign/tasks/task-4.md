---
taskNumber: 4
taskName: Chrome Cleanup
taskSlug: chrome-cleanup
agentRole: frontend-developer
agentDefinition: null
wave: 1
blockedBy: []
blocks: []
estimatedTokens: 3000
complexity: low
teamLeaderName: "team-lead"
teamName: workspace-and-assistant-redesign
workbranch: work/workspace-and-assistant-redesign/chrome-cleanup
worktreePath: C:/Users/Parke/Desktop/Claude-UI
status: pending
---

## Task 4: Chrome Cleanup — Remove ContentHeader, Add SidebarTrigger to TopBar

### Context
The app currently stacks two 40px horizontal bars before content: ContentHeader (SidebarTrigger + breadcrumbs) + TopBar (project tabs). Remove ContentHeader entirely; move SidebarTrigger into TopBar as the leftmost slot.
Full implementation details in `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` — Task 4.

### Files to Modify
- `src/renderer/app/layouts/LayoutWrapper.tsx` — remove `import { ContentHeader }` and the `<ContentHeader />` JSX node
- `src/renderer/app/layouts/TopBar.tsx` — add `SidebarTrigger` + separator as leftmost elements before the project tabs

### What to Do
1. Read `docs/superpowers/plans/2026-04-02-workspace-and-assistant-redesign.md` Task 4 for exact before/after code
2. Read `src/renderer/app/layouts/LayoutWrapper.tsx` in full — note the exact import and JSX location of ContentHeader
3. Read `src/renderer/app/layouts/TopBar.tsx` in full
4. Read `src/renderer/app/layouts/ContentHeader.tsx` to confirm the SidebarTrigger import path (`@ui/sidebar`)
5. Edit LayoutWrapper.tsx — delete the ContentHeader import and the `<ContentHeader />` line
6. Edit TopBar.tsx — import `SidebarTrigger` from `@ui/sidebar`, add it plus a separator div as the first children in the flex container
7. Run `npm run lint && npm run typecheck`

### Acceptance Criteria
- [ ] `LayoutWrapper.tsx` no longer imports or renders `ContentHeader`
- [ ] `TopBar.tsx` imports `SidebarTrigger` from `@ui/sidebar`
- [ ] `TopBar.tsx` renders `<SidebarTrigger className="-ml-1 mr-1 shrink-0" />` as the first child
- [ ] A visual separator `<div className="bg-border mr-1 h-4 w-px shrink-0" />` appears between the trigger and tabs
- [ ] `npm run lint` passes clean
- [ ] `npm run typecheck` passes clean

### Rules
- Read `ai-docs/LINTING.md` before editing — SidebarTrigger must satisfy jsx-a11y if it lacks an accessible label (add aria-label if lint demands it)
- Do NOT delete `ContentHeader.tsx` — just stop importing it
- Do NOT change any other layout files
