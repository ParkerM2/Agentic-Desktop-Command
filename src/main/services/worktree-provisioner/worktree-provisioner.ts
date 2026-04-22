/**
 * Worktree Provisioner — creates isolated worktrees for agent sessions.
 *
 * Handles the full provisioning lifecycle:
 * 1. Create git worktree with a dedicated branch
 * 2. Copy .claude/ context (agents, skills, commands, settings, etc.)
 * 3. Generate agent-specific CLAUDE.md from agent definition + project rules
 * 4. Write enforcement hooks into .claude/settings.local.json
 * 5. Clean up worktree on session end
 *
 * All IO is asynchronous so the Electron main process message pump stays
 * responsive while git worktrees and setup scripts run. `execSync` here
 * would block window events and surface as "(Not Responding)" on Windows.
 */

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { agentLogger } from '@main/lib/logger';

const execAsync = promisify(exec);

// ─── Types ──────────────────────────────────────────────────

export type AgentType = 'team-lead' | 'teammate';

export interface ProvisionConfig {
  /** Absolute path to the project root (main repo) */
  projectPath: string;
  /** Agent type — determines CLAUDE.md generation and hooks */
  agentType: AgentType;
  /** Agent role name (e.g. 'team-leader', 'component-engineer') */
  agentRole: string;
  /** Unique slug for this worktree (e.g. 'team-lead-proj123') */
  slug: string;
  /** Optional: path to a plan file the agent should read */
  planPath?: string;
  /** Optional: team name for context in CLAUDE.md */
  teamName?: string;
  /** Optional: task-specific instructions to embed in CLAUDE.md */
  taskInstructions?: string;
}

export interface ProvisionResult {
  /** Absolute path to the provisioned worktree */
  worktreePath: string;
  /** Git branch created for this worktree */
  branch: string;
  /** Path to the generated CLAUDE.md */
  claudeMdPath: string;
}

export interface WorktreeProvisioner {
  /** Create and provision a worktree for an agent */
  provision: (config: ProvisionConfig) => Promise<ProvisionResult>;
  /** Remove a provisioned worktree and its branch */
  teardown: (projectPath: string, slug: string) => Promise<void>;
  /** Check if a worktree exists for the given slug */
  exists: (projectPath: string, slug: string) => boolean;
}

// ─── Constants ──────────────────────────────────────────────

const WORKTREE_DIR = '.worktrees';

/** Directories inside .claude/ that should be copied to worktrees */
const CLAUDE_DIRS_TO_COPY = [
  'agents',
  'commands',
  'refs',
  'skills',
] as const;

/** Files inside .claude/ that should be copied to worktrees */
const CLAUDE_FILES_TO_COPY = [
  'settings.json',
  'workflow.json',
] as const;

// ─── Helpers ────────────────────────────────────────────────

/**
 * Strip YAML frontmatter from a markdown file.
 * Returns the body after the closing `---`.
 */
function stripFrontmatter(content: string): string {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return content;
  }
  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return content;
  }
  return trimmed.slice(endIndex + 3).trimStart();
}

/**
 * Read the project's CLAUDE.md, stripping any auto-generated guidelines section
 * to keep the agent's CLAUDE.md focused on rules.
 */
async function readProjectRules(projectPath: string): Promise<string> {
  const claudeMdPath = join(projectPath, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    return '';
  }
  try {
    const content = await readFile(claudeMdPath, 'utf-8');
    const guidelinesMarker = '# ADC — Guidelines';
    const markerIndex = content.indexOf(guidelinesMarker);
    if (markerIndex > 0) {
      return content.slice(0, markerIndex).trimEnd();
    }
    return content;
  } catch {
    return '';
  }
}

/**
 * Read the agent definition file and strip its YAML frontmatter.
 */
async function readAgentDefinition(projectPath: string, agentRole: string): Promise<string> {
  const agentFile = join(projectPath, '.claude', 'agents', `${agentRole}.md`);
  if (!existsSync(agentFile)) {
    agentLogger.warn(`[WorktreeProvisioner] Agent file not found: ${agentFile}`);
    return '';
  }
  try {
    const content = await readFile(agentFile, 'utf-8');
    return stripFrontmatter(content);
  } catch {
    return '';
  }
}

/**
 * Generate enforcement hooks for a team-lead worktree.
 *
 * These hooks prevent the team-lead from:
 * - Writing code itself (Edit/Write blocked)
 * - Committing without proper branch verification
 */
function generateTeamLeadHooks(): Record<string, unknown> {
  const blockWriteScript = [
    `const tool = process.env.CLAUDE_TOOL_USE_NAME || '';`,
    `if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') {`,
    `  process.stderr.write('BLOCKED: Team leads must not write code. Delegate to a teammate agent via SendMessage/Agent tool.\\n');`,
    `  process.exit(2);`,
    `}`,
  ].join('');

  return {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Edit|Write|NotebookEdit',
          command: `node -e "${blockWriteScript}"`,
          timeout: 5000,
        },
      ],
    },
  };
}

/**
 * IPC commands block injected into team-lead CLAUDE.md.
 */
const TEAM_LEAD_IPC_COMMANDS = `## IPC Commands Available

You have access to these workspace IPC channels for managing teammate agents:

| Command | Purpose |
|---------|---------|
| \`workspace.provisionTeammate\` | Create isolated worktree for a teammate BEFORE spawning. Input: \`{ projectId, agentRole, slug, teamName, taskInstructions? }\` → \`{ worktreePath, branch }\` |
| \`workspace.teardownTeammate\` | Clean up teammate worktree AFTER completion. Input: \`{ projectId, slug }\` → \`{ success }\` |
| \`workspace.sendMessage\` | Send message to any session. Input: \`{ sessionId, message }\` → \`{ success }\` |

### Teammate Spawn Workflow

For EVERY teammate:
1. Call \`workspace.provisionTeammate\` → get isolated worktree with role-specific CLAUDE.md
2. Spawn agent with cwd = returned worktreePath
3. Monitor via SendMessage
4. Call \`workspace.teardownTeammate\` when done or failed`;

/**
 * Communication block injected into teammate CLAUDE.md.
 */
function teammateCommBlock(teamName: string): string {
  return `## Communication

- Report ONLY to your team leader via SendMessage.
- Do NOT message other agents. Do NOT spawn agents.
- On completion: message leader with "Task complete. Files: <list>. Self-review passed."
- On blocker: message leader immediately.
- You are working in an isolated git worktree. Commit your changes to your branch when done.
- Team: ${teamName}`;
}

/**
 * Generate a CLAUDE.md tailored for the agent type and role.
 */
function generateClaudeMd(config: ProvisionConfig, projectRules: string, agentBody: string): string {
  const sections: string[] = [];

  if (config.agentType === 'team-lead') {
    sections.push(
      `# Team Lead — ${config.teamName ?? config.slug}`,
      '',
      'You are an orchestrator. You do NOT write implementation code.',
      'You decompose tasks, spawn teammate agents, coordinate work, and ensure quality.',
      '',
      TEAM_LEAD_IPC_COMMANDS,
      '',
      '## Agent Protocol',
      '',
      agentBody,
    );
  } else {
    sections.push(
      `# Teammate Agent — ${config.agentRole}`,
      '',
      '## Agent Protocol',
      '',
      agentBody,
      '',
      teammateCommBlock(config.teamName ?? 'unknown'),
    );
  }

  if (config.planPath) {
    sections.push('', '## Plan File', '', `Read the plan at: \`${config.planPath}\``);
  }

  if (config.taskInstructions) {
    sections.push('', '## Task Requirements', '', config.taskInstructions);
  }

  if (projectRules.length > 0) {
    sections.push('', '## Project Rules', '', projectRules);
  }

  return sections.join('\n');
}

/**
 * Fallback: manually copy .claude/ directories and files when the shared
 * setup script is unavailable or fails.
 */
async function fallbackCopyClaudeContext(sourceClaudeDir: string, targetClaudeDir: string): Promise<void> {
  // dereference: true resolves symlinks to their real content. Needed on Windows
  // where creating symlinks requires admin privileges — otherwise cp fails with
  // EPERM for any .claude/ entry that is itself a symlink (Claude Code 2.0
  // consolidates skills/agents via symlinks into ~/.agents and ~/.skills).
  for (const dir of CLAUDE_DIRS_TO_COPY) {
    const source = join(sourceClaudeDir, dir);
    const target = join(targetClaudeDir, dir);
    if (existsSync(source)) {
      await cp(source, target, { recursive: true, dereference: true });
    }
  }
  for (const file of CLAUDE_FILES_TO_COPY) {
    const source = join(sourceClaudeDir, file);
    const target = join(targetClaudeDir, file);
    if (existsSync(source)) {
      await cp(source, target, { dereference: true });
    }
  }
}

// ─── Factory ────────────────────────────────────────────────

export function createWorktreeProvisioner(): WorktreeProvisioner {
  return {
    async provision(config) {
      const { projectPath, agentType, agentRole, slug } = config;
      const worktreeBase = join(projectPath, WORKTREE_DIR);
      const worktreePath = resolve(join(worktreeBase, slug));
      const branch = `worktree/${slug}`;

      agentLogger.info(`[WorktreeProvisioner] Provisioning worktree: ${slug} at ${worktreePath}`);

      // ── 1. Create git worktree ──────────────────────────────
      await mkdir(worktreeBase, { recursive: true });

      // Clean up stale worktree if it exists
      if (existsSync(worktreePath)) {
        agentLogger.info(`[WorktreeProvisioner] Removing stale worktree: ${worktreePath}`);
        try {
          await execAsync(`git worktree remove --force "${worktreePath}"`, {
            cwd: projectPath,
            timeout: 15_000,
          });
        } catch {
          // Worktree may not be registered in git — force-remove the directory
          await rm(worktreePath, { recursive: true, force: true });
        }
      }

      // Delete branch if it exists from a previous run
      try {
        await execAsync(`git branch -D "${branch}"`, {
          cwd: projectPath,
          timeout: 10_000,
        });
      } catch {
        // Branch doesn't exist — that's fine
      }

      await execAsync(`git worktree add "${worktreePath}" -b "${branch}"`, {
        cwd: projectPath,
        timeout: 30_000,
      });

      agentLogger.info(`[WorktreeProvisioner] Git worktree created on branch: ${branch}`);

      // ── 2. Run shared worktree setup script ─────────────────
      // Copies gitignored config (.claude/settings.json, .env) and installs deps
      const sourceClaudeDir = join(projectPath, '.claude');
      const targetClaudeDir = join(worktreePath, '.claude');
      await mkdir(targetClaudeDir, { recursive: true });

      try {
        await execAsync(
          `bash scripts/worktree-setup.sh "${worktreePath}" "${projectPath}"`,
          { cwd: projectPath, timeout: 120_000 },
        );
        agentLogger.info('[WorktreeProvisioner] Shared setup script completed');
      } catch (setupError) {
        agentLogger.warn('[WorktreeProvisioner] Setup script failed, falling back to manual copy', {
          error: setupError,
        });
        await fallbackCopyClaudeContext(sourceClaudeDir, targetClaudeDir);
      }

      agentLogger.info('[WorktreeProvisioner] .claude/ context copied');

      // ── 3. Generate agent-specific CLAUDE.md ────────────────
      const projectRules = await readProjectRules(projectPath);
      const agentBody = await readAgentDefinition(projectPath, agentRole);
      const claudeMdContent = generateClaudeMd(config, projectRules, agentBody);
      const claudeMdPath = join(worktreePath, 'CLAUDE.md');
      await writeFile(claudeMdPath, claudeMdContent, 'utf-8');

      agentLogger.info(`[WorktreeProvisioner] CLAUDE.md generated for ${agentRole}`);

      // ── 4. Write enforcement hooks ──────────────────────────
      if (agentType === 'team-lead') {
        const hooks = generateTeamLeadHooks();
        const settingsLocalPath = join(targetClaudeDir, 'settings.local.json');

        let existing: Record<string, unknown> = {};
        if (existsSync(settingsLocalPath)) {
          try {
            existing = JSON.parse(await readFile(settingsLocalPath, 'utf-8')) as Record<string, unknown>;
          } catch {
            // Malformed — start fresh
          }
        }

        const merged = { ...existing, ...hooks };
        await writeFile(settingsLocalPath, JSON.stringify(merged, null, 2), 'utf-8');

        agentLogger.info('[WorktreeProvisioner] Team-lead enforcement hooks written');
      }

      return { worktreePath, branch, claudeMdPath };
    },

    async teardown(projectPath, slug) {
      const worktreePath = resolve(join(projectPath, WORKTREE_DIR, slug));
      const branch = `worktree/${slug}`;

      agentLogger.info(`[WorktreeProvisioner] Tearing down worktree: ${slug}`);

      try {
        await execAsync(`git worktree remove --force "${worktreePath}"`, {
          cwd: projectPath,
          timeout: 15_000,
        });
      } catch {
        if (existsSync(worktreePath)) {
          await rm(worktreePath, { recursive: true, force: true });
        }
      }

      try {
        await execAsync('git worktree prune', {
          cwd: projectPath,
          timeout: 10_000,
        });
      } catch {
        // Non-critical
      }

      try {
        await execAsync(`git branch -D "${branch}"`, {
          cwd: projectPath,
          timeout: 10_000,
        });
      } catch {
        // Branch may already be gone
      }

      agentLogger.info(`[WorktreeProvisioner] Worktree ${slug} cleaned up`);
    },

    exists(projectPath, slug) {
      const worktreePath = resolve(join(projectPath, WORKTREE_DIR, slug));
      return existsSync(worktreePath);
    },
  };
}
