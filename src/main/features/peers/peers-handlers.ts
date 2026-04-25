/**
 * Peers IPC handlers — thin bridge from PEERS.* invoke channels and
 * PEERS_EVENTS.* event channels to the PeersService.
 */

import {
  PEERS,
  PEERS_EVENTS,
  PairConfirmInputSchema,
  PairInitInputSchema,
  RevokeInputSchema,
} from '@shared/ipc/peers';

import type { PeersService } from './peers-service';
import type { IpcRouter } from '../../ipc/router';

export function registerPeersHandlers(router: IpcRouter, service: PeersService): void {
  router.handle(PEERS.LIST.PAIRED, () => Promise.resolve(service.listPaired()));
  router.handle(PEERS.LIST.DISCOVERED, () => Promise.resolve(service.listDiscovered()));
  router.handle(PEERS.IDENTITY.GET, () => Promise.resolve(service.getIdentity()));

  router.handle(PEERS.PAIR.INIT, async (raw) => {
    const input = PairInitInputSchema.parse(raw);
    return await service.pairInit(input);
  });

  router.handle(PEERS.PAIR.CONFIRM, async (raw) => {
    const input = PairConfirmInputSchema.parse(raw);
    return await service.pairConfirm(input);
  });

  router.handle(PEERS.REVOKE.PEER, (raw) => {
    const input = RevokeInputSchema.parse(raw);
    return Promise.resolve(service.revoke(input.peerId));
  });

  // Forward service events → IPC events
  service.onPinIssued((info) => {
    router.emit(PEERS_EVENTS.PIN.ISSUED, {
      sessionId: info.sessionId,
      pin: info.pin,
      initiatorPeerId: info.initiatorPeerId,
      issuedAt: info.issuedAt,
    });
  });
  service.onDiscoveryChanged((peers) => {
    router.emit(PEERS_EVENTS.DISCOVERY.CHANGED, { peers });
  });
  service.onTrustChanged((event) => {
    router.emit(PEERS_EVENTS.TRUST.CHANGED, event);
  });
}
