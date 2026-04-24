/**
 * useHubSwitchActive — Mutation that swaps the active hub.
 *
 * Wraps HUB.SWITCH.ACTIVE. Invalidates discovery + settings hub queries.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HUB } from '@shared/ipc/hub/channels';
import type { InvokeInput, InvokeOutput } from '@shared/ipc-contract';

import { hubKeys } from '@renderer/features/settings/api/useHub';
import { ipc } from '@renderer/shared/lib/ipc';

import { hubDiscoveryKeys } from './useHubDiscovery';

type SwitchInput = InvokeInput<typeof HUB.SWITCH.ACTIVE>;
type SwitchOutput = InvokeOutput<typeof HUB.SWITCH.ACTIVE>;

/** Switch the currently-active paired hub. */
export function useHubSwitchActive() {
  const queryClient = useQueryClient();
  return useMutation<SwitchOutput, Error, SwitchInput>({
    mutationFn: (input) => ipc(HUB.SWITCH.ACTIVE, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hubDiscoveryKeys.all });
      void queryClient.invalidateQueries({ queryKey: hubKeys.all });
    },
  });
}
