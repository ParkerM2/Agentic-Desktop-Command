/**
 * useConflictResolver — Logic hook for ConflictResolver
 */

import { useMemo, useState } from 'react';

import { useThemeStore } from '@renderer/shared/stores/theme-store';

import { useMergeConflicts } from '../../api/useMerge';

export interface ConflictFileStatus {
  resolved: boolean;
}

export function getFileLang(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    html: 'xml',
    md: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
  };
  return langMap[ext] ?? 'plaintext';
}

interface UseConflictResolverParams {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
}

export function useConflictResolver({ repoPath, sourceBranch, targetBranch }: UseConflictResolverParams) {
  const {
    data: conflicts,
    isLoading,
    error,
  } = useMergeConflicts(repoPath, sourceBranch, targetBranch);
  const [fileStatuses, setFileStatuses] = useState<Record<string, ConflictFileStatus>>({});
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const themeMode = useThemeStore((s) => s.mode);
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeMode === 'dark';
  }, [themeMode]);

  function handleMarkResolved(file: string): void {
    setFileStatuses((prev) => ({
      ...prev,
      [file]: { resolved: true },
    }));
  }

  function handleToggleExpand(file: string): void {
    setExpandedFile((prev) => (prev === file ? null : file));
  }

  function handleAcceptOurs(file: string): void {
    handleMarkResolved(file);
  }

  function handleAcceptTheirs(file: string): void {
    handleMarkResolved(file);
  }

  const resolvedCount = Object.values(fileStatuses).filter((s) => s.resolved).length;
  const allResolved = conflicts !== undefined && conflicts.length > 0 && resolvedCount === conflicts.length;

  return {
    conflicts,
    isLoading,
    error,
    fileStatuses,
    expandedFile,
    isDark,
    resolvedCount,
    allResolved,
    handleMarkResolved,
    handleToggleExpand,
    handleAcceptOurs,
    handleAcceptTheirs,
  };
}
