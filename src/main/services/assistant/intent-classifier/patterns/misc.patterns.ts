/**
 * Miscellaneous Patterns — briefing, insights, ideation, milestones, changelog
 */

import type { IntentRule } from '../types';

export const MISC_RULES: IntentRule[] = [
  {
    pattern: /(?:daily|morning)\s+(?:briefing|summary|update)/i,
    type: 'briefing',
    subtype: 'get',
    action: 'briefing_get',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  {
    pattern: /(?:brief|catch)\s+me\s+up/i,
    type: 'briefing',
    subtype: 'get',
    action: 'briefing_get',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  {
    pattern: /(?:how\s+many|count|stats?|metrics?|analytics)/i,
    type: 'insights',
    subtype: 'query',
    action: 'insights_query',
    confidence: 0.85,
    extractEntities: (input) => ({ query: input }),
  },
  {
    pattern: /(?:completion|success)\s+rate/i,
    type: 'insights',
    subtype: 'query',
    action: 'insights_query',
    confidence: 0.85,
    extractEntities: (input) => ({ query: input }),
  },
  {
    pattern: /(?:add|submit|propose)\s+(?:an?\s+)?idea/i,
    type: 'ideation',
    subtype: 'create',
    action: 'ideation_create',
    confidence: 0.9,
    extractEntities: (input) => ({ content: input }),
  },
  {
    pattern: /(?:show|list|get)\s+(?:my\s+)?ideas/i,
    type: 'ideation',
    subtype: 'query',
    action: 'ideation_query',
    confidence: 0.85,
    extractEntities: (input) => ({ query: input }),
  },
  {
    pattern: /(?:milestone|roadmap|deadline)/i,
    type: 'milestones',
    subtype: 'query',
    action: 'milestones_query',
    confidence: 0.85,
    extractEntities: (input) => ({ query: input }),
  },
  {
    pattern: /(?:what(?:'s| is))\s+due/i,
    type: 'milestones',
    subtype: 'query',
    action: 'milestones_query',
    confidence: 0.85,
    extractEntities: (input) => ({ query: input }),
  },
  {
    pattern: /(?:generate|create)\s+changelog/i,
    type: 'changelog',
    subtype: 'generate',
    action: 'changelog_generate',
    confidence: 0.9,
    extractEntities: (input) => ({ content: input }),
  },
];
