# ESLint Rules Reference

This project uses ESLint 9 flat config with maximum strictness. The full config is in `eslint.config.js`.

## Plugin Stack

| Plugin | Purpose |
|--------|---------|
| typescript-eslint (strict + stylistic) | TypeScript type-aware rules |
| eslint-plugin-react | React best practices |
| eslint-plugin-react-hooks | Hooks rules of hooks |
| eslint-plugin-react-refresh | Vite HMR compatibility |
| eslint-plugin-jsx-a11y (strict) | Accessibility enforcement |
| eslint-plugin-import-x | Import ordering and validation |
| eslint-plugin-unicorn | JS/TS patterns and best practices |
| eslint-plugin-sonarjs | Code quality and complexity |
| eslint-plugin-promise | Promise best practices |
| eslint-config-prettier | Disables format-conflicting rules |

## Most Common Violations & Fixes

### `@typescript-eslint/no-floating-promises`
**Problem:** Promise returned but not handled.
```typescript
// BAD
navigate({ to: '/projects' });
queryClient.invalidateQueries({ queryKey: keys });

// GOOD
void navigate({ to: '/projects' });
void queryClient.invalidateQueries({ queryKey: keys });
```

### `@typescript-eslint/strict-boolean-expressions`
**Problem:** Number/nullable used as boolean.
```typescript
// BAD
if (items.length) { ... }
if (items?.length) { ... }

// GOOD
if (items.length > 0) { ... }
if ((items?.length ?? 0) > 0) { ... }
```

### `@typescript-eslint/no-non-null-assertion`
**Problem:** Using `!` to assert non-null.
```typescript
// BAD
const value = map.get(key)!;
queryKey: keys.list(projectId!),

// GOOD
const value = map.get(key) ?? fallback;
queryKey: keys.list(projectId ?? ''),
```

### `@typescript-eslint/consistent-type-imports`
**Problem:** Regular import used for type-only values.
```typescript
// BAD
import { Task, createTask } from './tasks';

// GOOD
import type { Task } from './tasks';
import { createTask } from './tasks';
```

### `@typescript-eslint/no-explicit-any`
**Problem:** Using `any` type.
```typescript
// BAD
const data: any = JSON.parse(raw);

// GOOD
const data = JSON.parse(raw) as unknown;
// Then narrow or assert: const typed = data as MyType;
```

### `@typescript-eslint/no-unused-vars`
**Problem:** Variable declared but never used.
```typescript
// BAD (if agentId is unused)
const { agentId, taskId } = event;

// GOOD — prefix with _
const { agentId: _agentId, taskId } = event;

// GOOD — for catch blocks, remove binding entirely
try { ... } catch { /* no binding */ }
```

### `@typescript-eslint/require-await`
**Problem:** `async` function with no `await`.
```typescript
// BAD
async function getData() {
  return readFileSync(path, 'utf-8');
}

// GOOD — remove async, return sync
function getData() {
  return readFileSync(path, 'utf-8');
}
```

### `jsx-a11y/click-events-have-key-events`
**Problem:** Clickable element without keyboard handler.
```tsx
// BAD
<div onClick={handleClick}>...</div>

// GOOD — add role, tabIndex, keyboard handler
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick(e);
  }}
>...</div>

// BEST — use a <button> element
<button onClick={handleClick}>...</button>
```

### `react/function-component-definition`
**Problem:** Arrow function for named component.
```typescript
// BAD
export const MyComponent = () => { ... };

// GOOD
export function MyComponent() { ... }
```

### `react/jsx-sort-props`
**Problem:** Props not in correct order.
```tsx
// Order: reserved (key/ref), shorthand, alphabetical, callbacks, multiline
<Component
  key={id}
  disabled
  className="..."
  label="Hello"
  onClick={handler}
  onKeyDown={(e) => { ... }}
/>
```

### `import-x/order`
**Problem:** Imports not in correct group order.
```typescript
// Order: builtin → external → internal (@shared, @renderer) → features → relative
// Blank line between groups, alphabetical within each group
```

### `sonarjs/no-nested-conditional`
**Problem:** Nested ternary expression.
```typescript
// BAD
const status = completed ? 'done' : started ? 'running' : 'idle';

// GOOD — extract helper
function getStatus(completed: boolean, started: boolean): string {
  if (completed) return 'done';
  if (started) return 'running';
  return 'idle';
}
```

### `unicorn/no-useless-undefined`
**Problem:** Explicitly returning `undefined`.
```typescript
// BAD
return undefined;

// GOOD
return;
```

### `promise/always-return`
**Problem:** `.then()` callback doesn't return a value.
```typescript
// BAD
promise.then(() => { doSomething(); });

// GOOD — use async IIFE instead of .then()
void (async () => {
  await promise;
  doSomething();
})();
```

### `@typescript-eslint/only-throw-error`
**Problem:** Throwing non-Error object.
```typescript
// Framework pattern (TanStack Router redirect) — disable per-line
// eslint-disable-next-line @typescript-eslint/only-throw-error
throw redirect({ to: '/projects' });
```

## Environment-Specific Overrides

| File Pattern | Environment | Relaxed Rules |
|-------------|-------------|---------------|
| `src/main/**` | Node.js | `no-console: off`, `prefer-top-level-await: off` |
| `src/preload/**` | Node + Browser | `no-console: off` |
| `src/renderer/**` | Browser | (default strict rules) |
| `**/*.test.*` | Test | `no-explicit-any: off`, `no-non-null-assertion: off`, `no-duplicate-string: off` |

## When to Use eslint-disable Comments

Use sparingly and always with a justification:

```typescript
// eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect pattern
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- IPC bridge: payload validated by contract
```

Never use blanket `eslint-disable` without a rule name — the `unicorn/no-abusive-eslint-disable` rule will catch it.
