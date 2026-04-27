export interface HealthResult {
  healthy: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
}

export interface PollOptions {
  url: string;
  timeoutMs: number;
  intervalMs?: number;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}

export async function pollUntilHealthy(opts: PollOptions): Promise<HealthResult> {
  const { url, timeoutMs, intervalMs = 500, fetchFn = fetch, signal } = opts;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (signal?.aborted) return { healthy: false, error: 'aborted' };

    const started = Date.now();
    try {
      const res = await fetchFn(url, { signal });
      if (res.status >= 200 && res.status < 400) {
        return { healthy: true, statusCode: res.status, responseTimeMs: Date.now() - started };
      }
    } catch {
      // transient failure — keep polling
    }

    await sleep(intervalMs);
  }

  return { healthy: false, error: 'timeout' };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
