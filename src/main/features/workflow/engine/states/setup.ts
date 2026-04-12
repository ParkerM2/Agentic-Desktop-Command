/**
 * SETUP State Handler
 *
 * Prepares agent isolation for every task in the current wave:
 *
 *   useWorktrees: true  → git worktree add .worktrees/<feature>/<slug> -b <branch>
 *   useWorktrees: false → git branch <branch> (checkout-only, no worktree)
 *
 * BOTH paths always:
 *   - Write a CLAUDE.md to .claude/agent-contexts/<feature>/<slug>/CLAUDE.md
 *
 * NOTE (Claude Code #33045): `isolation: worktree` is silently ignored when
 * agents are spawned via the Agent tool inside a team context. The worktree
 * path is still created so agents can be pointed at it via their cwd, but the
 * CLAUDE.md file written here is ALSO embedded inline in the spawn prompt
 * (done by the SPAWNING state) as the primary delivery mechanism for project
 * rules and workflow protocol.
 *
 * See: https://github.com/anthropics/claude-code/issues/33045
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import simpleGit from 'simple-git';

import { buildAgentClaudeMd } from '../context-builder';
import { WorkflowState } from '../types';

import type { GitService } from '../../../git/git-service';
import type { TaskEntry, WorkflowRuntimeRecord } from '../types';

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Resolves the agent work branch name for a given task.
 */
function taskBranchName(
  branchPrefix: string,
  featureName: string,
  taskSlug: string,
): string {
  return `${branchPrefix}/${featureName}/${taskSlug}`;
}

/**
 * Resolves the git worktree path for a given task.
 */
function taskWorktreePath(
  projectPath: string,
  featureName: string,
  taskSlug: string,
): string {
  return join(projectPath, '.worktrees', featureName, taskSlug);
}

/**
 * Creates a dedicated git branch for a task (without a worktree).
 * The feature branch must already exist; the task branch is branched from it.
 */
async function createTaskBranch(
  projectPath: string,
  branchName: string,
  featureBranch: string,
  gitService: GitService,
): Promise<void> {
  const branches = await gitService.listBranches(projectPath);
  const exists = branches.some((b) => b.name === branchName);

  if (!exists) {
    const result = await gitService.createBranch(projectPath, branchName, featureBranch);
    if (!result.success) {
      throw new Error(`SETUP FAIL: Could not create task branch: ${branchName}`);
    }
    // Switch back to the feature branch — we only created the task branch,
    // we do not want to work on it directly in the main worktree.
    await gitService.switchBranch(projectPath, featureBranch);
  }
}

/**
 * Creates a git worktree at the given path checked out to the task branch.
 * The branch is created first if it does not exist.
 *
 * NOTE (Claude Code #33045): worktrees are created so agents have an isolated
 * working directory, but CLAUDE.md injection into the prompt is still required.
 */
async function createTaskWorktree(
  projectPath: string,
  worktreePath: string,
  branchName: string,
  featureBranch: string,
  gitService: GitService,
): Promise<void> {
  if (existsSync(worktreePath)) {
    console.warn(`[WorkflowEngine/SETUP] Worktree already exists, skipping: ${worktreePath}`);
    return;
  }

  // Ensure the task branch exists before adding a worktree on it
  await createTaskBranch(projectPath, branchName, featureBranch, gitService);

  // Ensure parent directory exists
  const parentDir = join(worktreePath, '..');
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  const git = simpleGit(projectPath);
  await git.raw(['worktree', 'add', worktreePath, branchName]);

  console.warn(`[WorkflowEngine/SETUP] Worktree created: ${worktreePath} (branch: ${branchName})`);
}

/**
 * Writes the agent CLAUDE.md to .claude/agent-contexts/<feature>/<slug>/CLAUDE.md.
 * Returns the content string so the SPAWNING state can embed it inline when
 * useWorktrees=false.
 */
function writeAgentClaudeMd(
  projectPath: string,
  featureName: string,
  task: TaskEntry,
  options: {
    teamName: string;
    teamLeaderName: string;
    branchPrefix: string;
    useWorktrees: boolean;
  },
): string {
  const content = buildAgentClaudeMd(task, {
    featureName,
    teamName: options.teamName,
    teamLeaderName: options.teamLeaderName,
    branchPrefix: options.branchPrefix,
    useWorktrees: options.useWorktrees,
    projectPath,
  });

  const contextDir = join(
    projectPath,
    '.claude',
    'agent-contexts',
    featureName,
    task.taskSlug,
  );

  if (!existsSync(contextDir)) {
    mkdirSync(contextDir, { recursive: true });
  }

  const contextFilePath = join(contextDir, 'CLAUDE.md');
  writeFileSync(contextFilePath, content, 'utf-8');

  console.warn(`[WorkflowEngine/SETUP] CLAUDE.md written: ${contextFilePath}`);
  return content;
}

// ─── SETUP State ──────────────────────────────────────────────

/**
 * Runs SETUP — creates isolation (worktrees or branches) and injects
 * CLAUDE.md for every task in the current wave.
 *
 * Attaches a `claudeMdBySlug` map to the record for the SPAWNING state to use.
 */
export async function runSetup(
  record: WorkflowRuntimeRecord,
  gitService: GitService,
): Promise<WorkflowState> {
  const { featureName, projectPath, useWorktrees, branchPrefix } = record.config;

  if (!record.wavePlan) {
    throw new Error('SETUP FAIL: wavePlan is null — PLAN state did not complete successfully');
  }

  const currentWaveTasks = record.wavePlan.waves[record.wavePlan.currentWave] ?? [];
  if (currentWaveTasks.length === 0) {
    throw new Error(
      `SETUP FAIL: No tasks in wave ${String(record.wavePlan.currentWave)} of ${featureName}`,
    );
  }

  const featureBranch = `${branchPrefix}/${featureName}`;
  const claudeMdBySlug = new Map<string, string>();

  // Derive team context from config overrides (with fallback defaults)
  const { overrides } = record.config;
  const teamName = typeof overrides.teamName === 'string' ? overrides.teamName : featureName;
  const teamLeaderName = typeof overrides.teamLeaderName === 'string' ? overrides.teamLeaderName : 'team-lead';

  for (const task of currentWaveTasks) {
    const branchName = taskBranchName(branchPrefix, featureName, task.taskSlug);

    // ── 1. Create isolation (worktree or branch) ────────────────
    if (useWorktrees) {
      const worktreePath = taskWorktreePath(projectPath, featureName, task.taskSlug);
      await createTaskWorktree(projectPath, worktreePath, branchName, featureBranch, gitService);
    } else {
      // useWorktrees=false: branch only
      // NOTE (Claude Code #33045): isolation:worktree silently ignored for team agents.
      // Branches are still created for code isolation; CLAUDE.md is injected inline
      // in the spawn prompt by the SPAWNING state.
      await createTaskBranch(projectPath, branchName, featureBranch, gitService);
      console.warn(
        `[WorkflowEngine/SETUP] useWorktrees=false — branch created: ${branchName}. ` +
          `CLAUDE.md will be embedded inline in spawn prompt (CC #33045 workaround).`,
      );
    }

    // ── 2. Write CLAUDE.md (BOTH paths always run this) ────────
    const claudeMdContent = writeAgentClaudeMd(projectPath, featureName, task, {
      teamName,
      teamLeaderName,
      branchPrefix,
      useWorktrees,
    });

    claudeMdBySlug.set(task.taskSlug, claudeMdContent);
  }

  // Attach map to record for SPAWNING state
  record.claudeMdBySlug = claudeMdBySlug;

  console.warn(
    `[WorkflowEngine/SETUP] Wave ${String(record.wavePlan.currentWave)} ready: ` +
      `${String(currentWaveTasks.length)} task(s) prepared for feature "${featureName}"`,
  );

  return WorkflowState.SPAWNING;
}
