/**
 * Calendar Patterns — query events, create events
 */

import type { IntentRule } from '../types';

export const CALENDAR_RULES: IntentRule[] = [
  {
    pattern: /(?:what(?:'s| is))\s+on\s+my\s+calendar/i,
    type: 'calendar',
    subtype: 'query',
    action: 'calendar_query',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:schedule|book|create)\s+(?:a\s+)?(?:meeting|event|block)/i,
    type: 'calendar',
    subtype: 'create',
    action: 'calendar_create',
    confidence: 0.9,
    extractEntities: (input) => ({
      content: input,
    }),
  },
];
