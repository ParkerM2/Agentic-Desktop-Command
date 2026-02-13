/**
 * Notification types for the background notification watcher system.
 *
 * Supports aggregating notifications from multiple sources (Slack, GitHub)
 * with unified filtering and display capabilities.
 */

// ── Notification Source ───────────────────────────────────────

export type NotificationSource = 'slack' | 'github';

// ── Notification Types by Source ──────────────────────────────

export type SlackNotificationType = 'mention' | 'dm' | 'channel' | 'thread_reply';

export type GitHubNotificationType =
  | 'pr_review'
  | 'pr_comment'
  | 'issue_mention'
  | 'ci_status'
  | 'pr_merged'
  | 'pr_closed'
  | 'issue_assigned';

export type NotificationType = SlackNotificationType | GitHubNotificationType;

// ── Core Notification Type ────────────────────────────────────

export interface Notification {
  id: string;
  source: NotificationSource;
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  timestamp: string;
  read: boolean;
  /** Optional context for source-specific rendering */
  metadata?: NotificationMetadata;
}

export interface NotificationMetadata {
  /** Slack-specific fields */
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  threadTs?: string;

  /** GitHub-specific fields */
  owner?: string;
  repo?: string;
  prNumber?: number;
  issueNumber?: number;
  ciStatus?: 'pending' | 'success' | 'failure';
}

// ── Filter Configuration ──────────────────────────────────────

export interface NotificationFilter {
  sources?: NotificationSource[];
  types?: NotificationType[];
  /** Only include notifications matching these keywords (case-insensitive) */
  keywords?: string[];
  /** Filter by read/unread status */
  unreadOnly?: boolean;
}

// ── Watcher Configuration ─────────────────────────────────────

export interface SlackWatcherConfig {
  enabled: boolean;
  /** Polling interval in seconds (default: 60) */
  pollIntervalSeconds: number;
  /** Channel IDs to watch (empty = watch all) */
  channels: string[];
  /** Keywords to filter notifications */
  keywords: string[];
  /** Watch for mentions */
  watchMentions: boolean;
  /** Watch for direct messages */
  watchDms: boolean;
  /** Watch for thread replies */
  watchThreads: boolean;
}

export interface GitHubWatcherConfig {
  enabled: boolean;
  /** Polling interval in seconds (default: 60) */
  pollIntervalSeconds: number;
  /** Repository filter in "owner/repo" format (empty = watch all) */
  repos: string[];
  /** Watch for PR reviews */
  watchPrReviews: boolean;
  /** Watch for PR comments */
  watchPrComments: boolean;
  /** Watch for issue mentions */
  watchIssueMentions: boolean;
  /** Watch for CI status changes */
  watchCiStatus: boolean;
}

export interface NotificationWatcherConfig {
  /** Master enabled flag for all watchers */
  enabled: boolean;
  slack: SlackWatcherConfig;
  github: GitHubWatcherConfig;
}

// ── Default Configurations ────────────────────────────────────

export const DEFAULT_SLACK_WATCHER_CONFIG: SlackWatcherConfig = {
  enabled: false,
  pollIntervalSeconds: 60,
  channels: [],
  keywords: [],
  watchMentions: true,
  watchDms: true,
  watchThreads: true,
};

export const DEFAULT_GITHUB_WATCHER_CONFIG: GitHubWatcherConfig = {
  enabled: false,
  pollIntervalSeconds: 60,
  repos: [],
  watchPrReviews: true,
  watchPrComments: true,
  watchIssueMentions: true,
  watchCiStatus: true,
};

export const DEFAULT_NOTIFICATION_WATCHER_CONFIG: NotificationWatcherConfig = {
  enabled: false,
  slack: DEFAULT_SLACK_WATCHER_CONFIG,
  github: DEFAULT_GITHUB_WATCHER_CONFIG,
};
