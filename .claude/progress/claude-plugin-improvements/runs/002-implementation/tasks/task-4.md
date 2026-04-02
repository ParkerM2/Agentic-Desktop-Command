---
taskNumber: 4
taskName: CLAUDE.md Extraction + Condensation
taskSlug: claudemd-condensation
wave: 2
complexity: high
blockedBy: task-3
agent: config
branch: claude-plugin-improvements/claudemd-condensation
---

## Task: Condense CLAUDE.md from 566 lines to ~160 lines

The current CLAUDE.md is 566 lines (~5K tokens), loaded into every conversation turn. The recommendation is under 200 lines. Extract verbose sections to `ai-docs/` files and replace with 2-3 line pointers.

### Extraction Plan

Read `/Users/parker/Desktop/Agentic-Desktop-Command/CLAUDE.md` first. Then:

1. **V2 Refactor section** (~140 lines) → Move to `ai-docs/V2-REFACTOR.md`. Replace with:
   ```markdown
   > V2 Refactor active (P0). See ai-docs/V2-REFACTOR.md. DO NOT build on terminal-service/xterm.js/node-pty.
   > Key slug: agent-dashboard-view. Branch: feature/agent-dashboard-view.
   ```

2. **ESLint Rules section** (~30 lines) → Already documented in `ai-docs/LINTING.md`. Replace with:
   ```markdown
   > Strict ESLint. Zero violations. See ai-docs/LINTING.md for full rules. Key: no `any`, no `!`, strict booleans, `import type`, `void` for floating promises.
   ```

3. **Import Order section** (~20 lines) → Already in `ai-docs/PATTERNS.md`. Replace with:
   ```markdown
   > Import order enforced. See ai-docs/PATTERNS.md. Groups: node builtins → externals → @shared → @features → relative. Blank line between groups.
   ```

4. **Design System section** (~50 lines) → Move to `ai-docs/DESIGN-SYSTEM.md`. Replace with:
   ```markdown
   > CSS custom properties + Tailwind v4 @theme + color-mix(). NEVER hardcode hex/rgba. See ai-docs/DESIGN-SYSTEM.md.
   ```

5. **React Component Pattern** (~15 lines) → Already in `ai-docs/PATTERNS.md`. Replace with pointer.

6. **Documentation Update Mapping** (~40 lines) → Move to `ai-docs/DOC-UPDATE-MAP.md`. Replace with:
   ```markdown
   > EVERY code change needs doc updates. Run `npm run check:docs`. See ai-docs/DOC-UPDATE-MAP.md for mapping.
   ```

7. **Plan Tracking Protocol** (~50 lines) → Move to `ai-docs/PLAN-TRACKING.md`. Replace with:
   ```markdown
   > Plans tracked in docs/tracker.json. Slug = folder = key = branch. See ai-docs/PLAN-TRACKING.md.
   ```

8. **Worktree Bootstrapping** (~80 lines) → Move to `ai-docs/WORKTREE-BOOTSTRAP.md`. Replace with:
   ```markdown
   > Worktree agents get generated CLAUDE.md via scripts/generate-worktree-claude.mjs. See ai-docs/WORKTREE-BOOTSTRAP.md.
   ```

### Rules
- NEVER delete content — always MOVE to a new ai-docs/ file
- Keep Quick Reference (commands), Architecture Overview, Path Aliases, State Management, Tech Stack — these are compact and essential
- Keep Verification Requirements section — it's the enforcement mechanism
- Target: 150-180 lines total
- Each new ai-docs/ file must have a clear header explaining its contents

### Acceptance Criteria
- CLAUDE.md is under 200 lines
- All extracted content lives in ai-docs/ files (nothing lost)
- `npm run check:docs` still passes
- Pointers in CLAUDE.md correctly reference the new files
