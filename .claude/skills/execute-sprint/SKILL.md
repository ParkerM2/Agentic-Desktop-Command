---
name: execute-sprint
description: Execute a sprint plan by reading task files, dispatching subagents per task, and managing review cycles. Uses subagent-driven-development pattern.
---

# Execute Sprint

Read a sprint plan, extract tasks, and dispatch subagents to implement each task with review cycles.

## Usage

```
/execute-sprint <plan-file-path>
```

Example: `/execute-sprint docs/superpowers/plans/2026-04-11-gap-closure-multi-sprint.md`

## Workflow

### Step 1: Read the Plan

Read the specified plan file and extract:
- Sprint number and name
- Task list with dependencies
- Wave ordering (which tasks can run in parallel)

### Step 2: Validate Prerequisites

Before executing:
- Ensure `npm run typecheck` passes on current branch
- Confirm no uncommitted changes (`git status --porcelain`)
- Create a feature branch if not already on one

### Step 3: Execute Waves

For each wave (group of independent tasks):

1. **Dispatch agents** — use the `superpowers:dispatching-parallel-agents` skill to spawn one agent per task in the wave
2. **Wait for completion** — all agents in the wave must finish before proceeding
3. **Review cycle** — after each wave:
   - Run `npm run lint && npm run typecheck`
   - Fix any integration issues (barrel exports, missing imports)
   - Commit the wave's changes

### Step 4: Between Waves

After each wave completes:
- Verify typecheck still passes
- Commit with message: `feat(<sprint>): complete wave <N> — <task summaries>`
- Proceed to next wave

### Step 5: Sprint Completion

After all waves complete:
- Run full verification: `npm run lint && npm run typecheck && npm run build`
- Create summary of what was implemented
- Report any tasks that were blocked or deferred

## Agent Dispatch Template

For each task, spawn an agent with:
```
Task: <task name>
Description: <from plan>
Files to modify: <from plan>
Acceptance criteria: <from plan>

Rules:
- Read CLAUDE.md before writing code
- Use @ui primitives — never raw HTML
- Run `npx eslint <changed-files>` and `npx tsc --noEmit` before reporting done
- Commit changes to your branch when complete
```

## Error Handling

- If an agent fails, capture the error and continue with other agents in the wave
- After the wave, report failures and ask the user whether to retry or skip
- Never silently skip a failing task

## Plan File Format

The plan should contain tasks in this structure:
```markdown
### Task N: <name>
- **Wave:** <number>
- **Depends on:** <task numbers or "none">
- **Files:** <list of files to create/modify>
- **Description:** <what to implement>
- **Acceptance criteria:** <what "done" looks like>
```
