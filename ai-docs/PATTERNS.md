# Code Patterns & Conventions

## Adding a New Feature

1. Create feature directory: `src/renderer/features/<name>/`
2. Create barrel export: `index.ts`
3. Add query keys: `api/queryKeys.ts`
4. Add hooks: `api/use<Name>.ts`
5. Add components: `components/<Name>.tsx`
6. Add IPC event handler if needed: `hooks/use<Name>Events.ts`
7. Add lazy-loaded route in `src/renderer/app/routes/<group>.routes.ts` (see "Route Lazy Loading" below)
8. Add nav item in `src/renderer/app/layouts/Sidebar.tsx`

## Route Lazy Loading

All page-level route components use `lazyRouteComponent` from `@tanstack/react-router` for code splitting. This reduces the initial bundle size by loading page components on-demand.

```typescript
import { type AnyRoute, createRoute, lazyRouteComponent } from '@tanstack/react-router';

// Lazy-load via dynamic import + named export
const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dashboard',
  component: lazyRouteComponent(
    () => import('@features/dashboard'),
    'DashboardPage',
  ),
});
```

**Rules:**
- Use `lazyRouteComponent(() => import('@features/<name>'), 'ComponentName')` for all page routes
- The second argument is the **named export** from the feature barrel (`index.ts`)
- Layout routes (`AuthGuard`, `RootLayout`) stay eagerly loaded — they render on every page
- Redirect-only routes (no `component`) don't need lazy loading
- The router provides `defaultPendingComponent` (spinner) and `defaultErrorComponent` (error card) as fallbacks
- Auth page wrappers (which inject `useNavigate` callbacks) are eagerly loaded but wrap lazy page components with `<Suspense>`
- Every route SHOULD set a `pendingComponent` matching its page layout (see below)

## Route Loading Skeletons

Each route group uses a layout-appropriate loading skeleton instead of the generic spinner. Skeletons live in `src/renderer/app/components/route-skeletons.tsx` and use the `Skeleton` primitive from `@ui`.

```typescript
import { DashboardSkeleton } from '../components/route-skeletons';

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dashboard',
  pendingComponent: DashboardSkeleton,
  component: lazyRouteComponent(
    () => import('@features/dashboard'),
    'DashboardPage',
  ),
});
```

**Available skeletons:**
- `DashboardSkeleton` — card-grid layout (stat cards + content area)
- `ProjectSkeleton` — toolbar + table rows (for data-grid pages)
- `SettingsSkeleton` — form sections (label + input placeholders)
- `GenericPageSkeleton` — title + content cards (for misc pages)

**Adding a new skeleton:** If a new page layout doesn't match existing skeletons, add a new exported function to `route-skeletons.tsx` and wire it via `pendingComponent` on the route.

## Adding a New IPC Channel

1. **Define contract** in `src/shared/ipc/<domain>/contract.ts` (or create a new domain folder):
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

## Design System Component Usage

All UI elements use the design system primitives from `@ui`. **NEVER use raw HTML `<button>`, `<input>`, `<label>`, `<textarea>`, `<select>`** or raw `<Loader2 className="animate-spin">` — always use the design system equivalents.

```typescript
// CORRECT: Use design system primitives
import { Button, Card, CardContent, CardHeader, Input, Label, Spinner } from '@ui';

function MyForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" variant="required">Name</Label>
          <Input id="name" placeholder="Enter name" />
        </div>
        <Button variant="primary" disabled={isPending}>
          {isPending ? <Spinner size="sm" /> : null}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

// WRONG: Hardcoded HTML elements
<button className="bg-primary text-white rounded px-4 py-2">Save</button>
<input className="border rounded px-3 py-2" />
<Loader2 className="h-4 w-4 animate-spin" />
```

### Page Layout Pattern

Every page should use `PageLayout` for consistent structure:

```typescript
import { PageLayout, PageHeader, PageContent, Button } from '@ui';

function SettingsPage() {
  return (
    <PageLayout>
      <PageHeader title="Settings" description="Manage your preferences">
        <Button variant="primary">Save</Button>
      </PageHeader>
      <PageContent>
        {/* Page-specific content */}
      </PageContent>
    </PageLayout>
  );
}
```

### Button Variant Guide

| Use Case | Variant |
|----------|---------|
| Primary action (Save, Submit) | `variant="primary"` |
| Secondary action (Cancel) | `variant="secondary"` |
| Destructive (Delete, Remove) | `variant="destructive"` |
| Subtle/icon buttons | `variant="ghost"` |
| Bordered subtle | `variant="outline"` |
| Link-style | `variant="link"` |
| Icon-only | `variant="ghost" size="icon"` |

### Micro-Interaction Conventions

All interactive primitives (Button, Input, Textarea) include subtle micro-interactions for a polished feel:

| Interaction | Class | Applied To |
|-------------|-------|------------|
| Smooth transitions | `transition-all duration-150` | Button, Input, Textarea (base) |
| Press feedback | `active:scale-[0.98]` | Button (base) |
| Focus ring offset | `focus-visible:ring-offset-2` | Button (base) |
| Focus shadow | `focus-visible:shadow-sm` | Input, Textarea (base) |
| Hover elevation | `hover:shadow-sm` | Button `primary` and `secondary` variants only |

**Rules:**
- `transition-all duration-150` replaces `transition-colors` for smoother multi-property transitions
- `hover:shadow-sm` is intentionally limited to `primary` and `secondary` variants — ghost, link, destructive, and outline should NOT have hover shadows
- `active:scale-[0.98]` gives tactile press feedback; the scale is subtle enough to avoid layout shift
- These classes live in the CVA variant definitions — do NOT add them inline in component JSX

### EmptyState Pattern

Use `<EmptyState>` from `@ui` for all "no data" / "no results" screens. Replaces inline empty state JSX across features.

```typescript
import { Briefcase } from 'lucide-react';

import { Button, EmptyState } from '@ui';

// Simple — icon + title + description
<EmptyState
  description="No tasks match the current filter."
  icon={Briefcase}
  title="No tasks found"
/>

// With action button
<EmptyState
  description="Generate your daily briefing to get started."
  icon={Sun}
  title="No briefing yet"
  action={
    <Button onClick={handleGenerate}>Generate Briefing</Button>
  }
/>

// Size variants: sm (compact), md (default), lg (full-page)
<EmptyState icon={TerminalIcon} size="sm" title="No terminal open" />
```

**Props:**
- `icon` — Lucide icon component, rendered in a circular muted background
- `title` — Primary heading (required)
- `description` — Secondary text (optional)
- `action` — Slot for button(s) below description (optional)
- `size` — `sm` | `md` | `lg` (controls padding, icon size, text size)
- `className` — Merged via `cn()`

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

### Terminal Theme Integration (xterm.js)

The terminal uses CSS custom properties at runtime to adapt to the active theme:

```typescript
function getCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function getTerminalTheme(): Record<string, string> {
  return {
    background: getCssVar('--background', '#0a0a0a'),
    foreground: getCssVar('--foreground', '#e4e4e7'),
    cursor: getCssVar('--foreground', '#e4e4e7'),
    // ... maps ANSI colors to semantic CSS vars (--destructive, --success, --warning, --info, etc.)
  };
}
```

Key file: `src/renderer/features/terminals/components/TerminalInstance.tsx`

### GitHub / Brand Buttons (Theme-Adaptive)

For branded buttons that need a dark appearance on light backgrounds and vice versa, use `bg-foreground text-background` instead of hardcoded hex like `bg-[#24292f]`:

```tsx
// CORRECT — adapts to any theme
<Button className="bg-foreground text-background hover:bg-foreground/90">
  <GitHubIcon className="size-4" />
  Connect GitHub
</Button>

// WRONG — hardcoded GitHub brand color
<Button className="bg-[#24292f] text-white hover:bg-[#24292f]/90">
```

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

## TanStack Form + Zod Validation Pattern

For forms using TanStack Form with Zod schema validation and the design system `FormInput` primitives:

```typescript
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { Button, Form, FormInput, Spinner } from '@ui';

// Define Zod schema with validation messages
const myFormSchema = z.object({
  email: z.email('Enter a valid email address'),
  name: z.string().min(1, 'Name is required'),
});

export function MyFormPage() {
  const mutation = useMyMutation();

  const form = useForm({
    defaultValues: { email: '', name: '' },
    validators: { onChange: myFormSchema },
    onSubmit: ({ value }) => {
      mutation.mutate(value);
    },
  });

  function handleFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    void form.handleSubmit();
  }

  return (
    <Form onSubmit={handleFormSubmit}>
      <form.Field name="email">
        {(field) => (
          <FormInput
            required
            field={field}
            label="Email"
            placeholder="you@example.com"
            type="email"
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.canSubmit]}>
        {([canSubmit]) => (
          <Button disabled={!canSubmit || mutation.isPending} type="submit">
            {mutation.isPending ? <Spinner size="sm" /> : 'Submit'}
          </Button>
        )}
      </form.Subscribe>
    </Form>
  );
}
```

Key rules:
- **Import `useForm`** from `@tanstack/react-form` directly (NOT from `@ui`)
- **Import `Form`, `FormInput`** from `@ui` barrel
- **Zod schemas** passed to `validators: { onChange: schema }` for real-time validation
- **Zod 4** uses `z.email()` (not `z.string().email()` which is deprecated)
- **`form.Field`** renders children with a `field` API passed to `FormInput`
- **`form.Subscribe`** for reactive `canSubmit` state on the submit button
- **`void form.handleSubmit()`** — must use `void` to satisfy `no-floating-promises`
- **Shorthand props first** — `required` before `field`, `label`, etc. (`react/jsx-sort-props`)
- **Cross-field validation** — use `.refine()` on the Zod schema with `path` targeting specific field
- **`FormSelect`** — use for dropdowns: `<FormSelect field={field} label="Model" options={[{label, value}]} placeholder="..." />`
- **`FormField` for custom layouts** — wrap custom render (e.g., password toggle) inside `<FormField label="...">` and bind `field.handleBlur`/`field.handleChange` manually
- **Multiple forms in one component** — extract each form into its own sub-component with its own `useForm` instance (see WebhookSettings: SlackForm + GitHubForm)
- **Dialog forms** — use `form.reset()` + `form.setFieldValue()` in a `useEffect` triggered by `open` prop to sync external state into form defaults

### Migrated forms

All app forms now use TanStack Form + Zod:

| Form | Location | Notes |
|------|----------|-------|
| LoginPage | `features/auth/components/LoginPage.tsx` | Email + password, rate limiting |
| RegisterPage | `features/auth/components/RegisterPage.tsx` | Email + password + confirm |
| ProfileFormModal | `features/settings/components/ProfileFormModal.tsx` | Name (required), API key (password toggle), Model (FormSelect) |
| ConnectionForm | `features/settings/components/HubSettings.tsx` | Hub URL (z.url) + API key, async validateHubUrl on submit |
| SlackForm | `features/settings/components/WebhookSettings.tsx` | Bot token + signing secret (both optional) |
| GitHubForm | `features/settings/components/WebhookSettings.tsx` | Webhook secret (required) |

## Floating Widget Pattern

For persistent overlay components accessible from any page (like the assistant chat widget):

```typescript
// 1. Shared store for visibility state (in shared/stores/)
export const useWidgetStore = create<WidgetState>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

// 2. Orchestrator component (mounted in RootLayout)
export function MyWidget() {
  const { close, isOpen, toggle } = useWidgetStore();
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save/restore focus on open/close
  const handleToggle = useCallback(() => {
    if (!isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    }
    toggle();
  }, [isOpen, toggle]);

  const handleClose = useCallback(() => {
    close();
    previousFocusRef.current?.focus();
  }, [close]);

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        handleToggle();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleToggle, handleClose]);

  return (
    <>
      <FloatingButton isOpen={isOpen} onClick={handleToggle} />
      {isOpen ? <Panel onClose={handleClose} /> : null}
    </>
  );
}
```

Key rules:
- **Visibility store in `shared/stores/`** — Consumed by both the feature and RootLayout
- **Domain state in feature store** — Unread counts, history, etc. stay in `features/<name>/store.ts`
- **Focus management** — Save active element on open, restore on close
- **Global keyboard shortcuts** — `useEffect` + `document.addEventListener` + cleanup
- **Mount in RootLayout** — After notification components
- **z-index layering** — FAB at `z-40`, panel at `z-50`
- **Animation** — Panel entry animation via custom CSS class in `globals.css`

## Custom CSS Animations

Custom animation utility classes live **outside** the `@theme` block in `globals.css`:

```css
/* Outside @theme — utility class approach */
@keyframes slide-up-panel {
  from { transform: translateY(8px) scale(0.98); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
.animate-slide-up-panel {
  animation: slide-up-panel 0.2s ease-out;
}
```

- Tailwind v4 animations registered inside `@theme` (e.g., `--animate-slide-up`) use the `animate-*` utility directly
- Custom animations outside `@theme` need explicit `.animate-*` class definitions
- Always use `color-mix(in srgb, var(--token), transparent)` for semi-transparent effects in animations

## Agent Orchestrator Pattern

For headless Claude agent lifecycle management with event-driven status updates:

```typescript
// Interface defines session lifecycle
export interface AgentOrchestrator {
  spawnSession: (taskId: string, projectPath: string, options?: SpawnOptions) => OrchestratorSession;
  stopSession: (taskId: string) => void;
  listSessions: () => OrchestratorSession[];
  onSessionEvent: (handler: (event: SessionEvent) => void) => void;
  dispose: () => void;
}

// Factory creates orchestrator with dependencies
export function createAgentOrchestrator(dataDir: string, milestonesService: MilestonesService): AgentOrchestrator {
  const sessions = new Map<string, OrchestratorSession>();
  const eventHandlers: Array<(event: SessionEvent) => void> = [];

  return {
    spawnSession(taskId, projectPath, options) {
      // Spawn child process, register event listeners
      // Emit 'spawned' event, then 'active' on first output
    },
    onSessionEvent(handler) {
      eventHandlers.push(handler);
    },
    dispose() {
      // Kill all active sessions
    },
  };
}
```

Key rules:
- **Event-driven**: Use `onSessionEvent()` callback pattern for status updates
- **Wiring in index.ts**: Map session events to IPC events for renderer consumption
- **Cleanup**: Always implement `dispose()` and call it in `app.on('before-quit')`

## QA Runner Pattern

For two-tier automated quality assurance with notification integration:

```typescript
export function createQaRunner(
  orchestrator: AgentOrchestrator,
  dataDir: string,
  notificationManager?: NotificationManager,
): QaRunner {
  return {
    async runQuiet(taskId, projectPath) {
      // Run lint, typecheck, test, build
      // On failure: notify via notificationManager
    },
    async runFull(taskId, projectPath) {
      // Launch Claude agent with QA prompt
      // Interactive review with MCP Electron tools
    },
  };
}
```

Key rules:
- **Notification on failure**: Pass optional `notificationManager` to emit proactive alerts
- **Two tiers**: Quiet mode is fast/automated, Full mode is Claude-powered
- **Orchestrator reference**: QA runner needs orchestrator context for session info

## Watch/Subscription Pattern

For persistent user-defined triggers with IPC event matching:

```typescript
// 1. Store — JSON persistence
export function createWatchStore(): WatchStore {
  let watches = loadFromDisk();
  return {
    add(partial) { /* persist to userData/assistant-watches.json */ },
    getActive() { return watches.filter(w => !w.triggered); },
    markTriggered(id) { /* mark and persist */ },
  };
}

// 2. Evaluator — event matching engine
export function createWatchEvaluator(watchStore: WatchStore): WatchEvaluator {
  return {
    start() {
      // Subscribe to IPC events via ipcMain.on()
      // On each event: check all active watches for matches
      // On match: markTriggered + fire onTrigger handlers
    },
    stop() { /* remove all ipcMain listeners */ },
    onTrigger(handler) { /* register callback */ },
  };
}

// 3. Wiring in index.ts
watchEvaluator.onTrigger((watch) => {
  router.emit('event:assistant.proactive', {
    content: `Watch triggered: ${description}`,
    source: 'watch',
    taskId: watch.targetId === '*' ? undefined : watch.targetId,
  });
});
watchEvaluator.start();
```

Key rules:
- **Store + Evaluator separation**: Store handles persistence, Evaluator handles event matching
- **One-shot by default**: Watches are marked triggered after firing (not recurring)
- **Cleanup**: Stop evaluator in `app.on('before-quit')` to remove ipcMain listeners
- **IPC event map**: Evaluator maps watch types to specific IPC channels

## JSONL Progress Watcher Pattern

For efficient incremental tail parsing of append-only log files:

```typescript
export function createJsonlProgressWatcher(progressDir: string) {
  const filePositions = new Map<string, number>(); // Track read position per file

  function readNewEntries(filePath: string): ProgressEntry[] {
    const lastPos = filePositions.get(filePath) ?? 0;
    // Read from lastPos to end of file
    // Parse each line as JSON
    // Update filePositions with new end position
    return entries;
  }

  return {
    start() {
      // Use fs.watch() on progressDir
      // On change: debounce 500ms, then readNewEntries()
      // Emit onProgress with { taskId, entries }
    },
    stop() { /* close watcher */ },
    onProgress(handler) { /* register callback */ },
  };
}
```

Key rules:
- **Track file positions**: Use a Map to remember the last read byte offset per file
- **Debounce**: 500ms debounce on file change events to batch rapid writes
- **Incremental**: Never re-read the entire file — only read from the last known position
- **Type-safe entries**: Parse each line and emit typed events (tool_use, phase_change, plan_ready, etc.)
