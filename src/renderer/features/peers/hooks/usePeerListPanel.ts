/**
 * Presentation hook for the peers settings panel.
 *
 * Wraps the four read/mutation hooks consumed by `PeerListPanel` and owns the
 * `inviteTarget` dialog state. Components consuming the result are render-only.
 */

import { useCallback, useState } from 'react';

import type { DiscoveredPeer } from '@shared/ipc/peers';

import {
  useDiscoveredPeers,
  usePairedPeers,
  useRevokePeer,
  useSelfIdentity,
} from '../api/usePeers';

export interface UsePeerListPanelResult {
  self: ReturnType<typeof useSelfIdentity>;
  paired: ReturnType<typeof usePairedPeers>;
  discovered: ReturnType<typeof useDiscoveredPeers>;
  revoke: ReturnType<typeof useRevokePeer>;
  inviteTarget: DiscoveredPeer | null;
  openInvite: (peer: DiscoveredPeer) => void;
  closeInvite: () => void;
  revokePeer: (peerId: string) => void;
}

export function usePeerListPanel(): UsePeerListPanelResult {
  const self = useSelfIdentity();
  const paired = usePairedPeers();
  const discovered = useDiscoveredPeers();
  const revoke = useRevokePeer();

  const [inviteTarget, setInviteTarget] = useState<DiscoveredPeer | null>(null);

  const openInvite = useCallback((peer: DiscoveredPeer) => {
    setInviteTarget(peer);
  }, []);

  const closeInvite = useCallback(() => {
    setInviteTarget(null);
  }, []);

  const revokePeer = useCallback(
    (peerId: string) => {
      revoke.mutate(peerId);
    },
    [revoke],
  );

  return {
    self,
    paired,
    discovered,
    revoke,
    inviteTarget,
    openInvite,
    closeInvite,
    revokePeer,
  };
}
