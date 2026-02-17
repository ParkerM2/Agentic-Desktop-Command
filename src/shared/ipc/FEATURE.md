# IPC Contract (Shared)

Defines every IPC channel in the application using Zod schemas. This is the **single source of truth** for all main-process <-> renderer communication.

## Structure

Each of the 22 domain subfolders follows the same pattern:

- `schemas.ts` — Zod schemas for domain-specific data shapes
- `contract.ts` — Invoke (request/response) and event (push) channel definitions
- `index.ts` — Barrel re-export of contracts and schemas

## Root Files

- **`index.ts`** — Merges all domain contracts into unified `ipcInvokeContract` and `ipcEventContract` objects, plus re-exports all Zod schemas
- **`types.ts`** — Type utilities (`InvokeChannel`, `InvokeInput`, `InvokeOutput`, `EventChannel`, `EventPayload`) used by handlers, hooks, and the preload bridge

## Domains

agents, app, assistant, auth, briefing, claude, common, email, fitness, git, github, hub, misc, notifications, planner, projects, qa, settings, spotify, tasks, terminals, workflow

## How It Connects

1. **Handlers** (`src/main/ipc/handlers/`) implement each channel
2. **Preload bridge** exposes typed `ipc()` and `on()` functions using these contracts
3. **React Query hooks** (`src/renderer/features/*/api/`) call `ipc()` with type-safe channel names
