---
taskNumber: 1
taskName: "Route Constants + Sidebar Nav Config"
taskSlug: "routes-sidebar"
agentRole: "router-engineer"
wave: 1
blockedBy: []
blocks: [2, 3, 4]
estimatedTokens: 15000
complexity: "LOW"
status: "pending"
---

# Task #1: Route Constants + Sidebar Nav Config

## Description
Add PLANNING and GIT route segments to route constants. Update sidebar shared-nav.ts to show 7 project-scoped items (Workspace, Tasks, Terminals, Planning, Git, Tools, Visual Map). Update layout-configs.ts sidebar-09 devSubGroups for the new item count. Update project.routes.ts to add planning and git routes, remove old individual routes for roadmap/ideation/insights/changelog (add redirects from old paths).

## Acceptance Criteria
- [ ] `PROJECT_VIEWS.PLANNING` and `PROJECT_VIEWS.GIT` exist in routes.ts
- [ ] `ROUTE_PATTERNS.PROJECT_PLANNING` and `ROUTE_PATTERNS.PROJECT_GIT` exist
- [ ] Old `PROJECT_VIEWS.ROADMAP`, `IDEATION`, `INSIGHTS`, `CHANGELOG` removed from PROJECT_VIEWS
- [ ] Old ROUTE_PATTERNS kept temporarily for redirect routes
- [ ] Sidebar shared-nav.ts has 7 development items in order: Workspace, Tasks, Terminals, Planning, Git, Tools, Visual Map
- [ ] Icons: Bot, ListTodo, Terminal, Map, GitBranch, Wrench, Network
- [ ] layout-configs.ts sidebar-09 devSubGroups indices updated for 7 items
- [ ] project.routes.ts: planningRoute lazy-loads PlanningPage from @features/planning
- [ ] project.routes.ts: gitRoute lazy-loads GitPage from @features/git-overview
- [ ] Old roadmap/ideation/insights/changelog routes redirect to /planning or /git
- [ ] Individual github route removed (now part of git route)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

## Files to Modify
- `src/shared/constants/routes.ts` — Add PLANNING, GIT to PROJECT_VIEWS and ROUTE_PATTERNS
- `src/renderer/app/layouts/sidebar-layouts/shared-nav.ts` — Replace 5 items with 7 items, update icons
- `src/renderer/app/layouts/sidebar-layouts/layout-configs.ts` — Update sidebar-09 devSubGroups
- `src/renderer/app/routes/project.routes.ts` — Add planningRoute, gitRoute; redirect old routes

## Files to Read for Context
- `src/renderer/app/layouts/sidebar-layouts/AppSidebar.tsx` — How nav items are consumed
- `docs/features/sidenav-restructure/plan.md` — Full restructure plan

## Implementation Notes
- Use `lazyRouteComponent(() => import('@features/planning'), 'PlanningPage')` for planning route
- Use `lazyRouteComponent(() => import('@features/git-overview'), 'GitPage')` for git route
- Redirect old routes using `beforeLoad: ({ params }) => { throw redirect({ to: newPath, params }) }`
- The features don't exist yet (Tasks 2-4 create them) — the routes will fail to resolve until Wave 2 completes. This is expected.
- sidebar-09 currently slices dev items into Code(0-3), Plan(3-6), Track(6-9). With 7 items: Code(0-3), Plan(3-5), Track(5-7) or similar — use judgment for logical grouping.
