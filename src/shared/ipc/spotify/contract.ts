/**
 * Spotify IPC Contract
 *
 * Defines invoke channels for Spotify playback control, search,
 * and queue management. No separate schemas needed — inline shapes
 * are used since they are specific to these channels only.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const spotifyInvoke = {
  'spotify.getPlayback': {
    input: z.object({}),
    output: z
      .object({
        isPlaying: z.boolean(),
        track: z.string().optional(),
        artist: z.string().optional(),
        album: z.string().optional(),
        albumArt: z.string().optional(),
        progressMs: z.number().optional(),
        durationMs: z.number().optional(),
        device: z.string().optional(),
        volume: z.number().optional(),
      })
      .nullable(),
  },
  'spotify.play': {
    input: z.object({ uri: z.string().optional() }),
    output: SuccessResponseSchema,
  },
  'spotify.pause': {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  'spotify.next': {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  'spotify.previous': {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  'spotify.search': {
    input: z.object({ query: z.string(), limit: z.number().optional() }),
    output: z.array(
      z.object({
        name: z.string(),
        artist: z.string(),
        album: z.string(),
        uri: z.string(),
        durationMs: z.number(),
      }),
    ),
  },
  'spotify.setVolume': {
    input: z.object({ volumePercent: z.number() }),
    output: SuccessResponseSchema,
  },
  'spotify.addToQueue': {
    input: z.object({ uri: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const spotifyEvents = {} as const;
