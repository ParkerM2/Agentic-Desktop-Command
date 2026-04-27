# Library Exports (generated 2026-04-15)
# fn=function, class=class. Type-only files omitted.

## src\main\agent-host
agent-host-client.ts  fn createAgentHostClient

## src\main\auth
token-store.ts
  fn migrateFromJson
  fn createTokenStore
oauth-manager.ts  fn createOAuthManager

## src\main\auth\providers
provider-config.ts
  fn loadOAuthCredentials
  fn saveOAuthCredentials

## src\main\bootstrap
event-wiring.ts  fn wireEventForwarding
ipc-wiring.ts  fn wireIpcHandlers
lifecycle.ts  fn setupLifecycle
service-registry.ts  fn createServiceRegistry

## src\main\bus
types.ts
  fn isMutationVerb
  fn parseChannel
command-bus.ts  fn createCommandBus
mcp-bridge.ts  fn createBusMcpBridge
session-manager.ts  fn createBusSessionManager

## src\main\db
connection.ts
  fn initDatabase
  fn getDatabase
  fn closeDatabase

## src\main\features\agent-dashboard
agent-dashboard-handlers.ts  fn registerAgentDashboardHandlers

## src\main\features\alerts
alert-handlers.ts  fn registerAlertHandlers
alert-service.ts  fn createAlertService

## src\main\features\app
app-handlers.ts  fn registerAppHandlers
app-update-handlers.ts  fn registerAppUpdateHandlers
app-update-service.ts  fn createAppUpdateService
window-handlers.ts  fn registerWindowHandlers

## src\main\features\app\docker
docker-handlers.ts  fn registerDockerHandlers
docker-service.ts  fn createDockerService

## src\main\features\app\health
error-collector.ts  fn createErrorCollector
error-handlers.ts  fn registerErrorHandlers
health-registry.ts  fn createHealthRegistry
health-service.ts  fn createHealthService

## src\main\features\assistant
tool-definitions.ts
  fn getToolNames
  fn getQueryKeysForTool
  fn buildSystemPrompt
# 7 single-export files:
assistant-handlers:registerAssistantHandlers  |  assistant-service:createAssistantService  |  cross-device-query:createCrossDeviceQuery
history-store:createHistoryStore  |  tool-executor:createToolExecutor  |  watch-evaluator:createWatchEvaluator
watch-store:createWatchStore

## src\main\features\assistant\tool-handlers
task-tools.ts
  fn executeTasksCreate
  fn executeTasksList
  fn executeTasksUpdate
  fn executeTasksDelete
git-tools.ts  fn handleGitTool
project-tools.ts  fn handleProjectTool

## src\main\features\auth
auth-handlers.ts  fn registerAuthHandlers
user-session-manager.ts  fn createUserSessionManager

## src\main\features\briefing
# 7 single-export files:
briefing-cache:createBriefingCache  |  briefing-config:createBriefingConfigManager  |  briefing-generator:createBriefingGenerator
briefing-handlers:registerBriefingHandlers  |  briefing-service:createBriefingService  |  briefing-summary:createBriefingSummarizer
suggestion-engine:createSuggestionEngine

## src\main\features\bus
bus-handlers.ts  fn registerBusHandlers

## src\main\features\changelog
changelog-generator.ts
  fn getGitTags
  fn getCommitsBetweenTags
  fn getCommitsSinceTag
  fn categorizeCommit
  +1 more
changelog-handlers.ts  fn registerChangelogHandlers
changelog-service.ts  fn createChangelogService

## src\main\features\claude
claude-client.ts  fn createClaudeClient
claude-config-scanner.ts  fn scanClaudeConfig
claude-handlers.ts  fn registerClaudeHandlers
conversation-store.ts  fn createConversationStore

## src\main\features\dashboard
dashboard-handlers.ts  fn registerDashboardHandlers
dashboard-service.ts  fn createDashboardService

## src\main\features\file-tree
file-tree-service.ts  fn createFileTreeService
files-handlers.ts  fn registerFilesHandlers

## src\main\features\fitness
fitness-handlers.ts  fn registerFitnessHandlers
fitness-service.ts  fn createFitnessService
stats-calculator.ts  fn calculateStats

## src\main\features\git
git-handlers.ts  fn registerGitHandlers
git-service.ts  fn createGitService
polyrepo-service.ts  fn createPolyrepoService
worktree-service.ts  fn createWorktreeService

## src\main\features\hub\device
device-handlers.ts  fn registerDeviceHandlers
device-service.ts  fn createDeviceService
heartbeat.ts  fn createHeartbeatService

## src\main\features\hub
hub-config-store.ts
  fn encryptApiKey
  fn decryptApiKey
  fn createHubConfigStore
hub-errors.ts
  class HubApiError
  class HubNotConfiguredError
  class HubConnectionError
hub-event-mapper.ts
  fn configToConnection
  fn routeWebSocketEvent
# 8 single-export files:
hub-api-client:createHubApiClient  |  hub-auth-service:createHubAuthService  |  hub-client:createHubClient
hub-connection:createHubConnectionManager  |  hub-handlers:registerHubHandlers  |  hub-sync:createHubSyncService
hub-ws-client:createHubWsClient  |  webhook-relay:createWebhookRelay

## src\main\features\ideas
ideas-handlers.ts  fn registerIdeasHandlers
ideas-service.ts  fn createIdeasService

## src\main\features\insights
insights-handlers.ts  fn registerInsightsHandlers
insights-service.ts  fn createInsightsService

## src\main\features\integrations
calendar.ts
  fn createCalendarService
  fn registerCalendarHandlers
github-integration.ts
  fn createGitHubService
  fn registerGitHubHandlers
spotify.ts
  fn createSpotifyService
  fn registerSpotifyHandlers
integrations-handlers.ts  fn registerIntegrationsHandlers
integrations-service.ts  fn createIntegrationsService

## src\main\features\integrations\email
email-config.ts
  fn getSmtpPreset
  fn buildSmtpConfig
  fn isValidEmail
  fn validateEmailAddresses
email-encryption.ts
  fn isEncryptedEntry
  fn encryptSecret
  fn decryptSecret
  fn getDecryptedPassword
email-queue.ts
  fn migrateEmailQueueFromJson
  fn loadQueueFromDb
  fn addToQueue
  fn persistQueueToDb
  +3 more
email-store.ts
  fn migrateEmailConfigFromJson
  fn loadEmailConfig
  fn saveEmailConfig
smtp-transport.ts
  fn createTransporter
  fn validateFromAddress
  fn sendEmailViaSmtp
  fn verifySmtpConnection
email-handlers.ts  fn registerEmailHandlers
email-service.ts  fn createEmailService

## src\main\features\integrations\notifications
github-watcher.ts  fn createGitHubWatcher
notification-filter.ts  fn matchesFilter
notification-handlers.ts  fn registerNotificationHandlers
notification-manager.ts  fn createNotificationManager
notification-store.ts  fn createNotificationStore
slack-watcher.ts  fn createSlackWatcher

## src\main\features\mcp
mcp-handlers.ts  fn registerMcpHandlers

## src\main\features\merge
merge-handlers.ts  fn registerMergeHandlers
merge-service.ts  fn createMergeService

## src\main\features\milestones
milestones-handlers.ts  fn registerMilestonesHandlers
milestones-service.ts  fn createMilestonesService

## src\main\features\notes
notes-handlers.ts  fn registerNotesHandlers
notes-service.ts  fn createNotesService

## src\main\features\oauth
oauth-handlers.ts  fn registerOAuthHandlers

## src\main\features\planner
planner-service.ts
  fn migrateFromJson
  fn createPlannerService
planner-handlers.ts  fn registerPlannerHandlers

## src\main\features\progress
task-file-io.ts
  fn readFrontmatter
  fn writeFrontmatter
  fn detectRootFile
log-cleanup.ts  fn runLogCleanup
progress-handlers.ts  fn registerProgressHandlers
progress-service.ts  fn createProgressService
session-writer.ts  fn createSessionWriter

## src\main\features\project
doc-detectors.ts
  fn detectServices
  fn detectDataPersistence
  fn detectComponentPattern
  fn detectServicePattern
  +4 more
# 10 single-export files:
claudemd-generator:createClaudeMdGenerator  |  codebase-analyzer:createCodebaseAnalyzer  |  doc-generator:createDocGenerator
github-repo-creator:createGitHubRepoCreator  |  gitignore-manager:ensureGitignoreEntries  |  project-detector:detectRepoStructure
project-handlers:registerProjectHandlers  |  project-service:createProjectService  |  setup-pipeline:createSetupPipeline
skills-resolver:createSkillsResolver

## src\main\features\qa
qa-report-parser.ts
  fn parseQaReport
  fn createFallbackReport
qa-agent-poller.ts  fn waitForAgentCompletion
qa-handlers.ts  fn registerQaHandlers
qa-prompt.ts  fn buildQaPrompt
qa-runner.ts  fn createQaRunner
qa-session-store.ts  fn createQaSessionStore
qa-trigger.ts  fn createQaTrigger

## src\main\features\qa\recorder
exporter.ts  fn createExporter
index.ts  fn createQaRecorderService
recorder-handlers.ts  fn registerQaRecorderHandlers
runner.ts  fn createRunner
script-store.ts  fn createScriptStore
selector-builder.ts  fn buildSelector

## src\main\features\settings\data-management
data-export.ts
  fn exportData
  fn importData
# 9 single-export files:
cleanup-service:createCleanupService  |  config-reader:createConfigReader  |  data-dir-handlers:registerDataDirHandlers
data-management-handlers:registerDataManagementHandlers  |  data-migrator:createDataMigrator  |  reinitializable-service:isReinitializable
storage-inspector:createStorageInspector  |  user-data-migrator:createUserDataMigrator  |  user-data-resolver:createUserDataResolver

## src\main\features\settings
settings-encryption.ts
  fn isEncryptedEntry
  fn encryptSecret
  fn decryptSecret
  fn isWebhookSecretKey
  +1 more
settings-store.ts
  fn migrateFromJson
  fn loadSettingsFile
  fn saveSettingsFile
hotkeys.ts  fn registerHotkeyHandlers
security-handlers.ts  fn registerSecurityHandlers
settings-handlers.ts  fn registerSettingsHandlers
settings-service.ts  fn createSettingsService
webhook-settings-handlers.ts  fn registerWebhookSettingsHandlers

## src\main\features\settings\screen
screen-capture-service.ts  fn createScreenCaptureService
screen-handlers.ts  fn registerScreenHandlers

## src\main\features\settings\voice
voice-handlers.ts  fn registerVoiceHandlers
voice-service.ts  fn createVoiceService

## src\main\features\terminal
terminal-handlers.ts  fn registerTerminalHandlers
terminal-service.ts  fn createTerminalService

## src\main\features\visualization
agent-teams.ts
  fn agentNameToTaskNumber
  fn extractFileScope
  fn parseTaskFile
  fn buildAgentTeamsData
codebase-graph.ts
  fn detectFramework
  fn getFileGroup
  fn buildCodebaseGraph
import-parser.ts
  fn extractImportSpecifiers
  fn loadTsconfigPaths
  fn resolveSpecifier
  fn collectSourceFiles
session-log.ts
  fn encodeProjectPath
  fn findSessionFile
  fn buildSessionLog
index.ts  fn createVisualizationService
visualization-handlers.ts  fn registerVisualizationHandlers

## src\main\features\workflow
cost-tracker.ts  fn createCostTracker
jsonl-watcher.ts  fn createJsonlWatcher
progress-syncer.ts  fn createProgressSyncer
progress-watcher.ts  fn createProgressWatcher
workflow-handlers.ts  fn registerWorkflowHandlers
workflow-service.ts  fn createWorkflowService

## src\main\features\workflow\engine
context-builder.ts  fn buildAgentClaudeMd
index.ts  fn createWorkflowEngineModule
spawn-validator.ts  fn validateSpawnPrompt

## src\main\features\workflow\engine\states
finalize.ts
  fn archiveArtifact
  fn runFinalizing
guardian.ts  fn runGuardian
plan.ts  fn runPlan
preflight.ts  fn runPreflight
qa-gate.ts  fn runQaGate
setup.ts  fn runSetup
spawn.ts  fn runSpawning

## src\main\features\workflow\templates
workflow-template-handlers.ts  fn registerWorkflowTemplateHandlers
workflow-template-service.ts  fn createWorkflowTemplateService

## src\main\features\workspace
workspace-handlers.ts  fn registerWorkspaceHandlers
workspace-session-manager.ts  fn createWorkspaceSessionManager

## src\main\features\workspaces
workspaces-handlers.ts  fn registerWorkspacesHandlers
workspaces-service.ts  fn createWorkspacesService

## src\main\ipc
index.ts  fn registerAllHandlers
router.ts  fn IpcRouter
throttle.ts  fn createThrottle

## src\main\lib
logger.ts
  fn initLogger
  fn setLogLevel
  fn createScopedLogger
  fn getLogFilePath
lazy-service.ts  fn lazyService
safe-write-json.ts  fn safeWriteJson

## src\main\mcp-servers\browser
tools.ts  fn executeBrowserTool

## src\main\mcp-servers\calendar
calendar-client.ts  fn createCalendarClient
tools.ts  fn executeCalendarTool

## src\main\mcp-servers\discord
discord-client.ts  fn createDiscordClient
tools.ts  fn executeDiscordTool

## src\main\mcp-servers\github
github-client.ts
  class GitHubCliNotInstalledError
  class GitHubCliNotAuthenticatedError
  class GitHubCliApiError
  fn createGitHubCliClient
tools.ts  fn executeGitHubTool

## src\main\mcp-servers\slack
slack-client.ts  fn createSlackClient
tools.ts  fn executeSlackTool

## src\main\mcp-servers\spotify
spotify-client.ts  fn createSpotifyClient
tools.ts  fn executeSpotifyTool

## src\main\mcp
mcp-client.ts  fn createMcpClient
mcp-manager.ts  fn createMcpManager
mcp-registry.ts  fn createMcpRegistry

## src\main\services\agent-manager
stream-json-parser.ts
  fn extractToolCalls
  fn createStreamJsonParser
agent-manager-service.ts  fn createAgentManagerService
process-manager.ts  fn createProcessManager
subprocess-strategy.ts  fn SubprocessStrategy

## src\main\services\session-jsonl
jsonl-parser.ts  fn createJsonlTailReader
session-jsonl-reader.ts  fn createSessionJSONLReaderService

## src\main\services\team-watcher
team-watcher-service.ts  fn createTeamWatcherService

## src\main\services\worktree-provisioner
worktree-provisioner.ts  fn createWorktreeProvisioner

## src\main\tray
hotkey-manager.ts  fn createHotkeyManager
quick-input.ts  fn createQuickInputWindow
tray-manager.ts  fn createTrayManager

## src\renderer\app
App.tsx  fn App
providers.tsx  fn Providers
router.tsx  fn AppRouter

## src\renderer\app\components
route-skeletons.tsx
  fn DashboardSkeleton
  fn ProjectSkeleton
  fn SettingsSkeleton
  fn GenericPageSkeleton

## src\renderer\app\layouts
# 9 single-export files:
AppBreadcrumbs:AppBreadcrumbs  |  ContentHeader:ContentHeader  |  LayoutWrapper:LayoutWrapper
ProjectTabBar:ProjectTabBar  |  RootLayout:RootLayout  |  TitleBar:TitleBar
TitleBarScreenshot:TitleBarScreenshot  |  TopBar:TopBar  |  UserMenu:UserMenu

## src\renderer\app\layouts\sidebar-layouts
AppSidebar.tsx  fn AppSidebar
NavGroup.tsx  fn NavGroup

## src\renderer\app\routes
# 9 single-export files:
assistant.routes:createAssistantRoutes  |  auth.routes:createAuthRoutes  |  dashboard.routes:createDashboardRoutes
integrations.routes:createIntegrationsRoutes  |  misc.routes:createMiscRoutes  |  personal.routes:createPersonalRoutes
productivity.routes:createProductivityRoutes  |  project.routes:createProjectRoutes  |  settings.routes:createSettingsRoutes

## src\renderer\features\agent-dashboard\api
useAgentMessages.ts
  fn useAgentMessages
  fn useAgentMessagePreviews
useAgentMutations.ts
  fn useSpawnProjectOwner
  fn useSpawnTeamLead
  fn useSendMessage
  fn useStopSession
useAgentSessions.ts
  fn useAgentSessions
  fn useAgentSession
  fn useSessionsForTask
  fn useSessionLog
  +1 more
useQaSession.ts
  fn useQaSession
  fn useQaSessions
useTaskProgress.ts
  fn useTasksForFeature
  fn useTask
useWorkflowEngine.ts
  fn useWorkflowRuns
  fn useAgentDefinitions
  fn useWorkflowRun
  fn useApplyWorkflow
  +1 more
useWorkflowTemplates.ts
  fn useWorkflowTemplates
  fn useWorkflowTemplate
  fn useCreateTemplate
  fn useUpdateTemplate
  +2 more

## src\renderer\features\agent-dashboard\components
AgentPanelTabs.tsx
  fn FilesChangedTab
  fn ErrorsTab
# 18 single-export files:
ActivityLine:ActivityLine  |  AgentChatPanel:AgentChatPanel  |  AgentDashboardPage:AgentDashboardPage
AgentLayoutGrid:AgentLayoutGrid  |  AgentLayoutSingle:AgentLayoutSingle  |  AgentLayoutToolbar:AgentLayoutToolbar
AgentPanelCompact:AgentPanelCompact  |  AgentPanelExpanded:AgentPanelExpanded  |  AgentPanelPopup:AgentPanelPopup
AgentStatusBar:AgentStatusBar  |  QaPanel:QaPanel  |  RunningWorkflowsPanel:RunningWorkflowsPanel
TasksTab:TasksTab  |  TemplateEditorPanel:TemplateEditorPanel  |  TemplateListPanel:TemplateListPanel
TextMessage:TextMessage  |  ToolCallCard:ToolCallCard  |  UserMessage:UserMessage

## src\renderer\features\agent-dashboard\hooks
useAgentEvents.ts  fn useAgentDashboardEvents
useAgentStream.ts  fn useAgentStream
useProgressEvents.ts  fn useProgressEvents
useQaEvents.ts  fn useQaEvents

## src\renderer\features\agent-dashboard\lib
buildChatItems.ts  fn buildChatItems

## src\renderer\features\agents\api
useAgents.ts
  fn useAllAgents
  fn useAgents
  fn useStopAgent

## src\renderer\features\agents\components
AgentDashboard.tsx  fn AgentDashboard

## src\renderer\features\agents\hooks
useAgentEvents.ts  fn useAgentEvents

## src\renderer\features\assistant\api
useAssistant.ts
  fn useHistory
  fn useSendCommand
  fn useClearHistory

## src\renderer\features\assistant\components
# 11 single-export files:
AssistantInputBar:AssistantInputBar  |  AssistantPage:AssistantPage  |  AssistantWidget:AssistantWidget
ProjectSelector:ProjectSelector  |  QuickActionChips:QuickActionChips  |  QuickActions:QuickActions
ResponseStream:ResponseStream  |  SidebarAssistantButton:SidebarAssistantButton  |  WidgetInput:WidgetInput
WidgetMessageArea:WidgetMessageArea  |  WidgetPanel:WidgetPanel

## src\renderer\features\assistant\hooks
useAssistantEvents.ts
  fn setLastCommand
  fn useAssistantEvents
useAssistantVoice.ts  fn useAssistantVoice

## src\renderer\features\auth\api
useAuth.ts
  fn useLogin
  fn useRegister
  fn useLogout
  fn useRefreshToken
  +2 more

## src\renderer\features\auth\components
AuthGuard.tsx  fn AuthGuard
LoginPage.tsx  fn LoginPage
RegisterPage.tsx  fn RegisterPage

## src\renderer\features\auth\hooks
useAuthEvents.ts  fn useAuthInit
useSavedLogins.ts  fn useSavedLogins
useSessionEvents.ts  fn useSessionEvents
useTokenRefresh.ts  fn useTokenRefresh

## src\renderer\features\dashboard\api
useCaptures.ts
  fn useCaptures
  fn useCaptureMutations
  fn useUpdateCapture

## src\renderer\features\dashboard\components
# 7 single-export files:
ActiveAgents:ActiveAgents  |  DailyStats:DailyStats  |  DashboardPage:DashboardPage
GreetingHeader:GreetingHeader  |  QuickCapture:QuickCapture  |  RecentProjects:RecentProjects
TodayView:TodayView

## src\renderer\features\dashboard\hooks
useDashboardEvents.ts  fn useDashboardEvents

## src\renderer\features\diff-viewer\api
useDiff.ts
  fn useDiffSummary
  fn useFileDiffContent

## src\renderer\features\diff-viewer\components
DiffFileList.tsx  fn DiffFileList
DiffViewer.tsx  fn DiffViewer

## src\renderer\features\file-explorer\api
useFileTree.ts  fn useFileTree

## src\renderer\features\file-explorer\components
FileExplorer.tsx  fn FileExplorer
FileNode.tsx  fn FileNode

## src\renderer\features\file-explorer\hooks
useFileTreeEvents.ts  fn useFileTreeEvents

## src\renderer\features\git-overview\api
useGit.ts
  fn useGitStatus
  fn useGitBranches
  fn useListWorktrees
  fn useCreateBranch
  +6 more
useCommitHistory.ts  fn useCommitHistory

## src\renderer\features\git-overview\components
# 9 single-export files:
BranchDiffPanel:BranchDiffPanel  |  BranchList:BranchList  |  ChangelogSummary:ChangelogSummary
CommitHistory:CommitHistory  |  CommitPanel:CommitPanel  |  CreatePrDialog:CreatePrDialog
GitPage:GitPage  |  GitStatusCard:GitStatusCard  |  WorktreeList:WorktreeList

## src\renderer\features\hub-setup\api
useDocker.ts
  fn useDockerStatus
  fn useDockerSetupHub

## src\renderer\features\hub-setup\components
HubSetupPage.tsx  fn HubSetupPage

## src\renderer\features\hub-setup\lib
validateHubUrl.ts  fn validateHubUrl

## src\renderer\features\ideation\api
useIdeas.ts
  fn useIdeas
  fn useCreateIdea
  fn useUpdateIdea
  fn useDeleteIdea
  +1 more

## src\renderer\features\ideation\components
IdeaCard.tsx  fn IdeaCard
IdeaEditForm.tsx  fn IdeaEditForm
IdeationFilterRow.tsx  fn IdeationFilterRow
IdeationPage.tsx  fn IdeationPage

## src\renderer\features\ideation\hooks
useIdeaEvents.ts  fn useIdeaEvents

## src\renderer\features\insights\api
useInsights.ts
  fn useInsightMetrics
  fn useInsightTimeSeries
  fn useTaskDistribution
  fn useProjectBreakdown

## src\renderer\features\insights\components
InsightsPage.tsx  fn InsightsPage

## src\renderer\features\integrations\api
useEmail.ts
  fn useEmailConfig
  fn useEmailQueue
  fn useUpdateEmailConfig
  fn useTestEmailConnection
  +3 more
useGitHub.ts
  fn useGitHubAuthStatus
  fn useGitHubRepos
  fn useGitHubPrs
  fn useGitHubPrDetail
  +4 more
useMcpTool.ts
  fn useMcpToolCall
  fn useMcpConnectionState
  fn useMcpConnectedServers
useNotifications.ts
  fn useAllNotifications
  fn useNotificationsConfig
  fn useWatcherStatus
  fn useMarkNotificationRead
  +4 more

## src\renderer\features\integrations\components
# 17 single-export files:
CalendarPanel:CalendarPanel  |  DiscordActionModal:DiscordActionModal  |  DiscordPanel:DiscordPanel
EmailPanel:EmailPanel  |  GitHubConnectionStatus:GitHubConnectionStatus  |  GitHubPanel:GitHubPanel
IntegrationsPage:IntegrationsPage  |  IssueCreateForm:IssueCreateForm  |  IssueList:IssueList
NotificationList:NotificationList  |  NotificationRules:NotificationRules  |  NotificationsPanel:NotificationsPanel
PrDetailModal:PrDetailModal  |  PrDiffView:PrDiffView  |  PrList:PrList
SlackActionModal:SlackActionModal  |  SlackPanel:SlackPanel

## src\renderer\features\integrations\hooks
useGitHubEvents.ts  fn useGitHubEvents
useGitHubProjectSync.ts  fn useGitHubProjectSync
useIntegrationsEvents.ts  fn useIntegrationsEvents

## src\renderer\features\integrations
notification-rules-storage.ts
  fn loadRules
  fn saveRules

## src\renderer\features\merge\api
useMerge.ts
  fn useMergeDiff
  fn useFileDiff
  fn useMergeConflicts
  fn useMergeBranch
  +1 more

## src\renderer\features\merge\components
ConflictResolver.tsx  fn ConflictResolver
FileDiffViewer.tsx  fn FileDiffViewer
MergeConfirmModal.tsx  fn MergeConfirmModal
MergePreviewPanel.tsx  fn MergePreviewPanel

## src\renderer\features\my-work\api
useMyWork.ts  fn useAllTasks

## src\renderer\features\my-work\components
MyWorkPage.tsx  fn MyWorkPage

## src\renderer\features\onboarding\components
ClaudeCliStep.tsx  fn ClaudeCliStep
CompleteStep.tsx  fn CompleteStep
IntegrationsStep.tsx  fn IntegrationsStep
OnboardingWizard.tsx  fn OnboardingWizard
WelcomeStep.tsx  fn WelcomeStep

## src\renderer\features\onboarding
store.ts
  fn getStepIndex
  fn getTotalSteps

## src\renderer\features\personal\alerts\api
useAlerts.ts
  fn useAlerts
  fn useCreateAlert
  fn useDismissAlert
  fn useDeleteAlert
useAlertMutations.ts  fn useUpdateAlert

## src\renderer\features\personal\alerts\components
AlertEditDialog.tsx
  fn AlertEditDialog
  fn LinkedToBadge
AlertNotification.tsx  fn AlertNotification
AlertsPage.tsx  fn AlertsPage
CreateAlertModal.tsx  fn CreateAlertModal
RecurringAlerts.tsx  fn RecurringAlerts

## src\renderer\features\personal\alerts\hooks
useAlertEvents.ts  fn useAlertEvents

## src\renderer\features\personal\briefing\api
useBriefing.ts
  fn useDailyBriefing
  fn useGenerateBriefing
  fn useBriefingConfig
  fn useUpdateBriefingConfig
  +1 more

## src\renderer\features\personal\briefing\components
BriefingConfigPanel.tsx  fn BriefingConfigPanel
BriefingPage.tsx  fn BriefingPage
SuggestionCard.tsx  fn SuggestionCard

## src\renderer\features\personal\changelog\api
useChangelog.ts
  fn useChangelog
  fn useGenerateChangelog
  fn useAddChangelogEntry
  fn useUpdateChangelogEntry
  +1 more

## src\renderer\features\personal\changelog\components
# 7 single-export files:
CategorySection:CategorySection  |  ChangelogPage:ChangelogPage  |  EditableCategory:EditableCategory
EditEntryDialog:EditEntryDialog  |  EntryPreview:EntryPreview  |  GenerateForm:GenerateForm
VersionCard:VersionCard

## src\renderer\features\personal\components
PersonalPage.tsx  fn PersonalPage

## src\renderer\features\personal\fitness\api
useFitness.ts
  fn useWorkouts
  fn useDeleteWorkout
  fn useMeasurements
  fn useFitnessStats
  +3 more
useFitnessMutations.ts
  fn useLogWorkout
  fn useUpdateWorkout
  fn useUpdateMeasurement
  fn useDeleteMeasurement
  +3 more

## src\renderer\features\personal\fitness\components
# 10 single-export files:
BodyComposition:BodyComposition  |  FitnessPage:FitnessPage  |  GoalEditDialog:GoalEditDialog
GoalsPanel:GoalsPanel  |  MeasurementEditDialog:MeasurementEditDialog  |  StatsOverview:StatsOverview
WorkoutEditDialog:WorkoutEditDialog  |  WorkoutExerciseList:WorkoutExerciseList  |  WorkoutForm:WorkoutForm
WorkoutLog:WorkoutLog

## src\renderer\features\personal\fitness\hooks
useFitnessEvents.ts  fn useFitnessEvents

## src\renderer\features\personal\notes\api
useNotes.ts
  fn useNotes
  fn useCreateNote
  fn useUpdateNote
  fn useDeleteNote
  +1 more

## src\renderer\features\personal\notes\components
NoteEditor.tsx  fn NoteEditor
NotesList.tsx  fn NotesList
NotesPage.tsx  fn NotesPage
QuickNote.tsx  fn QuickNote

## src\renderer\features\personal\notes\hooks
useNoteEvents.ts  fn useNoteEvents

## src\renderer\features\personal\planner\api
usePlanner.ts
  fn useDay
  fn useUpdateDay
  fn useAddTimeBlock
  fn useUpdateTimeBlock
  +1 more
useWeeklyReview.ts
  fn useWeeklyReview
  fn useGenerateWeeklyReview
  fn useUpdateWeeklyReflection

## src\renderer\features\personal\planner\components
weekly-review-utils.ts
  fn getWeekMonday
  fn formatWeekRange
  fn formatDayCompact
  fn isToday
  +1 more
# 11 single-export files:
CalendarOverlay:CalendarOverlay  |  CategoryBar:CategoryBar  |  DayCompact:DayCompact
DayView:DayView  |  GoalsList:GoalsList  |  PlannerPage:PlannerPage
StatCard:StatCard  |  TimeBlockEditor:TimeBlockEditor  |  WeeklyReflectionSection:WeeklyReflectionSection
WeeklyReviewPage:WeeklyReviewPage  |  WeekOverview:WeekOverview

## src\renderer\features\personal\planner\hooks
usePlannerEvents.ts  fn usePlannerEvents

## src\renderer\features\planning\components
PlanningPage.tsx  fn PlanningPage

## src\renderer\features\productivity\api
useCalendar.ts
  fn useCalendarEvents
  fn useCalendarCreateEvent
  fn useCalendarDeleteEvent
useSpotify.ts
  fn useSpotifyPlayback
  fn useSpotifySearch
  fn useSpotifyPlay
  fn useSpotifyPause
  +4 more

## src\renderer\features\productivity\components
CalendarWidget.tsx  fn CalendarWidget
ProductivityPage.tsx  fn ProductivityPage
SpotifyWidget.tsx  fn SpotifyWidget

## src\renderer\features\projects\api
useGit.ts
  fn useGitStatus
  fn useGitBranches
  fn useWorktrees
  fn useRepoStructure
  +7 more
useProjects.ts
  fn useProjects
  fn useAddProject
  fn useRemoveProject
  fn useSelectDirectory
  +6 more

## src\renderer\features\projects\components
# 12 single-export files:
BranchSelector:BranchSelector  |  CreateProjectWizard:CreateProjectWizard  |  ProjectEditDialog:ProjectEditDialog
ProjectInitWizard:ProjectInitWizard  |  ProjectList:ProjectList  |  ProjectListPage:ProjectListPage
RepoTypeSelector:RepoTypeSelector  |  SetupProgressModal:SetupProgressModal  |  SubprojectSelector:SubprojectSelector
SubRepoDetector:SubRepoDetector  |  SubRepoSelector:SubRepoSelector  |  WorktreeManager:WorktreeManager

## src\renderer\features\projects\components\create-wizard-steps
StepDetails.tsx  fn StepDetails
StepGitHub.tsx  fn StepGitHub
StepReview.tsx  fn StepReview
StepTechStack.tsx  fn StepTechStack

## src\renderer\features\projects\components\wizard-steps
StepConfigure.tsx  fn StepConfigure
StepConfirm.tsx  fn StepConfirm
StepDetection.tsx  fn StepDetection
StepFolder.tsx  fn StepFolder
StepSubRepos.tsx  fn StepSubRepos

## src\renderer\features\projects\hooks
useProjectEvents.ts  fn useProjectEvents
useSetupProgress.ts  fn useSetupProgress

## src\renderer\features\qa-recorder\api
useRuns.ts
  fn useRuns
  fn useRun
  fn useRunScript
useScriptMutations.ts
  fn useSaveScript
  fn useDeleteScript
  fn useExportRun
useScripts.ts
  fn useScripts
  fn useScript

## src\renderer\features\qa-recorder\components
QaRecorderPage.tsx  fn QaRecorderPage
RunOutputPanel.tsx  fn RunOutputPanel
ScriptSelector.tsx  fn ScriptSelector
StepPanel.tsx  fn StepPanel
WebviewPanel.tsx  fn WebviewPanel

## src\renderer\features\qa-recorder\hooks
useRecorderEvents.ts  fn useRecorderEvents

## src\renderer\features\roadmap\api
useMilestones.ts
  fn useMilestones
  fn useCreateMilestone
  fn useUpdateMilestone
  fn useDeleteMilestone
  +2 more

## src\renderer\features\roadmap\components
MilestoneEditDialog.tsx  fn MilestoneEditDialog
MilestoneTaskListEditor.tsx  fn MilestoneTaskListEditor
RoadmapPage.tsx  fn RoadmapPage

## src\renderer\features\roadmap\hooks
useMilestoneEvents.ts  fn useMilestoneEvents

## src\renderer\features\settings\api
useDataLocation.ts
  fn useDataLocation
  fn useValidateDataDir
  fn useSetDataDir
  fn useConfirmDataDir
  +1 more
useDataManagement.ts
  fn useDataRegistry
  fn useDataUsage
  fn useDataRetention
  fn useUpdateRetention
  +4 more
useDevices.ts
  fn useDevices
  fn useRegisterDevice
  fn useUpdateDevice
useHealth.ts
  fn useErrorLog
  fn useErrorStats
  fn useHealthStatus
  fn useClearErrorLog
  +1 more
useHub.ts
  fn useHubStatus
  fn useHubConfig
  fn useHubConnect
  fn useHubDisconnect
  +2 more
useOAuth.ts
  fn useOAuthStatus
  fn useOAuthAuthorize
  fn useOAuthRevoke
useScreenCapture.ts
  fn useAvailableSources
  fn useCaptureScreen
  fn useScreenPermission
useSettings.ts
  fn useSettings
  fn useUpdateSettings
  fn useProfiles
  fn useCreateProfile
  +5 more
useVoice.ts
  fn useVoiceConfig
  fn useUpdateVoiceConfig
  fn useVoicePermission
useWebhookConfig.ts
  fn useWebhookConfig
  fn useUpdateWebhookConfig

## src\renderer\features\settings\components
oauth-provider-constants.ts
  fn validateCredentials
  fn useOAuthProviders
  fn useSaveOAuthProvider
# 35 single-export files:
AppBehaviorSection:AppBehaviorSection  |  AppearanceModeSection:AppearanceModeSection  |  BackgroundSettings:BackgroundSettings
ClaudeAuthSettings:ClaudeAuthSettings  |  CollapsibleInstructions:CollapsibleInstructions  |  ColorThemeSection:ColorThemeSection
CredentialInput:CredentialInput  |  DataLocationSection:DataLocationSection  |  DeviceCard:DeviceCard
DeviceSelector:DeviceSelector  |  GitHubAuthSettings:GitHubAuthSettings  |  GitHubSetupInstructions:GitHubSetupInstructions
HotkeySettings:HotkeySettings  |  HubSettings:HubSettings  |  LayoutSection:LayoutSection
OAuthConnectionStatus:OAuthConnectionStatus  |  OAuthProviderForm:OAuthProviderForm  |  OAuthProviderSettings:OAuthProviderSettings
ProfileCard:ProfileCard  |  ProfileFormModal:ProfileFormModal  |  ProfileSection:ProfileSection
ProviderConsoleInfo:ProviderConsoleInfo  |  RetentionControl:RetentionControl  |  SecretInput:SecretInput
SettingsPage:SettingsPage  |  SlackSetupInstructions:SlackSetupInstructions  |  StorageManagementSection:StorageManagementSection
StorageUsageBar:StorageUsageBar  |  TypographySection:TypographySection  |  UiScaleSection:UiScaleSection
WebhookSettings:WebhookSettings  |  WebhookUrlDisplay:WebhookUrlDisplay  |  WorkspaceCard:WorkspaceCard
WorkspaceEditor:WorkspaceEditor  |  WorkspacesTab:WorkspacesTab

## src\renderer\features\settings\components\health
HealthIndicator.tsx  fn HealthIndicator
HealthPanel.tsx  fn HealthPanel

## src\renderer\features\settings\components\screen
ScreenshotButton.tsx  fn ScreenshotButton
ScreenshotViewer.tsx  fn ScreenshotViewer

## src\renderer\features\settings\components\theme-editor
css-exporter.ts
  fn exportTokensToCss
  fn copyToClipboard
# 7 single-export files:
ColorControl:ColorControl  |  ColorSection:ColorSection  |  css-parser:parseCssToTokens
CssImportDialog:CssImportDialog  |  SavedThemesBar:SavedThemesBar  |  ThemeEditorPage:ThemeEditorPage
ThemePreview:ThemePreview

## src\renderer\features\settings\components\voice
VoiceButton.tsx  fn VoiceButton
VoiceSettings.tsx  fn VoiceSettings

## src\renderer\features\settings\hooks
useSpeechSynthesis.ts
  fn useSpeechSynthesis
  fn findVoice
  fn getDefaultVoice
useDataManagementEvents.ts  fn useDataManagementEvents
useDeviceEvents.ts  fn useDeviceEvents
useErrorEvents.ts  fn useErrorEvents
useSpeechRecognition.ts  fn useSpeechRecognition

## src\renderer\features\tasks\api
useAgentMutations.ts
  fn useStartPlanning
  fn useStartExecution
  fn useReplanWithFeedback
  fn useKillAgent
  +1 more
useProgress.ts
  fn useProgressTasks
  fn useProgressTask
  fn useArchivedProgressTasks
useProgressMutations.ts
  fn useCreateProgressTask
  fn useUpdateProgressTask
  fn useArchiveProgressTask
  fn useDeleteProgressTask
  +5 more
useQaMutations.ts
  fn useQaReport
  fn useQaSession
  fn useStartQuietQa
  fn useStartFullQa
  +1 more
useTaskMutations.ts
  fn useUpdateTaskStatus
  fn useDeleteTask
  fn useExecuteTask
  fn useCancelTask
useTasks.ts
  fn useTasks
  fn useTask
  fn useAllTasks
  fn useCreateTask

## src\renderer\features\tasks\components
# 8 single-export files:
BulkActionBar:BulkActionBar  |  CreatePrDialog:CreatePrDialog  |  CreateTaskDialog:CreateTaskDialog
EditProgressTaskDialog:EditProgressTaskDialog  |  LinkJiraDialog:LinkJiraDialog  |  LinkPrDialog:LinkPrDialog
TaskFiltersToolbar:TaskFiltersToolbar  |  TaskStatusBadge:TaskStatusBadge

## src\renderer\features\tasks\components\cells
# 12 single-export files:
ActionsCell:ActionsCell  |  ActivitySparklineCell:ActivitySparklineCell  |  AgentCell:AgentCell
CostCell:CostCell  |  PriorityCell:PriorityCell  |  ProgressBarCell:ProgressBarCell
PrStatusCell:PrStatusCell  |  RelativeTimeCell:RelativeTimeCell  |  StatusBadgeCell:StatusBadgeCell
TitleCell:TitleCell  |  WatchdogDropdown:WatchdogDropdown  |  WorkspaceCell:WorkspaceCell

## src\renderer\features\tasks\components\detail
# 13 single-export files:
AgentDetailExpander:AgentDetailExpander  |  ExecutionLog:ExecutionLog  |  PlanFeedbackDialog:PlanFeedbackDialog
PlanViewer:PlanViewer  |  ProgressTaskDetailRow:ProgressTaskDetailRow  |  PrStatusPanel:PRStatusPanel
QaReportViewer:QaReportViewer  |  SubtaskList:SubtaskList  |  summary-block-parser:extractSummaryBlock
TaskControls:TaskControls  |  TaskDetailRow:TaskDetailRow  |  TaskResultView:TaskResultView
TeamActivityPanel:TeamActivityPanel

## src\renderer\features\tasks\components\grid
ProgressTaskGrid.tsx  fn ProgressTaskGrid

## src\renderer\features\tasks\hooks
useAgentEvents.ts  fn useAgentEvents
useQaEvents.ts  fn useQaEvents
useTaskEvents.ts  fn useTaskEvents

## src\renderer\features\terminals\api
useTerminals.ts
  fn useTerminals
  fn useCreateTerminal
  fn useCloseTerminal
  fn useSendTerminalInput
  +1 more

## src\renderer\features\terminals\components
TerminalGrid.tsx  fn TerminalGrid
TerminalInstance.tsx  fn TerminalInstance

## src\renderer\features\terminals\hooks
useTerminalEvents.ts  fn useTerminalEvents

## src\renderer\features\tools\api
useWorkflowTemplates.ts
  fn useWorkflowTemplates
  fn useWorkflowTemplate
  fn usePluginArtifacts
  fn useCreateTemplate
  +3 more
useClaudeConfig.ts  fn useClaudeConfig

## src\renderer\features\tools\components
PhaseSection.tsx  fn PhaseSection
ToolsPage.tsx  fn ToolsPage
WorkflowEditor.tsx  fn WorkflowEditor
WorkflowSidebar.tsx  fn WorkflowSidebar

## src\renderer\features\visualization\api
useVisualization.ts
  fn useCodebaseGraph
  fn useAgentTeams
  fn useSessionLog

## src\renderer\features\visualization\components\canvas
VisualizationCanvas.tsx  fn VisualizationCanvas

## src\renderer\features\visualization\components\edges
AgentScopeEdge.tsx  fn AgentScopeEdge
DataFlowEdge.tsx  fn DataFlowEdge

## src\renderer\features\visualization\components\nodes
AgentTaskNode.tsx  fn AgentTaskNode
FeatureGroupNode.tsx  fn FeatureGroupNode
FileGroupNode.tsx  fn FileGroupNode
FileNode.tsx  fn FileNode
GuardianNode.tsx  fn GuardianNode

## src\renderer\features\visualization\components\panels\node-detail
node-content.tsx
  fn getPanelTitle
  fn renderNodeContent
# 8 single-export files:
AgentDetail:AgentDetail  |  EventList:EventList  |  FeatureGroupDetail:FeatureGroupDetail
FileDetail:FileDetail  |  FileGroupDetail:FileGroupDetail  |  GuardianDetail:GuardianDetail
SessionLogSection:SessionLogSection  |  types:statusVariant

## src\renderer\features\visualization\components\panels
NodeDetailPanel.tsx  fn NodeDetailPanel

## src\renderer\features\visualization\components\toolbar
LayerToggleToolbar.tsx  fn LayerToggleToolbar

## src\renderer\features\visualization\components
VisualizationPage.tsx  fn VisualizationPage

## src\renderer\features\visualization\lib
graph-builders.ts
  fn buildCodebaseRFNodes
  fn buildHierarchicalCodebaseNodes
  fn buildAgentRFNodes
  fn buildCodebaseGroupEdges
  +1 more

## src\renderer\features\workflow-pipeline\api
useUpdateTask.ts
  fn useUpdateTaskDescription
  fn useUpdateTaskPlan

## src\renderer\features\workflow-pipeline\components
PipelineConnector.tsx  fn PipelineConnector
PipelineDiagram.tsx  fn PipelineDiagram
PipelineStepNode.tsx  fn PipelineStepNode
TaskSelector.tsx  fn TaskSelector
WorkflowPipelinePage.tsx  fn WorkflowPipelinePage

## src\renderer\features\workflow-pipeline\components\shared
MarkdownEditor.tsx  fn MarkdownEditor
MarkdownRenderer.tsx  fn MarkdownRenderer

## src\renderer\features\workflow-pipeline\components\step-panels
# 8 single-export files:
BacklogPanel:BacklogPanel  |  DonePanel:DonePanel  |  ErrorPanel:ErrorPanel
PlanningPanel:PlanningPanel  |  PlanReadyPanel:PlanReadyPanel  |  QueuedPanel:QueuedPanel
ReviewPanel:ReviewPanel  |  RunningPanel:RunningPanel

## src\renderer\features\workflow-pipeline\hooks
useWorkflowPipelineEvents.ts  fn useWorkflowPipelineEvents

## src\renderer\features\workflow\api
useWorkflow.ts
  fn useStartProgressWatcher
  fn useStopProgressWatcher
  fn useLaunchTask
  fn useSessionStatus
  +1 more

## src\renderer\features\workflow\components
WorkflowPermissionModal.tsx  fn WorkflowPermissionModal
WorkflowStatusBar.tsx  fn WorkflowStatusBar

## src\renderer\features\workflow\hooks
useWorkflowContext.ts  fn useWorkflowContext
useWorkflowEvents.ts  fn useWorkflowEvents
useWorkflowMilestones.ts  fn useWorkflowMilestones
useWorkflowStatus.ts  fn useWorkflowStatus

## src\renderer\features\workspace\api
useWorkspace.ts
  fn useWorkspaceSessions
  fn useWorkspaceInit
  fn useWorkspaceSend
  fn useSpawnTeamLead
  +5 more

## src\renderer\features\workspace\components
PrimarySessionPanel.tsx  fn PrimarySessionPanel
TeamLeadPanel.tsx  fn TeamLeadPanel
TeamLeadPanelList.tsx  fn TeamLeadPanelList
WorkspacePage.tsx  fn WorkspacePage

## src\renderer\features\workspace\hooks
useSessionThinking.ts  fn useSessionThinking

## src\renderer\features\workspace\lib
chat-utils.ts
  fn getStatusColor
  fn contentBlocksToString
  fn messagesToChatItems

## src\renderer\features\workspaces\api
useWorkspaces.ts
  fn useWorkspaces
  fn useCreateWorkspace
  fn useUpdateWorkspace
  fn useDeleteWorkspace

## src\renderer\features\workspaces\hooks
useWorkspaceEvents.ts  fn useWorkspaceEvents

## src\renderer\shared\components
# 11 single-export files:
AppUpdateNotification:AppUpdateNotification  |  AuthNotification:AuthNotification  |  ConfirmDialog:ConfirmDialog
EventBridge:EventBridge  |  HubConnectionIndicator:HubConnectionIndicator  |  HubNotification:HubNotification
HubStatus:HubStatus  |  IntegrationRequired:IntegrationRequired  |  MutationErrorToast:MutationErrorToast
RelativeTime:RelativeTime  |  WebhookNotification:WebhookNotification

## src\renderer\shared\components\error-boundaries
FeatureErrorBoundary.tsx  fn FeatureErrorBoundary
RootErrorBoundary.tsx  fn RootErrorBoundary
RouteErrorBoundary.tsx  fn RouteErrorBoundary
WidgetErrorBoundary.tsx  fn WidgetErrorBoundary

## src\renderer\shared\components\ui\composition
ActionBar.tsx  fn ActionBar
DetailPanel.tsx  fn DetailPanel
FilterBar.tsx  fn FilterBar

## src\renderer\shared\components\ui\data-display
DataGrid.tsx  fn DataGrid
LiveIndicator.tsx  fn LiveIndicator
StatusFlow.tsx  fn StatusFlow

## src\renderer\shared\components\ui
markdown-message.tsx  fn MarkdownMessage

## src\renderer\shared\hooks
useIpcQuery.ts
  fn ipcInvoke
  fn useIpcQuery
  fn useIpcMutation
# 10 single-export files:
useAgentHostEvent:useAgentHostEvent  |  useClaudeAuth:useClaudeAuth  |  useDebounce:useDebounce
useHubEvents:useHubEvent  |  useIpcEvent:useIpcEvent  |  useLayoutSync:useLayoutSync
useLooseParams:useLooseParams  |  useMutationErrorToast:useMutationErrorToast  |  useOAuthStatus:useOAuthStatus
useThemeSync:useThemeSync

## src\renderer\shared\lib
ipc.ts
  class IpcError
  fn ipc
utils.ts
  fn cn
  fn formatRelativeTime
  fn formatDuration
  fn truncate

## src\shared\constants
routes.ts  fn projectViewPath

## src\shared\ipc
channel-builder.ts
  fn domain
  fn events

## src\shared\lib
id.ts  fn generateId

## src\shared\types\hub
guards.ts
  fn isWsTaskEvent
  fn isWsDeviceEvent
  fn isWsWorkspaceEvent
  fn isWsProjectEvent
  +2 more
transitions.ts
  fn isValidStatusTransition
  fn getValidNextStatuses
