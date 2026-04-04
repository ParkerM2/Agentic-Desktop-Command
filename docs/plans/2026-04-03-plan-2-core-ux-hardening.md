# Research Doc: Plan 2 — Core UX Hardening

**Goal:** Audit and harden every feature's UI for design-system compliance, correct empty states, loading skeletons, missing CRUD operations, and raw HTML element violations. No new features — this plan makes the existing features actually feel finished.

---

## Summary of Issues Found

Five categories of violations across 14 features:

1. **Raw HTML elements** — `<button>`, `<input>`, `<textarea>`, `<select>` used directly instead of `@ui` primitives
2. **Empty states missing or wrong** — some features show nothing when there's no data; others show confusing copy
3. **Missing CRUD wiring** — edit/delete actions exist in the UI but are not connected to mutations
4. **Loading states** — some pages show no loading indicator at all; others use inconsistent patterns
5. **Design token violations** — hardcoded Tailwind color literals (`text-warning`, `bg-warning/10`) that may not exist in the theme

---

## Feature-by-Feature Scope

### 1. Roadmap (`RoadmapPage.tsx` + `MilestoneCard`)

**Files:**
- `src/renderer/features/roadmap/components/RoadmapPage.tsx`
- (no additional files needed)

**Current state:**
- Form inputs (`<input>`, `<textarea>`, `<select>`) are raw HTML — not `@ui` primitives
- `<button>` elements are raw HTML with inline Tailwind classes — should be `<Button>` from `@ui`
- `<select>` for status change uses raw HTML
- Milestone edit is NOT implemented — there is no way to edit a milestone's title/description/date after creation. `useUpdateMilestone()` exists and only handles `status` changes from the status `<select>`
- Empty state: Exists and shows icon + copy — this is fine

**Target state:**
- Replace all raw `<input>`, `<textarea>`, `<select>`, `<button>` with `@ui` primitives: `Input`, `Textarea`, `Select`, `Button`
- Add milestone edit modal/inline editing: clicking a milestone title opens edit mode for title, description, targetDate
- Wire `useUpdateMilestone({ id, title, description, targetDate })` to the edit form

**IPC changes:** None — `milestones.update` already accepts title/description/targetDate

**Exact changes:**
| Element | Current | Target |
|---------|---------|--------|
| `RoadmapPage.tsx:216` | `<button>` New Milestone | `<Button variant="primary">` |
| `RoadmapPage.tsx:250,257` | `<button>` Create/Cancel | `<Button variant="primary">` / `<Button variant="outline">` |
| `RoadmapPage.tsx:229,234,243` | `<input>`, `<textarea>`, `<input type=date>` | `<Input>`, `<Textarea>`, `<Input type="date">` |
| `MilestoneCard:88` | `<select>` status | `<Select>` from `@ui` |
| `MilestoneCard:97` | `<button>` delete | `<Button variant="ghost" size="icon">` |
| `MilestoneCard:154,160` | `<input>` add task, `<button>` | `<Input>`, `<Button variant="ghost" size="icon">` |

---

### 2. Planner (`PlannerPage.tsx`, `GoalsList.tsx`, `DayView.tsx`, `TimeBlockEditor.tsx`)

**Files:**
- `src/renderer/features/planner/components/PlannerPage.tsx`
- `src/renderer/features/planner/components/GoalsList.tsx`
- `src/renderer/features/planner/components/DayView.tsx`
- `src/renderer/features/planner/components/TimeBlockEditor.tsx`

**Current state:**
- `PlannerPage.tsx:117,130` — navigation `<button>` elements are raw HTML
- `PlannerPage.tsx:207,215,221` — reflection `<textarea>`, `<button>` Save/Cancel are raw HTML
- `GoalsList.tsx` — the entire component uses raw `<input>`, `<button>` elements (after Plan 1 rewrite, these will still be raw per the Plan 1 code)
- `DayView.tsx` — need to verify; likely uses raw elements too
- No empty state for a day with no time blocks

**Target state:**
- Replace all raw elements in planner with `@ui` primitives
- Add a visible empty state to the time block column: "No time blocks scheduled — click + to add one"

**IPC changes:** None

---

### 3. Ideation (`IdeationPage.tsx`, `IdeaEditForm.tsx`)

**Files:**
- `src/renderer/features/ideation/components/IdeationPage.tsx`
- `src/renderer/features/ideation/components/IdeaEditForm.tsx`

**Current state (need to verify exact violations):**
- Need to read `IdeationPage.tsx` to confirm raw element usage
- `useCreateIdea`, `useUpdateIdea`, `useDeleteIdea`, `useVoteIdea` all exist — wiring confirmed in prior audit
- Empty state: unknown until file read

**Target state:**
- `@ui` compliance pass
- Confirm empty state copy is clear: "No ideas yet — add your first idea or ask the assistant to generate some"

---

### 4. Notes (`NotesList.tsx`, `NoteEditor.tsx`, `QuickNote.tsx`)

**Files:**
- `src/renderer/features/notes/components/NotesList.tsx`
- `src/renderer/features/notes/components/NoteEditor.tsx`
- `src/renderer/features/notes/components/QuickNote.tsx`

**Current state:**
- `NotesPage.tsx` has a good empty state: "Select a note or create a new one" — this is fine
- Need to read `NoteEditor.tsx` and `NotesList.tsx` to verify compliance

**Target state:**
- `@ui` compliance pass on editor buttons and list actions

---

### 5. Fitness (`FitnessPage.tsx`, `WorkoutForm.tsx`, `GoalsPanel.tsx`, `BodyComposition.tsx`)

**Files:**
- `src/renderer/features/fitness/components/FitnessPage.tsx`
- `src/renderer/features/fitness/components/WorkoutForm.tsx`
- `src/renderer/features/fitness/components/GoalsPanel.tsx`
- `src/renderer/features/fitness/components/BodyComposition.tsx`
- `src/renderer/features/fitness/components/StatsOverview.tsx`

**Current state:**
- `FitnessPage.tsx:46` — "Log Workout" `<button>` is raw HTML
- Tabs use raw `<button>` elements
- `WorkoutForm.tsx` — almost certainly uses raw `<input>`, `<select>` for exercise fields
- `GoalsPanel.tsx` — fitness goals likely using raw elements
- `StatsOverview.tsx` — display-only, likely fine

**Target state:**
- `<Button>` for Log Workout and all action buttons
- Tab component or `@ui` equivalent for the tab bar
- `Input`, `Select`, `Button` in WorkoutForm and GoalsPanel

---

### 6. Communications (`CommunicationsPage.tsx`, `SlackPanel.tsx`, `DiscordPanel.tsx`, `NotificationRules.tsx`)

**Files:**
- `src/renderer/features/communications/components/CommunicationsPage.tsx`
- `src/renderer/features/communications/components/SlackPanel.tsx`
- `src/renderer/features/communications/components/DiscordPanel.tsx`
- `src/renderer/features/communications/components/NotificationRules.tsx`

**Current state:**
- Service connection status shown as pills — need to verify element type
- `NotificationRules.tsx` — rules add/remove form uses unknown elements
- `SlackPanel.tsx` / `DiscordPanel.tsx` — action buttons

**Target state:**
- `@ui` compliance pass across all 4 components

---

### 7. Dashboard (`DashboardPage.tsx`, `TodayView.tsx`, `GreetingHeader.tsx`, `RecentProjects.tsx`, `QuickCapture.tsx`, `DailyStats.tsx`)

**Files:**
- `src/renderer/features/dashboard/components/TodayView.tsx`
- `src/renderer/features/dashboard/components/GreetingHeader.tsx`
- `src/renderer/features/dashboard/components/RecentProjects.tsx`
- `src/renderer/features/dashboard/components/QuickCapture.tsx`
- `src/renderer/features/dashboard/components/DailyStats.tsx`

**Current state:**
- Dashboard layout exists but content is mostly static/stub data
- `GreetingHeader.tsx` — time-of-day greeting, need to check if it uses real data
- `TodayView.tsx` — shows today's schedule/goals; need to verify it reads from planner IPC
- `RecentProjects.tsx` — need to verify it calls `projects.list` or similar IPC
- `QuickCapture.tsx` — inline note/task capture; need to verify it calls `notes.create` / `tasks.create`
- `DailyStats.tsx` — need to verify it has real data vs hardcoded

**Target state:**
- `TodayView` reads from planner IPC (`useDay(today)`) and shows goals + time blocks
- `RecentProjects` reads from projects IPC with `updatedAt` sort
- `QuickCapture` creates a note or task via mutation on submit
- `DailyStats` shows real counts from React Query (tasks completed, notes created, etc.)

---

### 8. Alerts (`CreateAlertModal.tsx`, `RecurringAlerts.tsx`)

**Files:**
- `src/renderer/features/alerts/components/CreateAlertModal.tsx`
- `src/renderer/features/alerts/components/RecurringAlerts.tsx`

**Current state:** Need to read to verify
**Target state:** `@ui` compliance, verify CRUD wiring complete

---

### 9. GitHub (`NotificationList.tsx`, `PrList.tsx`, `PrDetailModal.tsx`)

**Files:**
- `src/renderer/features/github/components/NotificationList.tsx`
- `src/renderer/features/github/components/PrList.tsx`

**Current state:** GitHub feature reads from `github.listNotifications`, `github.listPRs` IPC — need to verify IPC handlers exist
**Target state:** Empty states, loading states, `@ui` compliance

---

## Cross-Cutting Issues

### `text-warning` / `bg-warning` Token

Multiple components use `text-warning`, `bg-warning/10` (e.g., `LoginPage.tsx:195`). This token may not be defined in the Tailwind theme. Need to:
1. Check `tailwind.config.ts` for `warning` token definition
2. If missing: add `warning` to theme OR replace with `text-yellow-600`/`text-amber-600`

**File:** `tailwind.config.ts` (or equivalent Tailwind v4 config)

### Loading State Pattern

Current inconsistency:
- Some pages: `isLoading ? <Loader2 animate-spin> : null` — correct
- Some pages: no loading state at all
- Target: every page that fetches data should have a loading skeleton or spinner

**Standard pattern to enforce:**
```tsx
if (isLoading) {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  );
}
```

### Empty State Pattern

Standard empty state:
```tsx
<div className="border-border rounded-lg border border-dashed p-12 text-center">
  <IconComponent className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
  <p className="text-lg font-medium">No [items] yet</p>
  <p className="text-muted-foreground mt-1 text-sm">[Actionable copy]</p>
  <Button className="mt-4" onClick={onCreate}>Add [Item]</Button>
</div>
```

---

## Files to Create

None — this is a compliance/hardening pass only.

## Files to Modify (Full List)

```
src/renderer/features/roadmap/components/RoadmapPage.tsx
src/renderer/features/planner/components/PlannerPage.tsx
src/renderer/features/planner/components/GoalsList.tsx          (after Plan 1)
src/renderer/features/planner/components/DayView.tsx
src/renderer/features/planner/components/TimeBlockEditor.tsx
src/renderer/features/ideation/components/IdeationPage.tsx
src/renderer/features/ideation/components/IdeaEditForm.tsx
src/renderer/features/notes/components/NotesList.tsx
src/renderer/features/notes/components/NoteEditor.tsx
src/renderer/features/notes/components/QuickNote.tsx
src/renderer/features/fitness/components/FitnessPage.tsx
src/renderer/features/fitness/components/WorkoutForm.tsx
src/renderer/features/fitness/components/GoalsPanel.tsx
src/renderer/features/fitness/components/BodyComposition.tsx
src/renderer/features/communications/components/CommunicationsPage.tsx
src/renderer/features/communications/components/SlackPanel.tsx
src/renderer/features/communications/components/DiscordPanel.tsx
src/renderer/features/communications/components/NotificationRules.tsx
src/renderer/features/dashboard/components/TodayView.tsx
src/renderer/features/dashboard/components/GreetingHeader.tsx
src/renderer/features/dashboard/components/RecentProjects.tsx
src/renderer/features/dashboard/components/QuickCapture.tsx
src/renderer/features/dashboard/components/DailyStats.tsx
src/renderer/features/alerts/components/CreateAlertModal.tsx
src/renderer/features/alerts/components/RecurringAlerts.tsx
src/renderer/features/github/components/NotificationList.tsx
src/renderer/features/github/components/PrList.tsx
tailwind.config.ts (or CSS variables file for warning token)
```

---

## IPC Changes

None. This plan touches only renderer components. No new IPC channels. No schema changes.

---

## Risk / Complexity

| Risk | Level | Notes |
|------|-------|-------|
| Breaking UI during `@ui` migration | Low | `@ui` primitives are drop-in; Tailwind classes from raw elements move to `className` prop |
| Dashboard widgets reading stale/missing IPC | Medium | `TodayView` / `DailyStats` may need IPC channels verified before wiring |
| `text-warning` token missing | Low | Compile-time check will catch it; easy to add to theme |
| Regression in existing CRUD flows | Low | Mutations stay the same; only form element type changes |

---

## Out of Scope

- New features or new data fields
- AI generation (Plan 3)
- Performance optimization
- Animations beyond existing transitions
- Mobile/responsive layout
- Any IPC handler changes

---

## Dependencies

- Plan 1 must be complete first (GoalsList rewrite will conflict if done in parallel)
- No dependency on Plans 3-5
