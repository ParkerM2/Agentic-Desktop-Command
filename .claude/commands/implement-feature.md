# /implement-feature — Team Workflow Orchestrator

> Invoke this skill when you need to implement a feature using Claude Agent Teams with full QA verification, crash-safe progress tracking, and documentation maintenance.

---

## When to Use

- Implementing a new feature from a design document
- Refactoring an existing feature across multiple files
- Any task requiring 3+ specialist agents working in coordination

---

## Phase 1: Load Context

Before anything else, read these files to understand the system:

```
MANDATORY READS:
1. CLAUDE.md                                          — Project rules
2. ai-docs/ARCHITECTURE.md                            — System architecture
3. ai-docs/prompts/implementing-features/README.md    — THE FULL PLAYBOOK
4. ai-docs/prompts/implementing-features/AGENT-SPAWN-TEMPLATES.md  — How to spawn agents
5. ai-docs/prompts/implementing-features/QA-CHECKLIST-TEMPLATE.md  — QA checklist per task
6. ai-docs/prompts/implementing-features/PROGRESS-FILE-TEMPLATE.md — Progress tracking
```

If a design document exists, read it too:
```
docs/plans/<feature-name>.md
```

---

## Phase 2: Check for Existing Progress

Check if this feature was already started by a previous session:

```bash
# Check for existing progress file
ls docs/progress/

# Check for existing worktrees
git worktree list

# Check for existing teams
ls ~/.claude/teams/
```

If a progress file exists for this feature:
1. Read it to understand current state
2. Resume from the first non-COMPLETE task
3. Update the "Last Updated" and "Updated By" fields
4. Skip to the appropriate phase below

---

## Phase 3: Plan & Decompose

1. **Understand the feature** — Read the design doc and all referenced files
2. **Decompose into tasks** — Each task must be:
   - Assignable to exactly ONE specialist agent (from `.claude/agents/`)
   - Scoped to specific files (no two agents editing the same file)
   - Have clear acceptance criteria
   - Have a filled QA checklist (from `QA-CHECKLIST-TEMPLATE.md`)
3. **Map dependencies** — Standard chain:
   ```
   Schema → Service → IPC Handlers → Store + Hooks → Components → Router → Docs
   ```
4. **Identify parallel opportunities** — Tasks with no shared files can run simultaneously

---

## Phase 4: Create Progress File

Create `docs/progress/<feature-name>-progress.md` using the template from `PROGRESS-FILE-TEMPLATE.md`.

This file is your **crash-recovery artifact**. Update it after EVERY state change:
- After creating team and tasks
- After spawning each agent (record worktree branch)
- After each agent completes or fails
- After each QA cycle
- After integration

---

## Phase 5: Set Up Team & Tasks

```
1. TeamCreate — team_name: "<feature-name>"
2. TaskCreate — one per subtask, with description + acceptance criteria
3. TaskUpdate — set addBlockedBy dependencies for each task
4. Update progress file with task list + dependency graph
```

---

## Phase 6: Spawn Agents in Waves

Use the templates from `AGENT-SPAWN-TEMPLATES.md`. Every agent MUST be initialized with:

### Mandatory in every agent prompt:
- Read `CLAUDE.md`, `ARCHITECTURE.md`, `PATTERNS.md`, `LINTING.md`
- Read their `.claude/agents/<role>.md` agent definition
- Read `ai-docs/prompts/implementing-features/README.md`
- Use superpowers skills: `brainstorming`, `writing-plans`, `systematic-debugging`, `verification-before-completion`
- Include the filled QA checklist for their task
- Include instructions to spawn their own QA Review agent when done

### Wave execution:
```
Wave 1: Tasks with no blockers (schema, database)
Wave 2: Tasks unblocked by Wave 1 (services, stores)
Wave 3: Tasks unblocked by Wave 2 (IPC handlers, hooks)
Wave 4: Tasks unblocked by Wave 3 (components, router)
Wave 5: Documentation update (after all QA passes)
```

After each wave completes:
- Update progress file
- Shut down completed agents
- Spawn next wave

---

## Phase 7: QA Verification (Per Task) — MANDATORY TEST SUITE

Each coding agent is responsible for spawning its own QA Review agent:

```
Coding Agent completes work
  → runs self-review checklist
  → RUNS FULL TEST SUITE (NON-SKIPPABLE):
      npm run lint && npm run typecheck && npm run test && npm run build
  → spawns QA Review Agent (same worktree)
    → QA ALSO runs: lint, typecheck, test, build (independent verification)
    → QA reviews: code diff, data flow, error paths, docs
    → QA tests: starts Electron app, uses MCP electron tools
    → QA returns report: PASS or FAIL with issues

If FAIL: coding agent fixes issues, spawns NEW QA agent (max 3 rounds)
If PASS: coding agent sends QA report to Team Lead
```

### Test Suite Requirements — NO EXCEPTIONS

**Before ANY agent can claim work is complete:**

```bash
# ALL FOUR MUST PASS — This is not optional
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All tests pass (unit + integration)
npm run build        # Builds successfully
```

**Skipping tests = automatic FAIL. No excuses accepted.**

The Team Lead does NOT run QA — the coding agents handle their own QA cycle.

---

## Phase 8: Integration — FINAL TEST GATE

When ALL tasks have QA PASS:

1. Merge all worktrees to the feature branch (if using worktrees)
2. **Run FULL verification suite (MANDATORY — all 4 must pass):**
   ```bash
   npm run lint && npm run typecheck && npm run test && npm run build
   ```
   **If ANY command fails, DO NOT proceed. Fix issues first.**
3. Spawn a documentation update agent (see `AGENT-SPAWN-TEMPLATES.md`)
4. Update progress file status to COMPLETE
5. Update design doc status to IMPLEMENTED
6. Shut down all remaining agents
7. Delete the team (TeamDelete)
8. **Run verification suite ONE MORE TIME before commit:**
   ```bash
   npm run lint && npm run typecheck && npm run test && npm run build
   ```
9. Commit, push, create PR (if requested by user)

**NO COMMITS WITHOUT PASSING TEST SUITE. This is non-negotiable.**

---

## Phase 9: Cleanup

- Update `docs/progress/<feature>-progress.md` → status: COMPLETE
- Update `docs/plans/<design-doc>.md` → status: IMPLEMENTED
- Move design doc to `doc-history/` if requested
- Clean up worktrees: `git worktree remove <path>`
- Report completion summary to user

---

## Quick Reference — Agent Roles

| Agent | File Scope | When to Use |
|-------|-----------|-------------|
| `schema-designer` | `src/shared/types/`, `src/shared/ipc-contract.ts` | New types, IPC channels |
| `service-engineer` | `src/main/services/` | New backend service |
| `ipc-handler-engineer` | `src/main/ipc/handlers/` | Wire IPC handlers |
| `store-engineer` | `src/renderer/**/store.ts` | New Zustand store |
| `hook-engineer` | `src/renderer/**/api/`, `src/renderer/**/hooks/` | React Query hooks, event hooks |
| `component-engineer` | `src/renderer/**/components/` | React components |
| `router-engineer` | `src/renderer/app/router.tsx`, `layouts/` | Routes, navigation |
| `database-engineer` | `hub/src/db/` | Hub database schema |
| `integration-engineer` | `hub/src/routes/`, `hub/src/lib/` | Hub API routes |
| `websocket-engineer` | `hub/src/ws/`, `src/main/services/hub/` | WebSocket, relay |
| `assistant-engineer` | `src/main/services/assistant/` | Assistant service |
| `qa-reviewer` | READ ONLY | Code review + testing |
| `codebase-guardian` | `ai-docs/` | Documentation updates |

See `.claude/agents/` for all 27 specialist definitions.
