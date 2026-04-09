/**
 * Milestone IPC event listeners -> query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { MILESTONES_EVENTS } from '@shared/ipc/misc/milestones.channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { milestoneKeys } from '../api/queryKeys';

export function useMilestoneEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(MILESTONES_EVENTS.MILESTONE.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: milestoneKeys.all });
  });
}
