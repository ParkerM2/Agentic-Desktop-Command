/**
 * GitHub Patterns — PRs, issues, notifications
 */

import type { IntentRule } from '../types';

export const GITHUB_RULES: IntentRule[] = [
  {
    pattern: /(?:show|list|get)\s+(?:my\s+)?(?:pull\s+requests?|PRs?)/i,
    type: 'github',
    subtype: 'prs',
    action: 'github_prs',
    confidence: 0.9,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:show|list|get)\s+(?:my\s+)?issues/i,
    type: 'github',
    subtype: 'issues',
    action: 'github_issues',
    confidence: 0.85,
    extractEntities: (input) => ({
      query: input,
    }),
  },
  {
    pattern: /(?:github|gh)\s+notifications?/i,
    type: 'github',
    subtype: 'notifications',
    action: 'github_notifications',
    confidence: 0.9,
    extractEntities: () => ({}),
  },
];
