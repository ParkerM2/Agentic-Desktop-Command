/**
 * CalendarWidget — Today's schedule from Google Calendar
 */

import { useMemo } from 'react';

import { Calendar, Clock, MapPin, Trash2 } from 'lucide-react';

import { IntegrationRequired } from '@renderer/shared/components/IntegrationRequired';

import { useCalendarDeleteEvent, useCalendarEvents } from '../api/useCalendar';

// ── Helpers ──────────────────────────────────────────────────

function getTodayRange(): { timeMin: string; timeMax: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000);
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

// ── Component ────────────────────────────────────────────────

export function CalendarWidget() {
  const { timeMin, timeMax } = useMemo(() => getTodayRange(), []);
  const { data: events, isLoading } = useCalendarEvents(timeMin, timeMax);
  const deleteMutation = useCalendarDeleteEvent();

  return (
    <div className="bg-card border-border space-y-4 rounded-lg border p-4">
      <IntegrationRequired
        description="Sync your Google Calendar events to see today's schedule."
        provider="google"
        title="Connect Google Calendar"
      />
      <div className="flex items-center gap-2">
        <Calendar className="text-primary h-4 w-4" />
        <h3 className="text-foreground text-sm font-semibold">Today&apos;s Schedule</h3>
        <span className="text-muted-foreground text-xs">
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Loading events...</p> : null}

      {!isLoading && (!events || events.length === 0) ? (
        <p className="text-muted-foreground text-sm">No events scheduled for today</p>
      ) : null}

      {!isLoading && events && events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event) => {
            const current = isCurrentEvent(event.start, event.end);
            return (
              <div
                key={event.id}
                className={
                  current
                    ? 'border-primary bg-primary/5 rounded-md border-l-2 py-2 pr-2 pl-3'
                    : 'border-border rounded-md border-l-2 py-2 pr-2 pl-3'
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium">{event.summary}</p>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.start)}
                        {event.end ? ` - ${formatTime(event.end)}` : ''}
                      </span>
                      {event.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      ) : null}
                      {event.attendees > 0 ? (
                        <span>
                          {String(event.attendees)} attendee{event.attendees === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                    title="Delete event"
                    type="button"
                    onClick={() => {
                      deleteMutation.mutate({ eventId: event.id });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
