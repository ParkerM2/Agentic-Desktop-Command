/**
 * StatusBadgeCell — cell renderer for task status with colored badge.
 * Shows a pulsing dot for active statuses (planning, running).
 *
 * Note: Watchdog alert overlay was removed with the agent orchestrator.
 * The WatchdogDropdown is retained but only shown when alert data is
 * provided externally (currently never).
 */

import { cn } from '@renderer/shared/lib/utils';

import { useTaskUI } from '../../store';

interface StatusConfig {
  label: string;
  className: string;
  pulsing?: boolean;
}

interface StatusBadgeRowData {
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

export function StatusBadgeCell({
  value,
  data,
}: {
  value: string;
  data?: StatusBadgeRowData;
}) {
  const status = value;
  const config = STATUS_CONFIG[status] ?? FALLBACK_CONFIG;
  const _taskId = data?.id ?? '';

  const _toggleRowExpansion = useTaskUI((s) => s.toggleRowExpansion);
  const _updateStatus = undefined; // useUpdateTaskStatus removed — no orchestrator

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
    </div>
  );
}
