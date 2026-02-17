/**
 * Calendar executor — handles event queries and creation.
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

export async function executeCalendar(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  if (!deps.calendarService) {
    return buildErrorResponse('Calendar service is not available. Google Calendar OAuth required.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'query': {
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const events = await deps.calendarService.listEvents({
          timeMin: now.toISOString(),
          timeMax: endOfDay.toISOString(),
          maxResults: 10,
        });
        if (events.length === 0) {
          return buildTextResponse('No upcoming events on your calendar today.');
        }
        const lines = events.map((e) => `- ${e.summary} (${e.start ?? 'TBD'})`);
        return buildActionResponse(
          `Today's events (${String(events.length)}):\n${lines.join('\n')}`,
          intent,
          'calendar_query',
        );
      }
      case 'create':
        return buildActionResponse(
          'Ready to create a calendar event. Please provide event details (title, start time, end time).',
          intent,
          'calendar_create',
        );
      default:
        return buildTextResponse(
          'I understood that as a calendar command, but could not determine the action.',
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Calendar command failed: ${message}`);
  }
}
