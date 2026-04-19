import { Badge, StatusIndicator } from '@ui';

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'info' | 'warning' | 'neutral'> = {
  passed: 'success',
  failed: 'error',
  running: 'info',
  cancelled: 'neutral',
};

export function RunStatusDot({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? 'neutral';
  return (
    <StatusIndicator
      variant={variant}
      className={status === 'running' ? 'animate-pulse' : undefined}
    />
  );
}

export function RunStatusBadge({ status }: { status: string }) {
  if (status === 'passed') return <Badge className="bg-green-600">Passed</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'running') return <Badge variant="secondary">Running...</Badge>;
  if (status === 'cancelled') return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="secondary">No runs</Badge>;
}
