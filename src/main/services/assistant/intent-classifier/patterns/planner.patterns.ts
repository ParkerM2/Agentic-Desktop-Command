/**
 * Planner Patterns — today plan, weekly review
 */

import type { IntentRule } from '../types';

export const PLANNER_RULES: IntentRule[] = [
  {
    pattern: /(?:what(?:'s| is))\s+(?:my\s+)?plan\s+(?:for\s+)?today/i,
    type: 'planner',
    subtype: 'today',
    action: 'planner_today',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
  {
    pattern: /(?:weekly|week)\s+review/i,
    type: 'planner',
    subtype: 'weekly',
    action: 'planner_weekly',
    confidence: 0.85,
    extractEntities: () => ({}),
  },
];
