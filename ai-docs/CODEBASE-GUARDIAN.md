# Codebase Guardian Rules

> Structural integrity rules for ADC.
> Every file, every pattern, every boundary — codified.
> Agents MUST check their work against these rules before submission.

---

## 1. File Placement Rules

### Source Directory Ownership

| Directory | What Goes Here | What NEVER Goes Here |
|-----------|---------------|---------------------|
| `src/shared/types/` | Domain type interfaces (`Task`, `Project`, etc.) | Implementation code, React components, service logic |
| `src/shared/types/hub/` | Hub protocol domain types (9 modules: auth, devices, enums, errors, events, projects, tasks, workspaces) | Service logic, renderer imports |
| `src/shared/ipc-contract.ts` | Thin re-export barrel from `src/shared/ipc/` | New contract definitions (add to domain folders) |
| `src/shared/ipc/<domain>/` | Domain-specific Zod schemas (`schemas.ts`), invoke/event contracts (`contract.ts`), barrel (`index.ts`) | Cross-domain imports, business logic |
| `src/shared/ipc/index.ts` | Root barrel merging all 23 domain contracts into unified objects | Domain-specific code |
| `src/shared/constants/` | Constant values, enums, config objects | Functions with side effects, mutable state |
| `src/main/bootstrap/` | App initialization modules: lifecycle, service-registry, ipc-wiring, event-wiring | Business logic, feature code |
| `src/main/services/` | Business logic, data persistence, PTY management | React code, browser APIs, UI logic |
| `src/main/services/agent-orchestrator/` | Agent orchestrator, JSONL progress watcher, agent watchdog | React code, renderer imports, UI logic |
| `src/main/services/qa/` | QA runner (quiet + full mode) + sub-modules (7 files) | React code, renderer imports |
| `src/main/services/assistant/` | Intent classifier (`intent-classifier/`, 16 files), command executors (`executors/`, 22 files), watch store, watch evaluator, cross-device query, history store | React code, renderer imports |
| `src/main/ipc/handlers/` | Thin IPC handler functions that call services | Business logic (belongs in services) |
| `src/main/ipc/handlers/tasks/` | Split task handlers: hub-task, legacy-task, status-mapping, task-transform | Business logic (belongs in services) |
| `src/main/ipc/router.ts` | IPC routing infrastructure | Domain-specific handler code |
| `src/preload/` | Context bridge (`api.invoke`, `api.on`) | Business logic, React code, service code |
| `src/renderer/features/` | Feature modules (self-contained) | Shared utilities, cross-feature imports |
| `src/renderer/shared/` | Shared hooks, stores, lib, UI components | Feature-specific code |
| `src/renderer/shared/stores/` | Cross-feature Zustand stores (layout, theme, toast, widget visibility) + `ThemeHydrator.tsx` | Feature-specific stores (those go in `features/<name>/store.ts`) |
| `src/renderer/app/` | Router, providers, layouts | Feature components, business logic |
| `src/renderer/app/routes/` | Route group files (8 files, one per domain: auth, dashboard, project, settings, etc.) | Business logic, component definitions |
| `src/renderer/styles/` | Global CSS, theme definitions | Component-specific styles (use Tailwind classes) |

### Plan Lifecycle Tracking

| File | Location | Rule |
|------|----------|------|
| `tracker.json` | `docs/tracker.json` | Single source of truth for plan status. MUST be updated when plans change status. |
| `validate-tracker.mjs` | `scripts/validate-tracker.mjs` | Validation script — do not move. |
| Active plans | `docs/plans/` | Plans with status DRAFT, APPROVED, IN_PROGRESS, BLOCKED, TRACKING |
| Active progress | `docs/progress/` | Progress files for features currently being implemented |
| Archived plans | `doc-history/plans/` | Plans with status IMPLEMENTED, SUPERSEDED, ABANDONED, ARCHIVED |
| Archived progress | `doc-history/progress/` | Progress files for completed features |

**Archival rules:**
- Plans with status `IMPLEMENTED` or `SUPERSEDED` that are older than 14 days should be archived
- When archiving: `git mv` the file to `doc-history/`, update `docs/tracker.json` paths, set status to `ARCHIVED`
- `npm run validate:tracker` must pass after any archival operation

### Feature Module Structure (MANDATORY)

Every feature in `src/renderer/features/<name>/` MUST have:

```
<name>/
├── index.ts              # Barrel export — REQUIRED
├── api/                  # Data fetching layer
│   ├── queryKeys.ts      # React Query key factory — REQUIRED if feature has data
│   ├── use<Name>.ts      # Query hooks (read operations)
│   └── use<Name>Mutations.ts  # Mutation hooks (write operations, if applicable)
├── components/           # React components — REQUIRED
│   └── <Name>Page.tsx    # Main page component
├── hooks/                # Custom hooks
│   └── use<Name>Events.ts  # IPC event subscriptions (if applicable)
└── store.ts              # Zustand store for UI state (if needed)
```

**Rules:**
- `index.ts` barrel MUST export everything the feature exposes publicly
- Feature code MUST NOT import from another feature's internal files (only from its `index.ts`)
- Cross-feature communication happens through React Query cache or Zustand shared stores

### Barrel Export Pattern

```typescript
// CORRECT: src/renderer/features/tasks/index.ts
export { TaskCard } from './components/TaskCard';
export { TaskStatusBadge } from './components/TaskStatusBadge';
export { useTasks, useTask } from './api/useTasks';
export { useTaskMutations } from './api/useTaskMutations';
export { useTaskEvents } from './hooks/useTaskEvents';

// WRONG: Importing internal paths from outside
import { TaskCard } from '@features/tasks/components/TaskCard'; // NO
import { TaskCard } from '@features/tasks'; // YES
```

---

## 2. Naming Rules

### Files

| Type | Convention | Example |
|------|-----------|---------|
| React component | PascalCase | `TaskCard.tsx`, `TaskTable.tsx` |
| Hook | camelCase, prefix `use` | `useTasks.ts`, `useIpcEvent.ts` |
| Store | kebab-case or camelCase | `layout-store.ts`, `store.ts` |
| Service | kebab-case | `task-service.ts`, `agent-service.ts` |
| Handler | kebab-case | `task-handlers.ts`, `project-handlers.ts` |
| Type file | kebab-case | `task.ts`, `project.ts` |
| Constant file | kebab-case | `routes.ts`, `themes.ts` |
| Test file | match source + `.test` | `TaskCard.test.tsx`, `task-service.test.ts` |
| Index/barrel | `index.ts` or `index.tsx` | `index.ts` |

### Code Identifiers

| Type | Convention | Example |
|------|-----------|---------|
| Component | PascalCase function declaration | `export function TaskCard() {}` |
| Hook | camelCase, prefix `use` | `export function useTasks() {}` |
| Constant | UPPER_SNAKE_CASE | `export const ROUTES = {}` |
| Type/Interface | PascalCase | `interface TaskStatus {}` |
| Variable | camelCase | `const selectedTaskId = ...` |
| Function | camelCase | `function handleClick() {}` |
| Enum member | PascalCase or UPPER_CASE | `ExecutionPhase.Planning` |
| IPC channel | dot.notation (quoted) | `'tasks.list'`, `'event:task.statusChanged'` |
| CSS variable | kebab-case, prefix `--` | `--primary`, `--card-foreground` |
| Tailwind class | kebab-case | `bg-primary`, `text-muted-foreground` |

### Unused Variables

- Prefix with `_` if intentionally unused: `_event`, `_id`
- In destructuring: `{ agentId: _agentId, taskId }`
- In catch blocks: remove binding entirely `catch { ... }`
- NEVER prefix imports with `_` — remove the import instead

---

## 3. Import Rules

### Order (enforced by eslint-plugin-import-x)

```typescript
// 1. Node builtins (must use node: protocol)
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

// 2. External packages (react first, then alphabetical)
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal — @shared first, then @main/@renderer
import type { Task, TaskStatus } from '@shared/types';
import { ROUTES } from '@shared/constants';
import { cn } from '@renderer/shared/lib/utils';

// 4. Features
import { useTasks } from '@features/tasks';

// 5. Relative (parent first, then sibling)
import { MyComponent } from '../MyComponent';
import { helper } from './helper';
```

**Rules:**
- Blank line between EVERY group
- Alphabetical within each group
- `import type` for type-only imports (separate statement)
- No circular imports (enforced: `import-x/no-cycle`, maxDepth: 4)
- No duplicate imports
- No self-imports

---

## 4. Component Rules

### Structure (enforced order within component)

```typescript
export function MyComponent({ prop1, prop2, onAction }: MyComponentProps) {
  // 1. Hooks (useState, useQuery, custom hooks)
  const [isOpen, setIsOpen] = useState(false);
  const { data: tasks } = useTasks(projectId);

  // 2. Derived state (computed from hooks/props)
  const hasItems = (tasks?.length ?? 0) > 0;
  const isActive = status === 'running';

  // 3. Event handlers (named functions, not inline arrows for complex logic)
  function handleClick() {
    onAction(prop1);
  }

  // 4. Effects (useEffect — prefer event-driven patterns over effects)

  // 5. Render
  return <div>...</div>;
}
```

### JSX Rules

- **Self-closing tags** for elements with no children: `<Component />`
- **No array index as key**: use `item.id`, never `index`
- **Ternary for conditional rendering**: `condition ? <A /> : null`, NOT `condition && <A />`
- **No nested ternary**: extract to helper function
- **Props sorted**: reserved (`key`, `ref`) > shorthand > alphabetical > callbacks > multiline

### Component File Rules

- **One exported component per file** (react-refresh requirement)
- **Named function declaration**: `export function TaskCard() {}`, NOT `export const TaskCard = () => {}`
- **Props interface defined above component** or in a shared types file
- **Max 300 lines per component file** — split if larger

---

## 5. Service Rules (Main Process)

### Pattern

```typescript
// Interface first — defines the public API
export interface TaskService {
  listTasks: (projectId: string) => Task[];
  createTask: (draft: TaskDraft) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => Task;
}

// Factory function creates instance
export function createTaskService(deps: { router: IpcRouter }): TaskService {
  // Private state via closure
  const tasks: Map<string, Task> = new Map();

  return {
    listTasks(projectId) {
      // Synchronous — NEVER return Promise
      return [...tasks.values()].filter(t => t.projectId === projectId);
    },
    createTask(draft) {
      const task = { ...draft, id: uuid(), createdAt: new Date().toISOString() };
      tasks.set(task.id, task);
      deps.router.emit('event:task.statusChanged', { taskId: task.id, ... });
      return task;
    },
  };
}
```

**Rules:**
- Services return **synchronous values** (not Promises)
- Exception: only when calling async Electron APIs (dialog, etc.)
- Services emit events via `router.emit()` for real-time updates
- Services own their data persistence (read/write JSON files or in-memory)
- Services NEVER import from renderer or preload

### Handler Pattern

```typescript
// Thin wrapper — NO business logic here
export function registerTaskHandlers(router: IpcRouter, service: TaskService) {
  router.handle('tasks.list', ({ projectId }) =>
    Promise.resolve(service.listTasks(projectId)),
  );
  router.handle('tasks.create', (draft) =>
    Promise.resolve(service.createTask(draft)),
  );
}
```

**Rules:**
- Handlers are thin: call service method, wrap in `Promise.resolve()`
- Handlers NEVER contain business logic
- One handler file per domain: `task-handlers.ts`, `project-handlers.ts`

### Multi-File Service Pattern

Services are split into focused sub-modules within their directory. Examples of the refactored structure:

```
services/assistant/
├── assistant-service.ts       # Main service factory (public API)
├── history-store.ts           # Command history persistence
├── watch-store.ts             # Persistent watch subscription storage
├── watch-evaluator.ts         # IPC event → watch matching engine
├── cross-device-query.ts      # Hub API device queries
├── executors/                 # 22 domain executor files
│   ├── router.ts              # Routes intents to correct executor
│   ├── types.ts               # Shared executor types
│   ├── response-builders.ts   # Response formatting helpers
│   ├── task.executor.ts       # Task operations
│   ├── planner.executor.ts    # Planner operations
│   └── ... (19 more)          # One executor per domain
└── intent-classifier/         # 16 intent classification files
    ├── classifier.ts          # Main classifier (regex + Claude API fallback)
    ├── helpers.ts              # Classification helpers
    ├── types.ts                # Classifier types
    └── patterns/               # 13 domain pattern files
        ├── task.patterns.ts
        ├── planner.patterns.ts
        └── ... (11 more)

services/agent/
├── agent-service.ts           # Main service factory
├── agent-spawner.ts           # PTY spawn logic
├── agent-output-parser.ts     # CLI output parsing
├── agent-queue.ts             # Agent execution queue
└── token-parser.ts            # Token usage extraction

services/hub/
├── hub-api-client.ts          # REST API calls
├── hub-auth-service.ts        # Login/register/token refresh
├── hub-client.ts              # Client orchestration
├── hub-config-store.ts        # Hub config persistence
├── hub-connection.ts          # Connection lifecycle
├── hub-event-mapper.ts        # WS event → IPC event mapping
├── hub-sync.ts                # Data synchronization
├── hub-ws-client.ts           # WebSocket client
└── webhook-relay.ts           # Webhook event relay

services/briefing/             # 6 files: cache, config, generator, summary, suggestion-engine
services/email/                # 7 files: config, encryption, queue, store, smtp-transport
services/notifications/        # 7 files: slack-watcher, github-watcher, filter, manager, store
services/settings/             # 4 files: defaults, encryption, store
services/project/              # 6 files: detector, task-service, slug, spec-parser, store
services/qa/                   # 7 files: poller, prompt, report-parser, session-store, trigger, types
services/tasks/                # 3 files: decomposer, github-importer (barrel: index.ts)
```

**Rules:**
- Main service file (`assistant-service.ts`, `agent-service.ts`, etc.) is the public API
- Sub-files are internal implementation details — only the main service imports them
- Exception: `index.ts` barrels may import sub-file factories directly for wiring
- Each sub-module should have a focused, single responsibility
- New IPC domain executors go in `assistant/executors/<domain>.executor.ts`
- New intent patterns go in `assistant/intent-classifier/patterns/<domain>.patterns.ts`

---

## 6. IPC Contract Rules

### Adding a New Channel

1. Find or create the domain folder under `src/shared/ipc/<domain>/`
2. Add Zod schemas to `schemas.ts`
3. Add the invoke contract entry to `contract.ts`
4. Export from the domain's `index.ts`
5. The root barrel (`src/shared/ipc/index.ts`) auto-merges it if the domain is already imported
6. For a new domain: add the import + spread to the root barrel
7. Channel name format: `domain.action` (e.g., `tasks.create`, `settings.update`)

**Note:** Do NOT edit `src/shared/ipc-contract.ts` directly — it is a backward-compatible re-export.

### Adding a New Event

1. Add to the domain's `contract.ts` in `src/shared/ipc/<domain>/`
2. Define `payload` Zod schema in `schemas.ts`
3. Channel name format: `event:domain.eventName` (e.g., `event:task.statusChanged`)

### IPC Domain Folder Structure

Each folder in `src/shared/ipc/<domain>/` MUST contain:
- `schemas.ts` — All Zod schemas for the domain
- `contract.ts` — `<domain>Invoke` and `<domain>Events` objects with contract entries
- `index.ts` — Barrel re-export of schemas + contract objects

### Rules

- EVERY piece of data crossing the IPC boundary MUST have a Zod schema
- Types in `src/shared/types/` MUST match their Zod schema counterparts
- When adding a field to a type, add it to BOTH the TypeScript interface AND the Zod schema
- Zod schemas are validated at the main process boundary (IpcRouter)
- NEVER use `z.any()` — use `z.unknown()` or specific schemas

---

## 7. Styling Rules

### Tailwind Classes (DO)
- Use theme-aware classes: `bg-primary`, `text-foreground`, `border-border`
- Use `cn()` utility from `@renderer/shared/lib/utils` for conditional classes
- Use standard Tailwind spacing, sizing, typography classes

### CSS Custom Properties (DO)
- Define theme variables ONLY in `:root`, `.dark`, `[data-theme="X"]` blocks
- Use `color-mix(in srgb, var(--token) XX%, transparent)` for transparency
- Register new tokens in `@theme` block if adding new design tokens

### NEVER
- Hardcode hex/rgb/rgba in component styles or utility classes
- Create `.dark` variant selectors — use `color-mix()` with CSS vars instead
- Inline `style={{}}` for colors — use Tailwind classes
- Import CSS files from components — all CSS goes in `globals.css`
- Use `!important` — restructure selectors instead

---

## 8. Size Limits

| File Type | Max Lines | Action When Exceeded |
|-----------|-----------|---------------------|
| React component | 300 | Split into sub-components |
| Service file | 500 | Split into sub-services |
| Handler file | 200 | One file per domain, split domain if needed |
| Hook file | 150 | One hook per file |
| Store file | 100 | Split into slices |
| Type file | 200 | Split into sub-type files |
| Constants file | 100 | Split by concern |
| Test file | 500 | Split into describe blocks or files |

---

## 9. Dependency Rules

### Allowed Import Directions

```
src/shared/     <-- can be imported by EVERYTHING
  |
  v
src/main/       <-- can import shared, NEVER renderer/preload
  |
  v
src/preload/    <-- can import shared, NEVER main/renderer
  |
  v
src/renderer/   <-- can import shared, NEVER main/preload
  |
  +-- shared/   <-- can be imported by any renderer code
  |
  +-- features/ <-- can import renderer/shared, NEVER other features' internals
  |
  +-- app/      <-- can import features (via barrel), renderer/shared
```

### Forbidden Imports

- `src/renderer/**` MUST NOT import from `src/main/**`
- `src/main/**` MUST NOT import from `src/renderer/**`
- `src/preload/**` MUST NOT import from `src/main/**` or `src/renderer/**`
- Feature A MUST NOT import from Feature B's internal files (only barrel `index.ts`)
- No circular dependencies (enforced: max depth 4)

---

## 10. Git & Branch Rules

### Branch Naming
- Feature: `feature/<short-description>`
- Fix: `fix/<short-description>`
- Phase work: `phase<N>/<feature-name>`

### Commit Messages
- Imperative mood: "Add task filtering" not "Added task filtering"
- Prefix with scope: `feat(tasks):`, `fix(tasks):`, `refactor(ipc):`
- Max 72 characters for first line

### PR Requirements
- Title under 70 characters
- Description with Summary + Test Plan
- All checks pass (lint, typecheck, test, build)
- No `console.log` in renderer code (warn level in ESLint)
