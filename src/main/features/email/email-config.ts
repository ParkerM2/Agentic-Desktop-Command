/**
 * Email Configuration — SMTP provider presets and configuration helpers
 */

import type { SmtpConfig, SmtpProvider } from '@shared/types';

/**
 * SMTP presets for common email providers.
 * Users only need to provide auth credentials and from address.
 */
const SMTP_PRESETS: Record<Exclude<SmtpProvider, 'custom'>, Omit<SmtpConfig, 'auth' | 'from'>> = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    provider: 'gmail',
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    provider: 'outlook',
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    provider: 'yahoo',
  },
};

/**
 * Get SMTP preset configuration for a provider.
 * Returns undefined for 'custom' provider.
 */
export function getSmtpPreset(
  provider: SmtpProvider,
): Omit<SmtpConfig, 'auth' | 'from'> | undefined {
  if (provider === 'custom') {
    return undefined;
  }
  return SMTP_PRESETS[provider];
}

/**
 * Build a complete SMTP configuration from provider preset and credentials.
 */
export function buildSmtpConfig(
  provider: SmtpProvider,
  user: string,
  pass: string,
  from: string,
  customHost?: string,
  customPort?: number,
  customSecure?: boolean,
): SmtpConfig {
  const preset = getSmtpPreset(provider);

  if (preset) {
    return {
      ...preset,
      auth: { user, pass },
      from,
    };
  }

  // Custom provider requires explicit host/port
  if (!customHost || customPort === undefined) {
    throw new Error('Custom SMTP provider requires host and port');
  }

  return {
    host: customHost,
    port: customPort,
    secure: customSecure ?? customPort === 465,
    auth: { user, pass },
    from,
    provider: 'custom',
  };
}

/**
 * List of available SMTP provider names.
 */
export const SMTP_PROVIDERS: SmtpProvider[] = ['gmail', 'outlook', 'yahoo', 'custom'];

/**
 * Human-readable labels for SMTP providers.
 */
export const SMTP_PROVIDER_LABELS: Record<SmtpProvider, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook / Microsoft 365',
  yahoo: 'Yahoo Mail',
  custom: 'Custom SMTP Server',
};

/**
 * Validate an email address format.
 */
export function isValidEmail(email: string): boolean {
  // Basic email regex — covers most common cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate multiple email addresses.
 */
export function validateEmailAddresses(emails: string[]): { valid: boolean; invalid: string[] } {
  const invalid = emails.filter((email) => !isValidEmail(email));
  return {
    valid: invalid.length === 0,
    invalid,
  };
}
