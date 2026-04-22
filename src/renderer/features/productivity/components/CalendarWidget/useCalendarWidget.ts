/**
 * useCalendarWidget — logic for CalendarWidget
 */

import { useMemo } from 'react';

import { useCalendarDeleteEvent, useCalendarEvents } from '../../api/useCalendar';

function getTodayRange(): { timeMin: string; timeMax: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000);
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}

export function useCalendarWidget() {
  const { timeMin, timeMax } = useMemo(() => getTodayRange(), []);
  const { data: events, isLoading } = useCalendarEvents(timeMin, timeMax);
  const deleteMutation = useCalendarDeleteEvent();

  return {
    events,
    isLoading,
    deleteMutation,
  };
}
