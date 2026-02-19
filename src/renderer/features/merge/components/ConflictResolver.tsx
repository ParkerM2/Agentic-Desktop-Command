/**
 * ConflictResolver — Displays and helps resolve merge conflicts
 *
 * Shows conflict file list, per-file diff viewing with conflict markers highlighted,
 * and resolution status tracking. Accept Ours / Accept Theirs buttons are placeholder
 * for future IPC channel support.
 */

import { useMemo, useState } from 'react';

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
import { useThemeStore } from '@renderer/shared/stores/theme-store';

import { useFileDiff, useMergeConflicts } from '../api/useMerge';

import { FileDiffViewer } from './FileDiffViewer';

const TRANSITION_COLORS = 'transition-colors';

interface ConflictResolverProps {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
  onOpenTerminal?: (file: string) => void;
}

interface ConflictFileStatus {
  resolved: boolean;
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
    html: 'xml',
    md: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
  };
  return langMap[ext] ?? 'plaintext';
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
    <div className="max-h-64 overflow-auto">
      <FileDiffViewer
        diffText={data.diff}
        fileName={data.filePath}
        isDark={isDark}
        lang={getFileLang(data.filePath)}
        viewMode={DiffModeEnum.Unified}
      />
    </div>
  );
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
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const themeMode = useThemeStore((s) => s.mode);
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeMode === 'dark';
  }, [themeMode]);

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

  function handleToggleExpand(file: string) {
    setExpandedFile((prev) => (prev === file ? null : file));
  }

  function handleAcceptOurs(_file: string) {
    // Placeholder: would call a new IPC channel in the future
    // For now, just show intent via mark resolved
    handleMarkResolved(_file);
  }

  function handleAcceptTheirs(_file: string) {
    // Placeholder: would call a new IPC channel in the future
    handleMarkResolved(_file);
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
                  <button
                    aria-label={isExpanded ? 'Collapse diff' : 'Expand diff'}
                    className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
                    onClick={() => handleToggleExpand(file)}
                  >
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        isExpanded ? 'rotate-90' : '',
                      )}
                    />
                  </button>
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
                          'flex items-center gap-1 rounded px-2 py-0.5 text-xs',
                          'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                          TRANSITION_COLORS,
                        )}
                        onClick={() => handleAcceptOurs(file)}
                      >
                        <GitBranch className="h-3 w-3" />
                        Accept Ours
                      </button>
                      <button
                        className={cn(
                          'flex items-center gap-1 rounded px-2 py-0.5 text-xs',
                          'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                          TRANSITION_COLORS,
                        )}
                        onClick={() => handleAcceptTheirs(file)}
                      >
                        <GitBranch className="h-3 w-3" />
                        Accept Theirs
                      </button>
                      <button
                        className={cn(
                          'text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs',
                          TRANSITION_COLORS,
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
                          TRANSITION_COLORS,
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
