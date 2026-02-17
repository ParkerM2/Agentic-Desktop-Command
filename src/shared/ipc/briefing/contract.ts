/**
 * Briefing IPC Contract
 *
 * Defines invoke channels for daily briefing generation, retrieval,
 * configuration, and suggestions.
 */

import { z } from 'zod';

import { BriefingConfigSchema, DailyBriefingSchema, SuggestionSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const briefingInvoke = {
  'briefing.getDaily': {
    input: z.object({}),
    output: DailyBriefingSchema.nullable(),
  },
  'briefing.generate': {
    input: z.object({}),
    output: DailyBriefingSchema,
  },
  'briefing.getConfig': {
    input: z.object({}),
    output: BriefingConfigSchema,
  },
  'briefing.updateConfig': {
    input: z.object({
      enabled: z.boolean().optional(),
      scheduledTime: z.string().optional(),
      includeGitHub: z.boolean().optional(),
      includeAgentActivity: z.boolean().optional(),
    }),
    output: BriefingConfigSchema,
  },
  'briefing.getSuggestions': {
    input: z.object({}),
    output: z.array(SuggestionSchema),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const briefingEvents = {
  'event:briefing.ready': {
    payload: z.object({
      briefingId: z.string(),
      date: z.string(),
    }),
  },
} as const;
