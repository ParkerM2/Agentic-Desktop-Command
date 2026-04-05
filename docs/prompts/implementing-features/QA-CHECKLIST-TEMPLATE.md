# QA Verification Checklist — Template

> Copy this template into every task assignment. The coding agent fills in the specifics. The QA Review agent validates every item.

---

## Task Info

```
Task ID: #___
Task Name: ___
Agent: ___
Worktree Branch: ___
Files Created: ___
Files Modified: ___
```

---

## Automated Checks — MANDATORY TEST GATE (QA Agent runs ALL of these)

> **⚠️ ALL SIX CHECKS MUST PASS. This is not optional. Skipping = automatic FAIL.**

- [ ] `npm run lint` — zero violations
- [ ] `npm run typecheck` — zero errors (equivalent to `npx tsc --noEmit`)
- [ ] `npm run test` — **ALL tests pass (unit + integration) — NO SKIPPING**
- [ ] `npm run build` — builds successfully
- [ ] `npm run test:e2e` — E2E tests pass (playwright + electron — requires build)
- [ ] `npm run check:docs` — documentation updated for source changes

### Test Verification Protocol

```bash
# Run this exact command sequence. All must pass.
npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e && npm run check:docs
```

**If ANY command fails:**
1. Stop immediately
2. Document the failure
3. Return to coding agent with exact error output
4. DO NOT proceed to code review phase

**"Tests don't exist for this area" is NOT an excuse to skip `npm run test`.**
The existing test suite must still pass to verify no regressions.

---

## Code Quality Checks

### TypeScript Strictness
- [ ] No `any` types — all typed or `unknown` + narrowing
- [ ] No non-null assertions (`!`) — uses `?? fallback`
- [ ] No unsafe type assertions without eslint-disable + justification comment
- [ ] `import type` used for all type-only imports
- [ ] No unused variables/imports (intentional unused prefixed with `_`)
- [ ] Strict boolean expressions (no number-as-boolean, explicit `> 0`)

### React Patterns (if UI changes)
- [ ] Named function declarations for components (not arrow)
- [ ] Props interface defined above component
- [ ] Component body order: hooks → derived state → handlers → render
- [ ] Conditional rendering uses ternary (not `&&`)
- [ ] No nested ternary (extracted to helper function)
- [ ] Self-closing tags for empty elements
- [ ] JSX props sorted: key/ref → shorthand → alphabetical → callbacks → multiline
- [ ] No array index as key
- [ ] Floating promises use `void` operator

### Accessibility (if UI changes)
- [ ] Interactive elements have keyboard handlers (`onKeyDown`)
- [ ] Interactive non-button elements have `role` + `tabIndex={0}`
- [ ] Icon-only buttons have `aria-label`
- [ ] Form inputs have associated `<label>` or `aria-label`
- [ ] No `<div onClick>` where `<button>` is appropriate

### Design System (if UI changes)
- [ ] No hardcoded hex/rgb/rgba in utilities or components
- [ ] Transparency uses `color-mix(in srgb, var(--token) XX%, transparent)`
- [ ] Theme-aware Tailwind classes (`bg-card` not `bg-gray-900`)
- [ ] No `.dark` variant selectors (CSS variables handle it)
- [ ] No inline `style={{}}` for colors

### Architecture
- [ ] Files in correct directories per CLAUDE.md structure
- [ ] Feature module has complete structure (index.ts, api/, components/, hooks/)
- [ ] Barrel exports (`index.ts`) updated for new public APIs
- [ ] No cross-feature internal imports (only through barrel)
- [ ] Import direction: never renderer→main
- [ ] No circular dependencies

### IPC Contract (if IPC changes)
- [ ] New channels defined in `ipc-contract.ts` with Zod schemas
- [ ] Zod schemas match TypeScript interfaces
- [ ] Handler wraps service call in `Promise.resolve()` (sync services)
- [ ] Event channels follow `event:domain.eventName` pattern
- [ ] Handler registered in `src/main/ipc/index.ts`

### State Management (if state changes)
- [ ] Server data uses React Query (not Zustand)
- [ ] UI-only state uses Zustand (not React Query)
- [ ] Query keys follow hierarchical factory pattern
- [ ] Event hooks invalidate correct query keys
- [ ] Mutations invalidate related queries on success

### Error Handling
- [ ] Services handle "not configured" gracefully (return null/error, don't throw)
- [ ] External API calls have try-catch with descriptive error messages
- [ ] UI shows error states when queries fail
- [ ] UI shows loading states while data fetches
- [ ] UI shows empty states when no data

### Performance
- [ ] No unnecessary re-renders (callbacks memoized with useCallback where needed)
- [ ] No unbounded arrays or lists without pagination/virtualization
- [ ] No expensive computations without useMemo
- [ ] No synchronous file I/O in hot paths

### DRYness
- [ ] No duplicated logic (3+ similar lines → extract helper)
- [ ] No duplicated strings (4+ occurrences → extract constant)
- [ ] No duplicated components (similar UI → extract shared component)

---

## Feature-Specific Checks

> The Team Lead fills in checks specific to this task. Examples below.

### Example: New Dashboard Widget
- [ ] Widget renders with real data from IPC service
- [ ] Widget shows empty state when service returns no data
- [ ] Widget shows loading spinner during data fetch
- [ ] Widget matches design system (card with border, correct spacing)
- [ ] Widget is responsive (doesn't overflow on small viewport)

### Example: New IPC Channel
- [ ] Channel accepts expected input types
- [ ] Channel returns expected output types
- [ ] Channel handles invalid input (Zod validation rejects)
- [ ] Channel handler calls real service method (not stub)
- [ ] Renderer hook calls channel correctly
- [ ] Event hook invalidates cache on related events

### Example: New Service
- [ ] Service is instantiated in `src/main/index.ts`
- [ ] Service dependencies are injected (not imported directly)
- [ ] Service methods return sync values (wrapped in handler)
- [ ] Service emits events after mutations
- [ ] Service persists data to disk (if stateful)
- [ ] Service handles missing data gracefully (first run scenario)

---

## Electron App Testing (QA Agent runs these)

- [ ] App starts without errors (`npm run dev`)
- [ ] Screenshot captured of relevant page
- [ ] Page structure verified (expected elements exist)
- [ ] Feature UI is accessible (visible, clickable)
- [ ] Feature actions work (buttons respond, forms submit)
- [ ] No console errors in Electron dev tools
- [ ] Navigation between pages works (sidebar clicks)
- [ ] App doesn't crash during testing

---

## Verdict

```
QA RESULT: PASS / FAIL
Issues Found: ___
Round: ___ of 3
Reviewer: ___
Timestamp: ___
```
