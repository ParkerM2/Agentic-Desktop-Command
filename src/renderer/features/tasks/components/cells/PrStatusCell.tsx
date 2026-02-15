/**
 * PrStatusCell — AG-Grid cell renderer for PR badge + CI status dot.
 * Shows dash when no PR exists.
 */

import { cn } from '@renderer/shared/lib/utils';

import type { CustomCellRendererProps } from 'ag-grid-react';

type PrState = 'open' | 'closed' | 'merged';
type CiStatus = 'pending' | 'success' | 'failure';

interface PrData {
  state?: PrState;
  ciStatus?: CiStatus;
  number?: number;
}

const PR_STATE_CLASSES: Record<PrState, string> = {
  open: 'bg-success/15 text-success',
  closed: 'bg-destructive/15 text-destructive',
  merged: 'bg-primary/15 text-primary',
};

const CI_STATUS_CLASSES: Record<CiStatus, string> = {
  pending: 'bg-warning',
  success: 'bg-success',
  failure: 'bg-destructive',
};

export function PrStatusCell(props: CustomCellRendererProps) {
  const data = props.value as PrData | null | undefined;

  if (data?.state === undefined) {
    return <span className="text-muted-foreground text-sm">&mdash;</span>;
  }

  const stateClass = PR_STATE_CLASSES[data.state];
  const prLabel = data.number === undefined ? data.state : `#${String(data.number)}`;

  return (
    <div className="flex items-center gap-2 py-1">
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          stateClass,
        )}
      >
        {prLabel}
      </span>
      {data.ciStatus === undefined ? null : (
        <span
          className={cn('inline-block h-2 w-2 rounded-full', CI_STATUS_CLASSES[data.ciStatus])}
          title={`CI: ${data.ciStatus}`}
        />
      )}
    </div>
  );
}
