/**
 * In-process event bus for API key revocation notifications.
 *
 * When a key is revoked (via admin endpoint or `pair/confirm` superseding a
 * prior key), the WS layer subscribes to this bus so it can close any live
 * sockets belonging to the revoked clientId with close code 4003.
 *
 * Kept deliberately tiny — no persistence, no cross-process. Handlers are
 * called synchronously; errors in one handler never block siblings.
 */

export type RevocationHandler = (clientId: string, reason: string) => void;

export interface RevocationBus {
  /** Broadcast a revocation to every registered handler. */
  revoke: (clientId: string, reason: string) => void;
  /** Register a handler. Returns an unsubscribe function. */
  onRevoke: (handler: RevocationHandler) => () => void;
}

export function createRevocationBus(): RevocationBus {
  const handlers = new Set<RevocationHandler>();

  return {
    revoke(clientId, reason) {
      for (const handler of handlers) {
        try {
          handler(clientId, reason);
        } catch {
          /* one bad handler must not prevent others from firing */
        }
      }
    },
    onRevoke(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
  };
}
