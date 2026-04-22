/**
 * useConflictResolver — Logic hook for ConflictResolver
 */

import { useState } from 'react';

import { useDarkMode } from '@renderer/shared/hooks/useDarkMode';
import { useFileLang } from '@renderer/shared/hooks/useFileLangMap';

import { useMergeConflicts } from '../../api/useMerge';

export { useFileLang as getFileLang };

export interface ConflictFileStatus {
  resolved: boolean;
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

  const isDark = useDarkMode();

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
