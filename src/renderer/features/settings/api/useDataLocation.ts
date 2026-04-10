/**
 * React Query hooks for data directory location management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { SETTINGS } from '@shared/ipc/settings/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { settingsKeys } from './useSettings';

export const dataLocationKeys = {
  all: [...settingsKeys.all, 'dataLocation'] as const,
  current: () => [...dataLocationKeys.all, 'current'] as const,
};

/** Fetch current data directory info */
export function useDataLocation() {
  return useQuery({
    queryKey: dataLocationKeys.current(),
    queryFn: () => ipc(SETTINGS.GET['DATA-DIR'], {}),
  });
}

/** Validate a candidate data directory path */
export function useValidateDataDir() {
  return useMutation({
    mutationFn: (path: string) => ipc(SETTINGS.VALIDATE['DATA-DIR'], { path }),
  });
}

/** Set a new data directory (returns validation results) */
export function useSetDataDir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => ipc(SETTINGS.SET['DATA-DIR'], { path }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dataLocationKeys.all });
    },
  });
}

/** Confirm and lock in a data directory change (requires restart) */
export function useConfirmDataDir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { path: string; useExisting?: boolean }) =>
      ipc(SETTINGS.CONFIRM['DATA-DIR'], input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dataLocationKeys.all });
    },
  });
}

/** Reset data directory to default location */
export function useResetDataDir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ipc(SETTINGS.RESET['DATA-DIR'], {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dataLocationKeys.all });
    },
  });
}
