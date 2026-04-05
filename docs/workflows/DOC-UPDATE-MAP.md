# Documentation Update Map — MANDATORY

> **EVERY code change MUST include documentation updates. EVERY. SINGLE. TIME.**
> This includes `docs/` subdirectories, `.claude/agents/`, `docs/tracker.json`, and `CLAUDE.md` itself.
> Agent definition files (`.claude/agents/*.md`) are NOT optional extras — they are the instructions
> that future agents read. If agent docs are stale, agents produce wrong code, which wastes time and money.
> **Failing to update docs is the same as shipping broken code. Treat it that way.**

`npm run check:docs` enforces that source changes include doc updates. Accepted doc paths: `docs/`, `.claude/agents/`, `docs/tracker.json`, and `CLAUDE.md`.

## Change Type → Docs to Update

| Change Type | Docs to Update |
|-------------|----------------|
| New component/hook/store | `FEATURES-INDEX.md` (inventory), `PATTERNS.md` (usage examples), **ALL agents that build UI** (component-engineer, styling-engineer, hook-engineer, store-engineer, fitness-engineer) |
| New design system primitive or pattern | `PATTERNS.md`, `FEATURES-INDEX.md`, **component-engineer.md**, **styling-engineer.md**, and ANY agent that creates UI components |
| New data flow or IPC wiring | `DATA-FLOW.md` (flow diagram), `ARCHITECTURE.md` (system overview), **ipc-handler-engineer.md**, **service-engineer.md** |
| New shared utility | `FEATURES-INDEX.md` (shared sections), `CODEBASE-GUARDIAN.md` (placement rules) |
| UI layout changes | `user-interface-flow.md` (UX flow sections), `FEATURES-INDEX.md` (layouts) |
| New feature module | `FEATURES-INDEX.md` (feature table), `ARCHITECTURE.md` (system diagram if applicable) |
| New pattern or convention | `PATTERNS.md` (pattern example with code), **ALL relevant agent files** |
| Feature plan or design doc | `docs/features/<slug>/plan.md` (implementation plan) |
| Plan lifecycle changes | `docs/tracker.json` (update status + add entry) |
| Any change to file structure, imports, or conventions | **ALL `.claude/agents/*.md` files that reference the affected area** |
| Workflow config or agent bootstrapping changes | `.claude/workflow.json`, `scripts/generate-worktree-claude.mjs`, relevant section of `CLAUDE.md` |

## Checklist Before Committing — ALL Items Mandatory

1. Did I add a new file? → Update `FEATURES-INDEX.md`
2. Did I add a new data flow? → Update `DATA-FLOW.md`
3. Did I introduce a new pattern? → Update `PATTERNS.md`
4. Did I change the architecture? → Update `ARCHITECTURE.md`
5. Did I change the UI layout or resolve a gap? → Update `user-interface-flow.md`
6. Did I create/complete a plan? → Update `docs/tracker.json`
7. **Did I change ANYTHING that affects how agents write code?** → Update ALL relevant `.claude/agents/*.md` files. This is not optional. Stale agent docs = broken agent output = wasted time and money.
