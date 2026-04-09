/**
 * Notifications IPC Contract
 *
 * Defines invoke channels for listing, reading, and configuring
 * notification watchers (Slack + GitHub).
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { NOTIFICATIONS, NOTIFICATIONS_EVENTS } from './channels';
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
  [NOTIFICATIONS.LIST.ALL]: {
    input: z.object({
      filter: NotificationFilterSchema.optional(),
      limit: z.number().optional(),
    }),
    output: z.array(NotificationSchema),
  },
  [NOTIFICATIONS.MARK.READ]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [NOTIFICATIONS.MARK['ALL-READ']]: {
    input: z.object({ source: NotificationSourceSchema.optional() }),
    output: z.object({ success: z.boolean(), count: z.number() }),
  },
  [NOTIFICATIONS.GET.CONFIG]: {
    input: z.object({}),
    output: NotificationWatcherConfigSchema,
  },
  [NOTIFICATIONS.UPDATE.CONFIG]: {
    input: z.object({
      enabled: z.boolean().optional(),
      slack: SlackWatcherConfigSchema.partial().optional(),
      github: GitHubWatcherConfigSchema.partial().optional(),
    }),
    output: NotificationWatcherConfigSchema,
  },
  [NOTIFICATIONS.START.WATCHING]: {
    input: z.object({}),
    output: z.object({ success: z.boolean(), watchersStarted: z.array(z.string()) }),
  },
  [NOTIFICATIONS.STOP.WATCHING]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [NOTIFICATIONS.GET['WATCHER-STATUS']]: {
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
  [NOTIFICATIONS_EVENTS.NOTIFICATION.NEW]: {
    payload: z.object({
      notification: NotificationSchema,
    }),
  },
  [NOTIFICATIONS_EVENTS.WATCHER.ERROR]: {
    payload: z.object({
      source: NotificationSourceSchema,
      error: z.string(),
    }),
  },
  [NOTIFICATIONS_EVENTS.WATCHER['STATUS-CHANGED']]: {
    payload: z.object({
      source: NotificationSourceSchema,
      status: z.enum(['started', 'stopped', 'polling', 'error']),
    }),
  },
} as const;
