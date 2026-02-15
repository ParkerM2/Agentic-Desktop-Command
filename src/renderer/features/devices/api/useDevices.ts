/**
 * React Query hooks for device operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { InvokeInput } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

import { deviceKeys } from './queryKeys';

/** Fetch all registered devices */
export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: () => ipc('devices.list', {}),
    staleTime: 30_000,
  });
}

/** Register a new device */
export function useRegisterDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InvokeInput<'devices.register'>) =>
      ipc('devices.register', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}

/** Update an existing device */
export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InvokeInput<'devices.update'>) =>
      ipc('devices.update', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}
