/**
 * Quick Command Patterns — reminders, launcher
 */

import { getTimeParser, stripPrefix } from '../helpers';

import type { IntentRule } from '../types';

export const QUICKCMD_RULES: IntentRule[] = [
  // Reminders
  {
    pattern: /^(remind|alert)\s/i,
    type: 'quick_command',
    subtype: 'reminder',
    action: 'create_reminder',
    confidence: 0.85,
    extractEntities: (input) => {
      const stripped = stripPrefix(input, /^(remind|alert)\s+(me\s+)?/i);
      const parser = getTimeParser();
      const parsed = parser.parseTime(stripped);

      if (parsed) {
        const timeText = parsed.text;
        const afterTime = stripped.slice(stripped.indexOf(timeText) + timeText.length);
        const message = afterTime.replace(/^\s*to\s+/i, '').trim();

        return {
          content: input,
          message: message || stripped,
          triggerAt: parsed.date.toISOString(),
          isRelative: String(parsed.isRelative),
        };
      }

      return {
        content: input,
        message: stripped,
        triggerAt: '',
        isRelative: 'false',
      };
    },
  },
  // Launcher
  {
    pattern: /^(open|launch)\s/i,
    type: 'quick_command',
    subtype: 'launcher',
    action: 'open_url',
    confidence: 0.9,
    extractEntities: (input) => ({
      target: stripPrefix(input, /^(open|launch)\s/i),
    }),
  },
];
