# Item 1: Component Folder Structure Audit

> Research document for `codebase-cleanup` task. Generated 2026-04-20.

## Target Pattern

```
features/{domain}/components/
├── {ComponentName}/
│   ├── {ComponentName}.tsx      — pure render only
│   ├── use{ComponentName}.ts    — ALL logic (hooks, state, handlers)
│   └── index.ts                 — barrel export
```

## Audit Summary

| Domain | Violations | Clean | Worst Offenders |
|--------|-----------|-------|-----------------|
| agent-dashboard | 17 | 2 | AgentDashboardPage (603L), TemplateEditorPanel (547L), TemplateListPanel (317L) |
| agents | 1 | 0 | AgentDashboard (107L) |
| alerts | 5 | 0 | AlertsPage (315L), CreateAlertModal (228L), AlertEditDialog (232L) |
| assistant | 9 | 2 | SidebarAssistantButton (138L), AssistantInputBar (132L), WidgetMessageArea (131L) |
| auth | 3 | 0 | LoginPage (262L), RegisterPage (188L), AuthGuard (57L) |
| briefing | 3 | 0 | BriefingPage (233L), BriefingConfigPanel (173L) |
| changelog | 3 | 5 | EditEntryDialog (277L), ChangelogPage (180L), VersionCard (126L) |
| dashboard | 7 | 0 | QuickCapture (288L), ActiveAgents (157L), RecentProjects (134L) |
| diff-viewer | 2 | 0 | DiffViewer (302L), DiffFileList (207L) |
| files | 1 | 1 | FileExplorer (175L) |
| fitness | 7 | 3 | BodyComposition (351L), WorkoutForm (337L), GoalsPanel (296L) |
| git | 6 | 3 | WorktreeList (207L), CommitPanel (187L), BranchList (162L) |
| hub | 1 | 0 | HubSetupPage (451L) |
| ideas | 2 | 2 | IdeasPage (303L), IdeaEditForm (277L) |
| insights | 0 | 1 | -- (clean) |
| integrations | 9 | 9 | DiscordActionModal (304L), SlackActionModal (292L), NotificationsPanel (285L) |
| merge | 3 | 1 | MergePreviewPanel (328L), ConflictResolver (323L), MergeConfirmModal (217L) |
| my-work | 1 | 0 | MyWorkPage (567L) |
| notes | 4 | 0 | NoteEditor (156L), NotesList (158L) |
| onboarding | 4 | 1 | IntegrationsStep (181L), ClaudeCliStep (141L) |
| personal | 1 | 0 | PersonalPage (132L) |
| planner | 8 | 3 | PlannerPage (277L), WeeklyReviewPage (225L), DayView (201L) |
| planning | 0 | 1 | -- (clean) |
| productivity | 2 | 1 | SpotifyWidget (252L), CalendarWidget (131L) |
| projects | 9 | 3 | ProjectListPage (348L), ProjectInitWizard (321L), CreateProjectWizard (287L) |
| runners | 2 | 2 | RunnerPanel (152L), ProfileEditDialog (108L) |
| settings | 18 | 10 | HubSettings (547L), StorageManagementSection (467L), LayoutSection (419L) |
| tasks | 7 | 1 | CreatePrDialog (286L), BulkActionBar (241L), CreateTaskDialog (235L) |
| terminals | 2 | 0 | TerminalInstance (173L), TerminalGrid (132L) |
| test-suite | 27 | 12 | ConfigEditDialog (403L), SaveRecordingDialog (378L), RecordingPanel (246L) |
| tools | 2 | 2 | WorkflowEditor (281L), ToolsPage (150L) |
| visualization | 1 | 0 | VisualizationPage (111L) |
| workflow | 1 | 1 | WorkflowPermissionModal (112L) |
| workflow-pipeline | 2 | 3 | WorkflowPipelinePage (179L) |
| workspace | 4 | 0 | TeamLeadPanel (265L), PrimarySessionPanel (134L) |
| **TOTAL** | **~163** | **~69** | |

**Only 2 domains are fully clean:** insights, planning.

---

## Critical Files (300+ lines, heavy mixed concerns)

| # | Domain | File | Lines | Hooks/Mutations |
|---|--------|------|-------|-----------------|
| 1 | agent-dashboard | AgentDashboardPage.tsx | 603 | useState x4, useCallback x3, useMemo, useQuery, useMutation |
| 2 | my-work | MyWorkPage.tsx | 567 | useState x3, useMemo x2, useQuery, useIpcEvent x3, 5 sub-components |
| 3 | agent-dashboard | TemplateEditorPanel.tsx | 547 | ~15 useState, useEffect, 2 useMutation |
| 4 | settings | HubSettings.tsx | 547 | useQuery, 4 useMutation, 3 sub-components with own state |
| 5 | settings | StorageManagementSection.tsx | 467 | useState x4, useMemo x3, useReactTable, 6 mutations |
| 6 | hub | HubSetupPage.tsx | 451 | useState x7, useQuery, 2 useMutation, fetch calls |
| 7 | settings | LayoutSection.tsx | 419 | Zustand stores, useMutation, 5 handlers, 3 SVG sub-components |
| 8 | test-suite | ConfigEditDialog.tsx | 403 | useState x2, useEffect, useMutation, form logic |
| 9 | test-suite | SaveRecordingDialog.tsx | 378 | useState x8, useMutation, store, assertion builder |
| 10 | fitness | BodyComposition.tsx | 351 | useState x5, useMutation x2, useQuery |
| 11 | projects | ProjectListPage.tsx | 348 | useState x4, useMemo x3, useQuery x2, useMutation |
| 12 | fitness | WorkoutForm.tsx | 337 | useState x5, useMutation, embedded ExerciseInput |
| 13 | settings | TestingSettingsTab.tsx | 333 | useState x2, useEffect x2, useDebounce, 4 queries/mutations |
| 14 | merge | MergePreviewPanel.tsx | 328 | useState x2, useMemo, useQuery x2, store |
| 15 | merge | ConflictResolver.tsx | 323 | useState x2, useMemo, useQuery x2, 5 handlers |
| 16 | projects | ProjectInitWizard.tsx | 321 | useState x6, useEffect, useMutation x4, useQuery x2 |
| 17 | settings | WebhookSettings.tsx | 320 | useState x3, useQuery x2, useMutation, 2 sub-components |
| 18 | alerts | AlertsPage.tsx | 315 | useState x4, useDebounce, useQuery, 2 useMutation |
| 19 | agent-dashboard | TemplateListPanel.tsx | 317 | useMutation x2, useQuery, store selectors |
| 20 | integrations | DiscordActionModal.tsx | 304 | useState x3, useMutation, renderForm switch |
| 21 | ideas | IdeasPage.tsx | 303 | useState x8, useMemo x3, useQuery, 3 useMutation |
| 22 | diff-viewer | DiffViewer.tsx | 302 | useMemo x3, custom useIsDark hook |
| 23 | fitness | GoalsPanel.tsx | 296 | useState x5, useQuery, useMutation, useDebounce, embedded GoalCard |
| 24 | integrations | SlackActionModal.tsx | 292 | useState x3, useMutation, renderForm switch |
| 25 | dashboard | QuickCapture.tsx | 288 | useState x4, useRef, 4 useMutation, 8 handlers |

---

## Detailed Violations by Domain

### agent-dashboard

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| AgentDashboardPage.tsx | 603 | mixed-concerns | Create folder + useAgentDashboardPage.ts |
| TemplateEditorPanel.tsx | 547 | mixed-concerns | Create folder + useTemplateEditorPanel.ts |
| TemplateListPanel.tsx | 317 | mixed-concerns | Create folder + useTemplateListPanel.ts |
| TextMessage.tsx | 261 | missing-hook | Create folder + useTextMessage.ts |
| ToolCallCard.tsx | 264 | loose-file | Create folder (hook optional — 1 useState) |
| AgentPanelPopup.tsx | 295 | loose-file | Create folder (pure render but 295 lines) |
| AgentPanelExpanded.tsx | 215 | loose-file | Create folder (pure render but 215 lines) |
| RunningWorkflowsPanel.tsx | 194 | mixed-concerns | Create folder + useRunningWorkflowsPanel.ts |
| QaPanel.tsx | 172 | missing-hook | Create folder + useQaPanel.ts |
| TasksTab.tsx | 166 | missing-hook | Create folder + useTasksTab.ts |
| AgentLayoutToolbar.tsx | 134 | loose-file | Create folder (pure render) |
| AgentStatusBar.tsx | 104 | loose-file | Create folder |
| AgentPanelCompact.tsx | 102 | loose-file | Create folder |
| AgentPanelTabs.tsx | 117 | loose-file | Create folder |
| AgentLayoutSingle.tsx | 100 | loose-file | Create folder |
| AgentChatPanel.tsx | 91 | loose-file | Create folder + useAgentChatPanel.ts |
| AgentLayoutGrid.tsx | 86 | loose-file | Create folder |

### agents

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| AgentDashboard.tsx | 107 | mixed-concerns | Create folder + useAgentDashboard.ts |

### alerts

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| AlertsPage.tsx | 315 | mixed-concerns | Create folder + useAlertsPage.ts |
| AlertEditDialog.tsx | 232 | mixed-concerns | Create folder + useAlertEditDialog.ts |
| CreateAlertModal.tsx | 228 | mixed-concerns | Create folder + useCreateAlertModal.ts |
| RecurringAlerts.tsx | 82 | loose-file | Create folder + useRecurringAlerts.ts |
| AlertNotification.tsx | 55 | missing-hook | Create folder + useAlertNotification.ts |

### assistant

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| SidebarAssistantButton.tsx | 138 | mixed-concerns | Create folder + useSidebarAssistantButton.ts |
| WidgetPanel.tsx | 133 | mixed-concerns | Create folder + useWidgetPanel.ts |
| WidgetMessageArea.tsx | 131 | mixed-concerns | Create folder + useWidgetMessageArea.ts |
| AssistantInputBar.tsx | 132 | mixed-concerns | Create folder + useAssistantInputBar.ts |
| ProjectSelector.tsx | 107 | missing-hook | Create folder + useProjectSelector.ts |
| WidgetInput.tsx | 95 | missing-hook | Create folder + useWidgetInput.ts |
| AssistantPage.tsx | 85 | missing-hook | Create folder + useAssistantPage.ts |
| ResponseStream.tsx | 79 | loose-file | Create folder + useResponseStream.ts |
| AssistantWidget.tsx | 65 | mixed-concerns | Create folder + useAssistantWidget.ts |

### auth

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| LoginPage.tsx | 262 | mixed-concerns | Create folder + useLoginPage.ts |
| RegisterPage.tsx | 188 | mixed-concerns | Create folder + useRegisterPage.ts |
| AuthGuard.tsx | 57 | missing-hook | Create folder + useAuthGuard.ts |

### briefing

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| BriefingPage.tsx | 233 | mixed-concerns | Create folder + useBriefingPage.ts |
| BriefingConfigPanel.tsx | 173 | mixed-concerns | Create folder + useBriefingConfigPanel.ts |
| SuggestionCard.tsx | 83 | loose-file | Create folder + useSuggestionCard.ts |

### changelog

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| EditEntryDialog.tsx | 277 | mixed-concerns | Create folder + useEditEntryDialog.ts |
| ChangelogPage.tsx | 180 | mixed-concerns | Create folder + useChangelogPage.ts |
| VersionCard.tsx | 126 | missing-hook | Create folder + useVersionCard.ts |

### dashboard

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| QuickCapture.tsx | 288 | mixed-concerns | Create folder + useQuickCapture.ts |
| ActiveAgents.tsx | 157 | mixed-concerns | Create folder + useActiveAgents.ts |
| RecentProjects.tsx | 134 | mixed-concerns | Create folder + useRecentProjects.ts |
| TodayView.tsx | 124 | loose-file | Create folder + useTodayView.ts |
| DashboardPage.tsx | 53 | loose-file | Create folder |
| GreetingHeader.tsx | 44 | loose-file | Create folder + useGreetingHeader.ts |
| DailyStats.tsx | 44 | missing-hook | Create folder + useDailyStats.ts |

### diff-viewer

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| DiffViewer.tsx | 302 | missing-hook | Create folder + useDiffViewer.ts |
| DiffFileList.tsx | 207 | loose-file | Create folder + useDiffFileList.ts |

### files

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| FileExplorer.tsx | 175 | mixed-concerns | Create folder + useFileExplorer.ts |

### fitness

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| BodyComposition.tsx | 351 | mixed-concerns | Create folder + useBodyComposition.ts |
| WorkoutForm.tsx | 337 | mixed-concerns | Create folder + useWorkoutForm.ts; extract ExerciseInput |
| GoalsPanel.tsx | 296 | mixed-concerns | Create folder + useGoalsPanel.ts; extract GoalCard |
| WorkoutEditDialog.tsx | 256 | mixed-concerns | Create folder + useWorkoutEditDialog.ts |
| MeasurementEditDialog.tsx | 221 | missing-hook | Create folder + useMeasurementEditDialog.ts |
| WorkoutLog.tsx | 150 | mixed-concerns | Create folder + useWorkoutLog.ts |
| GoalEditDialog.tsx | 181 | missing-hook | Create folder + useGoalEditDialog.ts |

### git

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| WorktreeList.tsx | 207 | mixed-concerns | Create folder + useWorktreeList.ts |
| CommitPanel.tsx | 187 | mixed-concerns | Create folder + useCommitPanel.ts |
| BranchList.tsx | 162 | missing-hook | Create folder + useBranchList.ts |
| CreatePrDialog.tsx | 149 | missing-hook | Create folder + useCreatePrDialog.ts |
| ChangelogSummary.tsx | 136 | missing-hook | Create folder + useChangelogSummary.ts |
| CommitHistory.tsx | 120 | missing-hook | Create folder + useCommitHistory.ts |

### hub

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| HubSetupPage.tsx | 451 | mixed-concerns | Create folder + useHubSetupPage.ts |

### ideas

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| IdeasPage.tsx | 303 | mixed-concerns | Create folder + useIdeasPage.ts |
| IdeaEditForm.tsx | 277 | mixed-concerns | Create folder + useIdeaEditForm.ts |

### integrations

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| DiscordActionModal.tsx | 304 | mixed-concerns | Create folder + useDiscordActionModal.ts |
| SlackActionModal.tsx | 292 | mixed-concerns | Create folder + useSlackActionModal.ts |
| NotificationsPanel.tsx | 285 | mixed-concerns | Create folder + useNotificationsPanel.ts |
| EmailPanel.tsx | 285 | mixed-concerns | Create folder + useEmailPanel.ts |
| IssueCreateForm.tsx | 185 | mixed-concerns | Create folder + useIssueCreateForm.ts |
| GitHubPanel.tsx | 141 | missing-hook | Create folder + useGitHubPanel.ts |
| DiscordPanel.tsx | 139 | missing-hook | Create folder + useDiscordPanel.ts |
| SlackPanel.tsx | 139 | missing-hook | Create folder + useSlackPanel.ts |
| NotificationRules.tsx | 117 | missing-hook | Create folder + useNotificationRules.ts |

### merge

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| MergePreviewPanel.tsx | 328 | mixed-concerns | Create folder + useMergePreviewPanel.ts |
| ConflictResolver.tsx | 323 | mixed-concerns | Create folder + useConflictResolver.ts |
| MergeConfirmModal.tsx | 217 | mixed-concerns | Create folder + useMergeConfirmModal.ts |

### my-work

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| MyWorkPage.tsx | 567 | mixed-concerns | Create folder + useMyWorkPage.ts; extract TaskRow, TeamGroup |

### notes

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| NotesList.tsx | 158 | missing-hook | Create folder + useNotesList.ts |
| NoteEditor.tsx | 156 | missing-hook | Create folder + useNoteEditor.ts |
| QuickNote.tsx | 96 | missing-hook | Create folder + useQuickNote.ts |
| NotesPage.tsx | 57 | loose-file | Create folder + useNotesPage.ts |

### onboarding

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| IntegrationsStep.tsx | 181 | mixed-concerns | Create folder + useIntegrationsStep.ts; extract inline useGitHubAuth |
| ClaudeCliStep.tsx | 141 | missing-hook | Create folder + useClaudeCliStep.ts |
| OnboardingWizard.tsx | 123 | missing-hook | Create folder + useOnboardingWizard.ts |
| CompleteStep.tsx | 87 | missing-hook | Create folder + useCompleteStep.ts |

### personal

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| PersonalPage.tsx | 132 | missing-hook | Create folder + usePersonalPage.ts |

### planner

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| PlannerPage.tsx | 277 | mixed-concerns | Create folder + usePlannerPage.ts |
| WeeklyReviewPage.tsx | 225 | mixed-concerns | Create folder + useWeeklyReviewPage.ts |
| DayView.tsx | 201 | missing-hook | Create folder + useDayView.ts |
| CalendarOverlay.tsx | 170 | missing-hook | Create folder + useCalendarOverlay.ts |
| TimeBlockEditor.tsx | 130 | missing-hook | Create folder + useTimeBlockEditor.ts |
| WeekOverview.tsx | 130 | missing-hook | Create folder + useWeekOverview.ts |
| GoalsList.tsx | 129 | missing-hook | Create folder + useGoalsList.ts |
| WeeklyReflectionSection.tsx | 95 | missing-hook | Create folder + useWeeklyReflection.ts |

### productivity

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| SpotifyWidget.tsx | 252 | mixed-concerns | Create folder + useSpotifyWidget.ts; extract NowPlaying |
| CalendarWidget.tsx | 131 | missing-hook | Create folder + useCalendarWidget.ts |

### projects

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| ProjectListPage.tsx | 348 | mixed-concerns | Create folder + useProjectListPage.ts |
| ProjectInitWizard.tsx | 321 | mixed-concerns | Create folder + useProjectInitWizard.ts |
| CreateProjectWizard.tsx | 287 | mixed-concerns | Create folder + useCreateProjectWizard.ts |
| ProjectEditDialog.tsx | 277 | mixed-concerns | Create folder + useProjectEditDialog.ts |
| WorktreeManager.tsx | 168 | missing-hook | Create folder + useWorktreeManager.ts |
| SetupProgressModal.tsx | 158 | loose-file | Create folder |
| SubprojectSelector.tsx | 157 | missing-hook | Create folder + useSubprojectSelector.ts |
| BranchSelector.tsx | 128 | missing-hook | Create folder + useBranchSelector.ts |
| ProjectList.tsx | 126 | missing-hook | Create folder + useProjectList.ts |

### runners

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| RunnerPanel.tsx | 152 | mixed-concerns | Create folder + useRunnerPanel.ts |
| ProfileEditDialog.tsx | 108 | missing-hook | Create folder + useProfileEditDialog.ts |

### settings

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| HubSettings.tsx | 547 | mixed-concerns | Create folder + useHubSettings.ts; extract 3 sub-panels |
| StorageManagementSection.tsx | 467 | mixed-concerns | Create folder + useStorageManagement.ts |
| LayoutSection.tsx | 419 | mixed-concerns | Create folder + useLayoutSection.ts; move SVG previews |
| TestingSettingsTab.tsx | 333 | mixed-concerns | Create folder + useTestingSettings.ts |
| WebhookSettings.tsx | 320 | mixed-concerns | Create folder + useWebhookSettings.ts |
| SettingsPage.tsx | 264 | mixed-concerns | Create folder + useSettingsPage.ts |
| HotkeySettings.tsx | 239 | mixed-concerns | Create folder + useHotkeySettings.ts |
| DataLocationSection.tsx | 229 | mixed-concerns | Create folder + useDataLocation.ts |
| RetentionControl.tsx | 210 | missing-hook | Create folder + useRetentionControl.ts |
| WorkspaceEditor.tsx | 190 | missing-hook | Create folder + useWorkspaceEditor.ts |
| ProfileFormModal.tsx | 190 | missing-hook | Create folder + useProfileFormModal.ts |
| ProfileSection.tsx | 173 | mixed-concerns | Create folder + useProfileSection.ts |
| GitHubAuthSettings.tsx | 154 | mixed-concerns | Create folder + useGitHubAuthSettings.ts |
| ClaudeAuthSettings.tsx | 134 | missing-hook | Create folder + useClaudeAuthSettings.ts |
| BackgroundSettings.tsx | 122 | missing-hook | Create folder + useBackgroundSettings.ts |
| AppBehaviorSection.tsx | 114 | missing-hook | Create folder + useAppBehavior.ts |
| WorkspacesTab.tsx | 89 | missing-hook | Create folder + useWorkspacesTab.ts |
| OAuthProviderSettings.tsx | ~120 | loose-file | Needs folder + hook |

### tasks

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| CreatePrDialog.tsx | 286 | mixed-concerns | Create folder + useCreatePrDialog.ts |
| BulkActionBar.tsx | 241 | missing-hook | Create folder + useBulkActionBar.ts |
| CreateTaskDialog.tsx | 235 | mixed-concerns | Create folder + useCreateTaskDialog.ts |
| EditProgressTaskDialog.tsx | 215 | mixed-concerns | Create folder + useEditProgressTaskDialog.ts |
| TaskFiltersToolbar.tsx | 196 | mixed-concerns | Create folder + useTaskFiltersToolbar.ts |
| LinkPrDialog.tsx | 158 | missing-hook | Create folder + useLinkPrDialog.ts |
| LinkJiraDialog.tsx | 154 | missing-hook | Create folder + useLinkJiraDialog.ts |

### terminals

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| TerminalInstance.tsx | 173 | mixed-concerns | Create folder + useTerminalInstance.ts |
| TerminalGrid.tsx | 132 | mixed-concerns | Create folder + useTerminalGrid.ts |

### test-suite

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| ConfigEditDialog.tsx | 403 | mixed-concerns | Create folder + useConfigEditDialog.ts |
| SaveRecordingDialog.tsx | 378 | mixed-concerns | Create folder + useSaveRecordingDialog.ts |
| RecordingPanel.tsx | 246 | mixed-concerns | Create folder + useRecordingPanel.ts |
| ResultsToolbar.tsx | 242 | missing-hook | Create folder + useResultsToolbar.ts |
| SetupCard.tsx | 225 | mixed-concerns | Create folder + useSetupCard.ts |
| ResultsOutputLog.tsx | 215 | loose-file | Create folder + useResultsOutputLog.ts |
| StepList.tsx | 211 | mixed-concerns | Create folder + useStepList.ts |
| LibraryPanel.tsx | 203 | mixed-concerns | Create folder + useLibraryPanel.ts |
| BrowserViewPanel.tsx | 185 | mixed-concerns | Create folder + useBrowserViewPanel.ts |
| ScreenshotsPanel.tsx | 182 | mixed-concerns | Create folder + useScreenshotsPanel.ts |
| ExportPanel.tsx | 181 | mixed-concerns | Create folder + useExportPanel.ts |
| AnalyticsDetailCards.tsx | 165 | loose-file | Create folder (pure render) |
| DiffViewer.tsx | 150 | missing-hook | Create folder + useDiffViewer.ts |
| ResultsPanel.tsx | 146 | mixed-concerns | Create folder + useResultsPanel.ts |
| LibraryScriptRow.tsx | 144 | loose-file | Create folder for consistency |
| CreateTaskFromRunDialog.tsx | 139 | missing-hook | Create folder + useCreateTaskFromRunDialog.ts |
| DataRunDialog.tsx | 136 | missing-hook | Create folder + useDataRunDialog.ts |
| SharedStepsPanel.tsx | 128 | mixed-concerns | Create folder + useSharedStepsPanel.ts |
| ResultsWorkflowActions.tsx | 125 | mixed-concerns | Create folder + useResultsWorkflowActions.ts |
| RunLogDialog.tsx | 118 | missing-hook | Create folder + useRunLogDialog.ts |
| StepTimeline.tsx | 105 | loose-file | Create folder for consistency |
| CreateSharedStepDialog.tsx | 100 | missing-hook | Create folder + useCreateSharedStepDialog.ts |
| AnalyticsPanel.tsx | 99 | missing-hook | Create folder + useAnalyticsPanel.ts |
| TestSuitePage.tsx | 95 | missing-hook | Create folder + useTestSuitePage.ts |
| ScheduleDialog.tsx | 88 | missing-hook | Create folder + useScheduleDialog.ts |
| ScreenshotGallery.tsx | 163 | missing-hook | Create folder + useScreenshotGallery.ts |
| TrendChart.tsx | 111 | loose-file | Create folder for consistency |

### tools

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| WorkflowEditor.tsx | 281 | mixed-concerns | Create folder + useWorkflowEditor.ts |
| ToolsPage.tsx | 150 | missing-hook | Create folder + useToolsPage.ts |

### visualization

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| VisualizationPage.tsx | 111 | mixed-concerns | Create folder + useVisualizationPage.ts |

### workflow

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| WorkflowPermissionModal.tsx | 112 | mixed-concerns | Create folder + useWorkflowPermissionModal.ts |

### workflow-pipeline

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| WorkflowPipelinePage.tsx | 179 | mixed-concerns | Create folder + useWorkflowPipelinePage.ts |
| TaskSelector.tsx | 53 | loose-file | Create folder for consistency |

### workspace

| File | Lines | Violation | Action |
|------|-------|-----------|--------|
| TeamLeadPanel.tsx | 265 | mixed-concerns | Create folder + useTeamLeadPanel.ts |
| PrimarySessionPanel.tsx | 134 | mixed-concerns | Create folder + usePrimarySessionPanel.ts |
| WorkspacePage.tsx | 98 | missing-hook | Create folder + useWorkspacePage.ts |
| TeamLeadPanelList.tsx | 54 | loose-file | Create folder for consistency |
