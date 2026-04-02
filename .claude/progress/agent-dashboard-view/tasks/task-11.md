---
taskNumber: 11
taskName: ProgressWatcherV2 Service
taskSlug: progress-watcher-v2
wave: 1
complexity: high
blockedBy: none
agent: service-engineer
files_create:
  - src/main/services/progress-watcher-v2/index.ts
  - src/main/services/progress-watcher-v2/progress-watcher-v2-service.ts
  - src/main/services/progress-watcher-v2/task-file-parser.ts
files_modify: []
---

## Task: Create ProgressWatcherV2 service

Read `.claude/progress/agent-dashboard-view/phases-7-9-design.md` for full spec.

### Context
Phase 7 of the ADC v2 agent dashboard. Connect Layer 2 workflow tracking (.claude/progress/ task files) to the Layer 3 dashboard. The existing ProgressWatcher (src/main/services/workflow/progress-watcher.ts) syncs to Hub — do NOT modify it. This is a new, separate service for dashboard consumption.

### Interface
```typescript
export interface ProgressWatcherV2 {
  watchFeature: (slug: string) => void;
  stopWatching: (slug: string) => void;
  getTasksForFeature: (slug: string) => TaskProgress[];
  getTask: (slug: string, taskNumber: number) => TaskProgress | null;
  onTaskUpdated: (listener: (slug: string, task: TaskProgress) => void) => void;
  dispose: () => void;
}
```

### Task File Parsing Rules
- Watch `.claude/progress/<slug>/tasks/task-*.md` via fs.watch
- Parse YAML frontmatter: taskNumber, taskName, wave, complexity, status
- Parse body markdown `## Acceptance Criteria` checklist for TaskCriterion[]
- Derive phases from status field (pending/in-progress/completed/failed)
- Missing/malformed frontmatter → return defaults, never throw

### Files to Read for Context
- src/main/services/workflow/progress-watcher.ts — fs.watch pattern
- src/main/services/session-jsonl/session-jsonl-reader.ts — JSONL reading pattern
- src/shared/types/agent-dashboard.ts — TaskProgress, TaskPhase, TaskCriterion types
- .claude/progress/agent-dashboard-view/tasks/task-1.md — real task file format

### Acceptance Criteria
- [ ] watchFeature(slug) starts fs.watch on .claude/progress/<slug>/tasks/
- [ ] Task file changes trigger onTaskUpdated with parsed TaskProgress
- [ ] getTasksForFeature returns all tasks sorted by taskNumber
- [ ] getTask returns null for nonexistent (no throw)
- [ ] dispose() cleans up all fs.watch instances
- [ ] npm run lint && npm run typecheck pass
