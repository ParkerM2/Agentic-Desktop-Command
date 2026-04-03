/**
 * Assistant IPC — Barrel Export
 *
 * Re-exports assistant command bar schemas and contract definitions.
 * Note: Claude SDK, email, notification, briefing, and GitHub schemas
 * are also defined in this domain's schemas.ts for backward compatibility,
 * but the root barrel imports them from their dedicated domain folders.
 */

export {
  AgentActivitySummarySchema,
  AssistantContextSchema,
  AssistantResponseSchema,
  BriefingConfigSchema,
  ClaudeConversationSchema,
  ClaudeMessageSchema,
  ClaudeSendMessageResponseSchema,
  ClaudeStreamChunkSchema,
  ClaudeTokenUsageSchema,
  CommandHistoryEntrySchema,
  DailyBriefingSchema,
  EmailAttachmentSchema,
  EmailSchema,
  EmailSendResultSchema,
  EmailStatusSchema,
  GitHubIssueSchema,
  GitHubLabelSchema,
  GitHubNotificationSchema,
  GitHubNotificationTypeSchema,
  GitHubPullRequestSchema,
  GitHubWatcherConfigSchema,
  NotificationFilterSchema,
  NotificationMetadataSchema,
  NotificationSchema,
  NotificationSourceSchema,
  NotificationTypeSchema,
  NotificationWatcherConfigSchema,
  QueuedEmailSchema,
  SlackNotificationTypeSchema,
  SlackWatcherConfigSchema,
  SmtpConfigSchema,
  SmtpProviderSchema,
  SuggestionActionSchema,
  SuggestionSchema,
  SuggestionTypeSchema,
  TaskSummarySchema,
  WebhookCommandSchema,
  WebhookCommandSourceContextSchema,
} from './schemas';

export { assistantEvents, assistantInvoke } from './contract';
