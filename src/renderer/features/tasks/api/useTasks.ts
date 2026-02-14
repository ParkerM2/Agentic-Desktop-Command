/**
 * React Query hooks for task operations
 *
 * Routes through Hub API channels for multi-device sync.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { Task } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from './queryKeys';

/** Fetch all tasks for a project via Hub */
export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: taskKeys.list(projectId ?? ''),
    queryFn: async () => {
      const result = await ipc('hub.tasks.list', { projectId: projectId ?? '' });
      return result.tasks as Task[];
    },
    enabled: projectId !== null,
    staleTime: 30_000,
  });
}

/** Fetch a single task via Hub */
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(taskId ?? ''),
    queryFn: async () => {
      const result = await ipc('hub.tasks.get', { taskId: taskId ?? '' });
      return result as Task;
    },
    enabled: taskId !== null,
    staleTime: 10_000,
  });
}

/** Fetch all tasks across all projects via Hub */
export function useAllTasks() {
  return useQuery({
    queryKey: taskKeys.lists(),
    queryFn: async () => {
      const result = await ipc('hub.tasks.list', {});
      return result.tasks as Task[];
    },
    staleTime: 30_000,
  });
}

/** Create a new task via Hub */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: string; title: string; description?: string }) =>
      ipc('hub.tasks.create', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
