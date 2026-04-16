import { describe, expect, it, vi } from 'vitest';

import { pollUntilHealthy } from '@main/features/runners/health-check';

describe('pollUntilHealthy', () => {
  it('resolves healthy on first 2xx', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 200 } as Response);
    const result = await pollUntilHealthy({
      url: 'http://x',
      timeoutMs: 2000,
      intervalMs: 50,
      fetchFn,
    });
    expect(result.healthy).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it('returns unhealthy on timeout', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await pollUntilHealthy({
      url: 'http://x',
      timeoutMs: 200,
      intervalMs: 50,
      fetchFn,
    });
    expect(result.healthy).toBe(false);
  });

  it('eventually succeeds after transient failure', async () => {
    let calls = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      calls += 1;
      if (calls < 3) return Promise.reject(new Error('ECONNREFUSED'));
      return Promise.resolve({ status: 200 } as Response);
    });
    const result = await pollUntilHealthy({
      url: 'http://x',
      timeoutMs: 2000,
      intervalMs: 30,
      fetchFn,
    });
    expect(result.healthy).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});
