/**
 * Briefing executor — handles daily briefing generation and retrieval.
 */

import type { AssistantResponse } from '@shared/types';

import { buildActionResponse, buildErrorResponse, UNKNOWN_ERROR } from './response-builders';

import type { ClassifiedIntent } from '../intent-classifier';
import type { CommandExecutorDeps } from './types';

export async function executeBriefing(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  if (!deps.briefingService) {
    return buildErrorResponse('Briefing service is not available.');
  }

  try {
    const cached = deps.briefingService.getDailyBriefing();
    if (cached) {
      return buildActionResponse(cached.summary, intent, 'briefing_get');
    }

    const briefing = await deps.briefingService.generateBriefing();
    return buildActionResponse(briefing.summary, intent, 'briefing_get');
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Briefing generation failed: ${message}`);
  }
}
