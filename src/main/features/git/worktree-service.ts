/**
 * Worktree Service — Git worktree lifecycle management
 *
 * Worktrees are created in a .worktrees/ directory inside the project.
 * The list of worktrees is derived at runtime from `git worktree list --porcelain`
 * rather than persisted to disk.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import simpleGit from 'simple-git';
import { v4 as uuid } from 'uuid';

import type { Worktree } from '@shared/types';

export interface WorktreeService {
  createWorktree: (repoPath: string, worktreePath: string, branch: string) => Promise<Worktree>;
  removeWorktree: (repoPath: string, worktreePath: string) => Promise<{ success: boolean }>;
  listWorktrees: (projectId: string) => Worktree[];
  linkToTask: (worktreeId: string, taskId: string) => void;
}

/** Parse `git worktree list --porcelain` output into Worktree objects. */
function parseWorktreePorcelain(raw: string, projectId: string): Worktree[] {
  const result: Worktree[] = [];
  const blocks = raw.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    const pathLine = lines.find((l) => l.startsWith('worktree '));
    const branchLine = lines.find((l) => l.startsWith('branch '));

    if (!pathLine) continue;

    const path = pathLine.slice('worktree '.length).trim();
    const branchRef = branchLine ? branchLine.slice('branch '.length).trim() : '';
    const branch = branchRef.replace(/^refs\/heads\//, '');

    result.push({
      id: uuid(),
      projectId,
      path,
      branch,
      createdAt: new Date().toISOString(),
    });
  }

  return result;
}

/** Derive worktrees for a project from git at runtime. */
function deriveWorktrees(projectPath: string, projectId: string): Worktree[] {
  try {
    const raw = execSync('git worktree list --porcelain', {
      cwd: projectPath,
      encoding: 'utf-8',
    });
    return parseWorktreePorcelain(raw, projectId);
  } catch {
    return [];
  }
}

export function createWorktreeService(
  resolveProjectPath: (id: string) => string | undefined,
): WorktreeService {
  return {
    async createWorktree(repoPath, worktreePath, branch) {
      if (!existsSync(repoPath)) {
        throw new Error(`Repository path does not exist: ${repoPath}`);
      }

      // Ensure parent directory exists
      const parentDir = join(worktreePath, '..');
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }

      const git = simpleGit(repoPath);
      await git.raw(['worktree', 'add', worktreePath, branch]);

      const projectId = basename(repoPath);

      return {
        id: uuid(),
        projectId,
        path: worktreePath,
        branch,
        createdAt: new Date().toISOString(),
      };
    },

    async removeWorktree(repoPath, worktreePath) {
      if (!existsSync(repoPath)) {
        throw new Error(`Repository path does not exist: ${repoPath}`);
      }

      const git = simpleGit(repoPath);
      await git.raw(['worktree', 'remove', worktreePath, '--force']);
      return { success: true };
    },

    listWorktrees(projectId) {
      const projectPath = resolveProjectPath(projectId);
      if (!projectPath) return [];
      return deriveWorktrees(projectPath, projectId);
    },

    linkToTask(_worktreeId, _taskId) {
      // Task linkage is ephemeral — worktrees are derived from git, not stored.
    },
  };
}
