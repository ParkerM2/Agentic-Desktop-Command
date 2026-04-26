/**
 * Peers IPC handlers — thin bridge from PEERS.* invoke channels and
 * PEERS_EVENTS.* event channels to the PeersService.
 *
 * NOTE: `service` here may be the awaitable Proxy wrapper from
 * `peers-service-async.ts`. Every method call returns a Promise even when
 * the underlying service method is statically typed synchronous (e.g.
 * `listPaired`, `listDiscovered`, `getIdentity`, `revoke`). The
 * `validatedHandle` helper normalizes both shapes — its `fn` is async, so
 * sync return values are auto-promised; awaitable-wrapper return values
 * are transparently chained.
 *
 * Event-subscription return values (the unsub function) are wrapped in a
 * Promise by the wrapper; we discard them here since the registry has no
 * per-handler teardown path.
 */

import { PEERS, PEERS_EVENTS, peersInvoke } from '@shared/ipc/peers';

import { validatedHandle } from './validated-handle';

import type { PeersService } from './peers-service';
import type { IpcRouter } from '../../ipc/router';

export function registerPeersHandlers(router: IpcRouter, service: PeersService): void {
  router.handle(
    PEERS.LIST.PAIRED,
    validatedHandle(peersInvoke, PEERS.LIST.PAIRED, () => Promise.resolve(service.listPaired())),
  );

  router.handle(
    PEERS.LIST.DISCOVERED,
    validatedHandle(peersInvoke, PEERS.LIST.DISCOVERED, () =>
      Promise.resolve(service.listDiscovered()),
    ),
  );

  router.handle(
    PEERS.IDENTITY.GET,
    validatedHandle(peersInvoke, PEERS.IDENTITY.GET, () => Promise.resolve(service.getIdentity())),
  );

  router.handle(
    PEERS.PAIR.INIT,
    validatedHandle(peersInvoke, PEERS.PAIR.INIT, (input) => service.pairInit(input)),
  );

  router.handle(
    PEERS.PAIR.CONFIRM,
    validatedHandle(peersInvoke, PEERS.PAIR.CONFIRM, (input) => service.pairConfirm(input)),
  );

  router.handle(
    PEERS.REVOKE.PEER,
    validatedHandle(peersInvoke, PEERS.REVOKE.PEER, (input) =>
      Promise.resolve(service.revoke(input.peerId)),
    ),
  );

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
