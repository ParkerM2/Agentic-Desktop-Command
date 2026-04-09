---
taskNumber: 3
taskName: "Migrate notes-service to SQLite"
taskSlug: "migrate-notes-service"
agentRole: "service-engineer"
agentDefinition: ".claude/agents/service-engineer.md"
wave: 2
blockedBy: [1]
blocks: [4]
estimatedTokens: 16000
complexity: "MEDIUM"
status: "pending"
workbranch: null
worktreePath: null
teamLeaderName: null
teamName: null
---

# Task 3: Migrate notes-service to SQLite

## Description
Rewrite `createNotesService()` to use Drizzle ORM queries against the `notes` SQLite table instead of reading/writing `notes.json`. Add a one-time JSON migration. The search method should use SQLite LIKE queries. DO NOT modify service-registry.ts (Task 2 handles that).

## Acceptance Criteria
- [ ] `listNotes(filters?)` queries SQLite with optional projectId/tag filtering, sorted pinned-first then updatedAt DESC
- [ ] `createNote(data)` inserts into SQLite with UUID + timestamps + defaults (tags=[], pinned=false)
- [ ] `updateNote(id, updates)` updates fields + bumps updatedAt timestamp
- [ ] `deleteNote(id)` deletes from SQLite
- [ ] `searchNotes(query)` uses SQLite LIKE on title and content (case-insensitive)
- [ ] `migrateFromJson(dataDir)` reads notes.json → inserts into table (if table empty + file exists)
- [ ] Router.emit for NOTES_EVENTS.NOTE.CHANGED fires on create/update/delete
- [ ] ReinitializableService interface removed
- [ ] `npm run typecheck` passes

## Files to Modify
- `src/main/services/notes/notes-service.ts` — rewrite for Drizzle

## Files to Read for Context
- `src/main/db/schema.ts` — notes table definition
- `src/shared/types/note.ts` — Note interface
- `src/shared/ipc/misc/notes.channels.ts` — NOTES, NOTES_EVENTS constants
- `src/main/ipc/handlers/notes-handlers.ts` — how the service is called
- `src/main/services/notes/notes-service.ts` — current implementation

## Rules That Apply
- Services use factory pattern: `createNotesService(deps)` returning interface
- `import type` for all type-only imports
- Use `node:` protocol for Node builtins

## Implementation Notes
- Tag filtering: notes.tags is JSON array. Use `JSON_EXTRACT` or load all + filter in JS (simpler, notes are small)
- Search: `WHERE title LIKE '%query%' OR content LIKE '%query%'` (use `sql` template from drizzle-orm for LIKE)
- Sort: `ORDER BY pinned DESC, updated_at DESC`
- The factory should accept `{ db: AdcDatabase, router: IpcRouter, dataDir: string }`
- Don't touch service-registry.ts — Task 2 will wire both services
