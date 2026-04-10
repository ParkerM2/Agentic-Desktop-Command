/**
 * Health Service — wraps HealthRegistry with memory monitoring
 *
 * Registers a 'memory' entry in the health registry and polls process memory
 * usage on a fixed interval, pulsing the registry to signal liveness.
 * Exposes the latest memory snapshot via getMemoryStats().
 */

import type { HealthRegistry } from './health-registry';

// ─── Types ───────────────────────────────────────────────────────

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  capturedAt: string;
}

export interface HealthService {
  getMemoryStats: () => MemoryStats;
  dispose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────

const MEMORY_POLL_INTERVAL_MS = 30_000; // 30 seconds

// ─── Factory ─────────────────────────────────────────────────────

export function createHealthService(healthRegistry: HealthRegistry): HealthService {
  let latestMemory: MemoryStats = captureMemory();
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  // Register memory as a monitored service with 2× the poll interval as threshold
  healthRegistry.register('memory', MEMORY_POLL_INTERVAL_MS * 2);

  function captureAndPulse(): void {
    latestMemory = captureMemory();
    healthRegistry.pulse('memory');
  }

  // Initial pulse so registry starts healthy
  captureAndPulse();

  pollTimer = setInterval(captureAndPulse, MEMORY_POLL_INTERVAL_MS);

  return {
    getMemoryStats(): MemoryStats {
      return latestMemory;
    },

    dispose(): void {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

function captureMemory(): MemoryStats {
  const mem = process.memoryUsage();
  return {
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    rss: mem.rss,
    capturedAt: new Date().toISOString(),
  };
}
