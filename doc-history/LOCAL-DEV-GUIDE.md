# Claude-UI Local Development Guide

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | 20+ (LTS) | `node -v` |
| **npm** | 10+ | `npm -v` |
| **Git** | 2.40+ | `git -v` |
| **Windows 10/11** or **macOS 12+** | - | - |
| **Python 3** + **Visual Studio Build Tools** | Windows only, for native modules | `python --version` |

> **Windows note:** `@lydell/node-pty` (terminal emulation) requires native compilation.
> Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload, or run:
> ```
> npm install -g windows-build-tools
> ```

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/ParkerM2/Claude-UI.git
cd Claude-UI

# 2. Install dependencies
npm install

# 3. Start dev mode (hot-reload for renderer, auto-restart for main)
npm run dev
```

The app opens automatically. Electron main process logs appear in the terminal. Renderer DevTools can be opened with `Ctrl+Shift+I` (or `Cmd+Opt+I` on macOS).

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode (electron-vite, hot reload) |
| `npm run build` | Production build to `out/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check (zero tolerance) |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Prettier format all files |
| `npm run typecheck` | TypeScript type check (`tsc --noEmit`) |
| `npm run test` | Run Vitest test suite |

---

## Project Structure

```
Claude-UI/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── index.ts        # App entry — creates window, initializes services
│   │   ├── auth/            # OAuth2 manager, token store, provider configs
│   │   ├── ipc/             # IPC router + domain handlers
│   │   ├── mcp/             # MCP client/registry/manager infrastructure
│   │   ├── mcp-servers/     # External service clients (GitHub, Slack, Spotify, etc.)
│   │   ├── services/        # Business logic (one folder per domain)
│   │   └── tray/            # System tray, hotkeys, quick input
│   ├── preload/            # Context bridge (typed API for renderer)
│   ├── renderer/           # React app (browser context)
│   │   ├── app/             # Router, providers, layouts, sidebar
│   │   ├── features/        # Feature modules (self-contained)
│   │   │   ├── alerts/       # Alerts & reminders
│   │   │   ├── assistant/    # AI command assistant
│   │   │   ├── changelog/    # Version history
│   │   │   ├── communications/ # Slack & Discord
│   │   │   ├── dashboard/    # Home dashboard
│   │   │   ├── fitness/      # Workout & body tracking
│   │   │   ├── github/       # PRs, issues, notifications
│   │   │   ├── ideation/     # Idea board
│   │   │   ├── insights/     # Project metrics
│   │   │   ├── tasks/        # Task dashboard (table-based)
│   │   │   ├── notes/        # Quick notes
│   │   │   ├── planner/      # Daily planner
│   │   │   ├── productivity/ # Spotify + Calendar widgets
│   │   │   ├── projects/     # Project management + git
│   │   │   ├── roadmap/      # Milestone timeline
│   │   │   ├── settings/     # App settings + hub config
│   │   │   └── terminals/    # Terminal emulation
│   │   └── shared/          # Shared hooks, stores, components
│   └── shared/             # Code shared between main + renderer
│       ├── ipc-contract.ts   # THE source of truth for all IPC
│       ├── constants/        # Routes, themes, etc.
│       └── types/            # Domain type definitions
├── hub/                    # Hub backend (Fastify + SQLite, runs in Docker)
├── nginx/                  # Reverse proxy config for hub
├── docker-compose.yml      # Hub + nginx stack
├── ai-docs/                # Architecture, patterns, linting docs
├── .claude/agents/         # AI agent specifications (27 agents)
└── CLAUDE.md               # AI agent guidelines
```

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer (React)                      │
│  Features → React Query hooks → ipc() helper            │
│                       │                                  │
│                       ▼                                  │
│              Preload Bridge (contextBridge)               │
├─────────────────────────────────────────────────────────┤
│                    Main Process (Node)                    │
│  IPC Router → Handlers → Services → Data (JSON files)    │
│                  │                                       │
│              ┌───┴───┐                                   │
│          MCP Servers   OAuth Manager                     │
│        (GitHub, Slack,  (GitHub, Google,                  │
│         Spotify, etc.)  Spotify tokens)                  │
├─────────────────────────────────────────────────────────┤
│              Hub Backend (optional, Docker)               │
│         Fastify REST + WebSocket → SQLite                │
└─────────────────────────────────────────────────────────┘
```

**Data flow:** `ipc-contract.ts` defines Zod schemas → IPC Router validates & routes → Handlers call Services → Services return data → React Query caches it.

---

## Setting Up Integrations (Optional)

Most features work locally without any API keys. The integrations below are optional and require OAuth credentials:

### GitHub Integration

1. Create a [GitHub OAuth App](https://github.com/settings/developers)
2. Set callback URL to `claude-ui://oauth/callback`
3. Add client ID/secret to `src/main/auth/providers/github.ts`

### Spotify Integration

1. Create a [Spotify App](https://developer.spotify.com/dashboard)
2. Add `claude-ui://oauth/callback` as a redirect URI
3. Add client ID/secret to `src/main/auth/providers/spotify.ts`

### Google Calendar Integration

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Calendar API
3. Create OAuth 2.0 credentials with `claude-ui://oauth/callback` redirect
4. Add client ID/secret to `src/main/auth/providers/google.ts`

### Slack Integration

1. Create a [Slack App](https://api.slack.com/apps)
2. Add OAuth scopes: `channels:read`, `chat:write`, `users:read`
3. Add `claude-ui://oauth/callback` as a redirect URL
4. Add client ID/secret to `src/main/auth/providers/slack.ts`

> **Security note:** OAuth credentials are stored locally via Electron's `safeStorage` API (OS keychain encryption). Never commit client secrets to the repo.

---

## Hub Backend (Optional)

The hub provides cloud sync, multi-device access, and a REST API for external tools.

### Running with Docker

```bash
# Generate self-signed TLS certs (first time only)
# PowerShell:
./scripts/generate-certs.ps1
# Bash:
./scripts/generate-certs.sh

# Start hub + nginx
docker compose up -d

# Check logs
docker compose logs -f hub
```

The hub runs at `https://localhost:4443` (nginx) / `http://localhost:3001` (direct).

### Connecting the App to Hub

1. Open **Settings** in the app
2. Go to the **Hub** tab
3. Enter hub URL: `https://localhost:4443`
4. Generate an API key from the hub admin, paste it in
5. Click **Connect**

---

## Development Workflow

### Adding a New Feature

1. **Define types** in `src/shared/types/<feature>.ts`
2. **Add IPC channels** in `src/shared/ipc-contract.ts` (Zod schemas)
3. **Create service** in `src/main/services/<feature>/<feature>-service.ts`
4. **Create handler** in `src/main/ipc/handlers/<feature>-handlers.ts`
5. **Register handler** in `src/main/ipc/index.ts`
6. **Create service instance** in `src/main/index.ts`
7. **Build feature module** in `src/renderer/features/<feature>/`:
   - `api/queryKeys.ts` — React Query cache keys
   - `api/use<Feature>.ts` — Query/mutation hooks
   - `components/<Feature>Page.tsx` — UI
   - `store.ts` — Zustand UI state
   - `index.ts` — Barrel export
8. **Add route** in `src/renderer/app/router.tsx`
9. **Add sidebar entry** in `src/renderer/app/layouts/Sidebar.tsx`
10. **Run checks**: `npm run lint && npm run typecheck && npm run build`

### Key Patterns

- **Services** return sync values (not Promises); handlers wrap with `Promise.resolve()`
- **Exception**: network calls (OAuth, GitHub API, etc.) are async
- **IPC contract** is the single source of truth — types flow automatically from Zod schemas
- **React Query** for server state, **Zustand** for UI state
- **Feature modules** are self-contained: each has its own api/, components/, hooks/, store

### Linting Rules

This project enforces extremely strict ESLint (zero violations). Key rules:

- No `any` — use `unknown` + type narrowing
- No `!` (non-null assertion) — use `?? fallback`
- `strict-boolean-expressions` — use `arr.length > 0` not `arr.length`
- `no-floating-promises` — prefix with `void` operator
- `consistent-type-imports` — always `import type { T }`
- `jsx-a11y strict` — buttons need `type="button"`

Run `npm run lint:fix` to auto-fix what's possible, then manually fix the rest.

---

## Troubleshooting

### `npm install` fails with native module errors

On Windows, ensure Visual Studio Build Tools are installed:
```bash
npm install -g windows-build-tools
```

Or install manually: VS Build Tools with "Desktop development with C++" workload.

### Dev server fails to start

```bash
# Clear build cache and node_modules
rm -rf node_modules out dist
npm install
npm run dev
```

### Terminal feature doesn't work

The terminal requires `@lydell/node-pty`, which needs native compilation. If it fails:
1. Ensure Python 3 is in your PATH
2. Ensure C++ build tools are installed
3. Try: `npm rebuild @lydell/node-pty`

### Port conflicts

- Dev server: `5173` (Vite renderer)
- Hub backend: `3001`
- Nginx proxy: `4443`

Kill conflicting processes or change ports in config.

### "Cannot find module" errors after branch switch

```bash
npm install  # Reinstall deps
npm run dev  # Restart
```

---

## Building for Production

```bash
# Build all bundles
npm run build

# Output structure:
# out/main/index.cjs      — Main process bundle
# out/preload/index.mjs    — Preload script
# out/renderer/            — React app (HTML + JS + CSS)
```

To package as a distributable app, add `electron-builder` config (not yet configured).
