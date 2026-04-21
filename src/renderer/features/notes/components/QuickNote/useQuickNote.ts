/**
 * useQuickNote — logic for QuickNote
 */

import { useState } from 'react';

import { useCreateNote } from '../../api/useNotes';

export function useQuickNote() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const createNote = useCreateNote();

  function handleSubmit() {
    if (title.trim().length === 0) return;

    createNote.mutate(
      { title: title.trim(), content: content.trim() },
      {
        onSuccess: () => {
          setTitle('');
          setContent('');
          setIsOpen(false);
        },
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  }

  return {
    isOpen,
    title,
    content,
    setIsOpen,
    setTitle,
    setContent,
    handleSubmit,
    handleKeyDown,
  };
}
