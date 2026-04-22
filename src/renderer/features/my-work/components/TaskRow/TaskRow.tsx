/**
 * TaskRow — Single task row in the My Work list
 */

import { ExternalLink } from 'lucide-react';

import type { ProgressPriority, ProgressStatus, ProgressTask } from '@shared/types/progress';

import { Badge, StatusBadge, Text } from '@ui';

import type { StatusBadgeProps } from '@ui';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EXTERNAL_LINK_FEATURES = 'noopener,noreferrer';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'info' | 'success' | 'error';

const PRIORITY_BADGE_VARIANTS: Record<ProgressPriority, BadgeVariant> = {
  low: 'outline',
  normal: 'secondary',
  high: 'info',
  urgent: 'destructive',
};

const PRIORITY_LABELS: Record<ProgressPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const ACTIVE_STATUSES = new Set<ProgressStatus>(['researching', 'executing', 'planning']);

const progressStatusConfig: Record<
  ProgressStatus,
  { label: string; tone: StatusBadgeProps['tone'] }
> = {
  backlog: { label: 'Backlog', tone: 'muted' },
  researching: { label: 'Researching', tone: 'info' },
  research_done: { label: 'Research Done', tone: 'info' },
  planning: { label: 'Planning', tone: 'info' },
  plan_ready: { label: 'Plan Ready', tone: 'purple' },
  executing: { label: 'Executing', tone: 'primary' },
  review: { label: 'Review', tone: 'amber' },
  done: { label: 'Done', tone: 'success' },
  archived: { label: 'Archived', tone: 'muted' },
  error: { label: 'Error', tone: 'destructive' },
};

function ProgressStatusBadge({
  status,
  className,
}: {
  status: ProgressStatus;
  className?: string;
}) {
  const config = progressStatusConfig[status];
  return (
    <StatusBadge
      className={className}
      pulsing={ACTIVE_STATUSES.has(status)}
      tone={config.tone}
    >
      {config.label}
    </StatusBadge>
  );
}

/* ------------------------------------------------------------------ */
/*  TaskRow                                                            */
/* ------------------------------------------------------------------ */

export interface TaskRowProps {
  task: ProgressTask;
  onNavigate: (task: ProgressTask) => void;
}

export function TaskRow({ task, onNavigate }: TaskRowProps) {
  const hasJira = task.jiraTicket !== undefined && task.jiraUrl !== undefined;
  const hasPr = task.prNumber !== undefined && task.prUrl !== undefined;

  function handleClick(): void {
    onNavigate(task);
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNavigate(task);
    }
  }

  function handleJiraClick(e: React.MouseEvent): void {
    e.stopPropagation();
    const url = task.jiraUrl;
    if (url !== undefined) {
      window.open(url, '_blank', EXTERNAL_LINK_FEATURES);
    }
  }

  function handlePrClick(e: React.MouseEvent): void {
    e.stopPropagation();
    const url = task.prUrl;
    if (url !== undefined) {
      window.open(url, '_blank', EXTERNAL_LINK_FEATURES);
    }
  }

  function handleJiraKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      const url = task.jiraUrl;
      if (url !== undefined) {
        window.open(url, '_blank', EXTERNAL_LINK_FEATURES);
      }
    }
  }

  function handlePrKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      const url = task.prUrl;
      if (url !== undefined) {
        window.open(url, '_blank', EXTERNAL_LINK_FEATURES);
      }
    }
  }

  return (
    <div
      className="hover:bg-accent/50 cursor-pointer px-4 py-3 transition-colors"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Text className="truncate font-medium" size="sm">
            {task.title}
          </Text>
          <Badge size="sm" variant={PRIORITY_BADGE_VARIANTS[task.priority]}>
            {PRIORITY_LABELS[task.priority]}
          </Badge>
          {hasJira ? (
            <div
              aria-label={`Open Jira ticket ${task.jiraTicket ?? ''}`}
              className="flex cursor-pointer items-center gap-1"
              role="button"
              tabIndex={0}
              onClick={handleJiraClick}
              onKeyDown={handleJiraKeyDown}
            >
              <Badge size="sm" variant="info">
                {task.jiraTicket}
              </Badge>
              <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0" />
            </div>
          ) : null}
          {hasPr ? (
            <div
              aria-label={`Open PR #${task.prNumber ?? ''}`}
              className="flex cursor-pointer items-center gap-1"
              role="button"
              tabIndex={0}
              onClick={handlePrClick}
              onKeyDown={handlePrKeyDown}
            >
              <Badge size="sm" variant="secondary">
                PR #{task.prNumber}
              </Badge>
              <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0" />
            </div>
          ) : null}
        </div>
        <ProgressStatusBadge status={task.status} />
      </div>
      {task.description.length > 0 ? (
        <Text className="line-clamp-2 text-xs" variant="muted">
          {task.description}
        </Text>
      ) : null}
    </div>
  );
}
