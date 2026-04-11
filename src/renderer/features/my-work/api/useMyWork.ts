/**
 * React Query hooks for My Work feature
 *
 * Reads from SQLite progress_tasks via PROGRESS IPC channels.
 */

import { useQuery } from '@tanstack/react-query';

import { PROGRESS } from '@shared/ipc/progress/channels';
import type { ProgressTask } from '@shared/types/progress';

import { ipc } from '@renderer/shared/lib/ipc';

import { myWorkKeys } from './queryKeys';

/** Fetch all progress tasks via PROGRESS IPC */
export function useAllTasks() {
  return useQuery({
    queryKey: myWorkKeys.tasks(),
    queryFn: async () => {
      const result = await ipc(PROGRESS.LIST.TASKS, {});
      return result as ProgressTask[];
    },
    staleTime: 30_000,
    retry: 1,
  });
}
