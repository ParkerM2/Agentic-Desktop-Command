/**
 * Fitness Patterns — log workout, query workouts, measurements
 */

import type { IntentRule } from '../types';

export const FITNESS_RULES: IntentRule[] = [
  {
    pattern: /(?:log|add|record)\s+(?:a\s+)?(?:workout|exercise|run|walk|gym)/i,
    type: 'fitness',
    subtype: 'log',
    action: 'fitness_log',
    confidence: 0.9,
    extractEntities: (input) => ({
      content: input,
    }),
  },
  {
    pattern: /(?:my|show|get)\s+(?:workouts?|fitness|exercise)/i,
    type: 'fitness',
    subtype: 'query',
    action: 'fitness_query',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:my|show|get)\s+(?:weight|body|measurements?)/i,
    type: 'fitness',
    subtype: 'measurements',
    action: 'fitness_measurements',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
];
