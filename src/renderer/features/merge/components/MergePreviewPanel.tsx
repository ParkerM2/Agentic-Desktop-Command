/**
 * MergePreviewPanel — GitHub-style diff viewer with file sidebar and @git-diff-view/react
 *
 * Layout:
 * - Left sidebar: scrollable file list with per-file +/- stats
 * - Main area: DiffView for the selected file (split or unified)
 * - Top toolbar: view mode toggle + summary bar
 */

import { useMemo, useState } from 'react';

import { DiffModeEnum } from '@git-diff-view/react';
import {
  Columns2,
  FileCode,
  FileText,
  Loader2,
  Minus,
  Plus,
  Rows2,
} from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import { useThemeStore } from '@renderer/shared/stores/theme-store';

import { useFileDiff, useMergeDiff } from '../api/useMerge';

import { FileDiffViewer } from './FileDiffViewer';

interface MergePreviewPanelProps {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
}

/** Extract a language hint from a file path for syntax highlighting */
function getFileLang(filePath: string): string {
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

/** Extract just the filename from a full path */
function getFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts.at(-1) ?? filePath;
}

/** Get the directory portion of a file path */
function getFileDir(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
}

interface DiffViewerAreaProps {
  selectedFile: string | null;
  isFileDiffLoading: boolean;
  fileDiffError: Error | null;
  fileDiffData: { diff: string; filePath: string } | null;
  isDark: boolean;
  viewMode: DiffModeEnum;
}

function DiffViewerArea({
  selectedFile,
  isFileDiffLoading,
  fileDiffError,
  fileDiffData,
  isDark,
  viewMode,
}: DiffViewerAreaProps) {
  if (selectedFile === null) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Select a file from the sidebar to view its diff
      </div>
    );
  }

  if (isFileDiffLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        <span className="text-muted-foreground ml-2 text-sm">Loading file diff...</span>
      </div>
    );
  }

  if (fileDiffError) {
    return (
      <div className="text-destructive p-4 text-sm">
        Failed to load diff: {fileDiffError.message}
      </div>
    );
  }

  if (fileDiffData) {
    return (
      <FileDiffViewer
        diffText={fileDiffData.diff}
        fileName={fileDiffData.filePath}
        isDark={isDark}
        lang={getFileLang(fileDiffData.filePath)}
        viewMode={viewMode}
      />
    );
  }

  return null;
}

export function MergePreviewPanel({
  repoPath,
  sourceBranch,
  targetBranch,
}: MergePreviewPanelProps) {
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

  // Fetch the individual file diff
  const {
    data: fileDiffData,
    isLoading: isFileDiffLoading,
    error: fileDiffError,
  } = useFileDiff(
    repoPath,
    sourceBranch,
    targetBranch,
    selectedFile ?? '',
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        <span className="text-muted-foreground ml-2 text-sm">Loading diff...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
        Failed to load diff preview: {error.message}
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">No diff data available</div>
    );
  }

  const isSplit = (viewMode & DiffModeEnum.Split) !== 0 || viewMode === DiffModeEnum.SplitGitHub;

  return (
    <div className="flex h-full flex-col">
      {/* Summary bar + view mode toggle */}
      <div className="border-border flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <FileText className="text-muted-foreground h-4 w-4" />
            <span className="text-foreground text-sm font-medium">
              {diff.changedFiles} {diff.changedFiles === 1 ? 'file' : 'files'} changed
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-emerald-400">
              <Plus className="h-3.5 w-3.5" />
              {diff.insertions}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <Minus className="h-3.5 w-3.5" />
              {diff.deletions}
            </span>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="border-border flex items-center gap-0.5 rounded-md border p-0.5">
          <button
            aria-label="Split view"
            className={cn(
              'rounded px-2 py-1 text-xs transition-colors',
              isSplit
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setViewMode(DiffModeEnum.SplitGitHub)}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Unified view"
            className={cn(
              'rounded px-2 py-1 text-xs transition-colors',
              isSplit
                ? 'text-muted-foreground hover:text-foreground'
                : 'bg-muted text-foreground',
            )}
            onClick={() => setViewMode(DiffModeEnum.Unified)}
          >
            <Rows2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main content: sidebar + diff viewer */}
      <div className="flex min-h-0 flex-1">
        {/* File list sidebar */}
        <div className="border-border w-64 shrink-0 overflow-y-auto border-r">
          {diff.files.length > 0 ? (
            <div className="py-1">
              {diff.files.map((file) => (
                <button
                  key={file.file}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-1.5 text-left text-xs',
                    'transition-colors',
                    selectedFile === file.file
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-muted/50',
                  )}
                  onClick={() => setSelectedFile(file.file)}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <FileCode className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate font-mono font-medium">
                        {getFileName(file.file)}
                      </div>
                      {getFileDir(file.file) ? (
                        <div className="text-muted-foreground truncate text-[10px]">
                          {getFileDir(file.file)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1.5">
                    {file.binary ? (
                      <span className="text-muted-foreground">bin</span>
                    ) : (
                      <>
                        {file.insertions > 0 ? (
                          <span className="text-emerald-400">+{file.insertions}</span>
                        ) : null}
                        {file.deletions > 0 ? (
                          <span className="text-red-400">-{file.deletions}</span>
                        ) : null}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground p-4 text-center text-xs">
              No file changes detected
            </div>
          )}
        </div>

        {/* Diff viewer area */}
        <div className="min-w-0 flex-1 overflow-auto">
          <DiffViewerArea
            fileDiffData={fileDiffData ?? null}
            fileDiffError={fileDiffError ?? null}
            isDark={isDark}
            isFileDiffLoading={isFileDiffLoading}
            selectedFile={selectedFile}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
}
