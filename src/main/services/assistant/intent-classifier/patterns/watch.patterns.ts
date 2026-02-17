/**
 * Watch Patterns — "tell me when...", "notify me if...", "watch task..."
 */

import { extractFollowUp, extractTaskId, resolveWatchCondition } from '../helpers';

import type { IntentRule } from '../types';

export const WATCH_RULES: IntentRule[] = [
  {
    pattern: /(?:tell|notify|alert|update|let)\s+me\s+(?:know|when)/i,
    type: 'watch',
    subtype: 'create',
    action: 'watch_create',
    confidence: 0.9,
    extractEntities: (input) => ({
      targetId: extractTaskId(input),
      condition: resolveWatchCondition(input),
      followUp: extractFollowUp(input),
    }),
  },
  {
    pattern: /(?:remind|ping)\s+me\s+(?:when|if)/i,
    type: 'watch',
    subtype: 'create',
    action: 'watch_create',
    confidence: 0.9,
    extractEntities: (input) => ({
      targetId: extractTaskId(input),
      condition: resolveWatchCondition(input),
    }),
  },
  {
    pattern: /(?:watch|monitor)\s+task\s+/i,
    type: 'watch',
    subtype: 'create',
    action: 'watch_create',
    confidence: 0.9,
    extractEntities: (input) => ({
      targetId: extractTaskId(input),
      condition: 'changes',
    }),
  },
  {
    pattern: /(?:stop|cancel|remove)\s+(?:watch(?:ing)?|notification|alert)/i,
    type: 'watch',
    subtype: 'remove',
    action: 'watch_remove',
    confidence: 0.9,
    extractEntities: (input) => ({
      targetId: extractTaskId(input),
    }),
  },
  {
    pattern: /(?:list|show)\s+(?:my\s+)?(?:watches|notifications|alerts)/i,
    type: 'watch',
    subtype: 'list',
    action: 'watch_list',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  {
    pattern: /what\s+(?:am\s+I|are\s+you)\s+watch/i,
    type: 'watch',
    subtype: 'list',
    action: 'watch_list',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
];
