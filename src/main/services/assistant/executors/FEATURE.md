# Command Executors

Domain-specific handlers that execute AI assistant intents. Each executor handles one domain (tasks, email, GitHub, etc.) and returns an `AssistantResponse`.

## Key Files

- **`router.ts`** — Main entry point. `routeIntent()` maps classified intents to the correct domain executor. Quick commands try direct service calls first, then fall back to MCP tool calls.
- **`types.ts`** — `CommandExecutorDeps` interface: the dependency bag (optional services) injected into all executors
- **`response-builders.ts`** — Helper functions for constructing `AssistantResponse` objects (text, action, error)
- **`index.ts`** — Barrel export of `routeIntent` and `CommandExecutorDeps`

## Domain Executors (15)

`briefing`, `calendar`, `changelog`, `conversation`, `device`, `email`, `fitness`, `github`, `ideation`, `insights`, `launcher`, `milestones`, `notes`, `planner`, `reminder`, `search`, `spotify`, `task`, `watch`

Each file exports one or more execute/handle functions that receive a `ClassifiedIntent` and the `CommandExecutorDeps` service bag.

## How It Connects

- **Intent classifier** (`../intent-classifier/`) produces `ClassifiedIntent` objects
- **Assistant service** calls `routeIntent()` with the classified intent
- Executors call domain services (injected via deps) or MCP tools to fulfill requests
