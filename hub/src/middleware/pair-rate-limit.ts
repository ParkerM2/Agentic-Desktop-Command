export interface RateLimiterOpts {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export interface RateLimiter {
  take: (key: string) => RateLimitResult;
  reset: (key: string) => void;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(opts: RateLimiterOpts): RateLimiter {
  const buckets = new Map<string, Bucket>();

  function prune(): void {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  return {
    take(key) {
      prune();
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { allowed: true, remaining: opts.limit - 1 };
      }
      if (bucket.count >= opts.limit) {
        return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
      }
      bucket.count += 1;
      return { allowed: true, remaining: opts.limit - bucket.count };
    },
    reset(key) {
      buckets.delete(key);
    },
  };
}
