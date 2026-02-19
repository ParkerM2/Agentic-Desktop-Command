/**
 * IPC Contract — Root Barrel
 *
 * Merges all domain-specific invoke and event contracts into the
 * unified ipcInvokeContract and ipcEventContract objects that
 * match the original monolithic ipc-contract.ts shape.
 *
 * Domain contracts are in src/shared/ipc/<domain>/ folders.
 */

import { orchestratorEvents, orchestratorInvoke } from './agents';
import { appEvents, appInvoke } from './app';
import { assistantEvents, assistantInvoke } from './assistant';
import { authInvoke } from './auth';
import { briefingEvents, briefingInvoke } from './briefing';
import { claudeEvents, claudeInvoke } from './claude';
import { dashboardEvents, dashboardInvoke } from './dashboard';
import { emailEvents, emailInvoke } from './email';
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
import { plannerEvents, plannerInvoke } from './planner';
import { projectsEvents, projectsInvoke } from './projects';
import { qaEvents, qaInvoke } from './qa';
import { settingsInvoke } from './settings';
import { spotifyInvoke } from './spotify';
import { hubTasksEvents, hubTasksInvoke, tasksEvents, tasksInvoke } from './tasks';
import { terminalsEvents, terminalsInvoke } from './terminals';
import { workflowInvoke } from './workflow';

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
  ...fitnessInvoke,
  ...assistantInvoke,
  ...hubInvoke,
  ...githubInvoke,
  ...spotifyInvoke,
  ...calendarInvoke,
  ...appInvoke,
  ...healthInvoke,
  ...orchestratorInvoke,
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
  ...orchestratorEvents,
  ...qaEvents,
  ...dashboardEvents,
} as const;

// ─── Type Utilities ──────────────────────────────────────────

export type { EventChannel, EventPayload, InvokeChannel, InvokeInput, InvokeOutput } from './types';

// ─── Schema Re-exports ───────────────────────────────────────
// Explicit named re-exports to avoid ambiguity from mega-domains
// that aggregate schemas from multiple sub-domains.

export {
  AgentPhaseSchema,
  AgentSessionStatusSchema,
  OrchestratorSessionSchema,
} from './agents';

export {
  AssistantActionSchema,
  AssistantContextSchema,
  AssistantResponseSchema,
  CommandHistoryEntrySchema,
  IntentTypeSchema,
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

export {
  AgentActivitySummarySchema,
  BriefingConfigSchema,
  DailyBriefingSchema,
  SuggestionActionSchema,
  SuggestionSchema,
  SuggestionTypeSchema,
  TaskSummarySchema,
} from './briefing';

export { CaptureSchema } from './dashboard';

export {
  ClaudeConversationSchema,
  ClaudeMessageSchema,
  ClaudeSendMessageResponseSchema,
  ClaudeStreamChunkSchema,
  ClaudeTokenUsageSchema,
} from './claude';

export { SuccessResponseSchema, SuccessWithErrorSchema, TokenUsageSchema } from './common';

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
} from './fitness';

export { GitBranchSchema, GitStatusSchema, RepoStructureSchema, WorktreeSchema } from './git';

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

export {
  AlertLinkedToSchema,
  AlertSchema,
  AlertTypeSchema,
  ChangeCategorySchema,
  ChangelogEntrySchema,
  ChangeTypeSchema,
  DeviceCapabilitiesSchema,
  DeviceSchema,
  DeviceTypeSchema,
  IdeaCategorySchema,
  IdeaSchema,
  IdeaStatusSchema,
  InsightMetricsSchema,
  InsightTimeSeriesSchema,
  MergeDiffFileSchema,
  MergeDiffSummarySchema,
  MergeFileDiffInputSchema,
  MergeFileDiffOutputSchema,
  MergeResultSchema,
  MilestoneSchema,
  MilestoneStatusSchema,
  MilestoneTaskSchema,
  NoteSchema,
  ProjectInsightsSchema,
  RecurringConfigSchema,
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

export {
  DailyPlanSchema,
  ScheduledTaskSchema,
  TimeBlockSchema,
  TimeBlockTypeSchema,
  WeeklyReviewSchema,
  WeeklyReviewSummarySchema,
} from './planner';

export {
  ChildRepoSchema,
  ProjectSchema,
  RepoDetectionResultSchema,
  RepoTypeSchema,
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
