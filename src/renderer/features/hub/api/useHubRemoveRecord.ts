/**
 * useHubRemoveRecord — Mutation that removes a paired hub record locally.
 *
 * Wraps HUB.REMOVE.RECORD. Invalidates discovery + settings hub queries.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HUB } from '@shared/ipc/hub/channels';
import type { InvokeInput, InvokeOutput } from '@shared/ipc-contract';

import { hubKeys } from '@renderer/features/settings/api/useHub';
import { ipc } from '@renderer/shared/lib/ipc';

import { hubDiscoveryKeys } from './useHubDiscovery';

type RemoveInput = InvokeInput<typeof HUB.REMOVE.RECORD>;
type RemoveOutput = InvokeOutput<typeof HUB.REMOVE.RECORD>;

/** Remove a paired hub record from the local config store. */
export function useHubRemoveRecord() {
  const queryClient = useQueryClient();
  return useMutation<RemoveOutput, Error, RemoveInput>({
    mutationFn: (input) => ipc(HUB.REMOVE.RECORD, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hubDiscoveryKeys.all });
      void queryClient.invalidateQueries({ queryKey: hubKeys.all });
    },
  });
}
