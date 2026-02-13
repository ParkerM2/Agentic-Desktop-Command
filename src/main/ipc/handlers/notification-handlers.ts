/**
 * Notification IPC handlers
 *
 * Registers handlers for notifications.* channels.
 */

import type { NotificationManager } from '../../services/notifications';
import type { IpcRouter } from '../router';

export function registerNotificationHandlers(
  router: IpcRouter,
  notificationManager: NotificationManager,
): void {
  router.handle('notifications.list', (params) => {
    return Promise.resolve(notificationManager.listNotifications(params.filter, params.limit));
  });

  router.handle('notifications.markRead', (params) => {
    return Promise.resolve(notificationManager.markRead(params.id));
  });

  router.handle('notifications.markAllRead', (params) => {
    return Promise.resolve(notificationManager.markAllRead(params.source));
  });

  router.handle('notifications.getConfig', () => {
    return Promise.resolve(notificationManager.getConfig());
  });

  router.handle('notifications.updateConfig', (params) => {
    return Promise.resolve(notificationManager.updateConfig(params));
  });

  router.handle('notifications.startWatching', () => {
    return Promise.resolve(notificationManager.startWatching());
  });

  router.handle('notifications.stopWatching', () => {
    return Promise.resolve(notificationManager.stopWatching());
  });

  router.handle('notifications.getWatcherStatus', () => {
    return Promise.resolve(notificationManager.getStatus());
  });
}
