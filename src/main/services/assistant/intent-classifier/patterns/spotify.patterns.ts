/**
 * Spotify Patterns — play, pause, skip, volume
 */

import type { IntentRule } from '../types';

export const SPOTIFY_RULES: IntentRule[] = [
  {
    pattern: /^(play|pause|skip|next|previous|volume)\s?/i,
    type: 'quick_command',
    subtype: 'spotify',
    action: 'spotify_control',
    confidence: 0.9,
    extractEntities: (input) => {
      const parts = input.split(/\s/);
      return {
        action: (parts[0] ?? '').toLowerCase(),
        query: parts.slice(1).join(' '),
      };
    },
  },
];
