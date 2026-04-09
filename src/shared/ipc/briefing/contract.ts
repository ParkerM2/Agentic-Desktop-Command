/**
 * Briefing IPC Contract
 *
 * Defines invoke channels for daily briefing generation, retrieval,
 * configuration, and suggestions.
 */

import { z } from 'zod';

import { BRIEFING, BRIEFING_EVENTS } from './channels';
import { BriefingConfigSchema, DailyBriefingSchema, SuggestionSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const briefingInvoke = {
  [BRIEFING.GET.DAILY]: {
    input: z.object({}),
    output: DailyBriefingSchema.nullable(),
  },
  [BRIEFING.GENERATE.DAILY]: {
    input: z.object({}),
    output: DailyBriefingSchema,
  },
  [BRIEFING.GET.CONFIG]: {
    input: z.object({}),
    output: BriefingConfigSchema,
  },
  [BRIEFING.UPDATE.CONFIG]: {
    input: z.object({
      enabled: z.boolean().optional(),
      scheduledTime: z.string().optional(),
      includeGitHub: z.boolean().optional(),
      includeAgentActivity: z.boolean().optional(),
    }),
    output: BriefingConfigSchema,
  },
  [BRIEFING.GET.SUGGESTIONS]: {
    input: z.object({}),
    output: z.array(SuggestionSchema),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const briefingEvents = {
  [BRIEFING_EVENTS.BRIEFING.READY]: {
    payload: z.object({
      briefingId: z.string(),
      date: z.string(),
    }),
  },
} as const;
