/**
 * Worktree Service — Git worktree lifecycle management
 *
 * Worktrees are created in a .worktrees/ directory inside the project.
 * Metadata is persisted to dataDir/worktrees.json for tracking.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { app } from 'electron';

import simpleGit from 'simple-git';
import { v4 as uuid } from 'uuid';

import type { Worktree } from '@shared/types';

export interface WorktreeService {
  createWorktree: (repoPath: string, worktreePath: string, branch: string) => Promise<Worktree>;
  removeWorktree: (repoPath: string, worktreePath: string) => Promise<{ success: boolean }>;
  listWorktrees: (projectId: string) => Worktree[];
  linkToTask: (worktreeId: string, taskId: string) => void;
}

/** Path to worktrees metadata JSON */
function getWorktreesFilePath(): string {
  return join(app.getPath('userData'), 'worktrees.json');
}

/** Load worktree metadata from disk */
function loadWorktrees(): Map<string, Worktree> {
  const filePath = getWorktreesFilePath();
  const worktrees = new Map<string, Worktree>();
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const arr = JSON.parse(raw) as unknown as Worktree[];
      for (const wt of arr) {
        worktrees.set(wt.id, wt);
      }
    } catch {
      // Corrupted file — start fresh
    }
  }
  return worktrees;
}

/** Save worktree metadata to disk */
function saveWorktrees(worktrees: Map<string, Worktree>): void {
  const filePath = getWorktreesFilePath();
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const arr = Array.from(worktrees.values());
  writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf-8');
}

export function createWorktreeService(
  resolveProjectPath: (id: string) => string | undefined,
): WorktreeService {
  const worktrees = loadWorktrees();

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

      const id = uuid();
      const now = new Date().toISOString();

      // Derive projectId from repoPath by finding matching project
      const projectId = basename(repoPath);

      const worktree: Worktree = {
        id,
        projectId,
        path: worktreePath,
        branch,
        createdAt: now,
      };

      worktrees.set(id, worktree);
      saveWorktrees(worktrees);
      return worktree;
    },

    async removeWorktree(repoPath, worktreePath) {
      if (!existsSync(repoPath)) {
        throw new Error(`Repository path does not exist: ${repoPath}`);
      }

      const git = simpleGit(repoPath);
      await git.raw(['worktree', 'remove', worktreePath, '--force']);

      // Remove from metadata
      for (const [id, wt] of worktrees) {
        if (wt.path === worktreePath) {
          worktrees.delete(id);
          break;
        }
      }
      saveWorktrees(worktrees);
      return { success: true };
    },

    listWorktrees(projectId) {
      const projectPath = resolveProjectPath(projectId);
      if (!projectPath) return [];

      const result: Worktree[] = [];
      for (const wt of worktrees.values()) {
        if (wt.projectId === projectId) {
          result.push(wt);
        }
      }
      return result;
    },

    linkToTask(worktreeId, taskId) {
      const wt = worktrees.get(worktreeId);
      if (!wt) {
        throw new Error(`Worktree not found: ${worktreeId}`);
      }
      wt.taskId = taskId;
      saveWorktrees(worktrees);
    },
  };
}
