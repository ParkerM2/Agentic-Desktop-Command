import type { AuditRepo } from './audit-repo.js';

const DAY_MS = 86_400_000;
const TICK_INTERVAL_MS = 6 * 3_600_000; // 6 hours

export interface RetentionOptions {
  /** How many days to retain pairing_events rows. Defaults to 90. */
  retentionDays?: number;
  /** Interval between purge runs in ms. Defaults to 6 hours. */
  tickIntervalMs?: number;
  /** Optional callback invoked with the row count purged on each run. */
  onPurge?: (purged: number) => void;
}

/**
 * Schedule a periodic purge of audit rows older than `retentionDays`.
 *
 * Runs once synchronously at startup, then every `tickIntervalMs`. The
 * interval is unref'd so it does not keep the event loop alive on shutdown.
 * Returns a `stop()` function that clears the interval.
 */
export function scheduleAuditRetention(
  audit: AuditRepo,
  opts: RetentionOptions = {},
): () => void {
  const retentionDays = opts.retentionDays ?? 90;
  const tickIntervalMs = opts.tickIntervalMs ?? TICK_INTERVAL_MS;
  const ageMs = retentionDays * DAY_MS;

  const run = (): void => {
    const purged = audit.purgeOlderThan(ageMs);
    opts.onPurge?.(purged);
  };

  run(); // Initial purge at startup
  const id = setInterval(run, tickIntervalMs);
  // Ensure the interval doesn't keep the process alive on shutdown.
  id.unref();
  return () => {
    clearInterval(id);
  };
}
