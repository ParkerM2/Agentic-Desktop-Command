/**
 * Notifications IPC Contract
 *
 * Defines invoke channels for listing, reading, and configuring
 * notification watchers (Slack + GitHub).
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import {
  GitHubWatcherConfigSchema,
  NotificationFilterSchema,
  NotificationSchema,
  NotificationSourceSchema,
  NotificationWatcherConfigSchema,
  SlackWatcherConfigSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const notificationsInvoke = {
  'notifications.list': {
    input: z.object({
      filter: NotificationFilterSchema.optional(),
      limit: z.number().optional(),
    }),
    output: z.array(NotificationSchema),
  },
  'notifications.markRead': {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  'notifications.markAllRead': {
    input: z.object({ source: NotificationSourceSchema.optional() }),
    output: z.object({ success: z.boolean(), count: z.number() }),
  },
  'notifications.getConfig': {
    input: z.object({}),
    output: NotificationWatcherConfigSchema,
  },
  'notifications.updateConfig': {
    input: z.object({
      enabled: z.boolean().optional(),
      slack: SlackWatcherConfigSchema.partial().optional(),
      github: GitHubWatcherConfigSchema.partial().optional(),
    }),
    output: NotificationWatcherConfigSchema,
  },
  'notifications.startWatching': {
    input: z.object({}),
    output: z.object({ success: z.boolean(), watchersStarted: z.array(z.string()) }),
  },
  'notifications.stopWatching': {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  'notifications.getWatcherStatus': {
    input: z.object({}),
    output: z.object({
      isWatching: z.boolean(),
      activeWatchers: z.array(NotificationSourceSchema),
      lastPollTime: z.record(NotificationSourceSchema, z.string()).optional(),
      errors: z.record(NotificationSourceSchema, z.string()).optional(),
    }),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const notificationsEvents = {
  'event:notifications.new': {
    payload: z.object({
      notification: NotificationSchema,
    }),
  },
  'event:notifications.watcherError': {
    payload: z.object({
      source: NotificationSourceSchema,
      error: z.string(),
    }),
  },
  'event:notifications.watcherStatusChanged': {
    payload: z.object({
      source: NotificationSourceSchema,
      status: z.enum(['started', 'stopped', 'polling', 'error']),
    }),
  },
} as const;
