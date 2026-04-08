/**
 * PlanReadyPanel — Shows plan content with approve/reject/request-changes actions.
 * The most complex panel: supports plan viewing, editing, and three action flows.
 */

import { useState } from 'react';

import { Edit3, FileText, MessageSquare, Play, X } from 'lucide-react';

import type { Task } from '@shared/types';

import { Button, SectionHeader } from '@ui';

import { useReplanWithFeedback, useStartExecution } from '@features/tasks/api/useAgentMutations';
import { useUpdateTaskStatus } from '@features/tasks/api/useTaskMutations';
import { PlanFeedbackDialog } from '@features/tasks/components/detail/PlanFeedbackDialog';

import { MarkdownEditor } from '../shared/MarkdownEditor';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';

interface PlanReadyPanelProps {
  saving?: boolean;
  task: Task;
  onSavePlan: (text: string) => void;
}

export function PlanReadyPanel({ saving, task, onSavePlan }: PlanReadyPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  const startExecution = useStartExecution();
  const updateStatus = useUpdateTaskStatus();
  const replanWithFeedback = useReplanWithFeedback();

  const planContent = (task.metadata?.planContent as string | undefined) ?? '';

  function handleStartEditing() {
    setEditValue(planContent);
    setIsEditing(true);
  }

  function handleSave() {
    onSavePlan(editValue);
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  function handleApprove() {
    startExecution.mutate({
      taskId: task.id,
      projectPath: task.metadata?.worktreePath ?? '',
      taskDescription: task.description,
      planRef: task.metadata?.planPath as string | undefined,
    });
  }

  function handleReject() {
    updateStatus.mutate({ taskId: task.id, status: 'backlog' });
  }

  function handleFeedbackSubmit(feedback: string) {
    setFeedbackDialogOpen(false);
    replanWithFeedback.mutate({
      taskId: task.id,
      projectPath: typeof task.metadata?.worktreePath === 'string' ? task.metadata.worktreePath : '',
      taskDescription: task.description,
      feedback,
      previousPlanPath: typeof task.metadata?.planPath === 'string' ? task.metadata.planPath : undefined,
    });
  }

  if (isEditing) {
    return (
      <div className="flex h-80 flex-col space-y-4">
        <SectionHeader icon={FileText} size="sm" title="Edit Plan" />
        <div className="min-h-0 flex-1">
          <MarkdownEditor
            saving={saving}
            value={editValue}
            onCancel={handleCancel}
            onChange={setEditValue}
            onSave={handleSave}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <SectionHeader icon={FileText} size="sm" title="Agent Plan">
        <div className="flex items-center gap-2">
          <Button size="sm" type="button" variant="secondary" onClick={handleStartEditing}>
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            className="text-success hover:bg-success/10 hover:text-success"
            disabled={startExecution.isPending}
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleApprove}
          >
            <Play className="h-3.5 w-3.5" />
            Approve &amp; Execute
          </Button>
          <Button
            className="text-warning hover:bg-warning/10 hover:text-warning"
            disabled={replanWithFeedback.isPending}
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => {
              setFeedbackDialogOpen(true);
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {replanWithFeedback.isPending ? 'Requesting...' : 'Request Changes'}
          </Button>
          <Button
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={updateStatus.isPending}
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleReject}
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      </SectionHeader>

      {/* Plan content */}
      {planContent.length > 0 ? (
        <div className="border-border max-h-96 overflow-y-auto rounded-md border p-4">
          <MarkdownRenderer content={planContent} />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm italic">No plan content available.</p>
      )}

      {/* Feedback dialog */}
      <PlanFeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
}
