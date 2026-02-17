/**
 * Insights executor — handles project metrics and analytics queries.
 */

import type { AssistantResponse } from '@shared/types';

import { buildActionResponse, buildErrorResponse, UNKNOWN_ERROR } from './response-builders';

import type { ClassifiedIntent } from '../intent-classifier';
import type { CommandExecutorDeps } from './types';

export function executeInsights(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.insightsService) {
    return buildErrorResponse('Insights service is not available.');
  }

  try {
    const metrics = deps.insightsService.getMetrics();
    return buildActionResponse(
      `Project metrics:\n- Tasks: ${String(metrics.completedTasks)}/${String(metrics.totalTasks)} completed (${String(metrics.completionRate)}%)\n- Active agents: ${String(metrics.activeAgents)}\n- Agent success rate: ${String(metrics.agentSuccessRate)}%`,
      intent,
      'insights_query',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Insights query failed: ${message}`);
  }
}
