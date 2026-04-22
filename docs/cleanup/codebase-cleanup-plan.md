# Codebase Cleanup — Parallel Execution Plan

> Task: `codebase-cleanup` | Branch: `feature/codebase-cleanup`
> Generated: 2026-04-20 | Research: `docs/cleanup/item-{1,2,3,4}-*-research.md`

## Execution Strategy

3 waves, no worktrees. Agents within a wave touch **zero overlapping files**.
Wave 1 must complete before Wave 2 starts (infrastructure deps).
Wave 2 and Wave 3 are independent — can run concurrently after Wave 1.

---

## Wave 1 — Infrastructure (3 agents, parallel)

These agents create the foundation that Wave 2/3 agents depend on.

### Agent 1A: Theme Store + CSS Tokens

| Field | Value |
|-------|-------|
| **agent_definition** | `.claude/agents/store-engineer.md` |
| **agent_role** | Store Engineer |
| **scope** | Theme store extensions for spacing + icon shape |

**Files owned (exclusive):**
- `src/renderer/shared/stores/theme-store.ts` — add `layoutGap: number`, `setLayoutGap()`, `applyLayoutGap()`, `iconButtonShape: IconButtonShape`, `setIconButtonShape()`
- `src/renderer/styles/globals.css` — add `--layout-gap`, `--layout-gap-sm`, `--layout-gap-lg`, `--layout-pad-x`, `--layout-pad-y` to `:root`, add `--spacing-layout` to `@theme` block, add `--btn-radius` CSS custom property
- `src/shared/ipc/settings/schemas.ts` — add `layoutGap: z.number().optional()`, `iconButtonShape: z.enum(['rounded','square','pill']).optional()` to settings schema

**Acceptance criteria:**
- `setLayoutGap(8)` applies `--layout-gap: 0.5rem` to `<html>` + all derived props
- `setIconButtonShape('pill')` applies `--btn-radius: 9999px` to `<html>`
- Settings schema accepts both new fields
- Typecheck passes

---

### Agent 1B: Chat UX Message Flow Fix

| Field | Value |
|-------|-------|
| **agent_definition** | `.claude/agents/hook-engineer.md` |
| **agent_role** | Hook Engineer |
| **scope** | Fix optimistic user messages, thinking state, assistant message decoupling |

**Files owned (exclusive):**
- `src/renderer/features/workspace/api/useWorkspace.ts` — add `onMutate` to `useWorkspaceSend()` that optimistically inserts user message into React Query cache
- `src/renderer/features/workspace/hooks/useSessionThinking.ts` — no changes needed (panels will combine `send.isPending || isThinking`)
- `src/renderer/features/workspace/components/PrimarySessionPanel.tsx` — derive `showThinking = send.isPending || isThinking`
- `src/renderer/features/workspace/components/TeamLeadPanel.tsx` — same `showThinking` derivation
- `src/renderer/features/assistant/store.ts` — refactor `ResponseEntry` to `ChatEntry` union type (`{ kind: 'user' } | { kind: 'response' }`)
- `src/renderer/features/assistant/api/useAssistant.ts` — add `addUserEntry()` in `onMutate` of `useSendCommand()`
- `src/renderer/features/assistant/hooks/useAssistantEvents.ts` — remove `_lastCommand` module variable, only add response entries (no input coupling)
- `src/renderer/features/assistant/components/WidgetMessageArea.tsx` — render `ChatEntry[]` with separate user/response bubbles
- `src/renderer/features/assistant/components/ResponseStream.tsx` — render `ChatEntry[]`

**Acceptance criteria:**
- User message appears instantly in workspace chat on send
- ThinkingIndicator shows immediately on send (not waiting for stream event)
- Assistant user messages render independently of Claude responses
- No message duplication on continued conversation
- Typecheck passes

---

### Agent 1C: Settings Persistence Wiring

| Field | Value |
|-------|-------|
| **agent_definition** | `.claude/agents/service-engineer.md` |
| **agent_role** | Service Engineer |
| **scope** | Persist new settings fields (layoutGap, iconButtonShape) in main process |

**Files owned (exclusive):**
- `src/main/features/settings/settings-service.ts` — accept `layoutGap` and `iconButtonShape` in update handler, persist to settings store
- `src/main/features/settings/schema.ts` — add columns/fields if needed
- `src/renderer/features/settings/api/useSettings.ts` — restore `setLayoutGap()` and `setIconButtonShape()` from loaded settings in queryFn

**Acceptance criteria:**
- `layoutGap` and `iconButtonShape` round-trip through IPC (save + load)
- Default values applied on fresh install
- Typecheck passes

---

## Wave 2 — UI Application (4 agents, parallel, after Wave 1)

### Agent 2A: Spacing Slider + Layout Gap Application

| Field | Value |
|-------|-------|
| **agent_definition** | `.claude/agents/component-engineer.md` |
| **agent_role** | Component Engineer |
| **scope** | Settings UI slider + convert layout components to use spacing tokens |

**Files owned (exclusive):**
- `src/renderer/features/settings/components/SpacingSection.tsx` — **new file**, slider component (clone UiScaleSection pattern), range 0-16 step 2, labels: Flush/Compact/Default/Relaxed/Spacious
- `src/renderer/features/settings/components/SettingsPage.tsx` — wire SpacingSection into Display tab next to UiScaleSection
- `src/renderer/shared/components/ui/page-layout.tsx` — convert `px-6 py-4` to `px-[var(--layout-pad-x)] py-[var(--layout-pad-y)]`
- `src/renderer/shared/components/ui/composition/FilterBar.tsx` — convert `gap-3 px-4 py-3` to layout gap tokens
- `src/renderer/shared/components/ui/composition/ActionBar.tsx` — convert `gap-2 px-4 py-3` to layout gap tokens
- `src/renderer/shared/components/ui/composition/DetailPanel.tsx` — convert padding to layout gap tokens
- `src/renderer/app/layouts/ContentAreaContainer.tsx` — convert `p-2 gap-2` / `p-3 gap-3` to layout gap tokens
- `src/renderer/app/layouts/ContentHeader.tsx` — convert `gap-2 px-3` to layout gap tokens

**Acceptance criteria:**
- Spacing slider renders in Settings > Display, value persists across restart
- Moving slider visibly changes gaps between all major layout regions
- Default (8) matches current appearance exactly
- Typecheck passes

---

### Agent 2B: Icon Button Standardization

| Field | Value |
|-------|-------|
| **agent_definition** | `.claude/agents/styling-engineer.md` |
| **agent_role** | Styling Engineer |
| **scope** | Fix raw icon buttons, add shape-awareness to Button CVA |

**Files owned (exclusive):**
- `src/renderer/shared/components/ui/button.tsx` — replace hardcoded `rounded-md` in CVA base with `rounded-[var(--btn-radius,0.375rem)]`, update `icon-sm`/`icon-xs` similarly
- `src/renderer/shared/components/ui/icon.tsx` — no changes expected
- `src/renderer/shared/components/ui/search-input.tsx` — replace raw `<button>` clear with `Button size="icon-xs"`
- `src/renderer/shared/components/ui/sidebar.tsx` — replace raw SidebarRail `<button>` with `Button`
- `src/renderer/app/layouts/ProjectTabBar.tsx` — replace raw add-project `<button>` with `Button size="icon-xs"`
- `src/renderer/shared/components/WebhookNotification.tsx` — replace raw dismiss `<button>` with `Button size="icon-xs" variant="ghost"`
- `src/renderer/shared/components/HubNotification.tsx` — same dismiss fix
- `src/renderer/shared/components/MutationErrorToast.tsx` — same dismiss fix
- `src/renderer/shared/components/AppUpdateNotification.tsx` — replace raw dismiss + action buttons with `Button`
- `src/renderer/shared/components/AuthNotification.tsx` — replace raw dismiss + action buttons with `Button`
- `src/renderer/shared/components/ConfirmDialog.tsx` — replace raw cancel/confirm `<button>` with `Button`
- `src/renderer/shared/components/IntegrationRequired.tsx` — replace raw `<button>` with `Button`
- `src/renderer/app/router.tsx` — replace error page raw `<button>` with `Button`

**NOT touching** (defensible — crash-safety):
- `error-boundaries/FeatureErrorBoundary.tsx`
- `error-boundaries/RouteErrorBoundary.tsx`
- `error-boundaries/RootErrorBoundary.tsx`

**Acceptance criteria:**
- Zero raw `<button>` for icon-only buttons outside error boundaries
- All icon buttons respect `--btn-radius` (changing shape in settings changes hover shape)
- Typecheck passes

---

### Agent 2C: Icon Shape Settings UI

| Field | Value |
|-------|-------|
| **agent_definition** | `.claude/agents/component-engineer.md` |
| **agent_role** | Component Engineer |
| **scope** | Add icon button shape selector to Settings > Display |

**Files owned (exclusive):**
- `src/renderer/features/settings/components/LayoutSection.tsx` — add IconButtonShape selector (rounded / square / pill) below existing toolbar style selector, wire to `setIconButtonShape()` + `updateSettings.mutate()`

**Acceptance criteria:**
- Shape selector renders in Settings > Display > Layout section
- Changing shape immediately updates all icon button hover states
- Preference persists across restart
- Typecheck passes

---

## Wave 3 — Component Folder Refactors (10 agents, parallel, after Wave 1)

All agents use the same pattern per component:
1. Create `ComponentName/` directory inside `components/`
2. Create `use{ComponentName}.ts` — extract ALL hooks, state, handlers, derived state
3. Refactor `ComponentName.tsx` — import hook, pure render only
4. Create `index.ts` — `export { ComponentName } from './ComponentName'`
5. Update parent barrel `components/index.ts` if it exists
6. Verify no broken imports

Each agent gets ~16 components across 3-4 non-overlapping domains.

| Field | Value |
|-------|-------|
| **agent_definition** | `.claude/agents/component-engineer.md` + `.claude/agents/hook-engineer.md` (dual role) |
| **agent_role** | Component + Hook Engineer |

---

### Agent 3A: agent-dashboard + agents

**Domains:** agent-dashboard (17 violations), agents (1 violation)
**Component count:** 18

| Component | Lines | Action |
|-----------|-------|--------|
| AgentDashboardPage | 603 | folder + useAgentDashboardPage.ts |
| TemplateEditorPanel | 547 | folder + useTemplateEditorPanel.ts |
| TemplateListPanel | 317 | folder + useTemplateListPanel.ts |
| AgentPanelPopup | 295 | folder (pure render) |
| ToolCallCard | 264 | folder (minimal hook) |
| TextMessage | 261 | folder + useTextMessage.ts |
| AgentPanelExpanded | 215 | folder (pure render) |
| RunningWorkflowsPanel | 194 | folder + useRunningWorkflowsPanel.ts |
| QaPanel | 172 | folder + useQaPanel.ts |
| TasksTab | 166 | folder + useTasksTab.ts |
| AgentLayoutToolbar | 134 | folder |
| AgentPanelTabs | 117 | folder |
| AgentStatusBar | 104 | folder |
| AgentPanelCompact | 102 | folder |
| AgentLayoutSingle | 100 | folder |
| AgentChatPanel | 91 | folder + useAgentChatPanel.ts |
| AgentLayoutGrid | 86 | folder |
| AgentDashboard (agents) | 107 | folder + useAgentDashboard.ts |

---

### Agent 3B: alerts + auth + briefing

**Domains:** alerts (5), auth (3), briefing (3)
**Component count:** 11

| Component | Lines | Action |
|-----------|-------|--------|
| AlertsPage | 315 | folder + useAlertsPage.ts |
| AlertEditDialog | 232 | folder + useAlertEditDialog.ts |
| CreateAlertModal | 228 | folder + useCreateAlertModal.ts |
| RecurringAlerts | 82 | folder + useRecurringAlerts.ts |
| AlertNotification | 55 | folder + useAlertNotification.ts |
| LoginPage | 262 | folder + useLoginPage.ts |
| RegisterPage | 188 | folder + useRegisterPage.ts |
| AuthGuard | 57 | folder + useAuthGuard.ts |
| BriefingPage | 233 | folder + useBriefingPage.ts |
| BriefingConfigPanel | 173 | folder + useBriefingConfigPanel.ts |
| SuggestionCard | 83 | folder + useSuggestionCard.ts |

---

### Agent 3C: changelog + dashboard + diff-viewer

**Domains:** changelog (3), dashboard (7), diff-viewer (2)
**Component count:** 12

| Component | Lines | Action |
|-----------|-------|--------|
| EditEntryDialog | 277 | folder + useEditEntryDialog.ts |
| ChangelogPage | 180 | folder + useChangelogPage.ts |
| VersionCard | 126 | folder + useVersionCard.ts |
| QuickCapture | 288 | folder + useQuickCapture.ts |
| ActiveAgents | 157 | folder + useActiveAgents.ts |
| RecentProjects | 134 | folder + useRecentProjects.ts |
| TodayView | 124 | folder + useTodayView.ts |
| DashboardPage | 53 | folder |
| GreetingHeader | 44 | folder + useGreetingHeader.ts |
| DailyStats | 44 | folder + useDailyStats.ts |
| DiffViewer | 302 | folder + useDiffViewer.ts |
| DiffFileList | 207 | folder + useDiffFileList.ts |

---

### Agent 3D: files + fitness

**Domains:** files (1), fitness (7)
**Component count:** 8

| Component | Lines | Action |
|-----------|-------|--------|
| FileExplorer | 175 | folder + useFileExplorer.ts |
| BodyComposition | 351 | folder + useBodyComposition.ts |
| WorkoutForm | 337 | folder + useWorkoutForm.ts; extract ExerciseInput |
| GoalsPanel | 296 | folder + useGoalsPanel.ts; extract GoalCard |
| WorkoutEditDialog | 256 | folder + useWorkoutEditDialog.ts |
| MeasurementEditDialog | 221 | folder + useMeasurementEditDialog.ts |
| WorkoutLog | 150 | folder + useWorkoutLog.ts |
| GoalEditDialog | 181 | folder + useGoalEditDialog.ts |

---

### Agent 3E: git + hub + ideas

**Domains:** git (6), hub (1), ideas (2)
**Component count:** 9

| Component | Lines | Action |
|-----------|-------|--------|
| WorktreeList | 207 | folder + useWorktreeList.ts |
| CommitPanel | 187 | folder + useCommitPanel.ts |
| BranchList | 162 | folder + useBranchList.ts |
| CreatePrDialog (git) | 149 | folder + useCreatePrDialog.ts |
| ChangelogSummary | 136 | folder + useChangelogSummary.ts |
| CommitHistory | 120 | folder + useCommitHistory.ts |
| HubSetupPage | 451 | folder + useHubSetupPage.ts |
| IdeasPage | 303 | folder + useIdeasPage.ts |
| IdeaEditForm | 277 | folder + useIdeaEditForm.ts |

---

### Agent 3F: integrations + merge + my-work

**Domains:** integrations (9), merge (3), my-work (1)
**Component count:** 13

| Component | Lines | Action |
|-----------|-------|--------|
| DiscordActionModal | 304 | folder + useDiscordActionModal.ts |
| SlackActionModal | 292 | folder + useSlackActionModal.ts |
| NotificationsPanel | 285 | folder + useNotificationsPanel.ts |
| EmailPanel | 285 | folder + useEmailPanel.ts |
| IssueCreateForm | 185 | folder + useIssueCreateForm.ts |
| GitHubPanel | 141 | folder + useGitHubPanel.ts |
| DiscordPanel | 139 | folder + useDiscordPanel.ts |
| SlackPanel | 139 | folder + useSlackPanel.ts |
| NotificationRules | 117 | folder + useNotificationRules.ts |
| MergePreviewPanel | 328 | folder + useMergePreviewPanel.ts |
| ConflictResolver | 323 | folder + useConflictResolver.ts |
| MergeConfirmModal | 217 | folder + useMergeConfirmModal.ts |
| MyWorkPage | 567 | folder + useMyWorkPage.ts; extract TaskRow, TeamGroup |

---

### Agent 3G: notes + onboarding + personal + planner + productivity

**Domains:** notes (4), onboarding (4), personal (1), planner (8), productivity (2)
**Component count:** 19

| Component | Lines | Action |
|-----------|-------|--------|
| NotesList | 158 | folder + useNotesList.ts |
| NoteEditor | 156 | folder + useNoteEditor.ts |
| QuickNote | 96 | folder + useQuickNote.ts |
| NotesPage | 57 | folder + useNotesPage.ts |
| IntegrationsStep | 181 | folder + useIntegrationsStep.ts |
| ClaudeCliStep | 141 | folder + useClaudeCliStep.ts |
| OnboardingWizard | 123 | folder + useOnboardingWizard.ts |
| CompleteStep | 87 | folder + useCompleteStep.ts |
| PersonalPage | 132 | folder + usePersonalPage.ts |
| PlannerPage | 277 | folder + usePlannerPage.ts |
| WeeklyReviewPage | 225 | folder + useWeeklyReviewPage.ts |
| DayView | 201 | folder + useDayView.ts |
| CalendarOverlay | 170 | folder + useCalendarOverlay.ts |
| TimeBlockEditor | 130 | folder + useTimeBlockEditor.ts |
| WeekOverview | 130 | folder + useWeekOverview.ts |
| GoalsList | 129 | folder + useGoalsList.ts |
| WeeklyReflectionSection | 95 | folder + useWeeklyReflection.ts |
| SpotifyWidget | 252 | folder + useSpotifyWidget.ts; extract NowPlaying |
| CalendarWidget | 131 | folder + useCalendarWidget.ts |

---

### Agent 3H: projects + runners + terminals

**Domains:** projects (9), runners (2), terminals (2)
**Component count:** 13

| Component | Lines | Action |
|-----------|-------|--------|
| ProjectListPage | 348 | folder + useProjectListPage.ts |
| ProjectInitWizard | 321 | folder + useProjectInitWizard.ts |
| CreateProjectWizard | 287 | folder + useCreateProjectWizard.ts |
| ProjectEditDialog | 277 | folder + useProjectEditDialog.ts |
| WorktreeManager | 168 | folder + useWorktreeManager.ts |
| SetupProgressModal | 158 | folder |
| SubprojectSelector | 157 | folder + useSubprojectSelector.ts |
| BranchSelector | 128 | folder + useBranchSelector.ts |
| ProjectList | 126 | folder + useProjectList.ts |
| RunnerPanel | 152 | folder + useRunnerPanel.ts |
| ProfileEditDialog | 108 | folder + useProfileEditDialog.ts |
| TerminalInstance | 173 | folder + useTerminalInstance.ts |
| TerminalGrid | 132 | folder + useTerminalGrid.ts |

---

### Agent 3I: settings

**Domains:** settings (18 violations — dedicated agent)
**Component count:** 18

| Component | Lines | Action |
|-----------|-------|--------|
| HubSettings | 547 | folder + useHubSettings.ts; extract AutoSetupPanel, GenerateKeyPanel, ConnectionForm |
| StorageManagementSection | 467 | folder + useStorageManagement.ts |
| LayoutSection | 419 | folder + useLayoutSection.ts; move SVG previews |
| TestingSettingsTab | 333 | folder + useTestingSettings.ts |
| WebhookSettings | 320 | folder + useWebhookSettings.ts |
| SettingsPage | 264 | folder + useSettingsPage.ts |
| HotkeySettings | 239 | folder + useHotkeySettings.ts |
| DataLocationSection | 229 | folder + useDataLocation.ts |
| RetentionControl | 210 | folder + useRetentionControl.ts |
| WorkspaceEditor | 190 | folder + useWorkspaceEditor.ts |
| ProfileFormModal | 190 | folder + useProfileFormModal.ts |
| ProfileSection | 173 | folder + useProfileSection.ts |
| GitHubAuthSettings | 154 | folder + useGitHubAuthSettings.ts |
| ClaudeAuthSettings | 134 | folder + useClaudeAuthSettings.ts |
| BackgroundSettings | 122 | folder + useBackgroundSettings.ts |
| AppBehaviorSection | 114 | folder + useAppBehavior.ts |
| WorkspacesTab | 89 | folder + useWorkspacesTab.ts |
| OAuthProviderSettings | ~120 | folder + hook |

---

### Agent 3J: tasks + test-suite + tools + visualization + workflow + workflow-pipeline + workspace

**Domains:** tasks (7), test-suite (27), tools (2), visualization (1), workflow (1), workflow-pipeline (2), workspace (4)
**Component count:** 44

**Note:** This is the largest agent by count. test-suite alone has 27 violations. If this proves too large for a single agent, split into 3J-tasks (7) and 3K-test-suite (27) and 3L-remaining (10).

| Domain | Components |
|--------|-----------|
| tasks | CreatePrDialog, BulkActionBar, CreateTaskDialog, EditProgressTaskDialog, TaskFiltersToolbar, LinkPrDialog, LinkJiraDialog |
| test-suite | ConfigEditDialog, SaveRecordingDialog, RecordingPanel, ResultsToolbar, SetupCard, ResultsOutputLog, StepList, LibraryPanel, BrowserViewPanel, ScreenshotsPanel, ExportPanel, AnalyticsDetailCards, DiffViewer, ResultsPanel, LibraryScriptRow, CreateTaskFromRunDialog, DataRunDialog, SharedStepsPanel, ResultsWorkflowActions, RunLogDialog, StepTimeline, CreateSharedStepDialog, AnalyticsPanel, TestSuitePage, ScheduleDialog, ScreenshotGallery, TrendChart |
| tools | WorkflowEditor, ToolsPage |
| visualization | VisualizationPage |
| workflow | WorkflowPermissionModal |
| workflow-pipeline | WorkflowPipelinePage, TaskSelector |
| workspace | TeamLeadPanel, PrimarySessionPanel, WorkspacePage, TeamLeadPanelList |

---

## Execution Summary

| Wave | Agents | Parallel? | Total Components/Changes |
|------|--------|-----------|--------------------------|
| Wave 1 | 3 (1A, 1B, 1C) | Yes | Infrastructure: theme store, chat UX, settings persistence |
| Wave 2 | 4 (2A, 2B, 2C) | Yes (after Wave 1) | Spacing UI, icon buttons, shape settings |
| Wave 3 | 10 (3A-3J) | Yes (after Wave 1) | 163 component folder refactors |
| **Total** | **17 agents** | | |

## QA Gate

After all waves complete:
1. `npx tsc --noEmit` — full typecheck
2. `npx eslint src/renderer/` — lint all renderer code
3. Visual smoke test — launch app, verify settings sliders work, chat sends immediately, icon shapes change
4. Verify no broken imports — every refactored component's barrel `index.ts` exports correctly

## Agent Instructions Template

Each agent receives:
1. This plan document (their section only)
2. The relevant research document (`docs/cleanup/item-{n}-*-research.md`)
3. Their agent definition from `.claude/agents/`
4. CLAUDE.md project rules
5. Instruction: "Read existing code before modifying. Follow component-engineer patterns exactly. Typecheck your changes with `npx tsc --noEmit` before reporting complete. Lint changed files with `npx eslint <files>`."
