/**
 * Spotify IPC Contract
 *
 * Defines invoke channels for Spotify playback control, search,
 * and queue management. No separate schemas needed — inline shapes
 * are used since they are specific to these channels only.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { SPOTIFY } from './channels';

// ─── Invoke Channels ──────────────────────────────────────────

export const spotifyInvoke = {
  [SPOTIFY.GET.PLAYBACK]: {
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
  [SPOTIFY.PLAY.TRACK]: {
    input: z.object({ uri: z.string().optional() }),
    output: SuccessResponseSchema,
  },
  [SPOTIFY.PAUSE.TRACK]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [SPOTIFY.SKIP.NEXT]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [SPOTIFY.SKIP.PREVIOUS]: {
    input: z.object({}),
    output: SuccessResponseSchema,
  },
  [SPOTIFY.SEARCH.TRACKS]: {
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
  [SPOTIFY.SET.VOLUME]: {
    input: z.object({ volumePercent: z.number() }),
    output: SuccessResponseSchema,
  },
  [SPOTIFY.ADD['TO-QUEUE']]: {
    input: z.object({ uri: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;
