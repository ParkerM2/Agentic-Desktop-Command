# Gap Closure — Multi-Sprint Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every gap identified in the full-system data flow audit. Every schema field displayed, every entity editable, every backend with a UI, every feature searchable/filterable.

**Architecture:** Feature Slice Design — each task targets one feature domain's renderer layer (hooks + components). Backend is already complete for most features.

**Tech Stack:** React, TanStack Query, TanStack Table, Zustand, @ui design system, Electron IPC

---

## Sprint Overview

| Sprint | Theme | Features | Tasks |
|--------|-------|----------|-------|
| 1 | Core CRUD Completeness | Progress Tasks, Milestones, Alerts, Captures | 8 |
| 2 | Edit & Metadata Display | Ideas, Fitness, Changelog, Briefing Config | 8 |
| 3 | Search, Filter, Bulk Ops | All personal features + Agent Dashboard | 7 |
| 4 | Settings & Git UI | Settings toggles, Git Dashboard, Agent Dashboard fields | 6 |
| 5 | Missing Integrations UI | Email, Notifications, Spotify | 5 |
| 6 | Schema Fixes & New Backends | Progress schema gaps, Alert/Capture/Fitness update IPC | 6 |
| 7 | Polish & Completion | Calendar, Discord stubs → real or remove, Tools page | 4 |

**Total: 44 tasks across 7 sprints**

---

## Sprint 1: Core CRUD Completeness

> Close the biggest user-facing gaps: can't edit the things you use most.

### Task 1.1: Progress Tasks — Inline Edit Dialog

**Problem:** Zero edit capability after creation. Title, description, priority, status all read-only.

**Files:**
- Create: `src/renderer/features/tasks/components/EditProgressTaskDialog.tsx`
- Modify: `src/renderer/features/tasks/components/grid/ProgressTaskGrid.tsx` (add edit button to row actions)
- Modify: `src/renderer/features/tasks/components/detail/ProgressTaskDetailRow.tsx` (add edit button)

**Acceptance Criteria:**
- [ ] Edit dialog with fields: title, description, priority (select), status (select)
- [ ] Opens from row action menu (kebab) and detail row
- [ ] Uses `useUpdateProgressTask()` mutation (already exists)
- [ ] All fields use @ui primitives (FormInput, FormSelect, Dialog)
- [ ] Typecheck + lint pass

### Task 1.2: Progress Tasks — Jira & PR Linking UI

**Problem:** Jira/PR link buttons exist in detail row but are disabled/non-functional.

**Files:**
- Modify: `src/renderer/features/tasks/components/detail/ProgressTaskDetailRow.tsx`
- Create: `src/renderer/features/tasks/components/LinkJiraDialog.tsx`
- Create: `src/renderer/features/tasks/components/LinkPrDialog.tsx`

**Acceptance Criteria:**
- [ ] "Link Jira" button opens dialog with jiraTicket + jiraUrl inputs
- [ ] "Link PR" button opens dialog with prUrl input (auto-derives prNumber)
- [ ] Both call `useUpdateProgressTask()` with the link fields
- [ ] Linked items show as clickable badges in grid/detail
- [ ] Typecheck + lint pass

### Task 1.3: Progress Tasks — Schema Fix for PR/Jira Fields

**Problem:** `prNumber`, `prStatus`, `jiraUrl` exist in IPC but NOT in SQLite schema. Data is accepted but lost on restart.

**Files:**
- Create: `drizzle/0012_add_pr_jira_fields.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `src/main/features/progress/schema.ts` (add columns)
- Modify: `src/main/features/progress/progress-service.ts` (include in rowToTask)

**Acceptance Criteria:**
- [ ] Migration adds: `pr_number INTEGER`, `pr_status TEXT`, `jira_url TEXT` to `progress_tasks`
- [ ] `rowToTask()` maps these columns to ProgressTask fields
- [ ] Fields round-trip: set via update → persist → return on list/get
- [ ] Typecheck + lint pass

### Task 1.4: Progress Tasks — Remove Unused Schema Columns

**Problem:** `tags` and `branch` columns exist in schema but are never read, written, or displayed anywhere.

**Files:**
- Create: `drizzle/0013_drop_unused_progress_columns.sql` (or leave and document — SQLite can't DROP COLUMN easily)
- Modify: `src/main/features/progress/schema.ts` (remove from Drizzle definition if not dropping)

**Acceptance Criteria:**
- [ ] Decision documented: drop columns or repurpose them
- [ ] If keeping tags: add tag input to create/edit dialogs, display as badges
- [ ] If dropping: migration removes columns, schema updated
- [ ] Typecheck + lint pass

### Task 1.5: Milestones — Edit Dialog

**Problem:** Only status is editable via dropdown. Title, description, targetDate are read-only after creation. Task items can't be edited or deleted.

**Files:**
- Create: `src/renderer/features/roadmap/components/MilestoneEditDialog.tsx`
- Modify: `src/renderer/features/roadmap/components/RoadmapPage.tsx` (add edit button per milestone card)

**Acceptance Criteria:**
- [ ] Edit dialog with: title, description, targetDate (date picker), status
- [ ] Task management: edit task text, delete tasks (not just toggle)
- [ ] Uses `useUpdateMilestone()` mutation (already exists)
- [ ] All @ui primitives
- [ ] Typecheck + lint pass

### Task 1.6: Alerts — Update IPC + Edit UI

**Problem:** No update channel exists. Cannot edit message, triggerAt, or recurring config after creation.

**Files:**
- Modify: `src/shared/ipc/misc/alerts.channels.ts` (add UPDATE.ALERT)
- Modify: `src/shared/ipc/misc/alerts.contract.ts` (add update schema)
- Modify: `src/main/features/alerts/alert-service.ts` (add updateAlert method)
- Modify: `src/main/features/alerts/alert-handlers.ts` (register update handler)
- Create: `src/renderer/features/personal/alerts/api/useAlertMutations.ts` (useUpdateAlert)
- Create: `src/renderer/features/personal/alerts/components/AlertEditDialog.tsx`
- Modify: `src/renderer/features/personal/alerts/components/AlertsPage.tsx` (add edit button)

**Acceptance Criteria:**
- [ ] UPDATE.ALERT channel with schema: `{ id, message?, triggerAt?, recurring?, linkedTo? }`
- [ ] Service updates alert in SQLite
- [ ] Edit dialog with all editable fields
- [ ] Display `linkedTo` field (currently hidden)
- [ ] Display `createdAt` timestamp
- [ ] Typecheck + lint pass

### Task 1.7: Captures — Update IPC + Edit UI

**Problem:** Cannot edit capture text. Limited to 5 recent items.

**Files:**
- Modify: `src/shared/ipc/dashboard/channels.ts` (add UPDATE.CAPTURE)
- Modify: `src/shared/ipc/dashboard/contract.ts` (add update schema)
- Modify: `src/main/features/dashboard/dashboard-service.ts` (add updateCapture, remove MAX_RECENT limit or add pagination)
- Modify: `src/main/features/dashboard/dashboard-handlers.ts` (register update handler)
- Modify: `src/renderer/features/dashboard/api/useCaptures.ts` (add useUpdateCapture)
- Modify: `src/renderer/features/dashboard/components/QuickCapture.tsx` (inline edit, show all)

**Acceptance Criteria:**
- [ ] Inline text editing on click
- [ ] "Show all" button to see beyond 5 recent
- [ ] UPDATE.CAPTURE IPC channel
- [ ] Typecheck + lint pass

### Task 1.8: Captures — Search + Convert to Task/Note

**Problem:** No search, no way to act on captures beyond delete.

**Files:**
- Modify: `src/renderer/features/dashboard/components/QuickCapture.tsx`

**Acceptance Criteria:**
- [ ] Search input filters captures by text
- [ ] "Convert to Task" action (calls useCreateProgressTask with capture text as title)
- [ ] "Convert to Note" action (calls useCreateNote with capture text as content)
- [ ] Delete confirmation
- [ ] Typecheck + lint pass

---

## Sprint 2: Edit & Metadata Display

> Make hidden data visible, add edit capability to remaining features.

### Task 2.1: Ideas — Tags UI

**Problem:** Tags field fully implemented in backend but zero UI.

**Files:**
- Modify: `src/renderer/features/ideation/components/IdeaEditForm.tsx` (add tags input)
- Modify: `src/renderer/features/ideation/components/IdeationPage.tsx` (display tags as badges, add tag filter)

**Acceptance Criteria:**
- [ ] Tags shown as badges on idea cards
- [ ] Tags editable in edit form (comma-separated or chip input)
- [ ] Filter by tag (alongside category filter)
- [ ] Typecheck + lint pass

### Task 2.2: Ideas — Search

**Problem:** No search capability.

**Files:**
- Modify: `src/renderer/features/ideation/components/IdeationPage.tsx` (add SearchInput)
- Optionally: add search to service/IPC (or client-side filter)

**Acceptance Criteria:**
- [ ] SearchInput at top of page
- [ ] Filters ideas by title + description (client-side is fine)
- [ ] Works alongside category filter
- [ ] Typecheck + lint pass

### Task 2.3: Fitness — Workout Edit + Notes Display

**Problem:** Workouts can't be edited. Notes field stored but never displayed.

**Files:**
- Modify: `src/shared/ipc/fitness/channels.ts` (add UPDATE.WORKOUT)
- Modify: `src/main/features/fitness/fitness-service.ts` (add updateWorkout)
- Modify: `src/main/features/fitness/fitness-handlers.ts` (register handler)
- Create: `src/renderer/features/personal/fitness/components/WorkoutEditDialog.tsx`
- Modify: `src/renderer/features/personal/fitness/components/WorkoutLog.tsx` (show notes, add edit button)

**Acceptance Criteria:**
- [ ] Notes field displayed in workout log entries
- [ ] Edit dialog for date, type, duration, exercises, notes
- [ ] UPDATE.WORKOUT IPC channel
- [ ] Typecheck + lint pass

### Task 2.4: Fitness — Measurement Edit/Delete + Hidden Fields

**Problem:** Measurements are immutable. boneMass field hidden.

**Files:**
- Modify: `src/shared/ipc/fitness/channels.ts` (add UPDATE.MEASUREMENT, DELETE.MEASUREMENT)
- Modify: `src/main/features/fitness/fitness-service.ts` (add update/delete methods)
- Modify: `src/renderer/features/personal/fitness/components/MeasurementChart.tsx` (show boneMass, add edit/delete)

**Acceptance Criteria:**
- [ ] boneMass displayed when present
- [ ] Edit dialog for all measurement fields
- [ ] Delete capability
- [ ] Typecheck + lint pass

### Task 2.5: Fitness — Goal Edit

**Problem:** Can only update progress (current), not the goal definition (target, deadline, unit).

**Files:**
- Modify: `src/shared/ipc/fitness/channels.ts` (add UPDATE.GOAL for full updates)
- Modify: `src/main/features/fitness/fitness-service.ts` (add updateGoal for all fields)
- Create: `src/renderer/features/personal/fitness/components/GoalEditDialog.tsx`

**Acceptance Criteria:**
- [ ] Edit dialog for type, target, unit, deadline
- [ ] UPDATE.GOAL IPC channel (distinct from UPDATE.GOAL-PROGRESS)
- [ ] Typecheck + lint pass

### Task 2.6: Changelog — Edit/Delete Existing Entries

**Problem:** Can only add entries. Can't edit or delete.

**Files:**
- Modify: `src/shared/ipc/misc/changelog.channels.ts` (add UPDATE.ENTRY, DELETE.ENTRY)
- Modify: `src/main/features/changelog/changelog-service.ts` (add update/delete)
- Modify: `src/renderer/features/personal/changelog/` (add edit/delete buttons)

**Acceptance Criteria:**
- [ ] Edit button on each changelog entry → opens editor
- [ ] Delete button with confirmation
- [ ] Display `createdAt` timestamp
- [ ] Typecheck + lint pass

### Task 2.7: Briefing — Config UI Panel

**Problem:** All 4 config fields stored but completely inaccessible to users.

**Files:**
- Create: `src/renderer/features/personal/briefing/components/BriefingConfigPanel.tsx`
- Modify: `src/renderer/features/personal/briefing/components/BriefingPage.tsx` (add config gear icon → panel)
- Create: `src/renderer/features/personal/briefing/api/useBriefingConfig.ts` (hooks for config CRUD)

**Acceptance Criteria:**
- [ ] Config panel (slide-out or modal) with:
  - enabled toggle (Switch)
  - scheduledTime input (time picker)
  - includeGitHub checkbox
  - includeAgentActivity checkbox
- [ ] Uses `BRIEFING.GET.CONFIG` and `BRIEFING.UPDATE.CONFIG` channels
- [ ] All @ui primitives
- [ ] Typecheck + lint pass

### Task 2.8: Show createdAt Timestamps Globally

**Problem:** Almost every feature hides createdAt.

**Files:**
- Modify: All list/card/row components for: notes, ideas, milestones, alerts, captures, fitness, progress tasks

**Acceptance Criteria:**
- [ ] `createdAt` shown as relative time ("3d ago") in list views
- [ ] Hover/tooltip shows absolute time
- [ ] Consistent placement across all features
- [ ] Typecheck + lint pass

---

## Sprint 3: Search, Filter, Bulk Operations

> Make every feature searchable and add multi-select actions.

### Task 3.1: Global Search Pattern — Shared Component

**Files:**
- Create: `src/renderer/shared/components/SearchableList.tsx` (or use existing SearchInput pattern)

**Acceptance Criteria:**
- [ ] Reusable search + filter + sort pattern for list views
- [ ] Debounced search input
- [ ] Sort dropdown
- [ ] Can compose with existing page layouts

### Task 3.2: Milestones — Search + Filter + Sort

**Files:**
- Modify: `src/renderer/features/roadmap/components/RoadmapPage.tsx`

**Acceptance Criteria:**
- [ ] Search by title/description
- [ ] Filter by status (planned/in-progress/completed)
- [ ] Sort by targetDate, progress, createdAt
- [ ] Typecheck + lint pass

### Task 3.3: Alerts — Search + Sort

**Files:**
- Modify: `src/renderer/features/personal/alerts/components/AlertsPage.tsx`

**Acceptance Criteria:**
- [ ] Search alerts by message text
- [ ] Sort by triggerAt, createdAt
- [ ] Filter by alert type
- [ ] Typecheck + lint pass

### Task 3.4: Fitness — Search Across All Entities

**Files:**
- Modify fitness page components

**Acceptance Criteria:**
- [ ] Search workouts by type/notes
- [ ] Search goals by type
- [ ] Date range filter on measurements
- [ ] Typecheck + lint pass

### Task 3.5: Agent Dashboard — Session Filters + Search

**Problem:** Filter params defined in IPC but no UI controls.

**Files:**
- Modify: `src/renderer/features/agent-dashboard/components/` (add filter bar)

**Acceptance Criteria:**
- [ ] Filter by session type (project-owner, team-lead, teammate)
- [ ] Filter by status (running, completed, failed, idle)
- [ ] Filter by team name
- [ ] Search by session name
- [ ] Typecheck + lint pass

### Task 3.6: Progress Tasks — Bulk Operations

**Problem:** Checkboxes exist in grid but no bulk action toolbar.

**Files:**
- Create: `src/renderer/features/tasks/components/BulkActionBar.tsx`
- Modify: `src/renderer/features/tasks/components/grid/ProgressTaskGrid.tsx`

**Acceptance Criteria:**
- [ ] Selection checkboxes functional
- [ ] Bulk action bar appears when items selected: Archive, Delete, Change Status, Change Priority
- [ ] Confirmation dialog for destructive actions
- [ ] Uses existing mutations in batch
- [ ] Typecheck + lint pass

### Task 3.7: My Work — Enhanced View

**Problem:** No search, no priority display, no jira/PR links, no sorting.

**Files:**
- Modify: `src/renderer/features/my-work/components/MyWorkPage.tsx`

**Acceptance Criteria:**
- [ ] Search input (title/description)
- [ ] Priority badges shown on each task
- [ ] Jira/PR link badges shown (clickable)
- [ ] Sort by: priority, updatedAt, status
- [ ] Click task → navigate to project tasks tab with detail expanded
- [ ] Typecheck + lint pass

---

## Sprint 4: Settings & Git UI

> Expose hidden settings toggles and build the missing Git dashboard.

### Task 4.1: Settings — App Behavior Toggles

**Problem:** 7 settings stored but no UI toggles.

**Files:**
- Modify: `src/renderer/features/settings/components/` (add to Advanced or new Behavior section)

**Acceptance Criteria:**
- [ ] openAtLogin — Switch toggle
- [ ] minimizeToTray — Switch toggle
- [ ] startMinimized — Switch toggle
- [ ] keepRunning — Switch toggle (keep app running when window closed)
- [ ] assistantAutoStart — Switch toggle
- [ ] logLevel — Select dropdown (debug, info, warn, error)
- [ ] maxConcurrentAgents — number input with min/max
- [ ] All use `useUpdateSettings()` mutation
- [ ] Typecheck + lint pass

### Task 4.2: Git Dashboard — Status & Branches

**Problem:** Full git backend, zero UI. GitPage currently just shows GitHub panel.

**Files:**
- Create: `src/renderer/features/git-overview/components/GitStatusCard.tsx`
- Create: `src/renderer/features/git-overview/components/BranchList.tsx`
- Create: `src/renderer/features/git-overview/api/useGit.ts` (query hooks)
- Modify: `src/renderer/features/git-overview/components/GitPage.tsx` (add git tab alongside GitHub tab)

**Acceptance Criteria:**
- [ ] Git Status card: current branch, clean/dirty, ahead/behind, staged/modified/untracked counts
- [ ] Branch list with current branch highlighted
- [ ] Create branch button + dialog
- [ ] Switch branch action
- [ ] Uses `GIT.GET.STATUS`, `GIT.GET.BRANCHES`, `GIT.CREATE.BRANCH`
- [ ] Typecheck + lint pass

### Task 4.3: Git Dashboard — Worktree Manager

**Files:**
- Create: `src/renderer/features/git-overview/components/WorktreeList.tsx`

**Acceptance Criteria:**
- [ ] List all worktrees with path, branch, status
- [ ] Create worktree button + dialog
- [ ] Remove worktree action with confirmation
- [ ] Uses `GIT.LIST.WORKTREES`, `GIT.CREATE.WORKTREE`, `GIT.REMOVE.WORKTREE`
- [ ] Typecheck + lint pass

### Task 4.4: Git Dashboard — Commit & Push

**Files:**
- Create: `src/renderer/features/git-overview/components/CommitPanel.tsx`

**Acceptance Criteria:**
- [ ] Staged files list
- [ ] Commit message input
- [ ] Commit button → `GIT.COMMIT.CHANGES`
- [ ] Push button → `GIT.PUSH.CHANGES`
- [ ] Create PR button → `GIT.CREATE.PR`
- [ ] Typecheck + lint pass

### Task 4.5: Agent Dashboard — Hidden Fields Display

**Problem:** toolUsage, phase, wave, taskIndex stored but never shown.

**Files:**
- Modify: `src/main/features/agent-dashboard/agent-dashboard-handlers.ts` (include toolUsage, wave, taskIndex in response)
- Modify: `src/renderer/features/agent-dashboard/components/` (display in expanded panel)

**Acceptance Criteria:**
- [ ] Tool usage breakdown (which tools, how many calls each)
- [ ] Phase indicator in status bar
- [ ] Wave/taskIndex shown for team-lead sessions
- [ ] Token usage with cost estimate ($input/output per model)
- [ ] Typecheck + lint pass

### Task 4.6: Agent Dashboard — Bulk Stop + Session Actions

**Files:**
- Modify: `src/renderer/features/agent-dashboard/components/`

**Acceptance Criteria:**
- [ ] "Stop All" button for running sessions
- [ ] Individual session actions: stop, restart, view logs
- [ ] Session type filter dropdown
- [ ] Typecheck + lint pass

---

## Sprint 5: Missing Integration UIs

> Build UIs for backends that already exist.

### Task 5.1: Email Integration Panel

**Problem:** Complete backend (7 channels), zero UI.

**Files:**
- Create: `src/renderer/features/integrations/components/EmailPanel.tsx`
- Create: `src/renderer/features/integrations/api/useEmail.ts` (hooks)
- Modify: `src/renderer/features/integrations/components/IntegrationsPage.tsx` (add Email tab)

**Acceptance Criteria:**
- [ ] Email config form (SMTP settings)
- [ ] Test connection button
- [ ] Email queue list (pending, sent, failed)
- [ ] Retry failed button
- [ ] Send test email
- [ ] Typecheck + lint pass

### Task 5.2: Notification Controls

**Problem:** Can't control watchers or mark-as-read from UI.

**Files:**
- Modify: `src/renderer/features/integrations/components/` (notification settings)
- Create: `src/renderer/features/integrations/api/useNotifications.ts`

**Acceptance Criteria:**
- [ ] Watcher status display (running/stopped/error)
- [ ] Start/stop watching buttons
- [ ] Mark as read / mark all read
- [ ] Notification config panel (what to watch, refresh interval)
- [ ] Typecheck + lint pass

### Task 5.3: Spotify Widget — Real Controls

**Problem:** Widget is a stub.

**Files:**
- Modify: `src/renderer/features/productivity/components/SpotifyWidget.tsx`
- Create: `src/renderer/features/productivity/api/useSpotify.ts` (hooks)

**Acceptance Criteria:**
- [ ] Now playing display (track, artist, album art)
- [ ] Play/pause/skip controls
- [ ] Volume slider
- [ ] Search tracks
- [ ] Uses existing `SPOTIFY.*` IPC channels
- [ ] Graceful "not connected" state
- [ ] Typecheck + lint pass

### Task 5.4: GitHub — PR Diff Viewer

**Problem:** Can list PRs but can't view diffs.

**Files:**
- Create: `src/renderer/features/integrations/components/PrDiffView.tsx`

**Acceptance Criteria:**
- [ ] File-by-file diff view
- [ ] Syntax highlighting
- [ ] Addition/deletion line counts
- [ ] Typecheck + lint pass

### Task 5.5: GitHub — Commit History

**Files:**
- Create: `src/renderer/features/git-overview/components/CommitHistory.tsx`

**Acceptance Criteria:**
- [ ] Commit list with hash, message, author, date
- [ ] Pagination / infinite scroll
- [ ] Click to view diff
- [ ] Typecheck + lint pass

---

## Sprint 6: Schema Fixes & New Backends

> Fix data model gaps and add missing IPC channels.

### Task 6.1: Progress Tasks — Add workflow/workflowPhase to rowToTask

**Problem:** Fields can be set via update but `rowToTask()` doesn't extract them.

**Files:**
- Modify: `src/main/features/progress/progress-service.ts` (add to rowToTask mapping)

**Acceptance Criteria:**
- [ ] workflow and workflowPhase included in ProgressTask returned by list/get
- [ ] Round-trip verified: set → persist → return
- [ ] Typecheck + lint pass

### Task 6.2: Planner — Persist completedGoals + Display scheduledTasks

**Problem:** completedGoals tracked in UI but not schema. scheduledTasks stored but never rendered.

**Files:**
- Modify: `src/main/features/planner/planner-service.ts` (ensure completedGoals persists)
- Modify: `src/renderer/features/personal/planner/components/DayView.tsx` (render scheduledTasks)

**Acceptance Criteria:**
- [ ] completedGoals count persists across sessions
- [ ] scheduledTasks rendered as a list/table in day view
- [ ] Typecheck + lint pass

### Task 6.3: Alert — Add linkedTo Display

**Problem:** linkedTo field stored but never shown.

**Files:**
- Modify: `src/renderer/features/personal/alerts/components/AlertsPage.tsx`

**Acceptance Criteria:**
- [ ] linkedTo shown as a clickable link/badge on alert cards
- [ ] Typecheck + lint pass

### Task 6.4: Fitness — Workout Notes Display

**Problem:** Notes stored but hidden in log view.

Already covered in Task 2.3 — skip if done.

### Task 6.5: Ideas — createdAt/updatedAt Display

Already covered in Task 2.8 — skip if done.

### Task 6.6: Multi-filter Support

**Problem:** All features only support filtering by one criterion at a time.

**Files:**
- Modify: Notes (multi-tag filter), Ideas (category + status combo), Milestones (status + date range)

**Acceptance Criteria:**
- [ ] Notes: select multiple tags to filter by
- [ ] Ideas: filter by category AND status simultaneously
- [ ] Milestones: filter by status AND date range
- [ ] Typecheck + lint pass

---

## Sprint 7: Polish & Completion

> Handle remaining stubs and polish.

### Task 7.1: Calendar Integration — Decision

**Problem:** Zero implementation. No backend, no UI.

**Decision Required:**
- [ ] If building: Define IPC channels, create service (Google Calendar API), build CalendarPanel
- [ ] If removing: Delete CalendarPanel stub, remove from integrations nav
- [ ] Document decision

### Task 7.2: Discord Integration — Decision

**Problem:** Zero implementation. UI-only stub.

**Decision Required:**
- [ ] If building: Define IPC channels, create service (Discord API), build DiscordPanel
- [ ] If removing: Delete DiscordPanel stub, remove from integrations nav
- [ ] Document decision

### Task 7.3: Tools Page — Claude Config Scanner

**Problem:** Tools page shows "No items configured" but tools actually exist in `.claude/`.

**Files:**
- Create: `src/main/features/claude/claude-config-scanner.ts` (scan .claude/ for skills, agents, commands, plugins)
- Create: `src/shared/ipc/claude/channels.ts` (LIST.SKILLS, LIST.AGENTS, LIST.COMMANDS, LIST.PLUGINS)
- Create: `src/renderer/features/tools/api/useClaudeConfig.ts` (hooks)
- Modify: `src/renderer/features/tools/components/ToolsPage.tsx` (display real data)

**Acceptance Criteria:**
- [ ] Scans project `.claude/skills/`, `.claude/agents/`, reads plugin.json files
- [ ] Displays name, description, type for each tool
- [ ] Click to view content (read-only markdown display)
- [ ] "Refresh" button to re-scan
- [ ] Typecheck + lint pass

### Task 7.4: Final Verification

- [ ] Run full typecheck: `npm run typecheck`
- [ ] Run full lint: `npm run lint`
- [ ] Run full build: `npm run build`
- [ ] Run unit tests: `npm run test:unit`
- [ ] Grep for remaining TODO/FIXME/STUB
- [ ] Grep for remaining raw HTML elements
- [ ] Re-run data flow audit on all features — verify 100% field coverage

---

## Sprint Dependencies

```
Sprint 1 ──→ Sprint 2 ──→ Sprint 3
                │              │
                ▼              ▼
           Sprint 6      Sprint 4
                │              │
                ▼              ▼
           Sprint 7      Sprint 5
```

- Sprint 1 & 2 can partially overlap (different features)
- Sprint 3 depends on Sprint 1-2 (search/filter on features that have edit capability)
- Sprint 4-5 are independent of each other
- Sprint 6 can start after Sprint 2
- Sprint 7 is the final polish sprint

---

## Estimated Effort

| Sprint | Tasks | Estimated Agent-Hours | Complexity |
|--------|-------|-----------------------|------------|
| 1 | 8 | 4-6h | Medium-High (new IPC channels + UI) |
| 2 | 8 | 3-5h | Medium (mostly UI, some IPC) |
| 3 | 7 | 2-4h | Medium (UI patterns, reusable) |
| 4 | 6 | 4-6h | High (Git UI from scratch) |
| 5 | 5 | 3-5h | Medium-High (integration UIs) |
| 6 | 6 | 2-3h | Low-Medium (fixes, small changes) |
| 7 | 4 | 2-4h | Variable (decisions needed) |

**Total: 44 tasks, ~20-33 agent-hours**
