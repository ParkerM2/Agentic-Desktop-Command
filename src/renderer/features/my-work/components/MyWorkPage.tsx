/**
 * MyWorkPage -- Cross-project task view
 *
 * Displays all progress tasks from SQLite, optionally grouped by team name.
 * Includes status filter for quick access to tasks by state.
 */

import { useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Briefcase, Filter, RefreshCw, Users } from 'lucide-react';

import { PROGRESS_EVENTS } from '@shared/ipc/progress/channels';
import type { ProgressStatus, ProgressTask } from '@shared/types/progress';

import { useIpcEvent } from '@renderer/shared/hooks';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  PageContent,
  PageHeader,
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  StatusBadge,
} from '@ui';


import { myWorkKeys } from '../api/queryKeys';
import { useAllTasks } from '../api/useMyWork';

import type { StatusBadgeProps } from '@ui';

/* ------------------------------------------------------------------ */
/*  Status filter                                                      */
/* ------------------------------------------------------------------ */

type StatusFilter = 'all' | ProgressStatus;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Tasks' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'researching', label: 'Researching' },
  { value: 'research_done', label: 'Research Done' },
  { value: 'planning', label: 'Planning' },
  { value: 'plan_ready', label: 'Plan Ready' },
  { value: 'executing', label: 'Executing' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
  { value: 'error', label: 'Error' },
];

/* ------------------------------------------------------------------ */
/*  ProgressStatus badge config                                        */
/* ------------------------------------------------------------------ */

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
/*  Grouping by team name                                              */
/* ------------------------------------------------------------------ */

interface TasksByTeam {
  teamName: string;
  tasks: ProgressTask[];
}

function groupTasksByTeam(tasks: ProgressTask[]): TasksByTeam[] {
  const grouped = new Map<string, ProgressTask[]>();

  for (const task of tasks) {
    const team = task.teamName ?? 'Ungrouped';
    const existing = grouped.get(team) ?? [];
    existing.push(task);
    grouped.set(team, existing);
  }

  const result: TasksByTeam[] = [];
  for (const [teamName, teamTasks] of grouped.entries()) {
    result.push({ teamName, tasks: teamTasks });
  }

  result.sort((a, b) => a.teamName.localeCompare(b.teamName));
  return result;
}

function filterTasks(tasks: ProgressTask[], status: StatusFilter): ProgressTask[] {
  if (status === 'all') return tasks;
  return tasks.filter((t) => t.status === status);
}

function getTaskCountLabel(count: number): string {
  return count === 1 ? 'task' : 'tasks';
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MyWorkEmptyState({ hasFilter }: { hasFilter: boolean }) {
  const title = hasFilter ? 'No tasks match filter' : 'No tasks yet';
  const description = hasFilter
    ? 'Try selecting a different status filter to see more tasks.'
    : 'Tasks will appear here once you create them. Add a project and create tasks to get started.';

  return (
    <EmptyState
      description={description}
      icon={Briefcase}
      size="lg"
      title={title}
    />
  );
}

function TeamGroup({ group }: { group: TasksByTeam }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-3">
        <Users className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground text-sm font-semibold">{group.teamName}</span>
        <span className="text-muted-foreground text-xs">({group.tasks.length})</span>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <div className="divide-border divide-y">
          {group.tasks.map((task) => (
            <div
              key={task.slug}
              className="px-4 py-3"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="text-foreground text-sm font-medium">{task.title}</span>
                <ProgressStatusBadge status={task.status} />
              </div>
              {task.description ? (
                <p className="text-muted-foreground line-clamp-2 text-xs">{task.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      description="Unable to load tasks. The progress database may be unavailable."
      icon={RefreshCw}
      size="lg"
      title="Failed to load tasks"
      action={
        <Button onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      }
    />
  );
}

function TaskListContent({
  isLoading,
  isError,
  taskGroups,
  hasFilter,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  taskGroups: TasksByTeam[];
  hasFilter: boolean;
  onRetry: () => void;
}) {
  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-12">
        Loading tasks...
      </div>
    );
  }

  if (taskGroups.length === 0) {
    return <MyWorkEmptyState hasFilter={hasFilter} />;
  }

  return (
    <div className="space-y-4">
      {taskGroups.map((group) => (
        <TeamGroup
          key={group.teamName}
          group={group}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function MyWorkPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useAllTasks();

  // Invalidate task list on progress events
  useIpcEvent(PROGRESS_EVENTS.TASK.CREATED, () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });
  useIpcEvent(PROGRESS_EVENTS.TASK.UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });
  useIpcEvent(PROGRESS_EVENTS.TASK.ARCHIVED, () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });

  function handleRetry() {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  }

  // Filter and group tasks
  const filteredTasks = useMemo(() => {
    return filterTasks(tasks ?? [], statusFilter);
  }, [tasks, statusFilter]);

  const taskGroups = useMemo(() => {
    return groupTasksByTeam(filteredTasks);
  }, [filteredTasks]);

  const totalTasks = filteredTasks.length;
  const hasFilter = statusFilter !== 'all';

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="All tasks across your projects">
            My Work
          </PageHeader.Title>
          <PageHeader.Actions>
            <Filter className="text-muted-foreground h-4 w-4" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">
              {totalTasks} {getTaskCountLabel(totalTasks)}
            </span>
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>
      <PageContent>
        <TaskListContent
          hasFilter={hasFilter}
          isError={tasksError}
          isLoading={tasksLoading}
          taskGroups={taskGroups}
          onRetry={handleRetry}
        />
      </PageContent>
    </PageLayout>
  );
}
