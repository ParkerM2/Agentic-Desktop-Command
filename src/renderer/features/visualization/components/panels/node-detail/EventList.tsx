/**
 * EventList — shared event timeline component for agent/guardian nodes.
 */

import { ScrollArea, Skeleton } from '@ui';

import type { TrackingEvent } from './types';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface EventListProps {
  agentName: string;
  events: TrackingEvent[];
  loading: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EventList({ agentName, events, loading }: EventListProps) {
  const filtered = events.filter((e) => e.agent === agentName || e.agent === null);

  if (loading) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground">No events recorded</p>;
  }

  return (
    <ScrollArea className="h-48 rounded border border-border">
      <div className="space-y-1 p-2">
        {filtered.map((event, idx) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`${event.ts}-${idx}`}
            className="flex items-start gap-2 text-xs"
          >
            <span className="shrink-0 text-muted-foreground">
              {new Date(event.ts).toLocaleTimeString()}
            </span>
            <span className="break-all text-foreground/80">{event.type}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
