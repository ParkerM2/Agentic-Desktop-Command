/**
 * Token-bucket per-IP rate limiter.
 *
 * Pure function — no timers. Tokens refill on read, capped at `capacity`.
 * Buckets unused beyond `cleanupAfterMs` (default: 10× `capacity / refillPerMs`)
 * are evicted opportunistically to bound memory.
 *
 * Used by pair-server to throttle `/pair/init` + `/pair/confirm` POSTs.
 */

export interface IpRateLimiterOpts {
  /** Maximum tokens a single IP can hold. */
  capacity: number;
  /** Tokens refilled per millisecond (e.g. 1/60_000 = one token per minute). */
  refillPerMs: number;
  /** Clock injection (test-only). Defaults to Date.now. */
  now?: () => number;
  /** How long an idle bucket lingers before eviction. Defaults to 10× full-refill window. */
  cleanupAfterMs?: number;
}

export interface IpRateLimiter {
  /** Returns true if a token was consumed; false when the bucket is empty. */
  consume: (ip: string) => boolean;
}

interface Bucket {
  tokens: number;
  lastMs: number;
}

export function createIpRateLimiter(opts: IpRateLimiterOpts): IpRateLimiter {
  const { capacity, refillPerMs } = opts;
  if (capacity <= 0) throw new Error('capacity must be > 0');
  if (refillPerMs <= 0) throw new Error('refillPerMs must be > 0');
  const now = opts.now ?? Date.now;
  // default cleanup window = 10× the time it takes to fully refill an empty bucket
  const cleanupAfterMs = opts.cleanupAfterMs ?? (capacity / refillPerMs) * 10;

  const buckets = new Map<string, Bucket>();
  let lastCleanupMs = now();

  function maybeCleanup(currentMs: number): void {
    // amortized eviction — only sweep when we've drifted at least one cleanup window
    if (currentMs - lastCleanupMs < cleanupAfterMs) return;
    lastCleanupMs = currentMs;
    for (const [ip, bucket] of buckets) {
      if (currentMs - bucket.lastMs > cleanupAfterMs) {
        buckets.delete(ip);
      }
    }
  }

  return {
    consume(ip: string): boolean {
      const currentMs = now();
      maybeCleanup(currentMs);

      let bucket = buckets.get(ip);
      if (bucket) {
        const elapsed = currentMs - bucket.lastMs;
        if (elapsed > 0) {
          bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
          bucket.lastMs = currentMs;
        }
      } else {
        bucket = { tokens: capacity, lastMs: currentMs };
        buckets.set(ip, bucket);
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return true;
      }
      return false;
    },
  };
}
