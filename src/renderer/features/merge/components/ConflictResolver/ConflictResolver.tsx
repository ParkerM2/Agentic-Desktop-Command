/**
 * ConflictResolver — Displays and helps resolve merge conflicts
 *
 * Shows conflict file list, per-file diff viewing with conflict markers highlighted,
 * and resolution status tracking. Accept Ours / Accept Theirs buttons are placeholder
 * for future IPC channel support.
 */

import { DiffModeEnum } from '@git-diff-view/react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ExternalLink,
  FileWarning,
  GitBranch,
  Loader2,
} from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, ScrollArea } from '@ui';

import { useFileDiff } from '../../api/useMerge';
import { FileDiffViewer } from '../FileDiffViewer';

import { getFileLang, useConflictResolver } from './useConflictResolver';

import type { ConflictFileStatus } from './useConflictResolver';

interface ConflictResolverProps {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
  onOpenTerminal?: (file: string) => void;
}

function ConflictFileDiff({
  filePath,
  isDark,
  repoPath,
  sourceBranch,
  targetBranch,
}: {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
  filePath: string;
  isDark: boolean;
}) {
  const { data, isLoading, error } = useFileDiff(repoPath, sourceBranch, targetBranch, filePath);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        <span className="text-muted-foreground ml-2 text-xs">Loading conflict diff...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive p-3 text-xs">
        Failed to load diff: {error.message}
      </div>
    );
  }

  if (!data) return null;

  return (
    <ScrollArea className="max-h-64">
      <FileDiffViewer
        diffText={data.diff}
        fileName={data.filePath}
        isDark={isDark}
        lang={getFileLang(data.filePath)}
        viewMode={DiffModeEnum.Unified}
      />
    </ScrollArea>
  );
}

export function ConflictResolver({
  repoPath,
  sourceBranch,
  targetBranch,
  onOpenTerminal,
}: ConflictResolverProps) {
  const {
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
  } = useConflictResolver({ repoPath, sourceBranch, targetBranch });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        <span className="text-muted-foreground ml-2 text-sm">Checking for conflicts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
        Failed to check conflicts: {error.message}
      </div>
    );
  }

  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-4">
        <Check className="h-4 w-4 text-emerald-400" />
        <span className="text-sm text-emerald-400">No conflicts detected - safe to merge</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with conflict count */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-foreground text-sm font-medium">
          {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'} detected
        </span>
        {resolvedCount > 0 ? (
          <span className="text-muted-foreground text-xs">
            ({resolvedCount}/{conflicts.length} marked resolved)
          </span>
        ) : null}
      </div>

      {/* Conflict list */}
      <div className="border-border space-y-1 rounded-md border p-2">
        {conflicts.map((file) => {
          const status = fileStatuses[file] as ConflictFileStatus | undefined;
          const isResolved = status?.resolved === true;
          const isExpanded = expandedFile === file;

          return (
            <div key={file} className="rounded">
              <div
                className={cn(
                  'flex items-center justify-between rounded px-3 py-2',
                  isResolved ? 'bg-emerald-500/10' : 'bg-amber-500/10',
                )}
              >
                <div className="flex items-center gap-2">
                  <Button
                    aria-label={isExpanded ? 'Collapse diff' : 'Expand diff'}
                    className="h-auto p-0.5"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleToggleExpand(file)}
                  >
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        isExpanded ? 'rotate-90' : '',
                      )}
                    />
                  </Button>
                  {isResolved ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <FileWarning className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span
                    className={cn(
                      'font-mono text-xs',
                      isResolved ? 'text-emerald-400' : 'text-foreground',
                    )}
                  >
                    {file}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isResolved ? (
                    <span className="text-xs text-emerald-400">Resolved</span>
                  ) : (
                    <>
                      <Button
                        className="h-auto gap-1 px-2 py-0.5 text-xs"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAcceptOurs(file)}
                      >
                        <GitBranch className="h-3 w-3" />
                        Accept Ours
                      </Button>
                      <Button
                        className="h-auto gap-1 px-2 py-0.5 text-xs"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAcceptTheirs(file)}
                      >
                        <GitBranch className="h-3 w-3" />
                        Accept Theirs
                      </Button>
                      <Button
                        className="h-auto gap-1 px-2 py-0.5 text-xs"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (onOpenTerminal) {
                            onOpenTerminal(file);
                          }
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </Button>
                      <Button
                        className="h-auto gap-1 rounded px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkResolved(file)}
                      >
                        <Check className="h-3 w-3" />
                        Mark Resolved
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded diff view */}
              {isExpanded ? (
                <div className="border-border border-t">
                  <ConflictFileDiff
                    filePath={file}
                    isDark={isDark}
                    repoPath={repoPath}
                    sourceBranch={sourceBranch}
                    targetBranch={targetBranch}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Status indicator */}
      {allResolved ? (
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3">
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-400">All conflicts marked as resolved</span>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Resolve conflicts manually in your editor, then mark them as resolved above.
        </p>
      )}
    </div>
  );
}
