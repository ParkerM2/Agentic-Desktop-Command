/**
 * ActionsCell — AG-Grid cell renderer with row action buttons.
 * Play/Stop toggle and Delete. Icon-only with aria-labels.
 */

import { Play, Square, Trash2 } from 'lucide-react';

import type { TaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import type { CustomCellRendererProps } from 'ag-grid-react';

interface ActionsCellData {
  id: string;
  status: TaskStatus;
}

interface ActionsCellProps extends CustomCellRendererProps {
  onPlay?: (taskId: string) => void;
  onStop?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function ActionsCell(props: ActionsCellProps) {
  const data = props.data as ActionsCellData | undefined;

  if (!data) {
    return null;
  }

  const taskId = data.id;
  const isRunning = data.status === 'in_progress';

  function handlePlayStop(event: React.MouseEvent) {
    event.stopPropagation();
    if (isRunning) {
      props.onStop?.(taskId);
    } else {
      props.onPlay?.(taskId);
    }
  }

  function handleDelete(event: React.MouseEvent) {
    event.stopPropagation();
    props.onDelete?.(taskId);
  }

  return (
    <div className="flex items-center gap-1 py-1">
      <button
        aria-label={isRunning ? 'Stop task' : 'Run task'}
        className={cn(
          'hover:bg-accent rounded p-1.5 transition-colors',
          isRunning ? 'text-warning' : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={handlePlayStop}
      >
        {isRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button
        aria-label="Delete task"
        className="text-muted-foreground hover:bg-accent hover:text-destructive rounded p-1.5 transition-colors"
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
