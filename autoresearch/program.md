# ADC Autoresearch — Codebase Optimization Loop

You are an autonomous research agent optimizing the ADC Electron codebase. You will run **25 iterations**, each making one focused improvement, measuring the result, and keeping or reverting.

## Context Management (CRITICAL)

You are running on Opus 4.6 with a 1M token context window. To prevent degradation:

- After **every 5 iterations**, summarize your findings so far into `autoresearch/findings.md` (append, don't overwrite)
- After summarizing, run `/compact Preserve: iteration count, current metric scores, list of kept/reverted changes, and the findings.md path. Discard: file contents, build logs, and intermediate reasoning.`
- This keeps you under 300K tokens and maintains quality across all 25 iterations

## Metric: Composite Quality Score

Run this after every change:

```bash
npm run typecheck 2>&1 | grep -c "error TS" > /tmp/adc_tc.txt
npx eslint src/ --max-warnings=999999 2>&1 | tail -1 > /tmp/adc_lint.txt
npm run build 2>&1 | tail -1 > /tmp/adc_build.txt
```

**Score = (lint_errors × 10) + (lint_warnings × 2) + (typecheck_errors × 50) + (build_fail × 1000)**

Lower is better. Current baseline: **2×10 + 23×2 = 66 points**

## The Loop

### Setup (do this once)
1. Read `CLAUDE.md` and `docs/INDEX.md` for project rules and codebase map
2. Run the metric commands above to establish your baseline score
3. Create branch: `git checkout -b autoresearch/codebase-opt-$(date +%Y%m%d)`
4. Initialize `autoresearch/results.tsv` with header: `iteration\taction\tscore\tstatus\ttimestamp`
5. Log baseline: `0\tbaseline\t<score>\tkeep\t<timestamp>`

### Per Iteration (repeat 25 times)
1. **Choose ONE improvement.** Pick from this priority list:
   - Fix lint errors (highest priority — each error = 10 points)
   - Fix lint warnings (each = 2 points)
   - Reduce bundle size (refactor large files, remove dead code, tree-shake)
   - Improve type safety (replace `any`, add missing return types)
   - Remove dead/unreachable code
   - Consolidate duplicate logic
   - Fix import ordering issues

2. **Make the change.** Edit as few files as possible per iteration. One focused change.

3. **Commit:** `git add -A && git commit -m "autoresearch: <description>"`

4. **Measure:** Run the metric commands. Calculate new score.

5. **Decide:**
   - **Score improved (lower):** Log as `keep` in results.tsv. Continue.
   - **Score same:** Log as `neutral`. Keep if the change is objectively better code. Revert if unsure.
   - **Score worse (higher):** `git reset --hard HEAD~1`. Log as `revert` in results.tsv.
   - **Build/typecheck broken:** `git reset --hard HEAD~1`. Log as `crash` in results.tsv.

6. **Log to results.tsv:** `<iteration>\t<action_description>\t<score>\t<keep|revert|crash>\t<timestamp>`

7. **Every 5 iterations:** Summarize and compact (see Context Management above)

### Completion
After 25 iterations:
1. Write final summary to `autoresearch/summary.md`:
   - Starting score vs final score
   - Number of kept vs reverted changes
   - List of all improvements that stuck
   - Remaining opportunities
2. Run final verification: `npm run lint && npm run typecheck && npm run build`
3. Stop. Do not continue past 25.

## Rules

- NEVER modify `autoresearch/program.md` (this file)
- NEVER modify test files unless fixing a genuine test bug
- NEVER add new dependencies
- NEVER change the IPC contract structure (only fix lint/types within existing files)
- NEVER remove features or change user-facing behavior
- ONE change per iteration. Small, focused, measurable.
- If you're unsure whether a change is safe, revert it.
- Read `docs/patterns/CODEBASE-GUARDIAN.md` before moving/renaming files.

## What NOT to Optimize

- Don't "improve" code style that's already consistent
- Don't add comments/docs (that's not measurable by the score)
- Don't refactor working code just because you'd write it differently
- Don't touch `.claude/` files, `docs/`, or config files
