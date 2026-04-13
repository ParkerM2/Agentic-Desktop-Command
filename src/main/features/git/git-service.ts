/**
 * Git Service — Core git operations via simple-git
 *
 * All methods are async because git commands are async.
 * Uses simple-git library for all git operations (no raw process spawning).
 * PR creation uses the GitHub CLI (`gh`).
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';

import simpleGit from 'simple-git';

import type { GitBranch, GitStatus, RepoStructure } from '@shared/types';
import type { GitCommit } from '@shared/ipc/git/schemas';

import { serviceLogger } from '@main/lib/logger';

import type { PolyrepoService } from './polyrepo-service';

// ─── Types ────────────────────────────────────────────────────

export interface GitCommitResult {
  hash: string;
  message: string;
}

export interface GitPushResult {
  success: boolean;
  remote: string;
  branch: string;
}

export interface GitResolveConflictResult {
  success: boolean;
  filePath: string;
}

export interface GitCreatePrResult {
  url: string;
  number: number;
  title: string;
}

export interface GitService {
  getStatus: (repoPath: string) => Promise<GitStatus>;
  listBranches: (repoPath: string) => Promise<GitBranch[]>;
  createBranch: (
    repoPath: string,
    branchName: string,
    baseBranch?: string,
  ) => Promise<{ success: boolean }>;
  switchBranch: (repoPath: string, branchName: string) => Promise<void>;
  detectStructure: (repoPath: string) => Promise<RepoStructure>;
  initRepo: (repoPath: string) => Promise<void>;
  initialCommit: (repoPath: string, message: string) => Promise<void>;
  commit: (
    projectPath: string,
    message: string,
    files?: string[],
  ) => Promise<GitCommitResult>;
  push: (
    projectPath: string,
    remote?: string,
    branch?: string,
  ) => Promise<GitPushResult>;
  resolveConflict: (
    projectPath: string,
    filePath: string,
    strategy: 'ours' | 'theirs',
  ) => Promise<GitResolveConflictResult>;
  createPr: (
    projectPath: string,
    title: string,
    body: string,
    baseBranch: string,
    headBranch: string,
  ) => Promise<GitCreatePrResult>;
  /** Get files changed on a branch (vs its merge-base with the default branch) */
  getFilesChanged: (
    repoPath: string,
    branch?: string,
  ) => Promise<GitFileChange[]>;
  /** Get the URL for a named remote (defaults to 'origin') */
  getRemoteUrl: (
    repoPath: string,
    remote?: string,
  ) => Promise<string>;
  /** List commit history for a repo, optionally scoped to a branch */
  listCommits: (params: {
    repoPath: string;
    branch?: string;
    limit?: number;
  }) => Promise<GitCommit[]>;
}

export interface GitFileChange {
  path: string;
  status: 'A' | 'M' | 'D';
  additions: number;
  deletions: number;
}

const GH_CLI_TIMEOUT_MS = 30_000;
const GH_CLI_MAX_BUFFER = 1_048_576; // 1 MB
const GIT_TIMEOUT_MS = 15_000;
const GIT_LOG_FORMAT = '%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%aI';
const GIT_LOG_DEFAULT_LIMIT = 50;

function validateRepoPath(repoPath: string): void {
  if (!existsSync(repoPath)) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }
}

/** Run the GitHub CLI (`gh`) with the given arguments in the specified directory. */
function runGhCli(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'gh',
      args,
      {
        cwd,
        timeout: GH_CLI_TIMEOUT_MS,
        maxBuffer: GH_CLI_MAX_BUFFER,
        shell: platform() === 'win32',
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim() || error.message;
          reject(new Error(`gh CLI failed: ${detail}`));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

/** Run git with the given arguments in the specified directory. */
function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      {
        cwd,
        timeout: GIT_TIMEOUT_MS,
        maxBuffer: GH_CLI_MAX_BUFFER,
        shell: platform() === 'win32',
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim() || error.message;
          reject(new Error(`git failed: ${detail}`));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

export function createGitService(polyrepoService: PolyrepoService): GitService {
  return {
    async getStatus(repoPath) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);
      const status = await git.status();
      return {
        branch: status.current ?? 'unknown',
        isClean: status.isClean(),
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        modified: status.modified,
        untracked: status.not_added,
      };
    },

    async listBranches(repoPath) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);
      const summary = await git.branchLocal();
      return Object.entries(summary.branches).map(([name, info]) => ({
        name,
        current: info.current,
        lastCommit: info.label,
      }));
    },

    async createBranch(repoPath, branchName, baseBranch) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);
      await (baseBranch
        ? git.checkoutBranch(branchName, baseBranch)
        : git.checkoutLocalBranch(branchName));
      return { success: true };
    },

    async switchBranch(repoPath, branchName) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);
      await git.checkout(branchName);
    },

    detectStructure(repoPath) {
      validateRepoPath(repoPath);
      return Promise.resolve(polyrepoService.detectStructure(repoPath));
    },

    async initRepo(repoPath) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);
      await git.init();
    },

    async initialCommit(repoPath, message) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);
      await git.add('.');
      await git.commit(message);
    },

    async commit(projectPath, message, files) {
      validateRepoPath(projectPath);
      const git = simpleGit(projectPath);

      // Stage specified files, or all changes if none specified
      await git.add(files && files.length > 0 ? files : '.');

      const result = await git.commit(message);
      serviceLogger.info(`[GitService] Committed: ${result.commit} "${message}"`);

      return {
        hash: result.commit,
        message,
      };
    },

    async push(projectPath, remote, branch) {
      validateRepoPath(projectPath);
      const git = simpleGit(projectPath);

      const targetRemote = remote ?? 'origin';
      const status = await git.status();
      const targetBranch = branch ?? status.current ?? 'main';

      await git.push(targetRemote, targetBranch);
      serviceLogger.info(`[GitService] Pushed ${targetBranch} to ${targetRemote}`);

      return {
        success: true,
        remote: targetRemote,
        branch: targetBranch,
      };
    },

    async resolveConflict(projectPath, filePath, strategy) {
      validateRepoPath(projectPath);
      const git = simpleGit(projectPath);

      // Use git checkout --ours/--theirs to resolve the conflict
      await git.checkout([`--${strategy}`, '--', filePath]);

      // Stage the resolved file
      await git.add(filePath);
      serviceLogger.info(`[GitService] Resolved conflict in ${filePath} using "${strategy}"`);

      return {
        success: true,
        filePath,
      };
    },

    async createPr(projectPath, title, body, baseBranch, headBranch) {
      validateRepoPath(projectPath);

      const output = await runGhCli(
        [
          'pr', 'create',
          '--title', title,
          '--body', body,
          '--base', baseBranch,
          '--head', headBranch,
        ],
        projectPath,
      );

      // gh pr create outputs the PR URL on success
      const url = output.trim();

      // Extract PR number from URL (e.g., https://github.com/owner/repo/pull/42)
      const numberMatch = /\/pull\/(\d+)/.exec(url);
      const prNumber = numberMatch ? Number(numberMatch[1]) : 0;

      serviceLogger.info(`[GitService] Created PR #${String(prNumber)}: ${title}`);

      return {
        url,
        number: prNumber,
        title,
      };
    },

    async getFilesChanged(repoPath, branch) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);

      const status = await git.status();
      const targetBranch = branch ?? status.current ?? 'HEAD';

      // Get diff summary against the merge-base with main/master
      const diffSummary = await git.diffSummary([targetBranch]);

      return diffSummary.files.map((f) => {
        let fileStatus: 'A' | 'M' | 'D' = 'M';
        const df = f as { file: string; changes: number; insertions: number; deletions: number; binary: boolean };
        if (df.insertions > 0 && df.deletions === 0) {
          fileStatus = 'A';
        } else if (df.insertions === 0 && df.deletions > 0 && df.changes === df.deletions) {
          fileStatus = 'D';
        }

        return {
          path: f.file,
          status: fileStatus,
          additions: df.insertions,
          deletions: df.deletions,
        };
      });
    },

    async getRemoteUrl(repoPath, remote) {
      validateRepoPath(repoPath);
      const git = simpleGit(repoPath);
      const targetRemote = remote ?? 'origin';
      const remotes = await git.getRemotes(true);
      const found = remotes.find((r) => r.name === targetRemote);
      return found?.refs.fetch ?? '';
    },

    async listCommits({ repoPath, branch, limit }) {
      validateRepoPath(repoPath);
      const n = limit ?? GIT_LOG_DEFAULT_LIMIT;
      const args = ['log', `--format=${GIT_LOG_FORMAT}`, `-n`, String(n)];
      if (branch !== undefined) {
        args.push(branch);
      }

      let stdout: string;
      try {
        stdout = await runGit(args, repoPath);
      } catch (err) {
        // Empty repo or no commits — git log exits non-zero; return empty array
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('does not have any commits') || message.includes('fatal:')) {
          serviceLogger.info(`[GitService] listCommits: no commits found in ${repoPath}`);
          return [];
        }
        throw err;
      }

      const lines = stdout.trim().split('\n').filter(Boolean);
      return lines.map((line) => {
        const [hash, shortHash, message, author, authorEmail, date] = line.split('\x1f');
        return {
          hash: hash ?? '',
          shortHash: shortHash ?? '',
          message: message ?? '',
          author: author ?? '',
          authorEmail: authorEmail ?? '',
          date: date ?? '',
        };
      });
    },
  };
}
