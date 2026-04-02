# gstack ↔ claude-workflow Integration

## How gstack artifacts feed into the workflow

gstack stores project artifacts at `~/.gstack/projects/ParkerM2-Agentic-Desktop-Command/`.
This directory is symlinked into the repo at `.claude/refs/gstack-project` for easy discovery.

### Artifact Flow

```
/office-hours → design doc     → feed into /new-plan as input context
/plan-eng-review → test plan   → agent teams use for test coverage targets
/plan-ceo-review → vision doc  → scope decisions for /new-plan
/autoplan → all three reviews  → validated plan ready for /new-plan
/retro → metrics               → informs sprint planning
/learn → learnings.jsonl       → accumulated patterns/pitfalls across sessions
/qa → qa-reports/              → post-agent-team QA with real browser testing
/review → review findings      → pre-merge code review after /agent-team
/cso → security findings       → security audit on changes
```

### File Locations

| Artifact | Path |
|----------|------|
| Design docs | `~/.gstack/projects/ParkerM2-Agentic-Desktop-Command/*-design-*.md` |
| Vision/CEO plans | `~/.gstack/projects/ParkerM2-Agentic-Desktop-Command/ceo-plans/` |
| Test plans | `~/.gstack/projects/ParkerM2-Agentic-Desktop-Command/*-test-plan-*.md` |
| Learnings DB | `~/.gstack/projects/ParkerM2-Agentic-Desktop-Command/learnings.jsonl` |
| QA reports | `.gstack/qa-reports/` (in-repo) and `~/.gstack/qa/{TICKET}/` |
| Retros | `.context/retros/` (in-repo) |
| Test outcomes | `~/.gstack/projects/ParkerM2-Agentic-Desktop-Command/*-test-outcome-*.md` |

### Workflow Integration Points

**Start of session:**
1. `/retro` — what shipped since last session
2. `/learn` — review relevant learnings

**Research phase (product owner):**
1. `/office-hours` — structured feature interrogation
2. `/cso` — security audit on area under investigation
3. `/design-review` — visual audit if evaluating UI gaps

**Pre-planning (before /new-plan):**
1. `/autoplan` — validates direction with CEO + design + eng review
2. Feed gstack artifacts from `.claude/refs/gstack-project/` into `/new-plan`

**Post-implementation (after /agent-team):**
1. `/review` — pre-merge code review
2. `/qa` or `/qa-only` — real browser testing
3. `/cso` — security re-check

**End of session:**
1. `/learn` — save patterns/pitfalls discovered
2. `/retro` — log what shipped

### For Agents

When reading plans or creating tasks, check `.claude/refs/gstack-project/` for:
- Recent design docs that inform requirements
- Test plans that define coverage expectations
- Learnings that flag known pitfalls
- Test outcomes from previous QA runs
