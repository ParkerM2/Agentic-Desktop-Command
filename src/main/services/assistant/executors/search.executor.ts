/**
 * Search executor — handles cross-service search queries.
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

export function handleSearch(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  const query = intent.extractedEntities.query || intent.originalInput;

  if (!deps.notesService) {
    return buildErrorResponse('Notes service is not available for search.');
  }

  try {
    const results = deps.notesService.searchNotes(query);
    if (results.length === 0) {
      return buildTextResponse(`No results found for "${query}"`);
    }

    const summaryLines = results.slice(0, 5).map((note) => `- ${note.title}`);
    const moreText = results.length > 5 ? `\n...and ${String(results.length - 5)} more` : '';

    return buildActionResponse(
      `Found ${String(results.length)} result(s):\n${summaryLines.join('\n')}${moreText}`,
      intent,
      'search',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Search failed: ${message}`);
  }
}
