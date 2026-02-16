/**
 * PlanViewer — Displays agent plan content with approve/reject actions.
 * Shown in the task detail row when a plan exists (status plan_ready or later).
 */

import { FileText, Play, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

interface PlanViewerProps {
  taskId: string;
  planContent: string | null;
  status: string;
  onApproveAndExecute?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
}

const ACTION_BUTTON_BASE =
  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors';

export function PlanViewer({
  taskId,
  planContent,
  status,
  onApproveAndExecute,
  onReject,
}: PlanViewerProps) {
  if (!planContent) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="text-muted-foreground mb-2 h-8 w-8 opacity-50" />
        <p className="text-muted-foreground text-sm">No plan available for this task.</p>
      </div>
    );
  }

  const showActions = status === 'plan_ready';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <FileText className="h-4 w-4" />
          Agent Plan
        </h4>
        {showActions ? (
          <div className="flex items-center gap-2">
            <button
              aria-label="Approve and execute plan"
              className={cn(
                ACTION_BUTTON_BASE,
                'bg-success/10 text-success hover:bg-success/20',
              )}
              onClick={() => {
                onApproveAndExecute?.(taskId);
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Approve & Execute
            </button>
            <button
              aria-label="Reject plan"
              className={cn(
                ACTION_BUTTON_BASE,
                'bg-destructive/10 text-destructive hover:bg-destructive/20',
              )}
              onClick={() => {
                onReject?.(taskId);
              }}
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        ) : null}
      </div>

      <div className="bg-muted/50 border-border max-h-64 overflow-y-auto rounded-md border p-3">
        <pre className="text-foreground whitespace-pre-wrap text-xs leading-relaxed">
          {planContent}
        </pre>
      </div>
    </div>
  );
}
