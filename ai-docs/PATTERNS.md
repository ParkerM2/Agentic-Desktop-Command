# Code Patterns & Conventions

## Adding a New Feature

1. Create feature directory: `src/renderer/features/<name>/`
2. Create barrel export: `index.ts`
3. Add query keys: `api/queryKeys.ts`
4. Add hooks: `api/use<Name>.ts`
5. Add components: `components/<Name>.tsx`
6. Add IPC event handler if needed: `hooks/use<Name>Events.ts`
7. Add route in `src/renderer/app/router.tsx`
8. Add nav item in `src/renderer/app/layouts/Sidebar.tsx`

## Adding a New IPC Channel

1. **Define contract** in `src/shared/ipc-contract.ts`:
   ```typescript
   'myFeature.doThing': {
     input: z.object({ id: z.string() }),
     output: z.object({ result: z.string() }),
   },
   ```

2. **Create/update service** in `src/main/services/<domain>/`:
   ```typescript
   export interface MyService {
     doThing: (id: string) => { result: string };
   }
   ```

3. **Register handler** in `src/main/ipc/handlers/`:
   ```typescript
   router.handle('myFeature.doThing', ({ id }) =>
     Promise.resolve(service.doThing(id)),
   );
   ```

4. **Call from renderer**:
   ```typescript
   const result = await ipc('myFeature.doThing', { id: '123' });
   ```

Types flow automatically — no manual type wiring needed.

## React Component Conventions

```typescript
// CORRECT: Named function declaration
export function TaskCard({ task, isSelected, onClick }: TaskCardProps) {
  // 1. Hooks
  const queryClient = useQueryClient();

  // 2. Derived state
  const isCompleted = task.status === 'done';

  // 3. Handlers
  function handleClick() {
    onClick(task.id);
  }

  // 4. Render
  return <div onClick={handleClick}>...</div>;
}

// WRONG: Arrow function for named components
export const TaskCard = ({ task }: TaskCardProps) => { ... };
```

## Handling Nullable Values in React Query

When a hook accepts `string | null` and uses `enabled`:

```typescript
// CORRECT: Use ?? '' fallback (query won't run when disabled anyway)
export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: taskKeys.list(projectId ?? ''),
    queryFn: () => ipc('tasks.list', { projectId: projectId ?? '' }),
    enabled: projectId !== null,
  });
}

// WRONG: Non-null assertion (eslint error)
queryKey: taskKeys.list(projectId!),

// WRONG: Type assertion (triggers non-nullable-type-assertion-style)
queryKey: taskKeys.list(projectId as string),
```

## Handling Promises in React

```typescript
// CORRECT: void operator for intentionally unhandled promises
void navigate({ to: '/projects' });
void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

// CORRECT: async handler for promises that need awaiting
async function handleAdd() {
  const result = await selectDir.mutateAsync();
  if (result.path) {
    void navigate({ to: `/projects/${result.path}` });
  }
}

// WRONG: Floating promise (eslint error)
navigate({ to: '/projects' });
queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
```

## Accessibility Patterns

Interactive non-button elements need keyboard support:

```tsx
// CORRECT: span with role, tabIndex, and keyboard handler
<span
  role="button"
  tabIndex={0}
  onClick={(e) => handleClick(e)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick(e);
  }}
>
  Click me
</span>

// BETTER: Use a <button> element when possible
<button onClick={handleClick}>Click me</button>
```

## Boolean Expressions

```typescript
// CORRECT: Explicit comparisons for numbers
if (items.length > 0) { ... }
const hasItems = (items?.length ?? 0) > 0;

// WRONG: Number as boolean (eslint error)
if (items.length) { ... }
if (items?.length) { ... }

// OK: Strings and nullable objects can be used directly
if (name) { ... }           // string — allowed
if (user) { ... }           // nullable object — allowed
if (isEnabled) { ... }      // boolean — allowed
```

## Type Imports

```typescript
// CORRECT: Separate type imports
import type { Task, TaskStatus } from '@shared/types';
import { createTaskService } from './task-service';

// WRONG: Mixed imports (eslint error)
import { Task, createTaskService } from './task-service';
```

## Service Method Pattern

Services in the main process are synchronous:

```typescript
// Service returns sync values
listProjects(): Project[] {
  const raw = readFileSync(this.filePath, 'utf-8');
  return JSON.parse(raw) as Project[];
}

// Handler wraps in Promise.resolve()
router.handle('projects.list', () =>
  Promise.resolve(service.listProjects()),
);
```

## JSON File Reading Pattern

```typescript
// Read and type-assert unknown
function readJsonFile(filePath: string): unknown {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as unknown;
}

// Usage with type assertion at call site
const data = readJsonFile(path) as MyInterface;
```

## Event-Driven Query Invalidation

```typescript
export function useTaskEvents() {
  const queryClient = useQueryClient();

  useIpcEvent('event:task.statusChanged', ({ taskId, projectId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
  });
}
```

## Zustand Store Pattern

```typescript
interface TaskUIState {
  selectedTaskId: string | null;
  selectTask: (id: string) => void;
}

export const useTaskUI = create<TaskUIState>()((set) => ({
  selectedTaskId: null,
  selectTask: (id) => set({ selectedTaskId: id }),
}));
```

## Error Handling in Electron

```typescript
// TanStack Router redirects (framework pattern)
beforeLoad: () => {
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw redirect({ to: '/projects' });
},

// Preload bridge type assertion (IPC boundary)
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
handler(payload as EventPayload<T>);
```

## Unused Variables

```typescript
// Prefix with _ for intentionally unused parameters
ptyProcess.onExit(({ exitCode: _exitCode }) => { ... });
useIpcEvent('event:agent.log', ({ agentId: _agentId }) => { ... });

// Remove unused imports entirely (don't prefix with _)
```

## Design System — CSS Patterns

### Semi-Transparent Theme Colors with `color-mix()`

Use `color-mix(in srgb, var(--token) XX%, transparent)` instead of hardcoded RGBA.
This ensures colors adapt to whichever theme is active.

```css
/* CORRECT — works with any active theme */
.my-element:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, transparent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 10%, transparent);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
}

/* CORRECT — for foreground-based transparency (dividers, overlays) */
.divider {
  border-color: color-mix(in srgb, var(--foreground) 6%, transparent);
}

/* WRONG — hardcoded, breaks on non-default themes */
.my-element:hover {
  border-color: rgba(214, 216, 118, 0.4);
}
```

Benefits:
- Eliminates need for `.dark` / `:root` variant selectors for color differences
- Works with hex, rgb, hsl — any format the theme variables use
- Supported in Electron's Chromium (Chrome 111+)

### Theme Variable Structure

Every theme block must define all tokens. Template:

```css
[data-theme="mytheme"] {
  --background: #HEX;  --foreground: #HEX;
  --card: #HEX;        --card-foreground: #HEX;
  --primary: #HEX;     --primary-foreground: #HEX;
  --secondary: #HEX;   --secondary-foreground: #HEX;
  --muted: #HEX;       --muted-foreground: #HEX;
  --accent: #HEX;      --accent-foreground: #HEX;
  --destructive: #HEX; --destructive-foreground: #HEX;
  --border: #HEX;      --input: #HEX;    --ring: #HEX;
  --sidebar: #HEX;     --sidebar-foreground: #HEX;
  --popover: #HEX;     --popover-foreground: #HEX;
  --success: #HEX;     --success-foreground: #HEX;   --success-light: #HEX;
  --warning: #HEX;     --warning-foreground: #HEX;   --warning-light: #HEX;
  --info: #HEX;        --info-foreground: #HEX;      --info-light: #HEX;
  --error: #HEX;       --error-light: #HEX;
  --shadow-sm/md/lg/xl/focus: ...;
}
```

### Theme Switching Flow

```
User selects theme → useThemeStore.setColorTheme('ocean')
  → Zustand state updates
  → applyColorTheme() sets data-theme="ocean" on <html>
  → CSS [data-theme="ocean"] variables take effect
  → All Tailwind classes (bg-primary, etc.) automatically use new values
  → color-mix() expressions automatically use new values
```

### Constants for Theme Names

```typescript
import { COLOR_THEMES } from '@shared/constants';
import type { ColorTheme } from '@shared/constants';

// Available: 'default' | 'dusk' | 'lime' | 'ocean' | 'retro' | 'neo' | 'forest'
```

When adding a theme, update BOTH `globals.css` AND `src/shared/constants/themes.ts`.
