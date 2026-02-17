/**
 * Ideation executor — handles idea submission and listing.
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

export function executeIdeation(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.ideasService) {
    return buildErrorResponse('Ideas service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'create':
        return buildActionResponse(
          'Ready to capture a new idea. Please provide a title and description.',
          intent,
          'ideation_create',
        );
      case 'query': {
        const ideas = deps.ideasService.listIdeas({});
        if (ideas.length === 0) {
          return buildTextResponse('No ideas submitted yet.');
        }
        const lines = ideas.slice(0, 5).map((idea) => `- ${idea.title} [${idea.status}]`);
        const moreText = ideas.length > 5 ? `\n...and ${String(ideas.length - 5)} more` : '';
        return buildActionResponse(
          `Ideas (${String(ideas.length)} total):\n${lines.join('\n')}${moreText}`,
          intent,
          'ideation_query',
        );
      }
      default:
        return buildTextResponse(
          'I understood that as an ideation command, but could not determine the action.',
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Ideation command failed: ${message}`);
  }
}
