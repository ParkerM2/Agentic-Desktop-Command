# Audit 02 — Peers Transport Layer

Scope: `peer-server.ts`, `ws-transport.ts`, `peer-mdns.ts`, `peer-config.ts`.

## Critical (correctness/leak)

### C1. `dial()` reconnect has no backoff, no jitter, no max retries, no dedup
`src/main/features/peers/ws-transport.ts:167-202`

`ws.on('close', ...)` schedules `setTimeout(dial, 1000)` unconditionally. If the remote is hard-down or the TLS fingerprint never matches, this will reconnect every 1 s forever, drowning the network and logger. There is also no guard against multiple in-flight dials: any caller-triggered `dial()` plus a close-triggered re-dial can race and overwrite `outSocket`, leaking the prior socket. The `setTimeout` handle is never tracked, so `close()` cannot cancel a pending re-dial (a reconnect can fire after `shuttingDown=true` already returned, because the timer was set before the flag flipped — actually the flag check happens at the top of `dial`, OK there, but the timer itself is still leaked into the event loop until it fires).

Fix: introduce a dedicated `OutboundDialer` state machine (`idle | connecting | open | backoff | closed`) with exponential backoff + jitter (e.g. `min(30_000, 500 * 2^attempt) ± 25%`), an attempt counter, a single `pendingTimer: NodeJS.Timeout | null` that `close()` clears, and an `inFlight` guard so re-entrant `dial()` calls become no-ops. Reset attempts to 0 on successful HELLO exchange.

### C2. Outbound socket fingerprint check happens AFTER `'open'` — TLS handshake already completed and HELLO is about to be sent
`src/main/features/peers/ws-transport.ts:174-191`

The pin check uses `rejectUnauthorized: false` then validates the cert post-hoc by reaching into `(ws as { _socket })._socket`. Two real problems:

1. By the time `'open'` fires, the TLS handshake is complete, application data may already have been written by other code paths, and the server has accepted the connection. Pinning at the TLS layer (via `checkServerIdentity`) is the correct hook — it rejects during handshake.
2. Reaching into `_socket` is private API. `ws@8` does expose `ws._socket` today but that is undocumented; future versions may rename it.

Fix: pass `checkServerIdentity` in the `WebSocket` options:
```ts
new WebSocket(url, {
  rejectUnauthorized: true,
  checkServerIdentity: (_host, cert) => {
    const fp = createHash('sha256').update(cert.raw).digest('hex');
    return fp === remotePeer.fingerprint ? undefined : new Error('fingerprint mismatch');
  },
});
```
This rejects at TLS time, before any frame can be sent or received.

### C3. WebSocketServer has no `'error'` listener — uncaught error will crash the process
`src/main/features/peers/ws-transport.ts:79-97, 156-164`

`wss` is created but only `'connection'` is wired. If the underlying server emits `'error'` (port in use when not using `existingHttpsServer`, ECONNRESET storm, etc.), Node's EventEmitter throws because there is no `'error'` listener. Same applies to each `ws` returned from `'connection'` — only `'message'` and `'close'` are attached, no `'error'`. A `RST` from a paired peer mid-handshake will throw and terminate the agent host.

Fix: attach `wss.on('error', (err) => serviceLogger.error({ err }, 'peers.wsTransport.wss error'))` and on every accepted `ws` add `ws.on('error', (err) => serviceLogger.warn({ err }, 'peers.wsTransport.incoming error'))`.

### C4. `existingHttpsServer` lifecycle is split across two modules — double-close race
`src/main/features/peers/peer-server.ts:86-93` + `src/main/features/peers/ws-transport.ts:211-225`

`createPeerServer.close()` calls `pair.close()` then `ws.close()` then closes `httpsServer`. `ws.close()` only closes its owned https server, which is correct, but `pair.close()` (in `pair-server.ts`, not in scope but referenced) likely also tries to close the same `existingServer`. If both `pair-server` and `peer-server` invoke `httpsServer.close()` the second call rejects with `ERR_SERVER_NOT_RUNNING`. There is no shared "owns the server" flag.

Fix: in `peer-server.ts`, document and enforce that the unified `httpsServer` is owned exclusively by `createPeerServer`; pass `existingServer` to BOTH `pair` and `ws` purely as an attach target, and inside both factories explicitly set an `ownsServer = false` branch that skips `server.close()`. Add an assertion.

### C5. `outSocket` reference leak after fingerprint mismatch
`src/main/features/peers/ws-transport.ts:178-185`

When the fingerprint check fails, `ws.close(...)` is called but `outSocket = ws` was already assigned at line 173. The `'close'` handler then schedules `dial()` again. This is not catastrophic but `outSocket` momentarily points at a closing socket and `isConnected()` will report `false` once `readyState !== OPEN`, so it self-heals — however the auto-redial loop into a known-bad fingerprint will hammer forever (see C1).

Fix: when the dialer transitions to `backoff` after a fingerprint mismatch, escalate to a `permanently_failed` state and stop retrying, surfaced via an event so the renderer can prompt the user to re-pair.

### C6. mDNS `start()` returns before `published`/`browser` are actually announced
`src/main/features/peers/peer-mdns.ts:95-117`

`bonjour.publish(...)` is fire-and-forget; the call returns immediately and the `'up'` event fires asynchronously after the multicast announcement succeeds. `start()` resolves before that, so callers (peers-service) treat mDNS as ready when it isn't. There is no `'error'` listener on either `published` or `browser`, so a network-stack failure (ENETUNREACH, no multicast interface) is silently dropped.

Fix: attach `published.on('up', ...)` (bonjour-service emits `'up'` on the Service) and resolve only on first `'up'` or after a timeout. Attach `browser.on('error', ...)` and `published.on('error', ...)` and surface through the emitter.

## High (rule violations)

### H1. `WireFrame.type` accepts arbitrary strings via JSON without validation
`src/main/features/peers/ws-transport.ts:120-154`

`JSON.parse(raw) as WireFrame` is a type lie. The CLAUDE.md rule says "Zod validation on all IPC inputs (contract files)". Wire-format input from a remote peer is a stronger trust boundary than IPC and should likewise be Zod-validated. Currently, a malformed `OPS` frame with non-`Op`-shaped objects is passed straight to `engine.applyRemoteOp(op)` which then throws (caught at line 148) — but a truly hostile peer could craft an `Op` shape that bypasses some downstream invariant.

Fix: add a `wire-schema.ts` file in the peers feature folder that defines `WireFrameSchema = z.discriminatedUnion('type', [HelloFrameSchema, OpsFrameSchema, PingFrameSchema])`. Use `safeParse` in `handleFrame` and reject (close 4003) on validation failure. Reuse `Op` schema if one already exists in `@shared/replication`.

### H2. Magic numbers / hardcoded strings scattered across files
- `ws-transport.ts:196` — `setTimeout(dial, 1000)` (reconnect delay)
- `ws-transport.ts:56` — `FINGERPRINT_MISMATCH_CODE = 4002` (only one named, the others 4001/4003 are inline)
- `ws-transport.ts:134` — `ws.close(4001, 'schema mismatch')`
- `ws-transport.ts:87, 93` — `'127.0.0.1'` hardcoded twice
- `peer-mdns.ts:106` — `peerId.slice(0, 8)` magic length
- `peer-mdns.ts:113` — `'adc-peer'` service type repeated at 105 and 113
- `peers-service.ts:222` — `GC_INTERVAL_MS` is named but lives in service, not config
- `peer-config.ts` exposes runtime config via env vars only — no central `peer-constants.ts` for protocol-level constants

Fix: add `src/main/features/peers/peer-constants.ts` with `WS_RECONNECT_BASE_MS`, `WS_RECONNECT_MAX_MS`, `MDNS_SERVICE_TYPE = 'adc-peer'`, `MDNS_PROTOCOL = 'tcp'`, `PEER_ID_SHORT_LEN = 8`, and `WS_CLOSE_CODES = { SCHEMA_MISMATCH: 4001, FINGERPRINT_MISMATCH: 4002, MALFORMED_FRAME: 4003 } as const`. Replace `'127.0.0.1'` with `LOOPBACK_HOST` constant.

### H3. `Phase1PeerConfig` / `loadPhase1PeerConfig` deprecated alias still exported
`src/main/features/peers/peer-config.ts:21, 46-48`

`@deprecated` types live indefinitely. Per CLAUDE.md "no dead code". Either grep callers and remove now, or add a TODO with a removal date.

Fix: `Grep "Phase1PeerConfig"` across `src/`; if zero non-self callers, delete both. Otherwise file a follow-up task.

### H4. `bonjour: () => Bonjour` test override is typed but `now: () => number` is the only actual injection point used in tests
`src/main/features/peers/peer-mdns.ts:14-23`

The interface advertises a bonjour factory hook, but `start()` only invokes it when `opts.bonjour` is truthy. There is no IBonjour interface — the override must produce a real `Bonjour` instance, defeating the point. Tests cannot easily inject a fake browser/publish pair.

Fix: extract a minimal `BonjourLike` interface (`publish`, `find`, `destroy`) and type `opts.bonjour` against it. Or, given the cost, remove the override and use a real `Bonjour` in tests with a randomised port.

## Medium (DRY/maintainability)

### M1. https.Server bootstrap duplicated between `peer-server.ts` and `ws-transport.ts`
`peer-server.ts:43-51` vs `ws-transport.ts:81-91`

Identical pattern: `createHttpsServer({cert,key})`, `await new Promise` over `'error'` + `listen()` callback. With the existingHttpsServer path now in `ws-transport`, the duplicated branch in `ws-transport` is dead in practice (no caller uses `tls` instead of `existingHttpsServer`).

Fix: extract `await listenHttps(server, port, host): Promise<AddressInfo>` helper into a new `peer-net.ts`. If `ws-transport`'s `tls` branch has no callers, delete it (Grep first).

### M2. `dataToString(RawData)` belongs in shared helper module
`src/main/features/peers/ws-transport.ts:58-63`

Useful, generic, and likely needed by future test-runner WS consumers. Keep it FSD-local for now but consider promoting to `@shared/ws/raw.ts` if a second consumer appears.

Fix: leave in place but add a code comment naming the candidate target.

### M3. Frame send is duplicated between `send()` and `broadcastOp()`
`ws-transport.ts:105-118`

`send()` stringifies once per call; `broadcastOp()` stringifies once and sends to N sockets. Two near-identical readyState checks. Build a single primitive `sendRaw(ws, str)` and have both call it.

Fix:
```ts
function sendRaw(ws: WebSocket, str: string) {
  if (ws.readyState === WebSocket.OPEN) ws.send(str);
}
function send(ws: WebSocket, frame: WireFrame) { sendRaw(ws, JSON.stringify(frame)); }
```

### M4. No backpressure on broadcast
`ws-transport.ts:111-118`

`ws.send(str)` ignores the bufferedAmount. With many incoming sockets and a slow consumer, the agent host can balloon memory. Should at minimum log when `ws.bufferedAmount` exceeds a threshold (e.g. 1 MiB) and disconnect that peer.

Fix: in `broadcastOp`, check `ws.bufferedAmount > BACKPRESSURE_LIMIT` and call `ws.terminate()` with a logged warning. Alternatively, queue per-peer with a high-watermark.

### M5. `incomingSockets: Set<WebSocket>` is unbounded — no per-peer eviction
`ws-transport.ts:75, 156-164`

There is no peer authentication on inbound WS connections (only schema-hash check in HELLO), so a single attacker on the LAN can open thousands of sockets. Even with TLS, mutual auth via paired-peer fingerprint is not verified server-side; the inbound `wss` accepts anyone with a valid client cert (and the peer-store gate is missing).

Fix: in the `'connection'` handler, inspect `req.socket.getPeerCertificate(true)` (it's a `TLSSocket` since the https server is TLS), compute the fingerprint, look it up in `peerStore.getByCertFingerprint`, and `ws.close(4004, 'untrusted')` if not paired or revoked. Bound `incomingSockets.size` (e.g. 64) and reject overflow with 1013.

### M6. `peerStore` and `pairing` are constructed twice (once in `peers-service`, once in `peer-server`)
`peer-server.ts:56-57` constructs new `createPeerPairing()` and `createPeerStore(deps.db)` independently of the ones in `peers-service.ts:166-167`.

This is currently safe because `peerStore` is stateless wrt the DB (it's a thin Drizzle wrapper) and `pairing` instance state per session is only held inside `createPairServer`. But it's confusing — two pairing helpers and two store handles for the same DB.

Fix: pass `peerStore` and `pairing` into `createPeerServer` from `peers-service` rather than re-creating; symmetric with how `tls` and `selfIdentity` are passed.

## Low (style/cleanup)

### L1. `WsTransportTlsOpts` and the `tls` branch in `createWsTransport` look unused
`ws-transport.ts:14-17, 81-91`

Every real call site uses `existingHttpsServer`. Dead code per CLAUDE.md.

Fix: Grep for `createWsTransport(` outside tests; if all call sites pass `existingHttpsServer`, remove `tls` entirely (and its branch) — tests can still attach to a server they own.

### L2. Comment "PING is a no-op in Phase 1" implies phased work
`ws-transport.ts:153`

If "Phase 1" terminology is being retired (config file dropped the alias but kept `Phase1PeerConfig`), align comments. Either implement PING/PONG keepalive or drop the case entirely.

### L3. `Bonjour` is imported as a value but typed result of `bonjour.find(...)` requires `ReturnType<Bonjour['find']>`
`peer-mdns.ts:55`

This returns the bonjour-service Browser type. If `bonjour-service` exports it directly as `Browser`, prefer the named import for clarity.

### L4. `createWsTransport` hardcodes loopback even when an explicit `host` exists in `peer-server`
`ws-transport.ts:87, 93`

The unified server already binds to whatever host `peer-server.ts:42` chose, but the legacy paths in `ws-transport` ignore that. Once the legacy paths are deleted (L1) this resolves itself.

### L5. `address()` cast in `peer-server.ts:53` uses `as AddressInfo` without runtime check
Inconsistent with `ws-transport.ts:99-102` which does check. Apply the same defensive parse.

### L6. `parseBool` accepts truthy variants but rejects `"yes"`/`"no"`
`peer-config.ts:23-28`

Minor — many env-config conventions accept `yes/no/on/off`. Either document the strict mapping or expand it.

### L7. `Phase1PeerConfig` JSDoc references itself
`peer-config.ts:18-21` — minor — cycle-by-deprecation; acceptable, but if H3 fix is taken, this disappears.

## Strengths

- **Single TLS server, single port** (`peer-server.ts:43-78`) — clean architectural unification of `/pair/*` HTTP and WSS sync; matches CLAUDE.md FSD co-location.
- **Pure-function fingerprint helper** (`ws-transport.ts:65-69`) is correctly minimal and easy to test.
- **Shutdown is idempotent at the inbound side** — `shuttingDown` flag at `ws-transport.ts:166-168` prevents post-close re-dial; `mdns.stop()` swallows errors with try/catch (`peer-mdns.ts:120-131`).
- **Self-filtering in mDNS** by `peerId === opts.selfPeerId` (`peer-mdns.ts:70`) avoids loopback discovery noise — the right primitive.
- **Test seams** present (`bonjour`, `now` overrides in `peer-mdns.ts`) even if H4 limits their utility.
- **Config is env-driven and centralized** (`peer-config.ts`) — easy to tune in `.env.development` per channel.
- **HLC GC watermark refuses to collect when an active peer is unseen** (`peers-service.ts:228-234`) — safe-by-default.
