/**
 * Email IPC Contract
 *
 * Defines invoke channels for sending email, managing SMTP config,
 * and queue operations.
 */

import { z } from 'zod';

import { SuccessResponseSchema, SuccessWithErrorSchema } from '../common/schemas';

import { EMAIL, EMAIL_EVENTS } from './channels';
import { EmailSchema, EmailSendResultSchema, QueuedEmailSchema, SmtpConfigSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const emailInvoke = {
  [EMAIL.SEND.MESSAGE]: {
    input: EmailSchema,
    output: EmailSendResultSchema,
  },
  [EMAIL.GET.CONFIG]: {
    input: z.object({}),
    output: SmtpConfigSchema.nullable(),
  },
  [EMAIL.UPDATE.CONFIG]: {
    input: SmtpConfigSchema,
    output: SuccessResponseSchema,
  },
  [EMAIL.TEST.CONNECTION]: {
    input: z.object({}),
    output: SuccessWithErrorSchema,
  },
  [EMAIL.GET.QUEUE]: {
    input: z.object({}),
    output: z.array(QueuedEmailSchema),
  },
  [EMAIL.RETRY.QUEUED]: {
    input: z.object({ emailId: z.string() }),
    output: EmailSendResultSchema,
  },
  [EMAIL.REMOVE.QUEUED]: {
    input: z.object({ emailId: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const emailEvents = {
  [EMAIL_EVENTS.MESSAGE.SENT]: {
    payload: z.object({
      messageId: z.string(),
      to: z.array(z.string()),
      subject: z.string(),
    }),
  },
  [EMAIL_EVENTS.MESSAGE.FAILED]: {
    payload: z.object({
      to: z.array(z.string()),
      subject: z.string(),
      error: z.string(),
    }),
  },
} as const;
