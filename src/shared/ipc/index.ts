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
import { appEvents, appInvoke } from './app';
import { assistantEvents, assistantInvoke } from './assistant';
import { authEvents, authInvoke } from './auth';
import { briefingEvents, briefingInvoke } from './briefing';
import { busEvents, busInvoke } from './bus';
import { claudeEvents, claudeInvoke } from './claude';
import { dashboardEvents, dashboardInvoke } from './dashboard';
import { dataManagementEvents, dataManagementInvoke } from './data-management';
import { dockerInvoke } from './docker';
import { emailEvents, emailInvoke } from './email';
import { filesInvoke } from './files';
import { fitnessEvents, fitnessInvoke } from './fitness';
import { gitEvents, gitInvoke } from './git';
import { githubEvents, githubInvoke } from './github';
import { healthEvents, healthInvoke } from './health';
import { hubEvents, hubInvoke } from './hub';
import {
  alertsEvents,
  alertsInvoke,
  calendarInvoke,
  changelogInvoke,
  devicesInvoke,
  hotkeysInvoke,
  ideasEvents,
  ideasInvoke,
  insightsInvoke,
  mcpInvoke,
  mergeInvoke,
  milestonesEvents,
  milestonesInvoke,
  notesEvents,
  notesInvoke,
  screenInvoke,
  timeInvoke,
  voiceEvents,
  voiceInvoke,
  webhookEvents,
  workspacesInvoke,
} from './misc';
import { notificationsEvents, notificationsInvoke } from './notifications';
import { oauthInvoke } from './oauth';
import { personalEvents, personalInvoke } from './personal';
import { plannerEvents, plannerInvoke } from './planner';
import { progressEvents, progressInvoke } from './progress';
import { projectsEvents, projectsInvoke } from './projects';
import { qaEvents, qaInvoke } from './qa';
import { securityInvoke } from './security';
import { settingsInvoke } from './settings';
import { spotifyInvoke } from './spotify';
import { hubTasksEvents, hubTasksInvoke, tasksEvents, tasksInvoke } from './tasks';
import { terminalsEvents, terminalsInvoke } from './terminals';
import { trackerInvoke } from './tracker';
import { visualizationInvoke } from './visualization';
import { windowInvoke } from './window';
import { workflowEvents, workflowInvoke } from './workflow';
import { workflowEngineEvents, workflowEngineInvoke } from './workflow-engine';
import { workflowTemplatesEvents, workflowTemplatesInvoke } from './workflow-templates';
import { workspaceEvents, workspaceInvoke } from './workspace';

// ─── Merged Invoke Contract ──────────────────────────────────

export const ipcInvokeContract = {
  ...projectsInvoke,
  ...tasksInvoke,
  ...hubTasksInvoke,
  ...terminalsInvoke,
  ...settingsInvoke,
  ...hotkeysInvoke,
  ...notesInvoke,
  ...plannerInvoke,
  ...alertsInvoke,
  ...gitInvoke,
  ...mergeInvoke,
  ...milestonesInvoke,
  ...ideasInvoke,
  ...changelogInvoke,
  ...insightsInvoke,
  ...filesInvoke,
  ...fitnessInvoke,
  ...assistantInvoke,
  ...hubInvoke,
  ...githubInvoke,
  ...spotifyInvoke,
  ...calendarInvoke,
  ...appInvoke,
  ...healthInvoke,
  ...qaInvoke,
  ...timeInvoke,
  ...mcpInvoke,
  ...claudeInvoke,
  ...emailInvoke,
  ...notificationsInvoke,
  ...voiceInvoke,
  ...screenInvoke,
  ...briefingInvoke,
  ...workspacesInvoke,
  ...devicesInvoke,
  ...authInvoke,
  ...oauthInvoke,
  ...workflowInvoke,
  ...dashboardInvoke,
  ...dockerInvoke,
  ...securityInvoke,
  ...dataManagementInvoke,
  ...windowInvoke,
  ...trackerInvoke,
  ...agentDashboardInvoke,
  ...workspaceInvoke,
  ...visualizationInvoke,

  ...workflowTemplatesInvoke,

  ...workflowEngineInvoke,

  ...progressInvoke,

  ...busInvoke,

  ...personalInvoke,
} as const;

// ─── Merged Event Contract ───────────────────────────────────

export const ipcEventContract = {
  ...tasksEvents,
  ...hubTasksEvents,
  ...terminalsEvents,
  ...projectsEvents,
  ...appEvents,
  ...healthEvents,
  ...assistantEvents,
  ...claudeEvents,
  ...webhookEvents,
  ...gitEvents,
  ...notesEvents,
  ...plannerEvents,
  ...alertsEvents,
  ...milestonesEvents,
  ...ideasEvents,
  ...fitnessEvents,
  ...hubEvents,
  ...githubEvents,
  ...emailEvents,
  ...notificationsEvents,
  ...voiceEvents,
  ...briefingEvents,
  ...qaEvents,
  ...dashboardEvents,
  ...dataManagementEvents,
  ...authEvents,
  ...agentDashboardEvents,
  ...workspaceEvents,
  ...workflowEvents,
  ...workflowTemplatesEvents,
  ...workflowEngineEvents,
  ...progressEvents,

  ...busEvents,

  ...personalEvents,
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

// Briefing schemas now re-exported from personal/ (see bottom of file)

export { CaptureSchema } from './dashboard';

export { DockerHubSetupResultSchema, DockerStatusSchema } from './docker';

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

// Fitness schemas now re-exported from personal/ (see bottom of file)

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
} from './health';

export {
  HubConfigOutputSchema,
  HubConnectionStatusSchema,
  HubStatusOutputSchema,
  HubSyncOutputSchema,
} from './hub';

// Personal schemas (alerts, notes, ideas, milestones, changelog) now re-exported from personal/ (see bottom of file)
export {
  DeviceCapabilitiesSchema,
  DeviceSchema,
  DeviceTypeSchema,
  InsightMetricsSchema,
  InsightTimeSeriesSchema,
  MergeDiffFileSchema,
  MergeDiffSummarySchema,
  MergeFileDiffInputSchema,
  MergeFileDiffOutputSchema,
  MergeResultSchema,
  ProjectInsightsSchema,
  ScreenPermissionStatusSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
  TaskDistributionSchema,
  VoiceConfigSchema,
  VoiceInputModeSchema,
  WorkspaceSchema,
  WorkspaceSettingsSchema,
} from './misc';

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

// Planner schemas now re-exported from personal/ (see bottom of file)

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
  CspModeSchema,
  SecurityAuditExportSchema,
  SecurityModeSchema,
  SecuritySettingsSchema,
} from './security';

export { AppSettingsSchema, ProfileSchema, WebhookConfigSchema } from './settings';

export {
  EstimatedEffortSchema,
  ExecutionPhaseSchema,
  ExecutionProgressSchema,
  GithubIssueImportSchema,
  HubTaskPrioritySchema,
  HubTaskProgressSchema,
  HubTaskSchema,
  HubTaskStatusSchema,
  SubtaskSchema,
  SuggestedPrioritySchema,
  TaskDecompositionResultSchema,
  TaskDraftSchema,
  TaskSchema,
  TaskStatusSchema,
  TaskSuggestionSchema,
} from './tasks';

export { TerminalSessionSchema } from './terminals';

export { WindowEmptyInputSchema, WindowIsMaximizedOutputSchema } from './window';

export { TrackerFileSchema, TrackerPlanSchema, TrackerPlanStatusSchema } from './tracker';

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
  WorkflowBranchingSchema,
  WorkflowGuardianSchema,
  WorkflowModeSchema,
  WorkflowPermissionsSchema,
  WorkflowQaSchema,
  WorkflowTeamSchema,
  WorkflowTemplateSchema,
} from './workflow-templates';
export type {
  WorkflowBranching,
  WorkflowGuardian,
  WorkflowMode,
  WorkflowPermissions,
  WorkflowQa,
  WorkflowTeam,
  WorkflowTemplate,
} from './workflow-templates';

export {
  AgentDefinitionSchema,
  WorkflowApplyInputSchema,
  WorkflowCompletedEventSchema,
  WorkflowEngineRecordSchema,
  WorkflowErrorEventSchema,
  WorkflowRunConfigSchema,
  WorkflowStateChangedEventSchema,
  WorkflowStateSchema,
} from './workflow-engine';
export type { AgentDefinition } from './workflow-engine';

export {
  progressActionSchema,
  progressPrioritySchema,
  progressStatusSchema,
  progressTaskSchema,
  workflowStepStatusSchema,
} from './progress';

export {
  AgentActivitySummarySchema,
  AlertLinkedToSchema,
  AlertSchema,
  AlertTypeSchema,
  BodyMeasurementSchema,
  BriefingConfigSchema,
  ChangeCategorySchema,
  ChangelogEntrySchema,
  ChangeTypeSchema,
  DailyBriefingSchema,
  DailyPlanSchema,
  ExerciseSchema,
  ExerciseSetSchema,
  FitnessGoalSchema,
  FitnessGoalTypeSchema,
  FitnessStatsSchema,
  IdeaCategorySchema,
  IdeaSchema,
  IdeaStatusSchema,
  MeasurementSourceSchema,
  MilestoneSchema,
  MilestoneStatusSchema,
  MilestoneTaskSchema,
  NoteSchema,
  PERSONAL,
  PERSONAL_EVENTS,
  RecurringConfigSchema,
  ScheduledTaskSchema,
  SuggestionActionSchema,
  SuggestionSchema,
  SuggestionTypeSchema,
  TaskSummarySchema,
  TimeBlockSchema,
  TimeBlockTypeSchema,
  WeeklyReviewSchema,
  WeeklyReviewSummarySchema,
  WeightUnitSchema,
  WorkoutSchema,
  WorkoutTypeSchema,
} from './personal';
