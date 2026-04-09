/**
 * StatusBadgeCell — cell renderer for task status with colored badge.
 * Shows a pulsing dot for active statuses (planning, running).
 *
 * Uses the shared StatusBadge glass-pill component for consistent styling
 * across the app (matches HealthIndicator and ProgressTaskGrid badges).
 */

import { StatusBadge } from '@ui';

import type { StatusBadgeProps } from '@ui';

interface StatusConfig {
  label: string;
  tone: StatusBadgeProps['tone'];
  pulsing?: boolean;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  backlog: { label: 'Backlog', tone: 'muted' },
  planning: { label: 'Planning...', tone: 'info', pulsing: true },
  plan_ready: { label: 'Plan Ready', tone: 'purple' },
  queued: { label: 'Queued', tone: 'info' },
  running: { label: 'Running', tone: 'primary', pulsing: true },
  paused: { label: 'Paused', tone: 'muted' },
  review: { label: 'Review', tone: 'amber' },
  done: { label: 'Done', tone: 'success' },
  error: { label: 'Error', tone: 'destructive' },
};

const FALLBACK_CONFIG: StatusConfig = {
  label: 'Unknown',
  tone: 'muted',
};

export function StatusBadgeCell({
  value,
}: {
  value: string;
  data?: { id?: string };
}) {
  const config = STATUS_CONFIG[value] ?? FALLBACK_CONFIG;

  return (
    <div className="flex items-center py-1">
      <StatusBadge pulsing={config.pulsing} tone={config.tone}>
        {config.label}
      </StatusBadge>
    </div>
  );
}
