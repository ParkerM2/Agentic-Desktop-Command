import { useState } from 'react';

import { useDeleteChangelogEntry } from '../../api/useChangelog';

export function useVersionCard(version: string) {
  const deleteEntry = useDeleteChangelogEntry();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function handleDeleteConfirm(): void {
    deleteEntry.mutate({ version });
  }

  return {
    isEditOpen,
    setIsEditOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    handleDeleteConfirm,
  };
}
