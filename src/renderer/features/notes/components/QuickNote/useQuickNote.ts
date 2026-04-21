/**
 * useQuickNote — logic for QuickNote
 */

import { useState } from 'react';

import { useDialogWithMutation } from '@renderer/shared/hooks/useDialogWithMutation';
import { useModalFormState } from '@renderer/shared/hooks/useModalFormState';

import { useCreateNote } from '../../api/useNotes';

interface QuickNoteFormValues {
  title: string;
  content: string;
}

const QUICK_NOTE_DEFAULTS: QuickNoteFormValues = {
  title: '',
  content: '',
};

export function useQuickNote() {
  const [isOpen, setIsOpen] = useState(false);
  const createNote = useCreateNote();

  const { values, update, reset } = useModalFormState<QuickNoteFormValues>(
    isOpen,
    QUICK_NOTE_DEFAULTS,
  );

  const { handleSubmit: submitMutation, isPending } = useDialogWithMutation(createNote, {
    onClose: () => setIsOpen(false),
    resetForm: reset,
  });

  function handleSubmit() {
    if (values.title.trim().length === 0) return;
    submitMutation({ title: values.title.trim(), content: values.content.trim() });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  }

  return {
    isOpen,
    title: values.title,
    content: values.content,
    isPending,
    setIsOpen,
    setTitle: (v: string) => update('title', v),
    setContent: (v: string) => update('content', v),
    handleSubmit,
    handleKeyDown,
  };
}
