/**
 * React Query hooks for health and error monitoring
 *
 * Provides query hooks for error log, error stats, and service health,
 * plus mutation hooks for clearing the error log and reporting renderer errors.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ErrorCategory, ErrorSeverity, ErrorTier } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { healthKeys } from './queryKeys';

/** Fetch the error log, optionally filtered by timestamp */
export function useErrorLog(since?: string) {
  return useQuery({
    queryKey: healthKeys.errorLog(since),
    queryFn: () => ipc('app.getErrorLog', { since }),
    staleTime: 10_000,
  });
}

/** Fetch aggregated error statistics */
export function useErrorStats() {
  return useQuery({
    queryKey: healthKeys.errorStats(),
    queryFn: () => ipc('app.getErrorStats', {}),
    staleTime: 10_000,
  });
}

/** Fetch service health status */
export function useHealthStatus() {
  return useQuery({
    queryKey: healthKeys.status(),
    queryFn: () => ipc('app.getHealthStatus', {}),
    staleTime: 15_000,
  });
}

/** Clear the error log */
export function useClearErrorLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ipc('app.clearErrorLog', {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: healthKeys.errorLog() });
      void queryClient.invalidateQueries({ queryKey: healthKeys.errorStats() });
    },
  });
}

/** Report a renderer-side error to the main process */
export function useReportError() {
  return useMutation({
    mutationFn: (input: {
      severity: ErrorSeverity;
      tier: ErrorTier;
      category: ErrorCategory;
      message: string;
      stack?: string;
      route?: string;
      routeHistory?: string[];
      projectId?: string;
    }) => ipc('app.reportRendererError', input),
  });
}
