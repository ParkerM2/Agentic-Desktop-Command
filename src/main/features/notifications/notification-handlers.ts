/**
 * Notification IPC handlers
 *
 * Registers handlers for notifications.* channels.
 */

import { NOTIFICATIONS } from '@shared/ipc/notifications/channels';

import type { NotificationManager } from ".";
import type { IpcRouter } from '../../ipc/router';

export function registerNotificationHandlers(
  router: IpcRouter,
  notificationManager: NotificationManager,
): void {
  router.handle(NOTIFICATIONS.LIST.ALL, (params) => {
    return Promise.resolve(notificationManager.listNotifications(params.filter, params.limit));
  });

  router.handle(NOTIFICATIONS.MARK.READ, (params) => {
    return Promise.resolve(notificationManager.markRead(params.id));
  });

  router.handle(NOTIFICATIONS.MARK['ALL-READ'], (params) => {
    return Promise.resolve(notificationManager.markAllRead(params.source));
  });

  router.handle(NOTIFICATIONS.GET.CONFIG, () => {
    return Promise.resolve(notificationManager.getConfig());
  });

  router.handle(NOTIFICATIONS.UPDATE.CONFIG, (params) => {
    return Promise.resolve(notificationManager.updateConfig(params));
  });

  router.handle(NOTIFICATIONS.START.WATCHING, () => {
    return Promise.resolve(notificationManager.startWatching());
  });

  router.handle(NOTIFICATIONS.STOP.WATCHING, () => {
    return Promise.resolve(notificationManager.stopWatching());
  });

  router.handle(NOTIFICATIONS.GET['WATCHER-STATUS'], () => {
    return Promise.resolve(notificationManager.getStatus());
  });
}
