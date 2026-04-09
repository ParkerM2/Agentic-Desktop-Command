/**
 * React Query hooks for data management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { DATA_MANAGEMENT } from '@shared/ipc/data-management/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

export const dataManagementKeys = {
  all: ['dataManagement'] as const,
  registry: () => [...dataManagementKeys.all, 'registry'] as const,
  usage: () => [...dataManagementKeys.all, 'usage'] as const,
  retention: () => [...dataManagementKeys.all, 'retention'] as const,
};

/** Fetch data store registry */
export function useDataRegistry() {
  return useQuery({
    queryKey: dataManagementKeys.registry(),
    queryFn: () => ipc(DATA_MANAGEMENT.GET.REGISTRY, {}),
    staleTime: 60_000,
  });
}

/** Fetch data store usage statistics */
export function useDataUsage() {
  return useQuery({
    queryKey: dataManagementKeys.usage(),
    queryFn: () => ipc(DATA_MANAGEMENT.GET.USAGE, {}),
    staleTime: 30_000,
  });
}

/** Fetch retention settings */
export function useDataRetention() {
  return useQuery({
    queryKey: dataManagementKeys.retention(),
    queryFn: () => ipc(DATA_MANAGEMENT.GET.RETENTION, {}),
    staleTime: 60_000,
  });
}

/** Update retention settings */
export function useUpdateRetention() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (updates: {
      autoCleanupEnabled?: boolean;
      cleanupIntervalHours?: number;
      overrides?: Record<string, { maxAgeDays?: number; maxItems?: number; enabled: boolean }>;
      lastCleanupAt?: string;
    }) => ipc(DATA_MANAGEMENT.UPDATE.RETENTION, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(dataManagementKeys.retention(), data);
    },
    onError: onError('update retention settings'),
  });
}

/** Clear a single data store */
export function useClearStore() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (storeId: string) => ipc(DATA_MANAGEMENT.CLEAR.STORE, { storeId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dataManagementKeys.usage() });
    },
    onError: onError('clear data store'),
  });
}

/** Run cleanup on all eligible stores */
export function useRunCleanup() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: () => ipc(DATA_MANAGEMENT.RUN.CLEANUP, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dataManagementKeys.usage() });
      void queryClient.invalidateQueries({ queryKey: dataManagementKeys.retention() });
    },
    onError: onError('run cleanup'),
  });
}

/** Export all data to archive */
export function useExportData() {
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: () => ipc(DATA_MANAGEMENT.EXPORT.DATA, {}),
    onError: onError('export data'),
  });
}

/** Import data from archive */
export function useImportData() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (filePath: string) => ipc(DATA_MANAGEMENT.IMPORT.DATA, { filePath }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dataManagementKeys.all });
    },
    onError: onError('import data'),
  });
}
