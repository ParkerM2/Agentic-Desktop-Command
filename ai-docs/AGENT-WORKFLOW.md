# Agent Workflow: Idea to Production

> Complete pipeline for taking a feature from concept to merged code.
> Every agent in `.claude/agents/` operates within this workflow.

---

## Pipeline Overview

```
 IDEA
  |
  v
[1. INTAKE] -----> Team Leader receives task, creates subtasks
  |
  v
[2. DESIGN] -----> Architect designs solution + Schema Designer defines types
  |
  v
[3. IMPLEMENT] --> Parallel specialists write code in isolated boundaries
  |
  v
[4. SELF-REVIEW] > Each specialist iterates on their own output (DRY, clean, perf)
  |
  v
[5. QA REVIEW] --> QA Reviewer runs full compliance check
  |
  v
[6. GUARDIAN] ---> Codebase Guardian validates structural integrity
  |
  v
[7. TEST] -------> Test Engineer writes/runs tests
  |
  v
[8. PERF] -------> Performance Auditor checks for regressions
  |
  v
[9. INTEGRATE] --> Team Leader coordinates merge + final verification
  |
  v
 PRODUCTION
```

---

## Phase 1: Intake

**Owner:** Team Leader

1. Receive task description from user
2. Read `VISION.md` to align with product direction
3. Break task into atomic subtasks, each assigned to ONE specialist agent
4. Create task entries with clear acceptance criteria
5. Identify dependencies between subtasks (what blocks what)
6. Assign agents and communicate full context to each

**Output:** Task list with assignments, dependency graph

---

## Phase 2: Design

**Owner:** Architect + Schema Designer (parallel)

### Architect
1. Read relevant existing code to understand current patterns
2. Design component hierarchy, data flow, file structure
3. Identify which files need creation vs modification
4. Define the public API surface (exports, props, hooks)
5. Document design in a brief plan (no implementation code)

### Schema Designer
1. Define TypeScript types in `src/shared/types/`
2. Define Zod schemas in `src/shared/ipc-contract.ts` (if IPC needed)
3. Define constants in `src/shared/constants/` (if needed)
4. Ensure types align with Architect's design

**Output:** Design document + type definitions committed

---

## Phase 3: Implementation

**Owner:** Specialist agents (parallel, each in their own file scope)

### Parallelization Rules
- Each specialist works ONLY on files within their declared scope
- NO specialist may modify files owned by another specialist
- Shared files (`ipc-contract.ts`, `routes.ts`) are modified ONLY by Schema Designer
- If a specialist needs a type/constant that doesn't exist, they request it from Schema Designer
- If a specialist needs an IPC channel, they request it from IPC Handler Engineer

### Specialist Assignments (typical feature)

| Agent | Creates/Modifies |
|-------|-----------------|
| Schema Designer | `src/shared/types/*.ts`, `src/shared/ipc-contract.ts`, `src/shared/constants/*.ts` |
| Service Engineer | `src/main/services/<domain>/<domain>-service.ts` |
| IPC Handler Engineer | `src/main/ipc/handlers/<domain>-handlers.ts` |
| Component Engineer | `src/renderer/features/<name>/components/*.tsx` |
| Hook Engineer | `src/renderer/features/<name>/api/*.ts`, `hooks/*.ts` |
| Store Engineer | `src/renderer/features/<name>/store.ts` |
| Router Engineer | `src/renderer/app/router.tsx`, `Sidebar.tsx` |
| Styling Engineer | `src/renderer/styles/globals.css`, component styles |

**Output:** Implementation code in each specialist's file scope

---

## Phase 4: Self-Review

**Owner:** Each specialist reviews their OWN output

### Self-Review Checklist (every specialist)

1. **DRY Check**
   - No duplicated logic (extract to helper if repeated 2+ times)
   - No duplicated strings (use constants if repeated 3+ times per sonarjs rule)
   - No identical functions across the file

2. **Clean Code Check**
   - Every function has a single responsibility
   - No function exceeds 30 lines (extract sub-functions)
   - No file exceeds 300 lines (split into sub-modules)
   - Variable names describe their purpose
   - No dead code, no commented-out code

3. **Performance Check**
   - React: No unnecessary re-renders (stable references, memoization where needed)
   - No O(n^2) operations on arrays (use Map/Set for lookups)
   - No synchronous operations that could block the main thread
   - React Query: appropriate `staleTime` values

4. **ESLint Pre-Check**
   - All imports use `import type` for type-only values
   - No floating promises (use `void` operator)
   - No `any` types (use `unknown` + narrowing)
   - No non-null assertions (use `?? fallback`)
   - Numbers not used as booleans (use `> 0` comparison)
   - Named function declarations for components (not arrow)

5. **Iterate**
   - If any check fails, fix and re-check
   - Maximum 3 self-review iterations before escalating to QA

**Output:** Self-reviewed code, ready for QA

---

## Phase 5: QA Review

**Owner:** QA Reviewer

1. Run `npm run lint` — must pass with zero violations
2. Run `npm run typecheck` — must pass with zero errors
3. Run `npm run format:check` — must pass
4. Run `npm run test` — all tests must pass
5. Review every changed file against:
   - CLAUDE.md rules
   - ai-docs/CODEBASE-GUARDIAN.md structural rules
   - ai-docs/PATTERNS.md code patterns
   - ai-docs/LINTING.md ESLint rules
6. Check for design system violations (hardcoded colors, missing theme vars)
7. Check accessibility (keyboard handlers, ARIA roles, labels)
8. Check import order compliance
9. Check naming convention compliance

**Output:** QA report — PASS or FAIL with specific issues

---

## Phase 6: Codebase Guardian

**Owner:** Codebase Guardian

1. Verify file placement matches project structure rules
2. Verify barrel exports (`index.ts`) are updated
3. Verify no circular dependencies introduced
4. Verify IPC contract is consistent (schemas match types)
5. Verify feature module structure is complete (api/, components/, hooks/, store.ts, index.ts)
6. Verify no files exceed size limits (300 lines component, 500 lines service)
7. Verify constants are in `src/shared/constants/`, not hardcoded

**Output:** Structural compliance report — PASS or FAIL

---

## Phase 7: Testing

**Owner:** Test Engineer

1. Write unit tests for new services (`*.test.ts`)
2. Write component tests for new React components (`*.test.tsx`)
3. Ensure test isolation (no shared state between tests)
4. Run full test suite: `npm run test`
5. Verify no existing tests broken by changes

**Output:** Tests written and passing

---

## Phase 8: Performance Audit

**Owner:** Performance Auditor

1. Check React component render behavior (no wasted renders)
2. Check bundle impact (no giant new dependencies)
3. Check memory leaks (event listeners cleaned up, subscriptions unsubscribed)
4. Check IPC call frequency (no polling when events exist)
5. Check list rendering (virtualization for 50+ items)

**Output:** Performance report — PASS or advisory notes

---

## Phase 9: Integration

**Owner:** Team Leader

1. Verify all specialists completed their work
2. Verify QA and Guardian passed
3. Verify tests pass
4. Coordinate git operations (branch, commit, PR)
5. Create PR with summary of all changes
6. Verify the app builds: `npm run build`
7. Verify the app runs: `npm run dev`

**Output:** Merged code, closed task

---

## Error Recovery

### When a specialist encounters a blocker
1. Stop work immediately
2. Document the exact error/blocker
3. Notify Team Leader with: file path, error message, what was attempted
4. Team Leader reassigns or provides guidance
5. Specialist resumes after blocker is resolved

### When QA fails
1. QA Reviewer documents specific failures with file:line references
2. Team Leader assigns fixes to the responsible specialist
3. Specialist fixes and re-submits for QA
4. Maximum 3 QA rounds before escalating to user

### When tests fail
1. Test Engineer documents failing test with full error output
2. If test is wrong: Test Engineer fixes the test
3. If implementation is wrong: Team Leader assigns fix to specialist
4. Re-run full suite after fix

---

## Communication Protocol

### Message Format (agent to agent)
```
FROM: [agent-name]
TO: [agent-name]
RE: [task-id] — [one-line summary]
STATUS: [blocked | completed | needs-review | question]
DETAILS: [specific information]
FILES: [list of files affected]
```

### Required Notifications
- Specialist -> Team Leader: when subtask is complete
- Specialist -> Team Leader: when blocked
- QA Reviewer -> Team Leader: when QA passes or fails
- Team Leader -> User: when task is fully complete or needs user input
