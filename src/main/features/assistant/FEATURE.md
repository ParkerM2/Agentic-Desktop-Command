# Assistant Service

Processes natural-language commands through intent classification and routes them to domain-specific executors, supporting input from the command bar, Slack webhooks, and GitHub events.

## Key Files

- **`assistant-service.ts`** — Public API facade: receives user input, classifies intent, delegates to command executor, manages streaming responses and event emission
- **`claude-classifier.ts`** — Tier 2 async fallback that calls the Claude CLI to classify ambiguous input into structured actions
- **`command-executor.ts`** — Thin delegation barrel that preserves the CommandExecutor interface and routes to `executors/`
- **`intent-classifier.ts`** — Thin re-export barrel that delegates to `intent-classifier/` sub-module
- **`cross-device-query.ts`** — Queries other ADC instances via Hub API for device status and running tasks
- **`history-store.ts`** — Persists the last 1000 command history entries to a JSON file in user data
- **`watch-evaluator.ts`** — Evaluates incoming IPC events against active watches and fires trigger callbacks on match
- **`watch-store.ts`** — JSON file persistence for assistant watches with one-shot trigger support

## Sub-modules

- **`executors/`** — 19 domain-specific command executors (has its own FEATURE.md)
- **`intent-classifier/`** — Two-tier regex + Claude classification system (has its own FEATURE.md)

## How It Connects

- **Upstream:** IPC handlers (`assistant-handlers.ts`), webhook relay (Hub WebSocket commands)
- **Downstream:** All domain services injected via `CommandExecutorDeps`, Hub API client, MCP tools
- **Events:** Emits `assistant.response` streaming events to the renderer via IPC
