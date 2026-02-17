/**
 * Notes Patterns — search, list, create note, standup
 */

import { stripPrefix } from '../helpers';

import type { IntentRule } from '../types';

export const NOTES_RULES: IntentRule[] = [
  {
    pattern: /(?:find|search)\s+(?:my\s+)?notes?\s+(?:about|for|on)/i,
    type: 'notes',
    subtype: 'search',
    action: 'notes_search',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /^(?:show|list|get)\s+(?:my\s+)?notes/i,
    type: 'notes',
    subtype: 'list',
    action: 'notes_list',
    confidence: 0.85,
    extractEntities: () => ({}),
  },
  {
    pattern: /^(note[:\s]|remember\s)/i,
    type: 'quick_command',
    subtype: 'notes',
    action: 'create_note',
    confidence: 0.95,
    extractEntities: (input) => ({
      content: stripPrefix(input, /^(note[:\s]|remember\s)/i),
    }),
  },
  {
    pattern: /^#standup\s/i,
    type: 'quick_command',
    subtype: 'standup',
    action: 'create_note',
    confidence: 0.95,
    extractEntities: (input) => ({
      raw: input,
    }),
  },
];
