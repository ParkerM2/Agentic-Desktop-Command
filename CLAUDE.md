# ADC — Agentic Desktop Command Guidelines

> Desktop UI for managing Claude autonomous coding agents.
> Electron 39 + React 19 + TypeScript strict + Tailwind v4 + Zustand 5

## Quick Reference

```bash
npm run dev          # Start dev mode (electron-vite)
npm run build        # Production build
npm run lint         # ESLint (zero tolerance — must pass clean)
npm run lint:fix     # Auto-fix ESLint violations
npm run format       # Prettier format all files
npm run typecheck    # tsc --noEmit
npm run test         # Run unit + integration tests
npm run test:unit    # Unit tests only (vitest)
npm run test:integration  # Integration tests only (vitest)
npm run test:e2e     # E2E tests (playwright + electron)
npm run test:coverage    # Unit tests with coverage report
npm run check:docs   # Verify docs updated for source changes
npm run verify       # Run ALL 5 verification commands at once
```

## Verification Requirements — MANDATORY (Non-Skippable)

**Before ANY work can be considered complete, ready for human review, or merged:**

```bash
# ALL FIVE COMMANDS MUST PASS — NO EXCEPTIONS
npm run lint         # Zero violations
npm run typecheck    # Zero errors
npm run test         # All tests pass
npm run build        # Builds successfully
npm run check:docs   # Documentation updated for source changes
```

### The Rule

> **Claude agents CANNOT claim work is complete without running the full verification suite and showing passing output.**
> This includes documentation updates — code changes without doc updates are incomplete work.
> This is not optional. This is not skippable. No excuses. Evidence before assertions.

### What This Means

| Situation | Required Action |
|-----------|-----------------|
| Implementing a new feature | Run full suite BEFORE claiming done |
| Fixing a bug | Run full suite BEFORE claiming fixed |
| Refactoring code | Run full suite BEFORE claiming complete |
| Adding a new service/component | Run full suite BEFORE handoff |
| ANY code change whatsoever | Run full suite BEFORE completion claims |

### Violations

These phrases without test evidence are **LIES**:
- "This should work now"
- "I've fixed the issue"
- "The feature is complete"
- "Ready for review"
- "Code looks good"
- "Docs can be updated later"
- "This change doesn't need doc updates"
- "I'll update docs in a follow-up"

### Correct Pattern

```
1. Make code changes
2. Update relevant ai-docs/ for your changes
3. Run: npm run lint && npm run typecheck && npm run test && npm run build && npm run check:docs
4. See: All 5 commands pass with zero errors
5. ONLY THEN: "All verification passes. Ready for review."
```

### Test Suite Structure

```
tests/
├── setup/                    # Test infrastructure
│   ├── vitest.setup.ts       # Global test setup
│   └── mocks/                # Electron, FS, PTY, IPC mocks
├── unit/                     # Unit tests (vitest.config.ts)
│   └── services/             # Service tests
├── integration/              # Integration tests (vitest.integration.config.ts)
│   └── ipc-handlers/         # IPC handler tests
├── e2e/                      # E2E tests (playwright.config.ts)
└── qa-scenarios/             # AI QA agent test scenarios
```

### When Writing New Code

If your changes affect:
- **Services** → Add/update tests in `tests/unit/services/`
- **IPC Handlers** → Add/update tests in `tests/integration/ipc-handlers/`
- **Components** → Add component tests co-located with source

If tests don't exist for the area you're modifying, **that doesn't exempt you from running the existing suite**.

### Documentation Update Mapping

`npm run check:docs` enforces that source changes include doc updates. Use this mapping to know which docs to update:

| Change Type | Docs to Update |
|-------------|----------------|
| New component/hook/store | `FEATURES-INDEX.md` (inventory), `PATTERNS.md` (usage examples) |
| New data flow or IPC wiring | `DATA-FLOW.md` (flow diagram), `ARCHITECTURE.md` (system overview) |
| New shared utility | `FEATURES-INDEX.md` (shared sections), `CODEBASE-GUARDIAN.md` (placement rules) |
| UI layout changes | `user-interface-flow.md` (UX flow sections), `FEATURES-INDEX.md` (layouts) |
| New feature module | `FEATURES-INDEX.md` (feature table), `ARCHITECTURE.md` (system diagram if applicable) |
| Gap resolution | `user-interface-flow.md` (mark gap RESOLVED with date and description) |
| New pattern or convention | `PATTERNS.md` (pattern example with code) |

**Checklist before committing:**

1. Did I add a new file? → Update `FEATURES-INDEX.md`
2. Did I add a new data flow? → Update `DATA-FLOW.md`
3. Did I introduce a new pattern? → Update `PATTERNS.md`
4. Did I change the architecture? → Update `ARCHITECTURE.md`
5. Did I change the UI layout or resolve a gap? → Update `user-interface-flow.md`

## Architecture Overview

```
src/
├── main/           # Electron main process (Node.js)
│   ├── index.ts    # App entry (delegates to bootstrap/)
│   ├── bootstrap/  # App init: lifecycle, service-registry, ipc-wiring, event-wiring
│   ├── ipc/        # IPC router + handler registration
│   │   └── handlers/tasks/  # Split task handlers (5 files)
│   └── services/   # Business logic (32 services, each with focused sub-modules)
├── preload/        # Context bridge (typed API exposed to renderer)
├── renderer/       # React app (browser context)
│   ├── app/        # Router, providers, layouts
│   │   └── routes/ # Route groups (8 files, one per domain)
│   ├── features/   # Feature modules (each self-contained)
│   └── shared/     # Shared hooks, stores, lib, components
└── shared/         # Code shared between main + renderer
    ├── ipc-contract.ts   # Thin re-export from ipc/ barrel
    ├── ipc/              # Domain-based IPC contracts (23 folders)
    │   └── <domain>/     # contract.ts + schemas.ts + index.ts
    └── types/            # Domain type definitions
        └── hub/          # Hub protocol types (9 modules)
```

## Critical Pattern: IPC Contract

**`src/shared/ipc/` (23 domain folders) is the source of truth for all IPC communication.** The root barrel at `src/shared/ipc/index.ts` merges all domain contracts into the unified `ipcInvokeContract` and `ipcEventContract`. The original `src/shared/ipc-contract.ts` is a thin backward-compatible re-export.

To add a new IPC operation:
1. Find or create the domain folder in `src/shared/ipc/<domain>/`
2. Add Zod schemas to `schemas.ts`, contract entries to `contract.ts`
3. Add handler in `src/main/ipc/handlers/<domain>-handlers.ts`
4. Implement logic in `src/main/services/<domain>/<domain>-service.ts`
5. Call from renderer via `ipc('<channel>', input)` — types flow automatically

Data flow: `ipc/<domain>/contract.ts` -> root barrel -> `IpcRouter` -> preload bridge -> `ipc()` helper -> React Query hooks

## Service Pattern

**Local** services return **synchronous values** (not Promises). IPC handlers wrap them:
```typescript
// Service method — sync
listProjects(): Project[] { ... }

// Handler — wraps in Promise.resolve for IPC
router.handle('projects.list', () => Promise.resolve(service.listProjects()));
```

Exceptions:
- `projectService.selectDirectory()` is async (Electron dialog)
- **Hub API proxy services** are async (they call the Hub REST API via `hubApiClient`)

## Feature Module Pattern

Each feature in `src/renderer/features/` follows:
```
feature/
├── index.ts           # Barrel exports (public API)
├── api/
│   ├── queryKeys.ts   # React Query cache key factory
│   └── use<Feature>.ts # Query/mutation hooks
├── components/        # React components
├── hooks/
│   └── use<Feature>Events.ts  # IPC event -> query invalidation
└── store.ts           # Zustand store (UI state only)
```

## Path Aliases

| Alias | Target | Used In |
|-------|--------|---------|
| `@shared/*` | `src/shared/*` | main, preload, renderer |
| `@main/*` | `src/main/*` | main |
| `@renderer/*` | `src/renderer/*` | renderer |
| `@features/*` | `src/renderer/features/*` | renderer |
| `@ui/*` | `src/renderer/shared/components/ui/*` | renderer |

## ESLint Rules — What You MUST Know

This project uses **extremely strict** ESLint. Zero violations tolerated. Key rules:

- **No `any`** — Use `unknown` + type narrowing or `as T` with eslint-disable comment
- **No `!` (non-null assertion)** — Use `?? fallback` or proper null checks
- **strict-boolean-expressions** — Numbers can't be used as booleans: use `arr.length > 0` not `arr.length`
- **no-floating-promises** — Unhandled promises must use `void` operator: `void navigate(...)`
- **consistent-type-imports** — Always use `import type { T }` for type-only imports
- **jsx-a11y strict** — Interactive elements need keyboard handlers + ARIA roles
- **no-nested-ternary** — Extract to helper function or use if/else
- **naming-convention** — camelCase default, PascalCase for types/components, UPPER_CASE for constants
- **Unused vars** — Prefix with `_` if intentionally unused: `_event`, `_id`
- **Promise callbacks** — `.then()` must return a value; prefer `async/await` or `void`
- **TanStack Router redirects** — Use `// eslint-disable-next-line @typescript-eslint/only-throw-error` for `throw redirect()`

See `ai-docs/LINTING.md` for the full rule reference and common fix patterns.

## Import Order (Enforced)

```typescript
// 1. Node builtins
import { join } from 'node:path';

// 2. External packages (react first, then alphabetical)
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 3. Internal — @shared, @main, @renderer
import type { Task } from '@shared/types';
import { cn } from '@renderer/shared/lib/utils';

// 4. Features
import { useTasks } from '@features/tasks';

// 5. Relative (parent, sibling)
import { MyComponent } from './MyComponent';
```

Blank line between each group. Alphabetical within groups.

## React Component Pattern

```typescript
// Named function declaration (required by eslint)
export function MyComponent({ prop }: MyComponentProps) {
  // hooks first, then derived state, then handlers, then render
}
```

- Use `function-declaration` for named components (not arrow functions)
- Self-closing tags for empty elements: `<Component />`
- No array index as key
- Ternary for conditional rendering (not `&&`)
- Sort JSX props: reserved first, shorthand, alphabetical, callbacks last, multiline last

## Design System — Critical Rules

The design system uses **CSS custom properties** with **Tailwind v4's `@theme` directive** and **`color-mix()`**.

### Architecture

```
postcss.config.mjs          # Enables @tailwindcss/postcss + autoprefixer
src/renderer/styles/globals.css  # ALL theme tokens, base styles, utility classes
src/renderer/shared/stores/theme-store.ts  # Applies mode + colorTheme + uiScale to DOM
src/shared/constants/themes.ts   # COLOR_THEMES array + ColorTheme type
```

### How It Works

1. **Theme variables** defined in `:root`, `.dark`, `[data-theme="name"]`, `[data-theme="name"].dark` blocks
2. **`@theme` block** maps CSS vars to Tailwind tokens: `--color-primary: var(--primary)` etc.
3. **`theme-store.ts`** applies `class="dark"` + `data-theme="ocean"` + `data-ui-scale="110"` to `<html>`
4. Components use standard Tailwind classes: `bg-primary`, `text-foreground`, `border-border`

### NEVER Do This

- **NEVER hardcode RGBA/hex in utility classes or animations.** Use `color-mix()`:
  ```css
  /* WRONG — only works for default theme */
  box-shadow: 0 0 0 4px rgba(214, 216, 118, 0.1);

  /* CORRECT — adapts to any active theme */
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 10%, transparent);
  ```
- **NEVER create `.dark` / `:root` variant selectors** for color differences — `color-mix()` with `var()` adapts automatically
- **NEVER modify the `@theme` block** token mappings — only modify theme variable values in `:root`/`.dark`/`[data-theme]` blocks
- **NEVER remove `postcss.config.mjs`** — Tailwind v4 requires it for PostCSS processing

### Adding a New Color Theme

1. Add `[data-theme="mytheme"]` and `[data-theme="mytheme"].dark` blocks in `globals.css`
2. Add `'mytheme'` to `COLOR_THEMES` array in `src/shared/constants/themes.ts`
3. Add label to `COLOR_THEME_LABELS` in the same file
4. All theme variables MUST be defined (background, foreground, card, primary, secondary, muted, accent, destructive, border, input, ring, sidebar, popover, success, warning, info, error + shadows)

### Raw Color Values

Raw hex/rgb/hsl values are **ONLY** allowed inside theme variable definitions:
```css
/* OK — theme variable definition */
.dark { --primary: #D6D876; }

/* OK — fixed semantic status colors */
.column-queue { border-top-color: #22d3ee; }

/* WRONG — hardcoded in utility class */
.my-hover:hover { background: rgba(214, 216, 118, 0.1); }
```

## State Management

- **Server state**: React Query (via `useQuery`/`useMutation` in feature `api/` folders)
- **UI state**: Zustand stores (in feature `store.ts` or `shared/stores/`)
- **No Redux, no Context for state** — keep it simple

## Tech Stack Reference

| Layer | Tech | Version |
|-------|------|---------|
| Desktop | Electron | 39 |
| Build | electron-vite | 5 |
| UI | React | 19 |
| Types | TypeScript strict | 5.9 |
| Routing | TanStack Router | 1.95 |
| Data | React Query | 5.62 |
| State | Zustand | 5 |
| Styling | Tailwind CSS | 4 |
| Validation | Zod | 4 |
| Terminal | xterm.js | 6 |
| DnD | dnd-kit | 6 |
| UI Primitives | Radix UI | latest |
| PTY | @lydell/node-pty | 1.1 |
| Linting | ESLint 9 + 8 plugins | strict |
| Formatting | Prettier 3 + tailwindcss plugin | - |

## Detailed Architecture Docs

**Read these when you need deeper context:**

| Document | When to Read |
|----------|--------------|
| `ai-docs/FEATURES-INDEX.md` | Starting point — what features exist, file locations, service inventory |
| `ai-docs/ARCHITECTURE.md` | System architecture, IPC flow, service patterns |
| `ai-docs/PATTERNS.md` | Code conventions, component patterns, examples |
| `ai-docs/DATA-FLOW.md` | Detailed data flow diagrams for all systems |
| `ai-docs/CODEBASE-GUARDIAN.md` | File placement rules, naming conventions, import rules |
| `ai-docs/LINTING.md` | ESLint rules reference and fix patterns |
| `ai-docs/TASK-PLANNING-PIPELINE.md` | Task planning pipeline — IPC channels, status transitions, file map |
| `ai-docs/AGENT-WORKFLOW.md` | Agent team orchestration workflow (intake → QA → merge) |
| `ai-docs/user-interface-flow.md` | UX flow map, gap analysis, component wiring |
| `ai-docs/prompts/implementing-features/README.md` | Team workflow for multi-agent feature implementation |

**Current gaps and priorities:** `docs/plans/2026-02-13-full-codebase-audit.md`

