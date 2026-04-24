/**
 * Unit tests for createHubDiscovery.
 *
 * The real bonjour-service instance does actual mDNS — we inject a fake
 * Bonjour factory that returns a minimal EventEmitter-based browser so
 * we can drive 'up' / 'down' events deterministically.
 */

import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHubDiscovery, type DiscoveredHub } from '@main/features/hub/hub-discovery';

import type { Bonjour } from 'bonjour-service';

type BonjourFactory = () => Bonjour;

interface ServiceLike {
  txt?: Record<string, string | undefined>;
  addresses?: string[];
  port: number;
}

interface FakeBrowser extends EventEmitter {
  stop: ReturnType<typeof vi.fn>;
  emitUp: (svc: ServiceLike) => void;
  emitDown: (svc: ServiceLike) => void;
}

interface FakeBonjour {
  find: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

function makeFakeBonjour(): {
  bonjour: FakeBonjour;
  browser: FakeBrowser;
  factory: () => FakeBonjour;
} {
  const browser = new EventEmitter() as FakeBrowser;
  browser.stop = vi.fn();
  browser.emitUp = (svc: ServiceLike): void => {
    browser.emit('up', svc);
  };
  browser.emitDown = (svc: ServiceLike): void => {
    browser.emit('down', svc);
  };

  const bonjour: FakeBonjour = {
    find: vi.fn(() => browser),
    destroy: vi.fn(),
  };

  return { bonjour, browser, factory: (): FakeBonjour => bonjour };
}

const CHANNEL = 'dev';
const DEBOUNCE = 50;
const STALE = 1_000;
const DROP = 5_000;

function makeHubSvc(overrides: Partial<Record<string, string>> = {}): ServiceLike {
  return {
    txt: {
      id: 'hub-1',
      v: '1',
      app: '0.1.6',
      ch: CHANNEL,
      name: 'Parker Hub',
      api: 'https://hub.local:7443',
      fp: 'sha256/abcd',
      ...overrides,
    },
    addresses: ['192.168.1.10'],
    port: 7443,
  };
}

describe('createHubDiscovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('emits a hub with matching channel on "up"', async () => {
    const { browser, factory } = makeFakeBonjour();
    const disc = createHubDiscovery({
      channel: CHANNEL,
      bonjour: factory as unknown as BonjourFactory,
      debounceMs: DEBOUNCE,
      staleMs: STALE,
      dropMs: DROP,
    });
    const changes: DiscoveredHub[][] = [];
    disc.on('changed', (hubs) => changes.push(hubs));

    disc.start();
    expect(disc.getSnapshot()).toEqual([]);

    browser.emitUp(makeHubSvc());
    // Before debounce fires, snapshot is already updated but no emission yet.
    expect(disc.getSnapshot()).toHaveLength(1);
    expect(changes).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.[0]).toMatchObject({
      hubId: 'hub-1',
      displayName: 'Parker Hub',
      channel: CHANNEL,
      port: 7443,
      fingerprint: 'sha256/abcd',
      stale: false,
    });

    await disc.stop();
  });

  it('ignores hubs with mismatched channel', async () => {
    const { browser, factory } = makeFakeBonjour();
    const disc = createHubDiscovery({
      channel: CHANNEL,
      bonjour: factory as unknown as BonjourFactory,
      debounceMs: DEBOUNCE,
      staleMs: STALE,
      dropMs: DROP,
    });
    const changes: DiscoveredHub[][] = [];
    disc.on('changed', (hubs) => changes.push(hubs));

    disc.start();
    browser.emitUp(makeHubSvc({ ch: 'local' }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE);

    expect(changes).toHaveLength(0);
    expect(disc.getSnapshot()).toEqual([]);

    await disc.stop();
  });

  it('ignores duplicate "up" events with identical content', async () => {
    const { browser, factory } = makeFakeBonjour();
    const disc = createHubDiscovery({
      channel: CHANNEL,
      bonjour: factory as unknown as BonjourFactory,
      debounceMs: DEBOUNCE,
      staleMs: STALE,
      dropMs: DROP,
    });
    const changes: DiscoveredHub[][] = [];
    disc.on('changed', (hubs) => changes.push(hubs));

    disc.start();
    browser.emitUp(makeHubSvc());
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(changes).toHaveLength(1);

    // Same content — should not emit again.
    browser.emitUp(makeHubSvc());
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(changes).toHaveLength(1);

    await disc.stop();
  });

  it('debounces rapid updates into a single emit', async () => {
    const { browser, factory } = makeFakeBonjour();
    const disc = createHubDiscovery({
      channel: CHANNEL,
      bonjour: factory as unknown as BonjourFactory,
      debounceMs: DEBOUNCE,
      staleMs: STALE,
      dropMs: DROP,
    });
    const changes: DiscoveredHub[][] = [];
    disc.on('changed', (hubs) => changes.push(hubs));

    disc.start();
    browser.emitUp(makeHubSvc({ id: 'hub-1' }));
    browser.emitUp(makeHubSvc({ id: 'hub-2' }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toHaveLength(2);

    await disc.stop();
  });

  it('marks entries stale after staleMs and drops them after dropMs', async () => {
    const { browser, factory } = makeFakeBonjour();
    const disc = createHubDiscovery({
      channel: CHANNEL,
      bonjour: factory as unknown as BonjourFactory,
      debounceMs: DEBOUNCE,
      staleMs: STALE,
      dropMs: DROP,
    });
    const changes: DiscoveredHub[][] = [];
    disc.on('changed', (hubs) => changes.push(hubs));

    disc.start();
    browser.emitUp(makeHubSvc());
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(changes.at(-1)?.[0]?.stale).toBe(false);

    // Advance past staleMs — sweep runs on min(staleMs, 10s) interval.
    await vi.advanceTimersByTimeAsync(STALE + DEBOUNCE + 50);
    const afterStale = disc.getSnapshot();
    expect(afterStale[0]?.stale).toBe(true);

    // Advance past dropMs — entry should be removed.
    await vi.advanceTimersByTimeAsync(DROP + DEBOUNCE + 50);
    expect(disc.getSnapshot()).toEqual([]);

    await disc.stop();
  });

  it('clear() empties map and emits when non-empty', async () => {
    const { browser, factory } = makeFakeBonjour();
    const disc = createHubDiscovery({
      channel: CHANNEL,
      bonjour: factory as unknown as BonjourFactory,
      debounceMs: DEBOUNCE,
      staleMs: STALE,
      dropMs: DROP,
    });
    const changes: DiscoveredHub[][] = [];
    disc.on('changed', (hubs) => changes.push(hubs));

    disc.start();
    browser.emitUp(makeHubSvc());
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(changes).toHaveLength(1);

    disc.clear();
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(changes).toHaveLength(2);
    expect(changes.at(-1)).toEqual([]);

    // clear on empty map is a no-op.
    disc.clear();
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(changes).toHaveLength(2);

    await disc.stop();
  });

  it('"down" event removes hub and emits', async () => {
    const { browser, factory } = makeFakeBonjour();
    const disc = createHubDiscovery({
      channel: CHANNEL,
      bonjour: factory as unknown as BonjourFactory,
      debounceMs: DEBOUNCE,
      staleMs: STALE,
      dropMs: DROP,
    });
    const changes: DiscoveredHub[][] = [];
    disc.on('changed', (hubs) => changes.push(hubs));

    disc.start();
    browser.emitUp(makeHubSvc());
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(disc.getSnapshot()).toHaveLength(1);

    browser.emitDown(makeHubSvc());
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(disc.getSnapshot()).toEqual([]);
    expect(changes.at(-1)).toEqual([]);

    await disc.stop();
  });

  it('stop() unsubscribes browser and destroys bonjour', async () => {
    const { bonjour, browser, factory } = makeFakeBonjour();
    const disc = createHubDiscovery({
      channel: CHANNEL,
      bonjour: factory as unknown as BonjourFactory,
      debounceMs: DEBOUNCE,
      staleMs: STALE,
      dropMs: DROP,
    });

    disc.start();
    await disc.stop();

    expect(browser.stop).toHaveBeenCalledTimes(1);
    expect(bonjour.destroy).toHaveBeenCalledTimes(1);
    expect(disc.getSnapshot()).toEqual([]);
  });

  it('returned unsubscribe from on() removes the listener', async () => {
    const { browser, factory } = makeFakeBonjour();
    const disc = createHubDiscovery({
      channel: CHANNEL,
      bonjour: factory as unknown as BonjourFactory,
      debounceMs: DEBOUNCE,
      staleMs: STALE,
      dropMs: DROP,
    });
    const changes: DiscoveredHub[][] = [];
    const off = disc.on('changed', (hubs) => changes.push(hubs));

    disc.start();
    browser.emitUp(makeHubSvc());
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(changes).toHaveLength(1);

    off();
    browser.emitUp(makeHubSvc({ id: 'hub-2' }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(changes).toHaveLength(1);

    await disc.stop();
  });
});
