import { useEffect, useRef, useState } from 'react';

import type { Idea, IdeaCategory, IdeaStatus } from '@shared/types';

import { useUpdateIdea } from '../../api/useIdeas';

export function useIdeaEditForm(idea: Idea | null, onClose: () => void) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [status, setStatus] = useState<IdeaStatus>('new');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const updateIdea = useUpdateIdea();

  useEffect(() => {
    if (idea !== null) {
      setTitle(idea.title);
      setDescription(idea.description);
      setCategory(idea.category);
      setStatus(idea.status);
      setTags(idea.tags);
      setTagInput('');
      setErrorMessage(null);
    }
  }, [idea]);

  function addTag(raw: string): void {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed.length === 0) return;
    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    setTags([...tags, trimmed]);
    setTagInput('');
  }

  function removeTag(tag: string): void {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  const titleIsEmpty = title.trim().length === 0;

  function handleSave(): void {
    if (idea === null || titleIsEmpty) return;

    setErrorMessage(null);
    updateIdea.mutate(
      {
        id: idea.id,
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        tags,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to update idea');
        },
      },
    );
  }

  return {
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    status,
    setStatus,
    tags,
    tagInput,
    setTagInput,
    errorMessage,
    tagInputRef,
    titleIsEmpty,
    isSaving: updateIdea.isPending,
    addTag,
    removeTag,
    handleTagKeyDown,
    handleSave,
  };
}
