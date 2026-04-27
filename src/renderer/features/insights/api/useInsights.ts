/**
 * React Query hooks for insights
 */

import { useQuery } from '@tanstack/react-query';

import { INSIGHTS } from '@shared/ipc/insights';

import { ipc } from '@renderer/shared/lib/ipc';

import { insightKeys } from './queryKeys';

/** Fetch aggregate metrics */
export function useInsightMetrics(projectId?: string) {
  return useQuery({
    queryKey: insightKeys.metrics(projectId),
    queryFn: () => ipc(INSIGHTS.GET.METRICS, { projectId }),
  });
}

/** Fetch time-series data */
export function useInsightTimeSeries(projectId?: string, days?: number) {
  return useQuery({
    queryKey: insightKeys.timeSeries(projectId, days),
    queryFn: () => ipc(INSIGHTS.GET['TIME-SERIES'], { projectId, days }),
  });
}

/** Fetch task distribution by status */
export function useTaskDistribution(projectId?: string) {
  return useQuery({
    queryKey: insightKeys.distribution(projectId),
    queryFn: () => ipc(INSIGHTS.GET['TASK-DISTRIBUTION'], { projectId }),
  });
}

/** Fetch per-project breakdown */
export function useProjectBreakdown() {
  return useQuery({
    queryKey: insightKeys.projectBreakdown(),
    queryFn: () => ipc(INSIGHTS.GET['PROJECT-BREAKDOWN'], {}),
  });
}
