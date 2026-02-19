/**
 * Unit Tests for HealthRegistry
 *
 * Tests service registration, pulse heartbeats, sweep logic,
 * unhealthy detection, and disposal.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHealthRegistry } from '@main/services/health/health-registry';

import type { HealthRegistry, HealthRegistryCallbacks } from '@main/services/health/health-registry';

// ── Constants (match source values) ─────────────────────────────

const SWEEP_INTERVAL_MS = 30_000;
const UNHEALTHY_THRESHOLD = 3;

// ── Tests ───────────────────────────────────────────────────────

describe('HealthRegistry', () => {
  let registry: HealthRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    registry?.dispose();
    vi.useRealTimers();
  });

  // ── register() ──────────────────────────────────────────────

  describe('register()', () => {
    it('adds a service to the status list as healthy', () => {
      registry = createHealthRegistry();
      registry.register('test-service', 5000);

      const status = registry.getStatus();

      expect(status.services).toHaveLength(1);
      expect(status.services[0]?.name).toBe('test-service');
      expect(status.services[0]?.status).toBe('healthy');
      expect(status.services[0]?.missedCount).toBe(0);
    });

    it('registers multiple services independently', () => {
      registry = createHealthRegistry();
      registry.register('service-a', 5000);
      registry.register('service-b', 10_000);

      const status = registry.getStatus();

      expect(status.services).toHaveLength(2);

      const names = status.services.map((s) => s.name);
      expect(names).toContain('service-a');
      expect(names).toContain('service-b');
    });

    it('overwrites a service if registered again with the same name', () => {
      registry = createHealthRegistry();
      registry.register('dup-service', 5000);
      registry.register('dup-service', 15_000);

      const status = registry.getStatus();

      expect(status.services).toHaveLength(1);
      expect(status.services[0]?.name).toBe('dup-service');
    });
  });

  // ── pulse() ─────────────────────────────────────────────────

  describe('pulse()', () => {
    it('updates lastPulse timestamp for a registered service', () => {
      registry = createHealthRegistry();

      const startTime = Date.now();
      registry.register('pulse-svc', 5000);

      // Advance time
      vi.advanceTimersByTime(2000);

      registry.pulse('pulse-svc');

      const status = registry.getStatus();
      const svc = status.services[0];

      // The lastPulse should be the current fake time (start + 2s)
      expect(svc?.lastPulse).toBe(new Date(startTime + 2000).toISOString());
    });

    it('resets missedCount to 0 on pulse', () => {
      registry = createHealthRegistry();
      registry.register('miss-svc', 5000);

      // Advance past threshold to accumulate misses
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      // Now pulse to reset
      registry.pulse('miss-svc');

      const status = registry.getStatus();
      const svc = status.services.find((s) => s.name === 'miss-svc');

      expect(svc?.missedCount).toBe(0);
      expect(svc?.status).toBe('healthy');
    });

    it('is a no-op for an unregistered service', () => {
      registry = createHealthRegistry();

      // Should not throw
      expect(() => {
        registry.pulse('nonexistent');
      }).not.toThrow();

      const status = registry.getStatus();
      expect(status.services).toHaveLength(0);
    });

    it('resets wasUnhealthy flag so callback can fire again on next transition', () => {
      const onUnhealthy = vi.fn();
      registry = createHealthRegistry({ onUnhealthy });

      // Register with 1ms interval so sweep always finds it overdue
      registry.register('flapping-svc', 1);

      // Trigger 3 sweeps to hit unhealthy threshold
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      expect(onUnhealthy).toHaveBeenCalledTimes(1);

      // Pulse resets everything
      registry.pulse('flapping-svc');

      // Trigger 3 more sweeps
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      // Callback should fire again (second transition)
      expect(onUnhealthy).toHaveBeenCalledTimes(2);
    });
  });

  // ── sweep (timer-driven) ────────────────────────────────────

  describe('sweep', () => {
    it('increments missedCount when service exceeds 1.5x interval without pulse', () => {
      registry = createHealthRegistry();

      // Register with 10s expected interval, threshold = 15s
      registry.register('slow-svc', 10_000);

      // Advance one sweep interval (30s) — well past 15s threshold
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      const status = registry.getStatus();
      const svc = status.services.find((s) => s.name === 'slow-svc');

      expect(svc?.missedCount).toBe(1);
    });

    it('does not increment missedCount if pulse is within threshold', () => {
      registry = createHealthRegistry();

      // Register with a very high interval so 30s sweep doesn't exceed it
      registry.register('fast-svc', 60_000);

      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      const status = registry.getStatus();
      const svc = status.services.find((s) => s.name === 'fast-svc');

      expect(svc?.missedCount).toBe(0);
    });

    it('accumulates missed count across multiple sweeps', () => {
      registry = createHealthRegistry();
      registry.register('lagging-svc', 1);

      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      const status = registry.getStatus();
      const svc = status.services.find((s) => s.name === 'lagging-svc');

      expect(svc?.missedCount).toBe(3);
    });

    it('marks service as unhealthy after reaching threshold', () => {
      registry = createHealthRegistry();
      registry.register('dying-svc', 1);

      // 3 sweeps = 3 misses = threshold
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      const status = registry.getStatus();
      const svc = status.services.find((s) => s.name === 'dying-svc');

      expect(svc?.status).toBe('unhealthy');
    });

    it('keeps service healthy when missedCount < threshold', () => {
      registry = createHealthRegistry();
      registry.register('ok-svc', 1);

      // 2 sweeps = 2 misses (below threshold of 3)
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      const status = registry.getStatus();
      const svc = status.services.find((s) => s.name === 'ok-svc');

      expect(svc?.status).toBe('healthy');
      expect(svc?.missedCount).toBe(2);
    });
  });

  // ── onUnhealthy callback ────────────────────────────────────

  describe('onUnhealthy callback', () => {
    it('fires when missedCount reaches the unhealthy threshold', () => {
      const onUnhealthy = vi.fn();
      registry = createHealthRegistry({ onUnhealthy });
      registry.register('callback-svc', 1);

      // 2 sweeps — not yet at threshold
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      expect(onUnhealthy).not.toHaveBeenCalled();

      // 3rd sweep — reaches threshold
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      expect(onUnhealthy).toHaveBeenCalledTimes(1);
      expect(onUnhealthy).toHaveBeenCalledWith('callback-svc', UNHEALTHY_THRESHOLD);
    });

    it('fires only once per unhealthy transition (not every sweep)', () => {
      const onUnhealthy = vi.fn();
      registry = createHealthRegistry({ onUnhealthy });
      registry.register('once-svc', 1);

      // 5 sweeps — should fire only on 3rd
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(SWEEP_INTERVAL_MS);
      }

      expect(onUnhealthy).toHaveBeenCalledTimes(1);
    });

    it('does not fire when no callback is provided', () => {
      // Should not throw even without callbacks
      registry = createHealthRegistry();
      registry.register('no-cb-svc', 1);

      expect(() => {
        vi.advanceTimersByTime(SWEEP_INTERVAL_MS * 5);
      }).not.toThrow();
    });
  });

  // ── getStatus() ─────────────────────────────────────────────

  describe('getStatus()', () => {
    it('returns empty services array when nothing is registered', () => {
      registry = createHealthRegistry();

      const status = registry.getStatus();

      expect(status.services).toEqual([]);
    });

    it('returns correct structure for each service', () => {
      registry = createHealthRegistry();
      registry.register('struct-svc', 5000);

      const status = registry.getStatus();
      const svc = status.services[0];

      expect(svc).toHaveProperty('name');
      expect(svc).toHaveProperty('status');
      expect(svc).toHaveProperty('lastPulse');
      expect(svc).toHaveProperty('missedCount');
      expect(typeof svc?.lastPulse).toBe('string');
    });

    it('returns ISO timestamp for lastPulse', () => {
      registry = createHealthRegistry();
      registry.register('iso-svc', 5000);

      const status = registry.getStatus();
      const svc = status.services[0];
      const parsed = Date.parse(svc?.lastPulse ?? '');

      expect(Number.isNaN(parsed)).toBe(false);
    });
  });

  // ── dispose() ───────────────────────────────────────────────

  describe('dispose()', () => {
    it('clears all registered services', () => {
      registry = createHealthRegistry();
      registry.register('svc-1', 5000);
      registry.register('svc-2', 5000);

      registry.dispose();

      const status = registry.getStatus();
      expect(status.services).toEqual([]);
    });

    it('stops the sweep timer', () => {
      const onUnhealthy = vi.fn();
      registry = createHealthRegistry({ onUnhealthy });
      registry.register('timer-svc', 1);

      registry.dispose();

      // Advance past multiple sweep intervals — timer should be stopped
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS * 10);

      // Callback should never fire because timer was cleared
      expect(onUnhealthy).not.toHaveBeenCalled();
    });

    it('can be called multiple times without error', () => {
      registry = createHealthRegistry();
      registry.register('multi-dispose', 5000);

      expect(() => {
        registry.dispose();
        registry.dispose();
      }).not.toThrow();
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles registering a service with very small interval', () => {
      registry = createHealthRegistry();
      registry.register('tiny-interval', 1);

      // Sweep will see it as overdue almost immediately
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      const status = registry.getStatus();
      const svc = status.services.find((s) => s.name === 'tiny-interval');

      expect(svc?.missedCount).toBe(1);
    });

    it('handles registering a service with very large interval', () => {
      registry = createHealthRegistry();
      registry.register('large-interval', 999_999_999);

      vi.advanceTimersByTime(SWEEP_INTERVAL_MS);

      const status = registry.getStatus();
      const svc = status.services.find((s) => s.name === 'large-interval');

      // 30s elapsed < 999999999 * 1.5 threshold
      expect(svc?.missedCount).toBe(0);
      expect(svc?.status).toBe('healthy');
    });

    it('multiple services track health independently', () => {
      const onUnhealthy = vi.fn();
      registry = createHealthRegistry({ onUnhealthy });

      // One service with tiny interval (will become unhealthy)
      registry.register('unhealthy-svc', 1);
      // One service with huge interval (will stay healthy)
      registry.register('healthy-svc', 999_999_999);

      vi.advanceTimersByTime(SWEEP_INTERVAL_MS * 3);

      const status = registry.getStatus();

      const unhealthySvc = status.services.find((s) => s.name === 'unhealthy-svc');
      const healthySvc = status.services.find((s) => s.name === 'healthy-svc');

      expect(unhealthySvc?.status).toBe('unhealthy');
      expect(healthySvc?.status).toBe('healthy');

      expect(onUnhealthy).toHaveBeenCalledWith('unhealthy-svc', UNHEALTHY_THRESHOLD);
    });
  });
});
