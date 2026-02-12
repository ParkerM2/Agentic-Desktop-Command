# Claude-UI — Product Vision

> One app. Every side project. A full-time AI assistant that never sleeps.

---

## What Exists Today

### Working Features
- **Project Management** — Add/remove projects by directory, tab-based multi-project switching
- **Kanban Board** — Drag-and-drop task board with 7 status columns (backlog through PR created)
- **Task System** — Create, update, delete tasks with subtasks, execution phases, and progress tracking
- **Terminal Grid** — Tabbed xterm.js terminals with real PTY (PowerShell/bash), per-project
- **Agent Dashboard** — Spawn Claude CLI agents per task, view status, stop/pause/resume
- **Settings** — Light/dark/system theme toggle
- **IPC Architecture** — 31 typed channels with Zod validation, fully wired main-to-renderer

### Stubs (UI placeholder only)
- GitHub integration page
- Roadmap page
- Ideation page
- Insights (barrel export only)
- Changelog (barrel export only)

### Tech Stack Already in Place
- Electron 39, React 19, TypeScript strict, Zustand 5, Tailwind v4
- React Query for server state, dnd-kit for drag-and-drop
- node-pty for terminal, Radix UI primitives, Lucide icons
- Anthropic SDK, react-markdown, motion (installed but unused)

---

## The Vision

### Who Is This For?

**A solo developer** who juggles a day job and multiple side projects. They want:

- One place to see everything — not 5 tabs of Notion, Linear, Google Calendar, Discord, and terminal
- AI that actually *does work*, not just answers questions
- To say "hey Claude, move that task to done" while cooking dinner
- A daily cockpit: what happened overnight, what's next, what's blocked

### Core Identity

**Claude-UI is a personal command center** — part project manager, part daily planner, part AI workforce. It's the app that's always open on your second monitor.

---

## Feature Vision — Organized by Priority

### Tier 1: The Dashboard (Home Base)

**The first thing you see. Everything at a glance.**

```
+---------------------------------------------------------------+
|  Good morning, Parker.              Wed Feb 12    [voice] [?]  |
+---------------------------------------------------------------+
|                                                                |
|  TODAY                          |  RECENT PROJECTS             |
|  +--------------------------+  |  +---------+ +---------+     |
|  | 09:00  Stand-up (work)   |  |  | Claude  | | SaaS    |     |
|  | 10:00  Fix auth bug      |  |  | -UI     | | App     |     |
|  | 12:00  Lunch              |  |  | 3 tasks | | 1 agent |     |
|  | 14:00  PR review          |  |  +---------+ +---------+     |
|  | 16:00  Side project time  |  |  +---------+ +---------+     |
|  | 18:00  Gym                |  |  | Portfolio| | CLI     |     |
|  +--------------------------+  |  | idle     | | Tool    |     |
|                                |  +---------+ +---------+     |
|  ACTIVE AGENTS                 |                               |
|  +---------------------------+ |  QUICK CAPTURE               |
|  | [*] claude-ui: fixing     | |  +-------------------------+ |
|  |     auth middleware (67%) | |  | "Add dark mode to..."   | |
|  | [*] saas-app: running     | |  +-------------------------+ |
|  |     tests (100%) DONE     | |                               |
|  | [ ] portfolio: idle       | |  DAILY STATS                 |
|  +---------------------------+ |  12 tasks completed           |
|                                |  3 PRs merged                 |
|                                |  2 agents ran                 |
+---------------------------------------------------------------+
```

**Key elements:**
- **Today view** — Minified daily planner pulled from your schedule. Time blocks, not a cluttered list.
- **Recent projects** — Cards with project name, active task count, agent status. Click to dive in.
- **Active agents** — Live status of all running Claude agents across all projects. Progress bars, current phase.
- **Quick capture** — Text input to dump ideas, tasks, notes. Claude triages them to the right project.
- **Daily stats** — What got done today. Subtle, motivating, not gamified.

### Tier 2: Daily Planner & Time Tracking

**Your day, structured. Work + side projects in one timeline.**

- **Time blocks** — Drag-to-create blocks for "work", "side project", "personal". Color coded.
- **Task scheduling** — Drag tasks from any project's backlog onto a time slot.
- **Daily notes** — Quick markdown scratchpad per day. "What I learned", "blockers", etc.
- **Work/life separation** — Tags or contexts: "work", "side-project", "personal". Filter by context.
- **Weekly review** — Auto-generated summary: tasks completed, time spent, agents run, PRs merged.
- **Calendar integrations** (future) — Pull from Google Calendar, Outlook. Read-only overlay.

### Tier 3: The Persistent Claude Assistant

**A Claude instance that's always on. Your full-time AI coworker.**

#### Always-On Agent
- A long-running Claude session that persists across app restarts
- Has memory of your preferences, projects, patterns, and past conversations
- Can be given standing instructions: "every morning, summarize what changed overnight"
- Runs in background, surfaces notifications when it needs you

#### Computer & Screen Access
- Can see your screen (screenshot capture + vision API)
- Can control your mouse/keyboard (with explicit permission gates)
- Use cases:
  - "Claude, look at this error on my screen and fix it"
  - "Fill out this form for me"
  - "Navigate to the PR and approve it"
- Safety: explicit permission prompt before any action, undo history, kill switch

#### Voice Interface
- Wake word: "Hey Claude" (local speech-to-text, e.g., Whisper)
- Natural language commands:
  - "Update my task list — mark the auth bug as done"
  - "Send Conor a message on Discord saying I'll be late"
  - "What's on my schedule today?"
  - "Start an agent on the portfolio project to fix that CSS bug"
  - "Read me the latest PR comments"
- Text-to-speech responses (optional, toggleable)
- Push-to-talk alternative for noisy environments

#### Cross-App Actions
- Discord: send messages, read channels, react
- GitHub: create PRs, review code, merge, comment on issues
- Slack: post updates, read messages
- Email: draft and send (with confirmation)
- Browser: open URLs, fill forms, navigate

### Tier 4: Enhanced Project Management

**What you already have, but smarter.**

#### Multi-Project Kanban
- Unified view across all projects — filter by project, priority, status
- "My Work" view — all tasks assigned to you across every project, sorted by priority/deadline
- Batch operations — move multiple tasks, bulk assign to agents

#### Agent Orchestration
- **Parallel agent queue** — Queue 10 tasks, Claude runs them sequentially or in parallel (configurable)
- **Agent profiles** — Different Claude configs per project (model, temperature, system prompt)
- **Agent handoff** — When one agent finishes, it can trigger the next task automatically
- **Cost tracking** — Token usage per agent run, daily/weekly/monthly spend dashboard
- **Agent logs** — Searchable, filterable history of every agent run

#### Smart Task Creation
- Describe a feature in natural language, Claude breaks it into subtasks
- Paste a GitHub issue URL, Claude creates a task with implementation plan
- Screenshot a bug, Claude creates a task from the image
- Voice-to-task: "Hey Claude, add a task to fix the login page redirect"

### Tier 5: Intelligence Layer

**Claude doesn't just execute. It thinks ahead.**

#### Proactive Suggestions
- "You haven't touched the portfolio project in 2 weeks. Want me to review what's pending?"
- "The SaaS app has 3 tasks that could run in parallel. Want me to start agents?"
- "Your auth token handling looks similar across 3 projects. Want me to extract a shared lib?"

#### Cross-Project Insights
- Which projects are active vs stale
- Code pattern reuse opportunities
- Dependency update alerts across all projects
- "You fixed this same bug in project A last week — here's the solution"

#### Daily Briefing
- Morning summary (auto or on-demand):
  - Agent activity overnight
  - New GitHub notifications
  - Today's scheduled tasks
  - Blockers or failures that need attention

---

## Design Philosophy

### 1. Minimal by Default, Powerful on Demand
- Dashboard shows only what matters *right now*
- Details are one click away, never in your face
- No feature should require more than 2 clicks to reach

### 2. Solo Developer, Not Enterprise
- No team features, no permissions, no "workspace" overhead
- Everything is *yours* — your projects, your schedule, your AI
- Fast, lightweight, no unnecessary abstractions

### 3. AI-First, Not AI-Bolted-On
- Claude isn't a chatbot sidebar — it's the engine
- Every feature should leverage AI: task creation, scheduling, code review, communication
- The app should feel like having a competent junior developer who never sleeps

### 4. Always Visible, Never Intrusive
- Designed for a second monitor / always-open workflow
- Notifications are subtle (system tray, badge counts, gentle sounds)
- Voice is opt-in and polite, not Clippy

### 5. Local-First, Multi-Device
- Hub on your desktop is the brain — no cloud, no monthly bills, no data leaving your network
- Every client caches locally — app works even if hub is off
- Same dashboard, same planner, same tasks on every machine
- Terminals are local (your shell), agents are remote (where the code lives)

---

## Network Architecture: Multi-Device, Local-First

### The Setup

```
                YOUR LOCAL NETWORK
  ┌──────────────────────────────────────────────┐
  │                                              │
  │   WINDOWS DESKTOP (Home Server)              │
  │   ┌────────────────────────────────────┐     │
  │   │  Docker                            │     │
  │   │  ┌──────────────────────────────┐  │     │
  │   │  │  claude-ui-hub (container)   │  │     │
  │   │  │  ┌────────────────────────┐  │  │     │
  │   │  │  │ REST/WebSocket API     │  │  │     │
  │   │  │  │ SQLite (shared data)   │  │  │     │
  │   │  │  │ File sync (projects)   │  │  │     │
  │   │  │  │ Agent runner (PTY)     │  │  │     │
  │   │  │  │ Persistent Claude      │  │  │     │
  │   │  │  └────────────────────────┘  │  │     │
  │   │  └──────────────────────────────┘  │     │
  │   │                                    │     │
  │   │  nginx (reverse proxy + TLS)       │     │
  │   └──────────┬─────────────────────────┘     │
  │              │                               │
  │   ┌──────────┴──────────┐                    │
  │   │                     │                    │
  │   ▼                     ▼                    │
  │  Electron App        Electron App            │
  │  (Windows)           (MacBook)               │
  │  - Local UI          - Local UI              │
  │  - Local data        - Local data            │
  │  - Agents run HERE   - View/control          │
  │    (has the code)      agents remotely        │
  │                      - Own terminals          │
  └──────────────────────────────────────────────┘
```

### How It Works

#### The Hub (Docker on Windows Desktop)
Your Windows machine runs a lightweight Docker container that acts as the central brain:

- **REST + WebSocket API** — Every Electron client connects to it
- **SQLite database** — Single source of truth for tasks, planner, settings, agent history
- **WebSocket push** — Real-time sync: change a task on Mac, it updates on Windows instantly
- **Agent runner** — Agents execute here (where the code and compute lives)
- **Persistent Claude** — The always-on assistant lives in this container
- **nginx in front** — Reverse proxy with self-signed TLS, accessible at `https://claude.local` or `https://192.168.x.x`

#### The Clients (Electron on Each Machine)
Each Electron app is a thin-ish client that:

- **Stores a local cache** — App works even if hub is unreachable (offline mode)
- **Syncs on connect** — When hub is reachable, pulls latest state via WebSocket
- **Runs its own terminals** — PTY is local to each machine (you want *that machine's* shell)
- **Can trigger remote agents** — "Start an agent on the desktop" from the MacBook
- **Settings sync** — Theme, planner, preferences follow you across devices

#### What Stays Local vs What Syncs

| Data | Where It Lives | Why |
|------|---------------|-----|
| Tasks, kanban state | Hub (SQLite) + local cache | Need it everywhere, hub is source of truth |
| Daily planner / calendar | Hub (SQLite) + local cache | Same schedule on both machines |
| Settings / preferences | Hub (SQLite) + local cache | Theme, layout should follow you |
| Project file paths | Local only | `/Users/parker/code` vs `C:\Users\Parke\code` — paths are machine-specific |
| Terminal sessions | Local only | PTY is bound to the machine's shell |
| Agent execution | Hub (runs on desktop) | Desktop has the code, the GPU, the compute |
| Agent logs / history | Hub (SQLite) | Viewable from any client |
| Quick capture / notes | Hub (SQLite) + local cache | Jot something on Mac, see it on Windows |
| Persistent Claude memory | Hub (filesystem) | One Claude brain, accessible from anywhere |

#### Conflict Resolution (Simple)
- **Last-write-wins** for most things (settings, task status, notes)
- **Append-only** for logs, capture, and history (no conflicts possible)
- **Machine-specific** data never conflicts (terminals, paths, local cache)
- No need for CRDTs or complex merge — you're one person on two machines

### Network Discovery & Setup

#### First Run (Windows Desktop)
```bash
# One command to spin up the hub
docker compose up -d claude-ui-hub
```

#### First Run (MacBook Client)
The Electron app shows a setup screen:
1. "Connect to Hub" — enter IP or hostname (`claude.local`, `192.168.1.100`)
2. App pings the hub, confirms connection
3. Pulls initial state (tasks, planner, settings)
4. Done — everything syncs from here

#### mDNS / Zero-Config (Nice to Have)
- Hub broadcasts itself as `_claude-ui._tcp.local`
- Mac client auto-discovers: "Found Claude-UI Hub on Parker's Desktop. Connect?"
- No manual IP entry needed

### Security (Local Network)
- **Self-signed TLS** via nginx — encrypted on LAN, no external exposure
- **API key** — Simple shared secret generated on first hub setup, entered once per client
- **No internet exposure** — Hub binds to LAN interface only (`192.168.x.x`, not `0.0.0.0`)
- **Optional Tailnet** — If you want access outside home, add Tailscale. Hub becomes reachable at `claude-ui.tailnet` with zero config

### Why This Architecture?

| Approach | Rejected Because |
|----------|-----------------|
| Cloud sync (Firebase, Supabase) | Monthly cost, internet dependency, data leaves your network |
| Peer-to-peer sync | Complex, unreliable, no single source of truth |
| Shared filesystem (NFS/SMB) | Fragile, locking issues, no real-time push |
| Web app only (no Electron) | Loses native features: PTY, system tray, voice, screen capture |
| Single machine only | Can't use from the couch with the MacBook |

**Docker hub + Electron clients** gives you: zero cloud cost, LAN-speed sync, real-time updates, offline resilience, and native OS features on every device.

---

## Implementation Phases

### Phase 1: Dashboard & Multi-Project Polish (Now)
- [ ] Build the home dashboard (today view, recent projects, active agents)
- [ ] Fix existing TypeScript errors (6 remaining)
- [ ] Complete settings page (fonts, UI scale, accent color)
- [ ] Add quick-capture input on dashboard
- [ ] Project cards with live agent status indicators

### Phase 2: Hub + Multi-Device Sync (Foundation)
- [ ] Extract data layer into a standalone API server (Express/Fastify + SQLite)
- [ ] Migrate JSON file storage to SQLite (tasks, projects, settings, planner)
- [ ] WebSocket server for real-time state push
- [ ] Dockerize the hub: `Dockerfile` + `docker-compose.yml`
- [ ] nginx config with self-signed TLS
- [ ] Electron client: connection manager (hub URL + API key)
- [ ] Offline mode: local SQLite cache, queue mutations, sync on reconnect
- [ ] First-run setup flow: hub generates API key, client enters it once
- [ ] Cross-platform Electron builds (Windows via electron-builder, macOS via GitHub Actions or local Mac)

### Phase 3: Daily Planner
- [ ] Calendar day/week view component
- [ ] Time block creation and editing
- [ ] Task-to-timeblock scheduling (drag from backlog)
- [ ] Daily notes scratchpad
- [ ] Work/side-project/personal context tags
- [ ] Data syncs through hub — same planner on both machines

### Phase 4: Agent Orchestration (Core Value)
- [ ] Task queue with configurable parallelism
- [ ] Remote agent control: trigger agents on desktop from MacBook
- [ ] Agent cost tracking (token usage)
- [ ] Agent run history with searchable logs (stored in hub)
- [ ] Auto-chain: task completion triggers next task
- [ ] Agent profiles per project

### Phase 5: Persistent Assistant (Differentiator)
- [ ] Long-running Claude session in hub container (survives app restarts)
- [ ] Standing instructions system ("every morning, do X")
- [ ] Notification system (tray icon, badge counts, push to all clients)
- [ ] Quick command palette (Cmd+K / Ctrl+K style)
- [ ] Natural language task/schedule manipulation from any device

### Phase 6: Voice & Computer Use (Ambitious)
- [ ] Local speech-to-text integration (Whisper.cpp or similar)
- [ ] Wake word detection ("Hey Claude")
- [ ] Text-to-speech for responses
- [ ] Screen capture + Claude vision for "look at this"
- [ ] Controlled computer actions with permission gates
- [ ] Voice works on whichever machine you're using — routes commands to hub

### Phase 7: Cross-App Integration (Ecosystem)
- [ ] GitHub: PR creation, review, merge from within app
- [ ] Discord: send/read messages via bot or API
- [ ] Slack integration
- [ ] Email drafting and sending
- [ ] Browser automation for form filling / navigation
- [ ] Integrations run on hub — accessible from any client

---

## What Makes This Different

| Other Tools | Claude-UI |
|---|---|
| Notion/Linear = passive task boards | Tasks that execute themselves via AI agents |
| Google Calendar = view-only schedule | Planner that *does* the work on the schedule |
| Terminal = manual commands | Terminals + AI agents working autonomously |
| ChatGPT = ask questions, copy answers | Claude runs code, creates PRs, ships features |
| Multiple apps for multiple projects | One dashboard, every project, one AI |
| Cloud SaaS = monthly fees, data offsite | Self-hosted hub, zero cost, your data stays home |
| Single-machine tools | Same view from desktop or MacBook, real-time sync |

---

## One-Line Vision

**Claude-UI is the solo developer's mission control — where every side project lives, AI agents do the work, your day runs itself, and it all syncs across every machine you own.**
