/**
 * Email Store — JSON file I/O for email configuration and queue persistence
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type { QueuedEmail } from '@shared/types';

import { encryptSecret } from './email-encryption';

import type { EncryptedSecretEntry } from './email-encryption';

export interface StoredEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: EncryptedSecretEntry | string; // Support migration from plaintext
  from: string;
  provider?: string;
}

export interface EmailStoreData {
  config: StoredEmailConfig | null;
  queue: QueuedEmail[];
}

function getEmailFilePath(): string {
  return join(app.getPath('userData'), 'email-config.json');
}

/**
 * Load email configuration and queue from disk.
 * Handles migration from plaintext passwords to encrypted format.
 */
export function loadEmailStore(): { data: EmailStoreData; needsMigration: boolean } {
  const filePath = getEmailFilePath();
  if (!existsSync(filePath)) {
    return { data: { config: null, queue: [] }, needsMigration: false };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as EmailStoreData;
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
export function saveEmailStore(store: EmailStoreData): void {
  const filePath = getEmailFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Create a copy with encrypted password
  const toSave: EmailStoreData = {
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
