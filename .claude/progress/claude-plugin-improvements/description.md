# claude-plugin-improvements — Original Prompt

**Date**: 2026-03-31
**Requested by**: Parker

---

## Summary

Research sprint covering four areas of Claude Code workflow improvement:

1. **gstack plugin** (https://github.com/garrytan/gstack) — Use cases, implementation patterns, integration into ADC workflow. Catalog all 31 skills and map sprint workflow to existing pipeline.

2. **Plugin ecosystem survey** — Best Claude Code plugins, skills, and tools. Explicitly NOT heavy MCPs (context window cost concern). Token monitoring tools evaluation. Community registries and awesome-lists.

3. **Token burn rate optimization** — Track and reduce token usage. Audit CLAUDE.md size, MCP overhead, Sonnet/Opus routing, /effort usage, agent prompt weight. Monitoring setup with ccusage or built-in tools.

4. **claude-workflow plugin audit** (https://github.com/ParkerM2/create-claude-workflow) — Review own plugin for improvements. Cross-plugin interoperability with gstack and other ecosystems. Make skills/commands more plug-and-play.

## Constraints

- No worktrees — single-user project, agents use branches
- Follow gpMS_ConsoleFrontend progress-directory-spec for tracking
- Each agent uses `/deep-research` with full web-search permissions
- Reference repos: `/Users/parker/Desktop/ES3/gpMS_ConsoleFrontend/` (gstack installed here), `/Users/parker/Desktop/gpMS_ConsoleFrontend/` (progress spec)
- Team leader checks inbox every ~3 min, scores results 90%+ before accepting

## Deliverables

- `research/gstack-analysis.md`
- `research/plugin-ecosystem.md`
- `research/token-optimization.md`
- `research/claude-workflow-audit.md`
- `research/final-recommendations.md` (synthesis of all four)
