# /plan-feature — Deep Technical Planning

> Generate a detailed implementation plan for a feature. Analyzes the codebase, designs an approach, decomposes into tasks, and writes the plan to a predictable file path for orchestrator detection.

**Usage:** `/plan-feature <feature description>`

---

## Phase 1: Load Context

Read these files to understand the system:

```
MANDATORY READS:
1. CLAUDE.md                       — Project rules, tech stack, patterns
2. ai-docs/ARCHITECTURE.md         — System architecture, IPC flow
3. ai-docs/PATTERNS.md             — Code conventions, component patterns
4. ai-docs/FEATURES-INDEX.md       — Existing features inventory
5. ai-docs/DATA-FLOW.md            — Data flow diagrams
```

---

## Phase 2: Analyze the Feature

1. **Parse the feature description** from the arguments passed to this command
2. **Identify the impact zone** — which layers are affected:
   - Shared types / IPC contracts (`src/shared/`)
   - Main process services (`src/main/services/`)
   - IPC handlers (`src/main/ipc/handlers/`)
   - Renderer features (`src/renderer/features/`)
   - Router / layouts (`src/renderer/app/`)
3. **Read existing code** in the impact zone to understand current patterns
4. **Identify risks** — breaking changes, migration needs, performance concerns

---

## Phase 3: Design the Approach

Produce a plan covering:

### 3a. Data Model
- New types / interfaces needed
- Changes to existing types
- IPC contract additions (channels, schemas)

### 3b. Service Layer
- New services or modifications to existing ones
- Sync vs async patterns (local = sync, Hub = async)
- Error handling approach

### 3c. UI Design
- New components needed
- State management approach (Zustand store, React Query hooks)
- User interaction flow

### 3d. Testing Strategy
- Unit tests needed (`tests/unit/`)
- Integration tests needed (`tests/integration/`)
- Manual verification steps

---

## Phase 4: Task Decomposition

Break the feature into **atomic, agent-ready tasks**. Each task must:

1. Be assignable to exactly ONE specialist agent
2. Have clear file ownership (no two tasks editing the same file)
3. Have explicit acceptance criteria
4. List the exact files to create or modify

Standard dependency chain:
```
Types/Schema -> Services -> IPC Handlers -> Hooks/Store -> Components -> Router -> Docs
```

For each task, specify:
- **Agent role** (from `.claude/agents/` if available, otherwise describe the skill)
- **Files** to create or modify
- **Depends on** — which tasks must complete first
- **Acceptance criteria** — what "done" looks like

Identify which tasks can run **in parallel** (no shared files).

---

## Phase 5: Write the Plan

Write the complete plan to: `docs/features/<feature-slug>/plan.md`

The feature slug should be derived from the description: lowercase, hyphens, no special chars.
Example: "Add user authentication" becomes `docs/features/add-user-authentication/plan.md`

### Plan File Format

```markdown
# Plan: <Feature Title>

## Summary
<2-3 sentence overview>

## Impact Analysis
<Which layers/modules are affected>

## Data Model Changes
<Types, interfaces, IPC contracts>

## Service Layer Changes
<New/modified services>

## UI Changes
<Components, state, user flow>

## Task Breakdown

### Task 1: <title>
- **Agent:** <role>
- **Files:** <list>
- **Depends on:** none | Task N
- **Acceptance criteria:**
  - [ ] Criterion 1
  - [ ] Criterion 2

### Task 2: <title>
...

## Wave Plan
Wave 1: Tasks with no dependencies
Wave 2: Tasks unblocked by Wave 1
...

## Testing Strategy
<Unit, integration, manual steps>

## Risks & Mitigations
<What could go wrong, how to handle it>
```

---

## Phase 6: Output

After writing the plan file, output the **absolute file path** as the very last line of your response, prefixed with `PLAN_FILE:`. This allows the orchestrator to detect and read the plan.

Example final line:
```
PLAN_FILE:docs/features/add-user-authentication/plan.md
nAlso add a tracker entry to `docs/tracker.json` with the slug as key and status `DRAFT`.
```

---

## Important Notes

- Do NOT implement any code. This command only produces a plan.
- Be thorough but concise. Each section should provide enough detail for an agent to implement without further clarification.
- Consider the existing codebase patterns. New code should follow established conventions.
- The plan will be reviewed by a human before execution. Make it clear and actionable.
