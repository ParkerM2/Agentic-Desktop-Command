/**
 * Spotify Web API Client
 *
 * Wraps the Spotify Web API using native fetch.
 * Handles rate limiting with exponential backoff.
 * Consumes tokens from the OAuth token store.
 */

import { mcpLogger } from '@main/lib/logger';

import type {
  SpotifyPlaybackState,
  SpotifyPlaylist,
  SpotifyPlaylistListResponse,
  SpotifySearchResult,
  SpotifyTrack,
} from './types';

// ── Types ────────────────────────────────────────────────────

export interface SpotifyClient {
  /** Get the current playback state */
  getPlaybackState: () => Promise<SpotifyPlaybackState | null>;

  /** Start or resume playback */
  play: (params?: { uri?: string; deviceId?: string }) => Promise<{ success: boolean }>;

  /** Pause playback */
  pause: (params?: { deviceId?: string }) => Promise<{ success: boolean }>;

  /** Skip to the next track */
  next: (params?: { deviceId?: string }) => Promise<{ success: boolean }>;

  /** Skip to the previous track */
  previous: (params?: { deviceId?: string }) => Promise<{ success: boolean }>;

  /** Search for tracks */
  search: (params: { query: string; limit?: number }) => Promise<SpotifyTrack[]>;

  /** Set playback volume */
  setVolume: (params: {
    volumePercent: number;
    deviceId?: string;
  }) => Promise<{ success: boolean }>;

  /** Add a track to the playback queue */
  addToQueue: (params: { uri: string; deviceId?: string }) => Promise<{ success: boolean }>;

  /** Get the user's playlists */
  getPlaylists: (params?: { limit?: number }) => Promise<SpotifyPlaylist[]>;
}

// ── Constants ────────────────────────────────────────────────

const BASE_URL = 'https://api.spotify.com/v1';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// ── Helpers ──────────────────────────────────────────────────

class SpotifyApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'SpotifyApiError';
  }
}

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
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
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : INITIAL_BACKOFF_MS * 2 ** attempt;

      mcpLogger.warn(`[SpotifyClient] Rate limited, retrying in ${String(waitMs)}ms`);
      await sleep(waitMs);
      continue;
    }

    // 204 No Content is a successful response for Spotify control endpoints
    if (response.status === 204) {
      return response;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new SpotifyApiError(
        response.status,
        `Spotify API error ${String(response.status)}: ${body}`,
      );
    }

    return response;
  }

  throw lastError ?? new SpotifyApiError(429, 'Max retries exceeded due to rate limiting');
}

function appendDevice(url: string, deviceId?: string): string {
  if (!deviceId) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}device_id=${deviceId}`;
}

// ── Factory ──────────────────────────────────────────────────

export function createSpotifyClient(token: string): SpotifyClient {
  const headers = buildHeaders(token);

  async function get<T>(path: string): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });
    return await (response.json() as Promise<T>);
  }

  async function put(path: string, body?: Record<string, unknown>): Promise<Response> {
    return await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async function post(path: string, body?: Record<string, unknown>): Promise<Response> {
    return await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  return {
    async getPlaybackState() {
      try {
        const response = await fetchWithRetry(`${BASE_URL}/me/player`, {
          method: 'GET',
          headers,
        });
        if (response.status === 204) {
          return null;
        }
        return await (response.json() as Promise<SpotifyPlaybackState>);
      } catch {
        return null;
      }
    },

    async play({ uri, deviceId } = {}) {
      const url = appendDevice('/me/player/play', deviceId);
      const body = uri ? { uris: [uri] } : undefined;
      await put(url, body);
      return { success: true };
    },

    async pause({ deviceId } = {}) {
      const url = appendDevice('/me/player/pause', deviceId);
      await put(url);
      return { success: true };
    },

    async next({ deviceId } = {}) {
      const url = appendDevice('/me/player/next', deviceId);
      await post(url);
      return { success: true };
    },

    async previous({ deviceId } = {}) {
      const url = appendDevice('/me/player/previous', deviceId);
      await post(url);
      return { success: true };
    },

    async search({ query, limit = 10 }) {
      const params = new URLSearchParams({
        q: query,
        type: 'track',
        limit: String(limit),
      });
      const result = await get<SpotifySearchResult>(`/search?${params.toString()}`);
      return result.tracks.items;
    },

    async setVolume({ volumePercent, deviceId }) {
      const clampedVolume = Math.max(0, Math.min(100, Math.round(volumePercent)));
      const url = appendDevice(
        `/me/player/volume?volume_percent=${String(clampedVolume)}`,
        deviceId,
      );
      await put(url);
      return { success: true };
    },

    async addToQueue({ uri, deviceId }) {
      const url = appendDevice(`/me/player/queue?uri=${encodeURIComponent(uri)}`, deviceId);
      await post(url);
      return { success: true };
    },

    async getPlaylists({ limit = 20 } = {}) {
      const result = await get<SpotifyPlaylistListResponse>(`/me/playlists?limit=${String(limit)}`);
      return result.items;
    },
  };
}
