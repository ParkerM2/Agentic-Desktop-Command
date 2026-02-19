/**
 * Calendar MCP Tool Definitions
 *
 * Defines the tools that the assistant can invoke to interact
 * with Google Calendar. Each tool maps to a CalendarClient method.
 */

import { mcpLogger } from '@main/lib/logger';

import type { CalendarClient } from './calendar-client';
import type { McpToolDefinition, McpToolResult } from '../../mcp/types';

// ── Constants ────────────────────────────────────────────────

const CALENDAR_ID_DESC = 'Calendar ID (default: primary)';
const DATETIME_DESC = 'RFC 3339 datetime (e.g. 2026-02-12T10:00:00-05:00)';

// ── Tool Definitions ─────────────────────────────────────────

export const CALENDAR_TOOLS: McpToolDefinition[] = [
  {
    name: 'calendar_list_events',
    description: 'List calendar events within a time range',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: CALENDAR_ID_DESC },
        timeMin: { type: 'string', description: `Start of range — ${DATETIME_DESC}` },
        timeMax: { type: 'string', description: `End of range — ${DATETIME_DESC}` },
        maxResults: { type: 'number', description: 'Maximum events to return (default: 50)' },
      },
      required: ['timeMin', 'timeMax'],
    },
  },
  {
    name: 'calendar_create_event',
    description: 'Create a new calendar event',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: CALENDAR_ID_DESC },
        summary: { type: 'string', description: 'Event title' },
        description: { type: 'string', description: 'Event description' },
        location: { type: 'string', description: 'Event location' },
        startDateTime: { type: 'string', description: DATETIME_DESC },
        endDateTime: { type: 'string', description: DATETIME_DESC },
        timeZone: { type: 'string', description: 'IANA time zone (e.g. America/New_York)' },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses of attendees',
        },
      },
      required: ['summary', 'startDateTime', 'endDateTime'],
    },
  },
  {
    name: 'calendar_update_event',
    description: 'Update an existing calendar event',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: CALENDAR_ID_DESC },
        eventId: { type: 'string', description: 'ID of the event to update' },
        summary: { type: 'string', description: 'New event title' },
        description: { type: 'string', description: 'New event description' },
        location: { type: 'string', description: 'New event location' },
        startDateTime: { type: 'string', description: DATETIME_DESC },
        endDateTime: { type: 'string', description: DATETIME_DESC },
        timeZone: { type: 'string', description: 'IANA time zone' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'calendar_delete_event',
    description: 'Delete a calendar event',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: CALENDAR_ID_DESC },
        eventId: { type: 'string', description: 'ID of the event to delete' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'calendar_get_free_busy',
    description: 'Get free/busy information for calendars within a time range',
    inputSchema: {
      type: 'object',
      properties: {
        timeMin: { type: 'string', description: DATETIME_DESC },
        timeMax: { type: 'string', description: DATETIME_DESC },
        calendarIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Calendar IDs to check (default: primary)',
        },
      },
      required: ['timeMin', 'timeMax'],
    },
  },
];

// ── Tool Executor ────────────────────────────────────────────

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function successResult(data: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    isError: false,
  };
}

function errorResult(message: string): McpToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

/** Extract an optional string from args. */
function optStr(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Extract a calendarId from args (optional string). */
function calId(args: Record<string, unknown>): string | undefined {
  return optStr(args.calendarId);
}

async function execListEvents(
  client: CalendarClient,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const events = await client.listEvents({
    calendarId: calId(args),
    timeMin: str(args.timeMin),
    timeMax: str(args.timeMax),
    maxResults: num(args.maxResults),
  });
  return successResult(
    events.map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start.dateTime ?? e.start.date,
      end: e.end.dateTime ?? e.end.date,
      location: e.location,
      status: e.status,
      attendees: e.attendees?.length ?? 0,
    })),
  );
}

async function execCreateEvent(
  client: CalendarClient,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const event = await client.createEvent({
    calendarId: calId(args),
    summary: str(args.summary),
    description: optStr(args.description),
    location: optStr(args.location),
    startDateTime: str(args.startDateTime),
    endDateTime: str(args.endDateTime),
    timeZone: optStr(args.timeZone),
    attendees: Array.isArray(args.attendees) ? (args.attendees as string[]) : undefined,
  });
  return successResult({
    id: event.id,
    summary: event.summary,
    start: event.start.dateTime ?? event.start.date,
    end: event.end.dateTime ?? event.end.date,
    htmlLink: event.htmlLink,
  });
}

async function execUpdateEvent(
  client: CalendarClient,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const event = await client.updateEvent({
    calendarId: calId(args),
    eventId: str(args.eventId),
    summary: optStr(args.summary),
    description: optStr(args.description),
    location: optStr(args.location),
    startDateTime: optStr(args.startDateTime),
    endDateTime: optStr(args.endDateTime),
    timeZone: optStr(args.timeZone),
  });
  return successResult({
    id: event.id,
    summary: event.summary,
    start: event.start.dateTime ?? event.start.date,
    end: event.end.dateTime ?? event.end.date,
  });
}

/**
 * Execute a Calendar tool by name with the given arguments.
 */
export async function executeCalendarTool(
  client: CalendarClient,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  try {
    switch (toolName) {
      case 'calendar_list_events':
        return await execListEvents(client, args);

      case 'calendar_create_event':
        return await execCreateEvent(client, args);

      case 'calendar_update_event':
        return await execUpdateEvent(client, args);

      case 'calendar_delete_event': {
        const result = await client.deleteEvent({
          calendarId: calId(args),
          eventId: str(args.eventId),
        });
        return successResult(result);
      }

      case 'calendar_get_free_busy': {
        const result = await client.getFreeBusy({
          timeMin: str(args.timeMin),
          timeMax: str(args.timeMax),
          calendarIds: Array.isArray(args.calendarIds) ? (args.calendarIds as string[]) : undefined,
        });
        return successResult(result);
      }

      default:
        return errorResult(`Unknown tool: ${toolName}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    mcpLogger.error(`[Calendar] Tool "${toolName}" failed: ${message}`);
    return errorResult(`Google Calendar API error: ${message}`);
  }
}
