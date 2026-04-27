/**
 * File Tree Service — reads a directory tree for the file explorer
 *
 * Synchronous per service pattern. Max depth to prevent traversal of huge repos.
 */

import { readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';

// ─── Constants ──────────────────────────────────────────────

const MAX_DEPTH = 4;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'target',
  '__pycache__',
  '.venv',
  '.worktrees',
  'coverage',
]);

// ─── Types ──────────────────────────────────────────────────

export interface FileTreeNode {
  id: string;
  name: string;
  isDirectory: boolean;
  children: FileTreeNode[] | null;
  extension: string | null;
  isModified: boolean;
}

export interface FileTreeService {
  listTree: (rootPath: string) => FileTreeNode[];
}

// ─── Service Factory ────────────────────────────────────────

export function createFileTreeService(): FileTreeService {
  function readDir(dirPath: string, rootPath: string, depth: number): FileTreeNode[] {
    if (depth > MAX_DEPTH) return [];

    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch {
      return [];
    }

    const nodes: FileTreeNode[] = [];

    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.env.example') continue;
      if (SKIP_DIRS.has(entry)) continue;

      const fullPath = join(dirPath, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      const id = relative(rootPath, fullPath);
      const isDir = stat.isDirectory();
      const ext = isDir ? null : extname(entry).slice(1) || null;

      nodes.push({
        id,
        name: basename(fullPath),
        isDirectory: isDir,
        extension: ext,
        isModified: false,
        children: isDir ? readDir(fullPath, rootPath, depth + 1) : null,
      });
    }

    // Sort: directories first, then alphabetically
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  return {
    listTree(rootPath: string): FileTreeNode[] {
      return readDir(rootPath, rootPath, 0);
    },
  };
}
