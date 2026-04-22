import { useState } from 'react';

import type { ChangeCategory, ChangelogEntry, ChangeType } from '@shared/types';

import { useUpdateChangelogEntry } from '../../api/useChangelog';

const CHANGE_TYPES: ChangeType[] = ['added', 'changed', 'fixed', 'removed', 'security', 'deprecated'];

export function useEditEntryDialog(
  entry: ChangelogEntry,
  onOpenChange: (open: boolean) => void,
) {
  const updateEntry = useUpdateChangelogEntry();

  const [version, setVersion] = useState(entry.version);
  const [date, setDate] = useState(entry.date);
  const [categories, setCategories] = useState<ChangeCategory[]>(entry.categories);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  function handleAddCategory(): void {
    const usedTypes = new Set(categories.map((c) => c.type));
    const nextType = CHANGE_TYPES.find((t) => !usedTypes.has(t));
    if (!nextType) return;
    setCategories((prev) => [...prev, { type: nextType, items: [] }]);
  }

  function handleRemoveCategory(categoryType: ChangeType): void {
    setCategories((prev) => prev.filter((c) => c.type !== categoryType));
  }

  function handleCategoryTypeChange(oldType: ChangeType, newType: ChangeType): void {
    setCategories((prev) =>
      prev.map((c) => (c.type === oldType ? { ...c, type: newType } : c)),
    );
    setNewItemTexts((prev) => {
      const { [oldType]: movedText, ...rest } = prev;
      return movedText ? { ...rest, [newType]: movedText } : rest;
    });
  }

  function handleAddItem(categoryType: ChangeType): void {
    const text = (newItemTexts[categoryType] ?? '').trim();
    if (!text) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.type === categoryType ? { ...c, items: [...c.items, text] } : c,
      ),
    );
    setNewItemTexts((prev) => ({ ...prev, [categoryType]: '' }));
  }

  function handleRemoveItem(categoryType: ChangeType, itemIndex: number): void {
    setCategories((prev) =>
      prev
        .map((c) => {
          if (c.type !== categoryType) return c;
          return { ...c, items: c.items.filter((_, idx) => idx !== itemIndex) };
        })
        .filter((c) => c.items.length > 0 || c.type === categoryType),
    );
  }

  function handleNewItemKeyDown(e: React.KeyboardEvent, categoryType: ChangeType): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem(categoryType);
    }
  }

  function handleSave(): void {
    const nonEmptyCategories = categories.filter((c) => c.items.length > 0);
    updateEntry.mutate(
      {
        version: entry.version,
        updates: {
          version: version.trim() || entry.version,
          date: date.trim() || entry.date,
          categories: nonEmptyCategories,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      setVersion(entry.version);
      setDate(entry.date);
      setCategories(entry.categories);
      setNewItemTexts({});
    }
    onOpenChange(nextOpen);
  }

  const usedTypes = new Set(categories.map((c) => c.type));
  const hasAvailableTypes = usedTypes.size < CHANGE_TYPES.length;
  const isSaveDisabled = !version.trim() || !date.trim() || updateEntry.isPending;

  return {
    version,
    setVersion,
    date,
    setDate,
    categories,
    newItemTexts,
    setNewItemTexts,
    usedTypes,
    hasAvailableTypes,
    isSaveDisabled,
    isPending: updateEntry.isPending,
    changeTypes: CHANGE_TYPES,
    handleAddCategory,
    handleRemoveCategory,
    handleCategoryTypeChange,
    handleAddItem,
    handleRemoveItem,
    handleNewItemKeyDown,
    handleSave,
    handleOpenChange,
  };
}
