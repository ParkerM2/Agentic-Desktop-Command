# Phase 1 Dev Harness — Two-Instance Peer Sync

Two ADC instances on one machine, each with a hardcoded peer address pointing at the other. Writes to `progress_tasks` on one instance appear on the other within ~1 second over WebSocket.

The `ADC-Dev` and `ADC-Local` channels have isolated `userData` directories, so they don't collide on a single machine.

## Terminal 1 — ADC-Dev (peer A)

```bash
ADC_PEER_PORT=7701 \
ADC_PEER_REMOTE=ws://127.0.0.1:7702 \
ADC_PEER_ID_SHORT=aaaaaaaa \
ADC_PEER_ID_FULL=peer-a \
npm run dev
```

## Terminal 2 — ADC-Local (peer B)

Build once:

```bash
npm run build:local
```

`npm run build:local` invokes `electron-vite build` with `ADC_CHANNEL=local`, then runs `electron-builder --win --dir` with `productName=ADC-Local`. The unpacked binary lands in `release/win-unpacked/ADC-Local.exe` (electron-builder `output: release` from `package.json`).

There is no `start:local` / `preview:local` script. Launch the binary directly with env vars:

```bash
ADC_PEER_PORT=7702 \
ADC_PEER_REMOTE=ws://127.0.0.1:7701 \
ADC_PEER_ID_SHORT=bbbbbbbb \
ADC_PEER_ID_FULL=peer-b \
./release/win-unpacked/ADC-Local.exe
```

(macOS/Linux builds will have a different path — `release/mac/ADC-Local.app/Contents/MacOS/ADC-Local` or `release/linux-unpacked/adc-local`. Phase 1 harness was validated on Windows only.)

## What to verify

1. Both windows open. Main-process logs should show `WsTransport listening on 770X` on both sides and a successful outbound connect on both sides.
2. In peer A's UI, create a new progress task with slug `sync-test-1` and title "Created on A".
3. Within ~1 second, peer B's progress view should show `sync-test-1`. (You may need to refresh if the renderer doesn't live-subscribe yet — Phase 1 does not wire renderer events, so expect a stale cache until the next service read.)
4. On peer B, update the task title to "Edited on B". Peer A should update within ~1 second.
5. On peer A, change the status to `executing`. On peer B, edit the title to "Title from B".
6. Both peers should converge to `status=executing` AND the latest title. Column-level LWW means neither edit clobbers the other.
7. On peer A, archive the task. On peer B, confirm the archive applied.
8. On peer A, delete the task. On peer B, confirm the row disappears.

## Troubleshooting

- **"address already in use"** — another instance bound the port. Kill: `taskkill //F //IM electron.exe` (Windows) or `pkill -f electron` (macOS/Linux). Per the project's "always kill before start" convention.
- **Peer does not connect** — verify both env vars are exported in the shell that ran the launch. Env vars set after launch don't take effect.
- **Write on peer A never reaches peer B** — check peer A's main-process logs for `broadcastOp` (if logged at debug level) or any `applyRemoteOp threw` messages. If absent, the service might not be calling `recordLocalWrite`. Grep `progress-service.ts` for `recordLocalWrite` — there should be 4 call sites.
- **Schema mismatch** — Phase 1 does not validate schema hash (Phase 2). Both instances must be on the same `drizzle/` migration set. If you switch branches, re-build and re-launch both.

## Scope reminders

- Phase 1 replicates ONLY `progress_tasks` (see `src/shared/replication/sync-tables.ts`).
- No mDNS discovery, no PIN pairing, no TLS. Hardcoded peer addresses only.
- The renderer does not auto-refresh on incoming sync events — Phase 4 work. Triggering a re-fetch (navigating away and back) shows the updated state.
