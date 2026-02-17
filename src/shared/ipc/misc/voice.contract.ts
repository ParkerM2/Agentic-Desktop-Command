/**
 * Voice IPC Contract
 *
 * Invoke channels for voice input configuration and permission checks.
 */

import { z } from 'zod';

export const VoiceInputModeSchema = z.enum(['push_to_talk', 'continuous']);

export const VoiceConfigSchema = z.object({
  enabled: z.boolean(),
  language: z.string(),
  inputMode: VoiceInputModeSchema,
});

export const voiceInvoke = {
  'voice.getConfig': {
    input: z.object({}),
    output: VoiceConfigSchema,
  },
  'voice.updateConfig': {
    input: z.object({
      enabled: z.boolean().optional(),
      language: z.string().optional(),
      inputMode: VoiceInputModeSchema.optional(),
    }),
    output: VoiceConfigSchema,
  },
  'voice.checkPermission': {
    input: z.object({}),
    output: z.object({
      granted: z.boolean(),
      canRequest: z.boolean(),
    }),
  },
} as const;

export const voiceEvents = {
  'event:voice.transcript': {
    payload: z.object({
      transcript: z.string(),
      isFinal: z.boolean(),
    }),
  },
} as const;
