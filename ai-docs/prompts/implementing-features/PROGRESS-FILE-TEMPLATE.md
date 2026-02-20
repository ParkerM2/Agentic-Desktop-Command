# Progress File Template

> Template for crash-recovery progress tracking. Used by the workflow plugin in `.claude/progress/`.

---

```markdown
# Feature: <Feature Name>

**Status**: PLANNING | IN_PROGRESS | QA_REVIEW | INTEGRATING | DOCUMENTING | COMPLETE
**Team**: <team-name>
**Base Branch**: master
**Feature Branch**: feature/<feature-name>
**Design Doc**: docs/plans/<design-doc>.md
**Started**: <YYYY-MM-DD HH:MM>
**Last Updated**: <YYYY-MM-DD HH:MM>
**Updated By**: <agent name or "team-lead">

---

## Agent Registry

| Agent Name | Role | Worktree Branch | Task ID | Status | QA Round | Notes |
|------------|------|-----------------|---------|--------|----------|-------|
| | | | | PENDING / IN_PROGRESS / QA / COMPLETE / FAILED | 0/3 | |

---

## Task Progress

### Task #1: <task name> [STATUS]
- **Agent**: <agent-name>
- **Worktree**: <branch or "main">
- **Files Created**: <list>
- **Files Modified**: <list>
- **Steps**:
  - Step 1: <description> ✅ | 🔄 | ⬜
  - Step 2: <description> ✅ | 🔄 | ⬜
- **QA Status**: NOT STARTED | IN_REVIEW | PASS | FAIL (round X)
- **QA Report**: <inline or "see below">

### Task #2: <task name> [STATUS]
- **Blocked By**: Task #1
- ...

---

## Dependency Graph

```
#1 Schema ──▶ #2 Service ──▶ #3 IPC Handlers ──▶ #5 Hooks ──▶ #6 Components ──▶ #7 Router
                                                       ▲
#4 Store ──────────────────────────────────────────────┘
                                                                                    │
#8 Documentation ◀──────────────────────────────────────────────────────────────────┘
```

---

## QA Results

### Task #1 — Round 1
- **Reviewer**: <qa-agent-name>
- **Automated**: lint ✅/❌ | typecheck ✅/❌ | build ✅/❌
- **Code Review**: <summary>
- **Electron Test**: <summary>
- **Verdict**: APPROVED / REJECTED
- **Issues**: <count and brief list if rejected>

---

## Blockers

| Blocker | Affected Task | Reported By | Status | Resolution |
|---------|---------------|-------------|--------|------------|
| None | | | | |

---

## Integration Checklist

- [ ] All tasks COMPLETE with QA PASS
- [ ] All worktrees merged to feature branch
- [ ] `npm run lint` passes on merged branch
- [ ] `npx tsc --noEmit` passes on merged branch
- [ ] `npm run build` passes on merged branch
- [ ] Documentation updated (ARCHITECTURE.md, PATTERNS.md, DATA-FLOW.md as needed)
- [ ] `docs/tracker.json` updated — status set to IMPLEMENTED, statusChangedAt updated
- [ ] Progress file status set to COMPLETE
- [ ] Design doc status updated to IMPLEMENTED
- [ ] `npm run validate:tracker` passes
- [ ] Committed with descriptive message
- [ ] PR created (if requested)

---

## Recovery Notes

If this feature is resumed by a new session:

1. Read this file for current state
2. Run `git worktree list` to check active worktrees
3. Run `git status` on each worktree to check uncommitted work
4. Check `~/.claude/teams/<team-name>/config.json` for team state
5. Use `TaskList` to get current task status
6. Resume from the first non-COMPLETE task
7. Update "Last Updated" and "Updated By" fields
```
