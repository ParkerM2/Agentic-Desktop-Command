---
taskNumber: 7
taskName: Plugin Tracking Consolidation
taskSlug: tracking-consolidation
wave: 4
complexity: medium
blockedBy: task-2
agent: service-engineer
branch: claude-plugin-improvements/tracking-consolidation
---

## Task: Consolidate dual tracking systems in claude-workflow plugin

**Location**: `~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/hooks/`

### Problem

Two separate tracking systems exist:
1. `tracker.js` — writes to `.claude/progress/<feature>/events.jsonl` (the /track command)
2. `tracking.js` + `tracking-emitter.js` — writes to `.claude/tracking/<feature>/events.jsonl`

This creates two sources of truth for the same feature's event history.

### Changes Required

1. **Read both files** to understand what each tracks and the schema differences
2. **Consolidate to `.claude/progress/`** — this is the canonical location per the gpMS spec
3. **Update tracking-emitter.js** to write to the same `.claude/progress/<feature>/events.jsonl` path that tracker.js uses
4. **Ensure event schemas are compatible** — if they differ, normalize to the tracker.js format (which has the `v, ts, sid, seq` envelope)
5. **Update any references** in other hook files that read from `.claude/tracking/`

### Acceptance Criteria
- Only one events.jsonl per feature (in `.claude/progress/`)
- tracking-emitter.js writes to the same location as tracker.js
- No orphaned events in `.claude/tracking/`
- Event format is consistent (single schema)
