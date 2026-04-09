# Hub Relay — Cross-Device Project Access

> **Status**: Design approved
> **Created**: 2026-04-08
> **Priority**: High

## Problem

ADC runs on multiple machines (Windows desktop, MacBook) but projects are tied to the machine they live on. A locked-down work codebase can only be cloned onto the work PC. Today there's no way to sit at the MacBook and work on a Windows-only project, or vice versa.

## Solution

Turn the existing Hub into a **stateful relay** that connects ADC instances across devices on the same LAN. Each machine registers its local projects with the Hub. Any connected ADC instance can claim a remote project and interact with it as if it were local — Claude Code sessions, agent runs, and terminal I/O are relayed through the Hub to the machine that owns the project.

## Core Concepts

### Symmetrical Peers

Both machines are equal. The Windows desktop hosts the Hub Docker container, but that's just infrastructure — it doesn't make Windows special. The MacBook's projects appear on Windows just as naturally as Windows projects appear on MacBook.

### Exclusive Claim Model

Projects are one-device-at-a-time. When you claim a remote project, it appears in your local project list with a Hub badge. On the host machine, the project tab gets a lock overlay ("In use by MacBook") and interactions are disabled. Release is explicit (you close/deselect) or implicit (device goes offline for >60s).

### Relay, Not Replication

The Hub doesn't host projects, run agents, or sync files. Projects stay on their host machine. Claude Code sessions run locally on the machine that owns the project. The Hub relays I/O between the operator's UI and the host machine's Claude process.

---

## Architecture

### Data Flow

```
MacBook ADC                    Hub (Docker)                   Windows ADC
-----------                    ------------                   -----------
                               Device Registry
Register device +          <-- POST /api/heartbeat -->         Register device +
local projects                 Project Index                   local projects

Discover remote            <-- GET /api/projects -->
projects

Claim Windows project      --> POST /projects/:id/claim -->    project.claimed event
                               Set claimed_by                  Lock project tab

session.spawn              --> WebSocket relay -->              Spawn Claude Code
                               Buffer output                   session locally

Render session output      <-- WebSocket relay <--             Stream JSONL output
Send input                 --> WebSocket relay -->              Pipe to Claude stdin

Release project            --> POST /projects/:id/release -->  project.released event
                               Clear claimed_by                Unlock project tab
```

### Hub Server (Fastify + SQLite)

#### Existing Infrastructure (Kept As-Is)

- Fastify with CORS, rate limiting, WebSocket plugin
- SQLite via better-sqlite3 with migration runner
- JWT + API key auth (dual auth on WebSocket handshake)
- Docker auto-provisioning via `docker-service.ts`
- Health check endpoint
- Device registration + heartbeat

#### New Database Tables

**`device_projects`** — Maps devices to their local projects. Upserted on each heartbeat.

| Column | Type | Description |
|--------|------|-------------|
| `device_id` | TEXT FK | References `devices.id` (existing table via heartbeat) |
| `project_id` | TEXT | Project UUID |
| `name` | TEXT | Project display name |
| `path` | TEXT | Absolute path on the host machine |
| `last_seen` | TEXT | ISO 8601 timestamp, updated each heartbeat |

Primary key: `(device_id, project_id)`

**`project_claims`** — Active exclusive locks.

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | TEXT PK | The claimed project |
| `claimed_by_device_id` | TEXT FK | Device that holds the claim |
| `claimed_at` | TEXT | ISO 8601 when claimed |
| `expires_at` | TEXT | Auto-release deadline (heartbeat extends this) |

**`session_relay`** — Active relay sessions.

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | TEXT PK | Unique session identifier |
| `project_id` | TEXT | Project being worked on |
| `source_device_id` | TEXT | Device operating the UI (the claimer) |
| `target_device_id` | TEXT | Device hosting the project (runs Claude) |
| `status` | TEXT | `active`, `ended`, `disconnected` |
| `created_at` | TEXT | ISO 8601 |

**`session_buffer`** — Recent output for reconnect replay. Capped at 200 rows per session.

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | TEXT FK | References `session_relay.session_id` |
| `seq` | INTEGER | Monotonic sequence number |
| `message_json` | TEXT | The JSONL line or event payload |
| `created_at` | TEXT | ISO 8601 |

Primary key: `(session_id, seq)`. Pruned 1 hour after session ends.

#### New REST Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/projects/:id/claim` | Claim a remote project. Body: `{ deviceId }`. Returns 200 on success, 409 if already claimed (includes claimer info). |
| `POST` | `/api/projects/:id/release` | Release a claimed project. Body: `{ deviceId }`. |
| `POST` | `/api/projects/:id/force-reclaim` | Force reclaim from another device. Only works if caller's `device_id` matches the project's host device. |
| `GET` | `/api/devices/:id/projects` | List a specific device's registered projects. |
| `GET` | `/api/sessions/:id/replay` | Get buffered messages for reconnect. Query param: `?after_seq=N` for partial replay. |

#### New WebSocket Message Types

**Device events** (Hub broadcasts to all connected clients):

| Type | Payload | When |
|------|---------|------|
| `device.online` | `{ deviceId, hostname, os }` | Device registers / comes back online |
| `device.offline` | `{ deviceId }` | Device misses 3 heartbeats (~30s) |

**Project events** (Hub broadcasts to all connected clients):

| Type | Payload | When |
|------|---------|------|
| `project.claimed` | `{ projectId, claimedByDeviceId, deviceName }` | Project claimed |
| `project.released` | `{ projectId }` | Project released or auto-expired |

**Session relay messages** (Hub routes between specific devices):

| Type | Direction | Payload |
|------|-----------|---------|
| `session.spawn` | Claimer → Hub → Host | `{ sessionId, projectId, config: { agentRole, prompt, workDir, ... } }` |
| `session.input` | Claimer → Hub → Host | `{ sessionId, input: string }` |
| `session.output` | Host → Hub → Claimer | `{ sessionId, seq, payload: { ... } }` (JSONL line) |
| `session.kill` | Claimer → Hub → Host | `{ sessionId }` |
| `session.ended` | Host → Hub → Claimer | `{ sessionId, exitCode }` |
| `session.resume` | Claimer → Hub | `{ sessionId, lastSeq }` — Hub replays buffered messages after `lastSeq` |

### Electron Client Changes

#### Device Service (`src/main/services/device/`)

- Extend heartbeat payload to include local project list (id, name, path)
- Listen for `device.online` / `device.offline` Hub WebSocket events
- Emit IPC events so the renderer can update project availability in real-time

#### Project Service (`src/main/services/project/`)

- Add `remote` boolean + `hostDeviceId` + `hostDeviceName` fields to the project model
- On Hub connect: query `GET /api/projects` and merge remote projects into the project list
- Handle `project.claimed` / `project.released` events to update lock state
- New methods: `claimProject(id)`, `releaseProject(id)`, `forceReclaimProject(id)`

#### New Relay Service (`src/main/services/relay/`)

Central service that owns the cross-device session lifecycle:

- **For outgoing sessions** (I'm on MacBook, working on a Windows project): wraps session commands in relay envelopes, sends through Hub WebSocket, receives output and feeds it to the renderer as if it were local
- **For incoming relay requests** (Windows receives a spawn request from MacBook via Hub): unwraps the envelope, spawns Claude Code locally using the existing agent orchestrator, pipes output back through Hub WebSocket
- **Reconnect logic**: on WebSocket reconnect, sends `session.resume` with `lastSeq`, processes replayed messages to restore UI state

The relay service is the **only** component that knows whether a session is local or remote. Everything above it (agent orchestrator, renderer) works with the same session interface.

#### Agent Orchestrator (`src/main/services/agent-orchestrator/`)

Thin abstraction: "start session" checks if the project is local or remote.
- Local: spawns Claude Code directly (existing behavior, no change)
- Remote: delegates to relay service

The orchestrator's existing features (watchdog, cost tracking, session listing) work the same — session output arrives through the same interface regardless of source.

#### Renderer Changes

Minimal:
- **Project list**: show Hub badge + host device name on remote projects. Lock overlay + "In use by {device}" on projects claimed by another device. "Release" action in project context menu for your claimed remote projects.
- **Session UI**: no changes. Output format is identical whether local or relayed. The renderer doesn't know or care where the session runs.
- **Hub setup page**: already exists. May need minor updates to show connected devices after setup completes.

---

## Heartbeat & Liveness

- ADC sends heartbeat every 10 seconds (existing behavior)
- Heartbeat now includes: device ID, hostname, OS, online status, local project list
- Hub marks a device offline after 3 missed heartbeats (30s)
- Offline device's projects become greyed out / unavailable in other clients
- When device comes back: heartbeat resumes, projects reappear, any stale claims auto-expire
- Active claims are extended on each heartbeat (rolling `expires_at`). If claimer goes offline without releasing, claim expires after 60 seconds.

## Reconnect Behavior

1. MacBook loses WebSocket connection (network blip, sleep, etc.)
2. Agent on Windows keeps running — it doesn't know about the relay
3. Hub buffers output in `session_buffer` (last 200 messages per session)
4. MacBook reconnects, sends `session.resume` with last received `seq`
5. Hub replays all buffered messages after that `seq`
6. MacBook UI catches up seamlessly

If MacBook is offline for >60s, the claim auto-expires and the project unlocks on Windows. The agent session may still be running on Windows — it's a local session on that machine. The MacBook can re-claim and resume viewing if the session is still active.

## Security

- All relay messages go through the existing authenticated WebSocket (JWT or API key)
- Hub validates that the device sending `session.spawn` actually holds the claim for that project
- Hub validates that session output is only forwarded to the device that holds the claim
- Force reclaim is restricted to the project's host device
- LAN-only by design — no internet exposure. Users who want remote access use their own VPN/Tailscale.

---

## Out of Scope

- **No file browsing/editing through the Hub** — relay is for Claude Code sessions and terminal I/O only
- **No file sync/replication** — projects stay on their host machine
- **No multi-user** — single-user auth, your machines only
- **No internet relay / cloud hosting** — LAN-only, VPN is user's responsibility
- **No concurrent project access** — one device at a time per project
- **No Hub-hosted compute** — Hub is relay only, doesn't run Claude Code
