# Claude-UI Hub

Self-hosted sync server for Claude-UI. Runs on your local network to sync
projects, tasks, planner, and settings across multiple devices.

## Quick Start

### Option 1: Docker (Recommended)

1. Generate TLS certificates:
   ```bash
   # Linux/Mac
   ./scripts/generate-certs.sh
   # Windows
   powershell ./scripts/generate-certs.ps1
   ```

2. Start the hub:
   ```bash
   docker compose up -d
   ```

3. Generate your API key:
   ```bash
   curl -X POST http://localhost:3200/api/auth/generate-key
   ```

4. Connect from Claude-UI:
   - Open Settings > Hub Connection
   - Enter: https://YOUR_IP:3443
   - Paste the API key

### Option 2: Run Directly

1. Install dependencies:
   ```bash
   cd hub && npm install
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

Server runs on port 3200 by default.

## Architecture

- **Fastify** REST API + WebSocket
- **SQLite** (better-sqlite3) for data storage
- **nginx** reverse proxy with TLS
- **Docker Compose** for deployment

## API

All endpoints require `X-API-Key` header (except initial key generation).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/projects | List/create projects |
| GET/POST | /api/tasks | List/create tasks |
| GET/PUT | /api/settings | Get/update settings |
| GET/POST | /api/planner/events | Planner time blocks |
| GET/POST | /api/captures | Quick captures |
| GET/POST | /api/agent-runs | Agent run history |
| WS | /ws | Real-time sync |
