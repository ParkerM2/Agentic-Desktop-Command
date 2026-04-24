import { createHmac, randomBytes, randomUUID } from 'node:crypto';

export interface PairInitArgs {
  peerId: string;
  pubkey: string;
  displayName?: string;
}

export interface PairInitResult {
  sessionId: string;
  pin: string;
  challenge: string;
}

export type PairConfirmResult =
  | { ok: true; initiator: { peerId: string; pubkey: string; displayName?: string } }
  | { ok: false; reason: 'wrong_pin' | 'expired' | 'locked_out' | 'unknown_session' };

export interface PeerPairing {
  initPair: (initiator: PairInitArgs) => PairInitResult;
  confirmPair: (sessionId: string, pinHmac: string) => PairConfirmResult;
  computePinHmac: (pin: string, challenge: string) => string;
}

export interface PeerPairingOpts {
  now?: () => number;
  rng?: () => Buffer;
  pinRng?: () => string;
  sessionTtlMs?: number;
  maxAttempts?: number;
}

interface StoredSession {
  pin: string;
  challenge: string;
  expectedHmac: string;
  initiator: PairInitArgs;
  createdAt: number;
  attemptsRemaining: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 3;

export function createPeerPairing(opts: PeerPairingOpts = {}): PeerPairing {
  const now = opts.now ?? Date.now;
  const rng = opts.rng ?? (() => randomBytes(32));
  const pinRng =
    opts.pinRng ?? (() => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0'));
  const sessionTtlMs = opts.sessionTtlMs ?? DEFAULT_TTL_MS;
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const sessions = new Map<string, StoredSession>();

  function computeHmac(pin: string, challenge: string): string {
    return createHmac('sha256', Buffer.from(challenge, 'base64')).update(pin).digest('base64');
  }

  function constantTimeEq(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  return {
    initPair(initiator) {
      const sessionId = randomUUID();
      const challenge = rng().toString('base64');
      const pin = pinRng();
      const expectedHmac = computeHmac(pin, challenge);
      sessions.set(sessionId, {
        pin,
        challenge,
        expectedHmac,
        initiator,
        createdAt: now(),
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
  };
}
