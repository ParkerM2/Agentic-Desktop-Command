/**
 * Calendar IPC handlers
 */

import { CALENDAR } from '@shared/ipc/misc/calendar.channels';

import type { CalendarService } from '../../services/calendar/calendar-service';
import type { IpcRouter } from '../router';

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
