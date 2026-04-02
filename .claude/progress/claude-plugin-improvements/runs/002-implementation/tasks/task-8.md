---
taskNumber: 8
taskName: Workflow Config Enhancements
taskSlug: workflow-config-enhancements
wave: 4
complexity: medium
blockedBy: task-2
agent: service-engineer
branch: claude-plugin-improvements/workflow-config-enhancements
---

## Task: Add custom checks + skill composition docs to claude-workflow

### 1. Custom checks in workflow.json

**File**: `~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/hooks/` (whichever hook runs verification)

Add support for a `checks` array in `.claude/workflow.json`:

```json
{
  "checks": [
    { "name": "lint", "command": "npm run lint" },
    { "name": "typecheck", "command": "npm run typecheck" },
    { "name": "test", "command": "npm run test" },
    { "name": "build", "command": "npm run build" }
  ]
}
```

The hook that detects project checks should read this array FIRST before falling back to auto-detection. This makes the workflow config the source of truth for what verification commands to run.

### 2. Skill composition documentation

**Create**: `~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/prompts/SKILL-COMPOSITION.md`

Document how claude-workflow skills chain together:
- `/new-plan` → produces task files → `/agent-team` reads them
- `/agent-team` → spawns agents → agents use `/track` → team leader reads events
- `/deep-research` → produces report → `/new-plan` references it
- Where gstack skills fit: `/gstack-review` after agent-team, before merge

### 3. Add capabilities.json

**Create**: `~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/capabilities.json`

```json
{
  "name": "claude-workflow",
  "version": "4.0.2",
  "skills": ["new-plan", "agent-team", "deep-research", "resume", "status", "track", "settings"],
  "hooks": ["init-gate", "workflow-enforcer", "safety-guard", "config-guard", "tracker"],
  "events": ["session.start", "session.end", "task.started", "task.completed", "qa.passed", "qa.failed", "checkpoint", "branch.merged"],
  "progressDir": ".claude/progress",
  "interop": {
    "acceptsInput": ["task-files", "research-reports", "design-docs"],
    "producesOutput": ["events.jsonl", "current.md", "workflow-state.json", "proof-ledger.jsonl"]
  }
}
```

### Acceptance Criteria
- `checks` array in workflow.json is read by the verification hook
- SKILL-COMPOSITION.md documents the full skill pipeline
- capabilities.json exists at plugin root with accurate metadata
