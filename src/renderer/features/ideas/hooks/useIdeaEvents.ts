/**
 * Idea IPC event listeners -> query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { IDEAS_EVENTS } from '@shared/ipc/ideas';

import { useIpcEvent } from '@renderer/shared/hooks';

import { ideaKeys } from '../api/queryKeys';

export function useIdeaEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(IDEAS_EVENTS.IDEA.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: ideaKeys.all });
  });
}
