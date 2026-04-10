/**
 * Calendar Integration — re-export from calendar service and handlers.
 *
 * Service wraps the Calendar client with OAuth token management.
 * Maps raw API responses to the IPC contract shapes.
 */

import { CALENDAR } from '@shared/ipc/misc/calendar.channels';

import { createCalendarClient } from '../../mcp-servers/calendar/calendar-client';

import type { OAuthManager } from '../../auth/oauth-manager';
import type { IpcRouter } from '../../ipc/router';

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

// ── Handlers ──────────────────────────────────────────────────

export function registerCalendarHandlers(router: IpcRouter, service: CalendarService): void {
  router.handle(CALENDAR.LIST.EVENTS, async (params) => {
    return await service.listEvents(params);
  });

  router.handle(CALENDAR.CREATE.EVENT, async (params) => {
    return await service.createEvent(params);
  });

  router.handle(CALENDAR.DELETE.EVENT, async (params) => {
    return await service.deleteEvent(params);
  });
}
