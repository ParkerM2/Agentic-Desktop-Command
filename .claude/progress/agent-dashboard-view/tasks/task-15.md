---
taskNumber: 15
taskName: TasksTab + QaPanel Components
taskSlug: agent-dashboard-tasks-qa-ui
wave: 3
complexity: high
blockedBy: task-13,task-14
agent: component-engineer
files_create:
  - src/renderer/features/agent-dashboard/components/TasksTab.tsx
  - src/renderer/features/agent-dashboard/components/QaPanel.tsx
files_modify:
  - src/renderer/features/agent-dashboard/components/AgentPanelExpanded.tsx
  - src/renderer/features/agent-dashboard/components/AgentPanelPopup.tsx
  - src/renderer/features/agent-dashboard/index.ts
---

## Task: Add Tasks tab and QA panel to agent dashboard panels

Read `.claude/progress/agent-dashboard-view/phases-7-9-design.md` for full spec.

### Context
Wave 3 (final) of phases 7+9. All services and hooks are built. Add the Tasks and QA UI.

### TasksTab (TasksTab.tsx)
Props: { taskId?: string; featureSlug?: string; className?: string }
- Use useTasksForFeature(featureSlug) then find task by taskId
- Empty state: "No task assigned" when taskId is undefined
- Show: task name, progress bar (completed phases / total), phases checklist, acceptance criteria
- Phase icons: CheckCircle2 (completed), Clock with animate-pulse (in-progress), Circle (pending)
- Colors from CSS custom properties only (bg-success, bg-warning, text-muted-foreground etc.)
- featureSlug derivation from agent: parse session.branch 'work/<slug>/<task>' or 'feature/<slug>',
  fallback to 'agent-dashboard-view'

### QaPanel (QaPanel.tsx)
Props: { taskId?: string; className?: string }
- Use useQaSession(taskId)
- Empty state: "No QA data" when no session
- Show: verdict badge (pass=success, fail=destructive, warnings=warning, running=info, none=secondary)
- Show: 5-column verification suite grid (lint/typecheck/test/build/docs) with CheckCircle2/XCircle
- Show: issues list with severity color coding (critical=destructive, major=warning, minor=muted)

### AgentPanelExpanded updates
- Add 4th tab "Tasks" with ListChecks icon between Errors and end
- Mount TasksTab with agent.taskId and derived featureSlug
- Add QaPanel below the tabs or as a collapsible section (your call — match visual hierarchy)

### AgentPanelPopup updates
- Same Tasks tab addition
- QaPanel in popup body

### index.ts
Export TasksTab and QaPanel from the barrel.

### Files to Read for Context
- src/renderer/features/agent-dashboard/components/AgentPanelExpanded.tsx — existing tabs
- src/renderer/features/agent-dashboard/components/AgentPanelPopup.tsx — popup tabs
- src/renderer/features/agent-dashboard/api/useTaskProgress.ts — hook (task-14)
- src/renderer/features/agent-dashboard/api/useQaSession.ts — hook (task-14)
- src/shared/types/agent-dashboard.ts — TaskProgress, QaDashboardSession
- ai-docs/DESIGN-SYSTEM.md — color tokens
- docs/features/agent-dashboard-view/plan.md — Tasks tab visual spec

### Acceptance Criteria
- [ ] Tasks tab added as 4th tab in both Expanded and Popup panels
- [ ] TasksTab shows task name, progress bar, phases checklist, acceptance criteria
- [ ] QaPanel shows verdict badge, verification suite, issues list
- [ ] All empty/loading states handled
- [ ] No hardcoded hex/rgba colors
- [ ] TasksTab and QaPanel exported from index.ts
- [ ] npm run lint && npm run typecheck && npm run build pass
