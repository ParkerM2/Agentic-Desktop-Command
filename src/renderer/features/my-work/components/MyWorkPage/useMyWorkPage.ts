/**
 * useMyWorkPage — Logic hook for MyWorkPage
 */

import { useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { ROUTE_PATTERNS } from '@shared/constants';
import { PROGRESS_EVENTS } from '@shared/ipc/progress/channels';
import type { ProgressPriority, ProgressStatus, ProgressTask } from '@shared/types/progress';

import { useIpcEvent } from '@renderer/shared/hooks';
import { useDebounce } from '@renderer/shared/hooks/useDebounce';
import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { myWorkKeys } from '../../api/queryKeys';
import { useAllTasks } from '../../api/useMyWork';

import type { TasksByTeam } from '../TeamGroup';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type StatusFilter = 'all' | ProgressStatus;
export type SortField = 'priority' | 'updatedAt' | 'status';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
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

export const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
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
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

export function groupTasksByTeam(tasks: ProgressTask[]): TasksByTeam[] {
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

export function filterByStatus(tasks: ProgressTask[], status: StatusFilter): ProgressTask[] {
  if (status === 'all') return tasks;
  return tasks.filter((t) => t.status === status);
}

export function filterBySearch(tasks: ProgressTask[], query: string): ProgressTask[] {
  if (query.trim().length === 0) return tasks;
  const lower = query.toLowerCase();
  return tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower),
  );
}

export function sortTasks(tasks: ProgressTask[], field: SortField): ProgressTask[] {
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

export function getTaskCountLabel(count: number): string {
  return count === 1 ? 'task' : 'tasks';
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useMyWorkPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('priority');

  const debouncedSearch = useDebounce(searchQuery, 250);

  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useAllTasks();

  useIpcEvent(PROGRESS_EVENTS.TASK.CREATED, () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });
  useIpcEvent(PROGRESS_EVENTS.TASK.UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });
  useIpcEvent(PROGRESS_EVENTS.TASK.ARCHIVED, () => {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  });

  function handleRetry(): void {
    void queryClient.invalidateQueries({ queryKey: myWorkKeys.tasks() });
  }

  function handleTaskNavigate(task: ProgressTask): void {
    if (!activeProjectId) return;
    void navigate({
      to: ROUTE_PATTERNS.PROJECT_TASKS,
      params: { projectId: activeProjectId },
      search: { taskSlug: task.slug },
    });
  }

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

  return {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    tasksLoading,
    tasksError,
    taskGroups,
    totalTasks,
    hasFilter,
    handleRetry,
    handleTaskNavigate,
  };
}
