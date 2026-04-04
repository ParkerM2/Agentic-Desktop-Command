# P0 Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four confirmed data-loss and security bugs: plaintext password caching, planner goal-completion not persisting, pipeline plan feedback silently discarded, and notification rules lost on restart.

**Architecture:** Four independent surgical fixes — each touches 1–5 files with no cross-task dependencies. Implement in any order. Two fixes are renderer-only; one spans shared types + renderer; one is a store-layer persistence addition.

**Tech Stack:** TypeScript strict, React 19, Zustand, TanStack Query, Vitest (unit/integration for main-process code), `npm run lint` + `npm run typecheck` + `npm run build` as verification gates for renderer changes.

**Verification note:** Unit tests in this repo live under `tests/unit/services/` (main process). Renderer-side logic has no test harness yet. For renderer-only tasks (1, 3, 4) the verification gate is typecheck + lint + build. For task 2 (shared types + IPC contract), write a unit test for the schema change.

---

## Audit correction (verified before writing this plan)

The audit incorrectly flagged three items as broken. They are already implemented:
- **Logout button**: `UserMenu.tsx` in the sidebar footer calls `useLogout()` correctly
- **`useUpdateIdea()`**: exported from `useIdeas.ts` and wired in `IdeaEditForm.tsx`
- **`useVoteIdea()`**: exported from `useIdeas.ts` and used in `IdeationPage.tsx`

Do not attempt to re-implement these.

---

## File Map

| File | Task | Change |
|------|------|--------|
| `src/renderer/features/auth/hooks/useSavedLogins.ts` | 1 | Remove `password` field; save/read email only |
| `src/renderer/features/auth/components/LoginPage.tsx` | 1 | Update badge click to pre-fill email only, no auto-submit |
| `src/shared/types/planner.ts` | 2 | Add `completedGoals?: string[]` to `DailyPlan` |
| `src/shared/ipc/planner/schemas.ts` | 2 | Add `completedGoals` to `DailyPlanSchema` |
| `src/shared/ipc/planner/contract.ts` | 2 | Add `completedGoals` to `planner.updateDay` input |
| `src/renderer/features/planner/components/GoalsList.tsx` | 2 | Accept `completedGoals` + `onToggle` props; remove local `completed` state |
| `src/renderer/features/planner/components/PlannerPage.tsx` | 2 | Pass `completedGoals` from plan; handle toggle |
| `src/renderer/features/workflow-pipeline/components/step-panels/PlanReadyPanel.tsx` | 3 | Import + call `useReplanWithFeedback`; replace `void feedback;` |
| `src/renderer/features/communications/store.ts` | 4 | Persist `notificationRules` to localStorage on every write |

---

## Task 1: Remove plaintext password from SavedLogins

**Context:** `useSavedLogins.ts` saves `{ email, password }` to `localStorage` key `adc:saved-logins`. Anyone who can read localStorage (other renderer scripts, DevTools, any XSS) gets the user's plaintext password. The fix: store email only. Badge clicks pre-fill email and focus the password field — the user types their own password.

**Files:**
- Modify: `src/renderer/features/auth/hooks/useSavedLogins.ts`
- Modify: `src/renderer/features/auth/components/LoginPage.tsx`

- [ ] **Step 1.1: Rewrite `useSavedLogins.ts` — email only**

Replace the entire file content with:

```typescript
/**
 * useSavedLogins — persists email addresses in localStorage
 * so the login page can show click-to-fill badges.
 *
 * Passwords are intentionally NOT stored.
 */

const STORAGE_KEY = 'adc:saved-logins';

export interface SavedLogin {
  email: string;
}

function readFromStorage(): SavedLogin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedLogin =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).email === 'string',
    );
  } catch {
    return [];
  }
}

function writeToStorage(logins: SavedLogin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logins));
}

export function useSavedLogins() {
  const logins = readFromStorage();

  function saveLogin(email: string): void {
    const existing = readFromStorage().filter((l) => l.email !== email);
    writeToStorage([{ email }, ...existing]);
  }

  function removeLogin(email: string): void {
    writeToStorage(readFromStorage().filter((l) => l.email !== email));
  }

  return { logins, saveLogin, removeLogin };
}
```

- [ ] **Step 1.2: Update `LoginPage.tsx` — remove password from badge behaviour**

In `src/renderer/features/auth/components/LoginPage.tsx`:

1. In `onSubmit`, change `saveLogin(value.email, value.password)` → `saveLogin(value.email)`:

```typescript
onSuccess: () => {
  saveLogin(value.email);  // was: saveLogin(value.email, value.password)
  onSuccess();
},
```

2. Remove the `handleBadgeClick` function entirely (lines 72-76 in the current file).

3. Replace the badge `<button>` onClick so it only fills the email field and does **not** submit:

```tsx
<button
  className="text-foreground hover:text-primary transition-colors"
  type="button"
  onClick={() => {
    form.setFieldValue('email', saved.email);
  }}
>
  {saved.email}
</button>
```

The remove button (`<X>`) stays unchanged.

- [ ] **Step 1.3: Verify**

```bash
npm run typecheck
npm run lint
```

Expected: no errors. Confirm `LoginPage.tsx` no longer references `handleBadgeClick` or `saved.password`.

- [ ] **Step 1.4: Commit**

```bash
git add src/renderer/features/auth/hooks/useSavedLogins.ts src/renderer/features/auth/components/LoginPage.tsx
git commit -m "fix(auth): remove plaintext password from localStorage saved logins"
```

---

## Task 2: Persist planner goal completion

**Context:** `GoalsList.tsx` tracks completed goals with a local `Set<number>` (index-based). This resets on every page navigation and is lost on refresh. The fix adds `completedGoals?: string[]` — an array of completed goal *text values* — to the `DailyPlan` type, IPC schema, and IPC contract, then wires it through the component tree. Text-based tracking (not index-based) is correct because goals can be added/removed without breaking existing completions.

**Files:**
- Modify: `src/shared/types/planner.ts`
- Modify: `src/shared/ipc/planner/schemas.ts`
- Modify: `src/shared/ipc/planner/contract.ts`
- Modify: `src/renderer/features/planner/components/GoalsList.tsx`
- Modify: `src/renderer/features/planner/components/PlannerPage.tsx`
- Create: `tests/unit/services/planner-schema.test.ts`

- [ ] **Step 2.1: Write failing test for schema**

Create `tests/unit/services/planner-schema.test.ts`:

```typescript
/**
 * Unit test for DailyPlanSchema completedGoals field.
 */
import { describe, expect, it } from 'vitest';

import { DailyPlanSchema } from '../../../src/shared/ipc/planner/schemas';

describe('DailyPlanSchema', () => {
  it('accepts a plan with completedGoals', () => {
    const result = DailyPlanSchema.safeParse({
      date: '2026-04-03',
      goals: ['Write tests', 'Ship feature'],
      completedGoals: ['Write tests'],
      scheduledTasks: [],
      timeBlocks: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completedGoals).toEqual(['Write tests']);
    }
  });

  it('accepts a plan without completedGoals (backwards compatible)', () => {
    const result = DailyPlanSchema.safeParse({
      date: '2026-04-03',
      goals: ['Write tests'],
      scheduledTasks: [],
      timeBlocks: [],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2.2: Run test — confirm it fails**

```bash
npm run test:unit -- --reporter=verbose tests/unit/services/planner-schema.test.ts
```

Expected: FAIL — `completedGoals` is not a recognised field in schema, parse likely strips it (strictness depends on Zod mode). Confirm test output shows the failure you expect.

- [ ] **Step 2.3: Add `completedGoals` to shared type**

In `src/shared/types/planner.ts`, update `DailyPlan`:

```typescript
export interface DailyPlan {
  date: string;
  goals: string[];
  completedGoals?: string[];  // ← add this line
  scheduledTasks: ScheduledTask[];
  timeBlocks: TimeBlock[];
  reflection?: string;
}
```

- [ ] **Step 2.4: Add `completedGoals` to Zod schema**

In `src/shared/ipc/planner/schemas.ts`, update `DailyPlanSchema`:

```typescript
export const DailyPlanSchema = z.object({
  date: z.string(),
  goals: z.array(z.string()),
  completedGoals: z.array(z.string()).optional(),  // ← add this line
  scheduledTasks: z.array(ScheduledTaskSchema),
  timeBlocks: z.array(TimeBlockSchema),
  reflection: z.string().optional(),
});
```

- [ ] **Step 2.5: Add `completedGoals` to IPC contract**

In `src/shared/ipc/planner/contract.ts`, update `planner.updateDay` input:

```typescript
'planner.updateDay': {
  input: z.object({
    date: z.string(),
    goals: z.array(z.string()).optional(),
    completedGoals: z.array(z.string()).optional(),  // ← add this line
    scheduledTasks: z.array(ScheduledTaskSchema).optional(),
    reflection: z.string().optional(),
  }),
  output: DailyPlanSchema,
},
```

- [ ] **Step 2.6: Run test — confirm it passes**

```bash
npm run test:unit -- --reporter=verbose tests/unit/services/planner-schema.test.ts
```

Expected: PASS — both test cases green.

- [ ] **Step 2.7: Rewrite `GoalsList.tsx` — remove local completion state**

Replace the entire file content with:

```tsx
/**
 * GoalsList — Daily goals checklist.
 * Completion is persisted via the onToggle callback (not local state).
 */

import { useState } from 'react';

import { Check, Plus, Trash2, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

interface GoalsListProps {
  goals: string[];
  completedGoals: string[];
  onUpdate: (goals: string[]) => void;
  onToggle: (goalText: string) => void;
}

export function GoalsList({ goals, completedGoals, onUpdate, onToggle }: GoalsListProps) {
  const [newGoal, setNewGoal] = useState('');
  const completedSet = new Set(completedGoals);

  function handleAdd() {
    const trimmed = newGoal.trim();
    if (trimmed.length === 0) return;
    onUpdate([...goals, trimmed]);
    setNewGoal('');
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') {
      handleAdd();
    }
  }

  function handleRemove(index: number) {
    const removedText = goals[index];
    const updated = goals.filter((_g, idx) => idx !== index);
    onUpdate(updated);
    // If the removed goal was completed, clean it up too
    if (completedSet.has(removedText)) {
      onToggle(removedText); // parent will remove it from completedGoals
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-foreground text-sm font-semibold">Daily Goals</h3>

      {goals.length === 0 ? (
        <p className="text-muted-foreground text-xs">No goals set for today.</p>
      ) : (
        <ul className="space-y-1.5">
          {goals.map((goal, index) => {
            const isComplete = completedSet.has(goal);
            return (
              <li key={`goal-${String(index)}`} className="group flex items-center gap-2">
                <button
                  aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                    isComplete
                      ? 'border-success bg-success text-success-foreground'
                      : 'border-border hover:border-primary',
                  )}
                  onClick={() => onToggle(goal)}
                >
                  {isComplete ? <Check className="h-3 w-3" /> : null}
                </button>
                <span
                  className={cn(
                    'flex-1 text-sm',
                    isComplete ? 'text-muted-foreground line-through' : 'text-foreground',
                  )}
                >
                  {goal}
                </span>
                <button
                  aria-label="Remove goal"
                  className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleRemove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring flex-1 rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-1"
          placeholder="Add a goal..."
          type="text"
          value={newGoal}
          onChange={(event) => setNewGoal(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {newGoal.trim().length > 0 ? (
          <>
            <button
              aria-label="Add goal"
              className="text-primary hover:text-primary/80 transition-colors"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              aria-label="Cancel"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setNewGoal('')}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2.8: Update `PlannerPage.tsx` — wire completedGoals**

In `src/renderer/features/planner/components/PlannerPage.tsx`:

1. Add `handleGoalToggle` function after `handleGoalsUpdate`:

```typescript
function handleGoalToggle(goalText: string) {
  const current = plan?.completedGoals ?? [];
  const next = current.includes(goalText)
    ? current.filter((g) => g !== goalText)
    : [...current, goalText];
  updateDay.mutate({ date: selectedDate, completedGoals: next });
}
```

2. Update the `<GoalsList>` JSX call (currently around line 189):

```tsx
<GoalsList
  goals={plan?.goals ?? []}
  completedGoals={plan?.completedGoals ?? []}
  onUpdate={handleGoalsUpdate}
  onToggle={handleGoalToggle}
/>
```

- [ ] **Step 2.9: Verify**

```bash
npm run typecheck
npm run lint
npm run test:unit -- tests/unit/services/planner-schema.test.ts
```

Expected: all pass. Confirm `GoalsList` no longer has a `completed` local state.

- [ ] **Step 2.10: Commit**

```bash
git add src/shared/types/planner.ts src/shared/ipc/planner/schemas.ts src/shared/ipc/planner/contract.ts src/renderer/features/planner/components/GoalsList.tsx src/renderer/features/planner/components/PlannerPage.tsx tests/unit/services/planner-schema.test.ts
git commit -m "fix(planner): persist goal completion via completedGoals field on DailyPlan"
```

---

## Task 3: Wire pipeline plan feedback to `useReplanWithFeedback`

**Context:** `PlanReadyPanel.tsx` opens a feedback dialog when the user clicks "Request Changes." The `handleFeedbackSubmit` function receives the feedback string but then runs `void feedback;` — discarding it silently. The `useReplanWithFeedback` mutation already exists in `useAgentMutations.ts` and calls `agent.replanWithFeedback` IPC. This task wires the two together.

**Files:**
- Modify: `src/renderer/features/workflow-pipeline/components/step-panels/PlanReadyPanel.tsx`

- [ ] **Step 3.1: Import and instantiate `useReplanWithFeedback`**

In `PlanReadyPanel.tsx`, add the import alongside the existing agent imports:

```typescript
import { useReplanWithFeedback, useStartExecution } from '@features/tasks/api/useAgentMutations';
```

Then inside the component body, add after `const updateStatus = useUpdateTaskStatus();`:

```typescript
const replanWithFeedback = useReplanWithFeedback();
```

- [ ] **Step 3.2: Replace `handleFeedbackSubmit`**

Replace the current `handleFeedbackSubmit` function (lines 67–72):

```typescript
// BEFORE (broken):
function handleFeedbackSubmit(feedback: string) {
  setFeedbackDialogOpen(false);
  // Re-plan with feedback is handled by the parent or a dedicated mutation;
  // for now, we close the dialog. The parent can wire onRequestChanges if needed.
  void feedback;
}
```

With:

```typescript
function handleFeedbackSubmit(feedback: string) {
  setFeedbackDialogOpen(false);
  replanWithFeedback.mutate({
    taskId: task.id,
    projectPath: (task.metadata?.worktreePath as string | undefined) ?? '',
    taskDescription: task.description,
    feedback,
    previousPlanPath: task.metadata?.planPath as string | undefined,
  });
}
```

- [ ] **Step 3.3: Disable "Request Changes" button while mutation is pending**

Update the "Request Changes" button to show a pending state:

```tsx
<button
  className={cn(ACTION_BUTTON_BASE, 'bg-warning/10 text-warning hover:bg-warning/20')}
  disabled={replanWithFeedback.isPending}
  type="button"
  onClick={() => {
    setFeedbackDialogOpen(true);
  }}
>
  <MessageSquare className="h-3.5 w-3.5" />
  {replanWithFeedback.isPending ? 'Requesting...' : 'Request Changes'}
</button>
```

- [ ] **Step 3.4: Verify**

```bash
npm run typecheck
npm run lint
```

Expected: no errors. Confirm `void feedback;` no longer appears in the file:

```bash
grep -n "void feedback" src/renderer/features/workflow-pipeline/components/step-panels/PlanReadyPanel.tsx
```

Expected: no output.

- [ ] **Step 3.5: Commit**

```bash
git add src/renderer/features/workflow-pipeline/components/step-panels/PlanReadyPanel.tsx
git commit -m "fix(pipeline): wire plan feedback dialog to useReplanWithFeedback mutation"
```

---

## Task 4: Persist communications notification rules across restarts

**Context:** `useCommunicationsStore` stores `notificationRules` in Zustand memory only. Every app restart clears them. The fix manually persists `notificationRules` to `localStorage` key `adc:notification-rules`, using the same read/write pattern already established by `useSavedLogins` and `useAuthStore`. Only rules are persisted — `slackStatus`, `discordStatus`, and `activeTab` remain ephemeral (they're re-established from real service state on mount).

**Files:**
- Modify: `src/renderer/features/communications/store.ts`

- [ ] **Step 4.1: Rewrite `store.ts` with localStorage persistence for rules**

Replace the entire file content with:

```typescript
/**
 * Communications Store — UI state for the communications feature.
 * Notification rules are persisted to localStorage so they survive restarts.
 * Service connection status is ephemeral and re-established on mount.
 */

import { create } from 'zustand';

type ServiceStatus = 'connected' | 'disconnected' | 'error';

interface NotificationRule {
  id: string;
  service: 'slack' | 'discord';
  pattern: string;
  enabled: boolean;
}

interface CommunicationsState {
  slackStatus: ServiceStatus;
  discordStatus: ServiceStatus;
  notificationRules: NotificationRule[];
  activeTab: 'overview' | 'slack' | 'discord' | 'rules';
  setSlackStatus: (status: ServiceStatus) => void;
  setDiscordStatus: (status: ServiceStatus) => void;
  setActiveTab: (tab: CommunicationsState['activeTab']) => void;
  addNotificationRule: (rule: Omit<NotificationRule, 'id'>) => void;
  removeNotificationRule: (id: string) => void;
  toggleNotificationRule: (id: string) => void;
}

const RULES_STORAGE_KEY = 'adc:notification-rules';

function loadRules(): NotificationRule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is NotificationRule =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).service === 'string' &&
        typeof (item as Record<string, unknown>).pattern === 'string' &&
        typeof (item as Record<string, unknown>).enabled === 'boolean',
    );
  } catch {
    return [];
  }
}

function saveRules(rules: NotificationRule[]): void {
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
}

export const useCommunicationsStore = create<CommunicationsState>((set) => ({
  slackStatus: 'disconnected',
  discordStatus: 'disconnected',
  notificationRules: loadRules(),
  activeTab: 'overview',

  setSlackStatus: (status) => set({ slackStatus: status }),

  setDiscordStatus: (status) => set({ discordStatus: status }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  addNotificationRule: (rule) =>
    set((state) => {
      const next = [...state.notificationRules, { ...rule, id: crypto.randomUUID() }];
      saveRules(next);
      return { notificationRules: next };
    }),

  removeNotificationRule: (id) =>
    set((state) => {
      const next = state.notificationRules.filter((r) => r.id !== id);
      saveRules(next);
      return { notificationRules: next };
    }),

  toggleNotificationRule: (id) =>
    set((state) => {
      const next = state.notificationRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r,
      );
      saveRules(next);
      return { notificationRules: next };
    }),
}));
```

- [ ] **Step 4.2: Verify**

```bash
npm run typecheck
npm run lint
```

Expected: no errors. The public API of `useCommunicationsStore` is unchanged (same methods, same types) so no other files need updating.

- [ ] **Step 4.3: Commit**

```bash
git add src/renderer/features/communications/store.ts
git commit -m "fix(communications): persist notification rules to localStorage across restarts"
```

---

## Final verification

- [ ] **Step 5.1: Full build**

```bash
npm run build
```

Expected: exits 0, no TypeScript or bundler errors.

- [ ] **Step 5.2: Full lint**

```bash
npm run lint
```

Expected: zero violations on modified files.

- [ ] **Step 5.3: Unit tests**

```bash
npm run test:unit
```

Expected: all existing tests pass + new `planner-schema.test.ts` passes.

- [ ] **Step 5.4: Manual smoke test checklist**

After launching the app (`npm run dev`):

| Check | How to verify |
|-------|--------------|
| Badge click pre-fills email only | Login page → saved badge → click → email fills, password field stays empty |
| No password stored | DevTools → Application → localStorage → `adc:saved-logins` → entries have `email` only, no `password` key |
| Goal completion persists | Planner → add goal → check it → navigate away → return → checkbox stays checked |
| Goal uncomplete persists | Planner → uncheck a completed goal → navigate away → return → checkbox stays unchecked |
| Feedback triggers re-plan | Pipeline → task in Plan Ready state → Request Changes → type feedback → submit → task moves to Planning status |
| Notification rules survive restart | Communications → Rules tab → add a rule → restart app → rule still appears |
