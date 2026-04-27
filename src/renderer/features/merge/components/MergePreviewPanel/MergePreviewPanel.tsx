/**
 * MergePreviewPanel — GitHub-style diff viewer with file sidebar and @git-diff-view/react
 *
 * Layout:
 * - Left sidebar: scrollable file list with per-file +/- stats
 * - Main area: DiffView for the selected file (split or unified)
 * - Top toolbar: view mode toggle + summary bar
 */

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

import { Button, ScrollArea } from '@ui';

import { FileDiffViewer } from '../FileDiffViewer';

import {
  getFileDir,
  getFileLang,
  getFileName,
  useMergePreviewPanel,
} from './useMergePreviewPanel';

interface MergePreviewPanelProps {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
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
  const {
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
  } = useMergePreviewPanel({ repoPath, sourceBranch, targetBranch });

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
          <Button
            aria-label="Split view"
            size="icon"
            variant="ghost"
            className={cn(
              'h-auto rounded px-2 py-1 text-xs',
              isSplit ? 'bg-muted text-foreground' : 'text-muted-foreground',
            )}
            onClick={() => setViewMode(DiffModeEnum.SplitGitHub)}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            aria-label="Unified view"
            size="icon"
            variant="ghost"
            className={cn(
              'h-auto rounded px-2 py-1 text-xs',
              isSplit ? 'text-muted-foreground' : 'bg-muted text-foreground',
            )}
            onClick={() => setViewMode(DiffModeEnum.Unified)}
          >
            <Rows2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main content: sidebar + diff viewer */}
      <div className="flex min-h-0 flex-1">
        {/* File list sidebar */}
        <ScrollArea className="border-border w-64 shrink-0 border-r">
          {diff.files.length > 0 ? (
            <div className="py-1">
              {diff.files.map((file) => (
                <Button
                  key={file.file}
                  variant="ghost"
                  className={cn(
                    'flex h-auto w-full items-center justify-between px-3 py-1.5 text-left text-xs',
                    selectedFile === file.file
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground',
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
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground p-4 text-center text-xs">
              No file changes detected
            </div>
          )}
        </ScrollArea>

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
