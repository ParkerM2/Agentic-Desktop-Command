/**
 * React Query hooks for My Work feature
 */

import { useQuery } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { myWorkKeys } from './queryKeys';

/** Fetch all tasks across all projects */
export function useAllTasks() {
  return useQuery({
    queryKey: myWorkKeys.tasks(),
    queryFn: () => ipc('tasks.listAll', {}),
    staleTime: 30_000,
  });
}
