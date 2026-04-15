/**
 * Email Queue — SQLite-backed queue management with retry and exponential backoff
 *
 * Queue entries are stored in the `emailQueue` table.
 * Migrates from legacy email-config.json queue on first access.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';

import type { Email, EmailSendResult, QueuedEmail } from '@shared/types';

import { emailQueue as emailQueueTable } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import { sendEmailViaSmtp } from './smtp-transport';

import type { StoredEmailConfig } from './email-store';
import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

const logger = createScopedLogger('email-queue');

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

// ── SQLite-backed queue helpers ──────────────────────────────

interface QueueRow {
  id: string;
  email: unknown;
  error: string | null;
  retries: number;
  createdAt: string;
  lastAttempt: string | null;
}

function rowToQueuedEmail(row: QueueRow): QueuedEmail {
  return {
    id: row.id,
    email: row.email as Email,
    status: row.retries >= MAX_RETRY_ATTEMPTS ? 'failed' : 'queued',
    attempts: row.retries,
    lastAttempt: row.lastAttempt ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.createdAt,
  };
}

/**
 * Migrate legacy queue entries from email-config.json into SQLite.
 */
export function migrateEmailQueueFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(emailQueueTable).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'email-config.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { queue?: QueuedEmail[] };
    const items = Array.isArray(parsed.queue) ? parsed.queue : [];

    for (const item of items) {
      db.insert(emailQueueTable)
        .values({
          id: item.id,
          email: item.email as unknown,
          error: item.error ?? null,
          retries: item.attempts,
          createdAt: item.createdAt,
          lastAttempt: item.lastAttempt ?? null,
        })
        .run();
    }

    if (items.length > 0) {
      logger.info(`Migrated ${String(items.length)} email queue entries from JSON to SQLite`);
    }
  } catch (err) {
    logger.error('Failed to migrate email queue from JSON:', err);
  }
}

/**
 * Load all queued emails from SQLite.
 */
export function loadQueueFromDb(db: AdcDatabase): QueuedEmail[] {
  const rows = db.select().from(emailQueueTable).all();
  return rows.map(rowToQueuedEmail);
}

/**
 * Add an email to the retry queue (SQLite).
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
 * Persist the full queue state to SQLite — delete + re-insert.
 */
export function persistQueueToDb(db: AdcDatabase, queue: QueuedEmail[]): void {
  // Simple strategy: delete all and re-insert. Queue is small (< 100 items).
  db.delete(emailQueueTable).run();
  for (const item of queue) {
    db.insert(emailQueueTable)
      .values({
        id: item.id,
        email: item.email as unknown,
        error: item.error ?? null,
        retries: item.attempts,
        createdAt: item.createdAt,
        lastAttempt: item.lastAttempt ?? null,
      })
      .run();
  }
}

/**
 * Remove a single queue entry from SQLite.
 */
export function removeQueueEntryFromDb(db: AdcDatabase, emailId: string): void {
  db.delete(emailQueueTable).where(eq(emailQueueTable.id, emailId)).run();
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
