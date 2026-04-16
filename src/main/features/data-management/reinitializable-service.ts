/**
 * Reinitializable Service Pattern
 *
 * Services that store user-scoped data implement this interface.
 * They reinitialize when the user changes (login/logout).
 */

export interface ReinitializableService {
  /** Reinitialize the service with a new data directory. */
  reinitialize: (dataDir: string) => void;
  /** Clear all in-memory state (called on logout). */
  clearState: () => void;
}

/**
 * Type guard to check if a service is reinitializable.
 */
export function isReinitializable(service: unknown): service is ReinitializableService {
  return (
    typeof service === 'object' &&
    service !== null &&
    'reinitialize' in service &&
    'clearState' in service &&
    typeof (service as ReinitializableService).reinitialize === 'function' &&
    typeof (service as ReinitializableService).clearState === 'function'
  );
}
