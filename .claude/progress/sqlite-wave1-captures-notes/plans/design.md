# Feature Design: Migrate Captures + Notes to SQLite

**Author**: /new-plan
**Created**: 2026-04-09
**Status**: READY FOR IMPLEMENTATION
**Workflow Mode**: standard

---

## 1. Overview

Migrate the Dashboard Captures and Notes services from JSON file-based storage to SQLite tables in `adc.db`. This is Wave 1 of the Phase 2 command bus data migration — two simple, independent JSON stores that follow the same migration pattern.

Both services currently read/write JSON files (`captures.json`, `notes.json`) in the user data directory. After migration, data will live in SQLite tables accessed via Drizzle ORM, while the IPC channels, contracts, and renderer hooks remain unchanged.

## 2. Requirements

### Functional Requirements
- Captures CRUD (list, create, delete) works identically after migration
- Notes CRUD + search (list, create, update, delete, search) works identically after migration
- One-time migration reads existing JSON files and inserts into SQLite on first access
- Events (`CAPTURE.CHANGED`, `NOTE.CHANGED`) continue to fire correctly
- Sort order preserved: captures by createdAt desc, notes by pinned first then updatedAt desc

### Non-Functional Requirements
- Zero downtime: migration happens transparently on service init
- Backward compatible: if JSON file exists but table is empty, auto-migrate
- Performance: SQLite queries should be faster than JSON file reads for notes search

### Out of Scope
- Changing IPC contracts or renderer hooks (channels stay the same)
- Adding new features to captures or notes
- Migrating other JSON stores (those are separate Wave 1 tasks)

## 3. Architecture

### Selected Approach
Add `captures` and `notes` tables to the existing Drizzle schema. Update the services to accept `AdcDatabase` as a dependency instead of `dataDir`. Add a `migrateFromJson()` helper that runs once if the table is empty and a JSON file exists.

### Data Model

```typescript
// captures table
export const captures = sqliteTable('captures', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});

// notes table
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  projectId: text('project_id'),
  taskId: text('task_id'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_notes_project_id').on(table.projectId),
  index('idx_notes_updated_at').on(table.updatedAt),
]);
```

### Integration Points
- `src/main/db/schema.ts` — add tables
- `src/main/services/dashboard/dashboard-service.ts` — replace JSON with Drizzle
- `src/main/services/notes/notes-service.ts` — replace JSON with Drizzle
- `src/main/bootstrap/service-registry.ts` — pass `db` to updated services
- Generate new Drizzle migration via `npx drizzle-kit generate`

## 4. Task Breakdown

### Task 1: Add SQLite schema + generate migration

**Agent**: database-engineer
**Wave**: 1
**Blocked by**: none
**Complexity**: LOW
**Context budget**: ~12,000 tokens

Add `captures` and `notes` tables to `src/main/db/schema.ts`. Run `npx drizzle-kit generate` to create the migration SQL. Export new tables from barrel.

**Files to Modify**:
- `src/main/db/schema.ts` — add captures + notes tables with indexes
- `src/main/db/index.ts` — ensure new tables are exported (already uses `export *`)

**Files Created by Tool**:
- `drizzle/0001_*.sql` — auto-generated migration

**Acceptance Criteria**:
- [ ] `captures` table has: id, text, created_at
- [ ] `notes` table has: id, title, content, tags (JSON), project_id, task_id, pinned, created_at, updated_at
- [ ] notes table has indexes on project_id and updated_at
- [ ] Migration generated successfully
- [ ] `npm run typecheck` passes

### Task 2: Migrate dashboard-service to SQLite

**Agent**: service-engineer
**Wave**: 2
**Blocked by**: Task 1
**Complexity**: MEDIUM
**Context budget**: ~15,000 tokens

Rewrite `createDashboardService()` to use Drizzle queries instead of JSON file I/O. Add `migrateFromJson()` that reads `captures.json` if it exists and inserts into the `captures` table (only if table is empty). Remove the ReinitializableService pattern (SQLite handles user scope via the shared db). Update service-registry to pass `db`.

**Files to Modify**:
- `src/main/services/dashboard/dashboard-service.ts` — rewrite to use Drizzle
- `src/main/bootstrap/service-registry.ts` — pass `db` to dashboard service

**Files to Read for Context**:
- `src/main/db/schema.ts` — table definitions
- `src/shared/ipc/dashboard/channels.ts` — channel constants
- `src/shared/ipc/dashboard/contract.ts` — Zod schemas

**Acceptance Criteria**:
- [ ] listCaptures returns captures sorted by createdAt desc
- [ ] createCapture inserts into SQLite and returns the capture
- [ ] deleteCapture removes from SQLite
- [ ] JSON migration runs if captures.json exists and table is empty
- [ ] Events still emitted via router.emit
- [ ] `npm run typecheck` passes

### Task 3: Migrate notes-service to SQLite

**Agent**: service-engineer
**Wave**: 2
**Blocked by**: Task 1
**Complexity**: MEDIUM
**Context budget**: ~16,000 tokens

Rewrite `createNotesService()` to use Drizzle queries. Add `migrateFromJson()` for notes.json. The search method should use SQLite LIKE queries instead of in-memory filtering. Update service-registry.

**Files to Modify**:
- `src/main/services/notes/notes-service.ts` — rewrite to use Drizzle
- `src/main/bootstrap/service-registry.ts` — pass `db` to notes service

**Files to Read for Context**:
- `src/main/db/schema.ts` — table definitions
- `src/shared/types/note.ts` — Note interface
- `src/shared/ipc/misc/notes.channels.ts` — channel constants

**Acceptance Criteria**:
- [ ] listNotes returns notes with optional projectId/tag filtering
- [ ] Sort: pinned first, then updatedAt desc
- [ ] createNote, updateNote, deleteNote work correctly
- [ ] searchNotes uses SQLite LIKE for title + content
- [ ] JSON migration runs on first access
- [ ] Events still emitted
- [ ] `npm run typecheck` passes

### Task 4: Update tests + verify

**Agent**: test-engineer
**Wave**: 3
**Blocked by**: Tasks 2, 3
**Complexity**: MEDIUM
**Context budget**: ~16,000 tokens

Update or write tests for the migrated services. Verify JSON migration path. Run full test suite.

**Files to Create**:
- `tests/unit/services/dashboard-service.test.ts` — captures CRUD + migration
- `tests/unit/services/notes-service.test.ts` — notes CRUD + search + migration

**Files to Read for Context**:
- `src/main/services/dashboard/dashboard-service.ts`
- `src/main/services/notes/notes-service.ts`
- `tests/unit/services/db-connection.test.ts` — pattern for db test setup

**Acceptance Criteria**:
- [ ] Captures: list, create, delete tested
- [ ] Notes: list, create, update, delete, search tested
- [ ] Notes: filtering by projectId and tag tested
- [ ] JSON migration path tested (write JSON file, init service, verify data in SQLite)
- [ ] All tests pass: `npx vitest run`
- [ ] Full verify: `npm run lint && npm run typecheck && npm run build`

## 5. Wave Plan

### Wave 1: Schema (no blockers)
- Task 1: Add SQLite schema + migration — database-engineer

### Wave 2: Services (blocked by Wave 1)
- Task 2: Migrate dashboard-service — service-engineer
- Task 3: Migrate notes-service — service-engineer
  (Tasks 2 & 3 touch different files — can run in parallel)

### Wave 3: Verification (blocked by Wave 2)
- Task 4: Update tests + verify — test-engineer

### Dependency Graph
```
#1 Schema ──┬──> #2 Dashboard Service ──┬──> #4 Tests
            └──> #3 Notes Service ──────┘
```

## 6. File Ownership Matrix

| File | Task |
|------|------|
| `src/main/db/schema.ts` | Task 1 |
| `src/main/db/index.ts` | Task 1 |
| `drizzle/0001_*.sql` | Task 1 |
| `src/main/services/dashboard/dashboard-service.ts` | Task 2 |
| `src/main/services/notes/notes-service.ts` | Task 3 |
| `src/main/bootstrap/service-registry.ts` | Tasks 2+3 (CONFLICT — see note) |
| `tests/unit/services/dashboard-service.test.ts` | Task 4 |
| `tests/unit/services/notes-service.test.ts` | Task 4 |

**Conflict Resolution**: service-registry.ts is modified by both Tasks 2 and 3. Since they run in the same wave, Task 2 takes ownership. Task 3's service-registry change (passing db to notes service) will be handled as a one-line addition in Task 2's scope.

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| JSON migration fails on malformed data | Low | Medium | Wrap in try/catch, log errors, skip bad entries |
| Service-registry conflict between Task 2+3 | Medium | Low | Task 2 owns the file, adds both service wiring changes |
| ReinitializableService removal breaks login flow | Low | Medium | SQLite is global (not user-scoped), test login/logout cycle |

## Task Handoff Files

Per-agent task files at `.claude/progress/sqlite-wave1-captures-notes/tasks/`:
- task-1.md — Add SQLite schema + generate migration
- task-2.md — Migrate dashboard-service to SQLite
- task-3.md — Migrate notes-service to SQLite
- task-4.md — Update tests + verify

To execute this plan, run: `/agent-team`
