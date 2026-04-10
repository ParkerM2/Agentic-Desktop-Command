/**
 * Unit Tests for Cleanup Service
 *
 * Tests cleanup orchestration: runs per-store cleaners with retention settings,
 * scheduled intervals, auto-cleanup toggle, and dispose.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DataRetentionSettings } from '@shared/types';

// Mock logger
vi.mock('@main/lib/logger', () => ({
  createScopedLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
  serviceLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  appLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Mock store registry — provide a minimal registry with two stores
const mockRegistry = [
  {
    id: 'error-log',
    label: 'Error Log',
    description: '',
    filePath: 'error-log.json',
    isDirectory: false,
    lifecycle: 'short-lived',
    encrypted: false,
    hubSynced: false,
    defaultRetention: { maxAgeDays: 7, enabled: true },
    canClear: true,
    canExport: true,
    sensitive: false,
  },
  {
    id: 'notes',
    label: 'Notes',
    description: '',
    filePath: 'notes.json',
    isDirectory: false,
    lifecycle: 'persistent',
    encrypted: false,
    hubSynced: true,
    defaultRetention: { maxAgeDays: 365, maxItems: 1000, enabled: true },
    canClear: true,
    canExport: true,
    sensitive: false,
  },
];

const mockCleanErrorLog = vi.fn(() => Promise.resolve(3));
const mockCleanNotes = vi.fn(() => Promise.resolve(1));

vi.mock('@main/features/settings/data-management/store-registry', () => ({
  DATA_STORE_REGISTRY: mockRegistry,
}));

vi.mock('@main/features/settings/data-management/store-cleaners', () => ({
  STORE_CLEANUP_FUNCTIONS: {
    'error-log': (...args: unknown[]) => mockCleanErrorLog(...(args as [])),
    notes: (...args: unknown[]) => mockCleanNotes(...(args as [])),
  } as Record<string, unknown>,
}));

const { createCleanupService } = await import(
  '@main/features/settings/data-management/cleanup-service'
);

// ── Helpers ─────────────────────────────────────────────────────

function makeRouter() {
  return {
    emit: vi.fn(),
    register: vi.fn(),
  } as unknown as import('@main/ipc/router').IpcRouter;
}

function makeSettings(overrides: Partial<DataRetentionSettings> = {}): DataRetentionSettings {
  return {
    autoCleanupEnabled: true,
    cleanupIntervalHours: 24,
    overrides: {},
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────

describe('CleanupService', () => {
  let router: ReturnType<typeof makeRouter>;

  beforeEach(() => {
    vi.clearAllMocks();
    router = makeRouter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('runCleanup()', () => {
    it('runs cleanup for all registered stores and returns total cleaned', async () => {
      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => makeSettings(),
        router,
      });

      const result = await service.runCleanup();

      expect(mockCleanErrorLog).toHaveBeenCalled();
      expect(mockCleanNotes).toHaveBeenCalled();
      expect(result.cleaned).toBe(4); // 3 + 1
    });

    it('skips cleanup when autoCleanupEnabled is false', async () => {
      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => makeSettings({ autoCleanupEnabled: false }),
        router,
      });

      const result = await service.runCleanup();

      expect(result.cleaned).toBe(0);
      expect(mockCleanErrorLog).not.toHaveBeenCalled();
    });

    it('runs cleanup when settings are undefined', async () => {
      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => undefined,
        router,
      });

      const result = await service.runCleanup();

      expect(result.cleaned).toBe(4);
    });

    it('merges user retention overrides with defaults', async () => {
      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => makeSettings({
          overrides: {
            'error-log': { maxAgeDays: 3, enabled: true },
          },
        }),
        router,
      });

      await service.runCleanup();

      // error-log cleaner should be called with merged retention
      expect(mockCleanErrorLog).toHaveBeenCalledWith(
        '/mock/data',
        expect.objectContaining({ maxAgeDays: 3, enabled: true }),
      );
    });

    it('skips stores with retention disabled', async () => {
      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => makeSettings({
          overrides: {
            'error-log': { enabled: false },
          },
        }),
        router,
      });

      await service.runCleanup();

      expect(mockCleanErrorLog).not.toHaveBeenCalled();
      expect(mockCleanNotes).toHaveBeenCalled();
    });

    it('emits cleanupComplete event', async () => {
      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => makeSettings(),
        router,
      });

      await service.runCleanup();

      expect(router.emit).toHaveBeenCalledWith(
        'event:data-management.cleanup.complete',
        expect.objectContaining({ cleaned: 4 }),
      );
    });

    it('continues when individual cleaner throws', async () => {
      mockCleanErrorLog.mockRejectedValueOnce(new Error('Disk error'));

      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => makeSettings(),
        router,
      });

      const result = await service.runCleanup();

      // Notes cleaner should still run
      expect(mockCleanNotes).toHaveBeenCalled();
      expect(result.cleaned).toBe(1);
    });
  });

  describe('start()', () => {
    it('schedules initial cleanup after delay', () => {
      vi.useFakeTimers();

      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => makeSettings(),
        router,
      });

      service.start();

      // Not called yet
      expect(mockCleanErrorLog).not.toHaveBeenCalled();

      // Advance past initial delay (30s)
      vi.advanceTimersByTime(30_001);

      // Now cleanup should have been invoked
      expect(mockCleanErrorLog).toHaveBeenCalled();

      service.dispose();
    });
  });

  describe('dispose()', () => {
    it('clears timers without errors', () => {
      vi.useFakeTimers();

      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => makeSettings(),
        router,
      });

      service.start();
      service.dispose();

      // Advancing time should not trigger cleanup
      mockCleanErrorLog.mockClear();
      vi.advanceTimersByTime(100_000);
      expect(mockCleanErrorLog).not.toHaveBeenCalled();
    });

    it('can be called multiple times safely', () => {
      const service = createCleanupService({
        dataDir: '/mock/data',
        getRetentionSettings: () => makeSettings(),
        router,
      });

      service.dispose();
      service.dispose();
    });
  });
});
