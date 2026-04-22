/**
 * useMergePreviewPanel — Logic hook for MergePreviewPanel
 */

import { useState } from 'react';

import { DiffModeEnum } from '@git-diff-view/react';

import { useDarkMode } from '@renderer/shared/hooks/useDarkMode';
import { useFileLang } from '@renderer/shared/hooks/useFileLangMap';

import { useFileDiff, useMergeDiff } from '../../api/useMerge';

export { useFileLang as getFileLang };

export function getFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts.at(-1) ?? filePath;
}

export function getFileDir(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
}

interface UseMergePreviewPanelParams {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
}

export function useMergePreviewPanel({ repoPath, sourceBranch, targetBranch }: UseMergePreviewPanelParams) {
  const { data: diff, isLoading, error } = useMergeDiff(repoPath, sourceBranch, targetBranch);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<DiffModeEnum>(DiffModeEnum.SplitGitHub);

  const isDark = useDarkMode();

  const {
    data: fileDiffData,
    isLoading: isFileDiffLoading,
    error: fileDiffError,
  } = useFileDiff(repoPath, sourceBranch, targetBranch, selectedFile ?? '');

  const isSplit = (viewMode & DiffModeEnum.Split) !== 0 || viewMode === DiffModeEnum.SplitGitHub;

  return {
    diff,
    isLoading,
    error,
    selectedFile,
    setSelectedFile,
    viewMode,
    setViewMode,
    isDark,
    fileDiffData,
    isFileDiffLoading,
    fileDiffError,
    isSplit,
  };
}
