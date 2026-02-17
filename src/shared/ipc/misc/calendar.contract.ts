/**
 * Calendar IPC Contract
 *
 * Invoke channels for calendar event listing, creation, and deletion.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

export const calendarInvoke = {
  'calendar.listEvents': {
    input: z.object({
      calendarId: z.string().optional(),
      timeMin: z.string(),
      timeMax: z.string(),
      maxResults: z.number().optional(),
    }),
    output: z.array(
      z.object({
        id: z.string(),
        summary: z.string(),
        start: z.string().optional(),
        end: z.string().optional(),
        location: z.string().optional(),
        status: z.string(),
        attendees: z.number(),
      }),
    ),
  },
  'calendar.createEvent': {
    input: z.object({
      summary: z.string(),
      startDateTime: z.string(),
      endDateTime: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      timeZone: z.string().optional(),
      attendees: z.array(z.string()).optional(),
    }),
    output: z.object({
      id: z.string(),
      summary: z.string(),
      start: z.string().optional(),
      end: z.string().optional(),
      htmlLink: z.string(),
    }),
  },
  'calendar.deleteEvent': {
    input: z.object({ eventId: z.string(), calendarId: z.string().optional() }),
    output: SuccessResponseSchema,
  },
} as const;

export const calendarEvents = {} as const;
