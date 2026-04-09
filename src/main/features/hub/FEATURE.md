# Hub Connection

Manages the full lifecycle of connecting to the Hub backend server: configuration, authentication, REST API communication, WebSocket real-time updates, and bidirectional data sync.

## Key Files

- **`hub-connection.ts`** — Facade that orchestrates config persistence, WebSocket lifecycle, and connection status
- **`hub-api-client.ts`** — Low-level typed HTTP helpers using node:http/https for authenticated Hub API requests
- **`hub-auth-service.ts`** — User authentication: login, register, logout, token refresh via Hub server
- **`hub-client.ts`** — High-level REST client wrapping fetch calls with API key auth and typed responses
- **`hub-config-store.ts`** — Encrypted JSON persistence for Hub connection config (API keys via Electron safeStorage)
- **`hub-event-mapper.ts`** — Maps WebSocket event payloads to typed IPC events and converts config to view objects
- **`hub-ws-client.ts`** — WebSocket connection management with auth handshake and auto-reconnect
- **`hub-sync.ts`** — Bidirectional data sync: queues local mutations when offline, syncs on reconnect
- **`hub-errors.ts`** — Standardized error types (HubApiError) with HTTP status code and auth error detection
- **`webhook-relay.ts`** — Forwards Hub WebSocket webhook_command broadcasts to the assistant service

## How It Connects

- **Upstream:** IPC handlers (`hub-handlers.ts`, `auth-handlers.ts`), service registry at bootstrap
- **Downstream:** Hub REST API, Hub WebSocket server, assistant service (via webhook relay)
- **Events:** Emits `hub.status`, `hub.sync`, and entity update events to the renderer via IPC
