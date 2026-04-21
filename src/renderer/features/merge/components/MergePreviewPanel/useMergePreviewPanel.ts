/**
 * useMergePreviewPanel — Logic hook for MergePreviewPanel
 */

import { useMemo, useState } from 'react';

import { DiffModeEnum } from '@git-diff-view/react';

import { useThemeStore } from '@renderer/shared/stores/theme-store';

import { useFileDiff, useMergeDiff } from '../../api/useMerge';

export function getFileLang(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'xml',
    xml: 'xml',
    md: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    sql: 'sql',
    graphql: 'graphql',
    swift: 'swift',
    kt: 'kotlin',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    lua: 'lua',
    r: 'r',
    toml: 'ini',
    ini: 'ini',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
  };
  return langMap[ext] ?? 'plaintext';
}

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

  const themeMode = useThemeStore((s) => s.mode);
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeMode === 'dark';
  }, [themeMode]);

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
