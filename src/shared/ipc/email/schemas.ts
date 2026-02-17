/**
 * Email IPC Schemas
 *
 * Zod schemas for email sending, SMTP configuration, and queue management.
 */

import { z } from 'zod';

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
