/**
 * Changelog executor — handles changelog generation and display.
 */

import type { AssistantResponse } from '@shared/types';

import {
  buildActionResponse,
  buildErrorResponse,
  buildTextResponse,
  UNKNOWN_ERROR,
} from './response-builders';

import type { ClassifiedIntent } from '../intent-classifier';
import type { CommandExecutorDeps } from './types';

export function executeChangelog(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.changelogService) {
    return buildErrorResponse('Changelog service is not available.');
  }

  try {
    const entries = deps.changelogService.listEntries();
    if (entries.length === 0) {
      return buildTextResponse('No changelog entries yet.');
    }
    const latest = entries[0];
    const categoryLines = latest.categories.map((c) => `  ${c.type}: ${c.items.join(', ')}`);
    return buildActionResponse(
      `Latest changelog (${latest.version} — ${latest.date}):\n${categoryLines.join('\n')}`,
      intent,
      'changelog_generate',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Changelog command failed: ${message}`);
  }
}
