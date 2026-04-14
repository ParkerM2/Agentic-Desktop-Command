/**
 * CalendarOverlay — Shows Google Calendar events in the planner
 *
 * Displays calendar events as read-only blocks with a distinct visual style
 * (translucent, different border) to distinguish from user-created time blocks.
 */

import { useMemo } from 'react';

import { Calendar, Clock, MapPin, Users } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useCalendarEvents } from '@features/productivity';

// ── Types ─────────────────────────────────────────────────────

interface CalendarOverlayProps {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Whether to show the calendar overlay */
  visible: boolean;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start?: string;
  end?: string;
  location?: string;
  status: string;
  attendees: number;
}

// ── Helpers ───────────────────────────────────────────────────

function getDateRange(dateStr: string): { timeMin: string; timeMax: string } {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59`);
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}

function formatTime(dateString: string | undefined): string {
  if (!dateString) {
    return 'All day';
  }
  try {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
}

function isCurrentEvent(start: string | undefined, end: string | undefined): boolean {
  if (!start || !end) {
    return false;
  }
  const now = Date.now();
  return now >= new Date(start).getTime() && now <= new Date(end).getTime();
}

function getEventTimeDisplay(event: CalendarEvent): string {
  if (!event.start) {
    return 'All day';
  }
  const startTime = formatTime(event.start);
  const endTime = event.end ? formatTime(event.end) : '';
  return endTime ? `${startTime} - ${endTime}` : startTime;
}

// ── Component ─────────────────────────────────────────────────

export function CalendarOverlay({ date, visible }: CalendarOverlayProps) {
  const { timeMin, timeMax } = useMemo(() => getDateRange(date), [date]);
  const { data: events, isLoading } = useCalendarEvents(timeMin, timeMax);

  // Sort events by start time (must be before any conditional returns)
  const sortedEvents = useMemo(() => {
    if (!events || events.length === 0) {
      return [];
    }
    return [...events].sort((a, b) => {
      if (!a.start) return -1;
      if (!b.start) return 1;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  }, [events]);

  if (!visible) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="text-info h-4 w-4" />
          <span className="text-muted-foreground text-xs">Loading calendar...</span>
        </div>
      </div>
    );
  }

  if (sortedEvents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Calendar className="text-info h-4 w-4" />
        <span className="text-muted-foreground text-xs font-medium">
          Calendar Events ({String(sortedEvents.length)})
        </span>
      </div>
      <div className="space-y-1.5">
        {sortedEvents.map((event) => {
          const isCurrent = isCurrentEvent(event.start, event.end);
          return (
            <div
              key={event.id}
              className={cn(
                'rounded-md border-l-2 px-3 py-2 transition-colors',
                'border-info/60 bg-info/8',
                'border border-l-2 border-dashed',
                isCurrent && 'border-info bg-info/15 border-solid',
              )}
              style={{
                borderLeftStyle: 'solid',
              }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">{event.summary}</p>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getEventTimeDisplay(event)}
                    </span>
                    {event.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">{event.location}</span>
                      </span>
                    ) : null}
                    {event.attendees > 0 ? (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {String(event.attendees)}
                      </span>
                    ) : null}
                  </div>
                </div>
                {isCurrent ? (
                  <span className="bg-info/20 text-info-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
                    Now
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
