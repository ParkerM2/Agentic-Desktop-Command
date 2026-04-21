import { useCallback, useEffect, useState } from 'react';

import type { ProgressStatus, ProgressTask } from '@shared/types/progress';

import { useLooseParams } from '@renderer/shared/hooks';

import { useProgressTask } from '@features/tasks/api/useProgress';

import { useUpdateTaskDescription, useUpdateTaskPlan } from '../../api/useUpdateTask';
import { useWorkflowPipelineEvents } from '../../hooks/useWorkflowPipelineEvents';
import { useWorkflowPipelineStore } from '../../store';

function statusToStepKey(status: ProgressStatus): string {
  if (status === 'researching' || status === 'research_done') return 'planning';
  if (status === 'executing') return 'running';
  return status;
}

export function useWorkflowPipelinePage() {
  const params = useLooseParams();
  const projectId = params.projectId ?? '';

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const { data: task } = useProgressTask(selectedSlug);

  const { selectedStep, setSelectedStep } = useWorkflowPipelineStore();

  const updateDescription = useUpdateTaskDescription();
  const updatePlan = useUpdateTaskPlan();

  useWorkflowPipelineEvents();

  useEffect(() => {
    if (task) {
      setSelectedStep(statusToStepKey(task.status));
    }
  }, [task, setSelectedStep]);

  const handleStepClick = useCallback(
    (step: string) => {
      setSelectedStep(step);
    },
    [setSelectedStep],
  );

  const handleSaveDescription = useCallback(
    (text: string) => {
      if (selectedSlug) {
        updateDescription.mutate({ slug: selectedSlug, description: text });
      }
    },
    [selectedSlug, updateDescription],
  );

  const handleSavePlan = useCallback(
    (text: string) => {
      if (selectedSlug) {
        updatePlan.mutate({ slug: selectedSlug, planContent: text });
      }
    },
    [selectedSlug, updatePlan],
  );

  return {
    projectId,
    selectedSlug,
    setSelectedSlug,
    task: task as ProgressTask | undefined,
    selectedStep,
    updateDescription,
    updatePlan,
    handleStepClick,
    handleSaveDescription,
    handleSavePlan,
    // Derived mutation states
    isSavingDescription: updateDescription.isPending,
    isSavingPlan: updatePlan.isPending,
  };
}
