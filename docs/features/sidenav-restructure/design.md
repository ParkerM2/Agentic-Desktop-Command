# Feature Design: Sidenav Restructure

**Author**: /new-plan
**Created**: 2026-04-06
**Status**: READY FOR IMPLEMENTATION
**Workflow Mode**: standard
**Priority**: P1

---

## 1. Overview

Reorganize project-scoped navigation from a catch-all "Tools" bucket into logical groupings. The current "Tools" nav item houses GitHub, Ideation, Roadmap, Changelog, and Insights — unrelated features grouped by elimination. This restructure splits them into three purposeful nav items: **Planning** (Roadmap + Ideation + Insights), **Git** (GitHub + Changelog summary in header), and **Tools** (repurposed as a Claude Config suite placeholder for future skill/command/plugin management).

The existing `ToolsPage` tabbed pattern already proves the approach — it wraps existing feature pages as tabs. This restructure creates two new tabbed wrappers (PlanningPage, GitPage), updates route constants, and modifies the sidebar config. No existing feature slices are modified internally.

## 2. Requirements

### Functional Requirements
- "Planning" nav item shows Roadmap, Ideation, and Insights as tabs
- "Git" nav item shows GitHub as primary view with Changelog summary in the PageHeader
- "Tools" nav item repurposed as placeholder for future Claude Config suite
- Sidebar nav order: Workspace, Tasks, Terminals, Planning, Git, Tools, Visual Map
- All existing page functionality preserved — zero changes to feature internals
- Existing direct routes (e.g., `/projects/$projectId/github`) should redirect to new locations

### Non-Functional Requirements
- Route lazy loading maintained (lazyRouteComponent pattern)
- PageHeader compound component pattern for all new pages
- Zustand stores for active tab state (same pattern as existing ToolsPage)

### Out of Scope
- Claude Config suite implementation (Phase 3-4 of the larger plan — separate feature)
- Chat slash command autocomplete (depends on Tools Config)
- MarkdownFileEditor component

## 3. Architecture

### Selected Approach
Reuse the existing `ToolsPage` tabbed pattern. Create `PlanningPage` and `GitPage` as thin wrapper components that embed existing feature pages via tabs. Update route constants and sidebar nav config. The compositional `AppSidebar` + `shared-nav.ts` config means sidebar changes are a single-file data update.

### Route Changes

| Old Route | New Route | Component |
|-----------|-----------|-----------|
| `/projects/$projectId/roadmap` | `/projects/$projectId/planning` | PlanningPage (tab: roadmap) |
| `/projects/$projectId/ideation` | `/projects/$projectId/planning` | PlanningPage (tab: ideation) |
| `/projects/$projectId/insights` | `/projects/$projectId/planning` | PlanningPage (tab: insights) |
| `/projects/$projectId/github` | `/projects/$projectId/git` | GitPage (tab: github) |
| `/projects/$projectId/changelog` | `/projects/$projectId/git` | GitPage (changelog in header) |
| `/projects/$projectId/tools` | `/projects/$projectId/tools` | ToolsConfigPlaceholder |

### UI Flow
- **PlanningPage**: PageHeader with tabs (Roadmap, Ideation, Insights). Each tab renders the existing feature page component. Zustand store for active tab.
- **GitPage**: PageHeader with Changelog summary component (latest entry, expand/copy/update buttons). Main content is GitHubPage. No tabs needed — Changelog is a header element, GitHub is the body.
- **ToolsConfigPlaceholder**: Simple empty state page with "Coming Soon" and description of what will be here (Skills, Commands, Agents, Plugins, Config management).

## 4. Task Breakdown

### Task #1: Route Constants + Sidebar Nav Config

**Agent**: router-engineer
**Wave**: 1
**Blocked by**: none
**Blocks**: [2, 3, 4]
**Estimated complexity**: LOW
**Context budget**: ~12,000 tokens (files: 4)

**Description**:
Add `PLANNING` and `GIT` route segments to route constants. Update sidebar `shared-nav.ts` to replace the current 5 dev items with 7 items (Workspace, Tasks, Terminals, Planning, Git, Tools, Visual Map) using correct icons. Update `layout-configs.ts` sidebar-09 devSubGroups indices since the item count changes from 5 to 7. Update routes in `project.routes.ts` to add planning and git routes, remove individual roadmap/ideation/insights/changelog routes (replace with redirects or remove).

**Files to Modify**:
- `src/shared/constants/routes.ts` — Add PLANNING, GIT to PROJECT_VIEWS and ROUTE_PATTERNS. Remove ROADMAP, IDEATION, INSIGHTS, CHANGELOG from PROJECT_VIEWS (keep in ROUTE_PATTERNS for redirects).
- `src/renderer/app/layouts/sidebar-layouts/shared-nav.ts` — Update developmentItems: replace Tools(BarChart3) with Planning(Map), Git(GitBranch), Tools(Wrench). Update imports.
- `src/renderer/app/layouts/sidebar-layouts/layout-configs.ts` — Update sidebar-09 devSubGroups indices for 7 items instead of 5.
- `src/renderer/app/routes/project.routes.ts` — Add planningRoute and gitRoute. Remove individual roadmap/ideation/changelog/insights routes. Add redirect routes from old paths to new.

**Files to Read for Context**:
- `src/renderer/app/layouts/sidebar-layouts/AppSidebar.tsx` — Understand how nav items are consumed
- `docs/features/sidenav-restructure/plan.md` — Full restructure plan

**Acceptance Criteria**:
- [ ] `PROJECT_VIEWS.PLANNING` and `PROJECT_VIEWS.GIT` exist
- [ ] `ROUTE_PATTERNS.PROJECT_PLANNING` and `ROUTE_PATTERNS.PROJECT_GIT` exist
- [ ] Sidebar shows 7 project-scoped items in correct order with correct icons
- [ ] Old routes (`/projects/$projectId/roadmap`, etc.) redirect to new locations
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

### Task #2: PlanningPage Feature Module

**Agent**: component-engineer
**Wave**: 2
**Blocked by**: [1]
**Blocks**: []
**Estimated complexity**: LOW
**Context budget**: ~12,000 tokens (files: 4)

**Description**:
Create a new `planning` feature module with a tabbed page wrapping Roadmap, Ideation, and Insights. Follow the exact same pattern as the existing `ToolsPage` (which also wraps existing features as tabs using PageHeader compound component). The existing `ToolsPage` is the reference implementation — copy its structure.

**Files to Create**:
- `src/renderer/features/planning/index.ts` — Barrel export for PlanningPage
- `src/renderer/features/planning/components/PlanningPage.tsx` — Tabbed wrapper using PageHeader.Tabs, renders RoadmapPage, IdeationPage, InsightsPage as tab content
- `src/renderer/features/planning/store.ts` — Zustand store for activeTab (type: 'roadmap' | 'ideation' | 'insights')

**Files to Read for Context**:
- `src/renderer/features/tools/components/ToolsPage.tsx` — Reference implementation to copy pattern from
- `src/renderer/features/tools/store.ts` — Reference store pattern
- `src/renderer/features/tools/index.ts` — Reference barrel pattern

**Acceptance Criteria**:
- [ ] PlanningPage renders with PageHeader, title "Planning", description
- [ ] Three tabs: Roadmap (Map icon), Ideation (Lightbulb icon), Insights (BarChart3 icon)
- [ ] Each tab renders the existing feature page component unchanged
- [ ] Active tab persisted via Zustand store
- [ ] Uses `@ui` primitives only (PageLayout, PageHeader, PageContent)
- [ ] `npm run typecheck` and `npm run lint` pass

### Task #3: GitPage Feature Module

**Agent**: component-engineer
**Wave**: 2
**Blocked by**: [1]
**Blocks**: []
**Estimated complexity**: MEDIUM
**Context budget**: ~14,000 tokens (files: 6)

**Description**:
Create a `git-overview` feature module. Unlike PlanningPage (which is tabs), GitPage has a single main view (GitHubPage) with a Changelog summary component embedded in the PageHeader. The ChangelogSummary shows the most recent entry inline, with buttons to expand (full popup via Dialog), copy full changelog to clipboard, and add a new entry. The main content area renders GitHubPage directly.

**Files to Create**:
- `src/renderer/features/git-overview/index.ts` — Barrel export for GitPage
- `src/renderer/features/git-overview/components/GitPage.tsx` — PageHeader with ChangelogSummary in header actions area, GitHubPage as main content
- `src/renderer/features/git-overview/components/ChangelogSummary.tsx` — Compact latest-entry display with expand/copy/update actions. Uses existing `useChangelog` query hook from `@features/changelog`. Shows latest entry text truncated, with: Expand button (opens Dialog with full ChangelogPage), Copy button (copies all entries to clipboard), Update button (opens inline form or small dialog to add entry).

**Files to Read for Context**:
- `src/renderer/features/changelog/index.ts` — What's exported (ChangelogPage, hooks)
- `src/renderer/features/changelog/api/useChangelog.ts` — Query hook for changelog data
- `src/renderer/features/github/components/GitHubPage.tsx` — What GitHubPage renders
- `src/renderer/features/tools/components/ToolsPage.tsx` — PageHeader pattern reference
- `src/renderer/shared/components/ui/dialog.tsx` — Dialog primitive for expand popup

**Acceptance Criteria**:
- [ ] GitPage renders with PageHeader, title "Git", description
- [ ] ChangelogSummary in PageHeader.Actions area shows latest changelog entry
- [ ] Expand button opens Dialog with full changelog
- [ ] Copy button copies changelog to clipboard
- [ ] Main content area renders GitHubPage unchanged
- [ ] Uses `@ui` primitives only (PageLayout, PageHeader, PageContent, Dialog, Button)
- [ ] `npm run typecheck` and `npm run lint` pass

### Task #4: ToolsConfigPlaceholder + Cleanup

**Agent**: component-engineer
**Wave**: 2
**Blocked by**: [1]
**Blocks**: []
**Estimated complexity**: LOW
**Context budget**: ~11,000 tokens (files: 3)

**Description**:
Replace the current `ToolsPage` (which renders Roadmap/Ideation/Insights/Changelog/GitHub as tabs) with a placeholder page for the future Claude Config suite. Simple empty state with icon, title, description of what's coming (Skills, Commands, Agents, Plugins management). The old ToolsPage content has been moved to PlanningPage and GitPage by tasks 2 and 3.

**Files to Modify**:
- `src/renderer/features/tools/components/ToolsPage.tsx` — Replace entire content with placeholder using EmptyState or similar pattern. Remove imports of RoadmapPage, IdeationPage, etc.
- `src/renderer/features/tools/store.ts` — Simplify or keep for future use. Remove old tab types that reference roadmap/ideation/etc.
- `src/renderer/features/tools/index.ts` — Keep barrel, ensure ToolsPage is still exported

**Files to Read for Context**:
- `src/renderer/shared/components/ui/empty-state.tsx` — EmptyState primitive
- `src/renderer/features/tools/components/ToolsPage.tsx` — Current implementation to replace

**Acceptance Criteria**:
- [ ] ToolsPage renders a clean placeholder with Wrench icon, "Tools" title
- [ ] Description mentions upcoming: Skills, Commands, Agents, Plugins, Config
- [ ] No longer imports or renders Roadmap/Ideation/Insights/Changelog/GitHub
- [ ] Store cleaned up (no stale tab types)
- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] `npm run build` passes

## 5. Wave Plan

### Wave 1: Foundation (no blockers)
- Task #1: Route Constants + Sidebar Nav Config — router-engineer

### Wave 2: Feature Modules (blocked by Wave 1)
- Task #2: PlanningPage Feature Module — component-engineer
- Task #3: GitPage Feature Module — component-engineer
- Task #4: ToolsConfigPlaceholder + Cleanup — component-engineer

(Tasks 2, 3, 4 touch different feature directories — run in parallel)

### Dependency Graph

```
#1 Routes + Sidebar ──┬──> #2 PlanningPage
                      ├──> #3 GitPage
                      └──> #4 ToolsConfigPlaceholder
```

### Parallel Opportunities
- Wave 2: All three tasks are fully independent (different feature dirs, no shared writable files)

## 6. File Ownership Matrix

```
src/shared/constants/routes.ts                              → Task #1
src/renderer/app/layouts/sidebar-layouts/shared-nav.ts      → Task #1
src/renderer/app/layouts/sidebar-layouts/layout-configs.ts  → Task #1
src/renderer/app/routes/project.routes.ts                   → Task #1
src/renderer/features/planning/*                            → Task #2
src/renderer/features/git-overview/*                        → Task #3
src/renderer/features/tools/*                               → Task #4
```

Conflicts: NONE

## 7. Context Budget

```
Task #1: 8,000 + 4 × 1,000 + 3,000 = ~15,000 tokens
Task #2: 8,000 + 4 × 1,000 + 3,000 = ~15,000 tokens (3 create + read refs)
Task #3: 8,000 + 6 × 1,000 + 3,000 = ~17,000 tokens (3 create + read refs)
Task #4: 8,000 + 3 × 1,000 + 3,000 = ~14,000 tokens
```

All under threshold.

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Old route bookmarks break | Medium | Low | Redirect routes from old paths to new |
| Changelog hook not exported from feature | Low | Low | Check barrel before starting Task #3 |
| Layout-09 devSubGroups break with 7 items | Medium | Medium | Task #1 explicitly updates indices |
| ToolsPage removal leaves unused deps | Low | Low | Task #4 cleans up imports |

## 9. QA Strategy

### Per-Task QA Sections
- Task #1: route constants match, sidebar renders correct items, old routes redirect
- Task #2: tabs render correct content, store persists, PageHeader pattern correct
- Task #3: ChangelogSummary shows data, expand/copy/update work, GitHubPage renders
- Task #4: placeholder renders, no stale imports, build passes

### Guardian Focus Areas
- No orphaned route constants (all old paths either redirect or removed)
- No broken imports from deleted routes
- Sidebar item count matches route count
- All features still accessible via navigation

## 10. Implementation Notes

- The existing `ToolsPage` at `src/renderer/features/tools/components/ToolsPage.tsx` is the exact pattern to follow for PlanningPage
- `PageHeader.Tabs` / `PageHeader.TabList` / `PageHeader.Tab` / `PageHeader.TabContent` are the tab primitives
- Icons: use `Map` for Planning, `GitBranch` for Git, `Wrench` for Tools (from lucide-react)
- The `ChangelogSummary` component in Task #3 needs to use the existing changelog query hooks — check `@features/changelog` barrel for what's exported
- `shared-nav.ts` `developmentItems` array order directly controls sidebar item order

## Task Handoff Files

Per-agent task files generated at `docs/features/sidenav-restructure/tasks/`:
- task-1.md — Route Constants + Sidebar Nav Config
- task-2.md — PlanningPage Feature Module
- task-3.md — GitPage Feature Module
- task-4.md — ToolsConfigPlaceholder + Cleanup

To execute this plan, run: `/agent-team`
