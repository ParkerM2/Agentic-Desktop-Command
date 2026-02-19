/**
 * Google Calendar API Client
 *
 * Wraps the Google Calendar REST API v3 using native fetch.
 * Handles rate limiting with exponential backoff.
 * Consumes tokens from the OAuth token store.
 */

import { mcpLogger } from '@main/lib/logger';

import type {
  CalendarEvent,
  CalendarEventListResponse,
  CalendarListEntry,
  CalendarListResponse,
  FreeBusyResponse,
} from './types';

// ── Types ────────────────────────────────────────────────────

export interface CalendarClient {
  /** List events within a time range */
  listEvents: (params: {
    calendarId?: string;
    timeMin: string;
    timeMax: string;
    maxResults?: number;
  }) => Promise<CalendarEvent[]>;

  /** Create a new calendar event */
  createEvent: (params: {
    calendarId?: string;
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone?: string;
    attendees?: string[];
  }) => Promise<CalendarEvent>;

  /** Update an existing calendar event */
  updateEvent: (params: {
    calendarId?: string;
    eventId: string;
    summary?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
  }) => Promise<CalendarEvent>;

  /** Delete a calendar event */
  deleteEvent: (params: { calendarId?: string; eventId: string }) => Promise<{ success: boolean }>;

  /** Get free/busy information for calendars */
  getFreeBusy: (params: {
    timeMin: string;
    timeMax: string;
    calendarIds?: string[];
  }) => Promise<FreeBusyResponse>;

  /** List the user's calendars */
  listCalendars: () => Promise<CalendarListEntry[]>;
}

// ── Constants ────────────────────────────────────────────────

const BASE_URL = 'https://www.googleapis.com/calendar/v3';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const DEFAULT_CALENDAR = 'primary';

// ── Helpers ──────────────────────────────────────────────────

class CalendarApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'CalendarApiError';
  }
}

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429 || response.status === 403) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : INITIAL_BACKOFF_MS * 2 ** attempt;

      mcpLogger.warn(
        `[CalendarClient] Rate limited (${String(response.status)}), retrying in ${String(waitMs)}ms`,
      );
      await sleep(waitMs);
      continue;
    }

    // 204 No Content is a successful response for delete
    if (response.status === 204) {
      return response;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new CalendarApiError(
        response.status,
        `Google Calendar API error ${String(response.status)}: ${body}`,
      );
    }

    return response;
  }

  throw lastError ?? new CalendarApiError(429, 'Max retries exceeded due to rate limiting');
}

// ── Factory ──────────────────────────────────────────────────

export function createCalendarClient(token: string): CalendarClient {
  const headers = buildHeaders(token);

  async function get<T>(path: string): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });
    return await (response.json() as Promise<T>);
  }

  async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return await (response.json() as Promise<T>);
  }

  async function patch<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    return await (response.json() as Promise<T>);
  }

  async function del(path: string): Promise<void> {
    await fetchWithRetry(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers,
    });
  }

  return {
    async listEvents({ calendarId = DEFAULT_CALENDAR, timeMin, timeMax, maxResults = 50 }) {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        maxResults: String(maxResults),
        singleEvents: 'true',
        orderBy: 'startTime',
      });
      const result = await get<CalendarEventListResponse>(
        `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      );
      return result.items;
    },

    async createEvent({
      calendarId = DEFAULT_CALENDAR,
      summary,
      description,
      location,
      startDateTime,
      endDateTime,
      timeZone,
      attendees,
    }) {
      const body: Record<string, unknown> = {
        summary,
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
      };
      if (description) {
        body.description = description;
      }
      if (location) {
        body.location = location;
      }
      if (attendees && attendees.length > 0) {
        body.attendees = attendees.map((email) => ({ email }));
      }
      return await post<CalendarEvent>(`/calendars/${encodeURIComponent(calendarId)}/events`, body);
    },

    async updateEvent({
      calendarId = DEFAULT_CALENDAR,
      eventId,
      summary,
      description,
      location,
      startDateTime,
      endDateTime,
      timeZone,
    }) {
      const body: Record<string, unknown> = {};
      if (summary !== undefined) {
        body.summary = summary;
      }
      if (description !== undefined) {
        body.description = description;
      }
      if (location !== undefined) {
        body.location = location;
      }
      if (startDateTime) {
        body.start = { dateTime: startDateTime, timeZone };
      }
      if (endDateTime) {
        body.end = { dateTime: endDateTime, timeZone };
      }
      return await patch<CalendarEvent>(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        body,
      );
    },

    async deleteEvent({ calendarId = DEFAULT_CALENDAR, eventId }) {
      await del(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      );
      return { success: true };
    },

    async getFreeBusy({ timeMin, timeMax, calendarIds }) {
      const items = (calendarIds ?? [DEFAULT_CALENDAR]).map((id) => ({ id }));
      return await post<FreeBusyResponse>('/freeBusy', {
        timeMin,
        timeMax,
        items,
      });
    },

    async listCalendars() {
      const result = await get<CalendarListResponse>('/users/me/calendarList');
      return result.items;
    },
  };
}
