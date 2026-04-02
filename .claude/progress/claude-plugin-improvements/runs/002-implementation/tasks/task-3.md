---
taskNumber: 3
taskName: Skill Cleanup + gstack Install
taskSlug: skill-cleanup-gstack
wave: 1
complexity: low
blockedBy: none
agent: config
branch: claude-plugin-improvements/skill-cleanup-gstack
---

## Task: Remove dead skills and install gstack

### 1. Remove unused skills

```bash
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-logo-designer
rm -rf /Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/svg-precision
```

These skills are irrelevant to ADC (desktop agent management app, not SVG generation). Saves ~21,400 tokens when they would have been active.

### 2. Install gstack globally

```bash
# Ensure Bun is installed
which bun || curl -fsSL https://bun.sh/install | bash

# Clone gstack to global skills directory
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
```

### 3. Add gstack routing rules to ADC CLAUDE.md

Add this minimal block (do NOT add the full gstack CLAUDE.md content — keep it lean):

```markdown
## gstack Skills (global)

Invoke explicitly only — no proactive routing.
- /gstack-review — pre-merge code review (staff engineer)
- /gstack-investigate — systematic root-cause debugging
- /gstack-learn — cross-session memory
- /gstack-cso — OWASP + STRIDE security audit
- /gstack-retro — weekly retro with metrics
```

### Acceptance Criteria
- SVG skills removed (directories no longer exist)
- gstack cloned to `~/.claude/skills/gstack/`
- CLAUDE.md has minimal gstack routing block (< 10 lines)
