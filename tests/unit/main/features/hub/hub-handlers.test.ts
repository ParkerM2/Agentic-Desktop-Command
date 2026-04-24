/**
 * Unit tests for the Hub IPC handlers (Task 25).
 *
 * Captures handlers registered on a mock IpcRouter and exercises each of
 * the 5 new channels:
 *   - HUB.DISCOVERED.LIST
 *   - HUB.PAIR.REQUEST
 *   - HUB.SWITCH.ACTIVE
 *   - HUB.REMOVE.RECORD
 *   - HUB.MANUAL.PAIR  (minimal — full flow covered by E2E)
 *
 * The connection manager, discovery service, sync service, and
 * pairWithDiscoveredHub are all mocked so no network / mDNS / TLS I/O
 * happens here. pair-flow integration is covered by hub-pair.integration.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HUB } from '@shared/ipc/hub/channels';

import type { HubApiClient } from '@main/features/hub/hub-api-client';
import type { PersistedHubRecord } from '@main/features/hub/hub-config-store';
import type * as HubConfigStoreModule from '@main/features/hub/hub-config-store';
import type { HubConnectionManager } from '@main/features/hub/hub-connection';
import type { DiscoveredHub, HubDiscovery } from '@main/features/hub/hub-discovery';
import { registerHubHandlers } from '@main/features/hub/hub-handlers';
import type * as HubPairModule from '@main/features/hub/hub-pair';
import { pairWithDiscoveredHub, PairError } from '@main/features/hub/hub-pair';
import type { HubSyncService } from '@main/features/hub/hub-sync';
import type { IpcRouter } from '@main/ipc/router';

// ─── pair + config-store mocks ────────────────────────────────────

vi.mock('@main/features/hub/hub-pair', async () => {
  const actual = await vi.importActual<typeof HubPairModule>('@main/features/hub/hub-pair');
  return {
    ...actual,
    pairWithDiscoveredHub: vi.fn(),
  };
});

vi.mock('@main/features/hub/hub-config-store', async () => {
  const actual = await vi.importActual<typeof HubConfigStoreModule>(
    '@main/features/hub/hub-config-store',
  );
  return {
    ...actual,
    encryptApiKey: vi.fn((s: string) => `enc:${s}`),
  };
});

const pairMock = vi.mocked(pairWithDiscoveredHub);

// ─── Test helpers ──────────────────────────────────────────────────

type Handler = (input: unknown) => Promise<unknown>;

function createHandlerRouter(): {
  router: IpcRouter;
  emits: Array<{ channel: string; payload: unknown }>;
  handlers: Map<string, Handler>;
} {
  const handlers = new Map<string, Handler>();
  const emits: Array<{ channel: string; payload: unknown }> = [];
  const router = {
    handle: vi.fn((channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    }),
    emit: vi.fn((channel: string, payload: unknown) => {
      emits.push({ channel, payload });
    }),
  } as unknown as IpcRouter;
  return { router, emits, handlers };
}

function makePersisted(
  overrides: Partial<PersistedHubRecord> = {},
): PersistedHubRecord {
  return {
    hubId: 'hub-a',
    displayName: 'Hub A',
    lastKnownUrl: 'https://a.local:5173',
    encryptedApiKey: 'enc:key-a',
    pinnedFingerprint: 'fp-a',
    dbPath: 'hubs/hub-a/adc.db',
    clientIdentityRef: null,
    addedAt: '2026-04-23T00:00:00.000Z',
    lastConnectedAt: null,
    ...overrides,
  };
}

function makeDiscovered(overrides: Partial<DiscoveredHub> = {}): DiscoveredHub {
  return {
    hubId: 'hub-a',
    displayName: 'Hub A',
    version: '0.2.0',
    channel: 'dev',
    addresses: ['192.168.1.10'],
    port: 5173,
    fingerprint: 'fp-a',
    lastSeenAt: '2026-04-23T00:00:00.000Z',
    stale: false,
    ...overrides,
  };
}

interface Mocks {
  mgr: HubConnectionManager;
  sync: HubSyncService;
  discovery: HubDiscovery;
  apiClient: HubApiClient;
  // Spies
  addHub: ReturnType<typeof vi.fn>;
  removeHub: ReturnType<typeof vi.fn>;
  setActive: ReturnType<typeof vi.fn>;
  getSnapshot: ReturnType<typeof vi.fn>;
  listHubs: ReturnType<typeof vi.fn>;
}

function createMocks(): Mocks {
  const addHub = vi.fn(() => Promise.resolve());
  const removeHub = vi.fn(() => Promise.resolve());
  const setActive = vi.fn(() => Promise.resolve());
  const getSnapshot = vi.fn<() => DiscoveredHub[]>(() => []);
  const listHubs = vi.fn<() => PersistedHubRecord[]>(() => []);

  const mgr = {
    listHubs,
    getActiveHubId: vi.fn(() => null),
    getStatus: vi.fn(() => 'disconnected' as const),
    addHub,
    removeHub,
    setActive,
    // Unused by the new handlers but present on the interface.
    configure: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getConnection: vi.fn(() => null),
    removeConfig: vi.fn(),
    onBeforeActiveHubChange: vi.fn(),
    getActiveHub: vi.fn(() => null),
    renameHub: vi.fn(),
    setEnabled: vi.fn(),
    getClient: vi.fn(),
    isAvailable: vi.fn(),
    onWebSocketMessage: vi.fn(),
    dispose: vi.fn(),
    init: vi.fn(),
  } as unknown as HubConnectionManager;

  const sync = {
    getPendingCount: vi.fn(() => 0),
    syncPending: vi.fn(() => Promise.resolve(0)),
  } as unknown as HubSyncService;

  const discovery = {
    start: vi.fn(),
    stop: vi.fn(() => Promise.resolve()),
    getSnapshot,
    clear: vi.fn(),
    on: vi.fn(() => {
      // Return a noop unsubscribe.
      return function unsubscribe(): void {
        /* noop */
      };
    }),
  } as unknown as HubDiscovery;

  const apiClient = {} as HubApiClient;

  return { mgr, sync, discovery, apiClient, addHub, removeHub, setActive, getSnapshot, listHubs };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('hub-handlers — new discovery + pair channels', () => {
  let mocks: Mocks;
  let handlers: Map<string, Handler>;

  beforeEach(() => {
    mocks = createMocks();
    const { router, handlers: h } = createHandlerRouter();
    handlers = h;
    registerHubHandlers(
      router,
      mocks.mgr,
      mocks.sync,
      mocks.apiClient,
      mocks.discovery,
      '/tmp/hubs',
    );
    pairMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('HUB.DISCOVERED.LIST', () => {
    it('returns paired (wire shape), discovered snapshot, and activeHubId', async () => {
      mocks.listHubs.mockReturnValue([
        makePersisted({ hubId: 'hub-a' }),
        makePersisted({ hubId: 'hub-b', displayName: 'Hub B' }),
      ]);
      (mocks.mgr.getActiveHubId as ReturnType<typeof vi.fn>).mockReturnValue('hub-a');
      (mocks.mgr.getStatus as ReturnType<typeof vi.fn>).mockReturnValue('connected');
      mocks.getSnapshot.mockReturnValue([makeDiscovered({ hubId: 'hub-c' })]);

      const handler = handlers.get(HUB.DISCOVERED.LIST);
      expect(handler).toBeDefined();
      const result = (await handler?.({})) as {
        paired: Array<{ hubId: string; status: string; pinnedFingerprint: string | null }>;
        discovered: Array<{ hubId: string }>;
        activeHubId: string | null;
      };
      expect(result.paired).toHaveLength(2);
      // encryptedApiKey MUST be stripped from the wire shape.
      expect((result.paired[0] as Record<string, unknown>).encryptedApiKey).toBeUndefined();
      expect((result.paired[0] as Record<string, unknown>).dbPath).toBeUndefined();
      // Active hub reports live status; others report disconnected.
      expect(result.paired[0]?.status).toBe('connected');
      expect(result.paired[1]?.status).toBe('disconnected');
      expect(result.discovered).toEqual([
        expect.objectContaining({ hubId: 'hub-c' }),
      ]);
      expect(result.activeHubId).toBe('hub-a');
    });

    it('returns empty paired + discovered when no hubs', async () => {
      const handler = handlers.get(HUB.DISCOVERED.LIST);
      const result = (await handler?.({})) as {
        paired: unknown[];
        discovered: unknown[];
        activeHubId: string | null;
      };
      expect(result.paired).toEqual([]);
      expect(result.discovered).toEqual([]);
      expect(result.activeHubId).toBeNull();
    });
  });

  describe('HUB.PAIR.REQUEST', () => {
    it('returns { ok: false } when the hubId is not in the discovery snapshot', async () => {
      mocks.getSnapshot.mockReturnValue([]);
      const handler = handlers.get(HUB.PAIR.REQUEST);
      const result = (await handler?.({ hubId: 'ghost' })) as {
        ok: boolean;
        error?: string;
      };
      expect(result.ok).toBe(false);
      expect(result.error).toContain('not found');
      expect(pairMock).not.toHaveBeenCalled();
      expect(mocks.addHub).not.toHaveBeenCalled();
    });

    it('on success, calls addHub with makeActive and returns { ok: true, hubId }', async () => {
      mocks.getSnapshot.mockReturnValue([makeDiscovered({ hubId: 'hub-a' })]);
      pairMock.mockResolvedValueOnce({
        hubId: 'hub-a',
        displayName: 'Hub A',
        key: 'fresh-key',
        clientId: 'client-1',
        pinnedFingerprint: 'fp-a',
        lastKnownUrl: 'https://192.168.1.10:5173',
      });

      const handler = handlers.get(HUB.PAIR.REQUEST);
      const result = (await handler?.({ hubId: 'hub-a', displayName: 'Custom' })) as {
        ok: boolean;
        hubId?: string;
      };

      expect(result).toEqual({ ok: true, hubId: 'hub-a' });
      expect(pairMock).toHaveBeenCalledWith(
        expect.objectContaining({
          hubId: 'hub-a',
          addresses: ['192.168.1.10'],
          port: 5173,
          fingerprint: 'fp-a',
          displayName: 'Custom',
        }),
        { hubsDir: '/tmp/hubs' },
      );
      expect(mocks.addHub).toHaveBeenCalledTimes(1);
      const [rec, opts] = mocks.addHub.mock.calls[0] as [PersistedHubRecord, { makeActive: boolean }];
      expect(rec.hubId).toBe('hub-a');
      expect(rec.displayName).toBe('Custom');
      expect(rec.encryptedApiKey).toBe('enc:fresh-key');
      expect(rec.pinnedFingerprint).toBe('fp-a');
      expect(opts).toEqual({ makeActive: true });
    });

    it('maps PairError to { ok: false, error: "<code>: <message>" }', async () => {
      mocks.getSnapshot.mockReturnValue([makeDiscovered({ hubId: 'hub-a' })]);
      pairMock.mockRejectedValueOnce(
        new PairError('bad fingerprint', 'FINGERPRINT_MISMATCH'),
      );
      const handler = handlers.get(HUB.PAIR.REQUEST);
      const result = (await handler?.({ hubId: 'hub-a' })) as {
        ok: boolean;
        error?: string;
      };
      expect(result.ok).toBe(false);
      expect(result.error).toBe('FINGERPRINT_MISMATCH: bad fingerprint');
      expect(mocks.addHub).not.toHaveBeenCalled();
    });
  });

  describe('HUB.SWITCH.ACTIVE', () => {
    it('delegates to setActive and returns { success: true }', async () => {
      const handler = handlers.get(HUB.SWITCH.ACTIVE);
      const result = (await handler?.({ hubId: 'hub-b' })) as { success: boolean };
      expect(result).toEqual({ success: true });
      expect(mocks.setActive).toHaveBeenCalledWith('hub-b');
    });

    it('returns { success: false } when setActive throws', async () => {
      mocks.setActive.mockRejectedValueOnce(new Error('boom'));
      const handler = handlers.get(HUB.SWITCH.ACTIVE);
      const result = (await handler?.({ hubId: 'hub-b' })) as { success: boolean };
      expect(result).toEqual({ success: false });
    });
  });

  describe('HUB.REMOVE.RECORD', () => {
    it('delegates to removeHub and returns { success: true }', async () => {
      const handler = handlers.get(HUB.REMOVE.RECORD);
      const result = (await handler?.({ hubId: 'hub-a' })) as { success: boolean };
      expect(result).toEqual({ success: true });
      expect(mocks.removeHub).toHaveBeenCalledWith('hub-a');
    });
  });

  describe('HUB.MANUAL.PAIR', () => {
    it('rejects non-https URLs', async () => {
      const handler = handlers.get(HUB.MANUAL.PAIR);
      const result = (await handler?.({ url: 'http://insecure.example:5173' })) as {
        ok: boolean;
        error?: string;
      };
      expect(result.ok).toBe(false);
      expect(result.error).toContain('https://');
    });

    it('rejects malformed URLs', async () => {
      const handler = handlers.get(HUB.MANUAL.PAIR);
      const result = (await handler?.({ url: 'not-a-url' })) as {
        ok: boolean;
        error?: string;
      };
      expect(result.ok).toBe(false);
    });
  });
});
