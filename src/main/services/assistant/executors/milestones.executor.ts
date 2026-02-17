/**
 * Milestones executor — handles milestone and roadmap queries.
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

export function executeMilestones(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.milestonesService) {
    return buildErrorResponse('Milestones service is not available.');
  }

  try {
    const milestones = deps.milestonesService.listMilestones({});
    if (milestones.length === 0) {
      return buildTextResponse('No milestones defined yet.');
    }
    const lines = milestones
      .slice(0, 5)
      .map((m) => `- ${m.title} (${m.status}) — due: ${m.targetDate}`);
    const moreText = milestones.length > 5 ? `\n...and ${String(milestones.length - 5)} more` : '';
    return buildActionResponse(
      `Milestones (${String(milestones.length)} total):\n${lines.join('\n')}${moreText}`,
      intent,
      'milestones_query',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Milestones query failed: ${message}`);
  }
}
