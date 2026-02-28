# Productivity Hub Restructure

> Tracker Key: `productivity-hub-restructure` | Status: **DRAFT** | Priority: **P1** | Created: 2026-02-26

---

## Problem

Five features (Notes, Planner, Briefing, Alerts, Communications) are crammed into a single tabbed view under the "Productivity" route. The tab layout is cramped, features fight for space, and users can't keep multiple productivity views open simultaneously.

## Goals

- Break productivity features into proper sub-routes or a flexible layout
- Each feature gets adequate screen real estate
- Users can navigate directly to any productivity feature via sidebar or command palette
- Maintain the "Productivity" grouping for organization but not as a tab container

## Options

### Option A: Sub-routes (Recommended)

Replace the tab view with sub-routes:
- `/productivity` — Overview/dashboard with widget cards for each feature
- `/productivity/planner` — Full planner view
- `/productivity/notes` — Full notes view
- `/productivity/briefing` — Full briefing view
- `/productivity/alerts` — Full alerts view
- `/productivity/communications` — Full communications view

Sidebar shows "Productivity" as a collapsible group with each feature as a child item.

### Option B: Resizable Grid Layout

Keep single page but use `react-resizable-panels` to let users arrange features in a customizable grid. More complex but allows multi-feature views.

## Approach (Option A)

1. Create route group for `/productivity/*` with sub-routes
2. Create `ProductivityDashboard.tsx` overview page with summary cards
3. Move each tab content into its own route component
4. Update `shared-nav.ts` to show Productivity as expandable group
5. Update breadcrumbs to show `Productivity > Planner` etc.
6. Remove the tab container component

## Files Touched

- `src/renderer/app/routes/` — New productivity route group
- `src/renderer/features/planner/` — Standalone route wrapper
- `src/renderer/features/notes/` — Standalone route wrapper
- `src/renderer/features/briefing/` — Standalone route wrapper
- `src/renderer/features/alerts/` — Standalone route wrapper
- `src/renderer/features/communications/` — Standalone route wrapper
- `src/renderer/features/sidebar-layouts/shared-nav.ts` — Expandable productivity group

## Estimated Effort

~2 days
