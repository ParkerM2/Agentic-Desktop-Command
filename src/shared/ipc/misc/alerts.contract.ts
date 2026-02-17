/**
 * Alerts IPC Contract
 *
 * Invoke channels for alert/reminder CRUD and dismissal.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

export const AlertTypeSchema = z.enum(['reminder', 'deadline', 'notification', 'recurring']);

export const RecurringConfigSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  time: z.string(),
  daysOfWeek: z.array(z.number()).optional(),
});

export const AlertLinkedToSchema = z.object({
  type: z.enum(['task', 'event', 'note']),
  id: z.string(),
});

export const AlertSchema = z.object({
  id: z.string(),
  type: AlertTypeSchema,
  message: z.string(),
  triggerAt: z.string(),
  recurring: RecurringConfigSchema.optional(),
  linkedTo: AlertLinkedToSchema.optional(),
  dismissed: z.boolean(),
  createdAt: z.string(),
});

export const alertsInvoke = {
  'alerts.list': {
    input: z.object({ includeExpired: z.boolean().optional() }),
    output: z.array(AlertSchema),
  },
  'alerts.create': {
    input: z.object({
      type: AlertTypeSchema,
      message: z.string(),
      triggerAt: z.string(),
      recurring: RecurringConfigSchema.optional(),
      linkedTo: AlertLinkedToSchema.optional(),
    }),
    output: AlertSchema,
  },
  'alerts.dismiss': {
    input: z.object({ id: z.string() }),
    output: AlertSchema,
  },
  'alerts.delete': {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

export const alertsEvents = {
  'event:alert.triggered': {
    payload: z.object({ alertId: z.string(), message: z.string() }),
  },
  'event:alert.changed': {
    payload: z.object({ alertId: z.string() }),
  },
} as const;
