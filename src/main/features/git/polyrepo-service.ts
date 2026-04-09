/**
 * Polyrepo Service — Multi-repo and monorepo structure detection
 *
 * Scans a project directory to detect its repository structure:
 * - single: standard single git repo
 * - monorepo: workspace-based (Nx, Turborepo, Lerna, pnpm workspaces)
 * - polyrepo: multiple nested git repos
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import { v4 as uuid } from 'uuid';

import type { DetectedSubProject, RepoStructure } from '@shared/types';

export interface PolyrepoService {
  detectStructure: (repoPath: string) => RepoStructure;
  listSubprojects: (repoPath: string) => DetectedSubProject[];
}

/** Check if a directory contains a package.json */
function hasPackageJson(dirPath: string): boolean {
  return existsSync(join(dirPath, 'package.json'));
}

/** Read package.json name field */
function readPackageName(dirPath: string): string {
  try {
    const raw = readFileSync(join(dirPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as { name?: string };
    return pkg.name ?? basename(dirPath);
  } catch {
    return basename(dirPath);
  }
}

/** Scan workspace directories for subprojects */
function scanWorkspaceDir(repoPath: string, dirName: string): DetectedSubProject[] {
  const dirPath = join(repoPath, dirName);
  if (!existsSync(dirPath)) return [];

  const subprojects: DetectedSubProject[] = [];

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subPath = join(dirPath, entry.name);
        if (hasPackageJson(subPath)) {
          subprojects.push({
            id: uuid(),
            name: readPackageName(subPath),
            relativePath: `${dirName}/${entry.name}`,
          });
        }
      }
    }
  } catch {
    // Directory read failed
  }

  return subprojects;
}

/** Check if a directory entry is a visible subdirectory */
function isVisibleSubdir(entry: { isDirectory: () => boolean; name: string }): boolean {
  return entry.isDirectory() && entry.name !== '.git' && !entry.name.startsWith('.');
}

/** Check if a path is a nested git repository */
function isNestedGitRepo(repoPath: string, dirName: string): boolean {
  try {
    return statSync(join(repoPath, dirName, '.git')).isDirectory();
  } catch {
    return false;
  }
}

/** Scan for nested git repos and return as subprojects */
function scanNestedGitRepos(repoPath: string): DetectedSubProject[] {
  const subprojects: DetectedSubProject[] = [];

  try {
    const entries = readdirSync(repoPath, { withFileTypes: true });
    for (const entry of entries) {
      if (isVisibleSubdir(entry) && isNestedGitRepo(repoPath, entry.name)) {
        subprojects.push({
          id: uuid(),
          name: entry.name,
          relativePath: entry.name,
        });
      }
    }
  } catch {
    // Directory read failed
  }

  return subprojects;
}

/** Check for any monorepo config file */
function hasMonorepoConfig(repoPath: string): boolean {
  const monorepoConfigs = ['lerna.json', 'nx.json', 'turbo.json', 'pnpm-workspace.yaml'];
  return monorepoConfigs.some((config) => existsSync(join(repoPath, config)));
}

/** Check for workspace directories (packages/, apps/, services/) */
function hasWorkspaceDirs(repoPath: string): boolean {
  const dirs = ['packages', 'apps', 'services'];
  return dirs.some((dir) => existsSync(join(repoPath, dir)));
}

/** Check for nested git repos */
function hasNestedGitRepos(repoPath: string): boolean {
  try {
    const entries = readdirSync(repoPath, { withFileTypes: true });
    return entries.some((entry) => isVisibleSubdir(entry) && isNestedGitRepo(repoPath, entry.name));
  } catch {
    return false;
  }
}

export function createPolyrepoService(): PolyrepoService {
  return {
    detectStructure(repoPath) {
      if (!existsSync(repoPath)) {
        throw new Error(`Path does not exist: ${repoPath}`);
      }

      if (hasMonorepoConfig(repoPath) || hasWorkspaceDirs(repoPath)) {
        return 'monorepo';
      }

      if (hasNestedGitRepos(repoPath)) {
        return 'polyrepo';
      }

      return 'single';
    },

    listSubprojects(repoPath) {
      if (!existsSync(repoPath)) {
        throw new Error(`Path does not exist: ${repoPath}`);
      }

      const structure = this.detectStructure(repoPath);

      if (structure === 'monorepo') {
        const workspaceDirs = ['packages', 'apps', 'services'];
        return workspaceDirs.flatMap((dir) => scanWorkspaceDir(repoPath, dir));
      }

      if (structure === 'polyrepo') {
        return scanNestedGitRepos(repoPath);
      }

      return [];
    },
  };
}
