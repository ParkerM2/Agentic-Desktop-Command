/**
 * WorkflowPipelinePage — Main page assembling TaskSelector, PipelineDiagram, and step panels.
 * Wires store state, mutations, and event hooks together.
 */

import { useCallback, useEffect, useState } from 'react';

import type { Task, TaskStatus } from '@shared/types';

import { useLooseParams } from '@renderer/shared/hooks';

import { useTask } from '@features/tasks';

import { useUpdateTaskDescription, useUpdateTaskPlan } from '../api/useUpdateTask';
import { useWorkflowPipelineEvents } from '../hooks/useWorkflowPipelineEvents';
import { useWorkflowPipelineStore } from '../store';

import { PipelineDiagram } from './PipelineDiagram';
import { BacklogPanel } from './step-panels/BacklogPanel';
import { DonePanel } from './step-panels/DonePanel';
import { ErrorPanel } from './step-panels/ErrorPanel';
import { PlanningPanel } from './step-panels/PlanningPanel';
import { PlanReadyPanel } from './step-panels/PlanReadyPanel';
import { QueuedPanel } from './step-panels/QueuedPanel';
import { ReviewPanel } from './step-panels/ReviewPanel';
import { RunningPanel } from './step-panels/RunningPanel';
import { TaskSelector } from './TaskSelector';

/** Maps a TaskStatus to the default pipeline step key for the diagram */
function statusToStepKey(status: TaskStatus): string {
  if (status === 'paused') return 'running';
  return status;
}

function renderStepPanel(
  step: string,
  task: Task,
  onSaveDescription: (text: string) => void,
  onSavePlan: (text: string) => void,
  savingDescription: boolean,
  savingPlan: boolean,
): React.ReactNode {
  switch (step) {
    case 'backlog': {
      return (
        <BacklogPanel
          saving={savingDescription}
          task={task}
          onSaveDescription={onSaveDescription}
        />
      );
    }
    case 'planning': {
      return <PlanningPanel task={task} />;
    }
    case 'plan_ready': {
      return <PlanReadyPanel saving={savingPlan} task={task} onSavePlan={onSavePlan} />;
    }
    case 'queued': {
      return <QueuedPanel task={task} />;
    }
    case 'running': {
      return <RunningPanel task={task} />;
    }
    case 'review': {
      return <ReviewPanel task={task} />;
    }
    case 'done': {
      return <DonePanel task={task} />;
    }
    case 'error': {
      return <ErrorPanel task={task} />;
    }
    default: {
      return (
        <p className="text-muted-foreground text-sm">
          No panel available for step &quot;{step}&quot;.
        </p>
      );
    }
  }
}

export function WorkflowPipelinePage() {
  const params = useLooseParams();
  const projectId = params.projectId ?? '';

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { data: task } = useTask(selectedTaskId);

  const { selectedStep, setSelectedStep } = useWorkflowPipelineStore();

  const updateDescription = useUpdateTaskDescription();
  const updatePlan = useUpdateTaskPlan();

  // Initialize the events hook for real-time cache updates
  useWorkflowPipelineEvents();

  // When a task is loaded or changes, default selectedStep to its current status
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
      if (selectedTaskId) {
        updateDescription.mutate({ taskId: selectedTaskId, description: text });
      }
    },
    [selectedTaskId, updateDescription],
  );

  const handleSavePlan = useCallback(
    (text: string) => {
      if (selectedTaskId) {
        updatePlan.mutate({ taskId: selectedTaskId, planContent: text });
      }
    },
    [selectedTaskId, updatePlan],
  );

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header with task selector */}
      <div className="flex items-center gap-4">
        <h1 className="text-foreground text-lg font-semibold">Workflow Pipeline</h1>
        <TaskSelector
          projectId={projectId}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
        />
      </div>

      {/* Pipeline diagram + step panel */}
      {task ? (
        <>
          <PipelineDiagram
            selectedStep={selectedStep}
            taskStatus={task.status}
            onStepClick={handleStepClick}
          />

          {/* Step content panel */}
          <div className="bg-card border-border flex-1 overflow-auto rounded-lg border p-6">
            {selectedStep
              ? renderStepPanel(
                  selectedStep,
                  task,
                  handleSaveDescription,
                  handleSavePlan,
                  updateDescription.isPending,
                  updatePlan.isPending,
                )
              : null}
          </div>
        </>
      ) : (
        <div className="text-muted-foreground flex flex-1 items-center justify-center">
          Select a task to view its workflow pipeline
        </div>
      )}
    </div>
  );
}
