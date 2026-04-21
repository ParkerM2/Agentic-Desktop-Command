/**
 * useBulkActionBar — logic for BulkActionBar confirmation dialogs and handlers
 */

import { useCallback, useState } from 'react';

import type { ProgressPriority, ProgressStatus } from '@shared/types/progress';

interface UseBulkActionBarParams {
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onChangeStatus: (status: ProgressStatus) => Promise<void>;
  onChangePriority: (priority: ProgressPriority) => Promise<void>;
}

export function useBulkActionBar({
  onArchive,
  onDelete,
  onChangeStatus,
  onChangePriority,
}: UseBulkActionBarParams) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleArchiveConfirm = useCallback(async () => {
    await onArchive();
    setArchiveOpen(false);
  }, [onArchive]);

  const handleDeleteConfirm = useCallback(async () => {
    await onDelete();
    setDeleteOpen(false);
  }, [onDelete]);

  const handleStatusChange = useCallback(
    (value: string) => {
      void onChangeStatus(value as ProgressStatus);
    },
    [onChangeStatus],
  );

  const handlePriorityChange = useCallback(
    (value: string) => {
      void onChangePriority(value as ProgressPriority);
    },
    [onChangePriority],
  );

  return {
    archiveOpen,
    setArchiveOpen,
    deleteOpen,
    setDeleteOpen,
    handleArchiveConfirm,
    handleDeleteConfirm,
    handleStatusChange,
    handlePriorityChange,
  };
}
