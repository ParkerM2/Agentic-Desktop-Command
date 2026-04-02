---
taskNumber: 2
taskName: Plugin Bug Fixes
taskSlug: plugin-bug-fixes
wave: 1
complexity: low
blockedBy: none
agent: config
branch: claude-plugin-improvements/plugin-bug-fixes
---

## Task: Fix 3 bugs in claude-workflow plugin

All files at: `~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/hooks/`

### BUG-1: init-gate.js permanently disabled (CRITICAL)

**File**: `hooks/init-gate.js`
**Problem**: Lines 130-131 have `allow(); return;` that exits unconditionally before any gating logic runs. This was added as a workaround in a previous session.
**Fix**: Remove the two lines (`allow();` and `return;`) that were added after the `// Fast-allow` comment. Also fix the original bug: line 97 checks `path.join(process.cwd(), 'agents', 'team-leader.md')` but the file is at `.claude/agents/team-leader.md`. Change `'agents'` to `'.claude', 'agents'`.

### BUG-2: config-guard.js wrong deny format (MEDIUM)

**File**: `hooks/config-guard.js`
**Problem**: Uses `{ decision: 'block', reason: ... }` instead of the standard `hookSpecificOutput` envelope.
**Fix**: Replace the deny output with:
```javascript
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: reason
  }
}));
```

### BUG-3: workflow-enforcer too narrow on ai-docs/ (MEDIUM)

**File**: `hooks/workflow-enforcer.js`
**Problem**: `isExemptPath()` function doesn't exempt `ai-docs/` directory, blocking legitimate documentation writes during feature work.
**Fix**: Add `ai-docs/` to the exempt paths list in the `isExemptPath` function.

### Acceptance Criteria
- init-gate.js properly checks `.claude/agents/team-leader.md` and the allow bypass is removed
- config-guard.js uses standard hookSpecificOutput envelope
- workflow-enforcer.js exempts `ai-docs/` paths
- All 3 fixes verified by reading the files after edit
