# Briefing Service

Generates daily briefings by aggregating task status, agent activity, and GitHub notifications into a summary with proactive suggestions.

## Key Files

- **`briefing-service.ts`** — Orchestrator: exposes `getDailyBriefing`, `generateBriefing`, config getters/setters, and suggestion access. Delegates to cache, config, and generator sub-modules.
- **`briefing-cache.ts`** — JSON file-backed daily cache. Stores up to 30 days of briefings, checks for today's cached version before regenerating.
- **`briefing-config.ts`** — Loads and saves `BriefingConfig` (enabled flag, scheduled time, GitHub/agent toggles) with sensible defaults.
- **`briefing-generator.ts`** — Gathers task summaries, agent activity, and GitHub notification counts, then assembles a `DailyBriefing` object with summary text.
- **`briefing-summary.ts`** — Claude-powered summary text generation with a deterministic fallback when the LLM is unavailable.
- **`suggestion-engine.ts`** — Heuristic-based proactive suggestions: stale projects (7+ days inactive), parallelizable tasks, and blocked tasks needing attention.

## How It Connects

- Depends on `TaskService`, `ProjectService`, `AgentService`, `ClaudeClient`, and `NotificationManager`
- Emits `event:briefing.ready` via `IpcRouter` when a new briefing is generated
- Consumed by IPC handlers on the `briefing.*` channels and rendered in the briefing page
