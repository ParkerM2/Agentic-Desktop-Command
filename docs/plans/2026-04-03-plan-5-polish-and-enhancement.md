# Research Doc: Plan 5 — Polish & Enhancement

**Goal:** Final pass to make the app feel like a cohesive, well-crafted product. Focus on keyboard shortcuts, navigation improvements, dashboard as the true home screen, briefing feature as a daily habit, and removing dead/deprecated code. This plan runs after Plans 1-4 are complete and the core functionality is solid.

---

## Scope Overview

Six areas of work:

1. **Dashboard as Home** — make the dashboard truly useful as the first screen you see
2. **Briefing feature** — complete the morning briefing UX so it's a daily ritual
3. **Keyboard shortcuts** — add global hotkeys for common actions
4. **Dead code removal** — delete `terminal-service.ts`, deprecated types, unused routes
5. **Navigation cleanup** — consistent header patterns, breadcrumbs where needed
6. **Sidebar improvements** — active state, badge counts, collapsed state

---

## 1. Dashboard as Home

### Current State

`DashboardPage.tsx` renders 6 widgets in a grid:
- `GreetingHeader` — time-of-day greeting with user name
- `TodayView` — today's schedule/goals (need to verify if it reads real data)
- `RecentProjects` — list of recently accessed projects
- `ActiveAgents` — running agent tasks
- `QuickCapture` — inline note/task capture
- `DailyStats` — completion stats

The dashboard is the first route (`/`) but may feel empty if data is sparse.

### Issues to Resolve

**`TodayView.tsx`** — needs to read from `planner.getDay(today)` and show:
- Goals checklist (with completion state, read-only view linking to Planner)
- Today's time blocks as a mini timeline
- "Open Planner" link to the full planner view

**`DailyStats.tsx`** — need to verify what it actually queries. Target: show real counts:
- Notes created today
- Tasks completed today
- Goals completed today
- Workouts logged this week

**`RecentProjects.tsx`** — need to verify it calls a real IPC and sorts by `updatedAt`. If it shows a hard-coded list or empty state with no IPC call, that's a bug.

**`GreetingHeader.tsx`** — currently shows time-of-day greeting. Could show:
- Quick weather (if available via an existing service, not a new integration)
- Motivational streak data (if tracked anywhere)
- Keep simple if data isn't there

### Files to Modify

```
src/renderer/features/dashboard/components/TodayView.tsx
src/renderer/features/dashboard/components/DailyStats.tsx
src/renderer/features/dashboard/components/RecentProjects.tsx
src/renderer/features/dashboard/components/GreetingHeader.tsx
src/renderer/features/dashboard/components/QuickCapture.tsx
```

### IPC Channels Needed

These should already exist; verify handlers are implemented:
- `planner.getDay` (for TodayView)
- `projects.list` sorted by updatedAt (for RecentProjects)
- `notes.list` filtered by today (for DailyStats)
- `tasks.list` filtered by completedAt today (for DailyStats)

---

## 2. Briefing Feature

### Current State

Files:
- `src/renderer/features/briefing/api/useBriefing.ts`
- `src/renderer/features/briefing/index.ts`
- No `components/` folder visible in file listing

The briefing feature has API hooks but no UI components. It's effectively invisible.

### What the Briefing Should Be

A "morning briefing" view that the user sees when they open the app each morning:
- AI-generated summary of:
  - What's on the agenda today (planner)
  - Pending tasks / in-progress agents
  - GitHub notifications summary (if connected)
  - Any overdue milestones
- Dismissible with a "Got it, let's go" button
- Shown once per day (or on first open after midnight)

### Files to Create

```
src/renderer/features/briefing/components/BriefingPage.tsx
src/renderer/features/briefing/components/BriefingSection.tsx
src/renderer/features/briefing/hooks/useBriefingTrigger.ts
```

### Files to Modify

```
src/renderer/features/briefing/api/useBriefing.ts    — verify hooks are correct
src/renderer/app/layouts/AppLayout.tsx               — trigger briefing check on mount
```

### IPC Channels to Verify

- `briefing.generate` — triggers server-side briefing generation
- `briefing.dismiss` — marks today's briefing as seen
- `briefing.getLatest` — retrieves current briefing data

---

## 3. Keyboard Shortcuts

### Current State

`src/shared/ipc/misc/hotkeys.contract.ts` exists — hotkeys IPC contract is defined. Need to verify if any global shortcuts are registered.

### Target Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open assistant widget |
| `Cmd/Ctrl + N` | New note (context-sensitive) |
| `Cmd/Ctrl + Shift + T` | Open task from any view |
| `Cmd/Ctrl + /` | Focus assistant input |
| `Esc` | Close modals / assistant widget |
| `G D` | Go to Dashboard |
| `G P` | Go to Planner |
| `G R` | Go to Roadmap |
| `G I` | Go to Ideation |
| `G N` | Go to Notes |

### Implementation Approach

Two layers:
1. **Electron main process** — register global shortcuts via `globalShortcut` for `Cmd+K` (open assistant from tray when app is minimized)
2. **Renderer** — `useEffect` with `keydown` listener on `document` for in-app navigation shortcuts

### Files to Create/Modify

```
src/renderer/shared/hooks/useGlobalHotkeys.ts   — registers in-app shortcuts
src/renderer/app/layouts/AppLayout.tsx           — mount useGlobalHotkeys
src/main/ipc/handlers/hotkeys-handlers.ts        — verify exists; add global shortcut registration
```

---

## 4. Dead Code Removal

### Deprecated: `terminal-service.ts`

Per CLAUDE.md: "Do NOT build on `terminal-service` or xterm.js — they are deprecated."

```
src/main/services/terminal/terminal-service.ts   — DELETE
src/shared/ipc/terminals/                        — verify if still referenced; if not, DELETE
src/renderer/features/terminals/                 — verify if still referenced; if not, DELETE
```

**Verification before deletion:**
```bash
grep -r "terminal-service" src/ --include="*.ts" --include="*.tsx"
grep -r "terminals" src/ --include="*.ts" --include="*.tsx"
```

Only delete if the count of references is zero after accounting for the files themselves.

### Deprecated Types in `hub-protocol.ts`

Per memory notes: `Computer*` and `DeviceAuth*` types in `hub-protocol.ts` are deprecated. Scan for usages; if zero, remove.

### Unused Routes

Audit `src/renderer/app/router.ts` (or equivalent) for routes that have no corresponding component or that lead to blank/stub pages. Remove or stub with "Coming soon" if the route is needed for navigation.

### Files to Audit

```
src/main/services/terminal/terminal-service.ts
src/shared/ipc/terminals/
src/renderer/features/terminals/
src/shared/types/hub-protocol.ts  (Computer*, DeviceAuth* types)
src/renderer/app/router/ (unused routes)
```

---

## 5. Navigation Cleanup

### Header Pattern Inconsistency

Currently each feature page has its own header with different styling:
- `RoadmapPage` uses `<Map>` icon + `<h1 class="text-2xl font-bold">`
- `FitnessPage` uses `<h1 class="text-foreground text-2xl font-bold">` + subtitle
- `PlannerPage` uses `<header>` tag with icon + h1

Target: standardize to a `PageHeader` component:

```typescript
interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
```

**File to create:** `src/renderer/shared/components/PageHeader.tsx`

**Files to modify (use PageHeader):**
```
src/renderer/features/roadmap/components/RoadmapPage.tsx
src/renderer/features/planner/components/PlannerPage.tsx
src/renderer/features/fitness/components/FitnessPage.tsx
src/renderer/features/ideation/components/IdeationPage.tsx
src/renderer/features/communications/components/CommunicationsPage.tsx
```

---

## 6. Sidebar Improvements

### Current State

Need to read `src/renderer/app/layouts/Sidebar.tsx` (or equivalent) to understand what's there. Known issues from prior audit:
- Logout button exists in `UserMenu.tsx` in the sidebar footer — this is correct
- Active nav item highlighting — need to verify it uses TanStack Router's active state
- No badge counts on sidebar items (e.g., "3 active agents", "5 unread notifications")

### Target Improvements

- Badge counts on:
  - Tasks: number of in-progress agent tasks
  - GitHub: number of unread notifications
  - Alerts: number of active (unacknowledged) alerts
- Sidebar collapse animation (if not already present)
- Active route highlighting using TanStack Router `<Link>` `activeProps`

### Files to Modify

```
src/renderer/app/layouts/Sidebar.tsx (or wherever nav links live)
src/renderer/app/layouts/AppLayout.tsx
```

---

## Files Full List

### Create
```
src/renderer/shared/components/PageHeader.tsx
src/renderer/features/briefing/components/BriefingPage.tsx
src/renderer/features/briefing/components/BriefingSection.tsx
src/renderer/features/briefing/hooks/useBriefingTrigger.ts
src/renderer/shared/hooks/useGlobalHotkeys.ts
```

### Modify
```
src/renderer/features/dashboard/components/TodayView.tsx
src/renderer/features/dashboard/components/DailyStats.tsx
src/renderer/features/dashboard/components/RecentProjects.tsx
src/renderer/features/dashboard/components/GreetingHeader.tsx
src/renderer/features/dashboard/components/QuickCapture.tsx
src/renderer/features/briefing/api/useBriefing.ts
src/renderer/app/layouts/AppLayout.tsx
src/renderer/app/layouts/Sidebar.tsx
src/renderer/features/roadmap/components/RoadmapPage.tsx (PageHeader)
src/renderer/features/planner/components/PlannerPage.tsx (PageHeader)
src/renderer/features/fitness/components/FitnessPage.tsx (PageHeader)
src/renderer/features/ideation/components/IdeationPage.tsx (PageHeader)
```

### Delete (after verification)
```
src/main/services/terminal/terminal-service.ts
src/shared/ipc/terminals/* (if no remaining references)
src/renderer/features/terminals/* (if no remaining references)
```

---

## IPC Changes

None new. This plan only:
- Verifies existing IPC channels are implemented (`planner.getDay`, `projects.list`, `briefing.*`)
- Removes dead IPC contracts if their handlers are also removed

---

## Risk / Complexity

| Risk | Level | Notes |
|------|-------|-------|
| Deleting terminal code that is referenced | Medium | Must grep before deleting — CLAUDE.md says deprecated but file may still have imports |
| Briefing UI design | Low | Keep it simple: text sections + dismiss button |
| Keyboard shortcut conflicts with OS | Low | Test `Cmd+K` on macOS — may conflict with browser shortcuts in webview |
| Dashboard widget data not showing | Medium | Several widgets may need IPC handler verification |
| PageHeader rollout scope | Low | Large surface area but mechanical — just swap the header section |

---

## Out of Scope

- Electron tray icon changes
- Auto-update flow changes
- Onboarding flow
- Theme customization
- Multi-window support
- Any new data features not listed above

---

## Dependencies

- Plans 1-4 should be complete
- No new dependencies on external packages
- Briefing IPC handlers must exist before building `BriefingPage`
