import { useState } from 'react';

import type { ChangeCategory, ChangelogEntry, ChangeType } from '@shared/types';

import { useAddChangelogEntry, useChangelog, useGenerateChangelog } from '../../api/useChangelog';

export function useChangelogPage() {
  const { data: entries, isLoading } = useChangelog();
  const generateChangelog = useGenerateChangelog();
  const addEntry = useAddChangelogEntry();
  const items = entries ?? [];

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [repoPath, setRepoPath] = useState('');
  const [version, setVersion] = useState('');
  const [fromTag, setFromTag] = useState('');
  const [generatedEntry, setGeneratedEntry] = useState<ChangelogEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableCategories, setEditableCategories] = useState<ChangeCategory[]>([]);

  function handleGenerate(): void {
    if (!repoPath.trim() || !version.trim()) return;

    generateChangelog.mutate(
      {
        repoPath: repoPath.trim(),
        version: version.trim(),
        fromTag: fromTag.trim() || undefined,
      },
      {
        onSuccess: (entry) => {
          setGeneratedEntry(entry);
          setEditableCategories(entry.categories);
          setIsEditing(true);
        },
      },
    );
  }

  function handleSaveEntry(): void {
    if (!generatedEntry) return;

    addEntry.mutate(
      {
        version: generatedEntry.version,
        date: generatedEntry.date,
        categories: editableCategories,
      },
      {
        onSuccess: () => {
          setShowGenerateDialog(false);
          setGeneratedEntry(null);
          setIsEditing(false);
          setEditableCategories([]);
          setRepoPath('');
          setVersion('');
          setFromTag('');
        },
      },
    );
  }

  function handleCloseDialog(): void {
    setShowGenerateDialog(false);
    setGeneratedEntry(null);
    setIsEditing(false);
    setEditableCategories([]);
  }

  function handleRemoveItem(categoryType: ChangeType, itemIndex: number): void {
    setEditableCategories((prev) =>
      prev
        .map((cat) => {
          if (cat.type !== categoryType) return cat;
          const newItems = cat.items.filter((_, idx) => idx !== itemIndex);
          return { ...cat, items: newItems };
        })
        .filter((cat) => cat.items.length > 0),
    );
  }

  function handleBackToForm(): void {
    setIsEditing(false);
    setGeneratedEntry(null);
    setEditableCategories([]);
  }

  const errorMessage = generateChangelog.isError ? generateChangelog.error.message : null;

  return {
    items,
    isLoading,
    showGenerateDialog,
    setShowGenerateDialog,
    repoPath,
    setRepoPath,
    version,
    setVersion,
    fromTag,
    setFromTag,
    generatedEntry,
    isEditing,
    editableCategories,
    isPending: generateChangelog.isPending,
    isSavePending: addEntry.isPending,
    errorMessage,
    handleGenerate,
    handleSaveEntry,
    handleCloseDialog,
    handleRemoveItem,
    handleBackToForm,
  };
}
