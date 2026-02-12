/**
 * React Query hooks for task operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { TaskDraft } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from './queryKeys';

/** Fetch all tasks for a project */
export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: taskKeys.list(projectId ?? ''),
    queryFn: () => ipc('tasks.list', { projectId: projectId ?? '' }),
    enabled: projectId !== null,
    staleTime: 30_000,
  });
}

/** Fetch a single task */
export function useTask(projectId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(taskId ?? ''),
    queryFn: () => ipc('tasks.get', { projectId: projectId ?? '', taskId: taskId ?? '' }),
    enabled: projectId !== null && taskId !== null,
    staleTime: 10_000,
  });
}

/** Create a new task */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: TaskDraft) => ipc('tasks.create', draft),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(variables.projectId) });
    },
  });
}
