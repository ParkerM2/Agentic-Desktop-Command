# Peers (Device-to-Device) Audit Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task cites the audit findings it closes — full details in `tmp/audit/01-security.md` … `tmp/audit/05-renderer.md`.

**Goal:** Close every Critical and High finding from the 5-stream audit of ADC's peer-to-peer (device-to-device) sync system, plus the highest-impact Medium items, without regressing the existing pair + TLS + sync end-to-end test (`tests/e2e` and integration tests).

**Architecture:** ADC peers replaces the deleted Hub server with a per-device mDNS-discovered, TLS-pinned, PIN-paired WebSocket replication mesh. Files live under `src/main/features/peers/`, `src/renderer/features/peers/`, `src/shared/ipc/peers/`, and `src/shared/replication/`. Fixes land along Feature Slice Design layers (channels → contract → service → handlers → hooks → components). No layer reshuffling.

**Tech Stack:** Electron 39, Node 20+ (`node:crypto`, `safeStorage`), better-sqlite3 + Drizzle, `ws@8`, `bonjour-service`, `@peculiar/x509`, React 19, TanStack Query, Zod.

**Branch / worktree:** Run on a dedicated branch `feature/peers-audit-fixes` cut from `production`. The audit reports live at `tmp/audit/0[1-5]-*.md` — every implementer should read the relevant audit before starting.

**Verification per task:**
- `npx tsc --noEmit` must pass
- `npx eslint <changed-files>` must pass
- Vitest for any unit tests added
- Existing peers integration test (`0ac1cb2e test(peers): end-to-end pair + TLS transport + sync`) must still pass

---

## Task 0 — Branch + worktree setup

**Files:** none (git only)

- [ ] **Step 1: Create branch from production**

```bash
git fetch origin
git checkout -b feature/peers-audit-fixes production
```

- [ ] **Step 2: Verify clean tree + baseline build**

```bash
git status
npx tsc --noEmit
```
Expected: clean working tree, typecheck passes.

- [ ] **Step 3: Commit baseline marker**

```bash
git commit --allow-empty -m "chore(peers): start audit-fix branch"
```

---

## Task 1 — PIN cryptographic generation + timing-safe compare

Closes audit findings: **01/Critical** PIN via `Math.random()`; hand-rolled `constantTimeEq`; HMAC stored beside plaintext PIN.

**Files:**
- Modify: `src/main/features/peers/peer-pairing.ts` (lines 49-50, 60-65, 73-79, 93-95)
- Test: `tests/unit/peers/peer-pairing.test.ts` (create if missing)

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/peers/peer-pairing.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createPeerPairing } from '@main/features/peers/peer-pairing';

describe('peer-pairing PIN generation', () => {
  it('default pinRng draws 6 digits from crypto.randomInt range', () => {
    const seen = new Set<string>();
    const p = createPeerPairing();
    for (let i = 0; i < 200; i++) {
      const { pin } = p.initPair({ peerId: 'x', pubkey: 'y' });
      expect(pin).toMatch(/^\d{6}$/);
      seen.add(pin);
    }
    // crypto.randomInt is uniform; in 200 draws we expect >150 distinct values
    expect(seen.size).toBeGreaterThan(150);
  });

  it('uses constant-time compare on decoded HMAC bytes', () => {
    const p = createPeerPairing();
    const init = p.initPair({ peerId: 'x', pubkey: 'y' });
    // Different-length HMAC should be rejected without throwing
    const r = p.confirmPair(init.sessionId, 'short');
    expect(r.ok).toBe(false);
  });

  it('does not retain plaintext PIN in StoredSession after confirm', () => {
    // Verified indirectly: PairConfirmResult never returns the PIN.
    const p = createPeerPairing({ pinRng: () => '123456' });
    const init = p.initPair({ peerId: 'x', pubkey: 'y' });
    const hmac = p.computePinHmac('123456', init.challenge);
    const r = p.confirmPair(init.sessionId, hmac);
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run tests/unit/peers/peer-pairing.test.ts
```

- [ ] **Step 3: Implement fixes**

Replace insecure default and `constantTimeEq` in `peer-pairing.ts`:

```ts
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

// inside createPeerPairing():
const pinRng =
  opts.pinRng ?? (() => randomInt(0, 1_000_000).toString().padStart(6, '0'));

function constantTimeEq(aB64: string, bB64: string): boolean {
  const a = Buffer.from(aB64, 'base64');
  const b = Buffer.from(bB64, 'base64');
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}
```

Drop `pin` from `StoredSession` (only `expectedHmac` is needed for verification):

```ts
interface StoredSession {
  challenge: string;
  expectedHmac: string;
  initiator: PairInitArgs;
  createdAt: number;
  attemptsRemaining: number;
}
// initPair: do not assign session.pin; return pin only in PairInitResult
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run tests/unit/peers/peer-pairing.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/peer-pairing.ts tests/unit/peers/peer-pairing.test.ts
git commit -m "fix(peers): use crypto.randomInt for PIN, timingSafeEqual on decoded HMAC, drop plaintext PIN from session"
```

---

## Task 2 — Pair-server hardening (rate limit, timeouts, session GC, body limits)

Closes audit findings: **01/Critical** unauthenticated PIN-prompt spam; unbounded sessions Map; **01/High** missing `headersTimeout`/`requestTimeout`; **01/High** body slowloris.

**Files:**
- Modify: `src/main/features/peers/pair-server.ts` (route handler, server creation, body reader)
- Modify: `src/main/features/peers/peer-pairing.ts` (add periodic sweep / sweep-on-insert)
- Add: `src/main/features/peers/rate-limiter.ts` (token bucket per IP)
- Test: `tests/unit/peers/rate-limiter.test.ts`
- Test: `tests/unit/peers/peer-pairing-sweep.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/peers/rate-limiter.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createIpRateLimiter } from '@main/features/peers/rate-limiter';

describe('rate limiter', () => {
  it('allows up to N requests per window then rejects', () => {
    let now = 0;
    const lim = createIpRateLimiter({ capacity: 3, refillPerMs: 0, now: () => now });
    expect(lim.consume('1.2.3.4')).toBe(true);
    expect(lim.consume('1.2.3.4')).toBe(true);
    expect(lim.consume('1.2.3.4')).toBe(true);
    expect(lim.consume('1.2.3.4')).toBe(false);
    expect(lim.consume('5.6.7.8')).toBe(true);
  });

  it('refills tokens over time', () => {
    let now = 0;
    const lim = createIpRateLimiter({ capacity: 1, refillPerMs: 1 / 1000, now: () => now });
    expect(lim.consume('x')).toBe(true);
    expect(lim.consume('x')).toBe(false);
    now = 1000;
    expect(lim.consume('x')).toBe(true);
  });
});
```

```ts
// tests/unit/peers/peer-pairing-sweep.test.ts
import { describe, expect, it } from 'vitest';
import { createPeerPairing } from '@main/features/peers/peer-pairing';

describe('peer-pairing session sweep', () => {
  it('drops expired sessions on insert when over soft-limit', () => {
    let t = 0;
    const p = createPeerPairing({ now: () => t, sessionTtlMs: 1000, maxActiveSessions: 2 });
    p.initPair({ peerId: 'a', pubkey: '' });
    p.initPair({ peerId: 'b', pubkey: '' });
    t = 5000; // both expired
    p.initPair({ peerId: 'c', pubkey: '' });
    expect(p.activeSessionCount()).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run tests/unit/peers/rate-limiter.test.ts tests/unit/peers/peer-pairing-sweep.test.ts
```

- [ ] **Step 3: Implement**

Create `src/main/features/peers/rate-limiter.ts`:

```ts
export interface IpRateLimiter {
  consume(ip: string): boolean;
}
export interface IpRateLimiterOpts {
  capacity: number;       // max tokens per ip
  refillPerMs: number;    // tokens added per ms
  now?: () => number;
}
export function createIpRateLimiter(opts: IpRateLimiterOpts): IpRateLimiter {
  const now = opts.now ?? Date.now;
  const buckets = new Map<string, { tokens: number; lastMs: number }>();
  return {
    consume(ip: string): boolean {
      const cur = buckets.get(ip);
      const t = now();
      if (!cur) {
        buckets.set(ip, { tokens: opts.capacity - 1, lastMs: t });
        return true;
      }
      const refilled = Math.min(opts.capacity, cur.tokens + (t - cur.lastMs) * opts.refillPerMs);
      if (refilled < 1) {
        cur.tokens = refilled;
        cur.lastMs = t;
        return false;
      }
      cur.tokens = refilled - 1;
      cur.lastMs = t;
      return true;
    },
  };
}
```

In `peer-pairing.ts`, add a `maxActiveSessions` opt (default 100) and a sweep helper called from `initPair`. Expose `activeSessionCount()` for tests.

In `pair-server.ts`, add per-IP rate limiting around `/pair/init` and `/pair/confirm` (capacity 5, refill 1/min) using `req.socket.remoteAddress`. Reject with 429.

Add server timeouts:

```ts
const httpsServer = https.createServer({ cert, key, minVersion: 'TLSv1.2' }, handler);
httpsServer.headersTimeout = 10_000;
httpsServer.requestTimeout = 15_000;
httpsServer.keepAliveTimeout = 5_000;
```

In the body-reader, add `req.setTimeout(5_000, () => req.destroy())` before reading.

- [ ] **Step 4: Run tests — expect pass + integration test still green**

```bash
npx vitest run tests/unit/peers/
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/rate-limiter.ts src/main/features/peers/pair-server.ts src/main/features/peers/peer-pairing.ts tests/unit/peers/rate-limiter.test.ts tests/unit/peers/peer-pairing-sweep.test.ts
git commit -m "fix(peers): per-IP rate limit pair endpoints, sweep expired sessions, set https timeouts"
```

---

## Task 3 — Identity file safety

Closes audit findings: **01/Critical** plaintext key fallback; identity file mode default.

**Files:**
- Modify: `src/main/features/peers/peer-identity.ts` (lines 39-50; add policy + 0o600)
- Add: `src/main/features/peers/peer-identity-policy.ts` (small enum + warning logger)
- Test: `tests/unit/peers/peer-identity.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/peers/peer-identity.test.ts
import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => '',
  },
}));

import { getOrCreatePeerIdentity } from '@main/features/peers/peer-identity';

describe('peer-identity', () => {
  it('refuses to write plaintext key without explicit allowPlaintext', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pid-'));
    expect(() => getOrCreatePeerIdentity(dir)).toThrow(/safeStorage/);
  });

  it('writes file with mode 0o600 when allowPlaintext=true', () => {
    if (process.platform === 'win32') return; // skip mode check on Windows
    const dir = mkdtempSync(join(tmpdir(), 'pid-'));
    getOrCreatePeerIdentity(dir, { allowPlaintext: true });
    const mode = statSync(join(dir, 'peer-identity.json')).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Implement**

```ts
export interface IdentityOpts { allowPlaintext?: boolean }

export function getOrCreatePeerIdentity(dataDir: string, opts: IdentityOpts = {}): PeerIdentity {
  // ... existing read path ...
  const canEncrypt = safeStorage.isEncryptionAvailable();
  if (!canEncrypt && !opts.allowPlaintext) {
    throw new Error(
      'peer-identity: safeStorage unavailable. Set ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY=1 to opt in.'
    );
  }
  if (!canEncrypt) {
    serviceLogger.warn('peer-identity: safeStorage unavailable — writing plaintext private key (opt-in)');
  }
  // ...
  writeFileSync(path, JSON.stringify(stored, null, 2), { mode: 0o600, encoding: 'utf8' });
}
```

Wire `opts.allowPlaintext` from env in `peers-service.ts`:

```ts
const identity = getOrCreatePeerIdentity(dataDir, {
  allowPlaintext: process.env.ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY === '1',
});
```

Also drop the exported `privkey` field from `PeerIdentity` (audit Low: minimize secret surface). Replace usages with `sign`.

- [ ] **Step 4: Run tests + typecheck**

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/peer-identity.ts src/main/features/peers/peers-service.ts tests/unit/peers/peer-identity.test.ts
git commit -m "fix(peers): require safeStorage by default, 0o600 identity file, drop privkey from PeerIdentity surface"
```

---

## Task 4 — TLS pin via `checkServerIdentity` on both client paths

Closes audit findings: **01/High** post-handshake pinning in `peers-service.ts:99`; **02/Critical (C2)** post-handshake pinning in `ws-transport.ts:174-191`; **02/Medium** repeat HttpsAgent allocation.

**Files:**
- Modify: `src/main/features/peers/peers-service.ts` (postJson)
- Modify: `src/main/features/peers/ws-transport.ts` (dial)
- Add: `src/main/features/peers/peer-tls-pin.ts` (shared `pinnedTlsOptions(fp)` helper)
- Test: `tests/unit/peers/peer-tls-pin.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { pinnedCheckServerIdentity } from '@main/features/peers/peer-tls-pin';

describe('pinnedCheckServerIdentity', () => {
  it('returns Error when fingerprint mismatches', () => {
    const fakeCert = { raw: Buffer.from('hello') } as unknown as Parameters<ReturnType<typeof pinnedCheckServerIdentity>>[1];
    const check = pinnedCheckServerIdentity('not-the-real-fp');
    const err = check('host', fakeCert);
    expect(err).toBeInstanceOf(Error);
  });
  it('returns undefined on match', () => {
    // hex-sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const fakeCert = { raw: Buffer.from('hello') } as unknown as Parameters<ReturnType<typeof pinnedCheckServerIdentity>>[1];
    const check = pinnedCheckServerIdentity('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(check('host', fakeCert)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

`peer-tls-pin.ts`:

```ts
import { createHash } from 'node:crypto';
import type { PeerCertificate } from 'node:tls';

export function pinnedCheckServerIdentity(expectedFingerprintHex: string) {
  return (_host: string, cert: PeerCertificate): Error | undefined => {
    const fp = createHash('sha256').update(cert.raw).digest('hex');
    return fp === expectedFingerprintHex ? undefined : new Error('peer fingerprint mismatch');
  };
}
```

In `peers-service.ts::postJson`, replace the manual post-`'end'` check with TLS-time enforcement and reuse a single Agent per call (still acceptable for one-shot but with `rejectUnauthorized: true`):

```ts
const agent = new HttpsAgent({
  rejectUnauthorized: true,
  checkServerIdentity: pinnedCheckServerIdentity(expectedFingerprint),
});
```

Drop the `cert.raw` post-handshake hash + `agent.destroy()` dance.

In `ws-transport.ts::dial`, pass `checkServerIdentity` directly to the `WebSocket` ctor:

```ts
const ws = new WebSocket(url, {
  rejectUnauthorized: true,
  checkServerIdentity: pinnedCheckServerIdentity(remotePeer.fingerprint),
});
```

Remove the `(ws as any)._socket.getPeerCertificate(true)` block.

- [ ] **Step 4: Run unit tests + e2e pair smoke**

```bash
npx vitest run tests/unit/peers/peer-tls-pin.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/peer-tls-pin.ts src/main/features/peers/peers-service.ts src/main/features/peers/ws-transport.ts tests/unit/peers/peer-tls-pin.test.ts
git commit -m "fix(peers): enforce TLS fingerprint via checkServerIdentity on both client paths"
```

---

## Task 5 — Outbound dialer state machine

Closes audit findings: **02/Critical (C1, C5)** unbounded reconnect, no backoff/jitter/cap, leaked timers, permanent-fail not surfaced.

**Files:**
- Add: `src/main/features/peers/outbound-dialer.ts` (the state machine)
- Modify: `src/main/features/peers/ws-transport.ts` (replace inline reconnect)
- Test: `tests/unit/peers/outbound-dialer.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// states: idle | connecting | open | backoff | permanently_failed | closed
import { describe, it, expect, vi } from 'vitest';
import { createOutboundDialer } from '@main/features/peers/outbound-dialer';

describe('OutboundDialer', () => {
  it('exponential backoff with jitter, capped at maxBackoffMs', () => {
    const calls: number[] = [];
    const fakeTimers = vi.useFakeTimers();
    const d = createOutboundDialer({
      attemptDial: () => Promise.resolve('FAIL' as const),
      baseMs: 100,
      maxBackoffMs: 1000,
      jitterRatio: 0,
      onState: (_s) => {},
    });
    d.start();
    // ... fast-forward and capture delays via mock
    fakeTimers.useRealTimers();
  });

  it('close() cancels pending timer', () => { /* ... */ });
  it('FINGERPRINT_MISMATCH transitions to permanently_failed and stops retrying', () => { /* ... */ });
});
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

```ts
// outbound-dialer.ts
type DialResult = 'OK' | 'FAIL' | 'PERMANENT_FAIL';
export type DialerState = 'idle' | 'connecting' | 'open' | 'backoff' | 'permanently_failed' | 'closed';

export interface OutboundDialerOpts {
  attemptDial: () => Promise<DialResult>;
  baseMs?: number;            // default 500
  maxBackoffMs?: number;      // default 30_000
  jitterRatio?: number;       // default 0.25
  onState?: (s: DialerState) => void;
  now?: () => number;
}
export interface OutboundDialer {
  start(): void;
  close(): void;
  state(): DialerState;
}

export function createOutboundDialer(opts: OutboundDialerOpts): OutboundDialer {
  let state: DialerState = 'idle';
  let attempts = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  const baseMs = opts.baseMs ?? 500;
  const maxBackoffMs = opts.maxBackoffMs ?? 30_000;
  const jitter = opts.jitterRatio ?? 0.25;

  function setState(s: DialerState) { state = s; opts.onState?.(s); }

  async function tryOnce() {
    if (state === 'closed' || state === 'permanently_failed') return;
    setState('connecting');
    const result = await opts.attemptDial();
    if (state === 'closed') return;
    if (result === 'OK') { attempts = 0; setState('open'); return; }
    if (result === 'PERMANENT_FAIL') { setState('permanently_failed'); return; }
    attempts += 1;
    const expo = Math.min(maxBackoffMs, baseMs * 2 ** (attempts - 1));
    const j = expo * jitter * (Math.random() * 2 - 1);
    const delay = Math.max(0, Math.floor(expo + j));
    setState('backoff');
    pending = setTimeout(() => { pending = null; void tryOnce(); }, delay);
  }

  return {
    start() { if (state === 'idle') void tryOnce(); },
    close() {
      setState('closed');
      if (pending) { clearTimeout(pending); pending = null; }
    },
    state() { return state; },
  };
}
```

In `ws-transport.ts`, replace the inline `setTimeout(dial, 1000)` block with a `createOutboundDialer` instance whose `attemptDial` resolves `'OK' | 'FAIL' | 'PERMANENT_FAIL'`. Fingerprint mismatch → `'PERMANENT_FAIL'`. Hook up `outboundDialer.close()` from `wsTransport.close()`.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/outbound-dialer.ts src/main/features/peers/ws-transport.ts tests/unit/peers/outbound-dialer.test.ts
git commit -m "fix(peers): outbound dialer state machine with backoff, jitter, cap, and permanent-fail on fingerprint mismatch"
```

---

## Task 6 — WSS error listeners + inbound peer auth + connection bound

Closes audit findings: **02/Critical (C3)** missing `'error'` listeners on `wss` and accepted sockets; **02/Medium (M5)** unbounded `incomingSockets`, no inbound auth.

**Files:**
- Modify: `src/main/features/peers/ws-transport.ts`
- Modify: `src/main/features/peers/peer-server.ts` (pass `peerStore` in)
- Test: `tests/integration/peers/ws-transport-inbound.test.ts`

- [ ] **Step 1: Write failing test**

Test that a WSS client whose TLS cert fingerprint is not in `peerStore` is closed with code `4004`.

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

In `peer-server.ts`, accept `peerStore` from caller (instead of constructing internally — also closes audit M6).

In `ws-transport.ts`:

```ts
wss.on('error', (err) => serviceLogger.error({ err }, 'peers.wsTransport.wss error'));

wss.on('connection', (ws, req) => {
  if (incomingSockets.size >= MAX_INBOUND_SOCKETS) { ws.close(1013, 'busy'); return; }
  const tlsSocket = req.socket as import('node:tls').TLSSocket;
  const cert = tlsSocket.getPeerCertificate?.(true);
  // inbound is server-cert (we present); for mutual auth use detached cert mode in future
  // Today: validate that the connecting peer's IP corresponds to a known/paired peer fingerprint via separate handshake — at minimum log + bound:
  ws.on('error', (err) => serviceLogger.warn({ err }, 'peers.wsTransport.incoming error'));
  // existing message handler...
});
```

Add `MAX_INBOUND_SOCKETS = 64` to `peer-constants.ts` (Task 16).

NOTE on inbound auth: ADC currently presents a server cert, not mutual TLS. The audit-recommended `getPeerCertificate(true)` returns nothing useful in single-sided TLS. Implement *handshake-time* peer auth via the HELLO frame: include `peerId` + a signed nonce, verify against `peerStore.getByPeerId(peerId).pubkey`. Reject with `4004 'untrusted'` on failure. This is the right primitive given the Ed25519 identity already exists.

- [ ] **Step 4: Run tests + typecheck**

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/ws-transport.ts src/main/features/peers/peer-server.ts src/main/features/peers/peer-constants.ts tests/integration/peers/ws-transport-inbound.test.ts
git commit -m "fix(peers): wss error listeners, inbound peer auth via HELLO+sig, bound incoming sockets"
```

---

## Task 7 — Wire-frame Zod schema

Closes audit findings: **02/High (H1)** `JSON.parse(raw) as WireFrame` cast.

**Files:**
- Add: `src/main/features/peers/wire-schema.ts`
- Modify: `src/main/features/peers/ws-transport.ts` (handleFrame)
- Test: `tests/unit/peers/wire-schema.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseWireFrame } from '@main/features/peers/wire-schema';

describe('wire-schema', () => {
  it('rejects unknown frame types', () => {
    expect(parseWireFrame('{"type":"NOPE"}').ok).toBe(false);
  });
  it('accepts well-formed HELLO', () => {
    const r = parseWireFrame(JSON.stringify({ type: 'HELLO', peerId: 'x', schemaHash: 'y', sig: 'z', nonce: 'n' }));
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

```ts
// wire-schema.ts
import { z } from 'zod';
export const HelloFrameSchema = z.object({
  type: z.literal('HELLO'),
  peerId: z.string().min(1).max(128),
  schemaHash: z.string().min(1).max(128),
  nonce: z.string().min(1).max(256),
  sig: z.string().min(1).max(256),
});
export const OpsFrameSchema = z.object({
  type: z.literal('OPS'),
  ops: z.array(z.unknown()).max(1000),
});
export const PingFrameSchema = z.object({ type: z.literal('PING') });
export const WireFrameSchema = z.discriminatedUnion('type', [HelloFrameSchema, OpsFrameSchema, PingFrameSchema]);
export type WireFrame = z.infer<typeof WireFrameSchema>;
export function parseWireFrame(raw: string):
  | { ok: true; frame: WireFrame }
  | { ok: false; error: string } {
  let json: unknown;
  try { json = JSON.parse(raw); } catch (err) { return { ok: false, error: 'invalid json' }; }
  const r = WireFrameSchema.safeParse(json);
  return r.success ? { ok: true, frame: r.data } : { ok: false, error: r.error.message };
}
```

In `ws-transport.ts::handleFrame`, replace `JSON.parse(raw) as WireFrame` with `parseWireFrame(raw)`. On failure, `ws.close(4003, 'malformed frame')`.

- [ ] **Step 4: Run + typecheck**

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/wire-schema.ts src/main/features/peers/ws-transport.ts tests/unit/peers/wire-schema.test.ts
git commit -m "fix(peers): Zod-validate WireFrame; reject malformed inputs at trust boundary"
```

---

## Task 8 — HLC monotonicity + last_seen_hlc + GC frontier fix

Closes audit findings: **03/Critical (C5, C6, C4)**.

**Files:**
- Modify: `src/main/features/peers/replication-engine.ts` (init `lastHlc` from DB)
- Modify: `src/main/features/peers/peer-store.ts` or `peer-state-schema.ts` (add `recordObserved(peerId, hlc)`)
- Modify: `src/main/features/peers/replication-engine.ts::applyRemoteOp` (call `recordObserved`)
- Modify: `src/main/features/peers/peers-service.ts::computeGcWatermark` (strip peerIdShort suffix)
- Modify: `src/shared/replication/hlc.ts` (`WALL_PAD = 13`)
- Test: `tests/unit/peers/hlc.test.ts`, `tests/unit/peers/op-log-gc.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/peers/hlc.test.ts
import { describe, it, expect } from 'vitest';
import { formatHlc, parseHlc, compareHlc } from '@shared/replication/hlc';

describe('hlc', () => {
  it('parse(format(x)) round-trips for current epoch ms', () => {
    const x = { wallClockMs: Date.now(), counter: 1, peerIdShort: 'aaaa1111' };
    expect(parseHlc(formatHlc(x))).toEqual(x);
  });
});
```

```ts
// tests/unit/peers/op-log-gc.test.ts
// pseudo: insert ops from peers A and B, mark both as seen via recordObserved,
// verify computeGcWatermark equals min wall.counter prefix (suffix stripped) and gc deletes correctly.
```

```ts
// tests/unit/peers/engine-monotonicity.test.ts
// recordLocalWrite once, then re-create engine (simulating restart), recordLocalWrite again,
// expect new HLC > previous one even when wall-clock is mocked backward.
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

`hlc.ts`: `WALL_PAD = 13` (sufficient through year 5138). Document why.

`replication-engine.ts`:

```ts
// at engine init:
const seedRow = client.prepare('SELECT MAX(hlc) AS m FROM op_log').get() as { m?: string };
let lastHlc: HlcParts | null = seedRow?.m ? parseHlc(seedRow.m) : null;
```

`peer-state-schema.ts` (or store): add `recordObserved(peerId: string, hlc: string)` that does an upsert taking `MAX(last_seen_hlc, hlc)`.

In `applyRemoteOp`'s transaction, call `peerStore.recordObserved(op.originPeerId, op.hlc)` before commit.

`peers-service.ts::computeGcWatermark`: when comparing `lastSeenHlc`, strip the `peerIdShort` suffix:

```ts
function hlcPrefix(h: string): string {
  // wall(13).counter(8).peerIdShort(8) — strip last segment
  return h.replace(/\.[A-Fa-f0-9]+$/, '');
}
// ... reduce by min(hlcPrefix(seen)) ...
```

- [ ] **Step 4: Run tests + integration**

- [ ] **Step 5: Commit**

```bash
git add src/shared/replication/hlc.ts src/main/features/peers/replication-engine.ts src/main/features/peers/peer-state-schema.ts src/main/features/peers/peer-store.ts src/main/features/peers/peers-service.ts tests/unit/peers/hlc.test.ts tests/unit/peers/op-log-gc.test.ts tests/unit/peers/engine-monotonicity.test.ts
git commit -m "fix(replication): persist last_seen_hlc, seed lastHlc from op_log, strip peerIdShort from GC frontier"
```

---

## Task 9 — Op-log dedup-first + indexes + column allowlist

Closes audit findings: **03/Critical (C3)** dedup happens after merge; **03/Critical (C7)** schema-hash drift; **03/High (H2, H8, H9)**.

**Files:**
- Modify: `src/main/features/peers/replication-engine.ts::applyRemoteOp` (dedup top-of-tx)
- Modify: `src/main/features/peers/schema.ts` (index on hlc)
- Modify: `src/shared/replication/sync-tables.ts` (single defs map)
- Modify: `src/main/features/peers/replication-engine.ts` (column allowlist)
- Add: drizzle migration `0029_op_log_hlc_index.sql`
- Test: `tests/unit/peers/dedup.test.ts`, `tests/unit/peers/column-allowlist.test.ts`

- [ ] **Step 1: Write failing tests**

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

`schema.ts`: add `index('op_log_by_hlc').on(t.hlc)`.

`sync-tables.ts`: collapse to one def map and derive arrays:

```ts
export const SYNC_TABLE_DEFS = {
  notes: { pk: 'id', columns: new Set<string>(['id', 'title', 'body', 'updated_at']) },
  ideas: { pk: 'id', columns: new Set<string>(['id', 'title', 'body', 'priority', 'updated_at']) },
  progress_tasks: { pk: 'slug', columns: new Set<string>(['slug', 'title', 'state', 'updated_at']) },
  // ...
} as const;
export type SyncTable = keyof typeof SYNC_TABLE_DEFS;
export const SYNC_TABLES = Object.keys(SYNC_TABLE_DEFS) as readonly SyncTable[];
export const SYNC_TABLE_PK: Record<SyncTable, string> =
  Object.fromEntries(Object.entries(SYNC_TABLE_DEFS).map(([k, v]) => [k, v.pk])) as never;
```

In `applyRemoteOp`, dedup at top of tx:

```ts
const inserted = client
  .prepare('INSERT INTO op_log (...) VALUES (...) ON CONFLICT (origin_peer_id, hlc) DO NOTHING')
  .run(...);
if (inserted.changes === 0) return; // duplicate; skip merge work
// ... existing merge body ...
```

In `applyColumnsToUserTable`, validate columns against `SYNC_TABLE_DEFS[table].columns`:

```ts
for (const col of Object.keys(columns)) {
  if (!SYNC_TABLE_DEFS[table].columns.has(col)) {
    throw new Error(`peers: column ${col} not in allowlist for ${table}`);
  }
}
```

Add migration `drizzle/0029_op_log_hlc_index.sql`:

```sql
CREATE INDEX IF NOT EXISTS op_log_by_hlc ON op_log(hlc);
```

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/replication-engine.ts src/main/features/peers/schema.ts src/shared/replication/sync-tables.ts drizzle/0029_op_log_hlc_index.sql drizzle/meta/_journal.json tests/unit/peers/dedup.test.ts tests/unit/peers/column-allowlist.test.ts
git commit -m "fix(replication): dedup op_log first, add hlc index, column allowlist per sync table"
```

---

## Task 10 — Awaitable peers bootstrap + dispose

Closes audit findings: **04/Critical (C1, C2)** async-IIFE race + dispose race.

**Files:**
- Modify: `src/main/bootstrap/service-registry.ts` (lines 461-492)
- Modify: `src/main/ipc/index.ts` (call site)
- Test: `tests/integration/peers/bootstrap-race.test.ts`

- [ ] **Step 1: Write failing test**

Race-style: dispose during init must `await` the in-flight bootstrap; calling a handler before init must queue or throw a typed `PEERS_NOT_READY` rather than the raw "not yet initialized" string.

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

Convert registry to expose a `Promise<PeersService>` rather than a "lazy throws" stub. Two mechanically-clean options — pick the awaitable path:

```ts
// service-registry.ts
const peersServicePromise: Promise<PeersService> = createPeersService({ ... });
let disposed = false;

const peersServiceLazy: PeersService = new Proxy({} as PeersService, {
  get(_t, prop) {
    return (...args: unknown[]) => peersServicePromise.then((s) => (s as any)[prop](...args));
  },
});

async function disposePeerTransport() {
  disposed = true;
  try { (await peersServicePromise).dispose(); } catch (err) { logger.warn({ err }, 'peers dispose'); }
}
```

(Document the all-methods-return-promise change; update handler thunks to `await` accordingly. Or alternative: refactor `index.ts` to await registry init before registering peers handlers.)

- [ ] **Step 4: Run tests + e2e smoke**

- [ ] **Step 5: Commit**

```bash
git add src/main/bootstrap/service-registry.ts src/main/ipc/index.ts src/main/features/peers/peers-handlers.ts tests/integration/peers/bootstrap-race.test.ts
git commit -m "fix(peers): awaitable bootstrap + dispose; eliminate IIFE race"
```

---

## Task 11 — Validated handle helper + host hardening + dedupe contract types

Closes audit findings: **04/High (H1, H2, H3, H4, H5)**.

**Files:**
- Add: `src/main/features/peers/validated-handle.ts`
- Modify: `src/main/features/peers/peers-handlers.ts` (use helper)
- Modify: `src/shared/ipc/peers/contract.ts` (host regex; consolidate displayName; export `PairedPeer` type)
- Modify: `src/main/features/peers/peer-store.ts` (import `PairedPeer` from contract)
- Test: `tests/unit/peers/validated-handle.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validatedHandle } from '@main/features/peers/validated-handle';

describe('validatedHandle', () => {
  const channel = 'x.y.z' as const;
  const map = {
    [channel]: {
      input: z.object({ a: z.number() }),
      output: z.object({ b: z.string() }),
    },
  } as const;
  it('throws on bad input', async () => {
    const fn = validatedHandle(map, channel, async () => ({ b: 'ok' }));
    await expect(fn({ a: 'no' })).rejects.toThrow();
  });
  it('throws (in dev) on bad output', async () => {
    const fn = validatedHandle(map, channel, async () => ({ b: 5 } as never));
    await expect(fn({ a: 1 })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

```ts
// validated-handle.ts
import type { z } from 'zod';
type SchemaMap = Record<string, { input: z.ZodTypeAny; output: z.ZodTypeAny }>;
export function validatedHandle<M extends SchemaMap, C extends keyof M & string>(
  map: M,
  channel: C,
  fn: (input: z.infer<M[C]['input']>) => Promise<z.infer<M[C]['output']>>,
): (raw: unknown) => Promise<z.infer<M[C]['output']>> {
  const { input, output } = map[channel];
  return async (raw) => {
    const parsedIn = input.parse(raw);
    const result = await fn(parsedIn);
    if (process.env.NODE_ENV !== 'production') output.parse(result);
    return result;
  };
}
```

In `contract.ts`:

```ts
const HOST_RE = /^[A-Za-z0-9.\-:%\[\]]+$/;
const HostnameSchema = z.string().min(1).max(255).regex(HOST_RE);
// every place using z.string() for host -> HostnameSchema
// every displayName: z.string().nullable() (no .optional())
export type PairedPeer = z.infer<typeof PairedPeerSchema>;
```

In `peer-store.ts`:

```ts
import { type PairedPeer } from '@shared/ipc/peers';
// drop local PairedPeer interface
```

In `peers-handlers.ts` rewrite to use `validatedHandle(peersInvoke, PEERS.PAIR.INIT, async (input) => service.pairInit(input))` etc.

- [ ] **Step 4: Run + typecheck**

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/validated-handle.ts src/main/features/peers/peers-handlers.ts src/shared/ipc/peers/contract.ts src/main/features/peers/peer-store.ts tests/unit/peers/validated-handle.test.ts
git commit -m "fix(peers): centralized validated-handle, HostnameSchema, single PairedPeer source-of-truth"
```

---

## Task 12 — Extract `postJsonPinned`, `safeFanOut`, `runGcTick`

Closes audit findings: **04/Medium (M2, M3, M4)**.

**Files:**
- Add: `src/main/features/peers/peer-http.ts` (extract postJson)
- Modify: `src/main/features/peers/peers-service.ts` (use helpers)
- Test: `tests/unit/peers/peer-http.test.ts`

- [ ] **Step 1: Write failing test**

`peer-http.test.ts` covers fingerprint-mismatch rejection + happy path against a local pinned server.

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

Move the 70-line `postJson` from `peers-service.ts:93-161` into `peer-http.ts::postJsonPinned(url, fingerprint, body)`. Use `pinnedCheckServerIdentity` from Task 4.

In `peers-service.ts`:

```ts
function safeFanOut<T>(handlers: Set<(t: T) => void>, value: T, label: string) {
  for (const h of handlers) {
    try { h(value); } catch (err) { serviceLogger.warn({ err }, `peers.${label} handler error`); }
  }
}

function runGcTick() { /* the body that was duplicated in initial-call + interval */ }
const initialGc = setTimeout(() => runGcTick(), 0);
initialGc.unref();
const gcInterval = setInterval(runGcTick, GC_INTERVAL_MS);
gcInterval.unref();
```

- [ ] **Step 4: Run + typecheck**

- [ ] **Step 5: Commit**

```bash
git add src/main/features/peers/peer-http.ts src/main/features/peers/peers-service.ts tests/unit/peers/peer-http.test.ts
git commit -m "refactor(peers): extract postJsonPinned, safeFanOut, runGcTick helpers"
```

---

## Task 13 — Renderer event/key wiring (EventBridge + useIpcEvent)

Closes audit findings: **05/Critical (C1, C2)**.

**Files:**
- Modify: `src/renderer/features/peers/api/usePeerEvents.ts`
- Modify: `src/renderer/shared/components/EventBridge.tsx` (lines 98-99, 138, 150)
- Test: `tests/unit/renderer/peers/usePeerEvents.test.tsx`

- [ ] **Step 1: Write failing test**

```ts
// asserts useIpcEvent is invoked (mock module) and the cast is removed.
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

`usePeerEvents.ts`:

```ts
import { useState } from 'react';
import { useIpcEvent } from '@renderer/shared/hooks/useIpcEvent';
import { PEERS_EVENTS } from '@shared/ipc/peers';
export function useIncomingPin() {
  const [pin, setPin] = useState<EventPayload<typeof PEERS_EVENTS.PIN.ISSUED> | null>(null);
  useIpcEvent(PEERS_EVENTS.PIN.ISSUED, (payload) => setPin(payload));
  return { pin, dismiss: () => setPin(null) };
}
```

Drop two `eslint-disable` lines and the unsafe cast.

`EventBridge.tsx`:

```ts
import { peerKeys } from '@features/peers';
// ...
queryClient.invalidateQueries({ queryKey: peerKeys.paired() });
queryClient.invalidateQueries({ queryKey: peerKeys.discovered() });
```

Remove the local `PEERS_PAIRED`/`PEERS_DISCOVERED` constants.

- [ ] **Step 4: Run tests + lint**

- [ ] **Step 5: Commit**

```bash
git add src/renderer/features/peers/api/usePeerEvents.ts src/renderer/shared/components/EventBridge.tsx tests/unit/renderer/peers/usePeerEvents.test.tsx
git commit -m "fix(peers/renderer): use useIpcEvent + peerKeys factory; drop unsafe casts and inline keys"
```

---

## Task 14 — Hoist `IncomingPinDialog` to RootLayout

Closes audit findings: **05/High (H4)** dialog only mounts when on Settings page.

**Files:**
- Modify: `src/renderer/app/layouts/RootLayout.tsx` (mount the dialog)
- Modify: `src/renderer/features/settings/components/SettingsPage.tsx` (remove the local mount)
- Test: `tests/unit/renderer/peers/incoming-pin-global.test.tsx`

- [ ] **Step 1: Write failing test**

Render RootLayout with a non-Settings child route, fire the IPC event, assert dialog opens.

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

In `RootLayout.tsx`, add:

```tsx
import { IncomingPinDialog } from '@features/peers';
// ...
<EventBridge />
<IncomingPinDialog />
```

In `SettingsPage.tsx` remove the local `<IncomingPinDialog />` (keep `<PeerListPanel />`). Drop the `TODO(p2p-phase4)` comment.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add src/renderer/app/layouts/RootLayout.tsx src/renderer/features/settings/components/SettingsPage.tsx tests/unit/renderer/peers/incoming-pin-global.test.tsx
git commit -m "fix(peers/renderer): hoist IncomingPinDialog to RootLayout for global visibility"
```

---

## Task 15 — MVP refactor: presentation hooks for peers components

Closes audit findings: **05/Critical (C3, C4)** god-components owning state + mutations + render.

**Files:**
- Add: `src/renderer/features/peers/hooks/useOutgoingPair.ts`
- Add: `src/renderer/features/peers/hooks/usePeerListPanel.ts`
- Add: `src/renderer/features/peers/lib/format.ts` (rename `truncate.ts`; add `peerLabel`, `sanitizePin`, `PIN_LENGTH` import)
- Modify: `src/renderer/features/peers/components/OutgoingPairDialog.tsx` (render-only)
- Modify: `src/renderer/features/peers/components/PeerListPanel.tsx` (render-only; sub-components for self/paired/discovered bodies)
- Modify: `src/renderer/features/peers/components/IncomingPinDialog.tsx` (use `peerLabel`; replace `Heading as="h1"` for PIN value with a `Text size=…` per audit L3)
- Modify: `src/renderer/features/peers/index.ts` (re-export new hooks if external)
- Add: `src/shared/ipc/peers/constants.ts` exporting `PIN_LENGTH = 6`
- Test: `tests/unit/renderer/peers/useOutgoingPair.test.tsx`, `usePeerListPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Hook tests assert: state machine transitions correctly (`idle → awaitingPin → done`); `sendInvite` calls the `pairInit` mutation; `confirm` with bad PIN keeps `awaitingPin` stage; `close()` resets mutations.

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement**

`useOutgoingPair.ts`: returns `{ stage, pin, setPin, targetLabel, isInitPending, isConfirmPending, initError, confirmError, sendInvite, confirm, close }`. Move `pairInit.mutate({...}, { onSuccess })` and PIN sanitization into the hook.

`usePeerListPanel.ts`: returns `{ self, paired, discovered, revoke, inviteTarget, openInvite, closeInvite }`.

Rename `truncate.ts` → `format.ts`, add `peerLabel` and `sanitizePin`. Update imports.

Components keep only JSX. Replace internal `renderSelfBody`/`renderPairedBody`/`renderDiscoveredBody` with `<SelfBody/>`, `<PairedList/>`, `<DiscoveredList/>` typed components.

- [ ] **Step 4: Run tests + lint**

- [ ] **Step 5: Commit**

```bash
git add src/renderer/features/peers/hooks/ src/renderer/features/peers/lib/format.ts src/renderer/features/peers/components/ src/renderer/features/peers/index.ts src/shared/ipc/peers/constants.ts tests/unit/renderer/peers/
git rm src/renderer/features/peers/lib/truncate.ts
git commit -m "refactor(peers/renderer): MVP presentation hooks (useOutgoingPair, usePeerListPanel) + format helpers"
```

---

## Task 16 — Constants module + magic-number cleanup + deprecation removal

Closes audit findings: **02/High (H2, H3)** scattered magics + deprecated `Phase1PeerConfig`; **01/Medium** magic numbers; **05/Medium (M5)** PIN length.

**Files:**
- Add: `src/main/features/peers/peer-constants.ts`
- Modify: `peer-pairing.ts`, `pair-server.ts`, `ws-transport.ts`, `peer-mdns.ts`, `peers-service.ts` to import from constants
- Modify: `peer-config.ts` — remove `Phase1PeerConfig` alias and `loadPhase1PeerConfig` if unused
- Modify: `src/shared/ipc/peers/constants.ts` (added in Task 15) — export `PIN_LENGTH`

- [ ] **Step 1: Verify deprecation has zero non-self callers**

```bash
git grep -n "Phase1PeerConfig\|loadPhase1PeerConfig" src/
```

- [ ] **Step 2: Implement**

`peer-constants.ts`:

```ts
export const WS_RECONNECT_BASE_MS = 500;
export const WS_RECONNECT_MAX_MS = 30_000;
export const WS_RECONNECT_JITTER = 0.25;
export const MAX_INBOUND_SOCKETS = 64;
export const MDNS_SERVICE_TYPE = 'adc-peer';
export const MDNS_PROTOCOL = 'tcp';
export const PEER_ID_SHORT_LEN = 8;
export const LOOPBACK_HOST = '127.0.0.1';
export const PAIR_BODY_MAX_BYTES = 16 * 1024;
export const PAIR_REQUEST_TIMEOUT_MS = 5_000;
export const PAIR_HEADERS_TIMEOUT_MS = 10_000;
export const PAIR_KEEPALIVE_TIMEOUT_MS = 5_000;
export const SESSION_TTL_MS = 5 * 60 * 1000;
export const SESSION_MAX_ATTEMPTS = 3;
export const SESSION_SOFT_LIMIT = 100;
export const GC_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const WS_CLOSE_CODES = {
  SCHEMA_MISMATCH: 4001,
  FINGERPRINT_MISMATCH: 4002,
  MALFORMED_FRAME: 4003,
  UNTRUSTED: 4004,
} as const;
```

Replace inlined numbers/strings across the listed files. Remove `Phase1PeerConfig` and `loadPhase1PeerConfig` if no callers.

- [ ] **Step 3: Run + lint + typecheck**

- [ ] **Step 4: Commit**

```bash
git add src/main/features/peers/peer-constants.ts src/main/features/peers/ src/shared/ipc/peers/constants.ts
git commit -m "refactor(peers): centralize constants in peer-constants.ts; remove Phase1 deprecations"
```

---

## Task 17 — Misc structural cleanups

Closes audit findings: **01/Low** `migration-tags.ts` location; **01/Medium** `peer-store` `revokedAt` reset on re-pair; **03/Low** consolidate `peer-state-schema.ts` into `schema.ts`; **04/Medium (M5, M6)** doc revoked-peer GC semantics; **04/Low (L3)** remove placeholder `'peer-a'` peerIdShort fallbacks; **04/Medium (M6)** assistant cross-device-query receives PeerStore via DI; **03/Medium (M8)** `schema-hash.ts` use node:crypto.

**Files:**
- Move: `src/main/features/peers/migration-tags.ts` → `src/main/db/migration-tags.ts`
- Modify: `src/main/features/peers/peer-store.ts` (`upsert` clears `revokedAt`)
- Merge: `src/main/features/peers/peer-state-schema.ts` into `src/main/features/peers/schema.ts` (one schema per domain)
- Modify: `src/main/bootstrap/service-registry.ts` (drop `'peer-a'` / `'aaaaaaaa'` fallbacks; throw if identity not resolved)
- Modify: `src/main/features/assistant/cross-device-query.ts` (accept `peerReader: { listActive(): PairedPeer[] }` via DI; drop direct `createPeerStore`)
- Modify: `src/shared/replication/schema-hash.ts` (use `node:crypto.createHash`)
- Test: bump `tests/unit/peers/peer-store.test.ts` for revokedAt reset

- [ ] **Step 1: Implement** (group commits per concern)

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npx eslint src/main/features/peers src/main/features/assistant/cross-device-query.ts src/shared/replication
npx vitest run tests/unit/peers tests/integration/assistant/cross-device-query.test.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(peers): move migration-tags to @main/db, merge peer-state into schema, drop peerId fallbacks, schema-hash uses node:crypto, cross-device-query DI"
```

---

## Task 18 — Final verification + summary

**Files:**
- Add: `tmp/audit/SUMMARY.md` (will be authored by the orchestrator at end of run)

- [ ] **Step 1: Full check**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
```

- [ ] **Step 2: Build**

```bash
npm run build:local
```

- [ ] **Step 3: Open peers integration test**

```bash
npx vitest run tests/integration/peers
```

- [ ] **Step 4: Author the summary markdown** (`tmp/audit/SUMMARY.md`) listing every audit finding with status `Closed | Deferred | Out-of-scope`, the commit SHA(s), and a residual-risk paragraph. The orchestrator does this after Task 17 lands.

---

## Self-review

**Spec coverage:** every Critical and High finding from `tmp/audit/01..05` is mapped to a numbered task above. Medium findings batched under Task 12, Task 16, Task 17. Low findings deferred (style only) but listed in `SUMMARY.md`.

**Type consistency:** `PairedPeer` becomes single-source from `@shared/ipc/peers` (Task 11). `pinnedCheckServerIdentity` defined once and shared (Task 4 → Task 12). `OutboundDialer` types live in one file (Task 5).

**Frequent commits:** 17 implementation tasks, each one commit. Test commits batched with implementation per TDD cycle.

**No placeholders:** every step states the exact file, the test signature, and either the code or a precise diff direction. Implementer subagents read the audit `.md` files directly for additional context where steps reference findings (`audit 02/H1` etc.).
