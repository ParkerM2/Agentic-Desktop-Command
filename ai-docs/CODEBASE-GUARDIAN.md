# Codebase Guardian Rules

> Structural integrity rules for Claude-UI.
> Every file, every pattern, every boundary — codified.
> Agents MUST check their work against these rules before submission.

---

## 1. File Placement Rules

### Source Directory Ownership

| Directory | What Goes Here | What NEVER Goes Here |
|-----------|---------------|---------------------|
| `src/shared/types/` | Domain type interfaces (`Task`, `Project`, etc.) | Implementation code, React components, service logic |
| `src/shared/ipc-contract.ts` | Zod schemas, channel definitions, type utilities | Business logic, React imports, Node.js imports |
| `src/shared/constants/` | Constant values, enums, config objects | Functions with side effects, mutable state |
| `src/main/services/` | Business logic, data persistence, PTY management | React code, browser APIs, UI logic |
| `src/main/ipc/handlers/` | Thin IPC handler functions that call services | Business logic (belongs in services) |
| `src/main/ipc/router.ts` | IPC routing infrastructure | Domain-specific handler code |
| `src/preload/` | Context bridge (`api.invoke`, `api.on`) | Business logic, React code, service code |
| `src/renderer/features/` | Feature modules (self-contained) | Shared utilities, cross-feature imports |
| `src/renderer/shared/` | Shared hooks, stores, lib, UI components | Feature-specific code |
| `src/renderer/app/` | Router, providers, layouts | Feature components, business logic |
| `src/renderer/styles/` | Global CSS, theme definitions | Component-specific styles (use Tailwind classes) |

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
| React component | PascalCase | `TaskCard.tsx`, `KanbanBoard.tsx` |
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

---

## 6. IPC Contract Rules

### Adding a New Channel

1. Add to `ipcInvokeContract` in `src/shared/ipc-contract.ts`
2. Define both `input` and `output` Zod schemas
3. Schemas must reference existing shared Zod schemas (don't duplicate)
4. Channel name format: `domain.action` (e.g., `tasks.create`, `settings.update`)

### Adding a New Event

1. Add to `ipcEventContract` in `src/shared/ipc-contract.ts`
2. Define `payload` Zod schema
3. Channel name format: `event:domain.eventName` (e.g., `event:task.statusChanged`)

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
- Prefix with scope: `feat(tasks):`, `fix(kanban):`, `refactor(ipc):`
- Max 72 characters for first line

### PR Requirements
- Title under 70 characters
- Description with Summary + Test Plan
- All checks pass (lint, typecheck, test, build)
- No `console.log` in renderer code (warn level in ESLint)
