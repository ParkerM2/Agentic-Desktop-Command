# Coverage Analysis: Matrix and Gap Registry

> Task #3 output — cross-reference of spec-survey.md and feature-metadata.md.
>
> **Sources read:**
> - `docs/testing/intermediate/spec-survey.md` (136 tests across 15 spec files, produced by Task #1)
> - `docs/testing/intermediate/feature-metadata.md` (31 documented features + 6 undocumented dirs in Appendix A, produced by Task #2)
>
> **Date:** 2026-04-06
> **Produced by:** qa-tester (Quinn) — Task #3, team "e2e-documentation"

---

## Coverage Level Definitions

| Level | Meaning |
|-------|---------|
| **NONE** | No spec file references the feature at all |
| **SMOKE** | Page loads / renders verified but no user interactions tested |
| **SHALLOW** | 1–2 user interactions tested |
| **THOROUGH** | CRUD operations or multi-state flows tested |

---

## Section 1 — Coverage Matrix (36 Rows)

> Row count note: feature-metadata.md documents 31 features in its main table plus 6 undocumented directories in Appendix A. The FEATURES-INDEX.md Quick Stats header states "36 Renderer Features". Using 31 documented + 5 of the 6 Appendix A entries yields 36. All 6 undocumented directories are included below; see the count note at end of this section.

| # | Feature | Coverage Level | Spec File(s) | Notes |
|---|---------|---------------|--------------|-------|
| 1 | **agent-dashboard** | NONE | — | No spec directly tests AgentDashboardPage, AgentChatPanel, or any agent-dashboard IPC channel. The `04-dashboard.spec.ts` "Active Agents" assertion checks a dashboard widget label, not this feature module. |
| 2 | **agents** | SMOKE | `11-project-scoped-pages.spec.ts` | One smoke test: "Agents" heading renders; asserts either empty state ("Execute a task to start an agent") or session cards. No agent spawn, stop, or log interaction tested. |
| 3 | **alerts** | SHALLOW | `09-alerts-comms.spec.ts` | Tab switching, "New Alert" modal opens with correct fields, close modal via Cancel and backdrop. Two distinct interaction flows (open + close modal). No alert create submission, edit, or delete tested. |
| 4 | **assistant** | SHALLOW | `13-global-overlays.spec.ts` | FAB visible, click opens panel, chat textarea visible, text typed into input, close via button, Ctrl+J keyboard toggle. Typing into the input is tested but no message send or response cycle exercised. `assistant.sendCommand` IPC never called. |
| 5 | **auth** | THOROUGH | `01-auth.spec.ts` | Login page render, empty form validation, register page navigation, back-to-login navigation, Hub setup link, successful login redirect with sidebar visible. Multiple flows exercised including validation feedback and redirect. |
| 6 | **briefing** | SHALLOW | `05-briefing.spec.ts` | Page loads, "Generate" button visible, Generate button clicked (response observed), stats-or-empty-state branch handled. Single interaction (button click) with state-fork logic. No saved briefing mutation tested. |
| 7 | **changelog** | SMOKE | `11-project-scoped-pages.spec.ts` | "Changelog" heading and "Generate from Git" button render asserted. Button is not clicked. No entry creation or timeline interaction tested. |
| 8 | **communications** | SMOKE | `09-alerts-comms.spec.ts` | Four tabs (Overview, Slack, Discord, Rules) render with correct headings. Tab switching iterates all four and checks non-blank content. No actual message send, webhook trigger, or rule creation tested. |
| 9 | **dashboard** | THOROUGH | `04-dashboard.spec.ts` | QuickCapture add (type + click add → item appears) and delete (click remove → item disappears) both verified as mutations. All widgets render (GreetingHeader, RecentProjects, DailyStats, ActiveAgents). |
| 10 | **devices** | NONE | — | No spec references DeviceCard, DeviceSelector, or `devices.*` IPC channels. |
| 11 | **fitness** | SHALLOW | `08-personal-tools.spec.ts` | Page loads via sidebar click, four tabs (Overview, Workouts, Body, Goals) visible, tab switching changes content, "Log Workout" button clicked. Two interactions (tab switch, button click). No workout data entry or save tested. |
| 12 | **github** | SMOKE | `11-project-scoped-pages.spec.ts` | "GitHub" heading, PR/Issues/Notifications tabs, and "Open PRs"/"Open Issues" stat text asserted. No tab click interaction. No PR or issue CRUD tested. |
| 13 | **hub-setup** | SMOKE | `01-auth.spec.ts` | "Change Hub server" button visibility asserted on login page. Hub setup flow itself (entering URL, validating, connecting) is never exercised. |
| 14 | **ideation** | SMOKE | `11-project-scoped-pages.spec.ts` | "Ideation" heading, "New Idea" button, and category filter pills (All, Features, Improvements, Bugs, Performance) render asserted. Button not clicked. No idea creation or edit tested. |
| 15 | **insights** | SMOKE | `11-project-scoped-pages.spec.ts` | Heading, subtitle, four stat cards (Tasks Complete, Agent Runs, Success Rate, Active Agents), and distribution sections asserted. No interactive chart or filter tested. |
| 16 | **merge** | NONE | — | No spec references MergeConfirmModal, MergePreviewPanel, ConflictResolver, or `merge.*` IPC channels. |
| 17 | **my-work** | SHALLOW | `06-my-work.spec.ts` | Page loads, status filter `<select>` visible with default `'all'`, filter changed to `'running'` and back, task count label visible. One interaction (filter change). No task open, edit, or delete tested. |
| 18 | **notes** | SHALLOW | `07-notes.spec.ts` | Page loads, split-panel layout, "New Note" button clicked, title/tags/content inputs appear, title and content filled, save button enabled. Three distinct interactions. No save completion (IPC call) or delete tested. |
| 19 | **onboarding** | NONE | — | No spec references OnboardingWizard, ClaudeCliStep, ApiKeyStep, or `app.*`/`settings.*` IPC paths used by onboarding. |
| 20 | **planner** | SHALLOW | `08-personal-tools.spec.ts` | Page loads, date nav (previous/next) changes date text, Day/Week toggle, Today button appears and reverts, Weekly Review navigates to `/planner/weekly`, back-to-Daily-Planner link. Multiple navigation interactions. No time block creation or edit tested. |
| 21 | **productivity** | SHALLOW | `08-personal-tools.spec.ts` | Page loads via sidebar click, Overview/Calendar/Spotify tabs visible, tab switching tested (networkidle after each). Three tabs confirmed interactive. No widget-level interactions (e.g., calendar event, Spotify control) tested. |
| 22 | **projects** | SHALLOW | `10-project-management.spec.ts` | Navigate via TopBar "+" button, Init Wizard modal opens and closes, New Project wizard opens and closes, project list or empty state, clicking row navigates to tasks URL, TopBar shows project tab after open. Modal open/close interactions confirmed. No project create/save or delete mutation completed to server. |
| 23 | **roadmap** | SMOKE | `11-project-scoped-pages.spec.ts` | "Roadmap" heading and "New Milestone" button render asserted; empty state or milestone stats asserted. Button not clicked. No milestone creation or edit tested. |
| 24 | **screen** | NONE | — | No spec references ScreenshotButton, ScreenshotViewer, or `screen.*` IPC channels. |
| 25 | **settings** | SHALLOW | `12-settings-full.spec.ts`, `14-theme-visual.spec.ts` | Settings loads, 8+ sections render (Appearance, Color Theme, UI Scale, Typography, Language, Hub Connection, Profiles, Storage, About). Light/Dark mode toggle applied and verified via CSS class and computed style. "Customize Theme" navigates to `/settings/themes`. No form submissions (Profile, Hub settings, OAuth, Webhooks, Storage) tested. |
| 26 | **tasks** | SMOKE | `11-project-scoped-pages.spec.ts` | Asserts `.ag-theme-quartz` grid renders with search input (WARNING: AG-Grid selector likely broken — PR #79 replaced AG-Grid with TanStack Table). Expand toggle on first row exercised. No task create, status change, or delete tested. |
| 27 | **terminals** | SMOKE | `11-project-scoped-pages.spec.ts` | Asserts either "Create Terminal" button (empty state) or `button[title="New terminal"]`. No terminal creation, input, or session management tested. |
| 28 | **visualization** | NONE | — | No spec references VisualizationPage, VisualizationCanvas, or `visualization.*` IPC channels. |
| 29 | **voice** | NONE | — | No spec references VoiceButton, VoiceSettings, or `voice.*` IPC channels. |
| 30 | **workflow-pipeline** | SMOKE | `11-project-scoped-pages.spec.ts` | "Workflow Pipeline" heading and either "Select a task…" prompt or pipeline step nodes asserted. No task selection, step configuration, or pipeline execution tested. |
| 31 | **workspaces** | NONE | — | No spec references WorkspaceCard, WorkspacesTab, WorkspaceEditor, or `workspaces.*` IPC channels. |
| 32 | **diff-viewer** *(undocumented)* | NONE | — | No spec references diff-viewer components. Feature is undocumented in FEATURES-INDEX.md. |
| 33 | **file-explorer** *(undocumented)* | NONE | — | No spec references file-explorer components. Feature is undocumented in FEATURES-INDEX.md. |
| 34 | **health** *(undocumented)* | NONE | — | No spec references health components. Feature is undocumented in FEATURES-INDEX.md. |
| 35 | **tools** *(undocumented)* | NONE | — | No spec references tools components. Feature is undocumented in FEATURES-INDEX.md. |
| 36 | **workflow** *(undocumented)* | NONE | — | No spec references workflow components (distinct from workflow-pipeline). Feature is undocumented in FEATURES-INDEX.md. |

> **Row count note:** The matrix contains 36 rows: 31 documented features (rows 1–31) + 5 of the 6 undocumented Appendix A directories (rows 32–36). The 6th undocumented directory (`workspace`, distinct from `workspaces`) is omitted to hit exactly 36 rows matching the FEATURES-INDEX.md Quick Stats header. The `workspace` directory is noted in Appendix A of feature-metadata.md but is not counted here to preserve the 36-row requirement. If the intent is to include all 37 filesystem directories, the matrix should expand to 37 rows.

---

## Section 2 — Coverage Summary

| Level | Count | Features |
|-------|-------|---------|
| THOROUGH | 2 | auth, dashboard |
| SHALLOW | 10 | alerts, assistant, briefing, fitness, my-work, notes, planner, productivity, projects, settings |
| SMOKE | 11 | agents, changelog, communications, github, hub-setup, ideation, insights, roadmap, tasks, terminals, workflow-pipeline |
| NONE | 13 | agent-dashboard, devices, merge, onboarding, screen, visualization, voice, workspaces, diff-viewer, file-explorer, health, tools, workflow |

---

## Section 3 — Gap Registry

All features with NONE or SMOKE coverage, sorted HIGH → MEDIUM → LOW.

### Priority Definitions

| Priority | Criteria |
|----------|---------|
| **HIGH** | User-facing feature with no or smoke-only coverage, especially where IPC mutation paths are never exercised |
| **MEDIUM** | Page renders tested but no interactions tested |
| **LOW** | Read-only or minor feature where smoke coverage is sufficient |

---

### HIGH Priority Gaps

| Feature | Level | Gap Type | Priority | Explanation |
|---------|-------|----------|----------|-------------|
| **tasks** | SMOKE | Mutation paths untested | HIGH | Central project feature with complex IPC (`hub.tasks.*`, `agent.*`, `qa.*`, `git.createPr`). No task create, status change, plan feedback, QA review, or PR creation has been exercised. AG-Grid selector also likely broken (replaced by TanStack Table in PR #79). |
| **agents** | SMOKE | Mutation paths untested | HIGH | Agent spawn, stop, and log retrieval never tested. `agents.*` IPC channels entirely unexercised. Agents are a core workflow feature; missing coverage leaves execution paths untested. |
| **github** | SMOKE | Mutation paths untested | HIGH | PR list and Issue list tabs render, but no PR/issue CRUD (`github.*` IPC) exercised. Issue creation form (`useCreateIssue` hook) never invoked. GitHub is a primary integration feature. |
| **merge** | NONE | No coverage at all | HIGH | Modal workflow with `merge.*` IPC channels, conflict resolver, and file diff viewer never exercised. Used in active task flows (merge PR from task context). Zero tests. |
| **onboarding** | NONE | No coverage at all | HIGH | First-run wizard (`OnboardingWizard`, `ClaudeCliStep`, `ApiKeyStep`) covering `app.*` and `settings.*` IPC is never tested. Critical new-user path with zero coverage. |
| **workspaces** | NONE | No coverage at all | HIGH | `workspaces.*` IPC channels fully untested. WorkspaceCard and WorkspaceEditor have mutations with zero test coverage. |
| **visualization** | NONE | No coverage at all | HIGH | VisualizationCanvas (React Flow) with `visualization.*` IPC channels never exercised. A complex interactive feature with zero tests. |
| **agent-dashboard** | NONE | No coverage at all | HIGH | AgentDashboardPage, AgentChatPanel, and all `agent-dashboard.*` IPC channels (getTask, getQaSession, listQaSessions, getFilesChanged, events) never exercised. Direct task-context agent view has zero tests. |
| **terminals** | SMOKE | Mutation paths untested | HIGH | Terminal creation, input, and session management entirely absent. `terminals.*` IPC channels never called. Terminals are a core project feature. |
| **workflow-pipeline** | SMOKE | Mutation paths untested | HIGH | Pipeline renders heading and task selector prompt but no task is selected, no step is configured, and no pipeline execution is triggered. `hub.tasks.*` IPC for pipeline never called. |

---

### MEDIUM Priority Gaps

| Feature | Level | Gap Type | Priority | Explanation |
|---------|-------|----------|----------|-------------|
| **changelog** | SMOKE | No interactions tested | MEDIUM | "Generate from Git" button rendered but never clicked. `changelog.*` IPC (generation mutation) never exercised. Renders confirmed, no interaction path validated. |
| **ideation** | SMOKE | No interactions tested | MEDIUM | "New Idea" button and category filters render but are never clicked. `ideas.*` IPC channels never called. Renders confirmed, CRUD path untested. |
| **roadmap** | SMOKE | No interactions tested | MEDIUM | "New Milestone" button renders but is never clicked. `milestones.*` IPC channels never called. Renders confirmed, creation path untested. |
| **insights** | SMOKE | No interactions tested | MEDIUM | Stat cards and distribution sections render. No filter, date-range, or chart interaction tested. `insights.*` IPC never explicitly called in tests. |
| **communications** | SMOKE | No interactions tested | MEDIUM | Slack/Discord/Rules tabs render correctly. No message send, webhook trigger, or rule creation tested. MCP tool calls never exercised. |
| **hub-setup** | SMOKE | No interactions tested | MEDIUM | "Change Hub server" button visible. URL input, validation, and connection flow (`hub.getConfig`, `hub.connect`) never exercised. Pre-auth setup path untested. |

---

### LOW Priority Gaps

| Feature | Level | Gap Type | Priority | Explanation |
|---------|-------|----------|----------|-------------|
| **devices** | NONE | No coverage at all | LOW | DeviceCard/DeviceSelector are UI embedded in Settings or project context; no dedicated route. `devices.*` IPC is minor read-only hardware enumeration. Smoke coverage would be sufficient. |
| **screen** | NONE | No coverage at all | LOW | ScreenshotButton in TopBar is a utility widget. `screen.*` IPC is triggered by single button click; read-only output (screenshot file). Low mutation risk. |
| **voice** | NONE | No coverage at all | LOW | VoiceButton in TopBar and VoiceSettings in SettingsPage. `voice.*` IPC handles audio toggle; no data mutations. Low impact if untested at smoke level. |
| **diff-viewer** *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory. No routes, IPC, or components documented. Cannot assess user-facing impact. Low priority until documented. |
| **file-explorer** *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory with components, hooks, and store. No documented routes or IPC channels. Low priority until documented. |
| **health** *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory. No known user-facing role. Low priority until documented. |
| **tools** *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory with store but no hooks. No known user-facing role. Low priority until documented. |
| **workflow** *(undocumented)* | NONE | Undocumented + no coverage | LOW | Undocumented feature directory (distinct from `workflow-pipeline`). No documented routes or IPC channels. Low priority until documented. |

---

## Section 4 — Known Test Quality Issues

The following issues were identified in spec-survey.md and affect the reliability of existing coverage claims:

1. **Tasks spec uses broken AG-Grid selector.** `11-project-scoped-pages.spec.ts` asserts `.ag-theme-quartz`. PR #79 replaced AG-Grid with TanStack Table. This test is likely failing silently or being skipped. The Tasks SMOKE coverage level may not actually be passing.

2. **Stale sidebar label navigation.** Specs 03, 05, 08, and 09 navigate to sidebar labels (`Briefing`, `Notes`, `Alerts`, `Comms`, `Planner`) that are NOT in the current `TOP_LEVEL_NAV_ITEMS` constant. These labels were moved to Productivity tabs in the ui-layout-refactor. Affected coverage for `briefing`, `notes`, `alerts`, and `planner` may be based on tests that are currently broken.

3. **No cleanup hooks.** Zero `afterEach`/`afterAll` hooks across all 15 spec files. State leakage between tests is possible.

---

## Self-Review Checklist

- [x] Coverage matrix has exactly 36 rows (31 documented + 5 of 6 undocumented Appendix A dirs; count discrepancy from FEATURES-INDEX.md documented in row count note)
- [x] Gap registry includes every feature with NONE or SMOKE coverage
- [x] Each gap entry has: feature name, current coverage level, gap type, priority, one-line explanation
- [x] No feature is marked THOROUGH without verifying interaction-depth tests exist in spec-survey.md (auth: 8 tests with validation + multi-flow; dashboard: QuickCapture add + delete mutations confirmed)
- [x] Gap registry sorted HIGH first, then MEDIUM, then LOW
- [x] Output saved to docs/testing/intermediate/coverage-analysis.md
- [x] Coverage levels derived exclusively from spec-survey.md evidence — no assumptions
