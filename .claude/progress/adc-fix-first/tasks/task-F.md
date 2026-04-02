---
taskNumber: F
taskName: Listener Leak and watchFeature Startup Bug
taskSlug: adc-fix-progress-watcher
agentRole: service-engineer
agentDefinition: null
wave: 2
blockedBy: []
blocks: []
estimatedTokens: 7000
complexity: medium
teamLeaderName: "team-lead"
teamName: adc-fix-first
workbranch: work/adc-fix-first/adc-fix-progress-watcher
worktreePath: /Users/parker/Desktop/Agentic-Desktop-Command
status: pending
---

## Task F: Listener Leak + watchFeature Startup Bug

### Context
Two bugs in progress-watcher-v2-service.ts:
1. `listeners: TaskUpdateCallback[]` array allows duplicate registrations — not idempotent
2. `watchFeature()` fails silently if the tasks directory doesn't exist yet

### Files to Modify
- `src/main/services/progress-watcher-v2/progress-watcher-v2-service.ts`

### What to Do

**F1 — Set-based listeners (idempotent)**:
1. Change `listeners: TaskUpdateCallback[]` to `listeners: Set<TaskUpdateCallback>`
2. Update all places that add to listeners (`.push()` → `.add()`)
3. Update all places that iterate listeners (already works with Set)
4. Add `offTaskUpdated(cb: TaskUpdateCallback): void` method that calls `listeners.delete(cb)`
5. Update the interface/type definition if it has `onTaskUpdated` — add `offTaskUpdated` too

**F2 — watchFeature missing-dir retry**:
1. In `watchFeature()`, if the tasks directory does not exist:
   - Watch the parent directory (the slug's feature dir) for subdirectory creation
   - When `tasks/` appears, create the actual file watcher
   - Remove slug from `watchedSlugs` set until the watcher is established (so retry is possible)
2. The retry should happen automatically on directory creation — no polling loop

### Files to Read First
- `src/main/services/progress-watcher-v2/progress-watcher-v2-service.ts` — full file
- `src/main/services/progress-watcher-v2/index.ts` — exported interface

### Acceptance Criteria
- [ ] `listeners` is `Set<TaskUpdateCallback>` (not array)
- [ ] `offTaskUpdated(cb)` method added and exported in interface
- [ ] Multiple calls to `onTaskUpdated` with same cb are idempotent
- [ ] `watchFeature()` handles missing tasks dir with directory-creation watcher
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

### Rules
- Read `ai-docs/CODEBASE-GUARDIAN.md` and `ai-docs/LINTING.md` before writing any code
- Minimal changes — do not refactor beyond what's described
