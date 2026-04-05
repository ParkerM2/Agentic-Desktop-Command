/**
 * Unit Tests for CalendarService
 *
 * Tests listEvents, createEvent, deleteEvent — all delegate to calendar client
 * after resolving OAuth token via OAuthManager.
 */

import { describe, expect, it, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────

const mockListEvents = vi.fn();
const mockCreateEvent = vi.fn();
const mockDeleteEvent = vi.fn();

vi.mock('@main/mcp-servers/calendar/calendar-client', () => ({
  createCalendarClient: vi.fn(() => ({
    listEvents: mockListEvents,
    createEvent: mockCreateEvent,
    deleteEvent: mockDeleteEvent,
  })),
}));

const { createCalendarService } = await import(
  '@main/services/calendar/calendar-service'
);

// ── Helpers ───────────────────────────────────────────────────

function makeMockOAuthManager() {
  return {
    getAccessToken: vi.fn().mockResolvedValue('mock-token-123'),
    refreshToken: vi.fn(),
    revokeToken: vi.fn(),
    hasToken: vi.fn(),
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('CalendarService', () => {
  describe('listEvents()', () => {
    it('maps raw API events to the IPC contract shape', async () => {
      const oauthManager = makeMockOAuthManager();
      const service = createCalendarService({ oauthManager: oauthManager as never });

      mockListEvents.mockResolvedValue([
        {
          id: 'evt-1',
          summary: 'Team Standup',
          start: { dateTime: '2026-04-05T09:00:00Z' },
          end: { dateTime: '2026-04-05T09:30:00Z' },
          location: 'Room A',
          status: 'confirmed',
          attendees: [{ email: 'a@b.com' }, { email: 'c@d.com' }],
        },
      ]);

      const result = await service.listEvents({
        timeMin: '2026-04-05T00:00:00Z',
        timeMax: '2026-04-06T00:00:00Z',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'evt-1',
        summary: 'Team Standup',
        start: '2026-04-05T09:00:00Z',
        end: '2026-04-05T09:30:00Z',
        location: 'Room A',
        status: 'confirmed',
        attendees: 2,
      });
    });

    it('uses date fallback when dateTime is missing', async () => {
      const oauthManager = makeMockOAuthManager();
      const service = createCalendarService({ oauthManager: oauthManager as never });

      mockListEvents.mockResolvedValue([
        {
          id: 'evt-2',
          summary: 'All Day Event',
          start: { date: '2026-04-05' },
          end: { date: '2026-04-06' },
          location: undefined,
          status: 'confirmed',
          attendees: undefined,
        },
      ]);

      const result = await service.listEvents({
        timeMin: '2026-04-05T00:00:00Z',
        timeMax: '2026-04-06T00:00:00Z',
      });

      expect(result[0]?.start).toBe('2026-04-05');
      expect(result[0]?.end).toBe('2026-04-06');
      expect(result[0]?.attendees).toBe(0);
    });

    it('returns empty array when no events', async () => {
      const oauthManager = makeMockOAuthManager();
      const service = createCalendarService({ oauthManager: oauthManager as never });

      mockListEvents.mockResolvedValue([]);

      const result = await service.listEvents({
        timeMin: '2026-04-05T00:00:00Z',
        timeMax: '2026-04-06T00:00:00Z',
      });

      expect(result).toEqual([]);
    });
  });

  describe('createEvent()', () => {
    it('maps the created event to the IPC contract shape', async () => {
      const oauthManager = makeMockOAuthManager();
      const service = createCalendarService({ oauthManager: oauthManager as never });

      mockCreateEvent.mockResolvedValue({
        id: 'new-evt',
        summary: 'New Meeting',
        start: { dateTime: '2026-04-05T14:00:00Z' },
        end: { dateTime: '2026-04-05T15:00:00Z' },
        htmlLink: 'https://calendar.google.com/event?eid=abc',
      });

      const result = await service.createEvent({
        summary: 'New Meeting',
        startDateTime: '2026-04-05T14:00:00Z',
        endDateTime: '2026-04-05T15:00:00Z',
      });

      expect(result).toEqual({
        id: 'new-evt',
        summary: 'New Meeting',
        start: '2026-04-05T14:00:00Z',
        end: '2026-04-05T15:00:00Z',
        htmlLink: 'https://calendar.google.com/event?eid=abc',
      });
    });
  });

  describe('deleteEvent()', () => {
    it('delegates to the calendar client', async () => {
      const oauthManager = makeMockOAuthManager();
      const service = createCalendarService({ oauthManager: oauthManager as never });

      mockDeleteEvent.mockResolvedValue({ success: true });

      const result = await service.deleteEvent({ eventId: 'evt-1' });

      expect(result).toEqual({ success: true });
      expect(mockDeleteEvent).toHaveBeenCalledWith({ eventId: 'evt-1' });
    });
  });
});
