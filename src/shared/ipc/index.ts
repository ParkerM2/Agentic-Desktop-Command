/**
 * IPC Contract — Root Barrel
 *
 * Merges all domain-specific invoke and event contracts into the
 * unified ipcInvokeContract and ipcEventContract objects that
 * match the original monolithic ipc-contract.ts shape.
 *
 * Domain contracts are in src/shared/ipc/<domain>/ folders.
 */

import { agentDashboardEvents, agentDashboardInvoke } from './agent-dashboard';
import { alertsEvents, alertsInvoke } from './alerts';
import {
  appEvents,
  appInvoke,
  dockerInvoke,
  healthEvents,
  healthInvoke,
  windowInvoke,
} from './app';
import { assistantEvents, assistantInvoke } from './assistant';
import { authEvents, authInvoke } from './auth';
import { briefingEvents, briefingInvoke } from './briefing';
import { busEvents, busInvoke } from './bus';
import { calendarInvoke } from './calendar';
import { changelogInvoke } from './changelog';
import { claudeEvents, claudeInvoke } from './claude';
import { dashboardEvents, dashboardInvoke } from './dashboard';
import { dataManagementEvents, dataManagementInvoke } from './data-management';
import { devicesInvoke } from './devices';
import { emailEvents, emailInvoke } from './email';
import { filesInvoke } from './files';
import { fitnessEvents, fitnessInvoke } from './fitness';
import { gitEvents, gitInvoke } from './git';
import { githubEvents, githubInvoke } from './github';
import { hotkeysInvoke } from './hotkeys';
import { hubEvents, hubInvoke } from './hub';
import { hubTasksEvents, hubTasksInvoke, tasksEvents } from './hub-tasks';
import { ideasEvents, ideasInvoke } from './ideas';
import { insightsInvoke } from './insights';
import { mcpInvoke } from './mcp';
import { mergeInvoke } from './merge';
import { notesEvents, notesInvoke } from './notes';
import { notificationsEvents, notificationsInvoke } from './notifications';
import { oauthInvoke } from './oauth';
import { peersEvents, peersInvoke } from './peers';
import { plannerEvents, plannerInvoke } from './planner';
import { progressEvents, progressInvoke } from './progress';
import { projectsEvents, projectsInvoke } from './projects';
import { qaEvents, qaInvoke } from './qa';
import { runnersEvents, runnersInvoke } from './runners';
import { screenInvoke } from './screen';
import {
  securityInvoke,
  settingsInvoke,
} from './settings';
import { spotifyInvoke } from './spotify';
import { terminalsEvents, terminalsInvoke } from './terminals';
import { testSuiteEvents, testSuiteInvoke } from './test-suite';
import { visualizationInvoke } from './visualization';
import { voiceEvents, voiceInvoke } from './voice';
import { webhookEvents, webhookInvoke } from './webhook';
import { workflowEvents, workflowInvoke } from './workflow';
import { workspaceEvents, workspaceInvoke } from './workspace';
import { workspacesInvoke } from './workspaces';

// ─── Merged Invoke Contract ──────────────────────────────────

export const ipcInvokeContract = {
  ...projectsInvoke,
  ...hubTasksInvoke,
  ...terminalsInvoke,
  ...settingsInvoke,
  ...hotkeysInvoke,
  ...voiceInvoke,
  ...screenInvoke,
  ...securityInvoke,
  ...notesInvoke,
  ...peersInvoke,
  ...plannerInvoke,
  ...alertsInvoke,
  ...gitInvoke,
  ...mergeInvoke,
  ...ideasInvoke,
  ...changelogInvoke,
  ...insightsInvoke,
  ...filesInvoke,
  ...fitnessInvoke,
  ...assistantInvoke,
  ...hubInvoke,
  ...devicesInvoke,
  ...githubInvoke,
  ...spotifyInvoke,
  ...calendarInvoke,
  ...appInvoke,
  ...healthInvoke,
  ...dockerInvoke,
  ...windowInvoke,
  ...qaInvoke,
  ...testSuiteInvoke,
  ...mcpInvoke,
  ...claudeInvoke,
  ...emailInvoke,
  ...notificationsInvoke,
  ...briefingInvoke,
  ...workspacesInvoke,
  ...authInvoke,
  ...oauthInvoke,
  ...workflowInvoke,
  ...dashboardInvoke,
  ...dataManagementInvoke,
  ...agentDashboardInvoke,
  ...workspaceInvoke,
  ...visualizationInvoke,
  ...webhookInvoke,
  ...progressInvoke,
  ...busInvoke,
  ...runnersInvoke,

} as const;

// ─── Merged Event Contract ───────────────────────────────────

export const ipcEventContract = {
  ...tasksEvents,
  ...hubTasksEvents,
  ...terminalsEvents,
  ...projectsEvents,
  ...appEvents,
  ...healthEvents,
  ...voiceEvents,
  ...assistantEvents,
  ...claudeEvents,
  ...webhookEvents,
  ...gitEvents,
  ...notesEvents,
  ...peersEvents,
  ...plannerEvents,
  ...alertsEvents,
  ...ideasEvents,
  ...fitnessEvents,
  ...hubEvents,
  ...githubEvents,
  ...emailEvents,
  ...notificationsEvents,
  ...briefingEvents,
  ...qaEvents,
  ...testSuiteEvents,
  ...dashboardEvents,
  ...dataManagementEvents,
  ...authEvents,
  ...agentDashboardEvents,
  ...workspaceEvents,
  ...workflowEvents,
  ...progressEvents,
  ...busEvents,
  ...runnersEvents,

} as const;

// ─── Type Utilities ──────────────────────────────────────────

export type { EventChannel, EventPayload, InvokeChannel, InvokeInput, InvokeOutput } from './types';

// ─── Schema Re-exports ───────────────────────────────────────
// Explicit named re-exports to avoid ambiguity from mega-domains
// that aggregate schemas from multiple sub-domains.

export {
  AssistantContextSchema,
  AssistantResponseSchema,
  CommandHistoryEntrySchema,
  WebhookCommandSchema,
  WebhookCommandSourceContextSchema,
} from './assistant';

export {
  AuthTokensSchema,
  LoginInputSchema,
  LoginOutputSchema,
  RefreshInputSchema,
  RefreshOutputSchema,
  RegisterInputSchema,
  RegisterOutputSchema,
  UserSchema,
} from './auth';


export { CaptureSchema } from './dashboard';

export { DockerHubSetupResultSchema, DockerStatusSchema } from './app';

export {
  ClaudeConversationSchema,
  ClaudeMessageSchema,
  ClaudeSendMessageResponseSchema,
  ClaudeStreamChunkSchema,
  ClaudeTokenUsageSchema,
} from './claude';

export { SuccessResponseSchema, SuccessWithErrorSchema, TokenUsageSchema } from './common';

export {
  CleanupResultSchema,
  DataExportArchiveSchema,
  DataLifecycleSchema,
  DataRetentionSettingsSchema,
  DataStoreEntrySchema,
  DataStoreUsageSchema,
  ImportResultSchema,
  RetentionPolicySchema,
} from './data-management';

export {
  EmailAttachmentSchema,
  EmailSchema,
  EmailSendResultSchema,
  EmailStatusSchema,
  QueuedEmailSchema,
  SmtpConfigSchema,
  SmtpProviderSchema,
} from './email';


export {
  GitBranchSchema,
  GitCommitInputSchema,
  GitCommitOutputSchema,
  GitConflictStrategySchema,
  GitCreatePrInputSchema,
  GitCreatePrOutputSchema,
  GitPushInputSchema,
  GitPushOutputSchema,
  GitResolveConflictInputSchema,
  GitResolveConflictOutputSchema,
  GitStatusSchema,
  RepoStructureSchema,
  WorktreeSchema,
} from './git';

export { FileTreeNodeSchema } from './files';

export {
  GitHubIssueSchema,
  GitHubLabelSchema,
  GitHubNotificationSchema,
  GitHubPullRequestSchema,
} from './github';

export {
  ErrorCategorySchema,
  ErrorContextSchema,
  ErrorEntrySchema,
  ErrorSeveritySchema,
  ErrorStatsSchema,
  ErrorTierSchema,
  HealthStatusSchema,
  ServiceHealthSchema,
  ServiceHealthStatusSchema,
} from './app';

export {
  HubConfigOutputSchema,
  HubConnectionStatusSchema,
  HubStatusOutputSchema,
  HubSyncOutputSchema,
} from './hub';


export {
  InsightMetricsSchema,
  InsightTimeSeriesSchema,
  ProjectInsightsSchema,
  TaskDistributionSchema,
} from './insights';

export {
  MergeDiffFileSchema,
  MergeDiffSummarySchema,
  MergeFileDiffInputSchema,
  MergeFileDiffOutputSchema,
  MergeResultSchema,
} from './merge';

export {
  WorkspaceSchema,
  WorkspaceSettingsSchema,
} from './workspaces';

export { DeviceCapabilitiesSchema, DeviceSchema, DeviceTypeSchema } from './devices';

export {
  ScreenPermissionStatusSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
} from './screen';

export {
  VoiceConfigSchema,
  VoiceInputModeSchema,
} from './voice';

export {
  GitHubNotificationTypeSchema,
  GitHubWatcherConfigSchema,
  NotificationFilterSchema,
  NotificationMetadataSchema,
  NotificationSchema,
  NotificationSourceSchema,
  NotificationTypeSchema,
  NotificationWatcherConfigSchema,
  SlackNotificationTypeSchema,
  SlackWatcherConfigSchema,
} from './notifications';

export {
  OAuthAuthStatusOutputSchema,
  OAuthAuthorizeOutputSchema,
  OAuthProviderInputSchema,
  OAuthRevokeOutputSchema,
} from './oauth';


export {
  ChildRepoSchema,
  CodebaseAnalysisSchema,
  CreateProjectInputSchema,
  ProjectSchema,
  RepoDetectionResultSchema,
  RepoTypeSchema,
  SetupProgressEventSchema,
  SetupStepSchema,
  SetupStepStatusSchema,
  SubProjectSchema,
} from './projects';

export {
  QaIssueSeveritySchema,
  QaIssueSchema,
  QaModeSchema,
  QaReportSchema,
  QaResultSchema,
  QaScreenshotSchema,
  QaSessionSchema,
  QaSessionStatusSchema,
  QaVerificationResultSchema,
  QaVerificationSuiteSchema,
} from './qa';

export {
  BrowserViewBoundsSchema,
  BrowserViewCreateInputSchema,
  QaRunReportSchema,
  QaRunSchema,
  QaRunStatusSchema,
  QaScriptSchema,
  QaStepAssertSchema,
  QaStepClickSchema,
  QaStepFillSchema,
  QaStepNavigateSchema,
  QaStepPressSchema,
  QaStepSelectSchema,
  QaStepTypeSchema,
  QaStepWaitSchema,
  TestSuiteConfigSchema,
  TestSuiteScreenshotSchema,
  TestSuiteStepSchema,
} from './test-suite';
export type { TestSuiteConfig, TestSuiteScreenshot } from './test-suite';

export {
  CspModeSchema,
  SecurityAuditExportSchema,
  SecurityModeSchema,
  SecuritySettingsSchema,
} from './settings';

export { AppSettingsSchema, ProfileSchema, WebhookConfigSchema } from './settings';

export {
  ExecutionPhaseSchema,
  ExecutionProgressSchema,
  HubTaskPrioritySchema,
  HubTaskProgressSchema,
  HubTaskSchema,
  HubTaskStatusSchema,
  TaskStatusSchema,
} from './hub-tasks';

export { TerminalSessionSchema } from './terminals';

export { WindowEmptyInputSchema, WindowIsMaximizedOutputSchema } from './app';

export {
  AgentChatMessageSchema,
  AgentDashboardStatusSchema,
  AgentErrorSchema,
  AgentErrorTypeSchema,
  AgentLayoutModeSchema,
  AgentPanelDataSchema,
  AgentPanelStateSchema,
  AgentSessionSchema,
  AgentSessionTypeSchema,
  AgentTokenUsageSchema,
  ChatMessageRoleSchema,
  ContentBlockSchema,
  FileChangeSchema,
  FileChangeStatusSchema,
  PhaseStatusSchema,
  StreamJsonEventSchema,
  StreamJsonEventTypeSchema,
  TaskCriterionSchema,
  TaskPhaseSchema,
  TaskProgressSchema,
  TeamConfigSchema,
  TeamMemberSchema,
  TextBlockSchema,
  ToolCallDisplaySchema,
  ToolResultBlockSchema,
  ToolUseBlockSchema,
} from './agent-dashboard';

export {
  SessionKeySchema,
  SessionTypeSchema,
  WorkspaceSessionSchema,
  WorkspaceSessionStatusSchema,
} from './workspace';

export {
  AgentStatusSchema,
  AgentTaskInfoSchema,
  AgentTeamsDataSchema,
  CodebaseEdgeSchema,
  CodebaseFileSchema,
  CodebaseGraphSchema,
  FeatureAgentDataSchema,
  SessionLogLineSchema,
  SessionLogPageSchema,
  TrackingEventSchema,
} from './visualization';

export {
  // Template schemas (now in ./workflow)
  WorkflowBranchingSchema,
  WorkflowGuardianSchema,
  WorkflowModeSchema,
  WorkflowPermissionsSchema,
  WorkflowQaSchema,
  WorkflowTeamSchema,
  WorkflowTemplateSchema,
  // Engine schemas (now in ./workflow)
  AgentDefinitionSchema,
  WorkflowApplyInputSchema,
  WorkflowCompletedEventSchema,
  WorkflowEngineRecordSchema,
  WorkflowErrorEventSchema,
  WorkflowRunConfigSchema,
  WorkflowStateChangedEventSchema,
  WorkflowStateSchema,
} from './workflow';
export type {
  WorkflowBranching,
  WorkflowGuardian,
  WorkflowMode,
  WorkflowPermissions,
  WorkflowQa,
  WorkflowTeam,
  WorkflowTemplate,
  AgentDefinition,
} from './workflow';

export {
  progressActionSchema,
  progressPrioritySchema,
  progressStatusSchema,
  progressTaskSchema,
  workflowStepStatusSchema,
} from './progress';


// ─── Per-domain schema re-exports (formerly aggregated by personal/) ─────────

export { NoteSchema } from './notes';

export { IdeaCategorySchema, IdeaSchema, IdeaStatusSchema } from './ideas';

export {
  AlertLinkedToSchema,
  AlertSchema,
  AlertTypeSchema,
  RecurringConfigSchema,
} from './alerts';

export {
  ChangeCategorySchema,
  ChangelogEntrySchema,
  ChangeTypeSchema,
} from './changelog';

export {
  DailyPlanSchema,
  ScheduledTaskSchema,
  TimeBlockSchema,
  TimeBlockTypeSchema,
  WeeklyReviewSchema,
  WeeklyReviewSummarySchema,
} from './planner/schemas';

export {
  AgentActivitySummarySchema,
  BriefingConfigSchema,
  DailyBriefingSchema,
  SuggestionActionSchema,
  SuggestionSchema,
  SuggestionTypeSchema,
  TaskSummarySchema,
} from './briefing/schemas';

export {
  BodyMeasurementSchema,
  ExerciseSchema,
  ExerciseSetSchema,
  FitnessGoalSchema,
  FitnessGoalTypeSchema,
  FitnessStatsSchema,
  MeasurementSourceSchema,
  WeightUnitSchema,
  WorkoutSchema,
  WorkoutTypeSchema,
} from './fitness/schemas';

// ─── Integrations Domain (unified namespace) ─────────────────
export { integrationsEvents, integrationsInvoke } from './integrations';
export { INTEGRATIONS } from './integrations';
