/**
 * Task progress query hooks
 *
 * React Query hooks for fetching workflow task data via IPC.
 * Tasks refresh on a 10s stale window for dashboard display.
 */

import { useQuery } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { agentDashboardKeys } from './queryKeys';

/** Fetch all workflow tasks for a feature slug */
export function useTasksForFeature(featureSlug: string | undefined) {
  return useQuery({
    queryKey: agentDashboardKeys.tasks(featureSlug ?? ''),
    queryFn: () =>
      ipc('agent-dashboard.getTasksForFeature', {
        featureSlug: featureSlug ?? '',
      }),
    enabled: featureSlug !== undefined,
    staleTime: 10_000,
  });
}

/** Fetch a single workflow task by feature slug and task number */
export function useTask(featureSlug: string | undefined, taskNumber: number | undefined) {
  return useQuery({
    queryKey: agentDashboardKeys.task(featureSlug ?? '', taskNumber ?? 0),
    queryFn: () =>
      ipc('agent-dashboard.getTask', {
        featureSlug: featureSlug ?? '',
        taskNumber: taskNumber ?? 0,
      }),
    enabled: featureSlug !== undefined && taskNumber !== undefined,
    staleTime: 10_000,
  });
}
