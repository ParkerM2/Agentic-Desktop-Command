/**
 * Unit Tests for Notification Manager
 *
 * Tests notification lifecycle: start/stop watching, onNotification,
 * mark read, filtering, config updates, and dispose.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Notification, NotificationWatcherConfig } from '@shared/types';
import { DEFAULT_NOTIFICATION_WATCHER_CONFIG } from '@shared/types';

import type { NotificationStore } from '@main/services/notifications/notification-store';

// Build an in-memory mock store that behaves like the real SQLite store
function makeMockStore(initialConfig?: NotificationWatcherConfig): NotificationStore {
  const items = new Map<string, Notification>();
  let config: NotificationWatcherConfig = initialConfig ?? {
    ...DEFAULT_NOTIFICATION_WATCHER_CONFIG,
    enabled: true,
    slack: { ...DEFAULT_NOTIFICATION_WATCHER_CONFIG.slack, enabled: true },
    github: { ...DEFAULT_NOTIFICATION_WATCHER_CONFIG.github, enabled: true },
  };

  return {
    loadConfig: vi.fn(() => ({ ...config })),
    saveConfig: vi.fn((c: NotificationWatcherConfig) => { config = c; }),
    loadNotifications: vi.fn(() => {
      const arr = [...items.values()];
      arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return arr;
    }),
    saveNotification: vi.fn((n: Notification) => { items.set(n.id, { ...n }); }),
    markRead: vi.fn((id: string) => {
      const item = items.get(id);
      if (item) { item.read = true; return true; }
      return false;
    }),
    markAllRead: vi.fn((source?: string) => {
      let count = 0;
      for (const item of items.values()) {
        if (!item.read && (source === undefined || item.source === source)) {
          item.read = true;
          count++;
        }
      }
      return count;
    }),
    trimToMax: vi.fn(),
    getCount: vi.fn(() => items.size),
  };
}

let mockStoreInstance: NotificationStore;

vi.mock('@main/services/notifications/notification-store', () => ({
  createNotificationStore: () => mockStoreInstance,
  MAX_CACHED_NOTIFICATIONS: 1000,
}));

// Mock notification filter — use the real implementation
vi.mock('@main/services/notifications/notification-filter', async () => {
  const actual = await import('@main/services/notifications/notification-filter');
  return actual;
});

const { createNotificationManager } = await import(
  '@main/services/notifications/notification-manager'
);

import type { NotificationManager, NotificationWatcher } from '@main/services/notifications/notification-manager';
import type { AdcDatabase } from '@main/db';

// ── Helpers ─────────────────────────────────────────────────────

function makeRouter() {
  return {
    emit: vi.fn(),
    register: vi.fn(),
  } as unknown as import('@main/ipc/router').IpcRouter;
}

const fakeDb = {} as AdcDatabase;
const fakeDataDir = '/tmp/test-data';

function makeWatcher(source: 'slack' | 'github', overrides: Partial<NotificationWatcher> = {}): NotificationWatcher {
  let active = false;
  return {
    source,
    start: vi.fn(() => { active = true; }),
    stop: vi.fn(() => { active = false; }),
    isActive: vi.fn(() => active),
    poll: vi.fn(() => Promise.resolve([])),
    getLastPollTime: vi.fn(() => undefined),
    getLastError: vi.fn(() => undefined),
    ...overrides,
  };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: `n-${String(Math.random()).slice(2, 8)}`,
    source: 'github',
    type: 'pr_review',
    title: 'Test notification',
    body: 'Test body',
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    read: false,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────

describe('NotificationManager', () => {
  let router: ReturnType<typeof makeRouter>;
  let manager: NotificationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    router = makeRouter();
    mockStoreInstance = makeMockStore();
    manager = createNotificationManager(router, fakeDb, fakeDataDir);
  });

  describe('startWatching()', () => {
    it('starts enabled watchers and returns their names', () => {
      const slackWatcher = makeWatcher('slack');
      const githubWatcher = makeWatcher('github');
      manager.registerWatcher(slackWatcher);
      manager.registerWatcher(githubWatcher);

      const result = manager.startWatching();

      expect(result.success).toBe(true);
      expect(result.watchersStarted).toContain('slack');
      expect(result.watchersStarted).toContain('github');
      expect(slackWatcher.start).toHaveBeenCalled();
      expect(githubWatcher.start).toHaveBeenCalled();
    });

    it('does not start already active watchers', () => {
      const watcher = makeWatcher('slack', {
        isActive: vi.fn(() => true),
      });
      manager.registerWatcher(watcher);

      const result = manager.startWatching();

      expect(watcher.start).not.toHaveBeenCalled();
      expect(result.watchersStarted).not.toContain('slack');
    });

    it('returns failure when config is disabled', () => {
      mockStoreInstance = makeMockStore({
        ...DEFAULT_NOTIFICATION_WATCHER_CONFIG,
        enabled: false,
      });
      const disabledManager = createNotificationManager(router, fakeDb, fakeDataDir);
      const watcher = makeWatcher('slack');
      disabledManager.registerWatcher(watcher);

      const result = disabledManager.startWatching();

      expect(result.success).toBe(false);
      expect(result.watchersStarted).toEqual([]);
    });

    it('emits status event for each started watcher', () => {
      const watcher = makeWatcher('github');
      manager.registerWatcher(watcher);
      manager.startWatching();

      expect(router.emit).toHaveBeenCalledWith(
        'event:notifications.watcher.status-changed',
        expect.objectContaining({ source: 'github', status: 'started' }),
      );
    });
  });

  describe('stopWatching()', () => {
    it('stops all active watchers', () => {
      const watcher = makeWatcher('slack');
      manager.registerWatcher(watcher);
      manager.startWatching();
      watcher.isActive = vi.fn(() => true);

      const result = manager.stopWatching();

      expect(result.success).toBe(true);
      expect(watcher.stop).toHaveBeenCalled();
    });

    it('emits stopped status event', () => {
      const watcher = makeWatcher('github');
      manager.registerWatcher(watcher);
      manager.startWatching();
      watcher.isActive = vi.fn(() => true);

      manager.stopWatching();

      expect(router.emit).toHaveBeenCalledWith(
        'event:notifications.watcher.status-changed',
        expect.objectContaining({ source: 'github', status: 'stopped' }),
      );
    });
  });

  describe('getStatus()', () => {
    it('returns isWatching false when not started', () => {
      const status = manager.getStatus();
      expect(status.isWatching).toBe(false);
      expect(status.activeWatchers).toEqual([]);
    });

    it('returns active watchers after starting', () => {
      const watcher = makeWatcher('slack');
      manager.registerWatcher(watcher);
      manager.startWatching();

      const status = manager.getStatus();
      expect(status.isWatching).toBe(true);
      expect(status.activeWatchers).toContain('slack');
    });

    it('includes last poll time when available', () => {
      const watcher = makeWatcher('github', {
        getLastPollTime: vi.fn(() => '2026-01-01T00:00:00Z'),
      });
      manager.registerWatcher(watcher);

      const status = manager.getStatus();
      expect(status.lastPollTime).toBeDefined();
    });

    it('includes errors when available', () => {
      const watcher = makeWatcher('slack', {
        getLastError: vi.fn(() => 'Token expired'),
      });
      manager.registerWatcher(watcher);

      const status = manager.getStatus();
      expect(status.errors).toBeDefined();
    });
  });

  describe('onNotification()', () => {
    it('adds notification to the cache', () => {
      const notification = makeNotification({ id: 'unique-1' });
      manager.onNotification(notification);

      const list = manager.listNotifications();
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe('unique-1');
    });

    it('deduplicates notifications by ID', () => {
      const notification = makeNotification({ id: 'dup-1' });
      manager.onNotification(notification);
      manager.onNotification(notification);

      const list = manager.listNotifications();
      expect(list).toHaveLength(1);
    });

    it('emits new notification event', () => {
      const notification = makeNotification({ id: 'event-1' });
      manager.onNotification(notification);

      expect(router.emit).toHaveBeenCalledWith(
        'event:notifications.notification.new',
        expect.objectContaining({
          notification: expect.objectContaining({ id: 'event-1' }),
        }),
      );
    });

    it('persists after adding notification', () => {
      manager.onNotification(makeNotification());
      expect(mockStoreInstance.saveNotification).toHaveBeenCalled();
    });
  });

  describe('listNotifications()', () => {
    it('returns notifications sorted by timestamp descending', () => {
      manager.onNotification(makeNotification({
        id: 'old', timestamp: '2026-01-01T00:00:00Z',
      }));
      manager.onNotification(makeNotification({
        id: 'new', timestamp: '2026-02-01T00:00:00Z',
      }));

      const list = manager.listNotifications();
      expect(list[0]?.id).toBe('new');
      expect(list[1]?.id).toBe('old');
    });

    it('applies filter when provided', () => {
      manager.onNotification(makeNotification({ id: 'gh', source: 'github' }));
      manager.onNotification(makeNotification({ id: 'sl', source: 'slack', type: 'mention' }));

      const list = manager.listNotifications({ sources: ['github'] });
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe('gh');
    });

    it('applies limit', () => {
      for (let i = 0; i < 10; i++) {
        manager.onNotification(makeNotification({ id: `n-${String(i)}` }));
      }

      const list = manager.listNotifications(undefined, 3);
      expect(list).toHaveLength(3);
    });
  });

  describe('markRead()', () => {
    it('marks a notification as read', () => {
      manager.onNotification(makeNotification({ id: 'read-1', read: false }));
      const result = manager.markRead('read-1');

      expect(result.success).toBe(true);

      const list = manager.listNotifications();
      expect(list[0]?.read).toBe(true);
    });

    it('returns failure for non-existent notification', () => {
      const result = manager.markRead('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('markAllRead()', () => {
    it('marks all notifications as read', () => {
      manager.onNotification(makeNotification({ id: 'a', read: false }));
      manager.onNotification(makeNotification({ id: 'b', read: false }));

      const result = manager.markAllRead();

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      const list = manager.listNotifications();
      expect(list.every((n) => n.read)).toBe(true);
    });

    it('marks only specific source as read', () => {
      manager.onNotification(makeNotification({ id: 'gh', source: 'github', read: false }));
      manager.onNotification(makeNotification({ id: 'sl', source: 'slack', type: 'mention', read: false }));

      const result = manager.markAllRead('github');

      expect(result.count).toBe(1);
    });

    it('returns count 0 when all already read', () => {
      manager.onNotification(makeNotification({ id: 'a', read: true }));
      const result = manager.markAllRead();
      expect(result.count).toBe(0);
    });
  });

  describe('getConfig() and updateConfig()', () => {
    it('returns a copy of the config', () => {
      const config = manager.getConfig();
      expect(config.enabled).toBe(true);
    });

    it('updates enabled flag', () => {
      manager.updateConfig({ enabled: false });
      expect(manager.getConfig().enabled).toBe(false);
    });

    it('deep merges slack config', () => {
      manager.updateConfig({ slack: { pollIntervalSeconds: 30 } });
      const config = manager.getConfig();
      expect(config.slack.pollIntervalSeconds).toBe(30);
      expect(config.slack.enabled).toBe(true); // Should remain from initial config
    });

    it('deep merges github config', () => {
      manager.updateConfig({ github: { watchCiStatus: false } });
      const config = manager.getConfig();
      expect(config.github.watchCiStatus).toBe(false);
      expect(config.github.enabled).toBe(true);
    });

    it('persists config after update', () => {
      manager.updateConfig({ enabled: false });
      expect(mockStoreInstance.saveConfig).toHaveBeenCalled();
    });
  });

  describe('dispose()', () => {
    it('stops all watchers', () => {
      const watcher = makeWatcher('slack');
      manager.registerWatcher(watcher);
      manager.startWatching();
      watcher.isActive = vi.fn(() => true);

      manager.dispose();

      expect(watcher.stop).toHaveBeenCalled();
    });
  });
});
