import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

import {
  SESSION_MAX_ATTEMPTS,
  SESSION_SOFT_LIMIT,
  SESSION_TTL_MS,
} from './peer-constants';

export interface PairInitArgs {
  peerId: string;
  pubkey: string;
  fingerprint?: string;
  displayName?: string;
}

export interface PairInitResult {
  sessionId: string;
  pin: string;
  challenge: string;
}

export type PairConfirmResult =
  | { ok: true; initiator: { peerId: string; pubkey: string; fingerprint?: string; displayName?: string } }
  | { ok: false; reason: 'wrong_pin' | 'expired' | 'locked_out' | 'unknown_session' };

export interface PeerPairing {
  initPair: (initiator: PairInitArgs) => PairInitResult;
  confirmPair: (sessionId: string, pinHmac: string) => PairConfirmResult;
  computePinHmac: (pin: string, challenge: string) => string;
  /** Live (non-expired) session count — used by pair-server tests + telemetry. */
  activeSessionCount: () => number;
}

export interface PeerPairingOpts {
  now?: () => number;
  rng?: () => Buffer;
  pinRng?: () => string;
  sessionTtlMs?: number;
  maxAttempts?: number;
  /**
   * Hard cap on the live-session map. Expired entries are swept on every
   * `initPair` call; once the cap is reached new sessions still insert
   * (sweep happens first), but operators should monitor `activeSessionCount`.
   */
  maxActiveSessions?: number;
}

interface StoredSession {
  challenge: string;
  expectedHmac: string;
  initiator: PairInitArgs;
  createdAt: number;
  attemptsRemaining: number;
}

export function createPeerPairing(opts: PeerPairingOpts = {}): PeerPairing {
  const now = opts.now ?? Date.now;
  const rng = opts.rng ?? (() => randomBytes(32));
  const pinRng = opts.pinRng ?? (() => randomInt(0, 1_000_000).toString().padStart(6, '0'));
  const sessionTtlMs = opts.sessionTtlMs ?? SESSION_TTL_MS;
  const maxAttempts = opts.maxAttempts ?? SESSION_MAX_ATTEMPTS;
  const maxActiveSessions = opts.maxActiveSessions ?? SESSION_SOFT_LIMIT;

  const sessions = new Map<string, StoredSession>();

  function sweepExpired(currentMs: number): void {
    for (const [id, session] of sessions) {
      if (currentMs - session.createdAt > sessionTtlMs) {
        sessions.delete(id);
      }
    }
    // Soft cap: if still over the limit after sweep, evict the oldest entries.
    // Map iteration order is insertion order, so the first N keys are oldest.
    if (sessions.size >= maxActiveSessions) {
      const overflow = sessions.size - maxActiveSessions + 1;
      let removed = 0;
      for (const id of sessions.keys()) {
        if (removed >= overflow) break;
        sessions.delete(id);
        removed += 1;
      }
    }
  }

  function computeHmac(pin: string, challenge: string): string {
    return createHmac('sha256', Buffer.from(challenge, 'base64')).update(pin).digest('base64');
  }

  function constantTimeEq(a: string, b: string): boolean {
    let bufA: Buffer;
    let bufB: Buffer;
    try {
      bufA = Buffer.from(a, 'base64');
      bufB = Buffer.from(b, 'base64');
    } catch {
      return false;
    }
    if (bufA.length !== bufB.length) return false;
    if (bufA.length === 0) return false;
    return timingSafeEqual(bufA, bufB);
  }

  return {
    initPair(initiator) {
      const currentMs = now();
      // sweep expired entries first so the live map stays bounded even
      // under steady churn — see audit 01-security: "unbounded session map".
      sweepExpired(currentMs);
      const sessionId = randomUUID();
      const challenge = rng().toString('base64');
      const pin = pinRng();
      const expectedHmac = computeHmac(pin, challenge);
      sessions.set(sessionId, {
        challenge,
        expectedHmac,
        initiator,
        createdAt: currentMs,
        attemptsRemaining: maxAttempts,
      });
      return { sessionId, pin, challenge };
    },

    confirmPair(sessionId, pinHmac) {
      const session = sessions.get(sessionId);
      if (!session) return { ok: false, reason: 'unknown_session' };

      if (now() - session.createdAt > sessionTtlMs) {
        sessions.delete(sessionId);
        return { ok: false, reason: 'expired' };
      }

      if (constantTimeEq(pinHmac, session.expectedHmac)) {
        sessions.delete(sessionId);
        return { ok: true, initiator: session.initiator };
      }

      session.attemptsRemaining -= 1;
      if (session.attemptsRemaining <= 0) {
        sessions.delete(sessionId);
        return { ok: false, reason: 'locked_out' };
      }
      return { ok: false, reason: 'wrong_pin' };
    },

    computePinHmac(pin, challenge) {
      return computeHmac(pin, challenge);
    },

    activeSessionCount() {
      return sessions.size;
    },
  };
}
