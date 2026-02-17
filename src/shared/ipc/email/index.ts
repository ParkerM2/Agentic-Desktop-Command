/**
 * Email IPC — Barrel Export
 */

export { emailEvents, emailInvoke } from './contract';
export {
  EmailAttachmentSchema,
  EmailSchema,
  EmailSendResultSchema,
  EmailStatusSchema,
  QueuedEmailSchema,
  SmtpConfigSchema,
  SmtpProviderSchema,
} from './schemas';
