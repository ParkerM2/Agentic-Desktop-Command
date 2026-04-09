/**
 * Fitness IPC event listeners -> query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { FITNESS_EVENTS } from '@shared/ipc/fitness/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { fitnessKeys } from '../api/queryKeys';

export function useFitnessEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(FITNESS_EVENTS.WORKOUT.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: fitnessKeys.workouts() });
    void queryClient.invalidateQueries({ queryKey: fitnessKeys.stats() });
  });

  useIpcEvent(FITNESS_EVENTS.MEASUREMENT.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: fitnessKeys.measurements() });
  });

  useIpcEvent(FITNESS_EVENTS.GOAL.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: fitnessKeys.goals() });
  });
}
