---
taskNumber: 4
taskName: claude-workflow Plugin Audit
taskSlug: claude-workflow-audit
wave: 1
complexity: high
blockedBy: none
agent: research
branch: claude-plugin-improvements/claude-workflow-audit
output: research/claude-workflow-audit.md
---

## Task: Audit ParkerM2/create-claude-workflow for Improvements + Cross-Plugin Interop

### Objective

Deep audit of the claude-workflow plugin (https://github.com/ParkerM2/create-claude-workflow) looking for improvements, and research how to make its skills/commands more plug-and-play with other plugin ecosystems (especially gstack).

### Research Scope

Use `/deep-research` with full web-search permissions. Take your time and gather the best results.

1. **Plugin source audit** — Read and analyze:
   - GitHub repo: https://github.com/ParkerM2/create-claude-workflow (fetch README, directory structure, key files)
   - Local cache: `~/.claude/plugins/cache/claude-workflow-marketplace/claude-workflow/4.0.2/`
   - Skills/commands: what does each skill do? (`/new-plan`, `/agent-team`, `/deep-research`, `/resume`, `/status`, `/track`, `/settings`, etc.)
   - Hooks: `init-gate.js`, `workflow-enforcer.js`, `tracker.js` — what do they enforce?
   - Agent definitions: what agents are defined?

2. **Improvement opportunities** — Identify:
   - Pain points from this session (init-gate hook path bug, workflow-enforcer blocking direct writes)
   - Missing features or gaps in the workflow
   - UX improvements for skill invocation
   - Better error messages and recovery paths
   - Configuration flexibility (e.g., the worktree toggle we just did)

3. **Cross-plugin interoperability** — Research:
   - How do Claude Code plugins discover and call each other's skills?
   - Can gstack skills be invoked from within claude-workflow agents? How?
   - Can claude-workflow's `/new-plan` and `/agent-team` be used as building blocks by other plugins?
   - What is the plugin API / skill API contract? How are skills registered and discovered?
   - Web search: "claude code plugin interoperability", "claude code skill composition"

4. **Plug-and-play skill design** — Research patterns for:
   - Making skills composable (skill A can invoke skill B)
   - Shared state between plugins (progress tracking, events)
   - Skill namespacing to avoid collisions
   - How gstack handles skill composition (its sprint pipeline has skills feeding into each other)

5. **Ecosystem comparison** — Compare claude-workflow against:
   - gstack's approach (sprint-oriented, process skills)
   - Other workflow plugins found in the ecosystem survey
   - What's unique about claude-workflow? What should it adopt from others?

6. **Web search topics**:
   - "claude code plugin architecture"
   - "claude code skill composition patterns"
   - "create-claude-workflow improvements"
   - "claude code multi-plugin integration"
   - "claude code plugin hooks system"

### Acceptance Criteria

- Complete skill/command inventory with descriptions
- Hook analysis with identified bugs/improvements
- Cross-plugin interop design recommendations
- Plug-and-play skill pattern proposals
- Comparison table: claude-workflow vs gstack vs others
- Prioritized improvement roadmap (quick wins vs larger changes)
- Output saved to `research/claude-workflow-audit.md`
