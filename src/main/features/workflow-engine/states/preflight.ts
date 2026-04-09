/**
 * PREFLIGHT State Handler
 *
 * Validates the git repository state and creates the feature branch.
 * This is a HARD FAIL state — any error transitions to ERROR.
 *
 * Responsibilities:
 * - Confirm projectPath is a git repository (has .git)
 * - Confirm working tree is clean (no uncommitted changes)
 * - Create the feature branch (feature/<featureName>) if it does not exist
 * - Switch to the branch
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { WorkflowState } from '../types';

import type { GitService } from '../../git/git-service';
import type { WorkflowEngineRecord } from '../types';

const GIT_DIR = '.git';

/**
 * Runs PREFLIGHT checks and branch creation.
 * Returns PLAN on success, ERROR on any failure.
 */
export async function runPreflight(
  record: WorkflowEngineRecord,
  gitService: GitService,
): Promise<WorkflowState> {
  const { projectPath, featureName } = record.config;

  // ── 1. Verify project path is a git repo ─────────────────────
  const gitDirPath = join(projectPath, GIT_DIR);
  if (!existsSync(gitDirPath)) {
    throw new Error(
      `PREFLIGHT FAIL: Project path is not a git repository — no ${GIT_DIR} found at: ${projectPath}`,
    );
  }

  // ── 2. Check for clean working tree ───────────────────────────
  const status = await gitService.getStatus(projectPath);
  const hasUncommittedChanges =
    status.modified.length > 0 ||
    status.staged.length > 0 ||
    status.untracked.length > 0;

  if (hasUncommittedChanges) {
    throw new Error(
      `PREFLIGHT FAIL: Working tree is not clean. ` +
        `Modified: ${status.modified.length}, Staged: ${status.staged.length}, Untracked: ${status.untracked.length}. ` +
        `Commit or stash changes before starting a workflow.`,
    );
  }

  // ── 3. Build feature branch name ─────────────────────────────
  const { branchPrefix } = record.config;
  const branchName = `${branchPrefix}/${featureName}`;

  // ── 4. Check if branch already exists ────────────────────────
  const branches = await gitService.listBranches(projectPath);
  const branchExists = branches.some(
    (b) => b.name === branchName || b.name === `remotes/origin/${branchName}`,
  );

  if (!branchExists) {
    // Create the branch
    const result = await gitService.createBranch(projectPath, branchName);
    if (!result.success) {
      throw new Error(`PREFLIGHT FAIL: Could not create branch: ${branchName}`);
    }
  }

  // ── 5. Switch to the branch ───────────────────────────────────
  await gitService.switchBranch(projectPath, branchName);

  console.warn(`[WorkflowEngine/PREFLIGHT] Branch ready: ${branchName}`);

  return WorkflowState.PLAN;
}
