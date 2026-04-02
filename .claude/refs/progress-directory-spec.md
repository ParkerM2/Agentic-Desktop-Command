# Progress Directory Specification

> Ticket-scoped directory structure for `.claude/progress/`. All workflow
> artifacts (research, plans, tasks, events) are organized by ticket,
> with each workflow run isolated in its own subfolder.

---

## Why Ticket-Scoped

The previous convention created a new top-level directory for each run:

```
.claude/progress/
├── ES-1234/                ← first run
├── ES-1234-pr-fixes/       ← second run (separate directory)
├── ES-1234-audit-fixes/    ← third run (yet another)
```

Problems:
- Research from run #1 is invisible to run #3
- Plans from different runs get confused
- No unified view of all work on a ticket
- Same ticket can have 5+ scattered directories

## Directory Structure

```
.claude/progress/
├── index.md                                ← global index (all tickets)
├── ES-{N}/                                 ← one directory per ticket
│   ├── manifest.json                       ← ticket metadata (persists)
│   ├── description.md                      ← ticket description (optional)
│   ├── index.md                            ← run history for this ticket
│   └── runs/
│       ├── 001-{run-slug}/                 ← first workflow run
│       │   ├── research/                   ← research output
│       │   ├── plans/                      ← design/implementation plans
│       │   │   └── {run-slug}-design.md
│       │   ├── tasks/                      ← agent task handoff files
│       │   │   ├── task-1.md
│       │   │   └── task-2.md
│       │   ├── events.jsonl                ← append-only event log
│       │   ├── workflow-state.json         ← current workflow state
│       │   ├── current.md                  ← rendered progress summary
│       │   └── proof-ledger.jsonl          ← QA proof records (optional)
│       └── 002-{run-slug}/                 ← second run
│           └── ...
```

## Path Conventions

### Ticket directory

```
.claude/progress/ES-{N}/
```

Always use the bare ticket ID. Never append descriptions or slugs
to the ticket directory name.

### Run directory

```
.claude/progress/ES-{N}/runs/{NNN}-{slug}/
```

- `{NNN}` — zero-padded 3-digit sequence (001, 002, 003...)
- `{slug}` — short kebab-case description of the run's purpose

The sequence number ensures runs sort chronologically.
The slug makes each run human-identifiable at a glance.

### Task files

```
.claude/progress/ES-{N}/runs/{NNN}-{slug}/tasks/task-{M}.md
```

Same task file format as before, but scoped to the run.

### Events and state

```
.claude/progress/ES-{N}/runs/{NNN}-{slug}/events.jsonl
.claude/progress/ES-{N}/runs/{NNN}-{slug}/workflow-state.json
.claude/progress/ES-{N}/runs/{NNN}-{slug}/current.md
```

Each run has its own independent event log and state.

## Creating a New Run

When the team-leader starts `/agent-team` or `/new-plan`:

1. **Resolve the ticket directory**:
   ```bash
   TICKET_DIR=".claude/progress/ES-{N}"
   mkdir -p "$TICKET_DIR/runs"
   ```

2. **Determine the next run number**:
   ```bash
   LAST=$(ls "$TICKET_DIR/runs/" 2>/dev/null | sort -n | tail -1 | cut -d'-' -f1)
   NEXT=$(printf "%03d" $((${LAST:-0} + 1)))
   ```

3. **Create the run directory**:
   ```bash
   RUN_DIR="$TICKET_DIR/runs/${NEXT}-${RUN_SLUG}"
   mkdir -p "$RUN_DIR/research" "$RUN_DIR/plans" "$RUN_DIR/tasks"
   ```

4. **Write or update manifest.json** (if it doesn't exist):
   ```json
   {
     "ticket": "ES-{N}",
     "title": "Ticket title from Jira or user",
     "created": "2026-03-29",
     "updated": "2026-03-29"
   }
   ```

5. **Update ticket index.md** with the new run entry.

## Reading Prior Runs

Before starting a new run, the team-leader SHOULD check for prior
work on the same ticket:

```bash
ls .claude/progress/ES-{N}/runs/ 2>/dev/null
```

If prior runs exist, read their `current.md` files and any research
that may be relevant. This prevents re-doing work and avoids
contradicting previous decisions.

## Manifest Format

```json
{
  "ticket": "ES-11850",
  "title": "Modal Refactor v2",
  "type": "Feature",
  "created": "2026-03-15",
  "updated": "2026-03-29",
  "branch": "ES-11850-Modal-Refactor-v2",
  "pr": "#5427",
  "runs": [
    {
      "id": "001-modal-refactor",
      "status": "complete",
      "date": "2026-03-15"
    },
    {
      "id": "002-pr-fixes",
      "status": "complete",
      "date": "2026-03-20"
    }
  ]
}
```

## Ticket Index Format

Each ticket has its own `index.md`:

```markdown
# ES-{N} — {Title}

| # | Run | Status | Date | Tasks | Notes |
|---|-----|--------|------|-------|-------|
| 1 | [001-modal-refactor](runs/001-modal-refactor/current.md) | complete | 2026-03-15 | 10 | Initial implementation |
| 2 | [002-pr-fixes](runs/002-pr-fixes/current.md) | complete | 2026-03-20 | 9 | PR review fixes |
| 3 | [003-audit-fixes](runs/003-audit-fixes/current.md) | in-progress | 2026-03-28 | 4 | QA audit round |
```

## Global Index Format

The root `index.md` lists tickets (not runs):

```markdown
# Progress Index

| Ticket | Title | Runs | Last Run | Status |
|--------|-------|------|----------|--------|
| [ES-11850](ES-11850/index.md) | Modal Refactor v2 | 3 | 003-audit-fixes | in-progress |
| [ES-13025](ES-13025/index.md) | Contacts delete bug | 1 | 001-fix | complete |
```

## Migration

Existing flat directories (e.g., `ES-1234-pr-fixes/`) are legacy.
Do not move or delete them. New runs use the new structure.
The global index should list both formats during transition.

## Context Recovery

The resume protocol scans the same paths but under the
ticket-scoped layout:

```bash
# Find the latest run for a ticket
LATEST=$(ls .claude/progress/ES-{N}/runs/ | sort | tail -1)
cat ".claude/progress/ES-{N}/runs/$LATEST/events.jsonl"
```
