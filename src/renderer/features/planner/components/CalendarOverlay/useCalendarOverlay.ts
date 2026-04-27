/**
 * useCalendarOverlay — logic for CalendarOverlay
 */

import { useMemo } from 'react';

import { useCalendarEvents } from '@features/productivity';

export function useCalendarOverlay(date: string) {
  const { timeMin, timeMax } = useMemo(() => {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);
    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    };
  }, [date]);

  const { data: events, isLoading } = useCalendarEvents(timeMin, timeMax);

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

  return {
    isLoading,
    sortedEvents,
  };
}
