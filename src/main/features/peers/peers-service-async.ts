/**
 * Awaitable PeersService wrapper.
 *
 * Wraps `Promise<PeersService>` in a Proxy whose every method returns a
 * Promise that awaits the underlying service before delegating. This
 * eliminates the bootstrap race in `service-registry.ts` where IPC calls
 * can land while the async `createPeersService` is still in flight.
 *
 * Type-level note: the Proxy widens every method's return type to a
 * Promise, but we cast back to `PeersService` so handler/test code is
 * source-compatible. Consumers MUST `await` returned values — IPC
 * handlers already do this transparently because `router.handle`
 * callbacks are async.
 *
 * Event-subscription methods (`onPinIssued`, `onDiscoveryChanged`,
 * `onTrustChanged`) also return Promises here. The unsubscribe function
 * is therefore wrapped in a Promise — callers must await before invoking
 * the unsub. Subscribers attached before the inner promise resolves are
 * registered against the real service the moment it becomes available;
 * this is safe because event fan-out is bounded by current state at
 * subscription time and the registry replays nothing on subscribe.
 */

import type { PeersService } from './peers-service';

export function wrapAsyncPeersService(promise: Promise<PeersService>): PeersService {
  return new Proxy({} as PeersService, {
    get(_t, prop) {
      return (...args: unknown[]) =>
        promise.then((svc) => {
          const fn = (svc as unknown as Record<PropertyKey, unknown>)[prop];
          if (typeof fn !== 'function') {
            throw new Error(`PeersService.${String(prop)} is not a function`);
          }
          return (fn as (...a: unknown[]) => unknown).apply(svc, args);
        });
    },
  });
}
