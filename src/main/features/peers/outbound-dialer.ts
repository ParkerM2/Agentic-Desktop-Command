/**
 * OutboundDialer — state machine that drives the outbound peer-sync WebSocket
 * with exponential backoff + jitter, a max-backoff cap, single-flight guard,
 * a cancellable pending timer, and a terminal `permanently_failed` state for
 * cases the caller declares non-recoverable (e.g. TLS fingerprint mismatch).
 *
 * Audit refs: 02-transport.md C1 (no backoff/jitter/cap, leaks timers, no dedup)
 * and 02-transport.md C5 (permanent-fail on fingerprint mismatch).
 */

export type DialResult = 'OK' | 'FAIL' | 'PERMANENT_FAIL';

export type DialerState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'backoff'
  | 'permanently_failed'
  | 'closed';

export interface OutboundDialerOpts {
  /**
   * Caller-supplied dial routine. Must resolve to:
   *   - `'OK'` on a successful connection (resets the attempts counter)
   *   - `'FAIL'` on a transient error (schedules backoff)
   *   - `'PERMANENT_FAIL'` on a non-recoverable error (terminates the dialer)
   *
   * Must not throw — wrap in try/catch and convert to `'FAIL'` if needed.
   */
  attemptDial: () => Promise<DialResult>;
  /** Base delay in ms for exponential backoff. Default 500. */
  baseMs?: number;
  /** Maximum backoff delay in ms. Default 30_000. */
  maxBackoffMs?: number;
  /** Symmetric jitter ratio applied to each delay (0..1). Default 0.25. */
  jitterRatio?: number;
  /** Optional state-change observer. */
  onState?: (s: DialerState) => void;
  /** RNG override for deterministic tests. Default Math.random. */
  random?: () => number;
}

export interface OutboundDialer {
  /**
   * Begin (or resume from `backoff`) the dial loop. No-op if already
   * connecting / open / permanently_failed / closed.
   */
  start: () => void;
  /** Cancel any pending timer and transition to `closed`. Idempotent. */
  close: () => void;
  /** Current state. */
  state: () => DialerState;
}

export function createOutboundDialer(opts: OutboundDialerOpts): OutboundDialer {
  const {
    attemptDial,
    baseMs = 500,
    maxBackoffMs = 30_000,
    jitterRatio = 0.25,
    onState,
    random = Math.random,
  } = opts;

  let current: DialerState = 'idle';
  let attempts = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;

  function setState(next: DialerState): void {
    if (current === next) return;
    current = next;
    onState?.(next);
  }

  function clearPending(): void {
    if (pending !== null) {
      clearTimeout(pending);
      pending = null;
    }
  }

  function computeDelay(): number {
    // attempts is 1-based at this point (incremented in runDial before calling)
    const exponent = Math.max(0, attempts - 1);
    const raw = baseMs * Math.pow(2, exponent);
    const capped = Math.min(maxBackoffMs, raw);
    if (jitterRatio <= 0) return capped;
    // symmetric jitter: capped * (1 - r) .. capped * (1 + r)
    const span = capped * jitterRatio;
    const offset = (random() * 2 - 1) * span;
    return Math.max(0, capped + offset);
  }

  function scheduleBackoff(): void {
    setState('backoff');
    const delay = computeDelay();
    const handle = setTimeout(() => {
      pending = null;
      // Race-safe: ignore the fired timer if dialer was closed or permanently failed
      // while waiting.
      if (current === 'closed' || current === 'permanently_failed') return;
      runDial();
    }, delay);
    if (typeof handle.unref === 'function') {
      handle.unref();
    }
    pending = handle;
  }

  function runDial(): void {
    // single-flight guard — only run when allowed
    if (current !== 'idle' && current !== 'backoff') return;
    setState('connecting');
    attempts += 1;
    void attemptDial().then(
      (result) => {
        // Result may arrive after close() / permanent-fail — drop it.
        if (current === 'closed' || current === 'permanently_failed') {
          return null;
        }
        if (result === 'OK') {
          attempts = 0;
          setState('open');
          return null;
        }
        if (result === 'PERMANENT_FAIL') {
          clearPending();
          setState('permanently_failed');
          return null;
        }
        // 'FAIL' → backoff
        scheduleBackoff();
        return null;
      },
      () => {
        // Defensive: attemptDial threw despite the contract. Treat as FAIL.
        if (current === 'closed' || current === 'permanently_failed') {
          return null;
        }
        scheduleBackoff();
        return null;
      },
    );
  }

  return {
    start(): void {
      if (current !== 'idle' && current !== 'backoff') return;
      clearPending();
      runDial();
    },
    close(): void {
      if (current === 'closed') return;
      clearPending();
      setState('closed');
    },
    state(): DialerState {
      return current;
    },
  };
}
