/**
 * Email IPC Contract
 *
 * Defines invoke channels for sending email, managing SMTP config,
 * and queue operations.
 */

import { z } from 'zod';

import { SuccessResponseSchema, SuccessWithErrorSchema } from '../common/schemas';

import { EmailSchema, EmailSendResultSchema, QueuedEmailSchema, SmtpConfigSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const emailInvoke = {
  'email.send': {
    input: EmailSchema,
    output: EmailSendResultSchema,
  },
  'email.getConfig': {
    input: z.object({}),
    output: SmtpConfigSchema.nullable(),
  },
  'email.updateConfig': {
    input: SmtpConfigSchema,
    output: SuccessResponseSchema,
  },
  'email.testConnection': {
    input: z.object({}),
    output: SuccessWithErrorSchema,
  },
  'email.getQueue': {
    input: z.object({}),
    output: z.array(QueuedEmailSchema),
  },
  'email.retryQueued': {
    input: z.object({ emailId: z.string() }),
    output: EmailSendResultSchema,
  },
  'email.removeFromQueue': {
    input: z.object({ emailId: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const emailEvents = {
  'event:email.sent': {
    payload: z.object({
      messageId: z.string(),
      to: z.array(z.string()),
      subject: z.string(),
    }),
  },
  'event:email.failed': {
    payload: z.object({
      to: z.array(z.string()),
      subject: z.string(),
      error: z.string(),
    }),
  },
} as const;
