/**
 * useMergeConfirmModal — Logic hook for MergeConfirmModal
 */

import { useState } from 'react';

import { useMergeBranch, useMergeConflicts, useMergeDiff } from '../../api/useMerge';

interface UseMergeConfirmModalParams {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function useMergeConfirmModal({
  repoPath,
  sourceBranch,
  targetBranch,
  isOpen,
  onClose,
  onSuccess,
}: UseMergeConfirmModalParams) {
  const [mergeError, setMergeError] = useState<string | null>(null);

  const mergeBranch = useMergeBranch();
  const { data: conflicts, isLoading: isConflictsLoading } = useMergeConflicts(
    isOpen ? repoPath : null,
    isOpen ? sourceBranch : null,
    isOpen ? targetBranch : null,
  );
  const { data: diff, isLoading: isDiffLoading } = useMergeDiff(
    isOpen ? repoPath : null,
    isOpen ? sourceBranch : null,
    isOpen ? targetBranch : null,
  );

  const hasConflicts = (conflicts?.length ?? 0) > 0;
  const hasChanges = (diff?.changedFiles ?? 0) > 0;
  const isDataLoading = isConflictsLoading || isDiffLoading;

  const conflictsBadge = (conflicts?.length ?? 0) > 0 ? conflicts?.length : undefined;
  const changesBadge = (diff?.changedFiles ?? 0) > 0 ? diff?.changedFiles : undefined;

  function handleMerge(): void {
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
        onError: (err) => {
          setMergeError(err instanceof Error ? err.message : 'Merge failed');
        },
      },
    );
  }

  function handleOpenChange(open: boolean): void {
    if (!open) {
      setMergeError(null);
      onClose();
    }
  }

  return {
    mergeError,
    mergeBranch,
    conflicts,
    diff,
    hasConflicts,
    hasChanges,
    isDataLoading,
    conflictsBadge,
    changesBadge,
    handleMerge,
    handleOpenChange,
  };
}
