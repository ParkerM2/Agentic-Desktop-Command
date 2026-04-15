/**
 * Notification Filter — Filter matching logic and config update types.
 */

import type {
  GitHubWatcherConfig,
  Notification,
  NotificationFilter,
  SlackWatcherConfig,
} from '@shared/types';

// ── Types ────────────────────────────────────────────────────

/** Type for partial config updates (allows partial inner configs) */
export interface NotificationConfigUpdate {
  enabled?: boolean;
  slack?: Partial<SlackWatcherConfig>;
  github?: Partial<GitHubWatcherConfig>;
}

// ── Filter Logic ─────────────────────────────────────────────

export function matchesFilter(notification: Notification, filter: NotificationFilter): boolean {
  // Source filter
  if (
    filter.sources &&
    filter.sources.length > 0 &&
    !filter.sources.includes(notification.source)
  ) {
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
