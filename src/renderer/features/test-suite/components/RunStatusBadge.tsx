import { Badge } from '@ui';

const STATUS_DOT_COLORS: Record<string, string> = {
  passed: 'bg-green-500',
  failed: 'bg-destructive',
  running: 'bg-blue-500 animate-pulse',
  cancelled: 'bg-muted-foreground',
};

export function RunStatusDot({ status }: { status: string }) {
  const color = STATUS_DOT_COLORS[status] ?? 'bg-muted-foreground';
  return <div className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export function RunStatusBadge({ status }: { status: string }) {
  if (status === 'passed') return <Badge className="bg-green-600">Passed</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'running') return <Badge variant="secondary">Running...</Badge>;
  if (status === 'cancelled') return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="secondary">No runs</Badge>;
}
