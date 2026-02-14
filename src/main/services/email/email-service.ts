/**
 * Email Service — SMTP-based email sending with queue and retry support
 *
 * SMTP passwords are encrypted using Electron safeStorage (OS-level encryption:
 * Keychain on macOS, DPAPI on Windows, libsecret on Linux).
 * Falls back to base64 when safeStorage is unavailable (CI/testing).
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app, safeStorage } from 'electron';

import nodemailer from 'nodemailer';

import type { Email, EmailSendResult, QueuedEmail, SmtpConfig } from '@shared/types';

import type { IpcRouter } from '@main/ipc/router';

import { isValidEmail, validateEmailAddresses } from './email-config';

// Maximum retry attempts for failed emails
const MAX_RETRY_ATTEMPTS = 3;

// Retry delay in milliseconds (exponential backoff base)
const RETRY_DELAY_BASE_MS = 5000;

interface EncryptedSecretEntry {
  encrypted: string;
  useSafeStorage: boolean;
}

/**
 * Check if a value is an encrypted secret entry.
 */
function isEncryptedEntry(value: unknown): value is EncryptedSecretEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.encrypted === 'string' && typeof obj.useSafeStorage === 'boolean';
}

/**
 * Encrypt a secret string using safeStorage, falling back to base64.
 */
function encryptSecret(value: string): EncryptedSecretEntry {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = safeStorage.encryptString(value);
    return {
      encrypted: buffer.toString('base64'),
      useSafeStorage: true,
    };
  }

  console.warn('[Email] safeStorage not available - falling back to base64 encoding');
  return {
    encrypted: Buffer.from(value, 'utf-8').toString('base64'),
    useSafeStorage: false,
  };
}

/**
 * Decrypt a secret entry.
 */
function decryptSecret(entry: EncryptedSecretEntry): string {
  if (entry.useSafeStorage) {
    const buffer = Buffer.from(entry.encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }

  return Buffer.from(entry.encrypted, 'base64').toString('utf-8');
}

export interface EmailService {
  sendEmail: (email: Email) => Promise<EmailSendResult>;
  getConfig: () => SmtpConfig | null;
  updateConfig: (config: SmtpConfig) => void;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  getQueuedEmails: () => QueuedEmail[];
  retryQueuedEmail: (emailId: string) => Promise<EmailSendResult>;
  removeFromQueue: (emailId: string) => void;
  isConfigured: () => boolean;
}

interface StoredEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: EncryptedSecretEntry | string; // Support migration from plaintext
  from: string;
  provider?: string;
}

interface EmailStore {
  config: StoredEmailConfig | null;
  queue: QueuedEmail[];
}

export interface EmailServiceDeps {
  router: IpcRouter;
}

function getEmailFilePath(): string {
  return join(app.getPath('userData'), 'email-config.json');
}

/**
 * Load email configuration and queue from disk.
 * Handles migration from plaintext passwords to encrypted format.
 */
function loadEmailStore(): { data: EmailStore; needsMigration: boolean } {
  const filePath = getEmailFilePath();
  if (!existsSync(filePath)) {
    return { data: { config: null, queue: [] }, needsMigration: false };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as EmailStore;
    let needsMigration = false;

    // Check if password needs migration (legacy plaintext)
    const configPass = parsed.config?.pass;
    if (typeof configPass === 'string' && configPass.length > 0) {
      needsMigration = true;
    }

    return { data: parsed, needsMigration };
  } catch {
    return { data: { config: null, queue: [] }, needsMigration: false };
  }
}

/**
 * Save email configuration and queue to disk.
 */
function saveEmailStore(store: EmailStore): void {
  const filePath = getEmailFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Create a copy with encrypted password
  const toSave: EmailStore = {
    ...store,
    config: store.config
      ? {
          ...store.config,
          pass:
            typeof store.config.pass === 'string' && store.config.pass.length > 0
              ? encryptSecret(store.config.pass)
              : store.config.pass,
        }
      : null,
  };

  writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
}

/**
 * Get decrypted password from stored config.
 */
function getDecryptedPassword(storedPass: EncryptedSecretEntry | string): string {
  if (typeof storedPass === 'string') {
    return storedPass;
  }
  if (isEncryptedEntry(storedPass)) {
    try {
      return decryptSecret(storedPass);
    } catch {
      console.error('[Email] Failed to decrypt password');
      return '';
    }
  }
  return '';
}

/**
 * Create the email service.
 */
export function createEmailService(deps: EmailServiceDeps): EmailService {
  const { router } = deps;
  const { data: store, needsMigration } = loadEmailStore();

  // Persistent state
  let currentConfig: StoredEmailConfig | null = store.config;
  let emailQueue: QueuedEmail[] = store.queue;

  function persist(): void {
    saveEmailStore({
      config: currentConfig,
      queue: emailQueue,
    });
  }

  // Migrate plaintext password to encrypted format on first load
  if (needsMigration && currentConfig) {
    console.log('[Email] Migrating plaintext password to encrypted format');
    persist();
  }

  /**
   * Create a nodemailer transporter from the current config.
   */
  function createTransporter(): nodemailer.Transporter | null {
    if (!currentConfig) {
      return null;
    }

    const password = getDecryptedPassword(currentConfig.pass);

    return nodemailer.createTransport({
      host: currentConfig.host,
      port: currentConfig.port,
      secure: currentConfig.secure,
      auth: {
        user: currentConfig.user,
        pass: password,
      },
    });
  }

  /**
   * Add an email to the retry queue.
   */
  function addToQueue(email: Email, error: string): QueuedEmail {
    const queuedEmail: QueuedEmail = {
      id: randomUUID(),
      email,
      status: 'queued',
      attempts: 1,
      lastAttempt: new Date().toISOString(),
      error,
      createdAt: new Date().toISOString(),
    };

    emailQueue.push(queuedEmail);
    persist();

    return queuedEmail;
  }

  /**
   * Send an email through the SMTP server.
   */
  async function sendEmailInternal(email: Email): Promise<EmailSendResult> {
    if (!currentConfig) {
      return { success: false, error: 'Email not configured' };
    }

    // Validate email addresses
    const allRecipients = [...email.to, ...(email.cc ?? []), ...(email.bcc ?? [])];
    const validation = validateEmailAddresses(allRecipients);

    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid email addresses: ${validation.invalid.join(', ')}`,
      };
    }

    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'Failed to create email transporter' };
    }

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: currentConfig.from,
        to: email.to.join(', '),
        subject: email.subject,
        text: email.body,
      };

      if (email.cc && email.cc.length > 0) {
        mailOptions.cc = email.cc.join(', ');
      }

      if (email.bcc && email.bcc.length > 0) {
        mailOptions.bcc = email.bcc.join(', ');
      }

      if (email.html) {
        mailOptions.html = email.html;
      }

      if (email.replyTo) {
        mailOptions.replyTo = email.replyTo;
      }

      if (email.attachments && email.attachments.length > 0) {
        mailOptions.attachments = email.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          path: att.path,
        }));
      }

      const info = (await transporter.sendMail(mailOptions)) as { messageId?: string };
      const messageId = typeof info.messageId === 'string' ? info.messageId : '';

      router.emit('event:email.sent', {
        messageId,
        to: email.to,
        subject: email.subject,
      });

      return { success: true, messageId: messageId.length > 0 ? messageId : undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      router.emit('event:email.failed', {
        to: email.to,
        subject: email.subject,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process a single queued email retry.
   */
  async function processQueuedEmailRetry(emailId: string): Promise<void> {
    const queuedEmail = emailQueue.find((e) => e.id === emailId);
    if (!queuedEmail) {
      return;
    }

    queuedEmail.attempts += 1;
    queuedEmail.lastAttempt = new Date().toISOString();

    const result = await sendEmailInternal(queuedEmail.email);
    const targetEmail = emailQueue.find((e) => e.id === emailId);

    if (!targetEmail) {
      return;
    }

    if (result.success) {
      targetEmail.status = 'sent';
      targetEmail.error = undefined;
    } else {
      targetEmail.error = result.error;
      if (targetEmail.attempts >= MAX_RETRY_ATTEMPTS) {
        targetEmail.status = 'failed';
      }
    }

    persist();
  }

  /**
   * Process the retry queue (called periodically).
   */
  function processRetryQueue(): void {
    const now = Date.now();

    for (const queuedEmail of emailQueue) {
      if (queuedEmail.status !== 'queued' || queuedEmail.attempts >= MAX_RETRY_ATTEMPTS) {
        continue;
      }

      const lastAttempt = queuedEmail.lastAttempt ? new Date(queuedEmail.lastAttempt).getTime() : 0;

      // Exponential backoff
      const delay = RETRY_DELAY_BASE_MS * Math.pow(2, queuedEmail.attempts - 1);

      if (now - lastAttempt < delay) {
        continue;
      }

      // Attempt retry (capture id to avoid race condition)
      const emailId = queuedEmail.id;
      void processQueuedEmailRetry(emailId);
    }
  }

  // Start retry queue processor (every 30 seconds)
  const retryInterval = setInterval(processRetryQueue, 30000);

  // Clean up on process exit
  process.on('beforeExit', () => {
    clearInterval(retryInterval);
  });

  return {
    async sendEmail(email: Email): Promise<EmailSendResult> {
      const result = await sendEmailInternal(email);

      if (!result.success && result.error) {
        // Add to retry queue on failure
        addToQueue(email, result.error);
      }

      return result;
    },

    getConfig(): SmtpConfig | null {
      if (!currentConfig) {
        return null;
      }

      const password = getDecryptedPassword(currentConfig.pass);

      return {
        host: currentConfig.host,
        port: currentConfig.port,
        secure: currentConfig.secure,
        auth: {
          user: currentConfig.user,
          pass: password,
        },
        from: currentConfig.from,
        provider: currentConfig.provider as SmtpConfig['provider'],
      };
    },

    updateConfig(config: SmtpConfig): void {
      // Validate from address
      if (!isValidEmail(config.from)) {
        throw new Error('Invalid "from" email address');
      }

      currentConfig = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth.user,
        pass: config.auth.pass,
        from: config.from,
        provider: config.provider,
      };

      persist();
    },

    async testConnection(): Promise<{ success: boolean; error?: string }> {
      if (!currentConfig) {
        return { success: false, error: 'Email not configured' };
      }

      const transporter = createTransporter();
      if (!transporter) {
        return { success: false, error: 'Failed to create email transporter' };
      }

      try {
        await transporter.verify();
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    },

    getQueuedEmails(): QueuedEmail[] {
      return [...emailQueue];
    },

    async retryQueuedEmail(emailId: string): Promise<EmailSendResult> {
      const queuedEmail = emailQueue.find((e) => e.id === emailId);

      if (!queuedEmail) {
        return { success: false, error: 'Email not found in queue' };
      }

      queuedEmail.attempts += 1;
      queuedEmail.lastAttempt = new Date().toISOString();

      const result = await sendEmailInternal(queuedEmail.email);

      if (result.success) {
        queuedEmail.status = 'sent';
        queuedEmail.error = undefined;
      } else {
        queuedEmail.error = result.error;
        if (queuedEmail.attempts >= MAX_RETRY_ATTEMPTS) {
          queuedEmail.status = 'failed';
        }
      }

      persist();
      return result;
    },

    removeFromQueue(emailId: string): void {
      emailQueue = emailQueue.filter((e) => e.id !== emailId);
      persist();
    },

    isConfigured(): boolean {
      return currentConfig !== null;
    },
  };
}
