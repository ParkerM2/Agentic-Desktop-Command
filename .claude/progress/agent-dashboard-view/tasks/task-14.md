---
taskNumber: 14
taskName: React Query Hooks for Task Progress + QA
taskSlug: agent-dashboard-hooks-ext
wave: 2
complexity: medium
blockedBy: task-12
agent: hook-engineer
files_create:
  - src/renderer/features/agent-dashboard/api/useTaskProgress.ts
  - src/renderer/features/agent-dashboard/api/useQaSession.ts
  - src/renderer/features/agent-dashboard/hooks/useProgressEvents.ts
  - src/renderer/features/agent-dashboard/hooks/useQaEvents.ts
files_modify:
  - src/renderer/features/agent-dashboard/api/queryKeys.ts
---

## Task: React Query hooks for task progress and QA session data

Read `.claude/progress/agent-dashboard-view/phases-7-9-design.md` for full spec.

### Context
Wave 2 of phases 7+9. Schema extensions (task-12) are built. Create hooks so components can query task and QA data.

### New query keys (queryKeys.ts)
```typescript
tasks: (featureSlug: string) => [...all, 'tasks', featureSlug] as const,
task: (featureSlug: string, taskNumber: number) => [...all, 'task', featureSlug, taskNumber] as const,
qaSession: (taskId: string) => [...all, 'qa', taskId] as const,
qaSessions: () => [...all, 'qa-sessions'] as const,
```

### Hooks to create
- useTasksForFeature(featureSlug: string | undefined) — disabled when undefined, staleTime 10s
- useTask(featureSlug: string | undefined, taskNumber: number | undefined) — disabled when either undefined
- useQaSession(taskId: string | undefined) — disabled when undefined, staleTime 5s
- useQaSessions() — staleTime 5s
- useProgressEvents() — subscribes to event:agent-dashboard.taskUpdated, invalidates tasks queries
- useQaEvents() — subscribes to event:agent-dashboard.qaSessionUpdated, invalidates qa queries

### Files to Read for Context
- src/renderer/features/agent-dashboard/api/useAgentSessions.ts — query hook pattern
- src/renderer/features/agent-dashboard/api/queryKeys.ts — key factory pattern
- src/renderer/shared/lib/ipc.ts — ipc() helper and event subscription API

### Acceptance Criteria
- [ ] All hooks disabled (enabled: false) when required params are undefined
- [ ] useProgressEvents invalidates agentDashboardKeys.tasks(featureSlug) on event
- [ ] useQaEvents invalidates agentDashboardKeys.qaSession(session.taskId) on event
- [ ] Event subscriptions cleaned up in useEffect return
- [ ] npm run lint && npm run typecheck pass
