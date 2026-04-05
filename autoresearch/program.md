# ADC Autoresearch — Codebase Optimization Loop

You are an autonomous research agent optimizing the ADC Electron codebase. You will run **25 iterations**, each making one focused improvement, measuring the result, and keeping or reverting.

## Context Management (CRITICAL)

You are running on Opus 4.6 with a 1M token context window. To prevent degradation:

- After **every 5 iterations**, summarize your findings so far into `autoresearch/findings.md` (append, don't overwrite)
- After summarizing, run `/compact Preserve: iteration count, current metric scores, list of kept/reverted changes, and the findings.md path. Discard: file contents, build logs, and intermediate reasoning.`
- This keeps you under 300K tokens and maintains quality across all 25 iterations

## Metric: Composite Quality Score

Run `bash autoresearch/measure.sh` after every change. It outputs a single score. Lower is better.

The score combines:
- Lint errors (×10) + warnings (×2)
- TypeScript errors (×50)
- Build failure (×1000)
- Total source lines across all `src/` files (×0.01) — rewards removing dead code and DRYing
- Number of files over 300 lines (×5) — rewards splitting large files
- Duplicate function count (×3) — rewards helper extraction

## The Loop

### Setup (do this once)
1. Read `CLAUDE.md` and `docs/INDEX.md` for project rules and codebase map
2. Read `docs/patterns/CODEBASE-GUARDIAN.md` for file placement rules
3. Run `bash autoresearch/measure.sh` to establish baseline score
4. Create branch: `git checkout -b autoresearch/codebase-opt-$(date +%Y%m%d-%H%M%S)`
5. Initialize `autoresearch/results.tsv` with header: `iteration\taction\tscore\tdelta\tstatus\ttimestamp`
6. Log baseline: `0\tbaseline\t<score>\t0\tkeep\t<timestamp>`

### Per Iteration (repeat 25 times)

**Phase 1 (iterations 1-2): Fix lint errors and warnings**
Get these to zero fast. Each lint fix is a quick win.

**Phase 2 (iterations 3-10): DRY code and extract helpers**
This is the highest-value work:
- Find duplicated logic across files (similar functions, repeated patterns)
- Extract shared helpers into appropriate utility files
- Consolidate repeated type definitions
- Merge near-identical components into parameterized versions
- Move inline logic to named functions for readability

**Phase 3 (iterations 11-18): File structure and large file splits**
- Split files over 300 lines into focused modules
- Move misplaced files to correct directories per CODEBASE-GUARDIAN rules
- Flatten unnecessary nesting
- Ensure barrel exports (index.ts) are clean

**Phase 4 (iterations 19-25): Dead code removal and cleanup**
- Remove unused exports, functions, types, and imports
- Remove unreachable code paths
- Clean up stale TODO comments that reference completed work
- Remove empty/trivial wrapper functions that add no value

### Per-Iteration Steps
1. **Choose ONE improvement** from the current phase
2. **Make the change.** Edit as few files as possible. One focused change.
3. **Commit:** `git add -A && git commit -m "autoresearch(N): <description>"`
4. **Measure:** Run `bash autoresearch/measure.sh`. Record new score.
5. **Decide:**
   - **Score improved (lower):** Log as `keep`. Continue.
   - **Score same:** Keep if objectively better code (DRYer, clearer). Revert if unsure.
   - **Score worse:** `git reset --hard HEAD~1`. Log as `revert`.
   - **Build/typecheck broken:** `git reset --hard HEAD~1`. Log as `crash`.
6. **Log:** `<N>\t<description>\t<score>\t<delta>\t<keep|revert|neutral|crash>\t<timestamp>`
7. **Every 5 iterations:** Summarize and compact (see Context Management)

### Completion
After 25 iterations:
1. Write `autoresearch/summary.md`: starting vs final score, kept/reverted counts, all improvements, remaining opportunities
2. Run final: `npm run lint && npm run typecheck && npm run build`
3. Stop.

## Rules

- NEVER modify `autoresearch/program.md` or `autoresearch/measure.sh`
- NEVER modify test files unless fixing a genuine test bug
- NEVER add new dependencies
- NEVER remove features or change user-facing behavior
- NEVER change IPC channel names or API shapes
- ONE change per iteration. Small, focused, measurable.
- When extracting helpers, put them in the most logical existing file first. Only create new files if no good home exists.
- When splitting large files, keep the original filename for the primary export and create new files for extracted pieces.
- If you're unsure whether a change is safe, revert it.
