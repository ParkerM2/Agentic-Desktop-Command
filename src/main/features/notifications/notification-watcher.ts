/**
 * Notification Watcher — Re-exports from focused modules.
 *
 * Split into:
 * - notification-manager.ts — Manager/orchestrator + interfaces
 * - notification-store.ts — JSON persistence
 * - notification-filter.ts — Filter matching + config update type
 */

export { createNotificationManager } from './notification-manager';
export type { NotificationManager, NotificationWatcher } from './notification-manager';
export type { NotificationConfigUpdate } from './notification-filter';
