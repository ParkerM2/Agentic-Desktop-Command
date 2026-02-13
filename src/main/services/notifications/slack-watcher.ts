/**
 * Slack Watcher — Polls Slack for mentions, DMs, and channel activity.
 *
 * Uses the Slack Web API to check for:
 * - Direct mentions (@user)
 * - Direct messages
 * - Thread replies
 * - Channel activity (filtered by configured channels/keywords)
 *
 * Rate limits: Slack allows ~1 request/second for most endpoints.
 * Default poll interval is 60 seconds to stay well under limits.
 */

import type {
  Notification,
  NotificationMetadata,
  SlackNotificationType,
  SlackWatcherConfig,
} from '@shared/types';

import { createSlackClient } from '../../mcp-servers/slack/slack-client';

import type { NotificationManager, NotificationWatcher } from './notification-watcher';
import type { OAuthManager } from '../../auth/oauth-manager';
import type { IpcRouter } from '../../ipc/router';
import type { SlackMessage } from '../../mcp-servers/slack/types';



// ── Types ────────────────────────────────────────────────────

interface SlackWatcherDeps {
  oauthManager: OAuthManager;
  router: IpcRouter;
  notificationManager: NotificationManager;
  getConfig: () => SlackWatcherConfig;
}

// ── Constants ────────────────────────────────────────────────

const SLACK_PROVIDER = 'slack';
const MIN_POLL_INTERVAL_MS = 10_000; // 10 seconds minimum
const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes max backoff
const INITIAL_BACKOFF_MS = 5_000;

// ── Helpers ──────────────────────────────────────────────────

function parseSlackTimestamp(ts: string): Date {
  // Slack timestamps are in the format "1234567890.123456"
  const seconds = parseFloat(ts);
  return new Date(seconds * 1000);
}

function messageToNotification(
  message: SlackMessage,
  type: SlackNotificationType,
  channelId: string,
  channelName: string,
): Notification {
  const metadata: NotificationMetadata = {
    channelId,
    channelName,
    userId: message.user,
    threadTs: message.thread_ts,
  };

  // Truncate long messages for the body
  const body = message.text.length > 300 ? `${message.text.slice(0, 297)}...` : message.text;

  // Build a reasonable title based on type
  let title: string;
  switch (type) {
    case 'mention': {
      title = `Mentioned in #${channelName}`;
      break;
    }
    case 'dm': {
      title = 'New direct message';
      break;
    }
    case 'thread_reply': {
      title = `Reply in thread (#${channelName})`;
      break;
    }
    case 'channel': {
      title = `New message in #${channelName}`;
      break;
    }
    default: {
      title = `Message in #${channelName}`;
    }
  }

  // Construct Slack URL (approximate - actual deep links require workspace info)
  const url = `slack://channel?id=${channelId}&message=${message.ts}`;

  return {
    id: `slack-${message.ts}-${channelId}`,
    source: 'slack',
    type,
    title,
    body,
    url,
    timestamp: parseSlackTimestamp(message.ts).toISOString(),
    read: false,
    metadata,
  };
}

function determineNotificationType(
  message: SlackMessage,
  channel: { id: string; name: string },
  config: SlackWatcherConfig,
): SlackNotificationType | null {
  // Check if this is a DM channel
  if (channel.id.startsWith('D')) {
    return config.watchDms ? 'dm' : null;
  }

  // Check for mentions (look for <@USER_ID> patterns)
  if (message.text.includes('<@') && config.watchMentions) {
    return 'mention';
  }

  // Check for thread replies
  if (message.thread_ts && message.thread_ts !== message.ts) {
    return config.watchThreads ? 'thread_reply' : null;
  }

  return 'channel';
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return true;
  }
  const textLower = text.toLowerCase();
  return keywords.some((kw) => textLower.includes(kw.toLowerCase()));
}

// ── Factory ──────────────────────────────────────────────────

export function createSlackWatcher(deps: SlackWatcherDeps): NotificationWatcher {
  const { oauthManager, router, notificationManager, getConfig } = deps;

  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let lastPollTime: string | undefined;
  let lastError: string | undefined;
  let lastSeenTimestamp: string | null = null; // Track last seen message timestamp
  let backoffMs = INITIAL_BACKOFF_MS;
  let polling = false;

  async function getClient() {
    try {
      const token = await oauthManager.getAccessToken(SLACK_PROVIDER);
      return createSlackClient(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get Slack token';
      throw new Error(`Slack authentication failed: ${message}`);
    }
  }

  async function processChannel(
    client: ReturnType<typeof createSlackClient>,
    channel: { id: string; name: string },
    config: SlackWatcherConfig,
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];
    const messages = await client.readChannel({ channel: channel.id, limit: 10 });

    for (const message of messages) {
      // Skip if we've already seen this message
      if (lastSeenTimestamp !== null) {
        const messageTime = parseFloat(message.ts);
        const lastSeenTime = parseFloat(lastSeenTimestamp);
        if (messageTime <= lastSeenTime) {
          continue;
        }
      }

      // Determine notification type
      const type = determineNotificationType(message, channel, config);
      if (type === null) {
        continue;
      }

      // Apply keyword filter if configured
      if (!matchesKeywords(message.text, config.keywords)) {
        continue;
      }

      // Convert to notification
      const notification = messageToNotification(message, type, channel.id, channel.name);
      notifications.push(notification);
    }

    return notifications;
  }

  async function pollForNotifications(): Promise<Notification[]> {
    if (polling) {
      return [];
    }

    polling = true;
    const notifications: Notification[] = [];
    const config = getConfig();

    try {
      const client = await getClient();

      // Emit polling status
      router.emit('event:notifications.watcherStatusChanged', {
        source: 'slack',
        status: 'polling',
      });

      // Get list of channels to check
      let channelsToCheck: Array<{ id: string; name: string }>;

      if (config.channels.length > 0) {
        // Use configured channels
        channelsToCheck = config.channels.map((ch) => {
          // Support both ID and name formats
          const isId = ch.startsWith('C') || ch.startsWith('D') || ch.startsWith('G');
          return { id: isId ? ch : ch, name: ch };
        });
      } else {
        // Get all channels the user is a member of
        const allChannels = await client.listChannels({ limit: 50 });
        channelsToCheck = allChannels
          .filter((ch) => ch.is_member && !ch.is_archived)
          .map((ch) => ({ id: ch.id, name: ch.name }));
      }

      // Check each channel for new messages
      for (const channel of channelsToCheck) {
        try {
          const channelNotifications = await processChannel(client, channel, config);
          notifications.push(...channelNotifications);
        } catch (channelError) {
          // Log but continue with other channels
          console.warn(
            `[SlackWatcher] Error reading channel ${channel.name}:`,
            channelError instanceof Error ? channelError.message : 'Unknown error',
          );
        }
      }

      // Update last seen timestamp to the newest message
      if (notifications.length > 0) {
        const newestNotification = notifications.reduce((newest, n) => {
          return new Date(n.timestamp) > new Date(newest.timestamp) ? n : newest;
        }, notifications[0]);

        // Extract the Slack timestamp from our notification ID
        const idParts = newestNotification.id.split('-');
        if (idParts.length >= 2) {
          const [, slackTs] = idParts;
          lastSeenTimestamp = slackTs;
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
      console.error('[SlackWatcher] Poll error:', message);

      router.emit('event:notifications.watcherError', {
        source: 'slack',
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

    console.log(`[SlackWatcher] Started with ${String(intervalMs)}ms interval`);
  }

  function stop(): void {
    if (pollInterval !== null) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    console.log('[SlackWatcher] Stopped');
  }

  return {
    source: 'slack',

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
