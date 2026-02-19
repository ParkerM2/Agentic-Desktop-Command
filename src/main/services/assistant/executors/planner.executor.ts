/**
 * Planner executor — handles time block creation and plan queries.
 */

import type { AssistantContext, AssistantResponse } from '@shared/types';

import {
  buildActionResponse,
  buildErrorResponse,
  buildTextResponse,
  UNKNOWN_ERROR,
} from './response-builders';

import type { ClassifiedIntent } from '../intent-classifier';
import type { CommandExecutorDeps } from './types';

export function handleCreateTimeBlock(
  intent: ClassifiedIntent,
  context: AssistantContext | undefined,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.plannerService) {
    return buildErrorResponse('Planner service is not available.');
  }

  const todayDate = context?.todayDate ?? new Date().toISOString().slice(0, 10);
  const label = intent.extractedEntities.label || intent.originalInput;
  const startTime = intent.extractedEntities.startTime || '';
  const endTime = intent.extractedEntities.endTime || '';
  const blockType = intent.extractedEntities.type || 'focus';

  try {
    const validTypes = new Set(['focus', 'meeting', 'break', 'other']);
    const resolvedType = validTypes.has(blockType) ? blockType : 'focus';

    const block = deps.plannerService.addTimeBlock(todayDate, {
      startTime,
      endTime,
      label,
      type: resolvedType as 'focus' | 'meeting' | 'break' | 'other',
    });

    const timeRange =
      startTime.length > 0 && endTime.length > 0 ? ` ${startTime} - ${endTime}` : '';
    return buildActionResponse(
      `Time block added: ${block.label}${timeRange}`,
      intent,
      'create_time_block',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Failed to create time block: ${message}`);
  }
}

export function executePlanner(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.plannerService) {
    return buildErrorResponse('Planner service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'today': {
        const todayDate = new Date().toISOString().slice(0, 10);
        const plan = deps.plannerService.getDay(todayDate);
        if (plan.timeBlocks.length === 0) {
          return buildTextResponse('No plan set for today yet.');
        }
        const lines = plan.timeBlocks.map((b) => {
          const time =
            b.startTime.length > 0 && b.endTime.length > 0
              ? `${b.startTime}-${b.endTime}`
              : 'unscheduled';
          return `- [${time}] ${b.label} (${b.type})`;
        });
        return buildActionResponse(
          `Today's plan (${String(plan.timeBlocks.length)} blocks):\n${lines.join('\n')}`,
          intent,
          'planner_today',
        );
      }
      case 'weekly': {
        const mondayDate = new Date().toISOString().slice(0, 10);
        const review = deps.plannerService.getWeek(mondayDate);
        const { summary } = review;
        const lines = [
          `Week of ${review.weekStartDate} to ${review.weekEndDate}:`,
          `- Goals set: ${String(summary.totalGoalsSet)}, completed: ${String(summary.totalGoalsCompleted)}`,
          `- Time blocks: ${String(summary.totalTimeBlocks)} (${String(summary.totalHoursPlanned)}h planned)`,
        ];
        if (review.reflection !== undefined && review.reflection.length > 0) {
          lines.push(`- Reflection: ${review.reflection}`);
        }
        return buildActionResponse(lines.join('\n'), intent, 'planner_weekly');
      }
      default:
        return buildTextResponse(
          'I understood that as a planner command, but could not determine the action.',
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Planner command failed: ${message}`);
  }
}
