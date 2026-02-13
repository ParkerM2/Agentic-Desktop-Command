/**
 * Changelog-related types
 */

export type ChangeType = 'added' | 'changed' | 'fixed' | 'removed' | 'security' | 'deprecated';

export interface ChangeCategory {
  type: ChangeType;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  categories: ChangeCategory[];
}

/**
 * Git commit info for changelog generation
 */
export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}
