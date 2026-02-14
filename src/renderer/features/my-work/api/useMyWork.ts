/**
 * React Query hooks for My Work feature
 */

import { useQuery } from '@tanstack/react-query';

import type { Task } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { myWorkKeys } from './queryKeys';

/** Fetch all tasks across all projects via Hub */
export function useAllTasks() {
  return useQuery({
    queryKey: myWorkKeys.tasks(),
    queryFn: async () => {
      const result = await ipc('hub.tasks.list', {});
      return result.tasks as Task[];
    },
    staleTime: 30_000,
  });
}
