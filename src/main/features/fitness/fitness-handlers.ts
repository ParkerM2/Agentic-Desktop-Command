/**
 * Fitness IPC handlers
 */

import { FITNESS } from '@shared/ipc/fitness/channels';

import type { FitnessService } from "./fitness-service";
import type { IpcRouter } from '../../ipc/router';

export function registerFitnessHandlers(router: IpcRouter, service: FitnessService): void {
  router.handle(FITNESS.LOG.WORKOUT, (data) => Promise.resolve(service.logWorkout(data)));

  router.handle(FITNESS.LIST.WORKOUTS, (filters) =>
    Promise.resolve(service.listWorkouts(filters)),
  );

  router.handle(FITNESS.DELETE.WORKOUT, ({ id }) => Promise.resolve(service.deleteWorkout(id)));

  router.handle(FITNESS.LOG.MEASUREMENT, (data) => Promise.resolve(service.logMeasurement(data)));

  router.handle(FITNESS.GET.MEASUREMENTS, ({ limit }) =>
    Promise.resolve(service.getMeasurements(limit)),
  );

  router.handle(FITNESS.GET.STATS, () => Promise.resolve(service.getStats()));

  router.handle(FITNESS.SET.GOAL, (data) => Promise.resolve(service.setGoal(data)));

  router.handle(FITNESS.LIST.GOALS, () => Promise.resolve(service.listGoals()));

  router.handle(FITNESS.UPDATE['GOAL-PROGRESS'], ({ goalId, current }) =>
    Promise.resolve(service.updateGoalProgress(goalId, current)),
  );

  router.handle(FITNESS.DELETE.GOAL, ({ id }) => Promise.resolve(service.deleteGoal(id)));
}
