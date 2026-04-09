/**
 * Planner IPC handlers
 */

import { PLANNER } from '@shared/ipc/planner/channels';

import type { PlannerService } from "./planner-service";
import type { IpcRouter } from '../../ipc/router';

export function registerPlannerHandlers(router: IpcRouter, service: PlannerService): void {
  router.handle(PLANNER.GET.DAY, ({ date }) => Promise.resolve(service.getDay(date)));

  router.handle(PLANNER.UPDATE.DAY, ({ date, ...updates }) =>
    Promise.resolve(service.updateDay(date, updates)),
  );

  router.handle(PLANNER.ADD['TIME-BLOCK'], ({ date, timeBlock }) =>
    Promise.resolve(service.addTimeBlock(date, timeBlock)),
  );

  router.handle(PLANNER.MODIFY['TIME-BLOCK'], ({ date, blockId, updates }) =>
    Promise.resolve(service.updateTimeBlock(date, blockId, updates)),
  );

  router.handle(PLANNER.REMOVE['TIME-BLOCK'], ({ date, blockId }) =>
    Promise.resolve(service.removeTimeBlock(date, blockId)),
  );

  router.handle(PLANNER.GET.WEEK, ({ startDate }) => Promise.resolve(service.getWeek(startDate)));

  router.handle(PLANNER.GENERATE['WEEKLY-REVIEW'], ({ startDate }) =>
    Promise.resolve(service.generateWeeklyReview(startDate)),
  );

  router.handle(PLANNER.UPDATE['WEEKLY-REFLECTION'], ({ startDate, reflection }) =>
    Promise.resolve(service.updateWeeklyReflection(startDate, reflection)),
  );
}
