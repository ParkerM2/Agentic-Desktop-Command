# Linting Rules Reference

> Rules enforced by `eslint.config.js`. Read this before writing any code. Violations are not auto-fixable and will cause QA FAIL.

---

## Import Ordering (`import-x/order`) — NOT auto-fixable

Imports must follow this exact group order, with a blank line between groups:

```
1. builtin     — node:fs, node:path, etc.
2. external    — npm packages (react first, then electron, then others)
3. internal    — path alias imports: @shared/**, @main/**, @renderer/**, @features/**, @ui/**
4. parent      — relative ../
5. sibling     — relative ./
6. index       — relative ./index
7. type        — import type { ... } from '...'
```

Within each group, imports are alphabetized ascending (case-insensitive).

### Internal group order

`@shared/**` and `@main/**` come before `@renderer/**`, `@features/**`, `@ui/**`.

Within `@shared/**`, sort alphabetically:
- `@shared/ipc/git/...` before `@shared/types` (`i` < `t`)
- `@shared/ipc/github` before `@shared/ipc/github/channels` (parent before subpath)

### Type imports

`import type { ... }` goes in the **`type` group (last)**. Do NOT mix type imports with regular imports from the same package unless they're on separate lines in the right group.

**Correct:**
```ts
import { execFile } from 'node:child_process';

import { app } from 'electron';

import { GIT } from '@shared/ipc/git/channels';
import type { GitCommit } from '@shared/ipc/git/schemas';
import type { SomeType } from '@shared/types';
```

**Wrong (type import mixed with regular imports in wrong position):**
```ts
import type { GitCommit } from '@shared/ipc/git/schemas';  // ✗ wrong group position
import { GIT } from '@shared/ipc/git/channels';
import type { SomeType } from '@shared/types';             // ✗ wrong group position
```

### Quick rule: where do my imports go?

| Import | Group |
|--------|-------|
| `import fs from 'node:fs'` | builtin |
| `import { app } from 'electron'` | external |
| `import { GIT } from '@shared/ipc/git/channels'` | internal |
| `import type { GitCommit } from '@shared/ipc/git/schemas'` | type (last) |
| `import { gitService } from '../git-service'` | parent |
| `import { helper } from './helper'` | sibling |

---

## Type Import Rules (`@typescript-eslint/consistent-type-imports`)

Always use `import type` for type-only imports. Use separate `import type` statements (not inline `type` specifiers).

```ts
// Correct
import type { GitCommit } from '@shared/ipc/git/schemas';
import { GIT } from '@shared/ipc/git/channels';

// Wrong
import { type GitCommit, GIT } from '@shared/ipc/git';
```

---

## No Unnecessary Null Coalescing (`@typescript-eslint/prefer-nullish-coalescing` / strict checks)

Do not add `?? fallback` when the value is already guaranteed non-null.

```ts
// Wrong — String.split() always returns string[], never null/undefined
const [hash, shortHash] = line.split('\x1f');
return { hash: hash ?? '', shortHash: shortHash ?? '' };  // ✗

// Correct
const [hash, shortHash] = line.split('\x1f');
return { hash, shortHash };  // ✓
```

---

## No `any` Types

`@typescript-eslint/no-explicit-any` is an error. Use `unknown` + type narrowing, or define a proper interface.

---

## Unused Variables

`@typescript-eslint/no-unused-vars` is an error. Prefix intentionally unused params with `_`:

```ts
function handler(_event: IpcMainEvent, args: unknown) { ... }
```

---

## Non-null Assertions

`@typescript-eslint/no-non-null-assertion` is an error. Never use `!`. Use optional chaining or explicit checks.

---

## Type Definitions

Use `interface` not `type` for object shapes (`@typescript-eslint/consistent-type-definitions`).

```ts
interface RawFile { filename: string; status: string; }  // ✓
type RawFile = { filename: string; status: string; };    // ✗
```

---

## Verify Before Committing

Run against only your changed files:

```bash
npx eslint --no-warn-ignored <file1> <file2>
npx tsc --noEmit
```

Both must exit 0 before reporting done.
