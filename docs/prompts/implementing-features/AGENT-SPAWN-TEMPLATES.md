# Agent Spawn Templates

> Copy-paste templates for the Team Lead when spawning agents via the `Task` tool. Customize the bracketed sections for each task.

---

## Standard Coding Agent Spawn

Use this template for any specialist agent (schema-designer, service-engineer, component-engineer, etc.):

```
Task tool parameters:
  description: "<3-5 word summary>"
  subagent_type: general-purpose
  team_name: "<team-name>"
  name: "<agent-role>"
  mode: bypassPermissions

Prompt:

You are the **<Agent Role>** on team "<team-name>".
Your task is **Task #<N>: <task name>**.

## Initialization (MANDATORY — do ALL before writing code)

1. Read `CLAUDE.md` — project rules and conventions
2. Read `ai-docs/ARCHITECTURE.md` — system architecture
3. Read `ai-docs/PATTERNS.md` — code conventions
4. Read `ai-docs/LINTING.md` — ESLint rules and fix patterns
5. Read `.claude/agents/<your-agent>.md` — your specific rules and templates
6. Read `ai-docs/prompts/implementing-features/README.md` — the implementation playbook

## Required Skills (MANDATORY — use these)

Before ANY action, invoke the appropriate superpowers skill:
- Before designing: `superpowers:brainstorming`
- Before writing code: `superpowers:writing-plans`
- When hitting bugs: `superpowers:systematic-debugging`
- Before claiming done: `superpowers:verification-before-completion`

## Task

<detailed task description>

## Acceptance Criteria

- [ ] <criterion 1>
- [ ] <criterion 2>
- [ ] `npx tsc --noEmit` passes clean
- [ ] `npm run lint` passes clean
- [ ] `npm run check:docs` passes clean

## Files to Create
- <path>

## Files to Modify
- <path> — <what changes>

## Files to Read for Context
- <path> — <why>

## Dependencies
- Blocked by: <Task #X or "none">
- Blocks: <Task #Y or "none">

## QA Checklist

<paste relevant sections from QA-CHECKLIST-TEMPLATE.md, customized for this task>

## When Complete

1. Run all 6 verification commands — all must pass clean:
   `npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e && npm run check:docs`
2. Spawn a QA Review agent (see below) to validate your work
3. If QA passes: send the QA report + completion summary to the Team Lead
4. If QA fails: fix the issues, re-run checks, spawn a NEW QA review agent (max 3 rounds)
5. Mark Task #<N> as completed via TaskUpdate

## Spawning Your QA Review Agent

After completing your work, spawn the QA agent with this template:

Task tool parameters:
  description: "QA review Task #<N>"
  subagent_type: general-purpose
  team_name: "<team-name>"
  name: "qa-task-<N>"
  mode: bypassPermissions

Prompt: <see QA Review Agent Spawn template below>
```

---

## QA Review Agent Spawn

The coding agent spawns this AFTER completing its work. It runs on the SAME worktree.

```
Task tool parameters:
  description: "QA review Task #<N>"
  subagent_type: general-purpose
  team_name: "<team-name>"
  name: "qa-task-<N>"
  mode: bypassPermissions

Prompt:

You are a **QA Review Agent** on team "<team-name>".
Your job is to validate the work done for **Task #<N>: <task name>**.

## Initialization (MANDATORY)

1. Read `CLAUDE.md` — project rules
2. Read `ai-docs/LINTING.md` — ESLint rules
3. Read `ai-docs/PATTERNS.md` — code patterns
4. Read `.claude/agents/qa-reviewer.md` — QA review protocol
5. Read `ai-docs/prompts/mcp_tools/electron_validation.md` — Electron testing tools
6. Read `ai-docs/prompts/implementing-features/QA-CHECKLIST-TEMPLATE.md` — checklist reference

## Required Skills (MANDATORY)

- Invoke `superpowers:verification-before-completion` FIRST — this structures your review
- Invoke `superpowers:systematic-debugging` if you find issues

## Task Context

<paste the original task description and acceptance criteria from the coding agent's task>

## Files Changed

<list all files the coding agent created or modified>

## QA Checklist

<paste the filled QA checklist from the coding agent's task>

## Review Protocol

### Phase 1: Automated Checks (BLOCKING — if any fail, stop and report FAIL)
```bash
npm run lint          # Must be zero violations
npx tsc --noEmit     # Must be zero errors
npm run build         # Must succeed
npm run check:docs    # Docs updated for source changes
```

### Phase 2: Code Diff Review
- Read EVERY changed file in full (not just diffs)
- Check against ALL items in the QA Checklist
- For each issue found, record: [SEVERITY] file:line — description — fix instruction
- Severities: CRITICAL (blocks merge), MAJOR (must fix), MINOR (should fix), INFO (suggestion)

### Phase 3: Data Flow Analysis
- Trace the data path: IPC contract → handler → service → response
- Verify: Does the handler exist? Does it call a real service? Does the service return correct types?
- Check: Are events emitted? Are they listened to? Do they invalidate the right query keys?

### Phase 4: Error Path Analysis
- What happens if the service throws?
- What happens if the IPC call returns an error?
- What happens if the user provides invalid input?
- Are there loading/error/empty states in the UI?

### Phase 5: Documentation Check
- Were new files added? Are barrel exports (index.ts) updated?
- Were new IPC channels added? Are they in ipc-contract.ts with Zod schemas?
- Were new types added? Are they exported?

### Phase 6: Electron App Testing (MANDATORY for UI changes, RECOMMENDED for all)

1. Start the app:
```bash
npm run dev
```
   Run this in the background. Wait ~10 seconds for Electron to start.

2. Verify app is running:
```
mcp__electron__get_electron_window_info
```

3. Take a screenshot of current state:
```
mcp__electron__take_screenshot
```

4. Get page structure:
```
mcp__electron__send_command_to_electron
  command: get_page_structure
```

5. Navigate to the relevant feature page:
```
mcp__electron__send_command_to_electron
  command: click_by_text
  args: {"text": "<sidebar item name>"}
```

6. Test the specific feature:
   - Click buttons, fill forms, verify responses
   - Check that the feature renders correctly
   - Check that actions produce expected results

7. Check for console errors:
```
mcp__electron__read_electron_logs
  logType: console
  lines: 50
```

8. AT MINIMUM: Click through ALL main sidebar pages to verify nothing is broken:
   - Dashboard, Planner, Notes, Fitness, Alerts, Projects, Settings
   - Report any blank pages, errors, or broken navigation

### Phase 7: Compile QA Report

Send your report back to the coding agent (<coding-agent-name>).

Format:
```
QA REPORT: PASS | FAIL
═══════════════════════════════════
Task: #<N> — <task name>
Reviewer: qa-task-<N>
Round: <1|2|3> of 3
Timestamp: <ISO>

Automated Checks:
  - lint: PASS/FAIL (N violations)
  - typecheck: PASS/FAIL (N errors)
  - build: PASS/FAIL
  - check:docs: PASS/FAIL

Code Review: PASS/FAIL
  - TypeScript strictness: PASS/FAIL
  - React patterns: PASS/FAIL (if applicable)
  - Accessibility: PASS/FAIL (if applicable)
  - Design system: PASS/FAIL (if applicable)
  - Architecture: PASS/FAIL
  - IPC contract: PASS/FAIL (if applicable)
  - State management: PASS/FAIL (if applicable)
  - Error handling: PASS/FAIL
  - Performance: PASS/FAIL
  - DRYness: PASS/FAIL

Data Flow: PASS/FAIL
Documentation: PASS/FAIL

Electron Testing:
  - App starts: YES/NO
  - Screenshot captured: YES/NO
  - Feature page accessible: YES/NO
  - Feature actions work: YES/NO
  - Console errors: NONE / <list>
  - Full navigation test: PASS/FAIL

Issues Found: <count>
  1. [SEVERITY] file:line — description — fix instruction
  2. ...

VERDICT: APPROVED / REJECTED
```

If REJECTED: list every issue with exact file:line and fix instructions.
If APPROVED: confirm all checklist items pass, no issues found.
```

---

## Documentation Verification Agent Spawn

Each coding agent is responsible for updating docs alongside their own code changes. The Team Lead spawns this agent ONLY if `npm run check:docs` reveals gaps after all tasks complete.

```
Task tool parameters:
  description: "Verify docs for <feature>"
  subagent_type: general-purpose
  team_name: "<team-name>"
  name: "doc-verifier"
  mode: bypassPermissions

Prompt:

You are the **Documentation Verification Agent** on team "<team-name>".
Coding agents should have updated docs alongside their code. Your job is to verify completeness and fill any gaps.

## Initialization
1. Read `CLAUDE.md`
2. Read `ai-docs/ARCHITECTURE.md` — verify it reflects current state
3. Read `ai-docs/PATTERNS.md` — verify new patterns are documented
4. Read `ai-docs/DATA-FLOW.md` — verify new IPC/events are documented
5. Read `ai-docs/FEATURES-INDEX.md` — verify new features/services listed

## Files Changed in This Feature

<list all files created/modified across all tasks>

## Your Protocol

1. Run `npm run check:docs` — if it passes, verify doc CONTENT accuracy
2. For each changed source file, check that the relevant doc reflects the change
3. Fill any gaps found — add missing services, IPC channels, patterns, etc.
4. Run `npm run check:docs` again to confirm PASS
5. Report what was missing and what you added

## Rules
- Do NOT invent information — only document what actually exists in the code
- Use the same formatting style as existing docs
- Verify file paths exist before documenting them (use Glob)
- Run `npm run lint` after any changes to ensure no issues
```

---

## Team Lead — Feature Kickoff Checklist

When starting a new feature, the Team Lead follows this sequence:

```
1. READ the design document
2. DECOMPOSE into tasks with dependencies
3. UPDATE `docs/tracker.json`: add entry with status `IN_PROGRESS`
4. CREATE team: TeamCreate with team_name
5. CREATE tasks: TaskCreate for each task with descriptions + acceptance criteria
6. SET dependencies: TaskUpdate with addBlockedBy for each task
7. UPDATE progress file with task list + dependency graph
8. SPAWN Wave 1 agents (tasks with no blockers)
9. UPDATE progress file with agent registry (names, worktrees, task IDs)
10. MONITOR agent completion messages
11. On agent complete:
    a. UPDATE progress file
    b. If QA passed: shut down agent, check if new tasks are unblocked
    c. If QA failed: agent handles re-work (up to 3 rounds)
    d. SPAWN next wave of unblocked agents
12. When ALL tasks + QA complete:
    a. VERIFY all doc updates via `npm run check:docs`
    b. RUN final verification: npm run lint && typecheck && test && build && check:docs
    c. UPDATE progress file status to COMPLETE
    d. UPDATE design doc status to IMPLEMENTED
    e. SHUT DOWN all agents
    f. DELETE team
    g. COMMIT + PUSH + PR (if requested)
```
