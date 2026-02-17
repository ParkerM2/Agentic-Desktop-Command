/**
 * Fitness executor — handles workout logging and measurement queries.
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

export function executeFitness(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.fitnessService) {
    return buildErrorResponse('Fitness service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'log': {
        return buildActionResponse(
          'Ready to log a workout. Please provide workout details (type, duration, exercises).',
          intent,
          'fitness_log',
        );
      }
      case 'query': {
        const workouts = deps.fitnessService.listWorkouts({});
        if (workouts.length === 0) {
          return buildTextResponse('No workouts logged yet.');
        }
        const recent = workouts.slice(0, 5);
        const lines = recent.map((w) => `- ${w.date}: ${w.type} (${String(w.duration)} min)`);
        return buildActionResponse(
          `Recent workouts (${String(workouts.length)} total):\n${lines.join('\n')}`,
          intent,
          'fitness_query',
        );
      }
      case 'measurements': {
        const measurements = deps.fitnessService.getMeasurements(5);
        if (measurements.length === 0) {
          return buildTextResponse('No body measurements recorded yet.');
        }
        const lines = measurements.map((m) => {
          const parts: string[] = [m.date];
          if (m.weight !== undefined) parts.push(`${String(m.weight)} kg`);
          if (m.bodyFat !== undefined) parts.push(`${String(m.bodyFat)}% BF`);
          return `- ${parts.join(', ')}`;
        });
        return buildActionResponse(
          `Recent measurements:\n${lines.join('\n')}`,
          intent,
          'fitness_measurements',
        );
      }
      default:
        return buildTextResponse(
          'I understood that as a fitness command, but could not determine the action.',
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Fitness command failed: ${message}`);
  }
}
