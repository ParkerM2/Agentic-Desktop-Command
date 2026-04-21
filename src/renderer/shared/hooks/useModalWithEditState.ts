/**
 * useModalWithEditState — generic open/close + editing-item state
 *
 * Used anywhere a modal or editor panel needs to distinguish
 * between "add new" (editing === null) and "edit existing" modes.
 */

import { useCallback, useState } from 'react';

export function useModalWithEditState<T>() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const handleAdd = useCallback(() => {
    setEditing(null);
    setOpen(true);
  }, []);

  const handleEdit = useCallback((item: T) => {
    setEditing(item);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setEditing(null);
  }, []);

  return { open, editing, handleAdd, handleEdit, handleClose };
}
