/**
 * MergeConfirmModal — Confirms merge execution with preview
 */

import { useState } from 'react';

import { AlertTriangle, GitMerge, Loader2, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useMergeBranch, useMergeConflicts, useMergeDiff } from '../api/useMerge';

import { ConflictResolver } from './ConflictResolver';
import { MergePreviewPanel } from './MergePreviewPanel';

interface MergeConfirmModalProps {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenTerminal?: (file: string) => void;
}

type Tab = 'preview' | 'conflicts';

export function MergeConfirmModal({
  repoPath,
  sourceBranch,
  targetBranch,
  isOpen,
  onClose,
  onSuccess,
  onOpenTerminal,
}: MergeConfirmModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [mergeError, setMergeError] = useState<string | null>(null);

  const mergeBranch = useMergeBranch();
  const { data: conflicts } = useMergeConflicts(
    isOpen ? repoPath : null,
    isOpen ? sourceBranch : null,
    isOpen ? targetBranch : null,
  );
  const { data: diff } = useMergeDiff(
    isOpen ? repoPath : null,
    isOpen ? sourceBranch : null,
    isOpen ? targetBranch : null,
  );

  const hasConflicts = (conflicts?.length ?? 0) > 0;
  const hasChanges = (diff?.changedFiles ?? 0) > 0;

  function getFooterMessage(): React.ReactNode {
    if (hasConflicts) {
      return (
        <span className="flex items-center gap-1 text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Conflicts detected - merge may require manual resolution
        </span>
      );
    }
    if (hasChanges) {
      return <span>{diff?.changedFiles} files will be merged</span>;
    }
    return <span>No changes to merge</span>;
  }

  function handleMerge() {
    setMergeError(null);
    mergeBranch.mutate(
      { repoPath, sourceBranch, targetBranch },
      {
        onSuccess: (result) => {
          if (result.success) {
            onSuccess?.();
            onClose();
          } else {
            setMergeError(result.message);
          }
        },
        onError: (error) => {
          setMergeError(error instanceof Error ? error.message : 'Merge failed');
        },
      },
    );
  }

  function handleClose() {
    setMergeError(null);
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'preview', label: 'Changes', badge: diff?.changedFiles },
    { id: 'conflicts', label: 'Conflicts', badge: conflicts?.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        aria-label="Close modal"
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClose();
        }}
      />

      {/* Modal */}
      <div className="bg-card border-border relative z-10 w-full max-w-2xl rounded-lg border shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <GitMerge className="text-primary h-5 w-5" />
            <div>
              <h2 className="text-foreground text-lg font-semibold">Merge Branch</h2>
              <p className="text-muted-foreground text-sm">
                {sourceBranch} <span className="mx-1">-&gt;</span> {targetBranch}
              </p>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground" onClick={handleClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-border flex gap-1 border-b px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {(tab.badge ?? 0) > 0 ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-xs',
                      tab.id === 'conflicts' && (tab.badge ?? 0) > 0
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </span>
              {activeTab === tab.id ? (
                <div className="bg-primary absolute right-0 bottom-0 left-0 h-0.5" />
              ) : null}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-6">
          {activeTab === 'preview' ? (
            <MergePreviewPanel
              repoPath={repoPath}
              sourceBranch={sourceBranch}
              targetBranch={targetBranch}
            />
          ) : (
            <ConflictResolver
              repoPath={repoPath}
              sourceBranch={sourceBranch}
              targetBranch={targetBranch}
              onOpenTerminal={onOpenTerminal}
            />
          )}
        </div>

        {/* Error message */}
        {mergeError === null ? null : (
          <div className="mx-6 mb-4 rounded-md bg-red-500/10 p-3">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {mergeError}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t px-6 py-4">
          <div className="text-muted-foreground text-xs">{getFooterMessage()}</div>

          <div className="flex gap-2">
            <button
              className={cn(
                'text-muted-foreground hover:text-foreground rounded-md px-4 py-2 text-sm',
                'transition-colors',
              )}
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              disabled={mergeBranch.isPending || !hasChanges}
              className={cn(
                'bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2',
                'text-sm font-medium transition-opacity hover:opacity-90',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
              onClick={handleMerge}
            >
              {mergeBranch.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <GitMerge className="h-4 w-4" />
                  Merge
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
