/**
 * Notification Store — JSON persistence for notification config and cached notifications.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type { Notification, NotificationWatcherConfig } from '@shared/types';
import {
  DEFAULT_GITHUB_WATCHER_CONFIG,
  DEFAULT_NOTIFICATION_WATCHER_CONFIG,
  DEFAULT_SLACK_WATCHER_CONFIG,
} from '@shared/types';

// ── Constants ────────────────────────────────────────────────

const CONFIG_FILE = 'notification-watcher-config.json';
const NOTIFICATIONS_FILE = 'notifications-cache.json';
export const MAX_CACHED_NOTIFICATIONS = 500;

// ── Helpers ──────────────────────────────────────────────────

function getDataDir(): string {
  return app.getPath('userData');
}

function ensureDir(filePath: string): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ── Config Persistence ───────────────────────────────────────

export function loadConfig(): NotificationWatcherConfig {
  const filePath = join(getDataDir(), CONFIG_FILE);
  if (!existsSync(filePath)) {
    return { ...DEFAULT_NOTIFICATION_WATCHER_CONFIG };
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    // Merge with defaults to ensure all fields exist
    if (typeof parsed === 'object' && parsed !== null) {
      const data = parsed as Record<string, unknown>;
      return {
        enabled: typeof data.enabled === 'boolean' ? data.enabled : false,
        slack: {
          ...DEFAULT_SLACK_WATCHER_CONFIG,
          ...(typeof data.slack === 'object' && data.slack !== null
            ? (data.slack as Record<string, unknown>)
            : {}),
        } as NotificationWatcherConfig['slack'],
        github: {
          ...DEFAULT_GITHUB_WATCHER_CONFIG,
          ...(typeof data.github === 'object' && data.github !== null
            ? (data.github as Record<string, unknown>)
            : {}),
        } as NotificationWatcherConfig['github'],
      };
    }

    return { ...DEFAULT_NOTIFICATION_WATCHER_CONFIG };
  } catch {
    return { ...DEFAULT_NOTIFICATION_WATCHER_CONFIG };
  }
}

export function saveConfig(config: NotificationWatcherConfig): void {
  const filePath = join(getDataDir(), CONFIG_FILE);
  ensureDir(filePath);
  writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

// ── Notification Persistence ─────────────────────────────────

export function loadNotifications(): Notification[] {
  const filePath = join(getDataDir(), NOTIFICATIONS_FILE);
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as Notification[];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: Notification[]): void {
  const filePath = join(getDataDir(), NOTIFICATIONS_FILE);
  ensureDir(filePath);

  // Keep only the most recent notifications
  const toSave = notifications.slice(-MAX_CACHED_NOTIFICATIONS);
  writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
}
