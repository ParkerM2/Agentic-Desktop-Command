/**
 * React Query hooks for progress pipeline tasks (reads)
 *
 * Routes through local progress IPC channels. Replaces the
 * Zustand-based reads in progress-context-store.ts.
 */

import { useQuery } from '@tanstack/react-query';

import { PROGRESS } from '@shared/ipc/progress/channels';
import type { ProgressTask } from '@shared/types/progress';

import { ipc } from '@renderer/shared/lib/ipc';

import { progressKeys } from './progressKeys';

/** Fetch non-archived progress tasks, optionally scoped to a project */
export function useProgressTasks(projectId?: string) {
  return useQuery({
    queryKey: progressKeys.list(projectId),
    queryFn: async () => {
      const result = await ipc(PROGRESS.LIST.TASKS, { projectId });
      return result as ProgressTask[];
    },
    staleTime: 30_000,
  });
}

/** Fetch a single progress task by slug */
export function useProgressTask(slug: string | null) {
  return useQuery({
    queryKey: progressKeys.detail(slug ?? ''),
    queryFn: async () => {
      const result = await ipc(PROGRESS.GET.TASK, { slug: slug ?? '' });
      return result as ProgressTask | null;
    },
    enabled: slug !== null,
    staleTime: 10_000,
  });
}

/** Fetch all archived progress tasks */
export function useArchivedProgressTasks() {
  return useQuery({
    queryKey: progressKeys.archived(),
    queryFn: async () => {
      const result = await ipc(PROGRESS.LIST.ARCHIVED, {});
      return result as ProgressTask[];
    },
    staleTime: 60_000,
  });
}
