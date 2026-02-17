/**
 * Assistant IPC Schemas
 *
 * Zod schemas for the AI assistant command bar, webhook commands,
 * Claude SDK conversations, briefings, email, and notifications.
 */

import { z } from 'zod';

// ── Assistant / Command Bar Schemas ─────────────────────────────

export const IntentTypeSchema = z.enum([
  'quick_command',
  'task_creation',
  'conversation',
  'watch',
  'device_query',
  'fitness',
  'calendar',
  'briefing',
  'insights',
  'ideation',
  'milestones',
  'email',
  'github',
  'planner',
  'notes',
  'changelog',
]);

export const AssistantActionSchema = z.enum([
  'create_task',
  'create_time_block',
  'create_note',
  'create_reminder',
  'search',
  'spotify_control',
  'open_url',
  'conversation',
  'watch_create',
  'watch_remove',
  'watch_list',
  'device_query',
  'fitness_log',
  'fitness_query',
  'fitness_measurements',
  'calendar_query',
  'calendar_create',
  'briefing_get',
  'insights_query',
  'ideation_create',
  'ideation_query',
  'milestones_query',
  'email_send',
  'email_queue',
  'github_prs',
  'github_issues',
  'github_notifications',
  'planner_today',
  'planner_weekly',
  'notes_search',
  'notes_list',
  'changelog_generate',
]);

export const AssistantContextSchema = z.object({
  activeProjectId: z.string().nullable(),
  activeProjectName: z.string().nullable(),
  currentPage: z.string(),
  todayDate: z.string(),
});

export const AssistantResponseSchema = z.object({
  type: z.enum(['text', 'action', 'error']),
  content: z.string(),
  intent: IntentTypeSchema.optional(),
  action: AssistantActionSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const CommandHistoryEntrySchema = z.object({
  id: z.string(),
  input: z.string(),
  source: z.enum(['commandbar', 'slack', 'github']),
  intent: IntentTypeSchema,
  action: AssistantActionSchema.optional(),
  responseSummary: z.string(),
  timestamp: z.string(),
});

// ── Webhook Command Schemas ─────────────────────────────────────

export const WebhookCommandSourceContextSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  channelId: z.string().optional(),
  channelName: z.string().optional(),
  threadTs: z.string().optional(),
  permalink: z.string().optional(),
  repo: z.string().optional(),
  prNumber: z.number().optional(),
  prTitle: z.string().optional(),
  prUrl: z.string().optional(),
  commentAuthor: z.string().optional(),
});

export const WebhookCommandSchema = z.object({
  source: z.enum(['slack', 'github']),
  commandText: z.string(),
  sourceContext: WebhookCommandSourceContextSchema,
});

// ── Claude SDK Schemas ──────────────────────────────────────────

export const ClaudeMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const ClaudeConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number(),
});

export const ClaudeTokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
});

export const ClaudeSendMessageResponseSchema = z.object({
  conversationId: z.string(),
  message: z.string(),
  usage: ClaudeTokenUsageSchema,
});

export const ClaudeStreamChunkSchema = z.object({
  conversationId: z.string(),
  type: z.enum(['content_delta', 'message_start', 'message_stop', 'error']),
  content: z.string().optional(),
  usage: ClaudeTokenUsageSchema.optional(),
  error: z.string().optional(),
});

// ── Email Schemas ───────────────────────────────────────────────

export const EmailAttachmentSchema = z.object({
  filename: z.string(),
  content: z.union([z.string(), z.instanceof(Buffer)]),
  contentType: z.string().optional(),
  path: z.string().optional(),
});

export const EmailSchema = z.object({
  to: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string(),
  body: z.string(),
  html: z.string().optional(),
  attachments: z.array(EmailAttachmentSchema).optional(),
  replyTo: z.string().optional(),
});

export const SmtpProviderSchema = z.enum(['gmail', 'outlook', 'yahoo', 'custom']);

export const SmtpConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  auth: z.object({
    user: z.string(),
    pass: z.string(),
  }),
  from: z.string(),
  provider: SmtpProviderSchema.optional(),
});

export const EmailSendResultSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
  error: z.string().optional(),
});

export const EmailStatusSchema = z.enum(['pending', 'sent', 'failed', 'queued']);

export const QueuedEmailSchema = z.object({
  id: z.string(),
  email: EmailSchema,
  status: EmailStatusSchema,
  attempts: z.number(),
  lastAttempt: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
});

// ── Notification Schemas ────────────────────────────────────────

export const NotificationSourceSchema = z.enum(['slack', 'github']);

export const SlackNotificationTypeSchema = z.enum(['mention', 'dm', 'channel', 'thread_reply']);

export const GitHubNotificationTypeSchema = z.enum([
  'pr_review',
  'pr_comment',
  'issue_mention',
  'ci_status',
  'pr_merged',
  'pr_closed',
  'issue_assigned',
]);

export const NotificationTypeSchema = z.union([
  SlackNotificationTypeSchema,
  GitHubNotificationTypeSchema,
]);

export const NotificationMetadataSchema = z.object({
  channelId: z.string().optional(),
  channelName: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  threadTs: z.string().optional(),
  owner: z.string().optional(),
  repo: z.string().optional(),
  prNumber: z.number().optional(),
  issueNumber: z.number().optional(),
  ciStatus: z.enum(['pending', 'success', 'failure']).optional(),
});

export const NotificationSchema = z.object({
  id: z.string(),
  source: NotificationSourceSchema,
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  url: z.string(),
  timestamp: z.string(),
  read: z.boolean(),
  metadata: NotificationMetadataSchema.optional(),
});

export const NotificationFilterSchema = z.object({
  sources: z.array(NotificationSourceSchema).optional(),
  types: z.array(NotificationTypeSchema).optional(),
  keywords: z.array(z.string()).optional(),
  unreadOnly: z.boolean().optional(),
});

export const SlackWatcherConfigSchema = z.object({
  enabled: z.boolean(),
  pollIntervalSeconds: z.number(),
  channels: z.array(z.string()),
  keywords: z.array(z.string()),
  watchMentions: z.boolean(),
  watchDms: z.boolean(),
  watchThreads: z.boolean(),
});

export const GitHubWatcherConfigSchema = z.object({
  enabled: z.boolean(),
  pollIntervalSeconds: z.number(),
  repos: z.array(z.string()),
  watchPrReviews: z.boolean(),
  watchPrComments: z.boolean(),
  watchIssueMentions: z.boolean(),
  watchCiStatus: z.boolean(),
});

export const NotificationWatcherConfigSchema = z.object({
  enabled: z.boolean(),
  slack: SlackWatcherConfigSchema,
  github: GitHubWatcherConfigSchema,
});

// ── Briefing Schemas ────────────────────────────────────────────

export const SuggestionTypeSchema = z.enum(['stale_project', 'parallel_tasks', 'blocked_task']);

export const SuggestionActionSchema = z.object({
  label: z.string(),
  targetId: z.string().optional(),
  targetType: z.enum(['project', 'task']).optional(),
});

export const SuggestionSchema = z.object({
  type: SuggestionTypeSchema,
  title: z.string(),
  description: z.string(),
  action: SuggestionActionSchema.optional(),
});

export const TaskSummarySchema = z.object({
  dueToday: z.number(),
  completedYesterday: z.number(),
  overdue: z.number(),
  inProgress: z.number(),
});

export const AgentActivitySummarySchema = z.object({
  runningCount: z.number(),
  completedToday: z.number(),
  errorCount: z.number(),
});

export const DailyBriefingSchema = z.object({
  id: z.string(),
  date: z.string(),
  summary: z.string(),
  taskSummary: TaskSummarySchema,
  agentActivity: AgentActivitySummarySchema,
  suggestions: z.array(SuggestionSchema),
  githubNotifications: z.number().optional(),
  generatedAt: z.string(),
});

export const BriefingConfigSchema = z.object({
  enabled: z.boolean(),
  scheduledTime: z.string(),
  includeGitHub: z.boolean(),
  includeAgentActivity: z.boolean(),
});

// ── GitHub Schemas ──────────────────────────────────────────────

export const GitHubLabelSchema = z.object({
  name: z.string(),
  color: z.string(),
});

export const GitHubPullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string(),
  state: z.enum(['open', 'closed']),
  merged: z.boolean(),
  draft: z.boolean(),
  author: z.string(),
  authorAvatar: z.string(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  headBranch: z.string(),
  baseBranch: z.string(),
  labels: z.array(GitHubLabelSchema),
  reviewers: z.array(z.string()),
  comments: z.number(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
});

export const GitHubIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string(),
  state: z.enum(['open', 'closed']),
  author: z.string(),
  authorAvatar: z.string(),
  url: z.string(),
  labels: z.array(GitHubLabelSchema),
  assignees: z.array(z.string()),
  comments: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const GitHubNotificationSchema = z.object({
  id: z.string(),
  unread: z.boolean(),
  reason: z.string(),
  title: z.string(),
  type: z.string(),
  repoName: z.string(),
  updatedAt: z.string(),
});
