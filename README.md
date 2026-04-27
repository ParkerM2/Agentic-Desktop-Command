<div align="center">

# ADC — Agentic Desktop Command

### Desktop UI for multi-project management with agent team orchestration, automated QA loops, and agentic local software testing

[![Electron](https://img.shields.io/badge/Electron-39-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-EF4444?style=for-the-badge)](LICENSE)

</div>

---

## What is ADC?

ADC is a desktop application for orchestrating teams of autonomous coding agents across multiple projects. It provides a unified command center to spawn, monitor, and coordinate AI agent teams — with automated QA review loops, workflow-driven task boards, integrated terminals, git workflows, and productivity tools.

**User Story**: *"As a developer managing multiple codebases, I want to delegate tasks to AI agent teams and track their progress visually, so I can ship features faster while maintaining oversight and quality through automated QA."*

---

## Architecture

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/architecture.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/images/architecture.svg">
    <img alt="ADC Architecture" src="docs/images/architecture.svg" width="100%">
  </picture>
</div>

<details>
<summary><strong>Architecture Overview</strong></summary>

| Layer | Components | Technology |
|-------|------------|------------|
| **Renderer** | React Components, TanStack Router, React Query, Zustand | React 19, TypeScript |
| **Preload Bridge** | Typed IPC Context, window.api | Electron contextBridge |
| **Main Process** | IPC Router, 29 Services, OAuth, MCP Servers, PTY | Node.js, Electron 39 |
| **External** | GitHub/Spotify/Calendar APIs, Anthropic SDK | REST, WebSocket, OAuth2 |
| **Storage** | SQLite, JSON Files, Task Specs | File system, SQLite |

**Data Flow**: React Query hooks call `ipc()` → Preload bridge → IPC Router → Services → External APIs/Storage

</details>

---

## Features

### Agent Team Orchestration & Control

| Feature | Description |
|---------|-------------|
| **Agent Team Management** | Spawn, pause, resume, and terminate multiple Claude CLI agents simultaneously |
| **Workflow-Driven Task Table** | Sortable, filterable task table with customizable agent workflows and `/implement-feature` skill integration |
| **Agent Queue** | Queue tasks for sequential agent execution with dependency management |
| **Progress Watching** | Real-time sync of progress events between paired devices via the P2P transport |
| **Task Launcher** | Launch Claude CLI sessions directly from task rows with project context |

### Automated QA Loops & Testing

| Feature | Description |
|---------|-------------|
| **QA Review Pipeline** | Automated quality gates — every task reviewed by QA agents before merge |
| **Codebase Guardian** | Structural integrity checks for architecture compliance, import health, and type safety |
| **Test Gate Enforcement** | Mandatory test suite runs before any work is claimed complete |
| **QA Agents** | AI-powered code review, regression detection, and standards enforcement |

### Multi-Project Management

| Feature | Description |
|---------|-------------|
| **Multi-Project Support** | Manage multiple codebases with instant project switching |
| **Workspaces** | Group related projects with shared settings, max concurrency limits, and device assignment |
| **Device Sync** | Multi-device sync via direct peer-to-peer connections (TLS-pinned WebSocket); workspaces can be hosted on specific devices |
| **Git Worktrees** | Parallel development with visual worktree management |
| **Branch Merging** | Visual conflict resolution and merge preview |

### Productivity & Integrations

| Feature | Description |
|---------|-------------|
| **Integrated Terminals** | Multi-pane terminal grid (xterm.js + node-pty) |
| **Daily Planner** | Time blocking with drag-and-drop scheduling |
| **Daily Briefing** | AI-generated summaries and task suggestions |
| **Notes & Ideas** | Quick capture with tags and pinning |
| **Spotify Controls** | Music playback without leaving the app |
| **Google Calendar** | View and create calendar events |
| **GitHub Integration** | PRs, issues, and repo management |
| **Slack/Discord** | MCP-powered communication tools |

### AI & Automation

| Feature | Description |
|---------|-------------|
| **Persistent Assistant** | Built-in Claude assistant with conversation history (Anthropic SDK) |
| **Smart Task Creation** | Natural language task decomposition |
| **Chrono Time Parser** | Parse "tomorrow at 3pm" into timestamps |
| **Voice Interface** | Speech-to-text input and text-to-speech output |
| **Screen Capture** | Quick screenshots for context sharing |
| **Email Integration** | SMTP-based notifications |
| **Notification Watchers** | Background monitoring for Slack/GitHub updates |

---

## Workflow-Driven Task Table

The Task Table provides sortable, filterable task management with customizable agent workflows:

```mermaid
graph LR
    subgraph TaskTable["Task Table"]
        Backlog["Backlog"] --> Queue["Queue"]
        Queue --> InProgress["In Progress"]
        InProgress --> AIReview["AI Review"]
        AIReview --> HumanReview["Human Review"]
        HumanReview --> Done["Done"]
    end

    subgraph AgentWorkflow["/implement-feature Workflow"]
        Plan["Phase 1: Plan"] --> Spawn["Phase 2: Spawn Agents"]
        Spawn --> Execute["Phase 3: Execute in Waves"]
        Execute --> Test["Phase 4: Test Gate"]
        Test --> QA["Phase 5: QA Verification"]
        QA --> Merge["Phase 6: Integration"]
    end

    TaskTable -.-> AgentWorkflow
```

**How It Works**:
1. Create a task in the Task Table with requirements and priority
2. Launch `/implement-feature` skill from the task row actions
3. Agents are spawned in waves (Schema → Service → IPC → Components)
4. **Mandatory test suite** runs before any work is claimed complete
5. Progress syncs to `docs/progress/*.md` for crash recovery
6. QA agents verify each component before integration

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 39 |
| UI | React 19, TanStack Router 1.95 |
| State | React Query 5, Zustand 5 |
| Styling | Tailwind CSS 4, Radix UI |
| Validation | Zod 4 |
| Terminal | xterm.js 6, @lydell/node-pty |
| Sync | P2P TLS WebSocket, Ed25519 identity, mDNS discovery |
| Testing | Vitest, Playwright |

---

## Install (Pre-built)

Download the latest installer from [GitHub Releases](https://github.com/ParkerM2/Agentic-Desktop-Command/releases/latest).

ADC is currently distributed unsigned. The first launch shows a security warning on both platforms — this is expected. Once bypassed, the OS remembers the choice for future launches.

### Windows

1. Download `ADC-Setup-<version>-x64.exe`
2. Double-click to run
3. SmartScreen will show **"Windows protected your PC"** → click **More info** → **Run anyway**
4. Walk through the installer wizard
5. Auto-updates work normally after install

### macOS

Run this single command in Terminal — it downloads the latest release, installs it to `/Applications`, and strips the Gatekeeper quarantine attribute so macOS doesn't falsely claim the app is "damaged":

```sh
curl -sSL https://github.com/ParkerM2/Agentic-Desktop-Command/releases/latest/download/install-mac.sh | bash
```

The script auto-detects arm64 vs x64 and launches ADC when done. After this, double-clicking the app works normally.

> **Why the script?** Browser downloads set `com.apple.quarantine` on the DMG, which on recent macOS (Sonoma 14.5+ / Sequoia) triggers a blanket "damaged" Gatekeeper rejection for any app that isn't Apple-notarized. Notarization requires a paid Apple Developer subscription. Using `curl` bypasses browser quarantine, and the final `xattr -cr` scrubs anything still attached — no paid subscription needed.
>
> **Manual install (if you prefer):** Download the DMG from [Releases](https://github.com/ParkerM2/Agentic-Desktop-Command/releases/latest), drag ADC.app to /Applications, then run `xattr -cr /Applications/ADC.app` in Terminal.

Updates are **manual** on macOS — when a new version is available, ADC shows a notification with a Download button that opens the releases page. Run the install script again to update. Your data persists in `~/Library/Application Support/ADC/`.

---

## Quick Start (Development)

```bash
git clone https://github.com/ParkerM2/Agentic-Desktop-Command.git
cd Agentic-Desktop-Command
npm install
npm run dev
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Run test suite |

---

## Project Structure

```
src/
├── main/           # Electron main process (29 services)
├── preload/        # IPC context bridge
├── renderer/       # React app (31 features)
└── shared/         # Types + IPC contract (single source of truth)

.claude/agents/     # 30 specialist agent definitions
```

---

## Multi-Device Sync

Devices pair via PIN ritual (Settings → Peers) and sync over a direct
TLS-pinned WebSocket connection. No central server is involved — each
device discovers paired peers via mDNS and connects directly.

See `docs/peers/` for the protocol specification.

---

## Stats

| Metric | Value |
|--------|-------|
| TypeScript files | ~300 |
| Feature modules | 25 |
| Main services | 29 |
| IPC handlers | 30 |
| Agent definitions | 27 |
| Color themes | 7 × 2 modes |

---

## License

AGPL-3.0 — see [LICENSE](LICENSE)

<div align="center">

**Built by [Parker](https://github.com/ParkerM2)** · *Powered by Claude*

</div>
