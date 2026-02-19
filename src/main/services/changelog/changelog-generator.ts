/**
 * Changelog Generator — Git-based changelog generation
 *
 * Parses git history and generates changelog entries from conventional commits.
 */

import { existsSync } from 'node:fs';

import simpleGit from 'simple-git';

import type { ChangeCategory, ChangelogEntry, ChangeType, CommitInfo } from '@shared/types';

import { serviceLogger } from '@main/lib/logger';

/**
 * Get sorted list of git tags (most recent first)
 */
export async function getGitTags(repoPath: string): Promise<string[]> {
  validateRepoPath(repoPath);
  const git = simpleGit(repoPath);

  // Get tags sorted by date descending
  const result = await git.tags(['--sort=-creatordate']);
  return result.all;
}

/**
 * Get commits between two tags (or from tag to HEAD if toTag not specified)
 */
export async function getCommitsBetweenTags(
  repoPath: string,
  fromTag: string,
  toTag?: string,
): Promise<CommitInfo[]> {
  validateRepoPath(repoPath);
  const git = simpleGit(repoPath);

  // Build the revision range for logging
  const range = toTag ? `${fromTag}..${toTag}` : `${fromTag}..HEAD`;

  try {
    const log = await git.log({
      from: fromTag,
      to: toTag ?? 'HEAD',
    });

    return log.all.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      date: commit.date,
    }));
  } catch (error) {
    // If range fails, try getting all commits from the tag
    serviceLogger.warn(`[ChangelogGenerator] Failed to get commits for range ${range}:`, error);
    return [];
  }
}

/**
 * Get all commits since a specific tag (or all commits if no tag specified)
 */
export async function getCommitsSinceTag(
  repoPath: string,
  fromTag?: string,
): Promise<CommitInfo[]> {
  validateRepoPath(repoPath);
  const git = simpleGit(repoPath);

  try {
    const options = fromTag ? { from: fromTag, to: 'HEAD' } : { maxCount: 100 }; // Limit if no tag specified

    const log = await git.log(options);

    return log.all.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      date: commit.date,
    }));
  } catch (error) {
    serviceLogger.warn('[ChangelogGenerator] Failed to get commits:', error);
    return [];
  }
}

/**
 * Categorize a commit message based on conventional commit prefixes
 *
 * Mapping:
 * - feat: -> 'added'
 * - fix: -> 'fixed'
 * - docs: -> 'changed'
 * - refactor: -> 'changed'
 * - perf: -> 'changed'
 * - chore: -> skip (returns null)
 * - security: -> 'security'
 * - deprecate: -> 'deprecated'
 * - remove: -> 'removed'
 * - Default (no prefix) -> 'changed'
 */
export function categorizeCommit(message: string): ChangeType | null {
  const lowerMessage = message.toLowerCase().trim();

  // Check for conventional commit prefixes
  if (lowerMessage.startsWith('feat:') || lowerMessage.startsWith('feat(')) {
    return 'added';
  }
  if (lowerMessage.startsWith('fix:') || lowerMessage.startsWith('fix(')) {
    return 'fixed';
  }
  if (lowerMessage.startsWith('docs:') || lowerMessage.startsWith('docs(')) {
    return 'changed';
  }
  if (lowerMessage.startsWith('refactor:') || lowerMessage.startsWith('refactor(')) {
    return 'changed';
  }
  if (lowerMessage.startsWith('perf:') || lowerMessage.startsWith('perf(')) {
    return 'changed';
  }
  if (lowerMessage.startsWith('chore:') || lowerMessage.startsWith('chore(')) {
    // Skip chore commits
    return null;
  }
  if (lowerMessage.startsWith('security:') || lowerMessage.startsWith('security(')) {
    return 'security';
  }
  if (lowerMessage.startsWith('deprecate:') || lowerMessage.startsWith('deprecate(')) {
    return 'deprecated';
  }
  if (lowerMessage.startsWith('remove:') || lowerMessage.startsWith('remove(')) {
    return 'removed';
  }
  // Also check for common variations
  if (lowerMessage.startsWith('breaking:') || lowerMessage.startsWith('breaking(')) {
    return 'changed';
  }
  if (lowerMessage.startsWith('style:') || lowerMessage.startsWith('style(')) {
    // Skip style commits (formatting only)
    return null;
  }
  if (lowerMessage.startsWith('test:') || lowerMessage.startsWith('test(')) {
    // Skip test commits
    return null;
  }
  if (lowerMessage.startsWith('ci:') || lowerMessage.startsWith('ci(')) {
    // Skip CI commits
    return null;
  }
  if (lowerMessage.startsWith('build:') || lowerMessage.startsWith('build(')) {
    // Skip build commits
    return null;
  }

  // Default: include as 'changed'
  return 'changed';
}

/**
 * Clean a commit message by removing the conventional commit prefix
 */
function cleanCommitMessage(message: string): string {
  // Remove conventional commit prefix (e.g., "feat: ", "fix(scope): ")
  const cleanedMessage = message.replace(/^[a-z]+(\([^)]+\))?:\s*/i, '');

  // Capitalize first letter
  return cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
}

/**
 * Generate a changelog entry from git commits
 */
export async function generateChangelogEntry(
  repoPath: string,
  version: string,
  fromTag?: string,
): Promise<ChangelogEntry> {
  // Get commits
  const commits = fromTag
    ? await getCommitsSinceTag(repoPath, fromTag)
    : await getCommitsSinceTag(repoPath);

  // Group commits by category
  const categoryMap = new Map<ChangeType, string[]>();

  for (const commit of commits) {
    const category = categorizeCommit(commit.message);
    if (category === null) {
      // Skip this commit (chore, style, test, ci, build)
      continue;
    }

    const items = categoryMap.get(category) ?? [];
    items.push(cleanCommitMessage(commit.message));
    categoryMap.set(category, items);
  }

  // Build categories array in a consistent order
  const categoryOrder: ChangeType[] = [
    'added',
    'changed',
    'fixed',
    'removed',
    'security',
    'deprecated',
  ];
  const categories: ChangeCategory[] = [];

  for (const type of categoryOrder) {
    const items = categoryMap.get(type);
    if (items && items.length > 0) {
      // Remove duplicates
      const uniqueItems = [...new Set(items)];
      categories.push({ type, items: uniqueItems });
    }
  }

  // Format the date
  const now = new Date();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const date = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return {
    version,
    date,
    categories,
  };
}

/**
 * Validate that the repository path exists
 */
function validateRepoPath(repoPath: string): void {
  if (!existsSync(repoPath)) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }
}
