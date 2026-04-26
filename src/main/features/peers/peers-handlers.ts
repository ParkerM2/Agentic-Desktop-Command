/**
 * Peers IPC handlers — thin bridge from PEERS.* invoke channels and
 * PEERS_EVENTS.* event channels to the PeersService.
 *
 * NOTE: `service` here may be the awaitable Proxy wrapper from
 * `peers-service-async.ts`. Every method call returns a Promise even when
 * the underlying service method is statically typed synchronous (e.g.
 * `listPaired`, `listDiscovered`, `getIdentity`, `revoke`). We rely on
 * `Promise.resolve(...)` to normalize both shapes — for the real service
 * it wraps a sync result; for the wrapper it transparently chains.
 * Event-subscription return values (the unsub function) are wrapped in a
 * Promise by the wrapper; we discard them here since the registry has no
 * per-handler teardown path.
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

  // Forward service events → IPC events. With the awaitable wrapper, the
  // `onX(...)` calls return Promise<() => void>; the unsub is discarded
  // because the registry never tears handlers down individually.
  void service.onPinIssued((info) => {
    router.emit(PEERS_EVENTS.PIN.ISSUED, {
      sessionId: info.sessionId,
      pin: info.pin,
      initiatorPeerId: info.initiatorPeerId,
      initiatorDisplayName: info.initiatorDisplayName ?? null,
      issuedAt: info.issuedAt,
    });
  });
  void service.onDiscoveryChanged((peers) => {
    router.emit(PEERS_EVENTS.DISCOVERY.CHANGED, { peers });
  });
  void service.onTrustChanged((event) => {
    router.emit(PEERS_EVENTS.TRUST.CHANGED, event);
  });
}
