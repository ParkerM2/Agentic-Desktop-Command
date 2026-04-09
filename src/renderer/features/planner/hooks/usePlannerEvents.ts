/**
 * Planner IPC event listeners -> query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { PLANNER_EVENTS } from '@shared/ipc/planner/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { plannerKeys } from '../api/queryKeys';

export function usePlannerEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(PLANNER_EVENTS.DAY.CHANGED, ({ date }) => {
    void queryClient.invalidateQueries({ queryKey: plannerKeys.day(date) });
  });
}
