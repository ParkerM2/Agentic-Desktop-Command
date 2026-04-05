/**
 * MyWorkPage -- Cross-project task view
 *
 * Displays all tasks from all projects grouped by project name.
 * Includes status filter for quick access to tasks by state.
 * Shows Hub-disconnected error state when Hub is unreachable.
 */

import { useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Briefcase, Filter, FolderOpen, RefreshCw } from 'lucide-react';

import { PROJECT_VIEWS, projectViewPath } from '@shared/constants';
import type { Task, TaskStatus } from '@shared/types';

import { useHubEvent, useIpcEvent } from '@renderer/shared/hooks';

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
} from '@ui';

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

function MyWorkEmptyState({ hasFilter }: { hasFilter: boolean }) {
  const title = hasFilter ? 'No tasks match filter' : 'No tasks yet';
  const description = hasFilter
    ? 'Try selecting a different status filter to see more tasks.'
    : 'Tasks from all your projects will appear here. Add projects and create tasks to get started.';

  return (
    <EmptyState
      description={description}
      icon={Briefcase}
      size="lg"
      title={title}
    />
  );
}

function ProjectGroup({
  group,
  onNavigateToProject,
}: {
  group: TasksByProject;
  onNavigateToProject: (projectId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-3">
        <FolderOpen className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground text-sm font-semibold">{group.projectName}</span>
        <span className="text-muted-foreground text-xs">({group.tasks.length})</span>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <div className="divide-border divide-y">
          {group.tasks.map((task) => (
            <Button
              key={task.id}
              className="h-auto w-full justify-start px-4 py-3 text-left"
              variant="ghost"
              onClick={() => onNavigateToProject(group.projectId)}
            >
              <div className="w-full">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="text-foreground text-sm font-medium">{task.title}</span>
                  <TaskStatusBadge status={task.status} />
                </div>
                {task.description ? (
                  <p className="text-muted-foreground line-clamp-2 text-xs">{task.description}</p>
                ) : null}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HubDisconnectedState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      description="Unable to reach the Hub server. Tasks cannot be loaded while the Hub is unreachable."
      icon={AlertTriangle}
      size="lg"
      title="Hub disconnected"
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
  onNavigateToProject,
}: {
  isLoading: boolean;
  isError: boolean;
  taskGroups: TasksByProject[];
  hasFilter: boolean;
  onRetry: () => void;
  onNavigateToProject: (projectId: string) => void;
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
    return <MyWorkEmptyState hasFilter={hasFilter} />;
  }

  return (
    <div className="space-y-4">
      {taskGroups.map((group) => (
        <ProjectGroup
          key={group.projectId}
          group={group}
          onNavigateToProject={onNavigateToProject}
        />
      ))}
    </div>
  );
}

export function MyWorkPage() {
  const navigate = useNavigate();
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

  function handleNavigateToProject(projectId: string) {
    void navigate({ to: projectViewPath(projectId, PROJECT_VIEWS.TASKS) });
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
    <PageLayout>
      <PageHeader
        description="All tasks across your projects"
        title="My Work"
      >
        {/* Filter bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
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
          </div>
          <span className="text-muted-foreground text-sm">
            {totalTasks} {getTaskCountLabel(totalTasks)}
          </span>
        </div>
      </PageHeader>
      <PageContent>
        <TaskListContent
          hasFilter={hasFilter}
          isError={tasksError}
          isLoading={tasksLoading}
          taskGroups={taskGroups}
          onNavigateToProject={handleNavigateToProject}
          onRetry={handleRetry}
        />
      </PageContent>
    </PageLayout>
  );
}
