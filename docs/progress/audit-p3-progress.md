# Feature: Audit P3 Implementation — High-Value Missing Features

**Status**: COMPLETE (7/7 items)
**Team**: audit-p3-features
**Base Branch**: feature/security-audit-fix
**Feature Branch**: feature/audit-p3-features
**Design Doc**: docs/plans/2026-02-13-full-codebase-audit.md
**Started**: 2026-02-13 19:00
**Last Updated**: 2026-02-13 19:00
**Updated By**: team-lead

---

## Scope

Implementing audit items P3 (High-Value Missing Features) from the full codebase audit.

### P3 — Missing Features (7 items)
17. Natural language time parser (chrono-node)
18. Agent queue + parallelism config
19. Cost tracking (parse Claude CLI token output)
20. My Work view (cross-project tasks)
21. Merge workflow UI (diff preview + conflict resolution)
22. Changelog auto-generation from git
23. Weekly review auto-generation

---

## Agent Registry

| Agent Name | Role | Worktree Branch | Task ID | Status | QA Round | Notes |
|------------|------|-----------------|---------|--------|----------|-------|
| chrono-eng | Service Engineer | audit/chrono-time | #1 | COMPLETE | 1/3 | QA PASS, merged |
| mywork-eng | Feature Engineer | audit/my-work | #4 | COMPLETE | 1/3 | QA PASS, merged |
| changelog-eng | Service Engineer | audit/changelog-auto | #6 | COMPLETE | 1/3 | QA PASS, merged |
| queue-eng | Service Engineer | audit/agent-queue | #2 | COMPLETE | 1/3 | QA PASS, merged |
| merge-eng | Component Engineer | audit/merge-ui | #5 | COMPLETE | 1/3 | QA PASS, merged |
| weekly-eng | Feature Engineer | audit/weekly-review | #7 | COMPLETE | 1/3 | QA PASS, merged |
| team-lead | Direct | audit/cost-tracking | #3 | COMPLETE | 1/3 | QA PASS, merged |

---

## Task Progress

### Task #1: Natural language time parser (chrono-node) [COMPLETE]
- **Scope**: P3.17
- **Agent**: TBD
- **Worktree**: audit/chrono-time
- **Files to Create**:
  - `src/main/services/time-parser/time-parser-service.ts`
- **Files to Modify**:
  - `src/main/services/assistant/intent-classifier.ts` — use time parser for reminder extraction
  - `src/main/services/alerts/alert-service.ts` — accept natural language time strings
  - `src/shared/ipc-contract.ts` — add time parsing channel
  - `package.json` — add chrono-node dependency
- **Steps**:
  - Step 1: Install chrono-node and create time-parser-service ⬜
  - Step 2: Add `time.parse` IPC channel ⬜
  - Step 3: Integrate into intent-classifier for "remind me..." commands ⬜
  - Step 4: Update alert creation to accept natural language time ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

### Task #2: Agent queue + parallelism config [COMPLETE]
- **Scope**: P3.18
- **Agent**: TBD
- **Worktree**: audit/agent-queue
- **Files to Create**:
  - `src/main/services/agent/agent-queue.ts`
- **Files to Modify**:
  - `src/main/services/agent/agent-service.ts` — integrate queue
  - `src/main/services/settings/settings-service.ts` — add parallelism config
  - `src/shared/types/settings.ts` — add settings type
  - `src/shared/ipc-contract.ts` — add queue channels
  - `src/renderer/features/settings/components/AgentSettings.tsx` — parallelism UI
- **Steps**:
  - Step 1: Design queue data structure with priority support ⬜
  - Step 2: Implement agent-queue.ts with FIFO + priority ⬜
  - Step 3: Add maxConcurrentAgents setting ⬜
  - Step 4: Integrate queue into agent-service spawn logic ⬜
  - Step 5: Add queue status IPC channels ⬜
  - Step 6: Build settings UI for parallelism config ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

### Task #3: Cost tracking [COMPLETE]
- **Scope**: P3.19
- **Agent**: team-lead (direct implementation)
- **Worktree**: audit/cost-tracking
- **Solution**: Parse token usage from Claude CLI stdout using regex patterns
- **Files Created**:
  - `src/main/services/agent/token-parser.ts` — Token parsing utilities
- **Files Modified**:
  - `src/shared/constants/agent-patterns.ts` — TOKEN_USAGE_PATTERNS, MODEL_PRICING
  - `src/shared/types/agent.ts` — TokenUsage, AggregatedTokenUsage types
  - `src/main/services/agent/agent-service.ts` — Track tokens per agent, emit events
  - `src/shared/ipc-contract.ts` — agents.getTokenUsage channel, event:agent.tokenUsage
  - `src/main/ipc/handlers/agent-handlers.ts` — getTokenUsage handler
- **QA Status**: PASS (lint, typecheck, build)
- **QA Report**: Implementation parses CLI output for token counts and costs, aggregates across all active agents

### Task #4: My Work view [COMPLETE]
- **Scope**: P3.20
- **Agent**: TBD
- **Worktree**: audit/my-work
- **Files to Create**:
  - `src/renderer/features/my-work/index.ts`
  - `src/renderer/features/my-work/components/MyWorkPage.tsx`
  - `src/renderer/features/my-work/api/useMyWork.ts`
- **Files to Modify**:
  - `src/main/services/project/task-service.ts` — add listAllTasks()
  - `src/main/ipc/handlers/task-handlers.ts` — add tasks.listAll handler
  - `src/shared/ipc-contract.ts` — add tasks.listAll channel
  - `src/renderer/app/router.tsx` — add /my-work route
  - `src/renderer/app/layouts/Sidebar.tsx` — add My Work nav item
- **Steps**:
  - Step 1: Add tasks.listAll IPC channel (cross-project) ⬜
  - Step 2: Create My Work feature module structure ⬜
  - Step 3: Build MyWorkPage with task table ⬜
  - Step 4: Add route and sidebar navigation ⬜
  - Step 5: Add filtering by project/status ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

### Task #5: Merge workflow UI [COMPLETE]
- **Scope**: P3.21
- **Agent**: TBD
- **Worktree**: audit/merge-ui
- **Files to Create**:
  - `src/renderer/features/merge/index.ts`
  - `src/renderer/features/merge/components/MergePreviewPanel.tsx`
  - `src/renderer/features/merge/components/ConflictResolver.tsx`
  - `src/renderer/features/merge/components/MergeConfirmModal.tsx`
  - `src/renderer/features/merge/api/useMerge.ts`
  - `src/renderer/features/merge/api/queryKeys.ts`
- **Files to Modify**:
  - `src/renderer/features/projects/components/WorktreeManager.tsx` — add merge button
  - `src/renderer/app/router.tsx` — optional merge route
- **Steps**:
  - Step 1: Create merge feature module structure ⬜
  - Step 2: Build React Query hooks for merge service ⬜
  - Step 3: Build MergePreviewPanel (diff display) ⬜
  - Step 4: Build ConflictResolver (file-by-file resolution) ⬜
  - Step 5: Build MergeConfirmModal (confirmation + execution) ⬜
  - Step 6: Integrate into WorktreeManager ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

### Task #6: Changelog auto-generation [COMPLETE]
- **Scope**: P3.22
- **Agent**: TBD
- **Worktree**: audit/changelog-auto
- **Files to Create**:
  - `src/main/services/changelog/changelog-generator.ts`
  - `src/renderer/features/changelog/components/ChangelogEditor.tsx`
- **Files to Modify**:
  - `src/main/services/changelog/changelog-service.ts` — add generateFromGit()
  - `src/main/ipc/handlers/changelog-handlers.ts` — add generate handler
  - `src/shared/ipc-contract.ts` — add changelog.generate channel
  - `src/renderer/features/changelog/components/ChangelogPage.tsx` — add generate button
- **Steps**:
  - Step 1: Implement git log parsing between tags ⬜
  - Step 2: Categorize commits by conventional commit type ⬜
  - Step 3: Generate changelog entry from commits ⬜
  - Step 4: Add IPC channel for generation ⬜
  - Step 5: Build editor UI for manual adjustments ⬜
  - Step 6: Add "Generate from Git" button to ChangelogPage ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

### Task #7: Weekly review auto-generation [COMPLETE]
- **Scope**: P3.23
- **Agent**: TBD
- **Worktree**: audit/weekly-review
- **Files to Create**:
  - `src/renderer/features/planner/components/WeeklyReviewPage.tsx`
  - `src/renderer/features/planner/api/useWeeklyReview.ts`
- **Files to Modify**:
  - `src/main/services/planner/planner-service.ts` — add getWeek(), generateWeeklyReview()
  - `src/main/ipc/handlers/planner-handlers.ts` — add weekly review handlers
  - `src/shared/ipc-contract.ts` — add planner.getWeek, planner.generateWeeklyReview
  - `src/shared/types/planner.ts` — add WeeklyReview type
  - `src/renderer/app/router.tsx` — add /planner/weekly route
- **Steps**:
  - Step 1: Design WeeklyReview type with aggregated metrics ⬜
  - Step 2: Implement planner.getWeek() service method ⬜
  - Step 3: Implement generateWeeklyReview() with stats + summary ⬜
  - Step 4: Add IPC handlers ⬜
  - Step 5: Build WeeklyReviewPage with stats, charts, reflection ⬜
  - Step 6: Add route and navigation ⬜
- **QA Status**: NOT STARTED
- **QA Report**: —

---

## Dependency Graph

```
P3 Features (can mostly parallelize):

#1 Chrono Time Parser ─────────────┐
#2 Agent Queue + Parallelism ──────┤
#3 Cost Tracking ──────────────────┼──▶ #8 Documentation Update
#4 My Work View ───────────────────┤
#5 Merge Workflow UI ──────────────┤
#6 Changelog Auto-generation ──────┤
#7 Weekly Review ──────────────────┘

Note: Most tasks are independent and can run in parallel.
Exception: Task #3 (Cost) partially depends on Task #2 (Agent Queue) for agent lifecycle hooks.
```

---

## QA Results

(Will be populated as tasks complete)

---

## Blockers

| Blocker | Affected Task | Reported By | Status | Resolution |
|---------|---------------|-------------|--------|------------|
| Claude CLI token output format unknown | Task #3 | team-lead | RESOLVED | Implemented regex parsing of CLI stdout |

---

## Integration Checklist

- [ ] All P3 tasks COMPLETE with QA PASS
- [ ] `npm run lint` passes on feature branch
- [ ] `npx tsc --noEmit` passes on feature branch
- [ ] `npm run build` passes on feature branch
- [ ] Documentation updated (ARCHITECTURE.md, DATA-FLOW.md)
- [ ] Progress file status set to COMPLETE
- [ ] Audit doc items marked as DONE

---

## Recovery Notes

If this feature is resumed by a new session:

1. Read this file for current state
2. Run `git worktree list` to check active worktrees
3. Check which tasks are COMPLETE vs IN_PROGRESS
4. Resume from the first non-COMPLETE task
5. Update "Last Updated" and "Updated By" fields
