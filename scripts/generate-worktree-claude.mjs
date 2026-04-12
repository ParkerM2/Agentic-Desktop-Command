#!/usr/bin/env node

/**
 * Worktree Agent Bootstrapping — generates a custom CLAUDE.md for agents
 * spawning in git worktrees during `/agent-team` execution.
 *
 * Called by the Team Leader during Step 4a (Create Worktrees + Inject Agent CLAUDE.md).
 *
 * Usage:
 *   node scripts/generate-worktree-claude.mjs \
 *     --agent-role component-engineer \
 *     --task-file progress/agent-dashboard-view/tasks/task-3.md \
 *     --worktree-path .worktrees/agent-dashboard-view/agent-chat-panel \
 *     --feature-slug agent-dashboard-view \
 *     --team-name agent-dashboard-view \
 *     --leader-name "leader-agent-dashboard-view" \
 *     --workbranch work/agent-dashboard-view/agent-chat-panel
 *
 * Output: writes <worktree-path>/CLAUDE.md with the agent's full context.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';

// ---------------------------------------------------------------------------
// Per-agent model routing
// ---------------------------------------------------------------------------

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

/**
 * Recommended MAX_THINKING_TOKENS by model tier.
 * Opus (team-leader, architect) gets more budget; sonnet workers get a lean 4096.
 */
const THINKING_TOKENS_BY_MODEL = {
  'opus': 16384,
  'sonnet': 4096,
};

/**
 * Recommended spawn command for worker agents.
 * Use --bare to eliminate hook/plugin/MCP overhead for worker agents.
 *
 * # Recommended spawn for worker agents:
 * # claude --bare --model sonnet --print \
 * #   --system-prompt-file <worktree>/CLAUDE.md \
 * #   --add-dir <worktree>
 *
 * Team leaders and architects (opus) may omit --bare if hooks are needed.
 */

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    'agent-role': { type: 'string' },
    'task-file': { type: 'string' },
    'worktree-path': { type: 'string' },
    'feature-slug': { type: 'string' },
    'team-name': { type: 'string' },
    'leader-name': { type: 'string' },
    'workbranch': { type: 'string' },
    'repo-root': { type: 'string', default: process.cwd() },
    'model': { type: 'string' },
  },
});

const REQUIRED = ['agent-role', 'task-file', 'worktree-path', 'feature-slug', 'team-name', 'leader-name', 'workbranch'];
for (const key of REQUIRED) {
  if (!args[key]) {
    console.error(`Missing required argument: --${key}`);
    process.exit(1);
  }
}

// Resolve model: CLI override takes precedence, then role lookup, then default to sonnet
const resolvedModel = args['model'] ?? MODEL_BY_ROLE[args['agent-role']] ?? 'sonnet';
const maxThinkingTokens = THINKING_TOKENS_BY_MODEL[resolvedModel] ?? 4096;
const useBareflag = resolvedModel !== 'opus';

const REPO_ROOT = resolve(args['repo-root']);
const WORKTREE_PATH = resolve(args['worktree-path']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readIfExists(path) {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns { frontmatter: Record<string, string>, body: string }
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      // Strip quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      fm[key] = val;
    }
  }
  return { frontmatter: fm, body: match[2] };
}

/**
 * Extract a named section from the main CLAUDE.md.
 * Looks for ## <heading> and captures until the next ## or EOF.
 */
function extractSection(claudeMd, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^## ${escaped}[^\n]*\n([\s\S]*?)(?=\n## |$)`, 'm');
  const match = claudeMd.match(regex);
  return match ? match[0].trim() : null;
}

// ---------------------------------------------------------------------------
// Read inputs
// ---------------------------------------------------------------------------

const mainClaudeMd = readIfExists(join(REPO_ROOT, 'CLAUDE.md'));
if (!mainClaudeMd) {
  console.error('CLAUDE.md not found at repo root');
  process.exit(1);
}

const agentDef = readIfExists(join(REPO_ROOT, '.claude', 'agents', `${args['agent-role']}.md`));
const taskFileContent = readIfExists(join(REPO_ROOT, args['task-file']));

// Read workflow config for extra doc pointers
const workflowConfig = (() => {
  const raw = readIfExists(join(REPO_ROOT, '.claude', 'workflow.json'));
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
})();

// ---------------------------------------------------------------------------
// Determine which docs to reference based on agent role
// ---------------------------------------------------------------------------

const ROLE_DOC_MAP = {
  // Schema / type agents
  'schema-designer': ['ai-docs/ARCHITECTURE.md', 'ai-docs/DATA-FLOW.md', 'ai-docs/FEATURES-INDEX.md'],
  // Service layer agents
  'service-engineer': ['ai-docs/ARCHITECTURE.md', 'ai-docs/DATA-FLOW.md', 'ai-docs/FEATURES-INDEX.md'],
  'ipc-handler-engineer': ['ai-docs/ARCHITECTURE.md', 'ai-docs/DATA-FLOW.md', 'ai-docs/TASK-PLANNING-PIPELINE.md'],
  // UI agents
  'component-engineer': ['ai-docs/PATTERNS.md', 'ai-docs/FEATURES-INDEX.md', 'ai-docs/user-interface-flow.md'],
  'styling-engineer': ['ai-docs/PATTERNS.md', 'ai-docs/FEATURES-INDEX.md'],
  'hook-engineer': ['ai-docs/DATA-FLOW.md', 'ai-docs/PATTERNS.md', 'ai-docs/FEATURES-INDEX.md'],
  'store-engineer': ['ai-docs/DATA-FLOW.md', 'ai-docs/PATTERNS.md'],
  'router-engineer': ['ai-docs/user-interface-flow.md', 'ai-docs/FEATURES-INDEX.md'],
  // QA / review agents
  'qa-reviewer': ['ai-docs/CODEBASE-GUARDIAN.md', 'ai-docs/LINTING.md'],
  'qa-tester': ['ai-docs/CODEBASE-GUARDIAN.md', 'ai-docs/LINTING.md'],
  'codebase-guardian': ['ai-docs/CODEBASE-GUARDIAN.md', 'ai-docs/ARCHITECTURE.md', 'ai-docs/LINTING.md'],
  'test-engineer': ['ai-docs/PATTERNS.md', 'ai-docs/FEATURES-INDEX.md'],
  // Integration agents
  'integration-engineer': ['ai-docs/ARCHITECTURE.md', 'ai-docs/DATA-FLOW.md'],
  'fitness-engineer': ['ai-docs/PATTERNS.md', 'ai-docs/FEATURES-INDEX.md', 'ai-docs/user-interface-flow.md'],
  // Infrastructure agents
  'infra-engineer': ['ai-docs/ARCHITECTURE.md'],
  'git-engineer': ['ai-docs/ARCHITECTURE.md'],
  'api-engineer': ['ai-docs/ARCHITECTURE.md', 'ai-docs/DATA-FLOW.md'],
};

const alwaysDocs = workflowConfig.worktreeBootstrap?.alwaysIncludeDocs ?? [
  'ai-docs/CODEBASE-GUARDIAN.md',
  'ai-docs/LINTING.md',
  'ai-docs/PATTERNS.md',
];

const roleDocs = ROLE_DOC_MAP[args['agent-role']] ?? [];
const allDocs = [...new Set([...alwaysDocs, ...roleDocs])];

// ---------------------------------------------------------------------------
// Extract essential sections from main CLAUDE.md
// ---------------------------------------------------------------------------

const ESSENTIAL_SECTIONS = [
  // Updated 2026-04-12 to match post-rewrite CLAUDE.md headings.
  // The extractor matches from `## <heading>` to the next `## ` or EOF, so
  // capturing top-level sections also picks up their subsections.
  'Architecture',
  'Data Layer',
  'Feature Slice Design',
  'Design System Rules',
  'IPC Conventions',
  'Key Paths',
  'Testing',
  'Communication Standards',
];

const extractedSections = ESSENTIAL_SECTIONS
  .map((h) => extractSection(mainClaudeMd, h))
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Parse task file
// ---------------------------------------------------------------------------

let taskSection = '';
if (taskFileContent) {
  const { frontmatter, body } = parseFrontmatter(taskFileContent);
  taskSection = `## Task #${frontmatter.taskNumber ?? '?'}: ${frontmatter.taskName ?? args['agent-role']}

**Slug**: \`${frontmatter.taskSlug ?? 'unknown'}\`
**Wave**: ${frontmatter.wave ?? '?'}
**Complexity**: ${frontmatter.complexity ?? 'unknown'}
**Blocked By**: ${frontmatter.blockedBy ?? 'none'}

${body}`;
} else {
  taskSection = `## Task

> Task file not found at \`${args['task-file']}\`. Read your task instructions from the team leader's spawn prompt.`;
}

// ---------------------------------------------------------------------------
// Build agent protocol section
// ---------------------------------------------------------------------------

let agentProtocol = '';
if (agentDef) {
  // Strip any YAML frontmatter from agent def
  const { body } = parseFrontmatter(agentDef);
  agentProtocol = `## Agent Protocol — ${args['agent-role']}

${body}`;
} else {
  agentProtocol = `## Agent Protocol

> Agent definition not found for \`${args['agent-role']}\`. Follow standard coding agent workflow phases.`;
}

// ---------------------------------------------------------------------------
// V2 refactor docs (always included for agent-dashboard-view feature)
// ---------------------------------------------------------------------------

const v2RefactorDocs = args['feature-slug'] === 'agent-dashboard-view'
  ? `## V2 Refactor — Key References

Read these for full context on the headless agent architecture:

| Document | What |
|----------|------|
| \`docs/research/2026-03-30-headless-agent-architecture.md\` | Full research: data flow, services, component stack, phases |
| \`docs/features/agent-dashboard-view/plan.md\` | UI spec: layouts, panels, chat components, interactions |

**Critical**: Do NOT build on \`terminal-service\`, xterm.js, or node-pty. Agent output comes from stream-json / session JSONL. See the "ADC v2 Refactor" section below for details.`
  : '';

// ---------------------------------------------------------------------------
// Assemble the CLAUDE.md
// ---------------------------------------------------------------------------

const bareSpawnNote = useBareflag
  ? `Spawn with \`--bare\` to eliminate hook/plugin/MCP overhead:\n\`\`\`\nclaude --bare --model ${resolvedModel} --print --system-prompt-file <worktree>/CLAUDE.md --add-dir <worktree>\n\`\`\``
  : `Spawn without \`--bare\` (opus agents may need hooks):\n\`\`\`\nclaude --model ${resolvedModel} --print --system-prompt-file <worktree>/CLAUDE.md --add-dir <worktree>\n\`\`\``;

const output = `# ${args['agent-role']} — Task Agent CLAUDE.md

> Auto-generated by \`scripts/generate-worktree-claude.mjs\`. Do not edit manually.
> Feature: \`${args['feature-slug']}\` | Team: \`${args['team-name']}\` | Branch: \`${args['workbranch']}\`
> Model: \`${resolvedModel}\` | MAX_THINKING_TOKENS: \`${maxThinkingTokens}\`

---

## Identity & Communication

You are **${args['agent-role']}** on team "${args['team-name']}".
Workbranch: \`${args['workbranch']}\`.
Working directory: \`${WORKTREE_PATH}\`.
Model: \`${resolvedModel}\` | MAX_THINKING_TOKENS: \`${maxThinkingTokens}\`

### Spawn Command

${bareSpawnNote}

### Communication Rules (non-negotiable)

- Report ONLY to "${args['leader-name']}" via SendMessage.
- Do NOT message other agents. Do NOT spawn agents. Do NOT emit tracking events.
- On completion: \`SendMessage(to: "${args['leader-name']}", message: "Task complete. Files: <list>. Self-review passed.", summary: "Task done")\`
- On blocker: message leader immediately.
- Wait for shutdown_request when done.

---

## Workflow Phases

Read \`prompts/implementing-features/AGENT-WORKFLOW-PHASES.md\` and follow Phases 0-4 sequentially.

---

${taskSection}

---

${agentProtocol}

---

${v2RefactorDocs ? v2RefactorDocs + '\n\n---\n' : ''}
## Documentation References

Read these docs as needed for your task. They are available in the worktree.

### Always-Read (before writing code)

| Doc | Purpose |
|-----|---------|
${alwaysDocs.map((d) => `| \`${d}\` | ${docPurpose(d)} |`).join('\n')}

### Role-Specific

| Doc | Purpose |
|-----|---------|
${roleDocs.filter((d) => !alwaysDocs.includes(d)).map((d) => `| \`${d}\` | ${docPurpose(d)} |`).join('\n') || '| (none beyond always-read) | |'}

---

## Project Rules (extracted from main CLAUDE.md)

${extractedSections.join('\n\n---\n\n')}

---

## Progress Tracking

This feature uses slug \`${args['feature-slug']}\` consistently across:

| Artifact | Path |
|----------|------|
| Tracker entry | \`docs/tracker.json\` → \`plans.${args['feature-slug']}\` |
| Plan/design doc | \`docs/features/${args['feature-slug']}/plan.md\` |
| Progress events | \`progress/${args['feature-slug']}/events.jsonl\` |
| Progress summary | \`progress/${args['feature-slug']}/current.md\` |
| Feature branch | \`feature/${args['feature-slug']}\` |
| This workbranch | \`${args['workbranch']}\` |
| Worktree | \`${WORKTREE_PATH}\` |

Do NOT emit tracking events yourself — the team leader handles all \`/track\` calls.
`;

// ---------------------------------------------------------------------------
// Doc purpose lookup
// ---------------------------------------------------------------------------

function docPurpose(docPath) {
  const map = {
    'ai-docs/CODEBASE-GUARDIAN.md': 'File placement rules, naming conventions, import rules',
    'ai-docs/LINTING.md': 'ESLint rules reference and fix patterns',
    'ai-docs/PATTERNS.md': 'Code conventions, component patterns, examples',
    'ai-docs/ARCHITECTURE.md': 'System architecture, IPC flow, service patterns',
    'ai-docs/DATA-FLOW.md': 'Detailed data flow diagrams for all systems',
    'ai-docs/FEATURES-INDEX.md': 'Feature inventory, file locations, service inventory',
    'ai-docs/user-interface-flow.md': 'UX flow map, gap analysis, component wiring',
    'ai-docs/TASK-PLANNING-PIPELINE.md': 'Task planning pipeline, IPC channels, status transitions',
    'ai-docs/AGENT-WORKFLOW.md': 'Agent team orchestration workflow',
  };
  return map[docPath] ?? 'Project documentation';
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

mkdirSync(dirname(join(WORKTREE_PATH, 'CLAUDE.md')), { recursive: true });
writeFileSync(join(WORKTREE_PATH, 'CLAUDE.md'), output, 'utf-8');

console.log(`Generated ${join(WORKTREE_PATH, 'CLAUDE.md')} for ${args['agent-role']} (${args['feature-slug']})`);
console.log(`  Agent: ${args['agent-role']}`);
console.log(`  Model: ${resolvedModel} (MAX_THINKING_TOKENS: ${maxThinkingTokens})`);
console.log(`  Bare spawn: ${useBareflag}`);
console.log(`  Task file: ${args['task-file']}`);
console.log(`  Docs included: ${allDocs.length} references`);
console.log(`  Sections: ${extractedSections.length} project rules extracted`);
