/**
 * Email Queue — Queue management with retry and exponential backoff
 */

import { randomUUID } from 'node:crypto';

import type { Email, EmailSendResult, QueuedEmail } from '@shared/types';

import type { IpcRouter } from '@main/ipc/router';

import { sendEmailViaSmtp } from './smtp-transport';

import type { StoredEmailConfig } from './email-store';

// Maximum retry attempts for failed emails
const MAX_RETRY_ATTEMPTS = 3;

// Retry delay in milliseconds (exponential backoff base)
const RETRY_DELAY_BASE_MS = 5000;

export interface EmailQueueState {
  getQueue: () => QueuedEmail[];
  setQueue: (queue: QueuedEmail[]) => void;
  getConfig: () => StoredEmailConfig | null;
  persist: () => void;
  router: IpcRouter;
}

/**
 * Add an email to the retry queue.
 */
export function addToQueue(email: Email, error: string, state: EmailQueueState): QueuedEmail {
  const queuedEmail: QueuedEmail = {
    id: randomUUID(),
    email,
    status: 'queued',
    attempts: 1,
    lastAttempt: new Date().toISOString(),
    error,
    createdAt: new Date().toISOString(),
  };

  const queue = state.getQueue();
  queue.push(queuedEmail);
  state.setQueue(queue);
  state.persist();

  return queuedEmail;
}

/**
 * Apply a send result to a queued email entry.
 */
function applyRetryResult(queuedEmail: QueuedEmail, result: EmailSendResult): void {
  if (result.success) {
    queuedEmail.status = 'sent';
    queuedEmail.error = undefined;
  } else {
    queuedEmail.error = result.error;
    if (queuedEmail.attempts >= MAX_RETRY_ATTEMPTS) {
      queuedEmail.status = 'failed';
    }
  }
}

/**
 * Process the retry queue (called periodically).
 */
export function processRetryQueue(state: EmailQueueState): void {
  const now = Date.now();
  const queue = state.getQueue();

  for (const queuedEmail of queue) {
    if (queuedEmail.status !== 'queued' || queuedEmail.attempts >= MAX_RETRY_ATTEMPTS) {
      continue;
    }

    const lastAttempt = queuedEmail.lastAttempt ? new Date(queuedEmail.lastAttempt).getTime() : 0;
    const delay = RETRY_DELAY_BASE_MS * Math.pow(2, queuedEmail.attempts - 1);

    if (now - lastAttempt < delay) {
      continue;
    }

    const emailId = queuedEmail.id;
    void retryQueuedEmail(emailId, state);
  }
}

/**
 * Retry a specific queued email by ID.
 */
export async function retryQueuedEmail(
  emailId: string,
  state: EmailQueueState,
): Promise<EmailSendResult> {
  const queuedEmail = state.getQueue().find((e) => e.id === emailId);
  if (!queuedEmail) {
    return { success: false, error: 'Email not found in queue' };
  }

  const config = state.getConfig();
  if (!config) {
    return { success: false, error: 'Email not configured' };
  }

  queuedEmail.attempts += 1;
  queuedEmail.lastAttempt = new Date().toISOString();

  const result = await sendEmailViaSmtp(queuedEmail.email, config, state.router);
  applyRetryResult(queuedEmail, result);
  state.persist();

  return result;
}
