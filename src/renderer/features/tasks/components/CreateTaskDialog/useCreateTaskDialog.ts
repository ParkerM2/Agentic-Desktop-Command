import { useCallback, useEffect, useState } from 'react';

import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { useCreateTask } from '../../api/useTasks';

type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export function useCreateTaskDialog(open: boolean, onOpenChange: (open: boolean) => void) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [error, setError] = useState<string | null>(null);

  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const createTask = useCreateTask();

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority('normal');
    setError(null);
  }, []);

  useEffect(() => {
    resetForm();
  }, [open, resetForm]);

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit() {
    if (activeProjectId === null) return;
    if (title.trim().length === 0) return;

    setError(null);
    createTask.mutate(
      {
        projectId: activeProjectId,
        title: title.trim(),
        description: description.trim().length > 0 ? description.trim() : undefined,
        priority: priority === 'normal' ? undefined : priority,
      },
      {
        onSuccess: () => {
          handleClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to create task');
        },
      },
    );
  }

  const isFormValid = title.trim().length > 0 && activeProjectId !== null;

  return {
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    error,
    activeProjectId,
    createTask,
    isFormValid,
    handleClose,
    handleSubmit,
  };
}
