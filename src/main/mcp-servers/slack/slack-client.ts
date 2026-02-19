/**
 * Slack Web API Client
 *
 * Wraps the Slack Web API using native fetch.
 * Handles rate limiting with exponential backoff.
 */

import { mcpLogger } from '@main/lib/logger';

import type {
  SlackChannel,
  SlackChannelListResponse,
  SlackMessage,
  SlackMessageListResponse,
  SlackPostMessageResponse,
  SlackSearchResponse,
  SlackThreadResponse,
  StandupEntry,
} from './types';

// ── Types ────────────────────────────────────────────────────

export interface SlackClient {
  /** Send a message to a channel or DM */
  sendMessage: (params: {
    channel: string;
    text: string;
    threadTs?: string;
  }) => Promise<{ ts: string; channel: string }>;

  /** Read recent messages from a channel */
  readChannel: (params: { channel: string; limit?: number }) => Promise<SlackMessage[]>;

  /** Search messages across workspace */
  search: (params: {
    query: string;
    count?: number;
  }) => Promise<{ matches: SlackMessage[]; total: number }>;

  /** Get thread replies */
  getThreads: (params: { channel: string; threadTs: string }) => Promise<SlackMessage[]>;

  /** Set user status */
  setStatus: (params: {
    text: string;
    emoji?: string;
    expiration?: number;
  }) => Promise<{ ok: boolean }>;

  /** List channels the user can access */
  listChannels: (params?: { limit?: number }) => Promise<SlackChannel[]>;

  /** Post a formatted standup update */
  postStandup: (params: {
    channel: string;
    standup: StandupEntry;
  }) => Promise<{ ts: string; channel: string }>;
}

// ── Constants ────────────────────────────────────────────────

const BASE_URL = 'https://slack.com/api';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// ── Helpers ──────────────────────────────────────────────────

class SlackApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'SlackApiError';
  }
}

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=utf-8',
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : INITIAL_BACKOFF_MS * 2 ** attempt;

      mcpLogger.warn(`[SlackClient] Rate limited, retrying in ${String(waitMs)}ms`);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new SlackApiError(
        response.status,
        `Slack API HTTP error ${String(response.status)}: ${body}`,
      );
    }

    return response;
  }

  throw lastError ?? new SlackApiError(429, 'Max retries exceeded due to rate limiting');
}

function formatStandup(standup: StandupEntry): string {
  const lines = ['*Standup Update*', `*Y:* ${standup.yesterday}`, `*T:* ${standup.today}`];
  if (standup.blockers.length > 0) {
    lines.push(`*B:* ${standup.blockers}`);
  }
  return lines.join('\n');
}

// ── Factory ──────────────────────────────────────────────────

export function createSlackClient(token: string): SlackClient {
  const headers = buildHeaders(token);

  async function post<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}/${method}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as T & { ok: boolean; error?: string };
    if (!data.ok) {
      throw new SlackApiError(200, `Slack API error: ${data.error ?? 'unknown'}`);
    }
    return data;
  }

  async function get<T>(method: string, params: Record<string, string>): Promise<T> {
    const searchParams = new URLSearchParams(params);
    const response = await fetchWithRetry(`${BASE_URL}/${method}?${searchParams.toString()}`, {
      method: 'GET',
      headers,
    });
    const data = (await response.json()) as T & { ok: boolean; error?: string };
    if (!data.ok) {
      throw new SlackApiError(200, `Slack API error: ${data.error ?? 'unknown'}`);
    }
    return data;
  }

  return {
    async sendMessage({ channel, text, threadTs }) {
      const body: Record<string, unknown> = { channel, text };
      if (threadTs) {
        body.thread_ts = threadTs;
      }
      const result = await post<SlackPostMessageResponse>('chat.postMessage', body);
      return { ts: result.ts, channel: result.channel };
    },

    async readChannel({ channel, limit = 20 }) {
      const result = await get<SlackMessageListResponse>('conversations.history', {
        channel,
        limit: String(limit),
      });
      return result.messages;
    },

    async search({ query, count = 20 }) {
      const result = await get<SlackSearchResponse>('search.messages', {
        query,
        count: String(count),
      });
      return {
        matches: result.messages.matches,
        total: result.messages.total,
      };
    },

    async getThreads({ channel, threadTs }) {
      const result = await get<SlackThreadResponse>('conversations.replies', {
        channel,
        ts: threadTs,
      });
      return result.messages;
    },

    async setStatus({ text, emoji, expiration }) {
      const profile: Record<string, unknown> = {
        status_text: text,
        status_emoji: emoji ?? '',
      };
      if (expiration !== undefined) {
        profile.status_expiration = expiration;
      }
      await post('users.profile.set', { profile });
      return { ok: true };
    },

    async listChannels({ limit = 100 } = {}) {
      const result = await get<SlackChannelListResponse>('conversations.list', {
        limit: String(limit),
        types: 'public_channel,private_channel',
        exclude_archived: 'true',
      });
      return result.channels;
    },

    async postStandup({ channel, standup }) {
      const text = formatStandup(standup);
      const result = await post<SlackPostMessageResponse>('chat.postMessage', {
        channel,
        text,
        mrkdwn: true,
      });
      return { ts: result.ts, channel: result.channel };
    },
  };
}
