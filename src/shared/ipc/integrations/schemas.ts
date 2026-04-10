/**
 * Integrations IPC — Schemas
 *
 * Zod schemas for all integration sub-domains: email, notifications,
 * Spotify (inline in contract), and GitHub.
 *
 * Re-exports individual schema sets so consumers can import from
 * this unified location or continue importing from sub-domain paths.
 */

// ─── Email Schemas ────────────────────────────────────────────

export {
  EmailAttachmentSchema,
  EmailSchema,
  EmailSendResultSchema,
  EmailStatusSchema,
  QueuedEmailSchema,
  SmtpConfigSchema,
  SmtpProviderSchema,
} from '../email/schemas';

// ─── Notifications Schemas ────────────────────────────────────

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
} from '../notifications/schemas';

// ─── GitHub Schemas ───────────────────────────────────────────

export {
  GitHubAuthStatusSchema,
  GitHubIssueSchema,
  GitHubLabelSchema,
  GitHubNotificationSchema,
  GitHubPullRequestSchema,
  GitHubRepoSchema,
} from '../github/schemas';
