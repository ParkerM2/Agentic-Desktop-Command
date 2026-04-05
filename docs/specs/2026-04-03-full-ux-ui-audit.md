# ADC — Full UX/UI Audit & Ideation Report

**Date:** 2026-04-03  
**App Version:** v0.1.0  
**Competitor Benchmark:** OpenCode (terminal-first AI coding assistant)  
**Goal:** Identify every gap, broken flow, and missing AI connection across all features. Then ideate on what could make each workflow more seamless, reduce clicks, and let the AI handle more for the user. This document is the foundation for systematic feature hardening.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Cross-Cutting Themes](#2-cross-cutting-themes)
3. [Security Issues](#3-security-issues)
4. [Feature Audit Reports](#4-feature-audit-reports)
   - 4.1 Dashboard
   - 4.2 My Work
   - 4.3 Agents (Global Dashboard)
   - 4.4 Workspace (Project-Scoped)
   - 4.5 Tasks
   - 4.6 GitHub
   - 4.7 Roadmap
   - 4.8 Ideation
   - 4.9 Changelog
   - 4.10 Insights
   - 4.11 Workflow Pipeline
   - 4.12 Productivity Hub
   - 4.13 Notes
   - 4.14 Planner
   - 4.15 Briefing
   - 4.16 Alerts
   - 4.17 Communications
   - 4.18 Settings
   - 4.19 Auth
   - 4.20 Onboarding
   - 4.21 Fitness
   - 4.22 Voice
   - 4.23 Screen Capture
   - 4.24 Devices
   - 4.25 Assistant Widget
5. [Ideation Pass — AI & Workflow Improvements](#5-ideation-pass)
6. [Prioritized Action Matrix](#6-prioritized-action-matrix)

---

## 1. Executive Summary

ADC is a well-architected Electron + React app that aims to be a single unified workspace replacing multiple developer tools and personal productivity apps. The codebase is clean, the component structure is solid, and the design system is applied consistently. However, a large portion of the app is **UI scaffolding without behavior** — screens exist, but buttons don't connect to Claude, forms don't persist correctly, and many features are isolated islands with no cross-feature data flow.

**The core problem: the app looks complete but doesn't act complete.**

Compared to OpenCode (which is minimal but everything it does works precisely), ADC has far richer UI but lower functional completion. The strategy must be: stop adding surface area, harden what exists, and wire Claude into every feature that can benefit from it.

**Key numbers from this audit:**
- 25 features audited
- 6 critical security issues
- 14 features with missing or broken core functionality
- 11 features with no Claude/AI integration despite clear opportunity
- 8 features where state changes are not persisted (silent data loss)
- 1 feature (Agent Dashboard) is entirely placeholder with no real data

---

## 2. Cross-Cutting Themes

These issues appear in multiple features and need a systemic fix, not feature-by-feature patches.

### 2.1 Silent Failures (Universal)
Nearly every feature has mutations (create, update, delete) that fail silently. No error toast, no inline message, no retry button. User clicks "Save" → nothing visible happens if it fails.
- **Fix:** Implement a global `useMutationWithFeedback()` wrapper that shows success toast, error toast with message, and retry option for every mutation.

### 2.2 Missing Loading States on Saves
Forms show a spinner while loading data but not while saving. User clicks Save and the button does nothing visible until the response comes back.
- **Fix:** Every submit button should show a loading spinner and disable during pending. Pattern already exists in CreateTaskDialog — replicate everywhere.

### 2.3 Destructive Actions Without Confirmation
Delete buttons exist everywhere (delete note, delete alert, delete idea, delete milestone, delete task) with no confirmation dialog.
- **Fix:** Global `useConfirmDelete()` hook with a standardized confirmation dialog. One implementation, used everywhere.

### 2.4 No Undo / No Optimistic Recovery
Once something is deleted, it's gone. No undo toast ("Idea deleted — Undo"), no recycle bin, no soft delete.
- **Fix:** Implement optimistic mutation + 5-second undo toast pattern for all delete operations.

### 2.5 Cross-Feature Data Isolation
Features are silos. Planner doesn't know about Tasks. Notes can't link to Tasks. Alerts don't connect to Planner time blocks. Briefing reads from features but nothing writes back.
- **Fix:** Define a shared context model: `activeProject`, `todayDate`, `currentUser`. Planner ↔ Tasks sync, Notes ↔ Tasks linking, Alerts ↔ Planner hooks.

### 2.6 Productivity Hub as Dead Router
The Productivity hub (`/productivity`) is a tab wrapper around features that have their own standalone routes. It adds navigation overhead but zero additional value — no cross-feature aggregation, no unified summary, no shared state between tabs.
- **Fix:** Either remove Productivity as a route (merge its tabs into sidebar) OR give it genuine value as an aggregated "personal command center" with widgets and summaries from all sub-features.

### 2.7 AI Integration Pattern Missing
Buttons like "Generate Roadmap", "Generate Briefing", "Generate Changelog", "Generate Review" exist or are implied, but there is no standard pattern for: `[User clicks Generate] → [Claude fills form] → [User reviews/edits] → [User saves]`. Each feature would need to invent this independently.
- **Fix:** Define and implement a reusable `useAIGenerate(prompt, schema)` hook that takes a generation prompt, returns structured data, populates a form, and lets the user edit before saving. All generative features use this one pattern.

### 2.8 Duplicate Routes (Confusion)
Notes, Planner, Alerts, and Briefing all exist as both standalone routes AND as Productivity hub tabs. This creates confusion about canonical paths and can cause state divergence.
- **Fix:** Pick one canonical access pattern per feature. Either standalone routes OR hub tabs, not both.

---

## 3. Security Issues

These are separate from UX issues and must be addressed before any production use.

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 Critical | Plaintext password caching | `useSavedLogins.ts` — localStorage | Remove password from saved logins; save email only. Use biometric/keychain if re-auth is needed. |
| 🔴 Critical | JWT tokens in localStorage | `useAuthStore.ts` | Move tokens to Electron `safeStorage` / `keytar`. localStorage is readable by any renderer-context code. |
| 🔴 Critical | OAuth client secrets in settings | `settings/api/useHub.ts` | Encrypt with `safeStorage` before persisting. Never store in plaintext. |
| 🟠 High | Client-side rate limiting only | `LoginPage.tsx` — React state | Rate limiting in React state is trivially bypassed. Backend must enforce; frontend is UI polish only. |
| 🟠 High | No logout button in UI | `auth/` — no component | Add user menu with logout. `useLogout()` hook exists but is not mounted anywhere. |
| 🟡 Medium | No password reset / forgot password flow | `auth/` | Implement or surface instructions to reset via Hub web portal. |

---

## 4. Feature Audit Reports

---

### 4.1 Dashboard

**Route:** `/dashboard`  
**Files:** `src/renderer/features/dashboard/`

#### What It Does
Greeting header, today's time blocks (from Planner), recent project cards, active agents list, quick capture input, daily stats row (tasks done / agents ran / captures).

#### Actions Available
- Click project card → navigate to project tasks
- "Init Wizard" / "New Project" → open dialog
- Quick capture: type + Enter → creates capture
- Delete capture → removes it
- All other widgets: read-only display

#### What's Working
- Data fetches from correct IPC channels
- Event listeners invalidate cache on changes
- Reasonable loading/empty states on each widget

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| No error states on widgets | Medium | If data fails to load, widgets show spinner indefinitely |
| ActiveAgents widget is read-only | Medium | Shows running agents but no click-through to agent detail |
| TodayView is read-only | Medium | Shows time blocks but can't add/edit from Dashboard |
| QuickCapture has no success feedback | Low | Input clears but no "Captured!" toast confirmation |
| QuickCapture mutation has no loading state | Low | Button doesn't disable/spin during pending |
| DailyStats pulls from 3 data sources with no combined error state | Low | If one fails, stats show as 0 with no explanation |
| Dashboard store is essentially empty | Low | `_initialized` flag only; no meaningful UI state |

#### Missing Features
- No "Today's priorities" section surfaced from Tasks
- No calendar event preview for the day
- No weather / location context (optional personal OS feature)
- Captures have no categorization or action — just a text dump
- No way to mark a project as "active focus" for the day

---

### 4.2 My Work

**Route:** `/my-work`  
**Files:** `src/renderer/features/my-work/`

#### What It Does
Cross-project task list grouped by project. Status filter dropdown. Shows task title, description, status badge.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Tasks are not clickable | High | Tasks render as `<div>`, no click handler, no navigation to task detail |
| No search | Medium | Can only filter by status, not by text |
| No sorting | Medium | Tasks appear in creation order |
| No bulk actions | Low | Can't select multiple tasks |
| No task creation from My Work | Low | Must navigate to a project to create a task |
| Loading state is plain text | Low | "Loading tasks..." text, no skeleton |

---

### 4.3 Agents (Global Dashboard)

**Route:** `/agents`  
**Files:** `src/renderer/features/agent-dashboard/`

#### What It Does
Intended to be a global agent monitoring dashboard with single/grid layout modes, project + status filters, and rich per-agent panels (chat, files changed, errors, task progress, QA results).

#### Critical Issue
**This entire feature uses placeholder data.** The `AgentDashboardPage` accepts an optional `agents` prop defaulting to `[]`. There is no internal data fetching. The comment in the file reads: _"Uses placeholder data until task-8 (hooks) is completed."_

The component system (panels, tabs, QA viewer, streaming) is fully built and sophisticated. It just has no data source.

#### What's Working
- Full panel component library (compact, expanded, popup)
- Tool call card rendering (Read, Edit, Write, Bash, AgentSpawn)
- QA results panel with verification suite grid
- Task progress with phases and acceptance criteria
- Streaming message accumulation with rAF debouncing
- All IPC hook definitions exist (`useAgentSessions`, `useAgentMessages`, `useAgentStream`, etc.)

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| No data integration | Critical | Entire page shows nothing; hooks exist but not wired into AgentDashboardPage |
| Feature slug derived via regex | Medium | `work/([^/]+)/` branch name parsing is fragile |
| QA suite checks hardcoded | Low | 5 check types (lint, typecheck, test, build, docs) hardcoded in array, not from data |
| Auto-scroll ignores user position | Low | Scrolls to bottom on every message regardless of whether user has scrolled up |

---

### 4.4 Workspace (Project-Scoped)

**Route:** `/projects/$projectId/agents`  
**Files:** `src/renderer/features/workspace/`

#### What It Does
Two-panel workspace: left = primary Claude session (always-on), right = team lead sessions. User can send messages to either panel. Can spawn additional team lead sessions.

#### What's Working
- Primary session panel with auto-sizing textarea
- Team lead collapse/expand
- Spawn team lead mutation
- Input draft persistence in Zustand

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Model name hardcoded | Medium | "claude-sonnet-4-6" hardcoded on line 102, not from session data |
| No error handling on `initProject` | Medium | If workspace init fails, shows "Starting..." forever with no error recovery |
| Sessions polled every 5s | Low | Should be fully event-driven via IPC push events |
| Messages depend on agent-dashboard cache | Medium | If workspace opened without visiting agent-dashboard first, messages are empty |
| No team lead metadata visible | Low | Cards show index number only, no task context or assigned work |
| No input history (up-arrow) | Low | Common UX expectation for command inputs |
| Status indicator maps all non-live states to red | Low | "Idle" and "crashed" look identical |

---

### 4.5 Tasks

**Route:** `/projects/$projectId/tasks`  
**Files:** `src/renderer/features/tasks/`

#### What It Does
AG-Grid table of project tasks with status filter chips, keyword search, expandable detail rows showing plan, QA report, subtasks, execution log, PR status. Full agent lifecycle controls (run, stop, retry, launch).

#### What's Working
- Full AG-Grid implementation with custom cell renderers
- Comprehensive IPC channel coverage
- Real-time event listeners (status changes, progress, log append)
- Task creation dialog with validation
- QA session integration

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Plan feedback not submitted | Critical | `PlanReadyPanel.tsx:71` — `void feedback;` — feedback dialog opens but discards input, `useReplanWithFeedback()` never called |
| No empty state | High | Grid shows blank when no tasks |
| No loading overlay on grid | Medium | `isLoading` flag exists but not used to show grid overlay |
| PR creation dialog exists but not exposed | Medium | `CreatePrDialog.tsx` built but no trigger button in task detail |
| Subtask list is read-only | Medium | Can view but not add/edit/delete subtasks from grid |
| TaskResultView unused | Low | Component built but never rendered in TaskDetailRow |
| `useExecuteTask()` mutation unused | Low | Exists in hooks but not called from UI; planning uses `startPlanning` + `startExecution` |
| `progress.percentage` can show "undefined%" | Low | No null guard on `task.executionProgress` |
| No pagination | Medium | All tasks load in memory; will not scale past ~500 tasks |
| No column visibility toggle | Low | All columns always visible |
| No bulk actions | Low | Cannot multi-select tasks |

---

### 4.6 GitHub

**Route:** `/projects/$projectId/github`  
**Files:** `src/renderer/features/github/`

#### What It Does
GitHub integration showing PRs, Issues, Notifications with connection status and repo selector. Can create issues, view PR detail, view notification list.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Repo selection not persisted | High | Owner/repo stored in memory only; resets on restart |
| No issue detail view | High | Click issue does nothing |
| No PR comments | High | PR detail shows description only, not comments/review thread |
| PR commit count shows "-" | Medium | Hardcoded placeholder |
| No PR merge button | Medium | Cannot merge from UI |
| No CI/CD check status | Medium | No workflow run status on PRs |
| No notification detail | Medium | NotificationList rendered but no click handler |
| No auto-refresh | Low | Must switch tabs to refresh data |
| GitHub links not clickable | Low | URLs in detail don't open browser |
| No PR search or issue filters | Low | Cannot filter beyond tab selection |

---

### 4.7 Roadmap

**Route:** `/projects/$projectId/roadmap`  
**Files:** `src/renderer/features/roadmap/`

#### What It Does
Milestone cards with internal task lists, progress tracking, status management. Stats bar showing completion rate.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| No milestone timeline view | High | No calendar or Gantt; only card list |
| Milestone tasks not linked to main Tasks | High | Roadmap has its own task list (strings only); no connection to `hub.tasks` |
| No task deletion | Medium | Can toggle completion but not delete tasks within milestones |
| No date picker UI | Medium | Raw HTML `input type="date"` |
| No empty state | Medium | Shows blank with no call-to-action when no milestones |
| No milestone detail | Low | Long descriptions truncated with no expand |
| No dependency chains | Low | Cannot mark one milestone as blocking another |
| No burndown chart | Low | No velocity tracking over time |
| No confirmation before delete | Low | Milestone deleted immediately on click |

---

### 4.8 Ideation

**Route:** `/projects/$projectId/ideation`  
**Files:** `src/renderer/features/ideation/`

#### What It Does
Idea cards with category filtering, voting, create/edit/delete. Category filter pills (Feature, Improvement, Bug, Performance).

#### Critical Issues
- `useUpdateIdea()` is imported in `IdeaEditForm.tsx` but **does not exist** in `api/useIdeas.ts`. Edit modal is entirely broken.
- `useVoteIdea()` hook is missing from `api/useIdeas.ts`. Upvote button has no actual implementation.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Edit mutation missing | Critical | `useUpdateIdea()` not exported; edit is completely non-functional |
| Vote mutation missing | Critical | `useVoteIdea()` not exported; upvote does nothing |
| No idea status lifecycle | High | Ideas have no "accepted", "rejected", "in progress", "shipped" states |
| No idea-to-task conversion | High | Cannot convert idea into a Task |
| No delete confirmation | Medium | Idea deleted immediately |
| No idea search | Medium | Only category filter, no text search |
| No idea detail/expand view | Medium | Card shows truncated description only |
| No sort by votes | Low | Ideas appear in creation order |
| Vote state not shown | Low | No "I voted" indication per idea |

---

### 4.9 Changelog

**Route:** `/projects/$projectId/changelog`  
**Files:** `src/renderer/features/changelog/`

#### What It Does
Generate changelog entries from git history (repo path + version + optional from-tag), preview editable categories (Added/Changed/Fixed/Removed), save as versioned entry. Timeline view of saved entries.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| No manual entry creation | High | Must use git generation; cannot write entries by hand |
| No post-save editing | High | Once saved, entries cannot be edited |
| No entry deletion | High | Cannot remove a published entry |
| From-tag requires manual input | Medium | No UI to list available git tags |
| Path input requires full filesystem path | Medium | No file picker |
| No duplicate version detection | Medium | Can create two entries for same version |
| No draft autosave | Medium | Closing generate dialog loses all work |
| No markdown rendering in timeline | Low | Entries displayed as plain text, not formatted |
| No AI writing assistance | Low | Categories generated from commits but no prose polish |

---

### 4.10 Insights

**Route:** `/projects/$projectId/insights`  
**Files:** `src/renderer/features/insights/`

#### What It Does
Static metrics display: task completion rate, agent run count, success rate, active agents. Task status distribution bars. Project breakdown bars.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| No time-series data or trends | High | Snapshots only; no "this week vs last week" |
| No drill-down | High | Cannot click status bar to see tasks in that status |
| No charts or graphs | High | All data as text + horizontal bars; no visualizations |
| No date range selector | Medium | Cannot filter by time period |
| No cost breakdown | Medium | No per-task or per-agent cost visualization |
| No export | Low | Cannot export metrics to CSV/PDF |
| Color vars potentially unresolved | Low | Uses `--ring`, `--destructive` CSS vars; may not render in all themes |

---

### 4.11 Workflow Pipeline

**Route:** `/projects/$projectId/workflow`  
**Files:** `src/renderer/features/workflow-pipeline/`

#### What It Does
7-step visual pipeline (Backlog → Planning → Plan Ready → Queued → Running → Review → Done) with per-step panels. Task selector to pick which task to view. Each panel surfaces relevant controls for that phase.

#### Critical Issue
**Request Changes feedback is discarded.** `PlanReadyPanel.tsx:71` — `void feedback;`. The feedback dialog opens, user types changes, clicks submit — and the feedback is thrown away. `useReplanWithFeedback()` hook exists but is never called.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Feedback dialog does nothing | Critical | `void feedback;` at line 71 |
| Manual step click can desync state | High | Clicking any step updates selectedStep in store but not task actual state; UI and reality diverge |
| No "jump to current step" button | Medium | If task is Running but user clicked Review, no way back without knowing state |
| Task selector not scoped to project | Medium | Shows all tasks across all projects |
| No step validation on click | Medium | Should only allow clicking steps ≤ current task status |
| No subtask management | Medium | Running panel shows subtasks but cannot add/edit/delete |
| No parallel execution | Low | Cannot run multiple tasks in the pipeline view |
| No step timing | Low | Doesn't show how long each step took |

---

### 4.12 Productivity Hub

**Route:** `/productivity`  
**Files:** `src/renderer/features/productivity/`

#### What It Does
Tab container with 8 tabs (Overview, Calendar, Spotify, Briefing, Notes, Planner, Alerts, Comms). Overview shows Calendar + Spotify widgets side-by-side. All other tabs embed the full feature page component.

#### Core Problem
**The Productivity Hub adds zero value.** It is a navigation wrapper around features that all have standalone routes. The "Overview" tab shows two widgets without aggregating anything meaningful. There is no cross-feature data sharing between tabs, no shared context, and no summary view that would make this hub worth navigating to.

Additionally, having features accessible via `/notes` AND `/productivity/notes` creates route duplication and browser history pollution.

#### Verdict
Either: (A) Give Productivity Hub genuine aggregation value — make it a true personal dashboard with glanceable summaries from all sub-features. Or (B) Remove it entirely and fold the sub-features into the sidebar directly. As it stands it is pure overhead.

---

### 4.13 Notes

**Route:** `/notes` (also: Productivity > Notes tab)  
**Files:** `src/renderer/features/notes/`

#### What It Does
Two-pane note editor: left panel with list (search, tag filter, new button), right panel with title/tags/content editor. Save, pin, delete per note.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| No error state on save failure | Medium | Silent failure if `notes.update` IPC fails |
| No "unsaved changes" indicator | Medium | User can close editor without warning if edits not saved |
| No delete confirmation | Medium | Note deleted immediately on click |
| No rich text / markdown | Medium | Plain textarea only |
| Tag input doesn't autocomplete | Low | Cannot see existing tags while typing |
| `isEditing` state set but never used | Low | Store field never read in component |
| No keyboard shortcuts | Low | No Ctrl+S to save, etc. |
| No project context on notes | Low | Notes have `projectId` in API but UI doesn't show/filter by project |

---

### 4.14 Planner

**Route:** `/planner`, `/planner/weekly` (also: Productivity > Planner tab)  
**Files:** `src/renderer/features/planner/`

#### What It Does
Daily planner with time blocks, goals list, daily reflection. Week view with stats and weekly reflection. Calendar overlay showing Google Calendar events.

#### Critical Bug
**Goal completion checkboxes do not persist.** Marking a goal complete updates UI state only. On page refresh, all goals show as incomplete regardless of what was checked. (`GoalsList.tsx` — completion toggled in component state, not sent to backend.)

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Goal completion not persisted | Critical | UI-only state; data loss on refresh |
| No planner ↔ Tasks sync | High | Planner has its own "goals" (plain strings), disconnected from structured tasks |
| No error feedback on mutations | Medium | Silent failures on block add/edit/delete |
| Time block editor blocks sequential creation | Medium | "Add Block" disappears while editor open; can't add multiple in sequence |
| No drag/drop for time blocks | Medium | Must edit to change times |
| Calendar overlay toggle non-obvious | Low | Button changes to blue when enabled but no label change |
| Weekly stats don't roll up from daily goals | Low | Goals completed daily don't aggregate to week view |
| No recurring time block templates | Low | Must re-create recurring events manually |

---

### 4.15 Briefing

**Route:** via Productivity > Briefing tab only  
**Files:** `src/renderer/features/briefing/`

#### What It Does
Daily AI-generated briefing showing task summary stats, agent activity, GitHub notification count, and AI-generated suggestions. Generate Now button triggers regeneration.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Config hooks exist but are never called | High | `useBriefingConfig` / `useUpdateBriefingConfig` defined but not wired to any UI |
| Suggestion actions don't deep-link | Medium | "Blocked task" suggestion navigates to `/my-work` not to the specific task |
| No history of past briefings | Medium | Previous briefings lost; no archive |
| No auto-refresh | Medium | Stale after 5 min but never auto-regenerates |
| No markdown rendering in summary | Low | Summary is plain text string |
| Magic number in warning threshold | Low | `dueToday > 5` shows warning — unexplained constant |
| `renderContent()` function returns null | Low | Line 104 returns `null` inside a function that's never the actual render path — dead code |
| Briefing only accessible via Productivity hub | Low | No standalone route for a feature this prominent |

---

### 4.16 Alerts

**Route:** `/alerts` (also: Productivity > Alerts tab)  
**Files:** `src/renderer/features/alerts/`

#### What It Does
Alert CRUD with 3 tabs (Active, Dismissed, Recurring). Create modal with alert type selector, natural language time input, and manual datetime fallback. Real-time alert triggering via IPC events.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Client-side NLP parsing is naive | High | Checks for `"every "` keyword only; all other formats passed to backend with "will be parsed on creation" message — user has no confidence parsing will work |
| Cannot edit recurring alerts | High | Must delete and recreate |
| Notification rules not persisted | High | Stored in Zustand only; lost on app restart |
| No snooze functionality | Medium | Dismiss is permanent; no "remind me in 15 min" |
| No delete confirmation | Medium | Alert deleted immediately |
| No bulk dismiss/delete | Low | Must dismiss one at a time |
| No alert priority levels | Low | All alerts look the same regardless of urgency |
| Alert type distinction unclear | Low | "Reminder" vs "Notification" — no explanation of difference |
| No Alerts ↔ Planner integration | Low | Could auto-create alert when a time block is approaching |

---

### 4.17 Communications

**Route:** `/communications` (also: Productivity > Comms tab)  
**Files:** `src/renderer/features/communications/`

#### What It Does
Slack and Discord action panels (send message, read channel, search, set status). Action modals. Notification rule management. MCP server bridge for executing Slack/Discord tool calls.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Notification rules not persisted | Critical | Zustand only; all rules lost on restart |
| Status shows "disconnected" on startup | High | Default is hardcoded; real status only fetched on event |
| Both services forced to same connection state | High | Hub connection event sets both Slack and Discord to same status regardless of individual service state |
| No message history | High | Can execute actions but no record of what was done |
| MCP result shown as raw text | Medium | Unformatted JSON/multi-line responses in modal |
| No loading state on action submit | Medium | Submit button doesn't disable/spin during execution |
| Discord "Call User" has no user picker | Medium | Action exists but UI has no way to select target user |
| Emoji picker missing for set_status | Low | Requires Slack emoji format (`:house:`) but no helper |
| Modal result disappears on close | Low | No persistent log of executed actions |

---

### 4.18 Settings

**Route:** `/settings`, `/settings/themes`  
**Files:** `src/renderer/features/settings/`

#### What It Does
6-tab settings page: Display (theme, scale, font), Profile (Claude Code API profiles), Hub (connection), Integrations (Claude Code auth, GitHub, OAuth), Storage (usage, cleanup, retention), Advanced (webhooks, hotkeys, voice, about).

#### What's Working
- All major settings persist via IPC
- Hub connection form with validation
- Storage usage visualization and retention controls
- OAuth provider credential entry

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Language selector is hardcoded stub | Medium | "English — Only language available" label; no actual i18n |
| Theme Editor exists but not linked | Medium | Full `theme-editor/` component tree built; not accessible from Settings Display tab |
| OAuth secrets stored plaintext | High | No encryption layer (see Security section) |
| No "Run Setup Again" button | Low | Once onboarding is done, no way to re-run from Settings |
| Profile tab confusing naming | Low | "Profiles" sounds like user accounts; actually Claude Code API key profiles |
| No save confirmation feedback | Low | Settings save silently; user unsure if change persisted |

---

### 4.19 Auth

**Route:** `/login`, `/register`, `/hub-setup`  
**Files:** `src/renderer/features/auth/`

#### What's Working
- Rate limiting (UI-side): 5 failed attempts → 30s cooldown with countdown
- Saved login badges with remove button
- Form validation with TanStack Form + Zod
- Token auto-refresh

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Password cached in localStorage | Critical | `useSavedLogins` saves plaintext email + password |
| JWTs in localStorage | Critical | No Electron secure storage |
| No logout button anywhere in app | High | `useLogout()` exists but no UI calls it |
| No password reset flow | High | No "Forgot password" link or mechanism |
| Rate limiting is client-side only | Medium | React state; trivially bypassed via DevTools |
| No email verification | Low | Registration succeeds without email confirmation |

---

### 4.20 Onboarding

**Route:** Shows after registration  
**Files:** `src/renderer/features/onboarding/`

#### What It Does
4-step wizard: Welcome → Claude CLI auth → GitHub auth → Complete. Progress dots indicator. Skip available on auth steps.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| No "skip all" option | Medium | Must advance through steps even to skip |
| Slack/Google integrations deferred | Medium | "Configure in Settings" message on integrations step; no guidance |
| Claude CLI install check missing | Medium | Tries to launch auth without checking if CLI installed |
| No way to re-run onboarding | Low | No "Run Setup Wizard Again" in Settings |
| "Launch ADC" button behavior unclear | Low | No visual feedback on what clicking it does (presumably closes wizard) |

---

### 4.21 Fitness

**Route:** `/fitness`  
**Files:** `src/renderer/features/fitness/`

#### What It Does
4-tab fitness tracker: Overview (recent workouts + stats), Workouts (log workout form), Body (composition tracking), Goals.

#### What's Working
- WorkoutForm is comprehensive (exercise/set management, dynamic fields)
- Workout logging via IPC

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Body Composition tab — unknown state | High | Component exists; functionality unclear from audit |
| Goals tab — unknown state | High | Component exists; functionality unclear from audit |
| StatsOverview — unknown state | Medium | Unknown if showing real data or placeholder |
| No visualization | Medium | No progress charts or trend graphs |
| No exercise library | Low | Exercises typed from scratch each time |
| No workout templates | Low | Common routines not saveable |
| No AI integration | Low | No "suggest today's workout" or "rest day?" recommendation |

---

### 4.22 Voice

**Files:** `src/renderer/features/voice/`

#### What It Does
Speech-to-text via Web Speech API (VoiceButton). Text-to-speech for assistant responses (VoiceSettings + useSpeechSynthesis). Integrated into assistant widget input and settings.

#### What's Working
- Push-to-talk and continuous modes
- Language selection
- TTS for assistant responses (with 200-char truncation)
- Permission detection + warning

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Voice commands not implemented | High | Transcription only; no "create task", "set reminder" via voice |
| VoiceButton only in assistant input | Medium | Not available globally or in other inputs |
| TTS toggle not in VoiceSettings | Low | Toggle exists only in WidgetPanel; not in settings UI |
| Language change requires new recording | Low | Not hot-swappable; must restart recording |
| Voice selection from list not possible | Low | Lists available voices but user cannot select preferred voice |

---

### 4.23 Screen Capture

**Files:** `src/renderer/features/screen/`

#### What It Does
Source picker (screens + windows with thumbnails), capture button. Returns file path of screenshot.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Captured screenshot not displayed | High | `imagePath` returned via IPC but no viewer UI |
| No "send to assistant" action | High | Screenshot taken but cannot attach to assistant conversation |
| No clipboard copy | Medium | Cannot copy screenshot to clipboard |
| No annotation | Low | Cannot mark up screenshot |
| No global keyboard shortcut | Low | Only accessible when ScreenshotButton is rendered in UI |

---

### 4.24 Devices

**Files:** `src/renderer/features/devices/`

#### What It Does
API hooks for listing, registering, and updating devices. Part of Hub cross-device sync infrastructure.

#### Status
**No UI component exists.** This is backend-only infrastructure with no user-facing management screen. The feature registers devices automatically but users cannot see, name, or remove devices.

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| No UI at all | High | User cannot see registered devices |
| No device management | High | Cannot remove old/stale devices |
| No device naming | Low | Cannot give devices friendly names |

---

### 4.25 Assistant Widget

**Trigger:** Cmd/Ctrl+J global shortcut, or floating FAB button  
**Files:** `src/renderer/features/assistant/`

#### What It Does
Floating chat panel (right-bottom). Text input with voice transcription. Quick action buttons (New Note, New Task, Run Agent, Remind Me). Response history. TTS for responses. Active project context passed with each command.

#### What's Working
- Global keyboard shortcut toggle
- Voice input integration
- Real-time thinking/response events
- Error response display
- TTS output with speech cancellation

#### Gaps & Broken Things
| Issue | Severity | Detail |
|-------|----------|--------|
| Quick actions don't execute | Critical | "New Note" / "New Task" / "Run Agent" / "Remind Me" buttons insert text into input; they do NOT create notes, tasks, or reminders directly |
| Assistant cannot perform UI actions | High | Can only chat; cannot create/update records in any feature |
| `ResponseStream` component is unused | Medium | Different from `WidgetMessageArea` but never rendered; dead code |
| Hotkey not visible anywhere in UI | Medium | Cmd+J only discoverable if user reads docs or stumbles upon it |
| Quick actions are hardcoded strings | Low | Not configurable; cannot add custom shortcuts |
| TTS truncated at 200 chars | Low | Long responses cut off with "... see full response in chat" |
| No retry on error responses | Low | Failed responses shown but cannot be re-sent |

---

## 5. Ideation Pass

> For each feature: what would make the workflow more seamless? How could AI reduce clicks and handle more for the user? What cross-feature connections would eliminate context switching?

---

### 5.1 Dashboard — From Landing Page to Mission Control

**Current:** Greeting + recent projects + agents + capture + stats. Mostly read-only.

**Ideation:**
- **AI Daily Briefing Widget:** On open, automatically shows a 3-sentence AI summary: "You have 2 tasks running, 1 blocked. A PR from yesterday is awaiting review. Your 10am focus block starts in 20 minutes." No click required — auto-generated from cross-feature data.
- **Smart Quick Capture:** When user types a capture, AI classifies it: "This sounds like a task — add it to [Project Name]?" / "This sounds like a reminder — set an alert for tomorrow?" User gets a 1-click confirm, not a multi-step flow.
- **Today's Priorities Section:** AI selects top 3 tasks from all projects based on status, due date, and agent activity. User can dismiss/reorder. Eliminates need to visit My Work every morning.
- **Active Agent Clickthrough:** Clicking an agent in the ActiveAgents widget opens the Workspace for that project inline — no navigation required.
- **Calendar Day Preview:** Show today's time blocks AND calendar events merged in one timeline view. Click a block to navigate to Planner.
- **Workout/Fitness Nudge:** If a workout is planned for today (from Planner or Fitness), show a small card. One click to log it.

**Click Reduction:** Morning flow could be: open app → read dashboard → 0-2 clicks to start the day.

---

### 5.2 My Work — From Read-Only List to Action Hub

**Current:** Read-only task list with no click interaction.

**Ideation:**
- **Task click → inline expand:** Click a task to expand it in-place with quick actions (Open Workspace, View in Pipeline, Mark Done). No navigation away.
- **AI priority sort:** "Sort by AI Priority" option that ranks tasks by: blockers, due date, agent readiness, and user activity patterns.
- **Group by AI-inferred theme:** AI groups tasks by detected theme (bug fixes, features, refactors) not just by project.
- **One-click "Start Working":** Each task gets a "Start" button that navigates directly to its Workspace, pre-selected.

---

### 5.3 Agents Dashboard — Wire It Up, Then Make It Intelligent

**Current:** Beautiful UI, zero data.

**Ideation (after wiring data):**
- **Agent health summary header:** Single-line aggregate: "3 running, 1 needs attention, 2 completed today."
- **Proactive alerts:** If an agent has been in `needs-attention` state for >10 min, surface a dismissable toast with quick action.
- **AI explain errors:** "Explain Error" button on ErrorsTab → sends error context to Claude → gets plain-English explanation + suggested fix.
- **One-click re-prompt:** If agent is stuck in `needs-attention`, pre-fill a message with context ("The agent paused at X — would you like to continue?") and send with one click.

---

### 5.4 Workspace — Reduce Cold Start Friction

**Current:** User must know what to ask Claude. No context pre-loaded.

**Ideation:**
- **Context Brief on Open:** When workspace opens for a project, auto-generate and display: "Last worked on: [branch]. Open tasks: 2. Latest PR: awaiting review." User sees what's happening before typing.
- **Suggested Prompts:** Based on active task state, suggest: "Continue where you left off", "Review the plan for Task #3", "Check what changed since yesterday."
- **Voice Input on Workspace:** Voice button available in primary input; user can dictate instructions.
- **Keyboard history:** Up-arrow recalls previous messages. Standard terminal UX expectation.

---

### 5.5 Tasks — Generate Plans, Surface Feedback

**Current:** Plan feedback input exists but discards data. No AI assistance in task creation.

**Ideation:**
- **Fix Feedback First:** Wire `PlanReadyPanel` to `useReplanWithFeedback()`. This is the highest-ROI fix — it completes an already-built flow.
- **AI Task Description Generator:** When creating a task, user types a title, clicks "Expand with AI" → Claude generates a detailed description and acceptance criteria. User edits and saves.
- **AI Subtask Breakdown:** Button on task detail: "Break into subtasks" → Claude generates 3-6 subtasks from description. User approves.
- **Smart status transitions:** When agent completes work, auto-prompt: "Mark this task as Done?" with one-click confirm.
- **Effort estimation:** AI estimates time based on description + historical data from Insights.

---

### 5.6 GitHub — From Viewer to Active Participant

**Current:** Read-only for most things. Issue creation is the only write action.

**Ideation:**
- **AI PR Summary:** Click PR → Claude generates "This PR does X, changes Y files, risks Z" in plain English. No reading the description needed.
- **AI Review Checklist:** "Start Review" button generates a review checklist from the PR diff/description.
- **Stale PR alert:** Surface PRs >7 days old with no activity in Dashboard or Briefing.
- **Link PR to Task:** One-click to associate a PR with an open task. Populates task's PR status automatically.
- **Persist repo selection:** Trivial fix with huge daily-use impact.

---

### 5.7 Roadmap — Generate From Tasks, Track Velocity

**Current:** Manual milestone creation with internal task strings. No connection to real tasks.

**Ideation:**
- **AI Generate Roadmap:** User describes the project goal → Claude generates milestone breakdown with titles, descriptions, and suggested target dates. User adjusts dates and saves. One click, not 30 minutes of planning.
- **Sync milestone tasks with real tasks:** When a milestone task is checked, optionally create a corresponding `hub.task`. Keep them linked bidirectionally.
- **Timeline view:** Horizontal scroll or Gantt-style view with milestones plotted against calendar.
- **Velocity indicator:** Based on completion rate, show "at this pace, complete by [date]".

---

### 5.8 Ideation — AI-Powered Brainstorm Partner

**Current:** Broken edit/vote. No AI involvement.

**Ideation (after fixing broken mutations):**
- **AI Idea Expander:** After submitting an idea title, Claude generates: full description, potential impact, implementation approach, similar existing ideas. User edits before saving.
- **AI Idea Evaluator:** "Evaluate" button → Claude scores ideas on: feasibility, impact, alignment with project goals. Presents summary with recommendation.
- **Convert Idea to Task:** Button on idea card → Claude generates a task description from the idea → creates task in current project with one confirm.
- **Duplicate Detection:** On idea creation, Claude checks if similar idea already exists and warns.
- **Group by Theme:** AI groups ideas by detected theme (performance, UX, feature). Auto-tags on creation.

---

### 5.9 Changelog — AI-Authored Release Notes

**Current:** Git log parsing into categories. Manual path entry. No editing after save.

**Ideation:**
- **AI Commit Classifier:** Instead of raw category buckets, Claude reads commit messages and writes user-facing descriptions. "feat: add retry logic for API calls" → "Added automatic retry for failed API calls — improves reliability."
- **One-click from current project:** Since project path is known (active project), pre-fill repo path automatically. Remove the "enter path" step entirely.
- **Tag selector from git:** Show dropdown of actual git tags rather than text input.
- **Edit after save:** Unlock editing of saved entries. High-frequency need.
- **Preview rendering:** Show markdown preview of generated entry before saving.

---

### 5.10 Insights — From Metrics to Intelligence

**Current:** Static snapshot cards and bar charts.

**Ideation:**
- **AI Narrative Summary:** "In the past week, you completed 12 tasks across 3 projects. Your success rate dropped 15% — mostly from Task #7 which had 4 restarts. Consider breaking large tasks into smaller units."
- **Anomaly Detection:** Surface when success rate drops significantly or cost spikes unusually.
- **Trend Lines:** Weekly sparklines on each stat card.
- **Drill-down:** Click "Done: 12" → filtered task list of those 12 tasks.
- **Cost attribution:** Per-project and per-agent cost breakdown over time.

---

### 5.11 Workflow Pipeline — Make It the Primary Work Interface

**Current:** Visual, but feedback is discarded. Step clicks can desync state.

**Ideation:**
- **Fix Feedback Now:** The pipeline's value prop is "human in the loop on AI plans." Currently the loop is broken. Fixing `PlanReadyPanel` feedback is the #1 priority here.
- **Contextualize Planning Panel:** While agent is planning, show the conversation in real-time (stream messages). User can inject guidance mid-plan.
- **Smart step locking:** Disable steps that the task hasn't reached yet. Visual lock icon on future steps.
- **Time annotations on steps:** Show "Planning: 2m 14s" beneath completed steps.
- **Checkpoint browser:** Show list of checkpoints for "Restart from Checkpoint". User chooses which checkpoint, not just the latest.

---

### 5.12 Notes — AI-Augmented Knowledge Base

**Current:** Plain textarea CRUD. No AI, no links, no rich text.

**Ideation:**
- **AI Summarize:** Button → Claude summarizes a long note in 3 bullets. Appended as collapsible section.
- **Auto-Tag:** On save, Claude suggests tags from note content. User clicks to apply.
- **Link to Task/Project:** When note mentions a project name or task title, surface a link chip. Linking creates a backlink.
- **Daily Note Template:** "Create Today's Note" button pre-fills template with date, space for goals, tasks, reflections. Auto-linked to today in Planner.
- **Capture → Note Promotion:** Any Quick Capture can be expanded into a Note with one click.

---

### 5.13 Planner — AI Daily Plan Builder

**Current:** Manual time block entry. Goals not persisted on check.

**Ideation (after fixing goal persistence bug):**
- **AI Day Planner:** "Plan My Day" button → Claude looks at: open tasks, calendar events, unfinished goals from yesterday, and fitness goals → generates a suggested time block schedule → user adjusts and confirms.
- **Smart Time Block Suggestions:** When adding a block, type "code review" and AI suggests: "Focus block, 1 hour, 9-10am (before your 10am meeting)."
- **Overcommit Warning:** If total planned time exceeds available time, AI flags it.
- **Daily goals from tasks:** "Import tasks as goals" button → pulls top N open tasks as today's goals automatically.
- **Planner ↔ Alerts:** Time block starting in 5 minutes → auto-triggers alert.

---

### 5.14 Briefing — True AI Morning Briefing

**Current:** Claude-generated but config disconnected, suggestions don't deep-link.

**Ideation:**
- **Fix Config UI:** Wire `useBriefingConfig` to a visible settings panel in the briefing. Let user configure: what sections to include, notification time, verbosity.
- **Personalized tone:** Config option for briefing style: "executive summary" vs. "detailed rundown" vs. "casual check-in."
- **Deep-link suggestions:** "Blocked task" suggestion → opens task in Pipeline at the exact step. Never navigate to /my-work and search.
- **Auto-refresh on morning open:** If briefing is >4 hours old and it's before noon, auto-regenerate on open.
- **Briefing history:** Archive last 7 days of briefings. User can review.

---

### 5.15 Alerts — Smart Scheduling

**Current:** Naive NLP, no editing of recurring alerts, rules not persisted.

**Ideation:**
- **AI Time Parsing:** Replace naive client-side parsing with Claude: user types "remind me when the standup is likely over" → Claude infers time from calendar events → shows "Alert set for 9:45am." Transparent, not a black box.
- **Snooze:** Dismiss + snooze in one gesture. "Remind in 15 min / 1 hour / tomorrow morning."
- **Alert from task:** Task due date or deadline → one-click to create alert. Currently disconnected.
- **Alert from calendar event:** "Remind me 10 min before [Event Name]" — pre-filled from calendar.
- **Persist rules to backend:** Notification rules must survive app restarts.

---

### 5.16 Communications — From Manual to Ambient

**Current:** Manual MCP tool execution via modals. Rules not persisted. Status unreliable.

**Ideation:**
- **AI Message Drafting:** "Draft message about [task/PR]" → Claude generates a Slack message summarizing the relevant context. User reviews and sends.
- **Persist notification rules to backend:** This is table stakes. Zustand-only is broken-by-design.
- **Action history log:** Every MCP action (send, read, search) logged with timestamp and result. Visible in a history tab.
- **Real connection status:** On open, actively check each service's OAuth token validity. Show "token expired" not "disconnected" when appropriate.
- **Briefing integration:** Daily briefing includes Slack unread count and priority messages if configured.

---

### 5.17 Fitness — Personal Trainer in Pocket

**Current:** Workout logging form. Other tabs likely placeholder.

**Ideation:**
- **AI Workout Suggestion:** Based on logged history, suggest today's workout: "You haven't trained legs in 4 days. Here's a 30-min strength routine." User can modify and log.
- **Dashboard nudge:** If workout is planned for today, Dashboard shows "Workout planned: 6pm — [Log Now]."
- **Planner integration:** Fitness block in Planner links to Fitness tab. One-click to log from the time block.
- **Progress charts:** Strength/cardio trends over time. Weight lifted over N weeks.
- **Goal tracking:** Set a goal (run 5k by June) and see progress toward it.

---

### 5.18 Assistant Widget — Make Quick Actions Actually Work

**Current:** Buttons insert text. Claude responds with text. No actions.

**Ideation — This is the most impactful item in the entire app:**
- **Quick Actions must execute:** "New Note" → opens Notes feature with a new note ready to type. "New Task" → opens CreateTaskDialog pre-filled. "Set Reminder" → opens Alerts create modal. "Run Agent" → spawns agent in active project workspace. These are 1-click actions, not conversation starters.
- **Context-aware suggestions:** When user is on the Roadmap page, quick actions show "Generate Milestone" and "Add Task to Roadmap." Context adapts per page.
- **Inline form filling:** User says "create a task to fix the login bug in auth module" → Claude fills CreateTaskDialog with title, description, and suggested priority. User sees pre-filled form, edits, clicks Create.
- **Page-aware commands:** "summarize this page" → Claude reads visible data and gives a summary. "what's overdue?" → Claude queries tasks and responds.
- **Voice commands:** "Set a reminder for 3pm" via voice → Alert created. No typing.

---

## 6. Prioritized Action Matrix

> Organized by impact and effort. P0 = fix before anything else. P1 = core feature hardening. P2 = AI integration. P3 = polish and enhancement.

### P0 — Critical Fixes (Security & Data Loss)

| # | Feature | Issue | Fix |
|---|---------|-------|-----|
| P0-1 | Auth | Password cached in localStorage | Remove password from `useSavedLogins`; email only |
| P0-2 | Auth | JWTs in localStorage | Move to Electron `safeStorage` |
| P0-3 | Auth | No logout button in UI | Add to user menu / Settings |
| P0-4 | Planner | Goal completion not persisted | Send `handleGoalsUpdate()` on checkbox toggle |
| P0-5 | Workflow Pipeline | Feedback dialog discards input | Wire `PlanReadyPanel` to `useReplanWithFeedback()` |
| P0-6 | Ideation | Edit mutation missing | Export `useUpdateIdea()` from `api/useIdeas.ts` |
| P0-7 | Ideation | Vote mutation missing | Export `useVoteIdea()` from `api/useIdeas.ts` |
| P0-8 | Communications | Notification rules lost on restart | Persist rules via IPC to main process |

### P1 — Core Feature Hardening

| # | Feature | Issue | Fix |
|---|---------|-------|-----|
| P1-1 | Agent Dashboard | No data integration | Wire `useAgentSessions()` into `AgentDashboardPage` |
| P1-2 | Tasks | Empty state missing | Add "No tasks yet" empty state to grid |
| P1-3 | My Work | Tasks not clickable | Add click handler + navigate to task in Pipeline |
| P1-4 | GitHub | Repo not persisted | Save to localStorage on change |
| P1-5 | GitHub | Issue detail missing | Add expandable issue detail panel or modal |
| P1-6 | Changelog | No manual entry | Add "New Entry" button bypassing git generation |
| P1-7 | Changelog | No post-save editing | Enable edit mode on saved entries |
| P1-8 | Roadmap | No empty state | Add "Create your first milestone" call-to-action |
| P1-9 | Alerts | Cannot edit recurring | Add edit mode for recurring alert rules |
| P1-10 | All | Silent save failures | Global `useMutationWithFeedback()` wrapper |
| P1-11 | All | Destructive actions | Global `useConfirmDelete()` dialog |
| P1-12 | Workspace | Model name hardcoded | Read from session data |
| P1-13 | Workspace | Init error not surfaced | Add error state + retry on `workspace.initProject` |
| P1-14 | Briefing | Config never wired | Add config section to briefing or Settings > Advanced |
| P1-15 | Devices | No UI | Add simple device list in Settings > Profile |
| P1-16 | Screen Capture | No screenshot viewer | Show captured image in a modal after capture |

### P2 — AI Integration

| # | Feature | Opportunity |
|---|---------|-------------|
| P2-1 | Dashboard | AI daily brief widget (aggregated from all features) |
| P2-2 | Dashboard | Smart quick capture classification (task vs reminder vs note) |
| P2-3 | Assistant | Quick actions must execute real UI actions, not insert text |
| P2-4 | Assistant | Page-aware context: suggestions adapt to current route |
| P2-5 | Tasks | "Expand description with AI" on task creation |
| P2-6 | Tasks | "Break into subtasks" AI generator |
| P2-7 | Roadmap | "Generate Roadmap" button → Claude creates milestone breakdown |
| P2-8 | Ideation | "Expand idea" → Claude writes description + approach |
| P2-9 | Ideation | "Convert to task" → Claude creates task from idea |
| P2-10 | Changelog | AI-authored descriptions from commit messages |
| P2-11 | GitHub | AI PR summary on open |
| P2-12 | Planner | "Plan my day" → Claude builds schedule from tasks + calendar |
| P2-13 | Notes | Auto-tag suggestions on save |
| P2-14 | Notes | Summarize note button |
| P2-15 | Insights | AI narrative summary of metrics |
| P2-16 | Fitness | AI workout suggestion based on history |
| P2-17 | Briefing | Deep-link suggestions to exact task/PR |
| P2-18 | Alerts | AI time parsing via Claude (replace naive regex) |
| P2-19 | Communications | AI message drafting for Slack/Discord |
| P2-20 | Workspace | Context brief on project open |

### P3 — Polish & Enhancement

| # | Feature | Improvement |
|---|---------|-------------|
| P3-1 | Productivity Hub | Either give it real aggregated value OR remove it |
| P3-2 | Dashboard | Calendar event preview for today |
| P3-3 | My Work | Search by text, not just status filter |
| P3-4 | Tasks | Pagination for large task sets |
| P3-5 | Tasks | PR creation dialog exposed in task detail |
| P3-6 | GitHub | CI/CD status on PR cards |
| P3-7 | Roadmap | Timeline / Gantt view |
| P3-8 | Insights | Time-series trend lines on stat cards |
| P3-9 | Insights | Drill-down to filtered task list |
| P3-10 | Notes | Markdown rendering (not plain textarea) |
| P3-11 | Notes | Note ↔ Task linking |
| P3-12 | Planner | Recurring time block templates |
| P3-13 | Planner | Planner → Alerts integration (approaching block alert) |
| P3-14 | Voice | Global voice commands that execute UI actions |
| P3-15 | Screen Capture | "Send to assistant" after capture |
| P3-16 | All | Keyboard shortcut system (Ctrl+S to save, etc.) |
| P3-17 | Settings | Link to Theme Editor from Display tab |
| P3-18 | Onboarding | "Run Setup Again" button in Settings |
| P3-19 | Agent Dashboard | "Explain Error" → Claude explains in plain English |
| P3-20 | Workspace | Suggested prompts on open based on task state |

---

*Total items: 8 P0 (critical) + 16 P1 (core hardening) + 20 P2 (AI integration) + 20 P3 (polish) = 64 actionable items*

*Next step: review this document, confirm priorities, then begin systematic feature hardening starting with P0 items.*
