# UI Layout Refactor

---
status: DRAFT
feature: ui-layout-refactor
created: 2026-02-20
---

## Overview

Four coordinated UI changes: sidebar reorder, productivity tab consolidation, settings tab bar, and AG-Grid theme fix. All are renderer-only — no IPC or main process changes.

## Requirements

1. **Sidebar reorder** — Development section first, Personal second. "+Add Project" is the first item inside the Development accordion (not between sections).
2. **Productivity consolidation** — Move Briefing, Notes, Planner, Alerts, Comms out of the sidebar and into the Productivity tab bar. Each new tab renders the existing page component inside the Productivity layout. Remove these 5 items from the sidebar `personalItems` array.
3. **Settings tab bar** — Replace the single scrollable page with a top tab bar. One tab per current sidebar nav group: "Display" (appearance, background, color theme, UI scale, typography, language), "Hub" (hub connection settings), plus tabs grouping the remaining sections by their sidebar affinity (Profile, Integrations, Storage, etc.).
4. **AG-Grid theme fix** — The grid currently hardcodes `colorSchemeDark` which means light mode shows a white background that doesn't match the app theme. Make it dynamically switch between light/dark color schemes based on the active theme mode.

## Technical Approach

### Task 1: Sidebar Reorder (component-engineer)

**File:** `src/renderer/app/layouts/Sidebar.tsx`

**Changes:**
- Swap the expanded JSX blocks: render Development `<Collapsible>` first, then Personal
- Move `renderAddProjectButton()` call inside the Development `<CollapsibleContent>` as the first child (before `developmentItems.map`)
- In collapsed mode: render `developmentItems` first, then the add-project button (inside dev group), then `personalItems`

**Scope:** Single file, ~20 lines moved.

---

### Task 2: Productivity Tab Consolidation (component-engineer)

**Files to modify:**
- `src/renderer/features/productivity/components/ProductivityPage.tsx` — add 5 new tabs
- `src/renderer/features/productivity/store.ts` — extend `activeTab` union type
- `src/renderer/app/layouts/Sidebar.tsx` — remove Briefing, Notes, Planner, Alerts, Comms from `personalItems`

**Changes:**

1. **ProductivityPage.tsx** — Expand `TABS` array:
   ```typescript
   const TABS = [
     { id: 'overview', label: 'Overview', icon: LayoutGrid },
     { id: 'calendar', label: 'Calendar', icon: Calendar },
     { id: 'spotify', label: 'Spotify', icon: Headphones },
     { id: 'briefing', label: 'Briefing', icon: Newspaper },
     { id: 'notes', label: 'Notes', icon: StickyNote },
     { id: 'planner', label: 'Planner', icon: CalendarDays },
     { id: 'alerts', label: 'Alerts', icon: Bell },
     { id: 'comms', label: 'Comms', icon: Globe },
   ];
   ```

2. **ProductivityPage.tsx** — Add content rendering for each new tab:
   - `briefing` → `<BriefingPage />`
   - `notes` → `<NotesPage />`
   - `planner` → `<PlannerPage />`
   - `alerts` → `<AlertsPage />`
   - `comms` → `<CommunicationsPage />`

3. **store.ts** — Extend union:
   ```typescript
   activeTab: 'overview' | 'calendar' | 'spotify' | 'briefing' | 'notes' | 'planner' | 'alerts' | 'comms';
   ```

4. **Sidebar.tsx** — Remove these from `personalItems`: Briefing, Notes, Planner, Alerts, Comms. Keep: Dashboard, My Work, Fitness, Productivity.

**Note:** Existing routes for `/briefing`, `/notes`, etc. stay functional (deep links still work). The sidebar just no longer shows them — users access them via Productivity tabs.

---

### Task 3: Settings Tab Bar (component-engineer)

**Files to modify:**
- `src/renderer/features/settings/components/SettingsPage.tsx` — refactor to tab layout
- `src/renderer/features/settings/store.ts` — new file for active settings tab state (or extend existing)

**Tab grouping by sidebar affinity:**

| Tab | Sections |
|-----|----------|
| Display | AppearanceModeSection, BackgroundSettings, ColorThemeSection, UiScaleSection, TypographySection, Language |
| Profile | ProfileSection, WorkspacesTab |
| Hub | HubSettings |
| Integrations | ClaudeAuthSettings, GitHubAuthSettings, OAuthProviderSettings |
| Storage | StorageManagementSection |
| Advanced | WebhookSettings, HotkeySettings, VoiceSettings, About |

**Changes:**
1. Create a `SETTINGS_TABS` constant array with tab definitions
2. Add a Zustand store (or local state) for `activeSettingsTab`
3. Refactor `SettingsPage` to use the same tab bar pattern as ProductivityPage (reuse `TAB_BASE`/`TAB_ACTIVE`/`TAB_INACTIVE` styles — or extract a shared `TabBar` component)
4. Each tab renders only its grouped sections

---

### Task 4: AG-Grid Light/Dark Theme Fix (styling-engineer)

**Files to modify:**
- `src/renderer/features/tasks/components/grid/ag-grid-theme.ts` — make color scheme dynamic
- `src/renderer/features/tasks/components/grid/TaskDataGrid.tsx` — pass theme reactively

**Problem:** `colorSchemeDark` is hardcoded. In light mode, AG-Grid still renders with dark scheme overrides, causing the white-background mismatch.

**Solution:**
1. Export a function instead of a static theme, or export both variants:
   ```typescript
   import { colorSchemeDark, colorSchemeLight, themeQuartz } from 'ag-grid-community';

   function createAdcGridTheme(isDark: boolean) {
     return themeQuartz
       .withPart(isDark ? colorSchemeDark : colorSchemeLight)
       .withParams({
         browserColorScheme: isDark ? 'dark' : 'light',
         // ... rest unchanged, CSS vars adapt automatically
       });
   }
   ```
2. In `TaskDataGrid.tsx`, read `useThemeStore().mode` and pass the correct theme:
   ```typescript
   const { mode } = useThemeStore();
   const theme = useMemo(() => createAdcGridTheme(mode === 'dark'), [mode]);
   ```

This ensures AG-Grid respects light/dark mode. The CSS custom property values already change per-theme in `globals.css`, so the grid colors will automatically match.

---

## Wave Plan (Parallel Execution)

### Wave 1 (all 4 tasks in parallel — zero dependencies between them)

| Task | Agent Role | Files | Dependencies |
|------|-----------|-------|-------------|
| 1. Sidebar reorder | component-engineer | `Sidebar.tsx` | none |
| 2. Productivity consolidation | component-engineer | `ProductivityPage.tsx`, `store.ts`, `Sidebar.tsx` | none |
| 3. Settings tab bar | component-engineer | `SettingsPage.tsx`, new `settings/store.ts` | none |
| 4. AG-Grid theme fix | styling-engineer | `ag-grid-theme.ts`, `TaskDataGrid.tsx` | none |

**Conflict note:** Tasks 1 and 2 both modify `Sidebar.tsx`. They CANNOT run in the same worktree. Each gets its own worktree via `git worktree add`. The team leader merges sequentially — task 1 first (smaller diff), then task 2 resolves any merge conflict on `Sidebar.tsx`.

### Wave 2 (post-merge)

| Task | Agent Role | Scope | Dependencies |
|------|-----------|-------|-------------|
| 5. Documentation updates | docs-engineer | `ai-docs/`, `.claude/agents/`, `FEATURES-INDEX.md`, `user-interface-flow.md` | Wave 1 |
| 6. Verification suite | qa-reviewer | `npm run lint && typecheck && test && build && test:e2e && check:docs` | Wave 1 |

## Acceptance Criteria

- [ ] Development section appears above Personal in sidebar (expanded + collapsed)
- [ ] "+Add Project" is the first item inside the Development accordion
- [ ] Briefing, Notes, Planner, Alerts, Comms removed from sidebar
- [ ] All 5 items appear as tabs in Productivity page
- [ ] Clicking each Productivity tab renders the correct existing page component
- [ ] Settings page has a top tab bar with Display, Profile, Hub, Integrations, Storage, Advanced
- [ ] Each settings tab renders only its grouped sections
- [ ] AG-Grid background matches the app theme in both light and dark mode
- [ ] All 6 verification commands pass
- [ ] Documentation updated for all changes
