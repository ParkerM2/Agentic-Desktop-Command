/**
 * Calendar Service — Wraps the Calendar client with OAuth token management.
 *
 * Gets tokens from the OAuthManager before each call.
 * Maps raw API responses to the IPC contract shapes.
 */

import { createCalendarClient } from '../../mcp-servers/calendar/calendar-client';

import type { OAuthManager } from '../../auth/oauth-manager';

// ── Interface ─────────────────────────────────────────────────

export interface CalendarService {
  listEvents: (params: {
    calendarId?: string;
    timeMin: string;
    timeMax: string;
    maxResults?: number;
  }) => Promise<
    Array<{
      id: string;
      summary: string;
      start?: string;
      end?: string;
      location?: string;
      status: string;
      attendees: number;
    }>
  >;

  createEvent: (params: {
    summary: string;
    startDateTime: string;
    endDateTime: string;
    description?: string;
    location?: string;
    timeZone?: string;
    attendees?: string[];
  }) => Promise<{
    id: string;
    summary: string;
    start?: string;
    end?: string;
    htmlLink: string;
  }>;

  deleteEvent: (params: { eventId: string; calendarId?: string }) => Promise<{ success: boolean }>;
}

// ── Factory ───────────────────────────────────────────────────

const GOOGLE_PROVIDER = 'google';

export function createCalendarService(deps: { oauthManager: OAuthManager }): CalendarService {
  const { oauthManager } = deps;

  async function getClient() {
    const token = await oauthManager.getAccessToken(GOOGLE_PROVIDER);
    return createCalendarClient(token);
  }

  return {
    async listEvents(params) {
      const client = await getClient();
      const events = await client.listEvents(params);
      return events.map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start.dateTime ?? e.start.date,
        end: e.end.dateTime ?? e.end.date,
        location: e.location,
        status: e.status,
        attendees: e.attendees?.length ?? 0,
      }));
    },

    async createEvent(params) {
      const client = await getClient();
      const event = await client.createEvent(params);
      return {
        id: event.id,
        summary: event.summary,
        start: event.start.dateTime ?? event.start.date,
        end: event.end.dateTime ?? event.end.date,
        htmlLink: event.htmlLink,
      };
    },

    async deleteEvent(params) {
      const client = await getClient();
      return await client.deleteEvent(params);
    },
  };
}
