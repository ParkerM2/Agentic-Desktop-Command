/**
 * MergePreviewPanel — Displays diff summary and file changes for a merge
 */

import { FileText, Loader2, Minus, Plus } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useMergeDiff } from '../api/useMerge';

interface MergePreviewPanelProps {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
}

export function MergePreviewPanel({
  repoPath,
  sourceBranch,
  targetBranch,
}: MergePreviewPanelProps) {
  const { data: diff, isLoading, error } = useMergeDiff(repoPath, sourceBranch, targetBranch);

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
      <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-400">
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
    <div className="space-y-4">
      {/* Summary stats */}
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

      {/* File list */}
      {diff.files.length > 0 ? (
        <div className="border-border max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
          {diff.files.map((file) => (
            <div
              key={file.file}
              className={cn(
                'flex items-center justify-between rounded px-2 py-1.5 text-sm',
                'hover:bg-muted/50',
              )}
            >
              <span className="text-foreground truncate font-mono text-xs">{file.file}</span>
              <div className="flex items-center gap-2 text-xs">
                {file.binary ? (
                  <span className="text-muted-foreground">binary</span>
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
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground border-border rounded-md border p-4 text-center text-sm">
          No file changes detected
        </div>
      )}
    </div>
  );
}
