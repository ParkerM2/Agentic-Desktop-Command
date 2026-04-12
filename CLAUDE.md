# Agent Desktop Command (ADC)

## Project Overview

ADC is an Electron desktop app for multi-project management with agent team orchestration. It manages software projects, spawns Claude CLI agent sessions, tracks tasks in SQLite, and provides a rich dashboard UI.

**Tech stack:** Electron 39, React 19, TypeScript, SQLite (Drizzle ORM), TanStack (Router/Query/Table/Form), Tailwind v4, Radix UI (via shadcn/ui primitives)

**Three-process architecture:**
- **Main process** — Node.js: SQLite, IPC router, services, settings, auth, file watchers
- **Agent Host** (Electron utility process) — ProcessManager, StreamJsonParser, AgentManagerService: spawns Claude CLI sessions, communicates via MessagePort
- **Renderer** — React app with Feature Slice Design, @ui design system, TanStack Query for data fetching

## Architecture

### Communication

- **IPC** (main <-> renderer): `ipcRenderer.invoke` / `ipcMain.handle` via typed router with Zod validation
- **MessagePort** (agent host <-> renderer): direct streaming for agent output, bypasses main process
- **Correlation-ID RPC** (main <-> agent host): request/response over MessagePort with unique IDs

### Main Process

Bootstrap sequence: lifecycle -> svc-registry -> ipc-wiring -> event-wiring. Services are co-located in `src/main/features/<domain>/`. Each service is a factory function receiving `{ db, router, ... }` deps.

### Agent Host (Utility Process)

Spawns Claude CLI as child processes via PTY. Streams JSON output through `StreamJsonParser`. Auto-restarts with exponential backoff (5 retries / 60s). Agents are headless CLI sessions via `child_process.spawn` — not SDK API calls.

### Renderer

Feature Slice Design with React Query for server state, Zustand for UI-only state (selections, filters, layout). EventBridge maps IPC events to query key invalidation.

## Data Layer

- **SQLite is the SINGLE source of truth** for all data — no filesystem task system
- All entities have UUID primary keys generated via `crypto.randomUUID()`
- Client generates UUIDs for future optimistic updates; services accept optional `id` parameter, fall back to `generateId()`
- React Query mutations use simple `onSuccess` invalidation — NOT optimistic updates (IPC is <1ms)
- `ProgressService` replaced old `.adc/specs/` filesystem task system

## Feature Slice Design

Every domain follows this layer order:

```
channels.ts -> contract.ts -> schema.ts -> service.ts -> handlers.ts -> hooks.ts -> components/ -> index.ts
```

- `src/shared/ipc/<domain>/channels.ts` — channel constants via `domain()` builder
- `src/shared/ipc/<domain>/contract.ts` — Zod input/output schemas
- `src/main/features/<domain>/schema.ts` — Drizzle SQLite table
- `src/main/features/<domain>/<domain>-service.ts` — business logic
- `src/main/features/<domain>/<domain>-handlers.ts` — thin IPC bridge
- `src/renderer/features/<domain>/api/use<Domain>.ts` — React Query hooks
- `src/renderer/features/<domain>/components/` — UI components
- `src/renderer/features/<domain>/index.ts` — barrel export

Use `codebase-nav` skill to locate any domain across layers.

## Design System Rules

- ALL UI uses `@ui` primitives — **NEVER** raw HTML `<button>`, `<input>`, `<label>`, `<select>`, `<textarea>`
- Import from `@ui` barrel: `import { Button, Input, Label } from '@ui'`
- Check `src/renderer/shared/components/ui/index.ts` for available exports
- Use `PageLayout`, `PageHeader`, `PageContent` for page structure
- Use `TransitionOutlet` for route animations

## IPC Conventions

- Channel constants via `domain()` builder: `DOMAIN.VERB.NOUN` format
- Event channels via `events()` builder: `event:domain.verb.noun` format
- Zod validation on all IPC inputs (contract files)
- Typed channel constants — never hardcoded strings
- Handlers are thin: validate input, call service, return result

## Key Paths

```
@shared    -> src/shared
@main      -> src/main
@renderer  -> src/renderer
@features  -> src/renderer/features
@ui        -> src/renderer/shared/components/ui
```

## Available Tools

- **30 agent definitions** in `.claude/agents/` — specialist agents for each engineering role
- **17 skills** in `.claude/skills/` — `codebase-nav` for file lookup, `scaffold-feature` for new domains
- **context7 plugin** — live documentation for all libraries
- **Playwright MCP** — browser automation for E2E testing
- **Chrome DevTools MCP** — debugging running Electron app
- **Electron MCP** — screenshot and interact with running app

### MCP Server Discipline

Each connected MCP server costs ~18K tokens per turn in tool definitions. Only connect what you need:

| Task Type | Servers Needed |
|-----------|---------------|
| General coding | context7 only |
| UI development | context7, Chrome DevTools |
| E2E testing | Playwright, Chrome DevTools |
| Debugging running app | Electron, Chrome DevTools |
| Design implementation | Figma, context7 |

Disconnect unused servers between task types. Never connect all servers simultaneously.

## Testing

- Unit tests: `npm run test:unit` (Vitest)
- Integration tests: `npm run test:integration` (Vitest)
- E2E tests: `npm run test:e2e` (Playwright)
- Lint only changed files for agents: `npx eslint <file1> <file2>`
- Typecheck: `npx tsc --noEmit`
- Full check: `npm run lint && npm run typecheck && npm run build`

## Context Management

### Compaction Preservation
When context compresses (auto or via `/compact`), always preserve:
- Current task number and wave progress
- Full list of modified files in this session
- Any unresolved errors or blockers
- Branch name and last commit hash

### Session Hygiene
- Target 15-20 messages per session for optimal cache utilization
- Run `/compact` after completing each wave, not when context is nearly full
- Subagents should write output to disk and return only a confirmation line
- Use `/clear` when switching between unrelated tasks

### Model Routing
- **Haiku** — file lookups, grep tasks, simple renames, boilerplate generation
- **Sonnet** — standard implementation, bug fixes, hook/skill authoring
- **Opus** — architecture decisions, multi-file refactors, complex debugging

## Current Sprint Plan

Reference: `docs/superpowers/plans/2026-04-11-gap-closure-multi-sprint.md`
44 tasks across 7 sprints closing feature gaps identified by full-system data flow audit.

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
