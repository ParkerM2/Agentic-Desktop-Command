---
taskNumber: 5
taskName: Agent Spawn Script Optimization
taskSlug: spawn-script-optimization
wave: 3
complexity: medium
blockedBy: task-4
agent: service-engineer
branch: claude-plugin-improvements/spawn-script-optimization
---

## Task: Update generate-worktree-claude.mjs with cost optimizations

**File**: `/Users/parker/Desktop/Agentic-Desktop-Command/scripts/generate-worktree-claude.mjs`

### Changes Required

1. **Per-agent model routing** — Add model selection by role:
   ```javascript
   const MODEL_BY_ROLE = {
     'team-leader': 'opus',
     'architect': 'opus',
     'schema-designer': 'sonnet',
     'component-engineer': 'sonnet',
     'service-engineer': 'sonnet',
     'hook-engineer': 'sonnet',
     'store-engineer': 'sonnet',
     'ipc-handler-engineer': 'sonnet',
     'styling-engineer': 'sonnet',
     'router-engineer': 'sonnet',
     'test-engineer': 'sonnet',
     'qa-reviewer': 'sonnet',
     'codebase-guardian': 'sonnet',
     'integration-engineer': 'sonnet',
     'fitness-engineer': 'sonnet',
   };
   ```
   Add `--model` flag output and include model in the generated CLAUDE.md header.

2. **Add `--bare` flag documentation** — Add a comment block explaining that the team-leader SHOULD spawn worker agents with `--bare` flag to eliminate hook/plugin/MCP overhead:
   ```
   # Recommended spawn for worker agents:
   # claude --bare --model sonnet --print --system-prompt-file <worktree>/CLAUDE.md --add-dir <worktree>
   ```

3. **Add MAX_THINKING_TOKENS recommendation** — Include in generated CLAUDE.md:
   - Workers: `MAX_THINKING_TOKENS=4096`
   - Team leaders/architects: `MAX_THINKING_TOKENS=16384`

4. **Add new CLI arg `--model`** — Accept optional model override via CLI arg

### Acceptance Criteria
- Script accepts `--model` argument
- MODEL_BY_ROLE lookup works for all known agent roles
- Generated CLAUDE.md includes model + thinking token guidance
- `node scripts/generate-worktree-claude.mjs --help` (or missing args) shows updated usage
