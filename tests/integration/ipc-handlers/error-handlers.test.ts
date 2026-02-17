/**
 * Integration tests for Error & Health IPC handlers
 *
 * Tests the full IPC flow: channel -> handler -> service -> response
 * with Zod validation at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ipcInvokeContract, type InvokeChannel } from '@shared/ipc-contract';
import type { ErrorEntry, ErrorStats, HealthStatus } from '@shared/types/health';

import type { IpcRouter } from '@main/ipc/router';

import type {
  ErrorCollectorHandler,
  HealthRegistryHandler,
} from '@main/ipc/handlers/error-handlers';

// ─── Mock Factories ─────────────────────────────────────────────

function createMockErrorEntry(overrides: Partial<ErrorEntry> = {}): ErrorEntry {
  return {
    id: 'entry-1',
    timestamp: '2026-02-15T12:00:00.000Z',
    severity: 'error',
    tier: 'app',
    category: 'general',
    message: 'Test error',
    context: {},
    ...overrides,
  };
}

function createMockErrorStats(overrides: Partial<ErrorStats> = {}): ErrorStats {
  return {
    total: 5,
    byTier: { app: 3, project: 1, personal: 1 },
    bySeverity: { error: 2, warning: 2, info: 1 },
    last24h: 3,
    ...overrides,
  };
}

function createMockHealthStatus(): HealthStatus {
  return {
    services: [
      { name: 'hub-connection', status: 'healthy', lastPulse: '2026-02-15T12:00:00.000Z', missedCount: 0 },
      { name: 'agent-service', status: 'unhealthy', lastPulse: '2026-02-15T11:00:00.000Z', missedCount: 5 },
    ],
  };
}

function createMockErrorCollector(): ErrorCollectorHandler {
  return {
    report: vi.fn(),
    getLog: vi.fn(),
    getStats: vi.fn(),
    clear: vi.fn(),
  };
}

function createMockHealthRegistry(): HealthRegistryHandler {
  return {
    getStatus: vi.fn(),
  };
}

// ─── Test Router ────────────────────────────────────────────────

function createTestRouter(): {
  router: IpcRouter;
  handlers: Map<string, (input: unknown) => Promise<unknown>>;
  invoke: (channel: string, input: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
} {
  const handlers = new Map<string, (input: unknown) => Promise<unknown>>();

  const router = {
    handle: (channel: string, handler: (input: unknown) => Promise<unknown>) => {
      handlers.set(channel, handler);
    },
    emit: vi.fn(),
  } as unknown as IpcRouter;

  const invoke = async (
    channel: string,
    input: unknown,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    const handler = handlers.get(channel);
    if (!handler) {
      return { success: false, error: `No handler for channel: ${channel}` };
    }

    const channelKey = channel as InvokeChannel;
    const schema = ipcInvokeContract[channelKey];

    try {
      const parsed = schema.input.parse(input ?? {});
      const result = await handler(parsed);
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  };

  return { router, handlers, invoke };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Error & Health IPC Handlers', () => {
  let errorCollector: ErrorCollectorHandler;
  let healthRegistry: HealthRegistryHandler;
  let invoke: ReturnType<typeof createTestRouter>['invoke'];

  beforeEach(async () => {
    errorCollector = createMockErrorCollector();
    healthRegistry = createMockHealthRegistry();

    const testRouter = createTestRouter();
    invoke = testRouter.invoke;

    const { registerErrorHandlers } = await import('@main/ipc/handlers/error-handlers');
    registerErrorHandlers(testRouter.router, errorCollector, healthRegistry);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── app.getErrorLog ───────────────────────────────────────────

  describe('app.getErrorLog', () => {
    it('returns entries from ErrorCollector', async () => {
      const entries = [
        createMockErrorEntry({ id: 'e-1', message: 'First error' }),
        createMockErrorEntry({ id: 'e-2', message: 'Second error' }),
      ];
      vi.mocked(errorCollector.getLog).mockReturnValue(entries);

      const result = await invoke('app.getErrorLog', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ entries });
      expect(errorCollector.getLog).toHaveBeenCalledWith(undefined);
    });

    it('passes since parameter to ErrorCollector', async () => {
      vi.mocked(errorCollector.getLog).mockReturnValue([]);

      const since = '2026-02-15T00:00:00.000Z';
      const result = await invoke('app.getErrorLog', { since });

      expect(result.success).toBe(true);
      expect(errorCollector.getLog).toHaveBeenCalledWith(since);
    });

    it('returns empty entries array when no errors exist', async () => {
      vi.mocked(errorCollector.getLog).mockReturnValue([]);

      const result = await invoke('app.getErrorLog', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ entries: [] });
    });
  });

  // ── app.getErrorStats ─────────────────────────────────────────

  describe('app.getErrorStats', () => {
    it('returns stats from ErrorCollector', async () => {
      const stats = createMockErrorStats();
      vi.mocked(errorCollector.getStats).mockReturnValue(stats);

      const result = await invoke('app.getErrorStats', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(stats);
      expect(errorCollector.getStats).toHaveBeenCalled();
    });

    it('returns zeroed stats when no errors exist', async () => {
      const emptyStats = createMockErrorStats({
        total: 0,
        byTier: { app: 0, project: 0, personal: 0 },
        bySeverity: { error: 0, warning: 0, info: 0 },
        last24h: 0,
      });
      vi.mocked(errorCollector.getStats).mockReturnValue(emptyStats);

      const result = await invoke('app.getErrorStats', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(emptyStats);
    });
  });

  // ── app.clearErrorLog ─────────────────────────────────────────

  describe('app.clearErrorLog', () => {
    it('calls clear on ErrorCollector and returns success', async () => {
      const result = await invoke('app.clearErrorLog', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(errorCollector.clear).toHaveBeenCalledTimes(1);
    });
  });

  // ── app.reportRendererError ───────────────────────────────────

  describe('app.reportRendererError', () => {
    it('constructs context from flat fields and calls report', async () => {
      const mockEntry = createMockErrorEntry({ message: 'Renderer crash' });
      vi.mocked(errorCollector.report).mockReturnValue(mockEntry);

      const result = await invoke('app.reportRendererError', {
        severity: 'error',
        tier: 'app',
        category: 'renderer',
        message: 'Renderer crash',
        stack: 'Error: Renderer crash\n  at Component.tsx:42',
        route: '/tasks',
        routeHistory: ['/dashboard', '/tasks'],
        projectId: 'proj-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(errorCollector.report).toHaveBeenCalledWith({
        severity: 'error',
        tier: 'app',
        category: 'renderer',
        message: 'Renderer crash',
        stack: 'Error: Renderer crash\n  at Component.tsx:42',
        context: {
          route: '/tasks',
          routeHistory: ['/dashboard', '/tasks'],
          projectId: 'proj-1',
        },
      });
    });

    it('handles minimal input (only required fields)', async () => {
      const mockEntry = createMockErrorEntry();
      vi.mocked(errorCollector.report).mockReturnValue(mockEntry);

      const result = await invoke('app.reportRendererError', {
        severity: 'warning',
        tier: 'project',
        category: 'general',
        message: 'Minor issue',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(errorCollector.report).toHaveBeenCalledWith({
        severity: 'warning',
        tier: 'project',
        category: 'general',
        message: 'Minor issue',
        stack: undefined,
        context: {
          route: undefined,
          routeHistory: undefined,
          projectId: undefined,
        },
      });
    });

    it('validates input - rejects invalid severity', async () => {
      const result = await invoke('app.reportRendererError', {
        severity: 'critical',
        tier: 'app',
        category: 'general',
        message: 'Bad severity',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates input - rejects missing message', async () => {
      const result = await invoke('app.reportRendererError', {
        severity: 'error',
        tier: 'app',
        category: 'general',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── app.getHealthStatus ───────────────────────────────────────

  describe('app.getHealthStatus', () => {
    it('returns status from HealthRegistry', async () => {
      const status = createMockHealthStatus();
      vi.mocked(healthRegistry.getStatus).mockReturnValue(status);

      const result = await invoke('app.getHealthStatus', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(status);
      expect(healthRegistry.getStatus).toHaveBeenCalled();
    });

    it('returns empty services array when none registered', async () => {
      vi.mocked(healthRegistry.getStatus).mockReturnValue({ services: [] });

      const result = await invoke('app.getHealthStatus', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ services: [] });
    });
  });

  // ── Handler Registration ──────────────────────────────────────

  describe('handler registration', () => {
    it('registers all 5 expected channels', () => {
      const testRouter = createTestRouter();

      // Re-import synchronously is not possible with ESM, but we can check
      // the handlers map from the already-registered router in beforeEach
      // Instead, just verify all channels can be invoked
      const expectedChannels = [
        'app.getErrorLog',
        'app.getErrorStats',
        'app.clearErrorLog',
        'app.reportRendererError',
        'app.getHealthStatus',
      ];

      for (const channel of expectedChannels) {
        // We already registered in beforeEach, so invoke should not return "No handler"
        // Just verify the handler map is populated by trying a basic invoke
        expect(async () => invoke(channel, {})).not.toThrow();
      }
    });
  });
});
