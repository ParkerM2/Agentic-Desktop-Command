import {
  useCreateProgressTask,
} from '@renderer/features/tasks/api/useProgressMutations';

import { useAttachRunToTask } from '../../api/useAttachRunToTask';
import { useFormWithReset } from '../../hooks/useFormWithReset';
import { buildDefaultDescription } from '../../lib/run-description';

import type { RunRecord } from '../../lib/types';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

interface UseCreateTaskFromRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runRecord: RunRecord;
  scriptName: string;
  projectId: string;
  runId: string;
}

export function useCreateTaskFromRunDialog({
  open,
  onOpenChange,
  runRecord,
  scriptName,
  projectId,
  runId,
}: UseCreateTaskFromRunDialogProps) {
  const createTask = useCreateProgressTask();
  const attachRunToTask = useAttachRunToTask();

  const { values, update } = useFormWithReset(
    {
      title: `Fix: ${scriptName} test failure`,
      description: buildDefaultDescription(scriptName, runRecord),
      priority: 'high' as (typeof PRIORITIES)[number],
    },
    open,
    [scriptName, runRecord],
  );

  const handleCreate = () => {
    createTask.mutate(
      { title: values.title, description: values.description, priority: values.priority, projectId },
      {
        onSuccess: (task) => {
          attachRunToTask.mutate({ runId, taskId: task.slug });
          onOpenChange(false);
        },
      },
    );
  };

  return {
    title: values.title,
    setTitle: (v: string) => update('title', v),
    description: values.description,
    setDescription: (v: string) => update('description', v),
    priority: values.priority,
    setPriority: (v: (typeof PRIORITIES)[number]) => update('priority', v),
    priorities: PRIORITIES,
    creating: createTask.isPending,
    canCreate: !!values.title.trim(),
    handleCreate,
  };
}
