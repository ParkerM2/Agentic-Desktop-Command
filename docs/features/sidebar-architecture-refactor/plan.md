# Sidebar/Navigation Architecture Refactor

> Tracker Key: `sidebar-architecture-refactor` | Status: **DRAFT** | Priority: **P0** | Created: 2026-02-26

---

## Problem

The 16 `SidebarLayoutXX.tsx` files contain ~2,491 lines with ~95% duplicated boilerplate. Adding a nav item, fixing a bug, or changing the header requires touching all 16 files. No shared hooks or layout primitives exist.

### Specific Issues

1. **URL-to-store sync** — Same 6-line regex block copy-pasted 16 times
2. **Active state detection** — `isPersonalActive`/`isDevActive` helpers duplicated in every file
3. **Navigation handlers** — `handlePersonalNav`/`handleDevNav` identical across layouts
4. **Footer** — UserMenu + HubConnectionIndicator + Settings button repeated in all layouts
5. **Header** — Inconsistent styling (`text-lg font-bold` vs `text-sm font-semibold` vs `text-xl font-bold`)
6. **No error boundary** in `LayoutWrapper` — if a layout throws, app crashes
7. **No responsive behavior** — all layouts desktop-only, no breakpoint handling
8. **Preview SVGs brittle** — manually maintained config objects can go stale

## Goals

- Reduce each layout file from ~180 lines to ~30-40 lines of layout-specific JSX
- Centralize all shared navigation logic into reusable hooks
- Create shared layout primitives for footer, header, and collapsible groups
- Add error boundary to `LayoutWrapper`
- Normalize header styling across all layouts
- No user-facing behavior changes (pure refactor)

## Approach

### Phase 1: Extract Shared Hooks

Create these hooks in `src/renderer/shared/hooks/`:

| Hook | Replaces |
|------|----------|
| `useUrlProjectSync()` | 6-line URL regex block in every layout |
| `useSidebarNavigation()` | `handlePersonalNav`, `handleDevNav`, `isPersonalActive`, `isDevActive` |
| `useActiveRoute()` | Route matching logic scattered across layouts |

### Phase 2: Create Shared Layout Primitives

Create these in `src/renderer/shared/components/layout/`:

| Component | Replaces |
|-----------|----------|
| `SidebarHeaderTemplate` | Header section with consistent styling + logo |
| `SidebarFooterTemplate` | UserMenu + HubConnectionIndicator + Settings |
| `SidebarNavGroup` | Repeating SidebarGroup + SidebarMenu + SidebarMenuItem pattern |
| `CollapsibleNavGroup` | Collapsible wrapper used by layouts 02, 05, 09, 11 |

### Phase 3: Refactor Layout Files

Rewrite each `SidebarLayoutXX.tsx` to use the shared hooks and primitives. Each file should only contain layout-specific structure (e.g., collapsible vs flat, dual sidebar, sticky header).

### Phase 4: Add Safety & Polish

- Add `ErrorBoundary` in `LayoutWrapper` around lazy-loaded layouts
- Add fallback layout if selected layout fails to load
- Normalize any remaining styling inconsistencies
- Validate all 16 layouts render correctly post-refactor

## Files Touched

- `src/renderer/features/sidebar-layouts/SidebarLayout01-16.tsx` (all 16)
- `src/renderer/features/sidebar-layouts/shared-nav.ts` (may reorganize)
- `src/renderer/shared/hooks/` (3 new hooks)
- `src/renderer/shared/components/layout/` (4 new primitives)
- `src/renderer/app/LayoutWrapper.tsx` (add error boundary)

## Verification

- All 16 layouts render identically to pre-refactor (visual regression)
- `npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`
- No new ESLint violations
- Layout switching works in Settings > Display
- Sidebar collapse/expand works in all layouts
- Navigation works for all personal + development items
- Project tab bar still works
- Breadcrumbs still render correctly

## Estimated Effort

~3 days with parallel agents (4 phases, phases 1-2 can parallelize)
