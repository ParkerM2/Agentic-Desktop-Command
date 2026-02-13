/**
 * ConflictResolver — Displays and helps resolve merge conflicts
 */

import { useState } from 'react';

import { AlertTriangle, Check, ExternalLink, FileWarning, Loader2 } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useMergeConflicts } from '../api/useMerge';

interface ConflictResolverProps {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
  onOpenTerminal?: (file: string) => void;
}

interface ConflictFileStatus {
  resolved: boolean;
}

export function ConflictResolver({
  repoPath,
  sourceBranch,
  targetBranch,
  onOpenTerminal,
}: ConflictResolverProps) {
  const {
    data: conflicts,
    isLoading,
    error,
  } = useMergeConflicts(repoPath, sourceBranch, targetBranch);
  const [fileStatuses, setFileStatuses] = useState<Record<string, ConflictFileStatus>>({});

  function handleMarkResolved(file: string) {
    setFileStatuses((prev) => ({
      ...prev,
      [file]: { resolved: true },
    }));
  }

  function handleOpenInEditor(file: string) {
    if (onOpenTerminal) {
      onOpenTerminal(file);
    }
  }

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
      <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-400">
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

  const resolvedCount = Object.values(fileStatuses).filter((s) => s.resolved).length;
  const allResolved = resolvedCount === conflicts.length;

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

          return (
            <div
              key={file}
              className={cn(
                'flex items-center justify-between rounded px-3 py-2',
                isResolved ? 'bg-emerald-500/10' : 'bg-amber-500/10',
              )}
            >
              <div className="flex items-center gap-2">
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
                    <button
                      className={cn(
                        'text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs',
                        'transition-colors',
                      )}
                      onClick={() => handleOpenInEditor(file)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </button>
                    <button
                      className={cn(
                        'flex items-center gap-1 rounded px-2 py-0.5 text-xs',
                        'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30',
                        'transition-colors',
                      )}
                      onClick={() => handleMarkResolved(file)}
                    >
                      <Check className="h-3 w-3" />
                      Mark Resolved
                    </button>
                  </>
                )}
              </div>
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
