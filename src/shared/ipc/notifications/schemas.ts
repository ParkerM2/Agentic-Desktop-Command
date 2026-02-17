/**
 * Notifications IPC Schemas
 *
 * Zod schemas for notification watchers (Slack + GitHub),
 * notification filtering, and watcher configuration.
 */

import { z } from 'zod';

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
