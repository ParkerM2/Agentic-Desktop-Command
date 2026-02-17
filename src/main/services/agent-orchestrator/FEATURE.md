# Agent Orchestrator

Manages the full lifecycle of headless Claude coding agents: spawning processes, tracking sessions, monitoring health, and streaming real-time progress from JSONL hook output.

## Key Files

- **`agent-orchestrator.ts`** — Core lifecycle manager: spawns agents, tracks PIDs, manages sessions, emits session events on start/complete/error
- **`agent-watchdog.ts`** — Health monitor that detects dead processes, stale progress, and auth failures with optional auto-restart on context overflow
- **`hooks-template.ts`** — Generates Claude hooks config files with PostToolUse and Stop hooks that write JSONL progress entries
- **`jsonl-progress-watcher.ts`** — Watches per-task JSONL files using fs.watch, parses incremental lines with debouncing, and emits typed progress events
- **`types.ts`** — Shared types: AgentSession, AgentPhase, SpawnOptions, AgentSessionEvent, ProgressEntry

## Lifecycle Flow

1. Task handler calls `spawn()` with project path, prompt, and phase (planning/executing/qa)
2. Orchestrator writes hooks config, spawns `claude` CLI, and begins JSONL progress monitoring
3. Watchdog polls session health; progress watcher streams updates to the renderer

## How It Connects

- **Upstream:** Task handlers and agent IPC handlers trigger spawn/kill/list operations
- **Downstream:** Spawns `claude` CLI child processes, writes hooks configs, calls milestones service
- **Events:** Emits `agent.session.*` and `agent.progress` events forwarded to the renderer via IPC
