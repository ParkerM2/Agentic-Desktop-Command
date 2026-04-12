/**
 * Health Registry — Tracks health of registered services via heartbeat pulses
 *
 * Services register with an expected heartbeat interval. A sweep timer checks
 * every 30 seconds and increments missed counts. After 3 consecutive misses,
 * the service is flagged unhealthy and the onUnhealthy callback fires.
 */

import type {
  HealthStatus,
  ServiceHealth,
  ServiceHealthStatus,
} from '@shared/types/health';

export type { HealthStatus, ServiceHealth, ServiceHealthStatus };

// ─── Service Interface ───────────────────────────────────────────

export interface HealthRegistry {
  register: (name: string, expectedIntervalMs: number) => void;
  pulse: (name: string) => void;
  getStatus: () => HealthStatus;
  dispose: () => void;
}

export interface HealthRegistryCallbacks {
  onUnhealthy?: (serviceName: string, missedCount: number) => void;
}

// ─── Constants ───────────────────────────────────────────────────

const SWEEP_INTERVAL_MS = 30_000; // 30 seconds
const UNHEALTHY_THRESHOLD = 3;

// ─── Factory ─────────────────────────────────────────────────────

interface RegistryEntry {
  expectedIntervalMs: number;
  lastPulse: number;
  missedCount: number;
  wasUnhealthy: boolean;
}

export function createHealthRegistry(
  callbacks?: HealthRegistryCallbacks,
): HealthRegistry {
  const services = new Map<string, RegistryEntry>();
  let sweepTimer: ReturnType<typeof setInterval> | null = null;

  function sweep(): void {
    const now = Date.now();

    for (const [name, entry] of services) {
      const elapsed = now - entry.lastPulse;
      const threshold = entry.expectedIntervalMs * 1.5;

      if (elapsed > threshold) {
        entry.missedCount += 1;

        // Fire callback only on transition to unhealthy (not every sweep)
        if (entry.missedCount >= UNHEALTHY_THRESHOLD && !entry.wasUnhealthy) {
          entry.wasUnhealthy = true;
          callbacks?.onUnhealthy?.(name, entry.missedCount);
        }
      }
    }
  }

  // Start sweep timer
  sweepTimer = setInterval(sweep, SWEEP_INTERVAL_MS);

  return {
    register(name, expectedIntervalMs) {
      services.set(name, {
        expectedIntervalMs,
        lastPulse: Date.now(),
        missedCount: 0,
        wasUnhealthy: false,
      });
    },

    pulse(name) {
      const entry = services.get(name);
      if (!entry) {
        return;
      }
      entry.lastPulse = Date.now();
      entry.missedCount = 0;
      entry.wasUnhealthy = false;
    },

    getStatus() {
      const result: ServiceHealth[] = [];

      for (const [name, entry] of services) {
        const status: ServiceHealthStatus =
          entry.missedCount >= UNHEALTHY_THRESHOLD ? 'unhealthy' : 'healthy';

        result.push({
          name,
          status,
          lastPulse: new Date(entry.lastPulse).toISOString(),
          missedCount: entry.missedCount,
        });
      }

      return { services: result };
    },

    dispose() {
      if (sweepTimer !== null) {
        clearInterval(sweepTimer);
        sweepTimer = null;
      }
      services.clear();
    },
  };
}
