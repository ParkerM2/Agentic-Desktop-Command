/**
 * Notification Store — SQLite persistence for notification config and cached notifications.
 *
 * Config uses the `settings_kv` table with category='notification' and key='default'.
 * Notifications use the `notifications` table.
 * One-time migration from JSON files on first access if tables are empty.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';
import type { Notification, NotificationWatcherConfig } from '@shared/types';
import {
  DEFAULT_GITHUB_WATCHER_CONFIG,
  DEFAULT_NOTIFICATION_WATCHER_CONFIG,
  DEFAULT_SLACK_WATCHER_CONFIG,
} from '@shared/types';

import { notifications, settingsKv } from '../../../db/schema';
import { createScopedLogger } from '../../../lib/logger';

import type { AdcDatabase } from '../../../db';

// ── Constants ────────────────────────────────────────────────

const CONFIG_FILE = 'notification-watcher-config.json';
const NOTIFICATIONS_FILE = 'notifications-cache.json';
export const MAX_CACHED_NOTIFICATIONS = 1000;
const CONFIG_KEY = 'default';
const CONFIG_CATEGORY = 'notification';

const logger = createScopedLogger('notification-store');

// ── JSON Migration ──────────────────────────────────────────

/** Map a raw JSON item to a notification row shape for insertion. */
function toNotificationRow(item: Record<string, unknown>) {
  return {
    id: typeof item.id === 'string' ? item.id : '',
    source: typeof item.source === 'string' ? item.source : 'github',
    title: typeof item.title === 'string' ? item.title : null,
    message: typeof item.body === 'string' ? item.body : null,
    url: typeof item.url === 'string' ? item.url : null,
    read: item.read === true,
    timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date().toISOString(),
    metadata: typeof item.metadata === 'object' && item.metadata !== null
      ? item.metadata as Record<string, unknown>
      : null,
  };
}

function migrateNotificationsFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(notifications).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, NOTIFICATIONS_FILE);
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    const items = parsed as Array<Record<string, unknown>>;
    for (const item of items) {
      db.insert(notifications)
        .values(toNotificationRow(item))
        .onConflictDoNothing()
        .run();
    }

    logger.info(`Migrated ${items.length} notifications from JSON to SQLite`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to migrate notifications from JSON: ${msg}`);
  }
}

function migrateConfigFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db
    .select()
    .from(settingsKv)
    .where(and(eq(settingsKv.category, CONFIG_CATEGORY), eq(settingsKv.key, CONFIG_KEY)))
    .all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, CONFIG_FILE);
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    if (typeof parsed === 'object' && parsed !== null) {
      db.insert(settingsKv)
        .values({
          id: generateId(),
          key: CONFIG_KEY,
          category: CONFIG_CATEGORY,
          settings: parsed,
          updatedAt: new Date().toISOString(),
        })
        .run();
      logger.info('Migrated notification config from JSON to SQLite');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to migrate notification config from JSON: ${msg}`);
  }
}

// ── Store Factory ───────────────────────────────────────────

export interface NotificationStore {
  loadConfig: () => NotificationWatcherConfig;
  saveConfig: (config: NotificationWatcherConfig) => void;
  loadNotifications: () => Notification[];
  saveNotification: (notification: Notification) => void;
  markRead: (id: string) => boolean;
  markAllRead: (source?: string) => number;
  trimToMax: () => void;
  getCount: () => number;
}

export function createNotificationStore(db: AdcDatabase, dataDir: string): NotificationStore {
  // Run one-time migration from JSON files
  migrateNotificationsFromJson(db, dataDir);
  migrateConfigFromJson(db, dataDir);

  return {
    loadConfig(): NotificationWatcherConfig {
      const row = db
        .select()
        .from(settingsKv)
        .where(and(eq(settingsKv.category, CONFIG_CATEGORY), eq(settingsKv.key, CONFIG_KEY)))
        .get();

      if (!row) {
        return { ...DEFAULT_NOTIFICATION_WATCHER_CONFIG };
      }

      try {
        const data = row.settings as Record<string, unknown>;
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
      } catch {
        return { ...DEFAULT_NOTIFICATION_WATCHER_CONFIG };
      }
    },

    saveConfig(config: NotificationWatcherConfig): void {
      db.insert(settingsKv)
        .values({
          id: generateId(),
          key: CONFIG_KEY,
          category: CONFIG_CATEGORY,
          settings: config as unknown,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: settingsKv.key,
          set: {
            settings: config as unknown,
            updatedAt: new Date().toISOString(),
          },
        })
        .run();
    },

    loadNotifications(): Notification[] {
      const rows = db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.timestamp))
        .limit(MAX_CACHED_NOTIFICATIONS)
        .all();

      return rows.map((row) => ({
        id: row.id,
        source: row.source as Notification['source'],
        type: (row.metadata?.type ?? 'pr_comment') as Notification['type'],
        title: row.title ?? '',
        body: row.message ?? '',
        url: row.url ?? '',
        timestamp: row.timestamp,
        read: row.read,
        metadata: (row.metadata as Notification['metadata']) ?? undefined,
      }));
    },

    saveNotification(notification: Notification): void {
      db.insert(notifications)
        .values({
          id: notification.id,
          source: notification.source,
          title: notification.title,
          message: notification.body,
          url: notification.url,
          read: notification.read,
          timestamp: notification.timestamp,
          metadata: {
            ...(notification.metadata ?? {}),
            type: notification.type,
          } as Record<string, unknown>,
        })
        .onConflictDoNothing()
        .run();

      // Enforce max cap
      this.trimToMax();
    },

    markRead(id: string): boolean {
      const result = db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, id))
        .run();
      return result.changes > 0;
    },

    markAllRead(source?: string): number {
      if (source) {
        const result = db
          .update(notifications)
          .set({ read: true })
          .where(eq(notifications.source, source))
          .run();
        return result.changes;
      }
      const result = db
        .update(notifications)
        .set({ read: true })
        .run();
      return result.changes;
    },

    trimToMax(): void {
      const [{ total }] = db.select({ total: count() }).from(notifications).all();

      if (total > MAX_CACHED_NOTIFICATIONS) {
        // Find the oldest rows to delete
        const excess = total - MAX_CACHED_NOTIFICATIONS;
        const oldest = db
          .select({ id: notifications.id })
          .from(notifications)
          .orderBy(asc(notifications.timestamp))
          .limit(excess)
          .all();

        if (oldest.length > 0) {
          const ids = oldest.map((r) => r.id);
          db.delete(notifications).where(inArray(notifications.id, ids)).run();
        }
      }
    },

    getCount(): number {
      const [row] = db.select({ total: count() }).from(notifications).all();
      return row.total;
    },
  };
}
