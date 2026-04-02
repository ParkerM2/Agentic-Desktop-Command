/**
 * React Query hook for fetching file tree data via IPC
 *
 * Calls `files.listTree` to get the directory tree from the main process.
 */

import { useQuery } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { fileExplorerKeys } from './queryKeys';

// ─── File Tree Node Type ───────────────────────────────────────

/** Represents a single node in the file tree */
export interface FileTreeNode {
  /** Unique identifier (relative path from project root) */
  id: string;
  /** Display name (file or folder name) */
  name: string;
  /** Whether this node is a directory */
  isDirectory: boolean;
  /** Child nodes (null for files) */
  children: FileTreeNode[] | null;
  /** File extension (without dot), null for directories */
  extension: string | null;
  /** Whether this file has been modified (git status) */
  isModified: boolean;
}

// ─── Hook ──────────────────────────────────────────────────────

/**
 * Fetches the file tree for a given project path.
 */
export function useFileTree(projectPath: string | null) {
  return useQuery({
    queryKey: fileExplorerKeys.tree(projectPath ?? ''),
    queryFn: () => ipc('files.listTree', { path: projectPath ?? '' }),
    enabled: projectPath !== null,
    staleTime: 30_000,
  });
}
