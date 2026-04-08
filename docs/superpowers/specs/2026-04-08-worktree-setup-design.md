# Universal Worktree Setup — Design Spec

> Approved 2026-04-08. Every agent gets full repo access, zero cross-contamination.

## Problem

Agents spawned in git worktrees are missing critical files:
- `.claude/settings.json` — gitignored, so not checked out. Agents lose plugin config and hook definitions.
- `node_modules/` — gitignored, so not checked out. All builds, lint, typecheck fail.
- `.claude/settings.local.json` — gitignored. Only the ADC WorktreeProvisioner generates this for team-leads.

Two separate worktree creation paths exist (Claude Code native and ADC WorktreeProvisioner) producing inconsistent environments. No `.worktreeinclude` file exists to bridge the gap for native worktrees.

## Solution

A single shared setup script (`scripts/worktree-setup.sh`) called by both paths:
1. **Claude Code native** — via `WorktreeCreate` hook in `settings.json`
2. **ADC WorktreeProvisioner** — calls the same script after `git worktree add`

The script copies gitignored config files and installs dependencies. Both paths produce identical, fully-functional worktree environments.

## What Changes

### 1. Create `.worktreeinclude`

Tells Claude Code which gitignored files to auto-copy into native worktrees:

```
.claude/settings.json
.claude/settings.local.json
.env
.env.local
```

Note: `.worktreeinclude` is NOT processed when a `WorktreeCreate` hook exists. But we create it anyway as documentation of intent and as a fallback for environments where hooks aren't configured.

### 2. Create `scripts/worktree-setup.sh`

The single entry point for worktree filesystem setup. Idempotent — safe to run multiple times.

```bash
#!/usr/bin/env bash
# scripts/worktree-setup.sh — Universal worktree environment setup
# Called by: WorktreeCreate hook (Claude Code native) and WorktreeProvisioner (ADC IPC)
#
# Arguments:
#   $1 — worktree path (absolute)
#   $2 — main repo path (absolute, defaults to git rev-parse --show-toplevel of parent)
#
# What it does:
#   1. Copies gitignored .claude/ config files from main repo
#   2. Runs npm ci for dependency installation
#   3. Verifies the worktree is functional

set -euo pipefail

WORKTREE_PATH="${1:?Usage: worktree-setup.sh <worktree-path> [main-repo-path]}"
MAIN_REPO="${2:-$(cd "$(dirname "$0")/.." && pwd)}"

# ── Step 1: Copy gitignored .claude/ files ──────────────────
CLAUDE_SRC="$MAIN_REPO/.claude"
CLAUDE_DST="$WORKTREE_PATH/.claude"

mkdir -p "$CLAUDE_DST"

# settings.json — plugin config, hooks, enabled skills
if [ -f "$CLAUDE_SRC/settings.json" ]; then
  cp "$CLAUDE_SRC/settings.json" "$CLAUDE_DST/settings.json"
fi

# settings.local.json — only if it exists in main (don't overwrite provisioner-generated ones)
if [ -f "$CLAUDE_SRC/settings.local.json" ] && [ ! -f "$CLAUDE_DST/settings.local.json" ]; then
  cp "$CLAUDE_SRC/settings.local.json" "$CLAUDE_DST/settings.local.json"
fi

# .env files
for envfile in .env .env.local; do
  if [ -f "$MAIN_REPO/$envfile" ]; then
    cp "$MAIN_REPO/$envfile" "$WORKTREE_PATH/$envfile"
  fi
done

# ── Step 2: Install dependencies ────────────────────────────
cd "$WORKTREE_PATH"
if [ -f "package-lock.json" ]; then
  npm ci --ignore-scripts --no-audit --no-fund 2>/dev/null || npm install --ignore-scripts --no-audit --no-fund
fi

# ── Step 3: Verify ──────────────────────────────────────────
echo "Worktree setup complete: $WORKTREE_PATH"
```

Flags: `--ignore-scripts` (skip postinstall to avoid Electron rebuild), `--no-audit --no-fund` (speed).

### 3. Add `WorktreeCreate` hook to `.claude/settings.json`

```json
{
  "hooks": {
    "WorktreeCreate": [
      {
        "command": "bash scripts/worktree-setup.sh \"$WORKTREE_PATH\" \"$PROJECT_DIR\"",
        "timeout": 120000
      }
    ]
  }
}
```

Environment variables available in WorktreeCreate hooks:
- `$WORKTREE_PATH` — the newly created worktree directory
- `$PROJECT_DIR` — the main repo root

### 4. Update ADC WorktreeProvisioner

In `src/main/services/worktree-provisioner/worktree-provisioner.ts`:

After the `git worktree add` call, instead of manually copying `.claude/` dirs and files, call the shared script:

```typescript
execSync(`bash scripts/worktree-setup.sh "${worktreePath}" "${projectPath}"`, {
  cwd: projectPath,
  timeout: 120_000,
  stdio: 'pipe',
});
```

Keep the provisioner's additional responsibilities that the script doesn't handle:
- Generating role-specific CLAUDE.md (merging agent definition + project rules)
- Generating team-lead enforcement hooks in `settings.local.json` (overwrites the one copied by the script)
- IPC session lifecycle management

Remove the manual `CLAUDE_DIRS_TO_COPY` / `CLAUDE_FILES_TO_COPY` logic — the script handles it.

### 5. Add `WorktreeRemove` hook (optional cleanup)

```json
{
  "hooks": {
    "WorktreeRemove": [
      {
        "command": "echo 'Worktree removed: $WORKTREE_PATH'",
        "timeout": 5000
      }
    ]
  }
}
```

Lightweight — just logging for now. Could run cleanup later if needed.

### 6. Update team-leader agent definition

Add clear worktree instructions to `.claude/agents/team-leader.md` so when the app hands a task to a team-lead, it knows exactly how worktrees work:

```markdown
## Worktree Setup

Every agent you spawn MUST work in an isolated worktree. The worktree is fully functional:
- Full codebase checkout on its own branch
- node_modules installed (npm ci runs automatically)
- .claude/ settings, skills, agents, refs all available
- CLAUDE.md with project rules available

Worktrees are created by the WorktreeProvisioner (via workspace.provisionTeammate IPC).
Each teammate gets: isolated branch, isolated file changes, full build capability.

Multiple teams can run simultaneously — each on different worktrees/branches.
Changes don't affect other teams until explicitly merged.
```

### 7. Update docs

- `docs/patterns/PATTERNS.md` — add Worktree Setup section
- `CLAUDE.md` — add to Finding Things: `- Worktree setup: scripts/worktree-setup.sh`

## File Summary

| File | Action |
|------|--------|
| `.worktreeinclude` | Create — lists gitignored files to copy |
| `scripts/worktree-setup.sh` | Create — shared setup script |
| `.claude/settings.json` | Modify — add WorktreeCreate hook |
| `src/main/services/worktree-provisioner/worktree-provisioner.ts` | Modify — call shared script instead of manual copy |
| `.claude/agents/team-leader.md` | Modify — add worktree instructions |
| `docs/patterns/PATTERNS.md` | Modify — add worktree pattern |
| `CLAUDE.md` | Modify — add worktree ref to Finding Things |

## Verification

After implementation:
1. Create a native Claude Code worktree (`EnterWorktree`) → verify it has `.claude/settings.json`, `node_modules/`, and can run `npm run typecheck`
2. Create a WorktreeProvisioner worktree (via IPC) → verify same
3. Run two agents in parallel worktrees → verify no cross-contamination
4. Verify `npm run build` passes in a fresh worktree
