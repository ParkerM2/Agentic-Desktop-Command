/**
 * Email Patterns — send email, check queue
 */

import type { IntentRule } from '../types';

export const EMAIL_RULES: IntentRule[] = [
  {
    pattern: /(?:send|write|compose)\s+(?:an?\s+)?email/i,
    type: 'email',
    subtype: 'send',
    action: 'email_send',
    confidence: 0.9,
    extractEntities: (input) => ({
      content: input,
    }),
  },
  {
    pattern: /(?:check|show)\s+(?:email\s+)?queue/i,
    type: 'email',
    subtype: 'queue',
    action: 'email_queue',
    confidence: 0.85,
    extractEntities: () => ({}),
  },
];
