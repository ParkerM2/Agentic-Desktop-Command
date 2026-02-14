/**
 * Project Detector — Analyzes repo structure for a given root path
 *
 * Detects whether a directory is a single repo, monorepo, multi-repo, or none.
 * All operations are synchronous per service pattern.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { ChildRepo, RepoDetectionResult } from '@shared/types';

/** Parse git remote URL from a .git/config file */
function parseGitRemoteUrl(gitDir: string): string | undefined {
  const configPath = join(gitDir, 'config');
  if (!existsSync(configPath)) return;

  try {
    const content = readFileSync(configPath, 'utf-8');
    const remoteMatch = /\[remote "origin"]\s*\n(?:\s+\w+\s*=.*\n)*?\s+url\s*=\s*(.+)/m.exec(
      content,
    );
    return remoteMatch?.[1]?.trim();
  } catch {
    return;
  }
}

/** Parse default branch from .git/HEAD */
function parseDefaultBranch(gitDir: string): string | undefined {
  const headPath = join(gitDir, 'HEAD');
  if (!existsSync(headPath)) return;

  try {
    const content = readFileSync(headPath, 'utf-8').trim();
    const refMatch = /^ref:\s*refs\/heads\/(.+)$/.exec(content);
    return refMatch?.[1];
  } catch {
    return;
  }
}

/** Check if a directory has monorepo indicators */
function hasMonorepoIndicators(rootPath: string): boolean {
  // Check package.json for workspaces field
  const packageJsonPath = join(rootPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (parsed.workspaces !== undefined) return true;
    } catch {
      // Not valid JSON — skip
    }
  }

  // Check for pnpm-workspace.yaml
  if (existsSync(join(rootPath, 'pnpm-workspace.yaml'))) return true;

  // Check for lerna.json
  if (existsSync(join(rootPath, 'lerna.json'))) return true;

  return false;
}

/** Scan immediate child directories for .git directories */
function findChildRepos(rootPath: string): ChildRepo[] {
  const children: ChildRepo[] = [];

  try {
    const entries = readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      const childPath = join(rootPath, entry.name);
      const childGitDir = join(childPath, '.git');

      if (existsSync(childGitDir)) {
        const gitUrl = parseGitRemoteUrl(childGitDir);
        children.push({
          name: entry.name,
          path: childPath,
          relativePath: relative(rootPath, childPath),
          gitUrl,
        });
      }
    }
  } catch {
    // Cannot read directory — return empty
  }

  return children;
}

/**
 * Detect repository structure for a given root path.
 *
 * Returns sync value per service pattern.
 */
export function detectRepoStructure(rootPath: string): RepoDetectionResult {
  const rootGitDir = join(rootPath, '.git');
  const hasRootGit = existsSync(rootGitDir);
  const childRepos = findChildRepos(rootPath);
  const hasChildren = childRepos.length > 0;

  // Determine git URL and default branch from root
  const gitUrl = hasRootGit ? parseGitRemoteUrl(rootGitDir) : undefined;
  const defaultBranch = hasRootGit ? parseDefaultBranch(rootGitDir) : undefined;

  // Determine repo type
  let repoType: RepoDetectionResult['repoType'];
  if (!hasRootGit && !hasChildren) {
    repoType = 'none';
  } else if (hasRootGit && hasMonorepoIndicators(rootPath)) {
    repoType = 'monorepo';
  } else if (hasChildren) {
    repoType = 'multi-repo';
  } else {
    repoType = 'single';
  }

  return {
    isGitRepo: hasRootGit,
    repoType,
    gitUrl,
    defaultBranch,
    childRepos,
  };
}
