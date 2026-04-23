/**
 * Unit tests for the hub picker React Query hooks.
 *
 * The renderer's Vitest config runs in the `node` environment, so we can't
 * use @testing-library/react's `renderHook` to mount the hooks. Instead we
 * mock `@tanstack/react-query` and `react` to capture the options passed
 * to `useMutation` / `useQuery` and the effect callback passed to
 * `useEffect`, then exercise those callbacks directly.
 *
 * This validates exactly what the hook modules are responsible for:
 *   - queryFn / mutationFn call `ipc()` with the right channel + payload
 *   - onSuccess invalidates the correct query keys
 *   - useHubDiscovery's event bridge subscribes to DISCOVERY.CHANGED +
 *     ACTIVE.CHANGED and forwards payloads via setQueryData
 */

import type * as ReactModule from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HUB, HUB_EVENTS } from '@shared/ipc/hub/channels';

// ─── Mocks ────────────────────────────────────────────────────

type EffectCallback = () => undefined | (() => void);
interface MutationOptions {
  mutationFn: (input: unknown) => Promise<unknown>;
  onSuccess?: () => void;
}
interface QueryOptions {
  queryKey: unknown;
  queryFn: () => Promise<unknown>;
  staleTime?: number;
}

const mockInvoke = vi.fn();
const mockOn = vi.fn();

vi.stubGlobal('window', {
  api: {
    invoke: mockInvoke,
    on: mockOn,
  },
});

const capturedUseQueryOptions: QueryOptions[] = [];
const capturedUseMutationOptions: MutationOptions[] = [];
const capturedEffects: EffectCallback[] = [];

const mockInvalidateQueries = vi.fn();
const mockSetQueryData = vi.fn();
const mockQueryClient = {
  invalidateQueries: mockInvalidateQueries,
  setQueryData: mockSetQueryData,
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: QueryOptions) => {
    capturedUseQueryOptions.push(opts);
    return { data: undefined, isLoading: true };
  },
  useMutation: (opts: MutationOptions) => {
    capturedUseMutationOptions.push(opts);
    return {
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
    };
  },
  useQueryClient: () => mockQueryClient,
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof ReactModule>('react');
  return {
    ...actual,
    useEffect: (cb: EffectCallback) => {
      capturedEffects.push(cb);
    },
  };
});

// ─── Imports (after mocks) ────────────────────────────────────

// Using dynamic import so the mocks above are installed first.
async function loadHooks() {
  const discovery = await import('@renderer/features/hub/api/useHubDiscovery');
  const pair = await import('@renderer/features/hub/api/useHubPair');
  const switchActive = await import('@renderer/features/hub/api/useHubSwitchActive');
  const removeRecord = await import('@renderer/features/hub/api/useHubRemoveRecord');
  const manualPair = await import('@renderer/features/hub/api/useHubManualPair');
  const settingsHub = await import('@renderer/features/settings/api/useHub');
  return {
    ...discovery,
    ...pair,
    ...switchActive,
    ...removeRecord,
    ...manualPair,
    hubKeys: settingsHub.hubKeys,
  };
}

beforeEach(() => {
  capturedUseQueryOptions.length = 0;
  capturedUseMutationOptions.length = 0;
  capturedEffects.length = 0;
  mockInvoke.mockReset();
  mockOn.mockReset();
  mockInvalidateQueries.mockReset();
  mockSetQueryData.mockReset();
});

function lastMutationOptions(): MutationOptions {
  expect(capturedUseMutationOptions.length).toBeGreaterThan(0);
  return capturedUseMutationOptions.at(-1)!;
}

async function runMutationOnSuccess(opts: MutationOptions, input: unknown): Promise<void> {
  await opts.mutationFn(input);
  if (opts.onSuccess) opts.onSuccess();
}

// ─── hubDiscoveryKeys ─────────────────────────────────────────

describe('hubDiscoveryKeys', () => {
  it('has a stable key shape', async () => {
    const { hubDiscoveryKeys } = await loadHooks();
    expect(hubDiscoveryKeys.all).toEqual(['hub', 'discovery']);
    expect(hubDiscoveryKeys.list()).toEqual(['hub', 'discovery', 'list']);
  });
});

// ─── useHubDiscovery ──────────────────────────────────────────

describe('useHubDiscovery', () => {
  it('calls ipc(HUB.DISCOVERED.LIST) for the queryFn and is event-driven', async () => {
    const { useHubDiscovery, hubDiscoveryKeys } = await loadHooks();

    const unsubscribe = vi.fn();
    mockOn.mockImplementation(() => unsubscribe);
    mockInvoke.mockResolvedValue({
      success: true,
      data: { paired: [], discovered: [], activeHubId: null },
    });

    useHubDiscovery();

    // Effect that subscribes to events
    expect(capturedEffects).toHaveLength(1);
    const effect = capturedEffects[0];
    const cleanup = effect();

    // Subscribed to both discovery.changed and active.changed
    const subscribedChannels = mockOn.mock.calls.map((call) => call[0] as string);
    expect(subscribedChannels).toContain(HUB_EVENTS.DISCOVERY.CHANGED);
    expect(subscribedChannels).toContain(HUB_EVENTS.ACTIVE.CHANGED);

    // DISCOVERY.CHANGED handler writes the full snapshot into cache
    const discoveryCall = mockOn.mock.calls.find(
      ([ch]) => ch === HUB_EVENTS.DISCOVERY.CHANGED,
    );
    const discoveryHandler = discoveryCall![1] as (p: unknown) => void;
    const snapshot = { paired: [], discovered: [], activeHubId: 'hub-1' };
    discoveryHandler(snapshot);
    expect(mockSetQueryData).toHaveBeenCalledWith(hubDiscoveryKeys.list(), snapshot);

    // ACTIVE.CHANGED handler mutates only activeHubId via the updater
    const activeCall = mockOn.mock.calls.find(
      ([ch]) => ch === HUB_EVENTS.ACTIVE.CHANGED,
    );
    const activeHandler = activeCall![1] as (p: unknown) => void;
    mockSetQueryData.mockClear();
    activeHandler({ activeHubId: 'hub-2' });

    expect(mockSetQueryData).toHaveBeenCalledTimes(1);
    const [key, updater] = mockSetQueryData.mock.calls[0];
    expect(key).toEqual(hubDiscoveryKeys.list());
    expect(typeof updater).toBe('function');
    const updaterFn = updater as (p: unknown) => unknown;
    const updated = updaterFn({
      paired: [],
      discovered: [],
      activeHubId: 'hub-1',
    });
    expect(updated).toEqual({ paired: [], discovered: [], activeHubId: 'hub-2' });
    // When there is no cached snapshot yet the updater returns prev unchanged.
    const prevUndefined = updaterFn(void 0);
    expect(prevUndefined).toBe(void 0);

    // Cleanup unsubscribes both listeners
    expect(typeof cleanup).toBe('function');
    (cleanup as () => void)();
    expect(unsubscribe).toHaveBeenCalledTimes(2);

    // Query options shape
    const opts = capturedUseQueryOptions[0];
    expect(opts.queryKey).toEqual(hubDiscoveryKeys.list());
    expect(opts.staleTime).toBe(Infinity);

    await opts.queryFn();
    expect(mockInvoke).toHaveBeenCalledWith(HUB.DISCOVERED.LIST, {});
  });
});

// ─── Mutation hooks ───────────────────────────────────────────

describe('useHubPair', () => {
  it('calls HUB.PAIR.REQUEST and invalidates hub queries on success', async () => {
    const { useHubPair, hubDiscoveryKeys, hubKeys } = await loadHooks();
    mockInvoke.mockResolvedValue({ success: true, data: { ok: true, hubId: 'h1' } });

    useHubPair();

    const opts = lastMutationOptions();
    await runMutationOnSuccess(opts, { hubId: 'x' });

    expect(mockInvoke).toHaveBeenCalledWith(HUB.PAIR.REQUEST, { hubId: 'x' });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: hubDiscoveryKeys.all });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: hubKeys.all });
  });
});

describe('useHubSwitchActive', () => {
  it('calls HUB.SWITCH.ACTIVE and invalidates hub queries on success', async () => {
    const { useHubSwitchActive, hubDiscoveryKeys, hubKeys } = await loadHooks();
    mockInvoke.mockResolvedValue({ success: true, data: { success: true } });

    useHubSwitchActive();

    const opts = lastMutationOptions();
    await runMutationOnSuccess(opts, { hubId: 'x' });

    expect(mockInvoke).toHaveBeenCalledWith(HUB.SWITCH.ACTIVE, { hubId: 'x' });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: hubDiscoveryKeys.all });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: hubKeys.all });
  });
});

describe('useHubRemoveRecord', () => {
  it('calls HUB.REMOVE.RECORD and invalidates hub queries on success', async () => {
    const { useHubRemoveRecord, hubDiscoveryKeys, hubKeys } = await loadHooks();
    mockInvoke.mockResolvedValue({ success: true, data: { success: true } });

    useHubRemoveRecord();

    const opts = lastMutationOptions();
    await runMutationOnSuccess(opts, { hubId: 'x' });

    expect(mockInvoke).toHaveBeenCalledWith(HUB.REMOVE.RECORD, { hubId: 'x' });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: hubDiscoveryKeys.all });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: hubKeys.all });
  });
});

describe('useHubManualPair', () => {
  it('calls HUB.MANUAL.PAIR and invalidates hub queries on success', async () => {
    const { useHubManualPair, hubDiscoveryKeys, hubKeys } = await loadHooks();
    mockInvoke.mockResolvedValue({ success: true, data: { ok: true, hubId: 'h1' } });

    useHubManualPair();

    const opts = lastMutationOptions();
    await runMutationOnSuccess(opts, { url: 'https://hub.local:7777' });

    expect(mockInvoke).toHaveBeenCalledWith(HUB.MANUAL.PAIR, {
      url: 'https://hub.local:7777',
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: hubDiscoveryKeys.all });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: hubKeys.all });
  });
});
