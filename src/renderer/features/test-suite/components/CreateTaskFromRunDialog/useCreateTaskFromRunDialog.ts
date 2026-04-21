import { useEffect, useState } from 'react';

import {
  useCreateProgressTask,
} from '@renderer/features/tasks/api/useProgressMutations';

import { useAttachRunToTask } from '../../api/useAttachRunToTask';
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('high');

  const createTask = useCreateProgressTask();
  const attachRunToTask = useAttachRunToTask();

  useEffect(() => {
    if (open) {
      setTitle(`Fix: ${scriptName} test failure`);
      setDescription(buildDefaultDescription(scriptName, runRecord));
      setPriority('high');
    }
  }, [open, scriptName, runRecord]);

  const handleCreate = () => {
    createTask.mutate(
      { title, description, priority, projectId },
      {
        onSuccess: (task) => {
          attachRunToTask.mutate({ runId, taskId: task.slug });
          onOpenChange(false);
        },
      },
    );
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    priorities: PRIORITIES,
    creating: createTask.isPending,
    canCreate: !!title.trim(),
    handleCreate,
  };
}
