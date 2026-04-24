/**
 * useHubPair — Mutation that pairs with a discovered hub.
 *
 * Wraps HUB.PAIR.REQUEST. Invalidates the discovery snapshot and the
 * settings `hubKeys.all` tree on success so the picker + settings page
 * both refresh.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HUB } from '@shared/ipc/hub/channels';
import type { InvokeInput, InvokeOutput } from '@shared/ipc-contract';

import { hubKeys } from '@renderer/features/settings/api/useHub';
import { ipc } from '@renderer/shared/lib/ipc';

import { hubDiscoveryKeys } from './useHubDiscovery';

type PairInput = InvokeInput<typeof HUB.PAIR.REQUEST>;
type PairOutput = InvokeOutput<typeof HUB.PAIR.REQUEST>;

/** Pair with a discovered hub by hubId. */
export function useHubPair() {
  const queryClient = useQueryClient();
  return useMutation<PairOutput, Error, PairInput>({
    mutationFn: (input) => ipc(HUB.PAIR.REQUEST, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hubDiscoveryKeys.all });
      void queryClient.invalidateQueries({ queryKey: hubKeys.all });
    },
  });
}
