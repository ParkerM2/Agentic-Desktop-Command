/**
 * MyWorkPage -- Cross-project task view
 *
 * Displays all progress tasks from SQLite, optionally grouped by team name.
 * Includes status filter, search input, sort dropdown, priority/Jira/PR badges,
 * and clickable rows that navigate to the project tasks view.
 */

import { useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Briefcase, ExternalLink, Filter, RefreshCw, Users } from 'lucide-react';

import { ROUTE_PATTERNS } from '@shared/constants';
import { PROGRESS_EVENTS } from '@shared/ipc/progress/channels';
import type { ProgressPriority, ProgressStatus, ProgressTask } from '@shared/types/progress';

import { useIpcEvent } from '@renderer/shared/hooks';
import { useDebounce } from '@renderer/shared/hooks/useDebounce';
import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  PageContent,
  PageHeader,
  PageLayout,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  StatusBadge,
  Text,
} from '@ui';

import { myWorkKeys } from '../api/queryKeys';
import { useAllTasks } from '../api/useMyWork';

import type { StatusBadgeProps } from '@ui';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EXTERNAL_LINK_FEATURES = 'noopener,noreferrer';

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
/*  Sort options                                                        */
/* ------------------------------------------------------------------ */

type SortField = 'priority' | 'updatedAt' | 'status';

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'priority', label: 'Priority' },
  { value: 'updatedAt', label: 'Updated At' },
  { value: 'status', label: 'Status' },
];

const PRIORITY_ORDER: Record<ProgressPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const STATUS_ORDER: Record<ProgressStatus, number> = {
  error: 0,
  executing: 1,
  review: 2,
  planning: 3,
  plan_ready: 4,
  researching: 5,
  research_done: 6,
  backlog: 7,
  done: 8,
  archived: 9,
};

/* ------------------------------------------------------------------ */
/*  Priority badge config                                              */
/* ------------------------------------------------------------------ */

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
/*  Filtering, sorting, grouping                                       */
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

function filterByStatus(tasks: ProgressTask[], status: StatusFilter): ProgressTask[] {
  if (status === 'all') return tasks;
  return tasks.filter((t) => t.status === status);
}

function filterBySearch(tasks: ProgressTask[], query: string): ProgressTask[] {
  if (query.trim().length === 0) return tasks;
  const lower = query.toLowerCase();
  return tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower),
  );
}

function sortTasks(tasks: ProgressTask[], field: SortField): ProgressTask[] {
  const sorted = [...tasks];
  if (field === 'priority') {
    sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  } else if (field === 'updatedAt') {
    sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } else {
    sorted.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }
  return sorted;
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
    ? 'Try selecting a different status filter or changing your search to see more tasks.'
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

interface TaskRowProps {
  task: ProgressTask;
  onNavigate: (task: ProgressTask) => void;
}

function TaskRow({ task, onNavigate }: TaskRowProps) {
  const hasJira = task.jiraTicket !== undefined && task.jiraUrl !== undefined;
  const hasPr = task.prNumber !== undefined && task.prUrl !== undefined;

  function handleClick() {
    onNavigate(task);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNavigate(task);
    }
  }

  function handleJiraClick(e: React.MouseEvent) {
    e.stopPropagation();
    const url = task.jiraUrl;
    if (url !== undefined) {
      window.open(url, '_blank', EXTERNAL_LINK_FEATURES);
    }
  }

  function handlePrClick(e: React.MouseEvent) {
    e.stopPropagation();
    const url = task.prUrl;
    if (url !== undefined) {
      window.open(url, '_blank', EXTERNAL_LINK_FEATURES);
    }
  }

  function handleJiraKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      const url = task.jiraUrl;
      if (url !== undefined) {
        window.open(url, '_blank', EXTERNAL_LINK_FEATURES);
      }
    }
  }

  function handlePrKeyDown(e: React.KeyboardEvent) {
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

function TeamGroup({
  group,
  onNavigate,
}: {
  group: TasksByTeam;
  onNavigate: (task: ProgressTask) => void;
}) {
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
            <TaskRow
              key={task.slug}
              task={task}
              onNavigate={onNavigate}
            />
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
  onNavigate,
}: {
  isLoading: boolean;
  isError: boolean;
  taskGroups: TasksByTeam[];
  hasFilter: boolean;
  onRetry: () => void;
  onNavigate: (task: ProgressTask) => void;
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
          onNavigate={onNavigate}
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
  const navigate = useNavigate();
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('priority');

  const debouncedSearch = useDebounce(searchQuery, 250);

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

  function handleTaskNavigate(task: ProgressTask) {
    if (!activeProjectId) return;
    void navigate({
      to: ROUTE_PATTERNS.PROJECT_TASKS,
      params: { projectId: activeProjectId },
      search: { taskSlug: task.slug },
    });
  }

  // Filter and sort tasks
  const processedTasks = useMemo(() => {
    const statusFiltered = filterByStatus(tasks ?? [], statusFilter);
    const searchFiltered = filterBySearch(statusFiltered, debouncedSearch);
    return sortTasks(searchFiltered, sortField);
  }, [tasks, statusFilter, debouncedSearch, sortField]);

  const taskGroups = useMemo(() => {
    return groupTasksByTeam(processedTasks);
  }, [processedTasks]);

  const totalTasks = processedTasks.length;
  const hasFilter = statusFilter !== 'all' || debouncedSearch.trim().length > 0;

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="All tasks across your projects">
            My Work
          </PageHeader.Title>
          <PageHeader.Actions>
            <SearchInput
              className="w-[200px]"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              onClear={() => { setSearchQuery(''); }}
            />
            <Filter className="text-muted-foreground h-4 w-4" />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); }}>
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
            <Select value={sortField} onValueChange={(v) => { setSortField(v as SortField); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Text className="text-xs" variant="muted">
              {totalTasks} {getTaskCountLabel(totalTasks)}
            </Text>
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>
      <PageContent>
        <TaskListContent
          hasFilter={hasFilter}
          isError={tasksError}
          isLoading={tasksLoading}
          taskGroups={taskGroups}
          onNavigate={handleTaskNavigate}
          onRetry={handleRetry}
        />
      </PageContent>
    </PageLayout>
  );
}
