# Worktree Agent Bootstrapping

When agents spawn in worktrees during `/agent-team`, each gets a **custom-generated CLAUDE.md** in its worktree root. This is the primary context injection mechanism — Claude auto-loads CLAUDE.md from the working directory at session start.

## Script

`scripts/generate-worktree-claude.mjs`

```bash
node scripts/generate-worktree-claude.mjs \
  --agent-role component-engineer \
  --task-file .claude/progress/agent-dashboard-view/tasks/task-3.md \
  --worktree-path .worktrees/agent-dashboard-view/agent-chat-panel \
  --feature-slug agent-dashboard-view \
  --team-name agent-dashboard-view \
  --leader-name "leader-agent-dashboard-view" \
  --workbranch work/agent-dashboard-view/agent-chat-panel
```

## What the Generated CLAUDE.md Includes

| Section | Source | Purpose |
|---------|--------|---------|
| Identity & Communication | CLI args | Agent role, team, workbranch, communication rules |
| Workflow Phases | Reference pointer | Points to `AGENT-WORKFLOW-PHASES.md` |
| Task Requirements | Task file (YAML + body) | Acceptance criteria, file scope, implementation notes |
| Agent Protocol | `.claude/agents/<role>.md` | Role-specific rules, skills, patterns |
| V2 Refactor Context | Main CLAUDE.md | DO NOT rules, architecture direction (for v2 features) |
| Documentation Refs | Role → doc mapping | Role-appropriate doc pointers (always-read + role-specific) |
| Project Rules | Main CLAUDE.md sections | Verification, ESLint, imports, design system, IPC, etc. |
| Progress Tracking | CLI args | Slug → artifact path mapping |

## When to Call the Script

**The Team Leader MUST call this script** in Step 4a (Create Worktrees) immediately after `git worktree add`, before spawning the agent. The workflow config at `.claude/workflow.json` has a `worktreeBootstrap` section that configures which docs and sections to include.

## Doc Visibility in Worktrees

Git worktrees share the full repo content. Agents in worktrees can read `ai-docs/`, `docs/`, `.claude/agents/`, etc. The generated CLAUDE.md doesn't inline everything — it extracts essential rules and points to the full docs for deeper context.
