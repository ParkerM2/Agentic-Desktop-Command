# ADC Autoresearch — Agent Navigation Optimization

You are an autonomous research agent optimizing the ADC Electron codebase for **agent navigability**. Every improvement you make reduces the tokens future AI agents need to find and modify code, directly increasing their accuracy. You will run **25 iterations**, each making one focused improvement, measuring the result, and keeping or reverting.

**Why this matters:** When a team of AI agents implements a feature, they search for files, read them, and make changes. A 600-line file with 20 functions forces an agent to read all 600 lines to find the one function it needs — wasting context and increasing the chance it edits the wrong spot. Splitting that into three 200-line files means the agent finds the right file in 1 search and reads only what it needs.

## Context Management (CRITICAL)

You are running on Opus 4.6 with a 1M token context window. To prevent degradation:

- After **every 5 iterations**, summarize your findings so far into `autoresearch/findings.md` (append, don't overwrite)
- After summarizing, run `/compact Preserve: iteration count, current metric scores, list of kept/reverted changes, and the findings.md path. Discard: file contents, build logs, and intermediate reasoning.`
- This keeps you under 300K tokens and maintains quality across all 25 iterations

## Metric: Agent Navigation Score

Run `bash autoresearch/measure.sh` after every change. It outputs a single score. **Lower is better.**

The score measures how hard it is for an AI agent to navigate this codebase:
- **Files over 400 lines (×15):** Agent MUST read the whole file. Huge context tax. Currently: 14 files.
- **Files 200-400 lines (×5):** Significant reading burden. Currently: 115 files.
- **Dense files with 8+ functions (×8):** Agent searches through irrelevant functions. Currently: 53 files.
- **Duplicate export names (×4):** Agent finds 2+ files exporting same name, picks wrong one. Currently: 101.
- **Total source lines (/100):** Raw bloat proxy. Currently: 95,531 lines.
- **Lint/typecheck/build (gate):** Must stay at zero. Breaking these = revert.

**Baseline: 2568 points.** Target: reduce by 30%+ (under 1800).

## The Loop

### Setup (do this once)
1. Read `CLAUDE.md` and `docs/INDEX.md` for project rules and codebase map
2. Read `docs/patterns/CODEBASE-GUARDIAN.md` for file placement rules
3. Run `bash autoresearch/measure.sh` to establish baseline score
4. Create branch: `git checkout -b autoresearch/codebase-opt-$(date +%Y%m%d-%H%M%S)`
5. Initialize `autoresearch/results.tsv` with header: `iteration\taction\tscore\tdelta\tstatus\ttimestamp`
6. Log baseline: `0\tbaseline\t<score>\t0\tkeep\t<timestamp>`

### Per Iteration (repeat 25 times)

**Phase 1 (iterations 1-2): Fix any lint errors/warnings**
Get gate metrics to zero. Quick wins only.

**Phase 2 (iterations 3-12): Split fat files and reduce density**
This is the highest-impact work for agent accuracy. Priority targets:
- `src/main/mcp/mcp-client.ts` (766 lines) — split by responsibility
- `src/renderer/shared/components/ui/sidebar.tsx` (685 lines, 30 funcs) — extract sub-components
- `src/main/bootstrap/service-registry.ts` (663 lines) — split by service group
- `src/main/services/project/doc-generator.ts` (527 lines, 19 funcs) — extract generators
- `src/main/services/agent-manager/agent-manager-service.ts` (522 lines) — split lifecycle vs operations
- `src/renderer/features/tasks/components/grid/TaskDataGrid.tsx` (521 lines) — extract renderers
- Any file with 8+ exported functions: break into focused modules

When splitting, keep the original filename for the primary responsibility and create new files for extracted pieces. Update barrel exports.

**Phase 3 (iterations 13-20): Deduplicate exports and extract helpers**
- Consolidate the 101 duplicate export names into single authoritative locations
- Extract repeated patterns into shared utility functions
- Merge near-identical Zod schemas (3 copies of QaVerificationSuiteSchema, etc.)
- Consolidate hook duplicates (useTask, useAgentEvents, etc.)

**Phase 4 (iterations 21-25): Dead code removal**
- Remove unused exports, functions, types
- Remove unreachable code paths
- Delete empty/trivial wrappers that add no value
- Each line removed is a line no agent will ever need to read

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
