---
taskNumber: 3
taskName: Token Optimization Audit
taskSlug: token-optimization-research
wave: 1
complexity: medium
blockedBy: none
agent: research
branch: claude-plugin-improvements/token-optimization-research
output: research/token-optimization.md
---

## Task: Token Burn Rate Optimization Research

### Objective

Audit current token usage patterns and research optimization strategies for Claude Code + claude-workflow multi-agent workflows.

### Research Scope

Use `/deep-research` with full web-search permissions. Take your time and gather the best results.

1. **CLAUDE.md audit** — Read `/Users/parker/Desktop/Agentic-Desktop-Command/CLAUDE.md`. How many lines? The recommendation is under 200 lines. What sections could be extracted to on-demand skills? What's essential vs bloat?

2. **MCP overhead audit** — Check what MCP servers are configured:
   - Read `/Users/parker/.claude/settings.json` for global MCPs
   - Read project-level settings for local MCPs
   - For each MCP: how many tools does it register? Each tool adds system prompt overhead
   - Which MCPs are unused and should be disabled?

3. **Sonnet/Opus routing** — Research:
   - How to enforce 80%+ Sonnet / <20% Opus split
   - What tasks should use Opus vs Sonnet?
   - How does `/effort` work? What settings are available?
   - `MAX_THINKING_TOKENS` environment variable — how to use it

4. **Agent workflow token patterns** — Research:
   - How much does each subagent cost in tokens? (independent context windows)
   - Worktrees vs branches — token impact difference?
   - How to structure "thin" agent prompts (minimal context, load on demand)
   - Best practices for generate-worktree-claude.mjs type bootstrap scripts
   - When to use subagents vs single-session sequential work

5. **Monitoring setup** — Research and recommend:
   - ccusage setup and configuration
   - Built-in /cost, /context output format
   - How to track burn rate over time (daily, weekly, per-feature)
   - Dashboard or reporting options

6. **Auto-compaction behavior** — Research:
   - When does compaction trigger? (~83.5% of context)
   - What is the buffer size after compaction?
   - How does 1M context window affect compaction frequency?
   - How to use `/compact [instructions]` effectively

7. **Web search topics**:
   - "claude code token optimization 2026"
   - "reduce claude api costs multi-agent"
   - "claude code context window management best practices"
   - "claude code /effort settings guide"
   - "claude code auto compaction behavior"

### Acceptance Criteria

- CLAUDE.md line count + specific extraction recommendations
- MCP overhead inventory with keep/disable recommendations
- Sonnet/Opus routing strategy with specific settings
- Agent workflow cost model (estimated tokens per pattern)
- Monitoring setup instructions (step by step)
- Actionable checklist ranked by estimated savings (high/medium/low)
- Output saved to `research/token-optimization.md`
