import { describe, expect, it, vi } from 'vitest';

import type { PeersService } from '@main/features/peers/peers-service';
import { wrapAsyncPeersService } from '@main/features/peers/peers-service-async';

/**
 * Build a fake PeersService that exposes the methods/events needed by these
 * tests. Cast at the boundary so the unit tests don't have to fully populate
 * the real interface.
 */
function makeFake(overrides: Partial<PeersService> = {}): PeersService {
  const noop = (): (() => void) => () => {
    /* unsub */
  };
  const fake = {
    getIdentity: () => ({
      peerId: 'peer-A',
      pubkey: 'pk',
      fingerprint: 'fp',
      displayName: null,
    }),
    getListenPort: () => 0,
    listPaired: () => [],
    listDiscovered: () => [],
    pairInit: vi.fn(),
    pairConfirm: vi.fn(),
    revoke: vi.fn(),
    onPinIssued: vi.fn(noop),
    onDiscoveryChanged: vi.fn(noop),
    onTrustChanged: vi.fn(noop),
    dispose: vi.fn((): Promise<void> => Promise.resolve()),
    ...overrides,
  };
  return fake as unknown as PeersService;
}

describe('wrapAsyncPeersService', () => {
  it('forwards method calls and resolves to the inner result', async () => {
    const fake = makeFake({
      listPaired: () => [
        {
          peerId: 'p1',
          pubkey: 'pk',
          certFingerprint: 'fp',
          displayName: null,
          pairedAt: 0,
          revokedAt: null,
          lastSeenHlc: null,
          lastConnectedAt: null,
        },
      ],
    });
    const wrapped = wrapAsyncPeersService(Promise.resolve(fake));

    const result = await (wrapped.listPaired() as unknown as Promise<unknown[]>);

    expect(result).toHaveLength(1);
  });

  it('returns a Promise even for synchronous-shaped methods', () => {
    const fake = makeFake({ listPaired: () => [] });
    const wrapped = wrapAsyncPeersService(Promise.resolve(fake));

    const ret = wrapped.listPaired() as unknown as Promise<unknown>;

    expect(typeof (ret as { then?: unknown }).then).toBe('function');
  });

  it('is race-safe: methods invoked before the inner promise resolves still work', async () => {
    let resolveInner!: (svc: PeersService) => void;
    const innerPromise = new Promise<PeersService>((_resolve) => {
      resolveInner = _resolve;
    });
    const fake = makeFake({
      listPaired: () => [
        {
          peerId: 'late',
          pubkey: 'pk',
          certFingerprint: 'fp',
          displayName: null,
          pairedAt: 0,
          revokedAt: null,
          lastSeenHlc: null,
          lastConnectedAt: null,
        },
      ],
    });

    const wrapped = wrapAsyncPeersService(innerPromise);

    // Fire call BEFORE the promise resolves.
    const inflight = wrapped.listPaired() as unknown as Promise<unknown[]>;

    // Now resolve inner.
    resolveInner(fake);

    const result = await inflight;
    expect(result).toHaveLength(1);
  });

  it('dispose() before resolution awaits the promise then disposes', async () => {
    let resolveInner!: (svc: PeersService) => void;
    const innerPromise = new Promise<PeersService>((_resolve) => {
      resolveInner = _resolve;
    });
    const disposeSpy = vi.fn((): Promise<void> => Promise.resolve());
    const fake = makeFake({ dispose: disposeSpy });

    const wrapped = wrapAsyncPeersService(innerPromise);
    const disposed = wrapped.dispose();

    expect(disposeSpy).not.toHaveBeenCalled();
    resolveInner(fake);
    await disposed;
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error when the wrapped property is not a function on the resolved service', async () => {
    const broken = {} as unknown as PeersService;
    const wrapped = wrapAsyncPeersService(Promise.resolve(broken));

    await expect(
      wrapped.listPaired() as unknown as Promise<unknown>,
    ).rejects.toThrow(/listPaired.*not a function/);
  });

  it('rejected inner promise propagates to every method call', async () => {
    const failed = Promise.reject(new Error('bootstrap-failed'));
    // attach a no-op catch to silence unhandled rejection warnings — the
    // wrapper attaches its own .then() so the rejection lands on the
    // method call, not as an unhandled rejection.
    failed.catch(() => {
      /* swallow */
    });
    const wrapped = wrapAsyncPeersService(failed);

    await expect(
      wrapped.listPaired() as unknown as Promise<unknown>,
    ).rejects.toThrow(/bootstrap-failed/);
  });
});
