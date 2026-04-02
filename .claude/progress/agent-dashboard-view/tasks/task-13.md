---
taskNumber: 13
taskName: IPC Handlers + Bootstrap Wiring
taskSlug: agent-dashboard-handlers-ext
wave: 2
complexity: medium
blockedBy: task-11,task-12
agent: ipc-handler-engineer
files_create: []
files_modify:
  - src/main/ipc/handlers/agent-dashboard-handlers.ts
  - src/main/ipc/index.ts
  - src/main/bootstrap/service-registry.ts
---

## Task: Wire ProgressWatcherV2 and QaRunner into agent dashboard IPC

Read `.claude/progress/agent-dashboard-view/phases-7-9-design.md` for full spec.

### Context
Wave 2 of phases 7+9. ProgressWatcherV2 (task-11) and schema extensions (task-12) are now built. Wire them into the IPC layer.

### Handler Changes (agent-dashboard-handlers.ts)
Add progressWatcher: ProgressWatcherV2 and qaRunner: QaRunner params to registerAgentDashboardHandlers().
Register invoke handlers:
- agent-dashboard.getTasksForFeature → progressWatcher.getTasksForFeature(slug) [call watchFeature lazily on first call]
- agent-dashboard.getTask → progressWatcher.getTask(slug, taskNumber)
- agent-dashboard.getQaSession → qaRunner.getSessionByTaskId(taskId), map to QaDashboardSession
- agent-dashboard.listQaSessions → return all QA sessions mapped to QaDashboardSession
Event forwarding:
- progressWatcher.onTaskUpdated → router.emit('event:agent-dashboard.taskUpdated', ...)
- qaRunner.onSessionEvent on 'completed'/'progress' → router.emit('event:agent-dashboard.qaSessionUpdated', ...)

### Services interface (ipc/index.ts)
Add progressWatcherV2: ProgressWatcherV2 to Services interface.

### Bootstrap (service-registry.ts)
QaRunner is already instantiated (~line 443). Just pass it through.
Instantiate createProgressWatcherV2() and add to services object.
Pass both to registerAgentDashboardHandlers.

### mapQaSessionToDashboard helper
Map QaSession+QaReport → QaDashboardSession:
- QaResult 'pass'/'fail'/'warnings' → QaVerdict; 'building'/'launching'/'testing' → 'running'
- VerificationSuite maps 1:1 (pass/fail → pass/fail, absent → 'pending')
- Strip screenshot paths from issues

### Files to Read for Context
- src/main/ipc/handlers/agent-dashboard-handlers.ts — current handler (post task-11/12 merge)
- src/main/ipc/index.ts — Services interface
- src/main/bootstrap/service-registry.ts — qaRunner instantiation pattern
- src/main/services/progress-watcher-v2/index.ts — service interface
- src/main/services/qa/qa-types.ts — QaRunner, QaSessionEvent

### Acceptance Criteria
- [ ] All 4 new invoke handlers registered and functional
- [ ] taskUpdated event fires when task file changes
- [ ] qaSessionUpdated event fires on QA session progress/completion
- [ ] progressWatcherV2 instantiated in service-registry before IPC registration
- [ ] npm run lint && npm run typecheck && npm run build pass
