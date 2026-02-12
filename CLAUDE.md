# Claude-UI — AI Agent Guidelines

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
npm run test         # vitest run
```

## Architecture Overview

```
src/
├── main/           # Electron main process (Node.js)
│   ├── index.ts    # App lifecycle, window creation
│   ├── ipc/        # IPC router + handler registration
│   └── services/   # Business logic (agent, project, task, terminal, settings)
├── preload/        # Context bridge (typed API exposed to renderer)
├── renderer/       # React app (browser context)
│   ├── app/        # Router, providers, layouts
│   ├── features/   # Feature modules (each self-contained)
│   └── shared/     # Shared hooks, stores, lib, components
└── shared/         # Code shared between main + renderer
    ├── ipc-contract.ts   # THE source of truth for all IPC
    └── types/            # Domain type definitions
```

## Critical Pattern: IPC Contract

**`src/shared/ipc-contract.ts` is the single source of truth for all IPC communication.**

To add a new IPC operation:
1. Define input/output Zod schemas in `ipc-contract.ts`
2. Add handler in `src/main/ipc/handlers/<domain>-handlers.ts`
3. Implement logic in `src/main/services/<domain>/<domain>-service.ts`
4. Call from renderer via `ipc('<channel>', input)` — types flow automatically

Data flow: `ipc-contract.ts` -> `IpcRouter` -> preload bridge -> `ipc()` helper -> React Query hooks

## Service Pattern

Main process services return **synchronous values** (not Promises). IPC handlers wrap them:
```typescript
// Service method — sync
listProjects(): Project[] { ... }

// Handler — wraps in Promise.resolve for IPC
router.handle('projects.list', () => Promise.resolve(service.listProjects()));
```

Exception: `projectService.selectDirectory()` is async (Electron dialog).

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

- `ai-docs/ARCHITECTURE.md` — Full system architecture and data flow
- `ai-docs/PATTERNS.md` — Code patterns, conventions, and examples
- `ai-docs/LINTING.md` — ESLint rules reference and fix patterns
