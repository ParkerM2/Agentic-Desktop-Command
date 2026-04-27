/**
 * React Query hooks for peers
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PEERS } from '@shared/ipc/peers';
import type { PairConfirmInput, PairInitInput } from '@shared/ipc/peers';

import { ipc } from '@renderer/shared/lib/ipc';

import { peerKeys } from './queryKeys';

/** Fetch the list of paired peers */
export function usePairedPeers() {
  return useQuery({
    queryKey: peerKeys.paired(),
    queryFn: () => ipc(PEERS.LIST.PAIRED, {}),
    staleTime: 30_000,
  });
}

/** Fetch the list of mDNS-discovered peers on the local network */
export function useDiscoveredPeers() {
  return useQuery({
    queryKey: peerKeys.discovered(),
    queryFn: () => ipc(PEERS.LIST.DISCOVERED, {}),
    staleTime: 5_000,
  });
}

/** Fetch this device's own peer identity */
export function useSelfIdentity() {
  return useQuery({
    queryKey: peerKeys.identity(),
    queryFn: () => ipc(PEERS.IDENTITY.GET, {}),
    staleTime: Infinity,
  });
}

/**
 * Initiate a pairing session. Returns `{ sessionId, challenge }`.
 * Caller holds the session+challenge and prompts the user for the PIN
 * before calling `usePairConfirm`. No cache invalidation here — pairing
 * only completes on the confirm step.
 */
export function usePairInit() {
  return useMutation({
    mutationFn: (input: PairInitInput) => ipc(PEERS.PAIR.INIT, input),
  });
}

/**
 * Complete a pairing session by submitting the PIN. On success, invalidates
 * the paired-peers list so the new peer appears.
 */
export function usePairConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PairConfirmInput) => ipc(PEERS.PAIR.CONFIRM, input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: peerKeys.paired() });
    },
  });
}

/** Revoke trust in a paired peer. Invalidates the paired-peers list. */
export function useRevokePeer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (peerId: string) => ipc(PEERS.REVOKE.PEER, { peerId }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: peerKeys.paired() });
    },
  });
}
