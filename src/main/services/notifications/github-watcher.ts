/**
 * GitHub Watcher — Polls GitHub for PR reviews, issue mentions, and CI status.
 *
 * Uses the GitHub REST API to check for:
 * - PR review requests and comments
 * - Issue mentions
 * - CI/CD status changes (via commit status API)
 * - PR merged/closed events
 *
 * Rate limits: GitHub allows 5000 requests/hour for authenticated users.
 * Default poll interval is 60 seconds (3600 requests/hour max).
 */

import type {
  GitHubNotificationType,
  GitHubWatcherConfig,
  Notification,
  NotificationMetadata,
} from '@shared/types';

import { watcherLogger } from '@main/lib/logger';

import { createGitHubCliClient } from '../../mcp-servers/github/github-client';

import type { NotificationManager, NotificationWatcher } from './notification-watcher';
import type { IpcRouter } from '../../ipc/router';
import type { Notification as GitHubApiNotification } from '../../mcp-servers/github/types';

// ── Types ────────────────────────────────────────────────────

interface GitHubWatcherDeps {
  router: IpcRouter;
  notificationManager: NotificationManager;
  getConfig: () => GitHubWatcherConfig;
}

// ── Constants ────────────────────────────────────────────────

const MIN_POLL_INTERVAL_MS = 10_000; // 10 seconds minimum
const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes max backoff
const INITIAL_BACKOFF_MS = 5_000;

// ── Helpers ──────────────────────────────────────────────────

function mapReasonToType(reason: string, subjectType: string): GitHubNotificationType {
  // Map GitHub notification reasons to our type system
  switch (reason) {
    case 'review_requested': {
      return 'pr_review';
    }
    case 'comment': {
      return subjectType === 'PullRequest' ? 'pr_comment' : 'issue_mention';
    }
    case 'mention': {
      return subjectType === 'PullRequest' ? 'pr_comment' : 'issue_mention';
    }
    case 'assign': {
      return subjectType === 'Issue' ? 'issue_assigned' : 'pr_review';
    }
    case 'ci_activity': {
      return 'ci_status';
    }
    case 'state_change': {
      // Could be merged or closed
      return 'pr_merged';
    }
    case 'author':
    case 'subscribed':
    case 'manual':
    case 'team_mention':
    default: {
      // Default based on subject type
      return subjectType === 'PullRequest' ? 'pr_comment' : 'issue_mention';
    }
  }
}

function isTypeEnabled(type: GitHubNotificationType, config: GitHubWatcherConfig): boolean {
  switch (type) {
    case 'pr_review': {
      return config.watchPrReviews;
    }
    case 'pr_comment': {
      return config.watchPrComments;
    }
    case 'issue_mention':
    case 'issue_assigned': {
      return config.watchIssueMentions;
    }
    case 'ci_status': {
      return config.watchCiStatus;
    }
    case 'pr_merged':
    case 'pr_closed': {
      return config.watchPrReviews; // Group with PR events
    }
    default: {
      return true;
    }
  }
}

function parseRepoInfo(repoFullName: string): { owner: string; repo: string } {
  const [owner = '', repo = ''] = repoFullName.split('/');
  return { owner, repo };
}

function isRepoInFilter(owner: string, repo: string, repos: string[]): boolean {
  if (repos.length === 0) {
    return true;
  }
  const fullName = `${owner}/${repo}`;
  return repos.includes(fullName) || repos.includes(repo);
}

function extractNumberFromUrl(url: string | null | undefined): {
  prNumber?: number;
  issueNumber?: number;
} {
  if (url === null || url === undefined) {
    return {};
  }
  const match = /\/(pulls|issues)\/(\d+)/.exec(url);
  if (!match) {
    return {};
  }
  const num = parseInt(match[2], 10);
  return match[1] === 'pulls' ? { prNumber: num } : { issueNumber: num };
}

function buildTitle(type: GitHubNotificationType, subjectTitle: string): string {
  switch (type) {
    case 'pr_review': {
      return `Review requested: ${subjectTitle}`;
    }
    case 'pr_comment': {
      return `PR comment: ${subjectTitle}`;
    }
    case 'issue_mention': {
      return `Issue: ${subjectTitle}`;
    }
    case 'ci_status': {
      return `CI update: ${subjectTitle}`;
    }
    case 'pr_merged': {
      return `PR merged: ${subjectTitle}`;
    }
    case 'pr_closed': {
      return `PR closed: ${subjectTitle}`;
    }
    case 'issue_assigned': {
      return `Assigned: ${subjectTitle}`;
    }
    default: {
      return subjectTitle;
    }
  }
}

function buildUrl(owner: string, repo: string, prNumber?: number, issueNumber?: number): string {
  const base = `https://github.com/${owner}/${repo}`;
  if (prNumber !== undefined) {
    return `${base}/pull/${String(prNumber)}`;
  }
  if (issueNumber !== undefined) {
    return `${base}/issues/${String(issueNumber)}`;
  }
  return base;
}

function githubNotificationToNotification(
  ghNotif: GitHubApiNotification,
  config: GitHubWatcherConfig,
): Notification | null {
  const type = mapReasonToType(ghNotif.reason, ghNotif.subject.type);

  // Check if this type is enabled in config
  if (!isTypeEnabled(type, config)) {
    return null;
  }

  // Parse owner/repo from repository full_name
  const { owner, repo } = parseRepoInfo(ghNotif.repository.full_name);

  // Check if repo is in the configured filter
  if (!isRepoInFilter(owner, repo, config.repos)) {
    return null;
  }

  // Extract PR/issue number from subject URL if available
  const { prNumber, issueNumber } = extractNumberFromUrl(ghNotif.subject.url);

  const metadata: NotificationMetadata = {
    owner,
    repo,
    prNumber,
    issueNumber,
  };

  const title = buildTitle(type, ghNotif.subject.title);
  const body = `${owner}/${repo} - ${ghNotif.reason}`;
  const url = buildUrl(owner, repo, prNumber, issueNumber);

  return {
    id: `github-${ghNotif.id}`,
    source: 'github',
    type,
    title,
    body,
    url,
    timestamp: ghNotif.updated_at,
    read: !ghNotif.unread,
    metadata,
  };
}

// ── Factory ──────────────────────────────────────────────────

export function createGitHubWatcher(deps: GitHubWatcherDeps): NotificationWatcher {
  const { router, notificationManager, getConfig } = deps;

  const client = createGitHubCliClient();

  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let lastPollTime: string | undefined;
  let lastError: string | undefined;
  let backoffMs = INITIAL_BACKOFF_MS;
  let polling = false;

  async function pollForNotifications(): Promise<Notification[]> {
    if (polling) {
      return [];
    }

    polling = true;
    const notifications: Notification[] = [];
    const config = getConfig();

    try {
      // Emit polling status
      router.emit('event:notifications.watcherStatusChanged', {
        source: 'github',
        status: 'polling',
      });

      // Fetch notifications from GitHub API
      // Include all notifications to catch any we might have missed
      const ghNotifications = await client.getNotifications({ all: false });

      // Process each notification
      for (const ghNotif of ghNotifications) {
        // Skip already-read notifications
        if (!ghNotif.unread) {
          continue;
        }

        // Convert to our notification format
        const notification = githubNotificationToNotification(ghNotif, config);
        if (notification !== null) {
          notifications.push(notification);
        }
      }

      // Success - reset backoff
      backoffMs = INITIAL_BACKOFF_MS;
      lastError = undefined;
      lastPollTime = new Date().toISOString();

      // Notify manager of each new notification
      for (const notification of notifications) {
        notificationManager.onNotification(notification);
      }

      return notifications;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      lastError = message;
      watcherLogger.error('[GitHubWatcher] Poll error:', message);

      router.emit('event:notifications.watcherError', {
        source: 'github',
        error: message,
      });

      // Increase backoff on error
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);

      return [];
    } finally {
      // eslint-disable-next-line require-atomic-updates -- Polling flag is only checked/set in this function
      polling = false;
    }
  }

  function start(): void {
    if (pollInterval !== null) {
      return; // Already running
    }

    const config = getConfig();
    const intervalMs = Math.max(config.pollIntervalSeconds * 1000, MIN_POLL_INTERVAL_MS);

    // Do initial poll
    void pollForNotifications();

    // Set up recurring poll
    pollInterval = setInterval(() => {
      void pollForNotifications();
    }, intervalMs);

    watcherLogger.info(`[GitHubWatcher] Started with ${String(intervalMs)}ms interval`);
  }

  function stop(): void {
    if (pollInterval !== null) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    watcherLogger.info('[GitHubWatcher] Stopped');
  }

  return {
    source: 'github',

    start,
    stop,

    isActive() {
      return pollInterval !== null;
    },

    async poll() {
      return await pollForNotifications();
    },

    getLastPollTime() {
      return lastPollTime;
    },

    getLastError() {
      return lastError;
    },
  };
}
