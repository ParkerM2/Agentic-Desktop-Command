import { describe, expect, it } from 'vitest';

import { createIpRateLimiter } from '@main/features/peers/rate-limiter';

describe('createIpRateLimiter — token bucket', () => {
  it('allows up to capacity tokens then rejects further consumes', () => {
    const t = 1_000_000;
    const limiter = createIpRateLimiter({
      capacity: 3,
      refillPerMs: 1 / 60_000, // 1 token / minute
      now: () => t,
    });
    expect(limiter.consume('1.2.3.4')).toBe(true);
    expect(limiter.consume('1.2.3.4')).toBe(true);
    expect(limiter.consume('1.2.3.4')).toBe(true);
    expect(limiter.consume('1.2.3.4')).toBe(false);
  });

  it('refills tokens over time based on refillPerMs', () => {
    let t = 1_000_000;
    const limiter = createIpRateLimiter({
      capacity: 3,
      refillPerMs: 1 / 60_000,
      now: () => t,
    });
    expect(limiter.consume('5.6.7.8')).toBe(true);
    expect(limiter.consume('5.6.7.8')).toBe(true);
    expect(limiter.consume('5.6.7.8')).toBe(true);
    expect(limiter.consume('5.6.7.8')).toBe(false);

    // advance clock 60s — should refill 1 token
    t += 60_000;
    expect(limiter.consume('5.6.7.8')).toBe(true);
    expect(limiter.consume('5.6.7.8')).toBe(false);

    // advance another 3 minutes — should refill back to capacity (capped)
    t += 3 * 60_000;
    expect(limiter.consume('5.6.7.8')).toBe(true);
    expect(limiter.consume('5.6.7.8')).toBe(true);
    expect(limiter.consume('5.6.7.8')).toBe(true);
    expect(limiter.consume('5.6.7.8')).toBe(false);
  });

  it('tracks separate buckets per IP', () => {
    const t = 1_000_000;
    const limiter = createIpRateLimiter({
      capacity: 2,
      refillPerMs: 1 / 60_000,
      now: () => t,
    });
    expect(limiter.consume('a')).toBe(true);
    expect(limiter.consume('a')).toBe(true);
    expect(limiter.consume('a')).toBe(false);
    // distinct ip starts fresh
    expect(limiter.consume('b')).toBe(true);
    expect(limiter.consume('b')).toBe(true);
    expect(limiter.consume('b')).toBe(false);
  });
});
