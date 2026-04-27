/**
 * Integration test for the peers bootstrap race (audit 04 C1+C2).
 *
 * Avoids real `createPeersService` (TLS material, peer-server.listen,
 * mDNS) by exercising the registry's bootstrap pattern in isolation:
 * a slow factory + immediate dispose + IPC-shaped method invocation.
 *
 * If `better-sqlite3`'s ABI is broken under the test runner, we cannot
 * stand up a real DB for a full registry boot, so we limit this suite
 * to the pattern itself (no DB needed).
 */

import { describe, expect, it, vi } from 'vitest';

import type { PeersService } from '@main/features/peers/peers-service';
import { wrapAsyncPeersService } from '@main/features/peers/peers-service-async';

interface MiniDisposable {
  dispose: ReturnType<typeof vi.fn>;
  closed: boolean;
  serverClose: ReturnType<typeof vi.fn>;
}

function buildSlowService(delayMs: number): {
  promise: Promise<PeersService>;
  marker: MiniDisposable;
} {
  const serverCloseMock = vi.fn(() => {
    /* close */
  });
  const marker: MiniDisposable = {
    closed: false,
    serverClose: serverCloseMock,
    dispose: vi.fn(),
  };
  marker.dispose = vi.fn((): Promise<void> => {
    marker.closed = true;
    serverCloseMock();
    return Promise.resolve();
  });

  const noopUnsub = (): (() => void) => () => {
    /* unsub */
  };
  const fakeSvc = {
    getIdentity: () => ({ peerId: 'p', pubkey: '', fingerprint: '', displayName: null }),
    getListenPort: () => 0,
    listPaired: () => [],
    listDiscovered: () => [],
    pairInit: vi.fn(),
    pairConfirm: vi.fn(),
    revoke: vi.fn(),
    onPinIssued: noopUnsub,
    onDiscoveryChanged: noopUnsub,
    onTrustChanged: noopUnsub,
    dispose: marker.dispose,
  } as unknown as PeersService;

  const promise = new Promise<PeersService>((resolve) => {
    const t = setTimeout(() => {
      resolve(fakeSvc);
    }, delayMs);
    if (typeof t.unref === 'function') t.unref();
  });
  return { promise, marker };
}

describe('peers bootstrap race', () => {
  it('disposePeerTransport awaits in-flight bootstrap and disposes exactly once', async () => {
    const { promise, marker } = buildSlowService(50);
    let peersDisposed = false;

    // Mirror the registry's disposePeerTransport implementation.
    const disposePeerTransport = async (): Promise<void> => {
      if (peersDisposed) return;
      peersDisposed = true;
      const svc = await promise;
      await svc.dispose();
    };

    // Fire dispose immediately — before the bootstrap factory has resolved.
    const inflight = disposePeerTransport();
    // Calling a second time during the same window is a no-op.
    const secondCall = disposePeerTransport();

    await Promise.all([inflight, secondCall]);

    expect(marker.dispose).toHaveBeenCalledTimes(1);
    expect(marker.closed).toBe(true);
    expect(marker.serverClose).toHaveBeenCalledTimes(1);
  });

  it('IPC-shaped calls during the boot window do not throw and resolve once the service is ready', async () => {
    const { promise } = buildSlowService(40);
    const wrapped = wrapAsyncPeersService(promise);

    // Hit a "synchronous" method right away — no throw, returns Promise.
    const inflight = wrapped.listPaired() as unknown as Promise<unknown[]>;
    expect(typeof (inflight as { then?: unknown }).then).toBe('function');

    const result = await inflight;
    expect(Array.isArray(result)).toBe(true);
  });

  it('rejected bootstrap surfaces on dispose and on method calls (no leaks, no crash)', async () => {
    const failed: Promise<PeersService> = Promise.reject(new Error('tls-failed'));
    failed.catch(() => {
      /* swallow */
    });

    const wrapped = wrapAsyncPeersService(failed);
    await expect(
      wrapped.listPaired() as unknown as Promise<unknown>,
    ).rejects.toThrow(/tls-failed/);

    let peersDisposed = false;
    const disposePeerTransport = async (): Promise<void> => {
      if (peersDisposed) return;
      peersDisposed = true;
      try {
        const svc = await failed;
        await svc.dispose();
      } catch {
        // expected: bootstrap failed before any resource was constructed
      }
    };
    await expect(disposePeerTransport()).resolves.toBeUndefined();
  });
});
