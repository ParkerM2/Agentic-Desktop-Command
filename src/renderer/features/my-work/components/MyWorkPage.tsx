/**
 * MyWorkPage -- Cross-project task view
 *
 * Displays all tasks from all projects grouped by project name.
 * Includes status filter for quick access to tasks by state.
 */

import { useMemo, useState } from 'react';

import { Briefcase, Filter, FolderOpen } from 'lucide-react';

import type { Task, TaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useProjects } from '@features/projects';
import { TaskStatusBadge } from '@features/tasks';

import { useAllTasks } from '../api/useMyWork';

type StatusFilter = 'all' | TaskStatus;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Tasks' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'queue', label: 'Queue' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ai_review', label: 'AI Review' },
  { value: 'human_review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'pr_created', label: 'PR Created' },
  { value: 'error', label: 'Error' },
];

interface TasksByProject {
  projectId: string;
  projectName: string;
  tasks: Task[];
}

function groupTasksByProject(
  tasks: Task[],
  projectsMap: Map<string, string>,
): TasksByProject[] {
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

function TaskListContent({
  isLoading,
  taskGroups,
  hasFilter,
}: {
  isLoading: boolean;
  taskGroups: TasksByProject[];
  hasFilter: boolean;
}) {
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data: tasks, isLoading: tasksLoading } = useAllTasks();
  const { data: projects } = useProjects();

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
              'focus:ring-primary focus:outline-none focus:ring-1',
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
      <TaskListContent hasFilter={hasFilter} isLoading={tasksLoading} taskGroups={taskGroups} />
    </div>
  );
}
