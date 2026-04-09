import { domain, events } from '../channel-builder';

export const NOTIFICATIONS = domain('notifications', {
  LIST: ['all'],
  MARK: ['read', 'all-read'],
  GET: ['config', 'watcher-status'],
  UPDATE: ['config'],
  START: ['watching'],
  STOP: ['watching'],
});

export const NOTIFICATIONS_EVENTS = events('notifications', {
  NOTIFICATION: ['new'],
  WATCHER: ['error', 'status-changed'],
});
