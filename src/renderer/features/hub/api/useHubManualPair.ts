/**
 * useHubManualPair — Mutation that TOFU-pairs a hub by URL.
 *
 * Wraps HUB.MANUAL.PAIR. Invalidates discovery + settings hub queries.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HUB } from '@shared/ipc/hub/channels';
import type { InvokeInput, InvokeOutput } from '@shared/ipc-contract';

import { hubKeys } from '@renderer/features/settings/api/useHub';
import { ipc } from '@renderer/shared/lib/ipc';

import { hubDiscoveryKeys } from './useHubDiscovery';

type ManualPairInput = InvokeInput<typeof HUB.MANUAL.PAIR>;
type ManualPairOutput = InvokeOutput<typeof HUB.MANUAL.PAIR>;

/** Pair with a hub by URL using trust-on-first-use. */
export function useHubManualPair() {
  const queryClient = useQueryClient();
  return useMutation<ManualPairOutput, Error, ManualPairInput>({
    mutationFn: (input) => ipc(HUB.MANUAL.PAIR, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hubDiscoveryKeys.all });
      void queryClient.invalidateQueries({ queryKey: hubKeys.all });
    },
  });
}
