---
taskNumber: 12
taskName: IPC Schema + Types Extension
taskSlug: agent-dashboard-schema-ext
wave: 1
complexity: medium
blockedBy: none
agent: schema-designer
files_create: []
files_modify:
  - src/shared/ipc/agent-dashboard/schemas.ts
  - src/shared/ipc/agent-dashboard/contract.ts
  - src/shared/types/agent-dashboard.ts
---

## Task: Extend agent dashboard IPC schema for task progress + QA

Read `.claude/progress/agent-dashboard-view/phases-7-9-design.md` for full spec.

### Context
Phase 7+9 of ADC v2. Add IPC channels for ProgressWatcherV2 task data and QaRunner session data to the existing agent dashboard contract.

### New Zod Schemas (schemas.ts)
- WorkflowTaskSchema (maps to TaskProgress — taskNumber, taskName, phases, acceptanceCriteria)
- TaskPhaseSchema, TaskCriterionSchema
- QaDashboardSessionSchema (verdict, checksRun, checksPassed, issues, verificationSuite, duration)
- QaIssueSchema (severity, category, description, location?)
- QaVerificationSuiteSchema (lint/typecheck/test/build/docs each: 'pass'|'fail'|'pending')

### New Invoke Channels (contract.ts)
- agent-dashboard.getTasksForFeature: input {featureSlug: string}, output WorkflowTaskSchema[]
- agent-dashboard.getTask: input {featureSlug: string, taskNumber: number}, output WorkflowTaskSchema|null
- agent-dashboard.getQaSession: input {taskId: string}, output QaDashboardSessionSchema|null
- agent-dashboard.listQaSessions: input {}, output QaDashboardSessionSchema[]

### New Event Channels (contract.ts)
- event:agent-dashboard.taskUpdated: payload {featureSlug: string, task: WorkflowTaskSchema}
- event:agent-dashboard.qaSessionUpdated: payload QaDashboardSessionSchema

### New Types (agent-dashboard.ts)
- QaVerdict = 'pass'|'fail'|'warnings'|'running'|'none'
- QaDashboardSession, QaDashboardIssue, QaVerificationSuite (see design doc section 3)

### Files to Read for Context
- src/shared/ipc/agent-dashboard/schemas.ts — existing schema patterns
- src/shared/ipc/agent-dashboard/contract.ts — existing contract structure
- src/shared/types/agent-dashboard.ts — existing types (TaskProgress already defined there)
- src/main/services/qa/qa-types.ts — source types to map from

### Acceptance Criteria
- [ ] All new schemas validate against real data shapes
- [ ] WorkflowTaskSchema consistent with existing TaskProgress type
- [ ] All new channels in agentDashboardInvoke/agentDashboardEvents exports
- [ ] src/shared/ipc/agent-dashboard/index.ts re-exports new schemas
- [ ] npm run lint && npm run typecheck pass
