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

import { Button } from '@ui';

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
        <Button
          aria-label="Start planning"
          className="text-info hover:text-info"
          size="icon"
          variant="ghost"
          onClick={(event) => {
            handleClick(event, props.onStartPlanning);
          }}
        >
          <Brain className={ICON_SIZE} />
        </Button>
      ) : null}

      {/* Execute action — available for backlog and plan_ready */}
      {status === 'backlog' || status === 'plan_ready' ? (
        <Button
          aria-label={status === 'plan_ready' ? 'Approve and execute' : 'Implement feature'}
          className="text-success hover:text-success"
          size="icon"
          variant="ghost"
          onClick={(event) => {
            handleClick(event, props.onStartExecution);
          }}
        >
          <Play className={ICON_SIZE} />
        </Button>
      ) : null}

      {/* Kill action — available during planning and running */}
      {status === 'planning' || status === 'running' ? (
        <Button
          aria-label="Kill agent"
          className="text-warning hover:text-warning"
          size="icon"
          variant="ghost"
          onClick={handleKillClick}
        >
          <Square className={ICON_SIZE} />
        </Button>
      ) : null}

      {/* Request changes — available for plan_ready */}
      {status === 'plan_ready' ? (
        <Button
          aria-label="Request changes to plan"
          className="text-warning hover:text-warning"
          size="icon"
          variant="ghost"
          onClick={(event) => {
            handleClick(event, props.onRequestChanges);
          }}
        >
          <MessageSquare className={ICON_SIZE} />
        </Button>
      ) : null}

      {/* Reject plan — move back to backlog */}
      {status === 'plan_ready' ? (
        <Button
          aria-label="Reject plan"
          className="text-muted-foreground hover:text-foreground"
          size="icon"
          variant="ghost"
          onClick={handleReject}
        >
          <X className={ICON_SIZE} />
        </Button>
      ) : null}

      {/* Restart from checkpoint — available on error */}
      {status === 'error' ? (
        <Button
          aria-label="Restart from checkpoint"
          className="text-info hover:text-info"
          size="icon"
          variant="ghost"
          onClick={(event) => {
            handleClick(event, props.onRestartCheckpoint);
          }}
        >
          <RotateCcw className={ICON_SIZE} />
        </Button>
      ) : null}

      {/* Restart fresh — available on error */}
      {status === 'error' ? (
        <Button
          aria-label="Restart fresh"
          className="text-muted-foreground hover:text-foreground"
          size="icon"
          variant="ghost"
          onClick={(event) => {
            handleClick(event, props.onStartPlanning);
          }}
        >
          <RefreshCw className={ICON_SIZE} />
        </Button>
      ) : null}

      {/* Delete — available for backlog, plan_ready, done, error */}
      {status === 'backlog' ||
      status === 'plan_ready' ||
      status === 'done' ||
      status === 'error' ? (
        <Button
          aria-label="Delete task"
          className="text-muted-foreground hover:text-destructive"
          size="icon"
          variant="ghost"
          onClick={handleDeleteClick}
        >
          <Trash2 className={ICON_SIZE} />
        </Button>
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
