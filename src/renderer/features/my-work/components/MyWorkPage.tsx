/**
 * MyWorkPage -- Cross-project task view
 *
 * Displays all tasks from all projects grouped by project name.
 * Includes status filter for quick access to tasks by state.
 * Shows Hub-disconnected error state when Hub is unreachable.
 */

import { useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Briefcase, Filter, FolderOpen, RefreshCw } from 'lucide-react';

import type { Task, TaskStatus } from '@shared/types';

import { useHubEvent, useIpcEvent } from '@renderer/shared/hooks';
import { cn } from '@renderer/shared/lib/utils';

import { useProjects } from '@features/projects';
import { TaskStatusBadge } from '@features/tasks';

import { myWorkKeys } from '../api/queryKeys';
import { useAllTasks } from '../api/useMyWork';

type StatusFilter = 'all' | TaskStatus;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Tasks' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'planning', label: 'Planning' },
  { value: 'plan_ready', label: 'Plan Ready' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'error', label: 'Error' },
];

interface TasksByProject {
  projectId: string;
  projectName: string;
  tasks: Task[];
}

function groupTasksByProject(tasks: Task[], projectsMap: Map<string, string>): TasksByProject[] {
  const grouped = new Map<string, Task[]>();

  for (const task of tasks) {
    const projectId = (task.metadata?.projectId as string | undefined) ?? 'unknown';
    const existing = grouped.get(projectId) ?? [];
    existing.push(task);
    grouped.set(projectId, existing);
  }

  const result: TasksByProject[] = [];
  for (const [projectId, projectTasks] of grouped.entries()) {
    result.push({
      projectId,
      projectName: projectsMap.get(projectId) ?? 'Unknown Project',
      tasks: projectTasks,
    });
  }

  // Sort by project name
  result.sort((a, b) => a.projectName.localeCompare(b.projectName));

  return result;
}

function filterTasks(tasks: Task[], status: StatusFilter): Task[] {
  if (status === 'all') return tasks;
  return tasks.filter((t) => t.status === status);
}

function getTaskCountLabel(count: number): string {
  if (count === 1) return 'task';
  return 'tasks';
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  const title = hasFilter ? 'No tasks match filter' : 'No tasks yet';
  const description = hasFilter
    ? 'Try selecting a different status filter to see more tasks.'
    : 'Tasks from all your projects will appear here. Add projects and create tasks to get started.';

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Briefcase className="text-muted-foreground mb-4 h-12 w-12" />
      <h3 className="text-foreground mb-2 text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
    </div>
  );
}

function ProjectGroup({ group }: { group: TasksByProject }) {
  return (
    <div className="border-border bg-card rounded-lg border">
      {/* Project header */}
      <div className="border-border flex items-center gap-2 border-b px-4 py-3">
        <FolderOpen className="text-muted-foreground h-4 w-4" />
        <h2 className="text-foreground text-sm font-semibold">{group.projectName}</h2>
        <span className="text-muted-foreground text-xs">({group.tasks.length})</span>
      </div>

      {/* Task list */}
      <div className="divide-border divide-y">
        {group.tasks.map((task) => (
          <div key={task.id} className="px-4 py-3">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="text-foreground text-sm font-medium">{task.title}</h3>
              <TaskStatusBadge status={task.status} />
            </div>
            {task.description ? (
              <p className="text-muted-foreground line-clamp-2 text-xs">{task.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function HubDisconnectedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="text-warning mb-4 h-12 w-12" />
      <h3 className="text-foreground mb-2 text-lg font-medium">Hub disconnected</h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        Unable to reach the Hub server. Tasks cannot be loaded while the Hub is unreachable.
      </p>
      <button
        type="button"
        className={cn(
          'bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
          'transition-opacity hover:opacity-90',
        )}
        onClick={onRetry}
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
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
  taskGroups: TasksByProject[];
  hasFilter: boolean;
  onRetry: () => void;
}) {
  if (isError) {
    return <HubDisconnectedState onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-12">
        Loading tasks...
      </div>
    );
  }

  if (taskGroups.length === 0) {
    return <EmptyState hasFilter={hasFilter} />;
  }

  return (
    <div className="space-y-4">
      {taskGroups.map((group) => (
        <ProjectGroup key={group.projectId} group={group} />
      ))}
    </div>
  );
}

export function MyWorkPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useAllTasks();
  const { data: projects } = useProjects();

  // Invalidate task list when Hub task events arrive
  useHubEvent('event:hub.tasks.created', () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });
  useHubEvent('event:hub.tasks.updated', () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });
  useHubEvent('event:hub.tasks.deleted', () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });
  useHubEvent('event:hub.tasks.completed', () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });

  // Refresh on local task status changes
  useIpcEvent('event:task.statusChanged', () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });

  function handleRetry() {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  }

  // Build a map of projectId -> projectName
  const projectsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (projects) {
      for (const p of projects) {
        map.set(p.id, p.name);
      }
    }
    return map;
  }, [projects]);

  // Filter and group tasks
  const filteredTasks = useMemo(() => {
    return filterTasks(tasks ?? [], statusFilter);
  }, [tasks, statusFilter]);

  const taskGroups = useMemo(() => {
    return groupTasksByProject(filteredTasks, projectsMap);
  }, [filteredTasks, projectsMap]);

  const totalTasks = filteredTasks.length;
  const hasFilter = statusFilter !== 'all';

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Briefcase className="text-muted-foreground h-6 w-6" />
          <h1 className="text-foreground text-2xl font-bold">My Work</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">All tasks across your projects</p>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          <select
            value={statusFilter}
            className={cn(
              'border-border bg-card text-foreground rounded-md border px-3 py-1.5 text-sm',
              'focus:ring-primary focus:ring-1 focus:outline-none',
            )}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-muted-foreground text-sm">
          {totalTasks} {getTaskCountLabel(totalTasks)}
        </span>
      </div>

      {/* Content */}
      <TaskListContent
        hasFilter={hasFilter}
        isError={tasksError}
        isLoading={tasksLoading}
        taskGroups={taskGroups}
        onRetry={handleRetry}
      />
    </div>
  );
}
