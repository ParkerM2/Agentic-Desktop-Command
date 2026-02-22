# User-Scoped Data Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Isolate user data (notes, captures, briefings, etc.) per logged-in user so different Hub accounts don't share local data.

**Architecture:** Create a `users/<userId>/` subdirectory structure under userData. Services that store user-specific data receive a user-scoped path after login. Global settings (hub-config, oauth-tokens, app settings) remain at the root. On login, services reinitialize with user-scoped paths. On logout, in-memory caches clear and services reset to pre-login state.

**Tech Stack:** Electron (app.getPath), Node.js fs, TypeScript, existing service factory pattern

---

## File Categories

### User-Scoped Files (move to `users/<userId>/`)

- `notes.json` - Personal notes
- `captures.json` - Quick capture entries
- `briefings.json` - Daily briefing summaries
- `assistant-history.json` - Assistant command history
- `assistant-watches.json` - Proactive notification triggers
- `alerts.json` - User alerts
- `ideas.json` - Ideas board
- `milestones.json` - Project milestones
- `changelog.json` - Change records
- `planner/` - Daily plans directory
- `fitness/` - Workouts, measurements, goals

### Global Files (remain at root)

- `settings.json` - App preferences (theme, hotkeys, API keys)
- `hub-config.json` - Hub connection (needed before login)
- `oauth-tokens.json` - OAuth tokens
- `oauth-providers.json` - OAuth client credentials
- `voice-config.json` - Voice input configuration
- `email-config.json` - SMTP configuration
- `error-log.json` - Error diagnostics
- `hub-sync-queue.json` - Offline sync queue
- `worktrees.json` - Git worktree mapping

---

## Task 1: Create User Data Path Resolver

**Files:**

- Create: `src/main/services/data-management/user-data-resolver.ts`
- Modify: `src/main/services/data-management/index.ts`

**Step 1: Create the user data resolver module**

```typescript
// src/main/services/data-management/user-data-resolver.ts
/**
 * User Data Path Resolver
 *
 * Provides user-scoped data directory paths. User data is stored in
 * `<userData>/users/<userId>/` to isolate data between Hub accounts.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface UserDataResolver {
  /** Get the data directory for a specific user. Creates if needed. */
  getUserDataDir(userId: string): string;
  /** Get the global data directory (for non-user-scoped data). */
  getGlobalDataDir(): string;
  /** Check if a user data directory exists. */
  userDataExists(userId: string): boolean;
}

export function createUserDataResolver(baseDataDir: string): UserDataResolver {
  const usersDir = join(baseDataDir, 'users');

  function getUserDataDir(userId: string): string {
    if (!userId) {
      throw new Error('userId is required for user-scoped data');
    }
    const userDir = join(usersDir, userId);
    if (!existsSync(userDir)) {
      mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }

  function getGlobalDataDir(): string {
    return baseDataDir;
  }

  function userDataExists(userId: string): boolean {
    if (!userId) return false;
    return existsSync(join(usersDir, userId));
  }

  return {
    getUserDataDir,
    getGlobalDataDir,
    userDataExists,
  };
}
```

**Step 2: Export from barrel**

Add to `src/main/services/data-management/index.ts`:

```typescript
export { createUserDataResolver, type UserDataResolver } from './user-data-resolver';
```

**Step 3: Commit**

```bash
git add src/main/services/data-management/user-data-resolver.ts src/main/services/data-management/index.ts
git commit -m "feat(storage): add user data path resolver"
```

---

## Task 2: Create User Session Manager

**Files:**

- Create: `src/main/services/auth/user-session-manager.ts`
- Create: `src/main/services/auth/index.ts`

**Step 1: Create user session manager**

```typescript
// src/main/services/auth/user-session-manager.ts
/**
 * User Session Manager
 *
 * Tracks the currently logged-in user and emits events on login/logout.
 * Services subscribe to these events to reinitialize with user-scoped paths.
 */

import type { IpcRouter } from '@main/ipc/router';

export interface UserSession {
  userId: string;
  email: string;
}

export interface UserSessionManager {
  /** Get current session, or null if not logged in. */
  getCurrentSession(): UserSession | null;
  /** Called when user logs in successfully. */
  setSession(session: UserSession): void;
  /** Called when user logs out. */
  clearSession(): void;
  /** Subscribe to session changes. Returns unsubscribe function. */
  onSessionChange(callback: (session: UserSession | null) => void): () => void;
}

export function createUserSessionManager(router: IpcRouter): UserSessionManager {
  let currentSession: UserSession | null = null;
  const listeners = new Set<(session: UserSession | null) => void>();

  function notifyListeners(): void {
    for (const listener of listeners) {
      listener(currentSession);
    }
  }

  return {
    getCurrentSession() {
      return currentSession;
    },

    setSession(session) {
      currentSession = session;
      router.emit('event:user.sessionChanged', { userId: session.userId, email: session.email });
      notifyListeners();
    },

    clearSession() {
      currentSession = null;
      router.emit('event:user.sessionChanged', { userId: null, email: null });
      notifyListeners();
    },

    onSessionChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
```

**Step 2: Create barrel export**

```typescript
// src/main/services/auth/index.ts
export {
  createUserSessionManager,
  type UserSessionManager,
  type UserSession,
} from './user-session-manager';
```

**Step 3: Add IPC event contract**

Add to `src/shared/ipc/auth/contract.ts` in the events section:

```typescript
'event:user.sessionChanged': {
  payload: z.object({
    userId: z.string().nullable(),
    email: z.string().nullable(),
  }),
},
```

**Step 4: Commit**

```bash
git add src/main/services/auth/ src/shared/ipc/auth/contract.ts
git commit -m "feat(auth): add user session manager with session change events"
```

---

## Task 3: Create Reinitializable Service Pattern

**Files:**

- Create: `src/main/services/data-management/reinitializable-service.ts`
- Modify: `src/main/services/data-management/index.ts`

**Step 1: Create reinitializable service interface**

```typescript
// src/main/services/data-management/reinitializable-service.ts
/**
 * Reinitializable Service Pattern
 *
 * Services that store user-scoped data implement this interface.
 * They reinitialize when the user changes (login/logout).
 */

export interface ReinitializableService {
  /** Reinitialize the service with a new data directory. */
  reinitialize(dataDir: string): void;
  /** Clear all in-memory state (called on logout). */
  clearState(): void;
}

/**
 * Type guard to check if a service is reinitializable.
 */
export function isReinitializable(service: unknown): service is ReinitializableService {
  return (
    typeof service === 'object' &&
    service !== null &&
    'reinitialize' in service &&
    'clearState' in service &&
    typeof (service as ReinitializableService).reinitialize === 'function' &&
    typeof (service as ReinitializableService).clearState === 'function'
  );
}
```

**Step 2: Export from barrel**

Add to `src/main/services/data-management/index.ts`:

```typescript
export { type ReinitializableService, isReinitializable } from './reinitializable-service';
```

**Step 3: Commit**

```bash
git add src/main/services/data-management/
git commit -m "feat(storage): add reinitializable service pattern"
```

---

## Task 4: Update Notes Service for User-Scoping

**Files:**

- Modify: `src/main/services/notes/notes-service.ts`

**Step 1: Add reinitializable interface to notes service**

Update the `NotesService` interface to extend `ReinitializableService`:

```typescript
import type { ReinitializableService } from '@main/services/data-management';

export interface NotesService extends ReinitializableService {
  // ... existing methods
}
```

**Step 2: Add state management variables**

Add near the top of the factory function:

```typescript
let currentFilePath = join(deps.dataDir, NOTES_FILE);
let notesCache: Note[] | null = null;
```

**Step 3: Update all file operations to use `currentFilePath`**

Replace hardcoded `filePath` references with `currentFilePath`.

**Step 4: Implement reinitialize and clearState**

Add to the returned object:

```typescript
reinitialize(dataDir: string) {
  currentFilePath = join(dataDir, NOTES_FILE);
  notesCache = null; // Force reload from new path
},

clearState() {
  notesCache = null;
},
```

**Step 5: Commit**

```bash
git add src/main/services/notes/notes-service.ts
git commit -m "feat(notes): make notes service reinitializable for user-scoping"
```

---

## Task 5: Update Captures/Dashboard Service for User-Scoping

**Files:**

- Modify: `src/main/services/dashboard/dashboard-service.ts`

**Step 1: Add reinitializable interface**

Same pattern as Task 4 - add `ReinitializableService` interface, add state variables, update file operations, implement `reinitialize` and `clearState`.

**Step 2: Commit**

```bash
git add src/main/services/dashboard/dashboard-service.ts
git commit -m "feat(dashboard): make dashboard service reinitializable for user-scoping"
```

---

## Task 6: Update Briefing Service for User-Scoping

**Files:**

- Modify: `src/main/services/briefing/briefing-service.ts`

**Step 1: Add reinitializable interface**

Same pattern as Task 4.

**Step 2: Commit**

```bash
git add src/main/services/briefing/briefing-service.ts
git commit -m "feat(briefing): make briefing service reinitializable for user-scoping"
```

---

## Task 7: Update Assistant History Service for User-Scoping

**Files:**

- Modify: `src/main/services/assistant/history-store.ts`

**Step 1: Add reinitializable interface**

Same pattern as Task 4.

**Step 2: Commit**

```bash
git add src/main/services/assistant/history-store.ts
git commit -m "feat(assistant): make history store reinitializable for user-scoping"
```

---

## Task 8: Update Alerts Service for User-Scoping

**Files:**

- Modify: `src/main/services/alerts/alert-store.ts`

**Step 1: Add reinitializable interface**

Same pattern as Task 4.

**Step 2: Commit**

```bash
git add src/main/services/alerts/alert-store.ts
git commit -m "feat(alerts): make alert store reinitializable for user-scoping"
```

---

## Task 9: Update Ideas Service for User-Scoping

**Files:**

- Modify: `src/main/services/ideas/ideas-service.ts`

**Step 1: Add reinitializable interface**

Same pattern as Task 4.

**Step 2: Commit**

```bash
git add src/main/services/ideas/ideas-service.ts
git commit -m "feat(ideas): make ideas service reinitializable for user-scoping"
```

---

## Task 10: Update Planner Service for User-Scoping

**Files:**

- Modify: `src/main/services/planner/planner-service.ts`

**Step 1: Add reinitializable interface**

This service uses a directory (`planner/`) instead of a single file. Update the `plannerDir` variable to be mutable and reinitializable.

**Step 2: Commit**

```bash
git add src/main/services/planner/planner-service.ts
git commit -m "feat(planner): make planner service reinitializable for user-scoping"
```

---

## Task 11: Update Fitness Service for User-Scoping

**Files:**

- Modify: `src/main/services/fitness/fitness-service.ts`

**Step 1: Add reinitializable interface**

This service uses a directory (`fitness/`). Same pattern as planner.

**Step 2: Commit**

```bash
git add src/main/services/fitness/fitness-service.ts
git commit -m "feat(fitness): make fitness service reinitializable for user-scoping"
```

---

## Task 12: Update Milestones Service for User-Scoping

**Files:**

- Modify: `src/main/services/milestones/milestones-service.ts`

**Step 1: Add reinitializable interface**

Same pattern as Task 4.

**Step 2: Commit**

```bash
git add src/main/services/milestones/milestones-service.ts
git commit -m "feat(milestones): make milestones service reinitializable for user-scoping"
```

---

## Task 13: Update Changelog Service for User-Scoping

**Files:**

- Modify: `src/main/services/changelog/changelog-service.ts`

**Step 1: Add reinitializable interface**

Same pattern as Task 4.

**Step 2: Commit**

```bash
git add src/main/services/changelog/changelog-service.ts
git commit -m "feat(changelog): make changelog service reinitializable for user-scoping"
```

---

## Task 14: Wire Up Service Registry with User Session

**Files:**

- Modify: `src/main/bootstrap/service-registry.ts`

**Step 1: Import new modules**

```typescript
import { createUserDataResolver, isReinitializable } from '@main/services/data-management';
import { createUserSessionManager } from '@main/services/auth';
```

**Step 2: Create user session manager and data resolver**

After `const dataDir = app.getPath('userData');`:

```typescript
const userDataResolver = createUserDataResolver(dataDir);
const userSessionManager = createUserSessionManager(router);
```

**Step 3: Collect user-scoped services**

After all services are created, collect the reinitializable ones:

```typescript
const userScopedServices = [
  notesService,
  dashboardService,
  briefingService,
  assistantHistoryStore,
  alertStore,
  ideasService,
  plannerService,
  fitnessService,
  milestonesService,
  changelogService,
].filter(isReinitializable);
```

**Step 4: Subscribe to session changes**

```typescript
userSessionManager.onSessionChange((session) => {
  if (session) {
    // User logged in - reinitialize with user-scoped paths
    const userDataDir = userDataResolver.getUserDataDir(session.userId);
    for (const service of userScopedServices) {
      service.reinitialize(userDataDir);
    }
  } else {
    // User logged out - clear state and reset to global dir
    for (const service of userScopedServices) {
      service.clearState();
      service.reinitialize(dataDir); // Reset to global (pre-login state)
    }
  }
});
```

**Step 5: Export userSessionManager**

Add to the returned services object:

```typescript
return {
  // ... existing
  userSessionManager,
};
```

**Step 6: Commit**

```bash
git add src/main/bootstrap/service-registry.ts
git commit -m "feat(bootstrap): wire user session to service reinitialization"
```

---

## Task 15: Update Auth Handlers to Trigger Session Changes

**Files:**

- Modify: `src/main/ipc/handlers/auth-handlers.ts`

**Step 1: Accept userSessionManager in dependencies**

Update the handler factory to accept `userSessionManager`.

**Step 2: Call setSession on successful login**

After successful login in `auth.login` handler:

```typescript
deps.userSessionManager.setSession({
  userId: result.user.id,
  email: result.user.email,
});
```

**Step 3: Call clearSession on logout**

In `auth.logout` handler:

```typescript
deps.userSessionManager.clearSession();
```

**Step 4: Call setSession on successful session restore**

In `auth.restore` handler when restore succeeds:

```typescript
deps.userSessionManager.setSession({
  userId: result.user.id,
  email: result.user.email,
});
```

**Step 5: Commit**

```bash
git add src/main/ipc/handlers/auth-handlers.ts
git commit -m "feat(auth): trigger session changes on login/logout/restore"
```

---

## Task 16: Update Handler Registration

**Files:**

- Modify: `src/main/bootstrap/ipc-wiring.ts`

**Step 1: Pass userSessionManager to auth handlers**

Update the call to `registerAuthHandlers` to include `userSessionManager` in deps.

**Step 2: Commit**

```bash
git add src/main/bootstrap/ipc-wiring.ts
git commit -m "feat(ipc): pass userSessionManager to auth handlers"
```

---

## Task 17: Add Data Migration for Existing Users

**Files:**

- Create: `src/main/services/data-management/user-data-migrator.ts`
- Modify: `src/main/services/data-management/index.ts`

**Step 1: Create migrator**

```typescript
// src/main/services/data-management/user-data-migrator.ts
/**
 * User Data Migrator
 *
 * Migrates existing global data files to user-scoped directories
 * on first login by a user.
 */

import { existsSync, copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const USER_SCOPED_FILES = [
  'notes.json',
  'captures.json',
  'briefings.json',
  'assistant-history.json',
  'assistant-watches.json',
  'alerts.json',
  'ideas.json',
  'milestones.json',
  'changelog.json',
];

const USER_SCOPED_DIRS = ['planner', 'fitness'];

export interface UserDataMigrator {
  /** Migrate global data to user directory if user dir is empty. */
  migrateIfNeeded(globalDir: string, userDir: string): void;
}

export function createUserDataMigrator(): UserDataMigrator {
  function copyDirRecursive(src: string, dest: string): void {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    for (const entry of readdirSync(src)) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      if (statSync(srcPath).isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }

  return {
    migrateIfNeeded(globalDir, userDir) {
      // Check if user dir already has data
      const hasExistingData = USER_SCOPED_FILES.some((f) => existsSync(join(userDir, f)));
      if (hasExistingData) {
        return; // Already migrated or has data
      }

      // Migrate files
      for (const file of USER_SCOPED_FILES) {
        const src = join(globalDir, file);
        const dest = join(userDir, file);
        if (existsSync(src) && !existsSync(dest)) {
          copyFileSync(src, dest);
        }
      }

      // Migrate directories
      for (const dir of USER_SCOPED_DIRS) {
        const src = join(globalDir, dir);
        const dest = join(userDir, dir);
        if (existsSync(src) && !existsSync(dest)) {
          copyDirRecursive(src, dest);
        }
      }
    },
  };
}
```

**Step 2: Export from barrel**

**Step 3: Call migrator in service-registry before reinitializing services**

In the `onSessionChange` callback:

```typescript
if (session) {
  const userDataDir = userDataResolver.getUserDataDir(session.userId);
  userDataMigrator.migrateIfNeeded(dataDir, userDataDir);
  // ... reinitialize services
}
```

**Step 4: Commit**

```bash
git add src/main/services/data-management/
git commit -m "feat(storage): add user data migrator for first-login migration"
```

---

## Task 18: Update Renderer to Handle Session Change Events

**Files:**

- Modify: `src/renderer/features/auth/store.ts`

**Step 1: Clear React Query cache on logout**

The auth store's `clearAuth` should also signal that all user data queries need to be invalidated. This is already handled in `useLogout` hook which calls `queryClient.clear()`.

**Step 2: Listen for session change events**

Add a hook in the auth feature that listens for `event:user.sessionChanged` and invalidates all queries:

```typescript
// In useAuthEvents.ts or similar
useIpcEvent('event:user.sessionChanged', () => {
  queryClient.clear();
});
```

**Step 3: Commit**

```bash
git add src/renderer/features/auth/
git commit -m "feat(auth): clear query cache on session change"
```

---

## Task 19: Run Verification Suite

**Step 1: Run lint**

```bash
npm run lint
```

Expected: 0 errors

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors

**Step 3: Run tests**

```bash
npm run test
```

Expected: All tests pass

**Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Manual test**

1. Start dev server: `npm run dev`
2. Log out (if logged in)
3. Log in with test account
4. Verify data is empty (or migrated)
5. Create a note
6. Log out
7. Log in with different account (if available) or check file system
8. Verify note is not visible
9. Check `userData/users/<userId>/notes.json` exists

**Step 6: Commit all remaining changes**

```bash
git add .
git commit -m "feat(storage): complete user-scoped data storage implementation"
```

---

## Task 20: Update Documentation

**Files:**

- Modify: `ai-docs/ARCHITECTURE.md`
- Modify: `ai-docs/DATA-FLOW.md`
- Modify: `ai-docs/FEATURES-INDEX.md`

**Step 1: Document user-scoped storage in ARCHITECTURE.md**

Add section explaining the user-scoped storage pattern.

**Step 2: Update DATA-FLOW.md**

Add diagram showing data flow on login/logout.

**Step 3: Update FEATURES-INDEX.md**

Add new services to the inventory.

**Step 4: Commit**

```bash
git add ai-docs/
git commit -m "docs: document user-scoped data storage architecture"
```

---

## Summary

This plan implements user-scoped data storage in 20 tasks:

1. **Tasks 1-3:** Create infrastructure (resolver, session manager, reinitializable pattern)
2. **Tasks 4-13:** Update 10 services to be reinitializable
3. **Tasks 14-16:** Wire everything together in bootstrap
4. **Task 17:** Add migration for existing data
5. **Task 18:** Update renderer to handle session changes
6. **Task 19:** Verification
7. **Task 20:** Documentation

**Parallel execution opportunities:**

- Tasks 4-13 (service updates) can run in parallel - each is independent
- Tasks 1-3 must complete before 4-13
- Tasks 14-16 must complete after 4-13
- Task 17-18 can run in parallel after 16
