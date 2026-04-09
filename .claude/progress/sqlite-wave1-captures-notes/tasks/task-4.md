---
taskNumber: 4
taskName: "Tests + final verification"
taskSlug: "tests-and-verify"
agentRole: "test-engineer"
agentDefinition: ".claude/agents/test-engineer.md"
wave: 3
blockedBy: [2, 3]
blocks: []
estimatedTokens: 16000
complexity: "MEDIUM"
status: "pending"
workbranch: null
worktreePath: null
teamLeaderName: null
teamName: null
---

# Task 4: Tests + final verification

## Description
Write comprehensive unit tests for the migrated dashboard-service and notes-service. Test CRUD operations, search, JSON migration path, and edge cases. Run full verification suite.

## Acceptance Criteria
- [ ] Dashboard service tests: list (empty + populated), create, delete, sort order
- [ ] Notes service tests: list, create, update, delete, search, filter by projectId, filter by tag
- [ ] Notes sort order test: pinned notes appear first, then by updatedAt desc
- [ ] JSON migration test: create JSON file, init service, verify data migrated to SQLite
- [ ] JSON migration skip test: table already has data, JSON file ignored
- [ ] All new tests pass: `npx vitest run tests/unit/services/dashboard-service.test.ts tests/unit/services/notes-service.test.ts`
- [ ] Full suite passes: `npx vitest run`
- [ ] Full verify: `npm run lint && npm run typecheck && npm run build`

## Files to Create
- `tests/unit/services/dashboard-service.test.ts`
- `tests/unit/services/notes-service.test.ts`

## Files to Read for Context
- `src/main/services/dashboard/dashboard-service.ts` — service under test
- `src/main/services/notes/notes-service.ts` — service under test
- `tests/unit/services/db-connection.test.ts` — pattern: temp dir, initDatabase, closeDatabase, mock electron
- `tests/unit/services/command-bus.test.ts` — pattern: create temp db for testing

## Rules That Apply
- Mock `electron` with `vi.mock('electron', () => ({ app: { isPackaged: false } }))`
- Use `mkdtempSync` for temp dirs, clean up in `afterEach`
- Pass `migrationsFolder` to `initDatabase()` for test portability
- Mock `IpcRouter` with `{ emit: vi.fn() }` for event verification

## Implementation Notes
- Each test creates a fresh SQLite database in a temp dir
- For JSON migration tests, write a JSON file to the temp dir before initializing the service
- The router mock only needs an `emit` method (services call `router.emit()`)
- Test search with mixed case to verify case-insensitivity
