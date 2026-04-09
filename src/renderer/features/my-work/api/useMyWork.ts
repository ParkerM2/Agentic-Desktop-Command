/**
 * React Query hooks for My Work feature
 */

import { useQuery } from '@tanstack/react-query';

import { HUB_TASKS } from '@shared/ipc/tasks/channels';
import type { Task } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { myWorkKeys } from './queryKeys';

/** Fetch all tasks across all projects via Hub */
export function useAllTasks() {
  return useQuery({
    queryKey: myWorkKeys.tasks(),
    queryFn: async () => {
      const result = await ipc(HUB_TASKS.LIST.ALL, {});
      return result.tasks as Task[];
    },
    staleTime: 30_000,
    retry: 1,
  });
}
