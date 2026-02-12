/**
 * useIpcQuery — React Query wrapper for IPC invoke calls
 *
 * Convenience hook that creates a typed useQuery call against an IPC channel.
 * For simple cases where you just want to fetch data from main process.
 *
 * Usage:
 *   const { data: projects } = useIpcQuery('projects.list', {}, {
 *     queryKey: projectKeys.all,
 *   });
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { InvokeChannel, InvokeInput, InvokeOutput } from '@shared/ipc-contract';

export function useIpcQuery<T extends InvokeChannel>(
  channel: T,
  input: InvokeInput<T>,
  options: Omit<UseQueryOptions<InvokeOutput<T>>, 'queryFn'> & {
    queryKey: readonly unknown[];
  },
) {
  return useQuery({
    ...options,
    queryFn: () => window.api.invoke(channel, input),
  });
}
