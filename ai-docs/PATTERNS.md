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

## Security — Secret Storage Pattern

All secrets (OAuth credentials, webhook secrets, API keys) MUST be encrypted using Electron's `safeStorage` API.

### Storage Format

Encrypted secrets are stored as JSON objects with two fields:

```typescript
interface EncryptedSecretEntry {
  encrypted: string;      // Base64-encoded encrypted data
  useSafeStorage: boolean; // Whether real encryption was used
}
```

### Implementation Pattern

```typescript
import { safeStorage } from 'electron';

// Check if a value is legacy plaintext or already encrypted
function isEncryptedEntry(value: unknown): value is EncryptedSecretEntry {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.encrypted === 'string' && typeof obj.useSafeStorage === 'boolean';
}

// Encrypt — always call before persisting secrets
function encryptSecret(value: string): EncryptedSecretEntry {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = safeStorage.encryptString(value);
    return { encrypted: buffer.toString('base64'), useSafeStorage: true };
  }
  // Fallback for CI/testing (safeStorage unavailable)
  console.warn('[Service] safeStorage not available — falling back to base64');
  return { encrypted: Buffer.from(value, 'utf-8').toString('base64'), useSafeStorage: false };
}

// Decrypt — always call when reading secrets
function decryptSecret(entry: EncryptedSecretEntry): string {
  if (entry.useSafeStorage) {
    const buffer = Buffer.from(entry.encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }
  return Buffer.from(entry.encrypted, 'base64').toString('utf-8');
}
```

### Migration Pattern

Services MUST handle migration from plaintext to encrypted format:

```typescript
function loadSecrets(): Map<string, Secret> {
  const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
  let needsMigration = false;

  for (const [key, value] of Object.entries(parsed)) {
    if (isEncryptedEntry(value)) {
      // Already encrypted — decrypt and use
      secrets.set(key, decryptSecret(value));
    } else if (typeof value === 'string') {
      // Legacy plaintext — mark for migration
      secrets.set(key, value);
      needsMigration = true;
    }
  }

  if (needsMigration) {
    console.log('[Service] Migrating plaintext secrets to encrypted format');
    saveSecrets(secrets); // Re-save with encryption
  }

  return secrets;
}
```

### Key Rules

- **NEVER** store secrets as plaintext in JSON files
- **ALWAYS** use `safeStorage.isEncryptionAvailable()` check before encrypting
- **ALWAYS** provide base64 fallback for CI/testing environments
- **ALWAYS** implement automatic migration from plaintext to encrypted
- **ALWAYS** log a warning when falling back to base64 (indicates non-production environment)

## Confirmation Dialog Pattern

Use the shared `ConfirmDialog` for destructive actions (delete, remove, etc.):

```typescript
import { useState } from 'react';
import { ConfirmDialog } from '@renderer/shared/components/ConfirmDialog';

export function MyComponent() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMutation = useDeleteThing();

  function handleDelete() {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => setConfirmOpen(false),
      },
    );
  }

  return (
    <>
      <button onClick={() => setConfirmOpen(true)}>Delete</button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Item"
        description="Are you sure? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
```

Key rules:
- **Caller controls dialog close** — `onConfirm` does NOT auto-close; use `onSuccess` to close after mutation completes
- **Loading state** — Pass `loading={mutation.isPending}` to disable buttons and show spinner during async operations
- **Variant** — Use `"destructive"` for delete/remove actions (red confirm button), `"default"` for non-destructive confirmations

## Mutation Error Toast Pattern

Wire `onError` handlers to all user-facing mutations:

```typescript
import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';

export function useDeleteTask() {
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: ({ taskId, projectId }: { taskId: string; projectId: string }) =>
      ipc('hub.tasks.delete', { taskId, projectId }),
    onError: onError('delete task'),
  });
}
```

The `onError(action)` factory returns a callback that:
1. Extracts the error message from the Error object
2. Logs to console: `[Mutation Error] delete task: <message>`
3. Adds a toast to the toast store (auto-dismisses after 5s, max 3 visible)

Key rules:
- **All user-facing mutations MUST have `onError` handlers** — silent failures are unacceptable
- **Action string** — Use lowercase imperative: `'create task'`, `'delete project'`, `'update status'`
- **Toast store** — `src/renderer/shared/stores/toast-store.ts` (Zustand, max 3 toasts, 5s auto-dismiss)
- **Renderer** — `MutationErrorToast` mounted in `RootLayout.tsx` (fixed bottom-right)

## Form Dialog Pattern

For dialogs with form inputs (create, edit):

```typescript
export function CreateThingDialog() {
  const store = useThingStore();
  const createMutation = useCreateThing();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (store.dialogOpen) {
      setTitle('');
      setError('');
    }
  }, [store.dialogOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length === 0) {
      setError('Title is required');
      return;
    }
    createMutation.mutate(
      { title: title.trim() },
      {
        onSuccess: () => store.setDialogOpen(false),
        onError: (err) => setError(err instanceof Error ? err.message : 'Unknown error'),
      },
    );
  }

  return (
    <Dialog open={store.dialogOpen} onOpenChange={store.setDialogOpen}>
      <form onSubmit={handleSubmit}>
        {/* form fields */}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Dialog>
  );
}
```

Key rules:
- **Dialog open state in Zustand** — Store `dialogOpen` + `setDialogOpen` in the feature store
- **Reset on open** — Clear form fields and errors when dialog opens
- **Inline errors** — Show validation/mutation errors inside the dialog, not as toasts
- **No autoFocus** — `jsx-a11y/no-autofocus` rule forbids `autoFocus` prop
- **Form submit** — Use `<form onSubmit>` for Enter key support (except in textareas)
