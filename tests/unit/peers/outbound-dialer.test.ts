import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createOutboundDialer,
  type DialResult,
  type DialerState,
} from '@main/features/peers/outbound-dialer';

async function flushMicrotasks(): Promise<void> {
  // Run a few cycles of the microtask queue to let chained .then handlers
  // settle without advancing the fake clock.
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

describe('createOutboundDialer — state machine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() invokes attemptDial once', async () => {
    const attemptDial = vi.fn((): Promise<DialResult> => Promise.resolve('OK'));
    const dialer = createOutboundDialer({ attemptDial });
    dialer.start();
    expect(attemptDial).toHaveBeenCalledTimes(1);
    await vi.runOnlyPendingTimersAsync();
  });

  it('transitions idle → connecting → open on OK and resets attempts', async () => {
    const states: DialerState[] = [];
    const attemptDial = vi.fn((): Promise<DialResult> => Promise.resolve('OK'));
    const dialer = createOutboundDialer({
      attemptDial,
      onState: (s) => states.push(s),
    });
    expect(dialer.state()).toBe('idle');
    dialer.start();
    expect(dialer.state()).toBe('connecting');
    // resolve the pending promise
    await vi.runOnlyPendingTimersAsync();
    expect(dialer.state()).toBe('open');
    expect(states).toEqual(['connecting', 'open']);
    // No further attempts should run for far-future timer advancement
    await vi.advanceTimersByTimeAsync(120_000);
    expect(attemptDial).toHaveBeenCalledTimes(1);
  });

  it('on FAIL schedules backoff with baseMs * 2^(attempts-1) capped at maxBackoffMs (jitter=0)', async () => {
    const attemptDial = vi.fn((): Promise<DialResult> => Promise.resolve('FAIL'));
    const baseMs = 500;
    const maxBackoffMs = 4_000;
    const dialer = createOutboundDialer({
      attemptDial,
      baseMs,
      maxBackoffMs,
      jitterRatio: 0,
    });
    dialer.start();
    // attempt 1 runs immediately
    expect(attemptDial).toHaveBeenCalledTimes(1);
    // flush microtasks so the FAIL promise resolves and schedules the backoff
    // timer (without advancing the clock).
    await flushMicrotasks();
    expect(dialer.state()).toBe('backoff');

    // first backoff = 500 * 2^0 = 500ms
    await vi.advanceTimersByTimeAsync(499);
    expect(attemptDial).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(attemptDial).toHaveBeenCalledTimes(2);
    await flushMicrotasks();

    // second backoff = 500 * 2^1 = 1000ms
    await vi.advanceTimersByTimeAsync(999);
    expect(attemptDial).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(attemptDial).toHaveBeenCalledTimes(3);
    await flushMicrotasks();

    // third backoff = 500 * 2^2 = 2000ms
    await vi.advanceTimersByTimeAsync(1999);
    expect(attemptDial).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(attemptDial).toHaveBeenCalledTimes(4);
    await flushMicrotasks();

    // fourth backoff = 500 * 2^3 = 4000 ms (== cap)
    await vi.advanceTimersByTimeAsync(3999);
    expect(attemptDial).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(1);
    expect(attemptDial).toHaveBeenCalledTimes(5);
    await flushMicrotasks();

    // fifth backoff = capped at 4000 ms (would be 8000 otherwise)
    await vi.advanceTimersByTimeAsync(3999);
    expect(attemptDial).toHaveBeenCalledTimes(5);
    await vi.advanceTimersByTimeAsync(1);
    expect(attemptDial).toHaveBeenCalledTimes(6);
  });

  it('on PERMANENT_FAIL state is permanently_failed and no more attempts run', async () => {
    const attemptDial = vi.fn((): Promise<DialResult> => Promise.resolve('PERMANENT_FAIL'));
    const dialer = createOutboundDialer({
      attemptDial,
      baseMs: 100,
      jitterRatio: 0,
    });
    dialer.start();
    await flushMicrotasks();
    expect(dialer.state()).toBe('permanently_failed');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(attemptDial).toHaveBeenCalledTimes(1);
    // re-start is a no-op once permanently_failed
    dialer.start();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(attemptDial).toHaveBeenCalledTimes(1);
    expect(dialer.state()).toBe('permanently_failed');
  });

  it('close() cancels a pending backoff timer and transitions to closed', async () => {
    const attemptDial = vi.fn((): Promise<DialResult> => Promise.resolve('FAIL'));
    const dialer = createOutboundDialer({
      attemptDial,
      baseMs: 1_000,
      jitterRatio: 0,
    });
    dialer.start();
    expect(attemptDial).toHaveBeenCalledTimes(1);
    await flushMicrotasks();
    expect(dialer.state()).toBe('backoff');

    dialer.close();
    expect(dialer.state()).toBe('closed');

    // advance well past the backoff — no further attempts
    await vi.advanceTimersByTimeAsync(60_000);
    expect(attemptDial).toHaveBeenCalledTimes(1);
  });

  it('re-entrant start() while connecting is a no-op', async () => {
    type Resolver = (v: DialResult) => void;
    let resolveDial: Resolver | null = null;
    const attemptDial = vi.fn(
      () => new Promise<DialResult>((resolve) => { resolveDial = resolve; }),
    );
    const dialer = createOutboundDialer({ attemptDial });
    dialer.start();
    expect(dialer.state()).toBe('connecting');
    expect(attemptDial).toHaveBeenCalledTimes(1);
    dialer.start();
    dialer.start();
    expect(attemptDial).toHaveBeenCalledTimes(1);
    (resolveDial as Resolver | null)?.('OK');
    await flushMicrotasks();
    expect(dialer.state()).toBe('open');
  });

  it('state() returns the current state at all times', async () => {
    const attemptDial = vi.fn((): Promise<DialResult> => Promise.resolve('OK'));
    const dialer = createOutboundDialer({ attemptDial });
    expect(dialer.state()).toBe('idle');
    dialer.start();
    expect(dialer.state()).toBe('connecting');
    await vi.runOnlyPendingTimersAsync();
    expect(dialer.state()).toBe('open');
    dialer.close();
    expect(dialer.state()).toBe('closed');
  });

  it('jitter scales delay between (1-r)*base and (1+r)*base when random is provided', async () => {
    // With random() = 0 → minimum bound; with random() = 1 → max bound.
    const attemptDial = vi.fn((): Promise<DialResult> => Promise.resolve('FAIL'));
    const dialer = createOutboundDialer({
      attemptDial,
      baseMs: 1_000,
      jitterRatio: 0.25,
      // random=0 → 1000 * (1 - 0.25) = 750ms delay
      random: () => 0,
    });
    dialer.start();
    await flushMicrotasks();
    expect(dialer.state()).toBe('backoff');
    await vi.advanceTimersByTimeAsync(749);
    expect(attemptDial).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(attemptDial).toHaveBeenCalledTimes(2);
  });
});
