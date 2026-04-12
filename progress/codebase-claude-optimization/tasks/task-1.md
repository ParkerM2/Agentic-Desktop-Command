---
taskNumber: 1
taskName: "Claude Code Configuration Optimization"
taskSlug: "codebase-claude-optimization"
agentRole: "component-engineer"
wave: null
blockedBy: []
blocks: []
estimatedTokens: 20000
complexity: "HIGH"
status: "pending"
priority: "HIGH"
workbranch: null
worktreePath: null
teamLeaderName: null
teamName: null
---

# Task: Claude Code Configuration Optimization

## Description

Full optimization of Claude Code configuration for the ADC codebase. Three parts:

1. **Add automation hooks, subagents, and skills**
2. **Rewrite CLAUDE.md to reflect current architecture**
3. **Enforce factual-only communication rules**

---

## Part 1: Add Automations

### Hooks to Add (in `.claude/settings.json`)

#### A. PostToolUse: Auto-format on Edit/Write
```json
{
  "matcher": "Edit|Write",
  "command": "npx prettier --write $TOOL_ARG_FILE_PATH 2>/dev/null; exit 0"
}
```
**Why:** Import ordering and formatting issues caused CI failures repeatedly. Auto-format on every edit prevents this.

#### B. PreToolUse: Block .env and credential files
```json
{
  "matcher": "Edit|Write",
  "command": "echo $TOOL_ARG_FILE_PATH | grep -qE '\\.(env|env\\..*)$' && echo 'BLOCK: .env files are protected — edit manually' && exit 1; exit 0"
}
```
**Why:** Audit found real credentials in `.env`. Prevent accidental edits or exposure.

### Subagents to Create

#### A. `.claude/agents/design-system-enforcer.md`
Reviews changed `.tsx` files for raw HTML elements (`<button>`, `<input>`, `<label>`, `<select>`, `<textarea>`) that should use `@ui` primitives. Run after UI tasks complete.

#### B. `.claude/agents/ipc-contract-verifier.md`
Verifies every IPC channel has: registered handler, contract schema, renderer hook, and matching field coverage between schema → service → IPC → UI. Catches the gaps found in today's audit.

### Skills to Create

#### A. `.claude/skills/scaffold-feature/SKILL.md`
Scaffold a new Feature Slice Design domain. Given a domain name, generates all 8 layers:
- `src/shared/ipc/{domain}/channels.ts`
- `src/shared/ipc/{domain}/contract.ts`
- `src/main/features/{domain}/schema.ts`
- `src/main/features/{domain}/{domain}-service.ts`
- `src/main/features/{domain}/{domain}-handlers.ts`
- `src/renderer/features/{domain}/api/use{Domain}.ts`
- `src/renderer/features/{domain}/components/{Domain}Page.tsx`
- `src/renderer/features/{domain}/index.ts`

Follow exact patterns from `docs/patterns/PATTERNS.md`.

#### B. `.claude/skills/execute-sprint/SKILL.md`
Reads a sprint plan from `docs/superpowers/plans/`, extracts tasks, dispatches subagents per task using subagent-driven-development pattern. Manages review cycles between tasks.

---

## Part 2: Rewrite CLAUDE.md

The current CLAUDE.md is a team-lead task instruction file from a previous session. Replace it with a proper project-level CLAUDE.md that covers:

### Section 1: Project Overview
- ADC is an Electron desktop app for multi-project management with agent team orchestration
- Tech stack: Electron 39, React 19, TypeScript, SQLite (Drizzle), TanStack (Router/Query/Table/Form), Tailwind v4, Radix UI
- Three-process architecture: main process, agent host utility process, renderer

### Section 2: Architecture
- **Main process**: SQLite, IPC router, services, settings, auth, file watchers
- **Agent Host (utility process)**: ProcessManager, StreamJsonParser, AgentManagerService — spawns Claude CLI sessions, communicates via MessagePort
- **Renderer**: React app with Feature Slice Design, @ui design system, TanStack Query for data fetching
- **Communication**: IPC (main ↔ renderer), MessagePort (agent host ↔ renderer direct), correlation-ID RPC (main ↔ agent host)

### Section 3: Data Layer
- SQLite is the SINGLE source of truth for all data
- All entities have UUID primary keys
- Client generates UUIDs via `crypto.randomUUID()` for future optimistic updates
- Services accept optional `id` parameter, fall back to `generateId()`
- React Query mutations use simple `onSuccess` invalidation (NOT optimistic updates — IPC is <1ms)
- `ProgressService` replaced old `.adc/specs/` filesystem task system

### Section 4: Feature Slice Design
- Every domain follows: `channels.ts` → `contract.ts` → `schema.ts` → `service.ts` → `handlers.ts` → `hooks.ts` → `components/` → `index.ts`
- Use `codebase-nav` skill to locate any domain
- Services and handlers are co-located in `src/main/features/{domain}/`

### Section 5: Design System Rules
- ALL UI uses `@ui` primitives — NEVER raw HTML `<button>`, `<input>`, `<label>`, `<select>`, `<textarea>`
- Import from `@ui` barrel: `import { Button, Input, Label } from '@ui'`
- Check `src/renderer/shared/components/ui/index.ts` for available exports
- Use `PageLayout`, `PageHeader`, `PageContent` for page structure
- Use `TransitionOutlet` for route animations

### Section 6: IPC Conventions
- Channel constants via `domain()` builder: `DOMAIN.VERB.NOUN` format
- Zod validation on all IPC inputs (contract files)
- Typed channel constants — never hardcoded strings
- Event channels via `events()` builder: `event:domain.verb.noun` format

### Section 7: Key Paths
```
@shared    → src/shared
@main      → src/main
@renderer  → src/renderer
@features  → src/renderer/features
@ui        → src/renderer/shared/components/ui
```

### Section 8: Available Tools
- **28 agent definitions** in `.claude/agents/` — use for specialized tasks
- **10+ skills** in `.claude/skills/` — use `codebase-nav` for file lookup
- **context7 plugin** — live documentation for all libraries
- **Playwright MCP** — browser automation for E2E testing
- **Chrome DevTools MCP** — debugging running Electron app
- **Electron MCP** — screenshot and interact with running app

### Section 9: Testing
- Unit tests: `npm run test:unit` (Vitest)
- Integration tests: `npm run test:integration` (Vitest)
- E2E tests: `npm run test:e2e` (Playwright)
- Lint only changed files for agents: `npx eslint <file1> <file2>`
- Typecheck: `npx tsc --noEmit`

### Section 10: Current Sprint Plan
Reference: `docs/superpowers/plans/2026-04-11-gap-closure-multi-sprint.md`
44 tasks across 7 sprints closing feature gaps identified by full-system data flow audit.

---

## Part 3: Communication Rules (Add to CLAUDE.md)

Add a **Communication Standards** section with these rules:

```markdown
## Communication Standards

### Facts Only
- State ONLY what you can verify from code, docs, or tool output
- If you don't know something, say "I don't know — let me check" and use Grep/Read/WebSearch
- NEVER guess at file paths, function names, or behavior — look it up
- NEVER claim code works without running typecheck/lint/tests
- If a user asks about something not in your context, research it before answering

### No Filler
- No compliments ("Great question!", "That's a great idea!")
- No hedging ("I think", "It seems like", "I believe") — verify and state facts
- No summaries of what you're about to do — just do it
- No apologies unless you actually broke something
- No emoji unless the user uses them first

### When Wrong
- If caught in an error, state what was wrong, what the correct answer is, and move on
- Don't over-explain or justify mistakes
- Don't blame tools, context, or "complexity"

### Verification Before Claims
- Run `npx tsc --noEmit` before claiming typecheck passes
- Run `npx eslint <files>` before claiming lint passes
- Read a file before claiming what's in it
- Grep before claiming something doesn't exist
```

---

## Acceptance Criteria
- [ ] `.claude/settings.json` updated with 2 new hooks (auto-format, block .env)
- [ ] `.claude/agents/design-system-enforcer.md` created
- [ ] `.claude/agents/ipc-contract-verifier.md` created
- [ ] `.claude/skills/scaffold-feature/SKILL.md` created
- [ ] `.claude/skills/execute-sprint/SKILL.md` created
- [ ] `CLAUDE.md` fully rewritten with all 10 sections + communication standards
- [ ] No references to old task system, old architecture, or session-specific instructions in CLAUDE.md
- [ ] Automated checks pass (lint, typecheck)
