/**
 * PRStatusPanel -- Shows PR number, state, CI status. Links to PR URL.
 */

import { ExternalLink, GitPullRequest } from 'lucide-react';

import type { PRStatusInfo } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

interface PRStatusPanelProps {
  prStatus: PRStatusInfo | undefined;
  prUrl: string | undefined;
}

const PR_STATE_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'text-success' },
  closed: { label: 'Closed', className: 'text-destructive' },
  merged: { label: 'Merged', className: 'text-primary' },
};

const CI_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  passing: { label: 'Passing', className: 'bg-success' },
  failing: { label: 'Failing', className: 'bg-destructive' },
  pending: { label: 'Pending', className: 'bg-warning' },
  none: { label: 'None', className: 'bg-muted-foreground' },
};

export function PRStatusPanel({ prStatus, prUrl }: PRStatusPanelProps) {
  if (!prStatus) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-xs italic">
        <GitPullRequest className="h-3.5 w-3.5 shrink-0" />
        <span>No PR created</span>
      </div>
    );
  }

  const stateConfig = PR_STATE_LABELS[prStatus.state] ?? PR_STATE_LABELS.open;
  const ciConfig = CI_STATUS_LABELS[prStatus.ciStatus] ?? CI_STATUS_LABELS.none;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground mb-1 text-xs font-medium">Pull Request</div>

      <div className="flex items-center gap-2">
        <GitPullRequest className={cn('h-4 w-4 shrink-0', stateConfig.className)} />
        <span className="text-foreground text-sm font-medium">
          #{String(prStatus.prNumber)}
        </span>
        <span className={cn('text-xs', stateConfig.className)}>
          {stateConfig.label}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className={cn('inline-block h-2 w-2 rounded-full', ciConfig.className)} />
        <span className="text-muted-foreground text-xs">CI: {ciConfig.label}</span>
      </div>

      {prUrl ? (
        <a
          className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs transition-colors"
          href={prUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          View PR
        </a>
      ) : null}
    </div>
  );
}
