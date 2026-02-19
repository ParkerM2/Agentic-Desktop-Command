/**
 * ActionsCell — AG-Grid cell renderer with context-sensitive action buttons.
 * Actions vary by task status: planning/execution/kill/restart/delete.
 */

import { useState } from 'react';

import {
  Brain,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Trash2,
  X,
} from 'lucide-react';

import { ConfirmDialog } from '@renderer/shared/components/ConfirmDialog';
import { cn } from '@renderer/shared/lib/utils';

import { useDeleteTask, useUpdateTaskStatus } from '../../api/useTaskMutations';

import type { CustomCellRendererProps } from 'ag-grid-react';

interface ActionsCellData {
  id: string;
  status: string;
  title: string;
  description: string;
  projectId: string;
}

interface ActionsCellProps extends CustomCellRendererProps {
  onStartPlanning?: (taskId: string) => void;
  onStartExecution?: (taskId: string) => void;
  onRequestChanges?: (taskId: string) => void;
  onKillAgent?: (taskId: string) => void;
  onRestartCheckpoint?: (taskId: string) => void;
}

const ICON_BUTTON =
  'rounded p-1.5 transition-colors hover:bg-accent';
const ICON_SIZE = 'h-3.5 w-3.5';

export function ActionsCell(props: ActionsCellProps) {
  const data = props.data as ActionsCellData | undefined;
  const deleteTask = useDeleteTask();
  const updateStatus = useUpdateTaskStatus();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [killConfirmOpen, setKillConfirmOpen] = useState(false);

  if (!data) {
    return null;
  }

  const { id: taskId, status } = data;

  function handleClick(event: React.MouseEvent, handler?: (id: string) => void) {
    event.stopPropagation();
    handler?.(taskId);
  }

  function handleDeleteClick(event: React.MouseEvent) {
    event.stopPropagation();
    setDeleteConfirmOpen(true);
  }

  function handleKillClick(event: React.MouseEvent) {
    event.stopPropagation();
    setKillConfirmOpen(true);
  }

  function handleReject(event: React.MouseEvent) {
    event.stopPropagation();
    updateStatus.mutate({ taskId, status: 'backlog' });
  }

  return (
    <div className="flex items-center gap-1 py-1">
      {/* Planning action — available for backlog tasks */}
      {status === 'backlog' ? (
        <button
          aria-label="Start planning"
          className={cn(ICON_BUTTON, 'text-info hover:text-info')}
          onClick={(event) => {
            handleClick(event, props.onStartPlanning);
          }}
        >
          <Brain className={ICON_SIZE} />
        </button>
      ) : null}

      {/* Execute action — available for backlog and plan_ready */}
      {status === 'backlog' || status === 'plan_ready' ? (
        <button
          aria-label={status === 'plan_ready' ? 'Approve and execute' : 'Implement feature'}
          className={cn(ICON_BUTTON, 'text-success hover:text-success')}
          onClick={(event) => {
            handleClick(event, props.onStartExecution);
          }}
        >
          <Play className={ICON_SIZE} />
        </button>
      ) : null}

      {/* Kill action — available during planning and running */}
      {status === 'planning' || status === 'running' ? (
        <button
          aria-label="Kill agent"
          className={cn(ICON_BUTTON, 'text-warning hover:text-warning')}
          onClick={handleKillClick}
        >
          <Square className={ICON_SIZE} />
        </button>
      ) : null}

      {/* Request changes — available for plan_ready */}
      {status === 'plan_ready' ? (
        <button
          aria-label="Request changes to plan"
          className={cn(ICON_BUTTON, 'text-warning hover:text-warning')}
          onClick={(event) => {
            handleClick(event, props.onRequestChanges);
          }}
        >
          <MessageSquare className={ICON_SIZE} />
        </button>
      ) : null}

      {/* Reject plan — move back to backlog */}
      {status === 'plan_ready' ? (
        <button
          aria-label="Reject plan"
          className={cn(ICON_BUTTON, 'text-muted-foreground hover:text-foreground')}
          onClick={handleReject}
        >
          <X className={ICON_SIZE} />
        </button>
      ) : null}

      {/* Restart from checkpoint — available on error */}
      {status === 'error' ? (
        <button
          aria-label="Restart from checkpoint"
          className={cn(ICON_BUTTON, 'text-info hover:text-info')}
          onClick={(event) => {
            handleClick(event, props.onRestartCheckpoint);
          }}
        >
          <RotateCcw className={ICON_SIZE} />
        </button>
      ) : null}

      {/* Restart fresh — available on error */}
      {status === 'error' ? (
        <button
          aria-label="Restart fresh"
          className={cn(ICON_BUTTON, 'text-muted-foreground hover:text-foreground')}
          onClick={(event) => {
            handleClick(event, props.onStartPlanning);
          }}
        >
          <RefreshCw className={ICON_SIZE} />
        </button>
      ) : null}

      {/* Delete — available for backlog, plan_ready, done, error */}
      {status === 'backlog' ||
      status === 'plan_ready' ||
      status === 'done' ||
      status === 'error' ? (
        <button
          aria-label="Delete task"
          className={cn(
            ICON_BUTTON,
            'text-muted-foreground hover:text-destructive',
          )}
          onClick={handleDeleteClick}
        >
          <Trash2 className={ICON_SIZE} />
        </button>
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this task? This action cannot be undone."
        loading={deleteTask.isPending}
        open={deleteConfirmOpen}
        title="Delete Task"
        variant="destructive"
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => {
          deleteTask.mutate(
            { taskId },
            {
              onSuccess: () => {
                setDeleteConfirmOpen(false);
              },
            },
          );
        }}
      />

      <ConfirmDialog
        confirmLabel="Kill"
        description="Are you sure you want to kill the running agent? Progress up to the last checkpoint will be preserved."
        open={killConfirmOpen}
        title="Kill Agent"
        variant="destructive"
        onOpenChange={setKillConfirmOpen}
        onConfirm={() => {
          setKillConfirmOpen(false);
          props.onKillAgent?.(taskId);
        }}
      />
    </div>
  );
}
