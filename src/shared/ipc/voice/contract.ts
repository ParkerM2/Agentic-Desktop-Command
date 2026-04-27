/**
 * Voice IPC Contract
 *
 * Invoke channels for voice input configuration and permission checks.
 */

import { z } from 'zod';

import { VOICE, VOICE_EVENTS } from './channels';

export const VoiceInputModeSchema = z.enum(['push_to_talk', 'continuous']);

export const VoiceConfigSchema = z.object({
  enabled: z.boolean(),
  language: z.string(),
  inputMode: VoiceInputModeSchema,
});

export const voiceInvoke = {
  [VOICE.GET.CONFIG]: {
    input: z.object({}),
    output: VoiceConfigSchema,
  },
  [VOICE.UPDATE.CONFIG]: {
    input: z.object({
      enabled: z.boolean().optional(),
      language: z.string().optional(),
      inputMode: VoiceInputModeSchema.optional(),
    }),
    output: VoiceConfigSchema,
  },
  [VOICE.CHECK.PERMISSION]: {
    input: z.object({}),
    output: z.object({
      granted: z.boolean(),
      canRequest: z.boolean(),
    }),
  },
} as const;

export const voiceEvents = {
  [VOICE_EVENTS.SPEECH.TRANSCRIPT]: {
    payload: z.object({
      transcript: z.string(),
      isFinal: z.boolean(),
    }),
  },
} as const;
