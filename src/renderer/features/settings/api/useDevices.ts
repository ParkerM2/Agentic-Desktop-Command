/**
 * React Query hooks for device operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { DEVICES } from '@shared/ipc/devices';
import type { InvokeInput } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

import { deviceKeys } from './deviceQueryKeys';

/** Fetch all registered devices */
export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: () => ipc(DEVICES.LIST.ALL, {}),
    staleTime: 30_000,
  });
}

/** Register a new device */
export function useRegisterDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InvokeInput<typeof DEVICES.REGISTER.DEVICE>) =>
      ipc(DEVICES.REGISTER.DEVICE, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}

/** Update an existing device */
export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InvokeInput<typeof DEVICES.UPDATE.DEVICE>) =>
      ipc(DEVICES.UPDATE.DEVICE, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}
