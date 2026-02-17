/**
 * Email Service — Public API facade
 *
 * Delegates to focused modules:
 * - smtp-transport.ts — SMTP connection + sendMail
 * - email-queue.ts — Queue management with retry
 * - email-encryption.ts — Secret encryption/decryption
 * - email-store.ts — JSON file I/O for email config
 */

import type { Email, EmailSendResult, QueuedEmail, SmtpConfig } from '@shared/types';

import type { IpcRouter } from '@main/ipc/router';

import { getDecryptedPassword } from './email-encryption';
import { addToQueue, processRetryQueue, retryQueuedEmail } from './email-queue';
import { loadEmailStore, saveEmailStore } from './email-store';
import { sendEmailViaSmtp, validateFromAddress, verifySmtpConnection } from './smtp-transport';

import type { EmailQueueState } from './email-queue';
import type { StoredEmailConfig } from './email-store';

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

export interface EmailServiceDeps {
  router: IpcRouter;
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

  // Queue state accessor for queue module
  const queueState: EmailQueueState = {
    getQueue: () => emailQueue,
    setQueue: (queue: QueuedEmail[]) => {
      emailQueue = queue;
    },
    getConfig: () => currentConfig,
    persist,
    router,
  };

  // Start retry queue processor (every 30 seconds)
  const retryInterval = setInterval(() => {
    processRetryQueue(queueState);
  }, 30_000);

  // Clean up on process exit
  process.on('beforeExit', () => {
    clearInterval(retryInterval);
  });

  return {
    async sendEmail(email: Email): Promise<EmailSendResult> {
      if (!currentConfig) {
        return { success: false, error: 'Email not configured' };
      }

      const result = await sendEmailViaSmtp(email, currentConfig, router);

      if (!result.success && result.error) {
        addToQueue(email, result.error, queueState);
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
      validateFromAddress(config.from);

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

      return await verifySmtpConnection(currentConfig);
    },

    getQueuedEmails(): QueuedEmail[] {
      return [...emailQueue];
    },

    async retryQueuedEmail(emailId: string): Promise<EmailSendResult> {
      return await retryQueuedEmail(emailId, queueState);
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
