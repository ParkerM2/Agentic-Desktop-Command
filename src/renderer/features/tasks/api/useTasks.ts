/**
 * React Query hooks for task operations
 *
 * Routes through Hub API channels for multi-device sync.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { HUB_TASKS } from '@shared/ipc/tasks/channels';
import type { Task } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from './queryKeys';

/** Fetch all tasks for a project via Hub */
export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: taskKeys.list(projectId ?? ''),
    queryFn: async () => {
      const result = await ipc(HUB_TASKS.LIST.ALL, { projectId: projectId ?? '' });
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
      const result = await ipc(HUB_TASKS.GET.TASK, { taskId: taskId ?? '' });
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
      const result = await ipc(HUB_TASKS.LIST.ALL, {});
      return result.tasks as Task[];
    },
    staleTime: 30_000,
  });
}

/** Create a new task via Hub */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      title: string;
      description?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }) => ipc(HUB_TASKS.CREATE.TASK, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
