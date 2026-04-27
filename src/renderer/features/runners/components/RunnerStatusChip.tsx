import type { RunnerStatus } from '@shared/ipc/runners/schemas';

import { Badge } from '@ui';

const VARIANT: Record<RunnerStatus, Parameters<typeof Badge>[0]['variant']> = {
  idle: 'secondary',
  starting: 'secondary',
  running: 'default',
  ready: 'default',
  failed: 'destructive',
  stopping: 'secondary',
  stopped: 'outline',
};

const LABEL: Record<RunnerStatus, string> = {
  idle: 'Idle',
  starting: 'Starting…',
  running: 'Running',
  ready: 'Ready',
  failed: 'Failed',
  stopping: 'Stopping…',
  stopped: 'Stopped',
};

export function RunnerStatusChip({ status }: { status: RunnerStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
