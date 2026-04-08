#!/usr/bin/env bash
# scripts/worktree-setup.sh — Universal worktree environment setup
#
# Called by:
#   - WorktreeCreate hook (Claude Code native worktrees)
#   - WorktreeProvisioner (ADC IPC-based worktrees)
#
# Arguments:
#   $1 — worktree path (absolute)
#   $2 — main repo path (absolute, defaults to this script's repo root)
#
# What it does:
#   1. Copies gitignored .claude/ config files from main repo
#   2. Copies .env files if they exist
#   3. Runs npm ci for dependency installation
#
# Idempotent — safe to run multiple times.

set -euo pipefail

WORKTREE_PATH="${1:?Usage: worktree-setup.sh <worktree-path> [main-repo-path]}"
MAIN_REPO="${2:-$(cd "$(dirname "$0")/.." && pwd)}"

echo "[worktree-setup] Setting up: $WORKTREE_PATH"
echo "[worktree-setup] Source repo: $MAIN_REPO"

# ── Step 1: Copy gitignored .claude/ config files ───────────
CLAUDE_SRC="$MAIN_REPO/.claude"
CLAUDE_DST="$WORKTREE_PATH/.claude"

mkdir -p "$CLAUDE_DST"

# settings.json — plugin config, hooks, enabled skills
if [ -f "$CLAUDE_SRC/settings.json" ]; then
  cp "$CLAUDE_SRC/settings.json" "$CLAUDE_DST/settings.json"
  echo "[worktree-setup] Copied .claude/settings.json"
fi

# settings.local.json — only copy if worktree doesn't already have one
# (WorktreeProvisioner generates role-specific settings.local.json for team-leads)
if [ -f "$CLAUDE_SRC/settings.local.json" ] && [ ! -f "$CLAUDE_DST/settings.local.json" ]; then
  cp "$CLAUDE_SRC/settings.local.json" "$CLAUDE_DST/settings.local.json"
  echo "[worktree-setup] Copied .claude/settings.local.json"
fi

# ── Step 2: Copy .env files ─────────────────────────────────
for envfile in .env .env.local; do
  if [ -f "$MAIN_REPO/$envfile" ] && [ ! -f "$WORKTREE_PATH/$envfile" ]; then
    cp "$MAIN_REPO/$envfile" "$WORKTREE_PATH/$envfile"
    echo "[worktree-setup] Copied $envfile"
  fi
done

# ── Step 3: Install dependencies ────────────────────────────
if [ -f "$WORKTREE_PATH/package-lock.json" ]; then
  echo "[worktree-setup] Installing dependencies (npm ci)..."
  cd "$WORKTREE_PATH"
  npm ci --ignore-scripts --no-audit --no-fund 2>&1 | tail -3
  echo "[worktree-setup] Dependencies installed"
else
  echo "[worktree-setup] No package-lock.json found, skipping npm ci"
fi

echo "[worktree-setup] Done"
