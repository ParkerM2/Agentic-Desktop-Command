/**
 * Unit tests for createNetworkWatcher.
 *
 * The real watcher polls os.networkInterfaces() and listens to Electron
 * powerMonitor 'resume' events — we inject fakes for both so we can drive
 * interface changes and resume events deterministically with fake timers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNetworkWatcher } from '@main/features/hub/network-watcher';

import type { networkInterfaces as NetworkInterfacesFn } from 'node:os';

type IfaceSnapshot = ReturnType<typeof NetworkInterfacesFn>;

interface FakePowerMonitor {
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  handlers: Map<string, Set<() => void>>;
  emit: (event: string) => void;
  offSpy: ReturnType<typeof vi.fn>;
}

function makeFakePowerMonitor(): FakePowerMonitor {
  const handlers = new Map<string, Set<() => void>>();
  const on = (event: string, handler: () => void): void => {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    set.add(handler);
  };
  const offSpy = vi.fn();
  const off = (event: string, handler: () => void): void => {
    offSpy(event, handler);
    handlers.get(event)?.delete(handler);
  };
  const emit = (event: string): void => {
    const set = handlers.get(event);
    if (!set) return;
    for (const handler of set) handler();
  };
  return { on, off, handlers, emit, offSpy };
}

const SNAPSHOT_A: IfaceSnapshot = {
  eth0: [
    {
      address: '192.168.1.10',
      netmask: '255.255.255.0',
      family: 'IPv4',
      mac: 'aa:bb:cc:dd:ee:ff',
      internal: false,
      cidr: '192.168.1.10/24',
    },
  ],
  lo: [
    {
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      family: 'IPv4',
      mac: '00:00:00:00:00:00',
      internal: true,
      cidr: '127.0.0.1/8',
    },
  ],
};

const SNAPSHOT_B: IfaceSnapshot = {
  eth0: [
    {
      address: '10.0.0.5',
      netmask: '255.255.255.0',
      family: 'IPv4',
      mac: 'aa:bb:cc:dd:ee:ff',
      internal: false,
      cidr: '10.0.0.5/24',
    },
  ],
  lo: [
    {
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      family: 'IPv4',
      mac: '00:00:00:00:00:00',
      internal: true,
      cidr: '127.0.0.1/8',
    },
  ],
};

describe('createNetworkWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not call onChange when interfaces are unchanged across ticks', () => {
    const onChange = vi.fn();
    const pm = makeFakePowerMonitor();
    const unsubscribe = createNetworkWatcher(onChange, {
      intervalMs: 5_000,
      getInterfaces: () => SNAPSHOT_A,
      powerMonitor: pm,
    });

    vi.advanceTimersByTime(5_000);
    vi.advanceTimersByTime(5_000);
    vi.advanceTimersByTime(5_000);

    expect(onChange).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('calls onChange when the interface set changes between ticks', () => {
    const onChange = vi.fn();
    const pm = makeFakePowerMonitor();
    let snapshot: IfaceSnapshot = SNAPSHOT_A;

    const unsubscribe = createNetworkWatcher(onChange, {
      intervalMs: 5_000,
      getInterfaces: () => snapshot,
      powerMonitor: pm,
    });

    vi.advanceTimersByTime(5_000);
    expect(onChange).not.toHaveBeenCalled();

    snapshot = SNAPSHOT_B;
    vi.advanceTimersByTime(5_000);
    expect(onChange).toHaveBeenCalledTimes(1);

    // No further change: onChange should not fire again.
    vi.advanceTimersByTime(5_000);
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("triggers an immediate check on powerMonitor 'resume'", () => {
    const onChange = vi.fn();
    const pm = makeFakePowerMonitor();
    let snapshot: IfaceSnapshot = SNAPSHOT_A;

    const unsubscribe = createNetworkWatcher(onChange, {
      intervalMs: 5_000,
      getInterfaces: () => snapshot,
      powerMonitor: pm,
    });

    snapshot = SNAPSHOT_B;
    // Fire resume before the next 5s tick.
    pm.emit('resume');

    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('stops both timer and resume listener on unsubscribe', () => {
    const onChange = vi.fn();
    const pm = makeFakePowerMonitor();
    let snapshot: IfaceSnapshot = SNAPSHOT_A;

    const unsubscribe = createNetworkWatcher(onChange, {
      intervalMs: 5_000,
      getInterfaces: () => snapshot,
      powerMonitor: pm,
    });

    unsubscribe();

    // Interface change after unsubscribe should not fire via timer.
    snapshot = SNAPSHOT_B;
    vi.advanceTimersByTime(5_000);
    expect(onChange).not.toHaveBeenCalled();

    // Resume after unsubscribe should not fire either — listener was removed.
    pm.emit('resume');
    expect(onChange).not.toHaveBeenCalled();

    expect(pm.offSpy).toHaveBeenCalledWith('resume', expect.any(Function));
    expect(pm.handlers.get('resume')?.size ?? 0).toBe(0);
  });

  it('produces an order-independent hash for interface keys', () => {
    // Same entries, different key insertion order → should be treated as equal.
    const orderedA: IfaceSnapshot = {
      eth0: SNAPSHOT_A.eth0,
      lo: SNAPSHOT_A.lo,
    };
    const orderedB: IfaceSnapshot = {
      lo: SNAPSHOT_A.lo,
      eth0: SNAPSHOT_A.eth0,
    };

    const onChange = vi.fn();
    const pm = makeFakePowerMonitor();
    let snapshot: IfaceSnapshot = orderedA;

    const unsubscribe = createNetworkWatcher(onChange, {
      intervalMs: 5_000,
      getInterfaces: () => snapshot,
      powerMonitor: pm,
    });

    snapshot = orderedB;
    vi.advanceTimersByTime(5_000);
    // Reordered keys must not count as a change.
    expect(onChange).not.toHaveBeenCalled();

    unsubscribe();
  });
});
