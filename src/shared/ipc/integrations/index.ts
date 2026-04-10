/**
 * Integrations IPC — Barrel Export
 *
 * Single entry point for all integrations domain IPC contracts,
 * channel constants, and schemas.
 */

export { integrationsEvents, integrationsInvoke } from './contract';

export {
  EMAIL,
  EMAIL_EVENTS,
  GITHUB,
  GITHUB_EVENTS,
  INTEGRATIONS,
  NOTIFICATIONS,
  NOTIFICATIONS_EVENTS,
  SPOTIFY,
} from './channels';

export {
  // Email
  EmailAttachmentSchema,
  EmailSchema,
  EmailSendResultSchema,
  EmailStatusSchema,
  QueuedEmailSchema,
  SmtpConfigSchema,
  SmtpProviderSchema,
  // Notifications
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
  // GitHub
  GitHubAuthStatusSchema,
  GitHubIssueSchema,
  GitHubLabelSchema,
  GitHubNotificationSchema,
  GitHubPullRequestSchema,
  GitHubRepoSchema,
} from './schemas';
