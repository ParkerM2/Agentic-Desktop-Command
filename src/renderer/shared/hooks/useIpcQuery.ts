/**
 * useIpcQuery — Convenience wrapper for React Query + IPC invoke.
 *
 * Handles the { success, data, error } envelope from the preload bridge,
 * unwrapping it so callers get clean data or thrown errors.
 */

import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

import type { InvokeChannel, InvokeInput, InvokeOutput } from '@shared/ipc-contract';

/**
 * Invoke an IPC channel and unwrap the result envelope.
 * Throws on { success: false }.
 */
export async function ipcInvoke<T extends InvokeChannel>(
  channel: T,
  input: InvokeInput<T>,
): Promise<InvokeOutput<T>> {
  const result = await window.api.invoke(channel, input);
  if (!result.success) {
    throw new Error(result.error ?? `IPC call failed: ${channel}`);
  }
  return result.data as InvokeOutput<T>;
}

/**
 * React Query hook for IPC queries.
 */
export function useIpcQuery<T extends InvokeChannel>(
  channel: T,
  input: InvokeInput<T>,
  options?: Omit<UseQueryOptions<InvokeOutput<T>>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<InvokeOutput<T>>({
    queryKey: [channel, input],
    queryFn: () => ipcInvoke(channel, input),
    ...options,
  });
}

/**
 * React Query mutation hook for IPC mutations.
 */
export function useIpcMutation<T extends InvokeChannel>(
  channel: T,
  options?: Omit<UseMutationOptions<InvokeOutput<T>, Error, InvokeInput<T>>, 'mutationFn'>,
) {
  return useMutation<InvokeOutput<T>, Error, InvokeInput<T>>({
    mutationFn: (input) => ipcInvoke(channel, input),
    ...options,
  });
}
