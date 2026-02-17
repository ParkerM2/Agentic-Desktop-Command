/**
 * Device Patterns — "what's running on my MacBook?", "show my devices"
 */

import type { IntentRule } from '../types';

export const DEVICE_RULES: IntentRule[] = [
  {
    pattern: /(?:what(?:'s|\s+is))\s+(?:running|happening)\s+on\s+(?:my\s+)?(\w+)/i,
    type: 'device_query',
    subtype: 'status',
    action: 'device_query',
    confidence: 0.9,
    extractEntities: (input, match) => ({
      deviceName: match[1],
      query: input,
    }),
  },
  {
    pattern: /(?:show|list)\s+(?:my\s+)?devices/i,
    type: 'device_query',
    subtype: 'list',
    action: 'device_query',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:status|state)\s+(?:of\s+)?(?:all\s+)?devices/i,
    type: 'device_query',
    subtype: 'list',
    action: 'device_query',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:what|which)\s+devices?\s+(?:are\s+)?online/i,
    type: 'device_query',
    subtype: 'list',
    action: 'device_query',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
];
