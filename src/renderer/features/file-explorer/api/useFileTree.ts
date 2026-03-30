/**
 * React Query hook for fetching file tree data via IPC
 *
 * Currently uses `projects.analyzeCodebase` as a placeholder.
 * Will be wired to a dedicated `files.listTree` IPC channel once
 * the backend service is implemented.
 */

import { useQuery } from '@tanstack/react-query';

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

// ─── Placeholder data for initial development ──────────────────

function createPlaceholderTree(): FileTreeNode[] {
  return [
    {
      id: 'src',
      name: 'src',
      isDirectory: true,
      extension: null,
      isModified: false,
      children: [
        {
          id: 'src/main',
          name: 'main',
          isDirectory: true,
          extension: null,
          isModified: false,
          children: [
            {
              id: 'src/main/index.ts',
              name: 'index.ts',
              isDirectory: false,
              extension: 'ts',
              isModified: true,
              children: null,
            },
          ],
        },
        {
          id: 'src/renderer',
          name: 'renderer',
          isDirectory: true,
          extension: null,
          isModified: false,
          children: [
            {
              id: 'src/renderer/App.tsx',
              name: 'App.tsx',
              isDirectory: false,
              extension: 'tsx',
              isModified: false,
              children: null,
            },
          ],
        },
      ],
    },
    {
      id: 'package.json',
      name: 'package.json',
      isDirectory: false,
      extension: 'json',
      isModified: true,
      children: null,
    },
    {
      id: 'tsconfig.json',
      name: 'tsconfig.json',
      isDirectory: false,
      extension: 'json',
      isModified: false,
      children: null,
    },
    {
      id: 'README.md',
      name: 'README.md',
      isDirectory: false,
      extension: 'md',
      isModified: false,
      children: null,
    },
  ];
}

// ─── Hook ──────────────────────────────────────────────────────

/**
 * Fetches the file tree for a given project path.
 *
 * When the backend `files.listTree` IPC channel is available,
 * replace the placeholder with: `ipc('files.listTree', { projectPath })`
 */
export function useFileTree(projectPath: string | null) {
  return useQuery({
    queryKey: fileExplorerKeys.tree(projectPath ?? ''),
    queryFn: (): Promise<FileTreeNode[]> => {
      // TODO: Replace with IPC call when backend service is ready
      // return ipc('files.listTree', { projectPath: projectPath ?? '' });
      return Promise.resolve(createPlaceholderTree());
    },
    enabled: projectPath !== null,
    staleTime: 30_000,
  });
}
