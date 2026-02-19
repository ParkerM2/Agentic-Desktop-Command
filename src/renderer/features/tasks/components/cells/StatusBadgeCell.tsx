/**
 * StatusBadgeCell — AG-Grid cell renderer for task status with colored badge.
 * Shows a pulsing dot for active statuses (planning, running).
 * Shows watchdog alert overlay when an active alert exists for the task.
 */

import type { EventPayload } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';

import { useUpdateTaskStatus } from '../../api/useTaskMutations';
import { useTaskUI } from '../../store';

import { WatchdogDropdown } from './WatchdogDropdown';

import type { CustomCellRendererProps } from 'ag-grid-react';

type WatchdogAlertPayload = EventPayload<'event:agent.orchestrator.watchdogAlert'>;

interface StatusConfig {
  label: string;
  className: string;
  pulsing?: boolean;
}

interface StatusBadgeRowData {
  watchdogAlert?: WatchdogAlertPayload | null;
  id?: string;
}

const STYLE_MUTED = 'bg-muted text-muted-foreground border-border';
const STYLE_INFO = 'bg-info/15 text-info border-info/30';
const STYLE_WARNING = 'bg-warning/15 text-warning border-warning/30';
const STYLE_PRIMARY = 'bg-primary/15 text-primary border-primary/30';

const STATUS_CONFIG: Record<string, StatusConfig> = {
  backlog: { label: 'Backlog', className: STYLE_MUTED },
  planning: { label: 'Planning...', className: STYLE_INFO, pulsing: true },
  plan_ready: { label: 'Plan Ready', className: STYLE_WARNING },
  queued: { label: 'Queued', className: STYLE_INFO },
  running: { label: 'Running', className: STYLE_PRIMARY, pulsing: true },
  paused: { label: 'Paused', className: STYLE_MUTED },
  review: { label: 'Review', className: STYLE_WARNING },
  done: { label: 'Done', className: 'bg-success/15 text-success border-success/30' },
  error: { label: 'Error', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

const FALLBACK_CONFIG: StatusConfig = {
  label: 'Unknown',
  className: 'bg-muted text-muted-foreground border-border',
};

export function StatusBadgeCell(props: CustomCellRendererProps) {
  const status = (props.value as string | undefined) ?? 'backlog';
  const config = STATUS_CONFIG[status] ?? FALLBACK_CONFIG;
  const rowData = props.data as StatusBadgeRowData | undefined;
  const alert = rowData?.watchdogAlert ?? null;
  const taskId = rowData?.id ?? '';

  const updateStatus = useUpdateTaskStatus();
  const toggleRowExpansion = useTaskUI((s) => s.toggleRowExpansion);

  /** Kill existing session + restart from last checkpoint via orchestrator */
  function handleRestartCheckpoint() {
    if (!alert) return;
    void (async () => {
      const session = await ipc('agent.getOrchestratorSession', { taskId: alert.taskId });
      if (session) {
        await ipc('agent.restartFromCheckpoint', {
          taskId: alert.taskId,
          projectPath: session.projectPath,
        });
      }
    })();
  }

  /** Kill current session + spawn a fresh execution agent */
  function handleRestartFresh() {
    if (!alert) return;
    void (async () => {
      const session = await ipc('agent.getOrchestratorSession', { taskId: alert.taskId });
      await ipc('agent.killSession', { sessionId: alert.sessionId });
      if (session) {
        await ipc('agent.startExecution', {
          taskId: alert.taskId,
          projectPath: session.projectPath,
          taskDescription: session.command,
        });
      }
    })();
  }

  /** Toggle the detail row expansion to reveal the execution log panel */
  function handleViewLogs() {
    if (taskId.length === 0) return;
    toggleRowExpansion(taskId);
  }

  /** Mark task status as error via Hub API */
  function handleMarkError() {
    if (!alert) return;
    updateStatus.mutate({ taskId: alert.taskId, status: 'error' });
  }

  return (
    <div className="flex items-center py-1">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
          config.className,
        )}
      >
        {config.pulsing === true ? (
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        ) : null}
        {config.label}
      </span>

      {alert ? (
        <WatchdogDropdown
          alert={alert}
          onMarkError={handleMarkError}
          onRestartCheckpoint={handleRestartCheckpoint}
          onRestartFresh={handleRestartFresh}
          onViewLogs={handleViewLogs}
        />
      ) : null}
    </div>
  );
}
