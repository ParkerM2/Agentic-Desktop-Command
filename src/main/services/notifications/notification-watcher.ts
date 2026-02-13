/**
 * Notification Watcher — Base interface and manager for background notification polling.
 *
 * Aggregates notifications from multiple sources (Slack, GitHub) with:
 * - Configurable polling intervals (respecting rate limits)
 * - Exponential backoff on errors
 * - Duplicate detection via ID caching
 * - Graceful start/stop lifecycle
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type {
  GitHubWatcherConfig,
  Notification,
  NotificationFilter,
  NotificationSource,
  NotificationWatcherConfig,
  SlackWatcherConfig,
} from '@shared/types';
import {
  DEFAULT_GITHUB_WATCHER_CONFIG,
  DEFAULT_NOTIFICATION_WATCHER_CONFIG,
  DEFAULT_SLACK_WATCHER_CONFIG,
} from '@shared/types';

import type { IpcRouter } from '../../ipc/router';

// ── Types ────────────────────────────────────────────────────

/** Type for partial config updates (allows partial inner configs) */
export interface NotificationConfigUpdate {
  enabled?: boolean;
  slack?: Partial<SlackWatcherConfig>;
  github?: Partial<GitHubWatcherConfig>;
}

export interface NotificationWatcher {
  /** Source identifier for this watcher */
  readonly source: NotificationSource;

  /** Start polling for notifications */
  start: () => void;

  /** Stop polling for notifications */
  stop: () => void;

  /** Check if watcher is currently active */
  isActive: () => boolean;

  /** Force an immediate poll (useful for testing/debugging) */
  poll: () => Promise<Notification[]>;

  /** Get the timestamp of the last successful poll */
  getLastPollTime: () => string | undefined;

  /** Get the last error message if any */
  getLastError: () => string | undefined;
}

export interface NotificationManager {
  /** Start all enabled watchers */
  startWatching: () => { success: boolean; watchersStarted: string[] };

  /** Stop all watchers */
  stopWatching: () => { success: boolean };

  /** Get the current watcher status */
  getStatus: () => {
    isWatching: boolean;
    activeWatchers: NotificationSource[];
    lastPollTime?: Record<NotificationSource, string>;
    errors?: Record<NotificationSource, string>;
  };

  /** Get all cached notifications (optionally filtered) */
  listNotifications: (filter?: NotificationFilter, limit?: number) => Notification[];

  /** Mark a notification as read */
  markRead: (id: string) => { success: boolean };

  /** Mark all notifications as read (optionally by source) */
  markAllRead: (source?: NotificationSource) => { success: boolean; count: number };

  /** Get the current configuration */
  getConfig: () => NotificationWatcherConfig;

  /** Update the configuration */
  updateConfig: (updates: NotificationConfigUpdate) => NotificationWatcherConfig;

  /** Register a watcher */
  registerWatcher: (watcher: NotificationWatcher) => void;

  /** Handle a new notification from a watcher */
  onNotification: (notification: Notification) => void;

  /** Dispose all resources */
  dispose: () => void;
}

// ── Constants ────────────────────────────────────────────────

const CONFIG_FILE = 'notification-watcher-config.json';
const NOTIFICATIONS_FILE = 'notifications-cache.json';
const MAX_CACHED_NOTIFICATIONS = 500;
const SEEN_IDS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const EVENT_WATCHER_STATUS = 'event:notifications.watcherStatusChanged' as const;

// ── Persistence Helpers ──────────────────────────────────────

function getDataDir(): string {
  return app.getPath('userData');
}

function loadConfig(): NotificationWatcherConfig {
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

function saveConfig(config: NotificationWatcherConfig): void {
  const filePath = join(getDataDir(), CONFIG_FILE);
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

function loadNotifications(): Notification[] {
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

function saveNotifications(notifications: Notification[]): void {
  const filePath = join(getDataDir(), NOTIFICATIONS_FILE);
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Keep only the most recent notifications
  const toSave = notifications.slice(-MAX_CACHED_NOTIFICATIONS);
  writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
}

// ── Filter Helper ────────────────────────────────────────────

function matchesFilter(notification: Notification, filter: NotificationFilter): boolean {
  // Source filter
  if (filter.sources && filter.sources.length > 0 && !filter.sources.includes(notification.source)) {
    return false;
  }

  // Type filter
  if (filter.types && filter.types.length > 0 && !filter.types.includes(notification.type)) {
    return false;
  }

  // Unread only filter
  if (filter.unreadOnly === true && notification.read) {
    return false;
  }

  // Keyword filter (case-insensitive search in title and body)
  if (filter.keywords && filter.keywords.length > 0) {
    const searchText = `${notification.title} ${notification.body}`.toLowerCase();
    const hasKeyword = filter.keywords.some((kw) => searchText.includes(kw.toLowerCase()));
    if (!hasKeyword) {
      return false;
    }
  }

  return true;
}

// ── Factory ──────────────────────────────────────────────────

export function createNotificationManager(router: IpcRouter): NotificationManager {
  const watchers = new Map<NotificationSource, NotificationWatcher>();
  const seenIds = new Map<string, number>(); // id -> timestamp of when seen
  // Config is mutated via updateConfig
  // eslint-disable-next-line prefer-const
  let config = loadConfig();
  let notifications = loadNotifications();
  let isWatching = false;

  // Clean up old seen IDs periodically
  function cleanupSeenIds(): void {
    const now = Date.now();
    for (const [id, timestamp] of seenIds.entries()) {
      if (now - timestamp > SEEN_IDS_TTL_MS) {
        seenIds.delete(id);
      }
    }
  }

  // Run cleanup every hour
  const cleanupInterval = setInterval(cleanupSeenIds, 60 * 60 * 1000);

  function persist(): void {
    saveNotifications(notifications);
  }

  function persistConfig(): void {
    saveConfig(config);
  }

  return {
    startWatching() {
      const started: string[] = [];

      if (!config.enabled) {
        return { success: false, watchersStarted: [] };
      }

      for (const [source, watcher] of watchers) {
        const sourceConfig = config[source];
        if (sourceConfig.enabled && !watcher.isActive()) {
          watcher.start();
          started.push(source);
          router.emit(EVENT_WATCHER_STATUS, {
            source,
            status: 'started',
          });
        }
      }

      isWatching = started.length > 0;
      return { success: true, watchersStarted: started };
    },

    stopWatching() {
      for (const [source, watcher] of watchers) {
        if (watcher.isActive()) {
          watcher.stop();
          router.emit(EVENT_WATCHER_STATUS, {
            source,
            status: 'stopped',
          });
        }
      }
      isWatching = false;
      return { success: true };
    },

    getStatus() {
      const activeWatchers: NotificationSource[] = [];
      const lastPollTime: Record<string, string> = {};
      const errors: Record<string, string> = {};

      for (const [source, watcher] of watchers) {
        if (watcher.isActive()) {
          activeWatchers.push(source);
        }
        const pollTime = watcher.getLastPollTime();
        if (pollTime) {
          lastPollTime[source] = pollTime;
        }
        const error = watcher.getLastError();
        if (error) {
          errors[source] = error;
        }
      }

      return {
        isWatching,
        activeWatchers,
        lastPollTime: Object.keys(lastPollTime).length > 0
          ? (lastPollTime as Record<NotificationSource, string>)
          : undefined,
        errors: Object.keys(errors).length > 0
          ? (errors as Record<NotificationSource, string>)
          : undefined,
      };
    },

    listNotifications(filter, limit = 100) {
      let result = [...notifications];

      // Sort by timestamp descending (newest first)
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply filter if provided
      if (filter) {
        result = result.filter((n) => matchesFilter(n, filter));
      }

      // Apply limit
      return result.slice(0, limit);
    },

    markRead(id) {
      const notification = notifications.find((n) => n.id === id);
      if (notification) {
        notification.read = true;
        persist();
        return { success: true };
      }
      return { success: false };
    },

    markAllRead(source) {
      let count = 0;
      for (const notification of notifications) {
        if (!notification.read && (source === undefined || notification.source === source)) {
          notification.read = true;
          count++;
        }
      }
      if (count > 0) {
        persist();
      }
      return { success: true, count };
    },

    getConfig() {
      return { ...config };
    },

    updateConfig(updates) {
      // Deep merge updates
      if (updates.enabled !== undefined) {
        config.enabled = updates.enabled;
      }

      if (updates.slack) {
        config.slack = { ...config.slack, ...updates.slack };
      }

      if (updates.github) {
        config.github = { ...config.github, ...updates.github };
      }

      persistConfig();

      // Restart watchers if configuration changed while watching
      if (isWatching) {
        // Stop any watchers that were disabled
        for (const [source, watcher] of watchers) {
          const sourceConfig = config[source];
          if (!sourceConfig.enabled && watcher.isActive()) {
            watcher.stop();
            router.emit(EVENT_WATCHER_STATUS, {
              source,
              status: 'stopped',
            });
          }
        }

        // Start any watchers that were enabled
        for (const [source, watcher] of watchers) {
          const sourceConfig = config[source];
          if (sourceConfig.enabled && !watcher.isActive()) {
            watcher.start();
            router.emit(EVENT_WATCHER_STATUS, {
              source,
              status: 'started',
            });
          }
        }
      }

      return { ...config };
    },

    registerWatcher(watcher) {
      watchers.set(watcher.source, watcher);
    },

    onNotification(notification) {
      // Check for duplicate
      if (seenIds.has(notification.id)) {
        return;
      }

      // Mark as seen
      seenIds.set(notification.id, Date.now());

      // Ensure ID is set
      const notificationWithId: Notification = {
        ...notification,
        id: notification.id || randomUUID(),
      };

      // Add to cache
      notifications.push(notificationWithId);

      // Trim cache if needed
      if (notifications.length > MAX_CACHED_NOTIFICATIONS) {
        notifications = notifications.slice(-MAX_CACHED_NOTIFICATIONS);
      }

      persist();

      // Emit event to renderer
      router.emit('event:notifications.new', { notification: notificationWithId });
    },

    dispose() {
      clearInterval(cleanupInterval);
      this.stopWatching();
    },
  };
}
