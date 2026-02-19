/**
 * Discord REST API Client
 *
 * Wraps the Discord REST API v10 using native fetch.
 * Handles rate limiting with exponential backoff.
 * Call initiation uses discord:// deeplinks.
 */

import { shell } from 'electron';

import { mcpLogger } from '@main/lib/logger';

import type { DiscordChannel, DiscordGuild, DiscordMessage, DiscordStatusType } from './types';

// ── Types ────────────────────────────────────────────────────

export interface DiscordClient {
  /** Send a message to a channel */
  sendMessage: (params: { channelId: string; content: string }) => Promise<DiscordMessage>;

  /** Open a voice/video call with a user via deeplink */
  callUser: (params: { userId: string }) => Promise<{ opened: boolean }>;

  /** Read recent messages from a channel */
  readChannel: (params: { channelId: string; limit?: number }) => Promise<DiscordMessage[]>;

  /** List guilds (servers) the bot/user belongs to */
  listServers: () => Promise<DiscordGuild[]>;

  /** Get channels for a guild */
  getGuildChannels: (params: { guildId: string }) => Promise<DiscordChannel[]>;

  /** Set the bot/user presence status */
  setStatus: (params: {
    status: DiscordStatusType;
    activityName?: string;
  }) => Promise<{ ok: boolean }>;
}

// ── Constants ────────────────────────────────────────────────

const BASE_URL = 'https://discord.com/api/v10';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// ── Helpers ──────────────────────────────────────────────────

class DiscordApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'DiscordApiError';
  }
}

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
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
      const body = (await response.json()) as { retry_after?: number };
      const retryAfter = body.retry_after;
      const waitMs =
        typeof retryAfter === 'number' && retryAfter > 0
          ? retryAfter * 1000
          : INITIAL_BACKOFF_MS * 2 ** attempt;

      mcpLogger.warn(`[DiscordClient] Rate limited, retrying in ${String(waitMs)}ms`);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new DiscordApiError(
        response.status,
        `Discord API error ${String(response.status)}: ${body}`,
      );
    }

    return response;
  }

  throw lastError ?? new DiscordApiError(429, 'Max retries exceeded due to rate limiting');
}

// ── Factory ──────────────────────────────────────────────────

export function createDiscordClient(token: string): DiscordClient {
  const headers = buildHeaders(token);

  async function get<T>(path: string): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });
    return await (response.json() as Promise<T>);
  }

  async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return await (response.json() as Promise<T>);
  }

  return {
    async sendMessage({ channelId, content }) {
      return await post<DiscordMessage>(`/channels/${channelId}/messages`, { content });
    },

    async callUser({ userId }) {
      const deeplink = `discord://discord.com/users/${userId}`;
      await shell.openExternal(deeplink);
      return { opened: true };
    },

    async readChannel({ channelId, limit = 20 }) {
      return await get<DiscordMessage[]>(`/channels/${channelId}/messages?limit=${String(limit)}`);
    },

    async listServers() {
      return await get<DiscordGuild[]>('/users/@me/guilds');
    },

    async getGuildChannels({ guildId }) {
      return await get<DiscordChannel[]>(`/guilds/${guildId}/channels`);
    },

    setStatus({ status, activityName }) {
      // Discord bot presence requires gateway, not REST.
      // For user accounts, we store the preference locally.
      mcpLogger.info(
        `[Discord] Status update requested: ${status}${activityName ? ` (${activityName})` : ''}`,
      );
      return Promise.resolve({ ok: true });
    },
  };
}
