/**
 * Spotify Integration — service and IPC handlers.
 *
 * Service wraps the Spotify client with OAuth token management.
 * Maps raw API responses to the IPC contract shapes.
 */

import { SPOTIFY } from '@shared/ipc/spotify/channels';

import { createSpotifyClient } from '../../mcp-servers/spotify/spotify-client';

import type { OAuthManager } from '../../auth/oauth-manager';
import type { IpcRouter } from '../../ipc/router';

// ── Interface ─────────────────────────────────────────────────

export interface SpotifyService {
  getPlayback: () => Promise<{
    isPlaying: boolean;
    track?: string;
    artist?: string;
    album?: string;
    albumArt?: string;
    progressMs?: number;
    durationMs?: number;
    device?: string;
    volume?: number;
  } | null>;

  play: (params: { uri?: string }) => Promise<{ success: boolean }>;
  pause: () => Promise<{ success: boolean }>;
  next: () => Promise<{ success: boolean }>;
  previous: () => Promise<{ success: boolean }>;
  search: (params: { query: string; limit?: number }) => Promise<
    Array<{
      name: string;
      artist: string;
      album: string;
      uri: string;
      durationMs: number;
    }>
  >;
  setVolume: (params: { volumePercent: number }) => Promise<{ success: boolean }>;
  addToQueue: (params: { uri: string }) => Promise<{ success: boolean }>;
}

// ── Factory ───────────────────────────────────────────────────

const SPOTIFY_PROVIDER = 'spotify';

export function createSpotifyService(deps: { oauthManager: OAuthManager }): SpotifyService {
  const { oauthManager } = deps;

  async function getClient() {
    const token = await oauthManager.getAccessToken(SPOTIFY_PROVIDER);
    return createSpotifyClient(token);
  }

  return {
    async getPlayback() {
      const client = await getClient();
      const state = await client.getPlaybackState();
      if (!state) {
        return null;
      }
      return {
        isPlaying: state.is_playing,
        track: state.item?.name,
        artist: state.item?.artists.map((a) => a.name).join(', '),
        album: state.item?.album.name,
        albumArt: state.item?.album.images[0]?.url,
        progressMs: state.progress_ms ?? undefined,
        durationMs: state.item?.duration_ms,
        device: state.device.name,
        volume: state.device.volume_percent ?? undefined,
      };
    },

    async play(params) {
      const client = await getClient();
      return await client.play({ uri: params.uri });
    },

    async pause() {
      const client = await getClient();
      return await client.pause();
    },

    async next() {
      const client = await getClient();
      return await client.next();
    },

    async previous() {
      const client = await getClient();
      return await client.previous();
    },

    async search(params) {
      const client = await getClient();
      const tracks = await client.search(params);
      return tracks.map((t) => ({
        name: t.name,
        artist: t.artists.map((a) => a.name).join(', '),
        album: t.album.name,
        uri: t.uri,
        durationMs: t.duration_ms,
      }));
    },

    async setVolume(params) {
      const client = await getClient();
      return await client.setVolume(params);
    },

    async addToQueue(params) {
      const client = await getClient();
      return await client.addToQueue(params);
    },
  };
}

// ── Handlers ──────────────────────────────────────────────────

export function registerSpotifyHandlers(router: IpcRouter, service: SpotifyService): void {
  router.handle(SPOTIFY.GET.PLAYBACK, async () => {
    return await service.getPlayback();
  });

  router.handle(SPOTIFY.PLAY.TRACK, async (params) => {
    return await service.play(params);
  });

  router.handle(SPOTIFY.PAUSE.TRACK, async () => {
    return await service.pause();
  });

  router.handle(SPOTIFY.SKIP.NEXT, async () => {
    return await service.next();
  });

  router.handle(SPOTIFY.SKIP.PREVIOUS, async () => {
    return await service.previous();
  });

  router.handle(SPOTIFY.SEARCH.TRACKS, async (params) => {
    return await service.search(params);
  });

  router.handle(SPOTIFY.SET.VOLUME, async (params) => {
    return await service.setVolume(params);
  });

  router.handle(SPOTIFY.ADD['TO-QUEUE'], async (params) => {
    return await service.addToQueue(params);
  });
}
