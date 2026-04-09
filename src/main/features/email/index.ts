/**
 * Email service barrel exports
 */

export { createEmailService } from './email-service';
export type { EmailService, EmailServiceDeps } from './email-service';

export {
  buildSmtpConfig,
  getSmtpPreset,
  isValidEmail,
  SMTP_PROVIDER_LABELS,
  SMTP_PROVIDERS,
  validateEmailAddresses,
} from './email-config';
