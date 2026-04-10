/**
 * Notification Services — Background watchers for Slack and GitHub notifications.
 */

export { createNotificationManager } from './notification-watcher';
export type {
  NotificationConfigUpdate,
  NotificationManager,
  NotificationWatcher,
} from './notification-watcher';

export { createSlackWatcher } from './slack-watcher';
export { createGitHubWatcher } from './github-watcher';
