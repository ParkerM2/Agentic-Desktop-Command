import { useDialogWithMutation } from '@renderer/shared/hooks/useDialogWithMutation';
import { useModalFormState } from '@renderer/shared/hooks/useModalFormState';
import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { useCreateTask } from '../../api/useTasks';

type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

interface CreateTaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
}

const CREATE_TASK_DEFAULTS: CreateTaskFormValues = {
  title: '',
  description: '',
  priority: 'normal',
};

export function useCreateTaskDialog(open: boolean, onOpenChange: (open: boolean) => void) {
  const { values, error, setError, update, reset } = useModalFormState<CreateTaskFormValues>(
    open,
    CREATE_TASK_DEFAULTS,
  );

  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const createTask = useCreateTask();

  function handleClose() {
    onOpenChange(false);
  }

  const { handleSubmit: submitMutation, isPending } = useDialogWithMutation(createTask, {
    onClose: handleClose,
    resetForm: reset,
  });

  function handleSubmit() {
    if (activeProjectId === null) return;
    if (values.title.trim().length === 0) return;

    setError(null);
    submitMutation({
      projectId: activeProjectId,
      title: values.title.trim(),
      description: values.description.trim().length > 0 ? values.description.trim() : undefined,
      priority: values.priority === 'normal' ? undefined : values.priority,
    });
  }

  const isFormValid = values.title.trim().length > 0 && activeProjectId !== null;

  return {
    title: values.title,
    setTitle: (v: string) => update('title', v),
    description: values.description,
    setDescription: (v: string) => update('description', v),
    priority: values.priority,
    setPriority: (v: TaskPriority) => update('priority', v),
    error,
    activeProjectId,
    createTask,
    isFormValid,
    isPending,
    handleClose,
    handleSubmit,
  };
}
