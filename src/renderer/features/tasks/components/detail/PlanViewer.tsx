/**
 * PlanViewer — Displays agent plan content with approve/reject/request-changes actions.
 * Shown in the task detail row when a plan exists (status plan_ready or later).
 */

import { useState } from 'react';

import { FileText, MessageSquare, Play, X } from 'lucide-react';

import { Button } from '@ui';

import { PlanFeedbackDialog } from './PlanFeedbackDialog';

interface PlanViewerProps {
  taskId: string;
  planContent: string | null;
  status: string;
  onApproveAndExecute?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onRequestChanges?: (taskId: string, feedback: string) => void;
}

export function PlanViewer({
  taskId,
  planContent,
  status,
  onApproveAndExecute,
  onReject,
  onRequestChanges,
}: PlanViewerProps) {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  if (!planContent) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="text-muted-foreground mb-2 h-8 w-8 opacity-50" />
        <p className="text-muted-foreground text-sm">No plan available for this task.</p>
      </div>
    );
  }

  const showActions = status === 'plan_ready';

  function handleFeedbackSubmit(feedback: string) {
    onRequestChanges?.(taskId, feedback);
    setFeedbackDialogOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <FileText className="h-4 w-4" />
          Agent Plan
        </h4>
        {showActions ? (
          <div className="flex items-center gap-2">
            <Button
              aria-label="Approve and execute plan"
              className="bg-success/10 text-success hover:bg-success/20"
              size="sm"
              variant="ghost"
              onClick={() => {
                onApproveAndExecute?.(taskId);
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Approve & Execute
            </Button>
            <Button
              aria-label="Request changes to plan"
              className="bg-warning/10 text-warning hover:bg-warning/20"
              size="sm"
              variant="ghost"
              onClick={() => {
                setFeedbackDialogOpen(true);
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Request Changes
            </Button>
            <Button
              aria-label="Reject plan"
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              size="sm"
              variant="ghost"
              onClick={() => {
                onReject?.(taskId);
              }}
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        ) : null}
      </div>

      <div className="bg-muted/50 border-border max-h-64 overflow-y-auto rounded-md border p-3">
        <pre className="text-foreground whitespace-pre-wrap text-xs leading-relaxed">
          {planContent}
        </pre>
      </div>

      <PlanFeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
}
