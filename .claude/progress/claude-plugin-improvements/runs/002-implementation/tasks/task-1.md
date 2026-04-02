---
taskNumber: 1
taskName: Global Settings Optimization
taskSlug: settings-optimization
wave: 1
complexity: low
blockedBy: none
agent: config
branch: claude-plugin-improvements/settings-optimization
---

## Task: Optimize global Claude Code settings for cost reduction

### Changes Required

1. **Switch default model to Sonnet** in `~/.claude/settings.json`:
   - Change `"model": "opus"` to `"model": "sonnet"`
   - This alone saves ~64% on routine tasks

2. **Move mcp-atlassian to on-demand loading**:
   - Create `~/.claude/mcp-configs/atlassian.json` with the current mcp-atlassian config (env vars, command, args)
   - Remove `mcp-atlassian` entry from the `mcpServers` section of `~/.claude/settings.json`
   - Document in a comment or README: `claude --mcp-config ~/.claude/mcp-configs/atlassian.json` for Jira sessions
   - Saves ~5,400-10,800 tokens per API call

3. **Install ccusage globally**:
   - Run: `npm install -g ccusage`
   - Run `ccusage daily --breakdown` to establish baseline
   - Save output to `.claude/progress/claude-plugin-improvements/runs/002-implementation/research/ccusage-baseline.txt`

### Acceptance Criteria
- settings.json has `"model": "sonnet"`
- mcp-atlassian removed from global settings, config file created at `~/.claude/mcp-configs/atlassian.json`
- ccusage installed and baseline captured
