/**
 * Planner IPC handlers
 */

import type { PlannerService } from '../../services/planner/planner-service';
import type { IpcRouter } from '../router';

export function registerPlannerHandlers(router: IpcRouter, service: PlannerService): void {
  router.handle('planner.getDay', ({ date }) => Promise.resolve(service.getDay(date)));

  router.handle('planner.updateDay', ({ date, ...updates }) =>
    Promise.resolve(service.updateDay(date, updates)),
  );

  router.handle('planner.addTimeBlock', ({ date, timeBlock }) =>
    Promise.resolve(service.addTimeBlock(date, timeBlock)),
  );

  router.handle('planner.updateTimeBlock', ({ date, blockId, updates }) =>
    Promise.resolve(service.updateTimeBlock(date, blockId, updates)),
  );

  router.handle('planner.removeTimeBlock', ({ date, blockId }) =>
    Promise.resolve(service.removeTimeBlock(date, blockId)),
  );

  router.handle('planner.getWeek', ({ startDate }) => Promise.resolve(service.getWeek(startDate)));

  router.handle('planner.generateWeeklyReview', ({ startDate }) =>
    Promise.resolve(service.generateWeeklyReview(startDate)),
  );

  router.handle('planner.updateWeeklyReflection', ({ startDate, reflection }) =>
    Promise.resolve(service.updateWeeklyReflection(startDate, reflection)),
  );
}
