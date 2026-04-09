---
taskNumber: 1
taskName: "Add SQLite schema for captures + notes"
taskSlug: "schema-captures-notes"
agentRole: "database-engineer"
agentDefinition: ".claude/agents/database-engineer.md"
wave: 1
blockedBy: []
blocks: [2, 3]
estimatedTokens: 12000
complexity: "LOW"
status: "pending"
workbranch: null
worktreePath: null
teamLeaderName: null
teamName: null
---

# Task 1: Add SQLite schema for captures + notes

## Description
Add `captures` and `notes` tables to the existing Drizzle ORM schema at `src/main/db/schema.ts`. Then run `npx drizzle-kit generate` to produce the SQL migration file. The tables must match the existing data shapes from the JSON files exactly.

## Acceptance Criteria
- [ ] `captures` table: id (text PK), text (text NOT NULL), created_at (text NOT NULL)
- [ ] `notes` table: id (text PK), title, content, tags (JSON string[]), project_id, task_id, pinned (boolean default false), created_at, updated_at
- [ ] `notes` has indexes on project_id and updated_at
- [ ] Migration SQL generated in `drizzle/` directory
- [ ] `npm run typecheck` passes
- [ ] Existing tables (commands, sessions, busEvents) unchanged

## Files to Modify
- `src/main/db/schema.ts` — add captures + notes table definitions after busEvents

## Files to Read for Context
- `src/main/db/schema.ts` — existing table pattern
- `src/shared/types/note.ts` — Note type definition
- `src/shared/ipc/dashboard/contract.ts` — capture Zod schemas
- `drizzle.config.ts` — migration config

## Rules That Apply
- Use `text('field_name')` for strings, `integer('field', { mode: 'boolean' })` for booleans
- Use `text('field', { mode: 'json' })` for JSON arrays (tags)
- Follow snake_case for column names
- Add indexes for frequently queried columns

## Implementation Notes
- Run `npx drizzle-kit generate` after adding tables to produce migration SQL
- The `captures` table is trivially simple — 3 columns, no indexes needed
- The `notes` table needs indexes on `project_id` (filtering) and `updated_at` (sorting)
- Tags are stored as JSON text: `text('tags', { mode: 'json' }).$type<string[]>()`
