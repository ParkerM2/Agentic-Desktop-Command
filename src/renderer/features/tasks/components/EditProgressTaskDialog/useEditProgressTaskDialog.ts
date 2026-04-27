import { useState } from 'react';

import type { ProgressPriority, ProgressStatus, ProgressTask } from '@shared/types/progress';

import { useUpdateProgressTask } from '../../api/useProgressMutations';

export function useEditProgressTaskDialog(
  task: ProgressTask,
  onOpenChange: (open: boolean) => void,
) {
  const updateTask = useUpdateProgressTask();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<ProgressPriority>(task.priority);
  const [status, setStatus] = useState<ProgressStatus>(task.status);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setStatus(task.status);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    if (title.trim().length === 0) {
      setError('Title is required.');
      return;
    }

    setError(null);

    const updates: {
      title?: string;
      description?: string;
      priority?: ProgressPriority;
      status?: ProgressStatus;
    } = {};

    if (title.trim() !== task.title) updates.title = title.trim();
    if (description.trim() !== task.description) updates.description = description.trim();
    if (priority !== task.priority) updates.priority = priority;
    if (status !== task.status) updates.status = status;

    try {
      await updateTask.mutateAsync({ slug: task.slug, updates });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    }
  }

  return {
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    status,
    setStatus,
    error,
    isSubmitting: updateTask.isPending,
    handleOpenChange,
    handleSubmit,
  };
}
