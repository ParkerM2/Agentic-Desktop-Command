/**
 * PlanReadyPanel — Shows plan content with approve/reject/request-changes actions.
 * The most complex panel: supports plan viewing, editing, and three action flows.
 */

import { useState } from 'react';

import { Edit3, FileText, MessageSquare, Play, X } from 'lucide-react';

import type { Task } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useStartExecution } from '@features/tasks/api/useAgentMutations';
import { useUpdateTaskStatus } from '@features/tasks/api/useTaskMutations';
import { PlanFeedbackDialog } from '@features/tasks/components/detail/PlanFeedbackDialog';

import { MarkdownEditor } from '../shared/MarkdownEditor';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';

interface PlanReadyPanelProps {
  saving?: boolean;
  task: Task;
  onSavePlan: (text: string) => void;
}

const ACTION_BUTTON_BASE =
  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors';

export function PlanReadyPanel({ saving, task, onSavePlan }: PlanReadyPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  const startExecution = useStartExecution();
  const updateStatus = useUpdateTaskStatus();

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
    // Re-plan with feedback is handled by the parent or a dedicated mutation;
    // for now, we close the dialog. The parent can wire onRequestChanges if needed.
    void feedback;
  }

  if (isEditing) {
    return (
      <div className="flex h-80 flex-col space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
          <h3 className="text-foreground text-sm font-medium">Edit Plan</h3>
        </div>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
          <h3 className="text-foreground text-sm font-medium">Agent Plan</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={cn(ACTION_BUTTON_BASE, 'bg-muted text-muted-foreground hover:bg-muted/80')}
            type="button"
            onClick={handleStartEditing}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            className={cn(ACTION_BUTTON_BASE, 'bg-success/10 text-success hover:bg-success/20')}
            disabled={startExecution.isPending}
            type="button"
            onClick={handleApprove}
          >
            <Play className="h-3.5 w-3.5" />
            Approve & Execute
          </button>
          <button
            className={cn(ACTION_BUTTON_BASE, 'bg-warning/10 text-warning hover:bg-warning/20')}
            type="button"
            onClick={() => {
              setFeedbackDialogOpen(true);
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Request Changes
          </button>
          <button
            disabled={updateStatus.isPending}
            type="button"
            className={cn(
              ACTION_BUTTON_BASE,
              'bg-destructive/10 text-destructive hover:bg-destructive/20',
            )}
            onClick={handleReject}
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      </div>

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
