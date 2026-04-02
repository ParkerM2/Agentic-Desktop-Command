---
taskNumber: 2
taskName: Plugin Ecosystem Survey
taskSlug: plugin-ecosystem-research
wave: 1
complexity: medium
blockedBy: none
agent: research
branch: claude-plugin-improvements/plugin-ecosystem-research
output: research/plugin-ecosystem.md
---

## Task: Survey Best Claude Code Plugins, Skills, and Tools

### Objective

Comprehensive survey of the Claude Code plugin/skill ecosystem. Focus on productivity tools — explicitly NOT heavy MCPs (user concern: large context window usage from MCP tool listings).

### Research Scope

Use `/deep-research` with full web-search permissions. Take your time and gather the best results.

1. **Community registries** — Search and catalog:
   - https://github.com/rohitg00/awesome-claude-code-toolkit (135 agents, 35 skills, 150+ plugins)
   - https://github.com/hesreallyhim/awesome-claude-code
   - https://github.com/travisvn/awesome-claude-skills (144+ skills)
   - claudemarketplaces.com (150+ rated skills)
   - Any other registries found via web search

2. **Top skills by category** — For each category, find the best 2-3 options:
   - Code quality / review
   - Testing / QA
   - Deployment / shipping
   - Documentation
   - Project management / planning
   - Token optimization / monitoring
   - Security / safety
   - Design / UI

3. **Token monitoring tools** — Deep evaluation of:
   - Built-in: `/cost`, `/context`, `/stats` — what exactly do they show?
   - `ccusage` (npx ccusage) — features, output format, accuracy
   - Claude-Code-Usage-Monitor — real-time charts
   - `tokscale` — multi-platform tracking
   - Any others found via search

4. **Skills vs MCPs** — Compare:
   - Token cost: skills load on-demand vs MCPs add per-tool listing to every message
   - How much context does each MCP server add? Can we measure this?
   - Best practices for minimizing MCP footprint while keeping useful tools

5. **Current ADC skills audit** — Read `/Users/parker/Desktop/Agentic-Desktop-Command/.claude/skills/` directory. Which are actively useful? Which are dead weight?

### Web Search Queries to Run
- "best claude code plugins 2026"
- "claude code skills marketplace"
- "awesome claude code plugins skills"
- "claude code token tracking tools"
- "claude code mcp vs skills context usage"
- "reduce claude code context window usage plugins"

### Acceptance Criteria

- Tiered recommendation list: must-have / nice-to-have / skip
- Token cost estimates where possible
- Install commands/URLs for each recommendation
- Skills vs MCPs comparison with data
- Current ADC skills audit with keep/remove recommendations
- Output saved to `research/plugin-ecosystem.md`
