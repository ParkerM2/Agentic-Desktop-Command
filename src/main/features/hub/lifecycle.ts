/**
 * Hub lifecycle event bus
 *
 * A tiny, awaitable pub/sub primitive used by the hub connection manager so
 * that services holding per-hub resources (DB handles, runners scoped to a
 * hub, long-lived websockets) can close gracefully BEFORE the active hub
 * changes.
 *
 * Handlers are invoked sequentially in registration order and their return
 * values (void or Promise<void>) are awaited. An individual handler's
 * rejection does not prevent subsequent handlers from running — each failure
 * is caught and reported via the optional `onHandlerError` callback supplied
 * at emit time, so one misbehaving subscriber cannot prevent the active-hub
 * swap from completing.
 */

export type Handler<T> = (payload: T) => void | Promise<void>;

export interface EmitOptions {
  /** Called when an individual handler throws; swallows the failure. */
  onHandlerError?: (error: unknown) => void;
}

export interface EventBus<T> {
  /** Await all registered handlers. Handler failures are isolated. */
  emit: (payload: T, options?: EmitOptions) => Promise<void>;
  /** Register a handler. Returns an unsubscribe function. */
  on: (handler: Handler<T>) => () => void;
  /** Current handler count — primarily for tests. */
  size: () => number;
}

export function createEventBus<T>(): EventBus<T> {
  const handlers = new Set<Handler<T>>();

  return {
    async emit(payload, options) {
      // Snapshot so `on`/unsubscribe calls inside a handler don't mutate the
      // iteration in progress.
      const snapshot = Array.from(handlers);
      for (const handler of snapshot) {
        try {
          await handler(payload);
        } catch (err) {
          options?.onHandlerError?.(err);
        }
      }
    },

    on(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },

    size() {
      return handlers.size;
    },
  };
}
