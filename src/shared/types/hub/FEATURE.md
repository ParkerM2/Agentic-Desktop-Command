# Hub Protocol Types

TypeScript type definitions for the Hub REST API and WebSocket protocol. These define the wire format for all Hub server communication.

## Key Files

- **`auth.ts`** — Login, register, refresh request/response types, User type
- **`devices.ts`** — Device registration, capabilities, list responses
- **`workspaces.ts`** — Workspace CRUD request/response types
- **`projects.ts`** — Project and sub-project CRUD types
- **`tasks.ts`** — Task CRUD, progress, execution, list query types
- **`events.ts`** — All WebSocket event types (task, project, workspace, device, command events)
- **`enums.ts`** — Shared enum literals (TaskStatus, TaskPriority, DeviceType, RepoStructure)
- **`errors.ts`** — API error codes and error response type
- **`guards.ts`** — Runtime type guard functions for WebSocket event discrimination
- **`transitions.ts`** — Valid task status transition rules
- **`legacy.ts`** — Deprecated Computer* and DeviceAuth* types (kept for backward compatibility)
- **`index.ts`** — Barrel re-export of all types

## How It Connects

- **Hub API client** (`src/main/services/hub/hub-api-client.ts`) sends/receives these types
- **IPC handlers** transform Hub types to local types at the IPC boundary (snake_case -> camelCase)
- **Task handlers** use `status-mapping.ts` to convert between Hub and local status enums
