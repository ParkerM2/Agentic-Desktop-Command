/**
 * WorkflowPipelinePage — Main page assembling TaskSelector, PipelineDiagram, and step panels.
 * Wires store state, mutations, and event hooks together.
 */

import type { ProgressTask } from '@shared/types/progress';

import { PageContent, PageHeader, PageLayout } from '@ui';

import { PipelineDiagram } from '../PipelineDiagram';
import { BacklogPanel } from '../step-panels/BacklogPanel';
import { DonePanel } from '../step-panels/DonePanel';
import { ErrorPanel } from '../step-panels/ErrorPanel';
import { PlanningPanel } from '../step-panels/PlanningPanel';
import { PlanReadyPanel } from '../step-panels/PlanReadyPanel';
import { QueuedPanel } from '../step-panels/QueuedPanel';
import { ReviewPanel } from '../step-panels/ReviewPanel';
import { RunningPanel } from '../step-panels/RunningPanel';
import { TaskSelector } from '../TaskSelector';

import { useWorkflowPipelinePage } from './useWorkflowPipelinePage';

function renderStepPanel(
  step: string,
  task: ProgressTask,
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
  const {
    projectId,
    selectedSlug,
    setSelectedSlug,
    task,
    selectedStep,
    updateDescription,
    updatePlan,
    handleStepClick,
    handleSaveDescription,
    handleSavePlan,
  } = useWorkflowPipelinePage();

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title>Workflow Pipeline</PageHeader.Title>
          <PageHeader.Actions>
            <TaskSelector
              projectId={projectId}
              selectedSlug={selectedSlug}
              onSelectTask={setSelectedSlug}
            />
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>

      <PageContent>
        {task ? (
          <div className="space-y-6">
            <PipelineDiagram
              selectedStep={selectedStep}
              taskStatus={task.status}
              onStepClick={handleStepClick}
            />

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
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-1 items-center justify-center">
            Select a task to view its workflow pipeline
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
