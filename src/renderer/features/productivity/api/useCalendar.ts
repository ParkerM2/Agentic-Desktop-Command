/**
 * React Query hooks for Google Calendar integration
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CALENDAR } from '@shared/ipc/calendar';

import { ipc } from '@renderer/shared/lib/ipc';

import { calendarKeys } from './queryKeys';

/** Fetch calendar events for a time range. */
export function useCalendarEvents(timeMin: string, timeMax: string) {
  return useQuery({
    queryKey: calendarKeys.events(timeMin, timeMax),
    queryFn: () => ipc(CALENDAR.LIST.EVENTS, { timeMin, timeMax }),
    enabled: timeMin.length > 0 && timeMax.length > 0,
  });
}

/** Create a new calendar event. */
export function useCalendarCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      summary: string;
      startDateTime: string;
      endDateTime: string;
      description?: string;
      location?: string;
      timeZone?: string;
      attendees?: string[];
    }) => ipc(CALENDAR.CREATE.EVENT, params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

/** Delete a calendar event. */
export function useCalendarDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { eventId: string; calendarId?: string }) =>
      ipc(CALENDAR.DELETE.EVENT, params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}
