---
taskNumber: 2
taskName: "Migrate dashboard-service to SQLite"
taskSlug: "migrate-dashboard-service"
agentRole: "service-engineer"
agentDefinition: ".claude/agents/service-engineer.md"
wave: 2
blockedBy: [1]
blocks: [4]
estimatedTokens: 15000
complexity: "MEDIUM"
status: "pending"
workbranch: null
worktreePath: null
teamLeaderName: null
teamName: null
---

# Task 2: Migrate dashboard-service to SQLite

## Description
Rewrite `createDashboardService()` to use Drizzle ORM queries against the `captures` SQLite table instead of reading/writing `captures.json`. Add a one-time migration function that reads the JSON file (if it exists) and inserts records into the SQLite table (only if the table is empty). Update service-registry.ts to pass `db` to the service. Also add `db` parameter wiring for the notes service (Task 3 needs this but can't touch service-registry).

## Acceptance Criteria
- [ ] `listCaptures()` queries SQLite, returns sorted by created_at DESC
- [ ] `createCapture(text)` inserts into SQLite with UUID + ISO timestamp
- [ ] `deleteCapture(id)` deletes from SQLite
- [ ] `migrateFromJson(dataDir)` reads captures.json → inserts into table (if table empty + file exists)
- [ ] Router.emit for DASHBOARD_EVENTS.CAPTURE.CHANGED still fires on create/delete
- [ ] Service-registry passes `db` to dashboard service AND notes service
- [ ] ReinitializableService interface removed from dashboard service (no longer needed with SQLite)
- [ ] `npm run typecheck` passes

## Files to Modify
- `src/main/services/dashboard/dashboard-service.ts` — rewrite for Drizzle
- `src/main/bootstrap/service-registry.ts` — pass `db` to dashboard + notes services

## Files to Read for Context
- `src/main/db/schema.ts` — captures table definition
- `src/main/db/connection.ts` — AdcDatabase type
- `src/shared/ipc/dashboard/channels.ts` — DASHBOARD, DASHBOARD_EVENTS constants
- `src/main/ipc/handlers/dashboard-handlers.ts` — how the service is called
- `src/main/services/dashboard/dashboard-service.ts` — current implementation

## Rules That Apply
- Services use factory pattern: `createDashboardService(deps)` returning interface
- `import type` for all type-only imports
- Use `node:` protocol for Node builtins
- Events emitted via `router.emit(DASHBOARD_EVENTS.CAPTURE.CHANGED, { captureId })`

## Implementation Notes
- Use `crypto.randomUUID()` for IDs (same as current)
- JSON migration: `readFileSync` the JSON, parse, insert each record. Wrap in try/catch.
- The service factory should accept `{ db: AdcDatabase, router: IpcRouter, dataDir: string }` — dataDir only for JSON migration path
- After migration works, the JSON file can remain on disk (no deletion needed yet)
- For service-registry: find where `createDashboardService` and `createNotesService` are called, add `db` to their deps
