import { useRef, useState } from 'react';

import { useToastStore } from '@renderer/shared/stores';

import { useCreateNote } from '@features/notes';
import { useCreateProgressTask } from '@features/tasks';

import { useCaptureMutations, useCaptures, useUpdateCapture } from '../../api/useCaptures';

interface EditState {
  id: string;
  value: string;
}

const LIMIT = 5;

export function useQuickCapture() {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: captures } = useCaptures();
  const { createCapture, deleteCapture } = useCaptureMutations();
  const updateCapture = useUpdateCapture();
  const createProgressTask = useCreateProgressTask();
  const createNote = useCreateNote();
  const { addToast } = useToastStore();

  function handleSubmit(): void {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) return;
    createCapture.mutate(trimmed);
    setInputValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }

  function handleEditStart(id: string, currentText: string): void {
    setEditState({ id, value: currentText });
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  }

  function handleEditSave(): void {
    if (editState === null) return;
    const trimmed = editState.value.trim();
    if (trimmed.length > 0) {
      updateCapture.mutate({ id: editState.id, text: trimmed });
    }
    setEditState(null);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      setEditState(null);
    }
  }

  function handleConvertToTask(text: string, captureId: string): void {
    createProgressTask.mutate(
      { title: text, description: '' },
      {
        onSuccess() {
          deleteCapture.mutate(captureId);
          addToast('Converted to task', 'success');
        },
      },
    );
  }

  function handleConvertToNote(text: string, captureId: string): void {
    createNote.mutate(
      { title: text, content: '' },
      {
        onSuccess() {
          deleteCapture.mutate(captureId);
          addToast('Converted to note', 'success');
        },
      },
    );
  }

  const allCaptures = captures ?? [];

  const filteredCaptures =
    searchQuery.trim().length > 0
      ? allCaptures.filter((c) =>
          c.text.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : allCaptures;

  const visibleCaptures = showAll ? filteredCaptures : filteredCaptures.slice(0, LIMIT);
  const hasMore = filteredCaptures.length > LIMIT;

  return {
    inputValue,
    setInputValue,
    searchQuery,
    setSearchQuery,
    showAll,
    setShowAll,
    editState,
    setEditState,
    editInputRef,
    allCaptures,
    filteredCaptures,
    visibleCaptures,
    hasMore,
    deleteCapture,
    handleSubmit,
    handleKeyDown,
    handleEditStart,
    handleEditSave,
    handleEditKeyDown,
    handleConvertToTask,
    handleConvertToNote,
    LIMIT,
  };
}
