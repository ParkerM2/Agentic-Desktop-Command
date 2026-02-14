/**
 * TaskTable — Main container with filters, sorting, selection, and bulk actions
 */

import { useCallback, useMemo, useState } from 'react';

import { useParams } from '@tanstack/react-router';
import { Loader2, Trash2 } from 'lucide-react';

import type { Task, TaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useDeleteTask, useExecuteTask, useUpdateTaskStatus } from '../api/useTaskMutations';
import { useAllTasks, useTasks } from '../api/useTasks';
import { useTaskEvents } from '../hooks/useTaskEvents';
import { useTaskUI } from '../store';

import { TaskTableFilters } from './TaskTableFilters';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';

import type { SortColumn, SortDirection } from './TaskTableHeader';

interface TaskTableProps {
  projectId?: string | null;
  onTaskClick?: (task: Task) => void;
}

function matchesSearch(task: Task, query: string): boolean {
  const lower = query.toLowerCase();
  return (
    task.title.toLowerCase().includes(lower) ||
    task.description.toLowerCase().includes(lower)
  );
}

function compareByColumn(a: Task, b: Task, column: SortColumn, direction: SortDirection): number {
  let comparison = 0;

  switch (column) {
    case 'title': {
      comparison = a.title.localeCompare(b.title);
      break;
    }
    case 'status': {
      comparison = a.status.localeCompare(b.status);
      break;
    }
    case 'project': {
      const aProject = (a.metadata?.projectId as string | undefined) ?? '';
      const bProject = (b.metadata?.projectId as string | undefined) ?? '';
      comparison = aProject.localeCompare(bProject);
      break;
    }
    case 'updatedAt': {
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      break;
    }
  }

  return direction === 'asc' ? comparison : -comparison;
}

export function TaskTable({ projectId: projectIdProp, onTaskClick }: TaskTableProps) {
  const params = useParams({ strict: false });
  const projectId: string | undefined = projectIdProp ?? (params as Record<string, string | undefined>).projectId;

  useTaskEvents();

  // Determine which query to use
  const projectQuery = useTasks(projectId ?? null);
  const allQuery = useAllTasks();
  const query = projectId ? projectQuery : allQuery;

  const tasks = useMemo(() => query.data ?? [], [query.data]);
  const { isLoading } = query;

  // Mutations
  const deleteTask = useDeleteTask();
  const executeTask = useExecuteTask();
  const updateStatus = useUpdateTaskStatus();

  // Store state
  const searchQuery = useTaskUI((s) => s.searchQuery);
  const filterStatuses = useTaskUI((s) => s.filterStatuses);
  const selectTask = useTaskUI((s) => s.selectTask);

  // Local state
  const [sortColumn, setSortColumn] = useState<SortColumn>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Apply search filter
    if (searchQuery.length > 0) {
      result = result.filter((t) => matchesSearch(t, searchQuery));
    }

    // Apply status filter
    if (filterStatuses.length > 0) {
      result = result.filter((t) => filterStatuses.includes(t.status));
    }

    // Sort
    result.sort((a, b) => compareByColumn(a, b, sortColumn, sortDirection));

    return result;
  }, [tasks, searchQuery, filterStatuses, sortColumn, sortDirection]);

  const allSelected =
    filteredTasks.length > 0 && filteredTasks.every((t) => selectedIds.has(t.id));

  // Handlers
  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn],
  );

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  }, [allSelected, filteredTasks]);

  const handleSelectRow = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleTaskClick = useCallback(
    (task: Task) => {
      selectTask(task.id);
      onTaskClick?.(task);
    },
    [selectTask, onTaskClick],
  );

  const handleDelete = useCallback(
    (task: Task) => {
      const taskProjectId = (task.metadata?.projectId as string | undefined) ?? projectId ?? '';
      deleteTask.mutate({ taskId: task.id, projectId: taskProjectId });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    },
    [deleteTask, projectId],
  );

  const handleExecute = useCallback(
    (task: Task) => {
      const taskProjectId = (task.metadata?.projectId as string | undefined) ?? projectId ?? '';
      executeTask.mutate({ taskId: task.id, projectId: taskProjectId });
    },
    [executeTask, projectId],
  );

  const handleBulkDelete = useCallback(() => {
    for (const taskId of selectedIds) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        const taskProjectId = (task.metadata?.projectId as string | undefined) ?? projectId ?? '';
        deleteTask.mutate({ taskId, projectId: taskProjectId });
      }
    }
    setSelectedIds(new Set());
  }, [selectedIds, tasks, deleteTask, projectId]);

  const handleBulkStatusChange = useCallback(
    (status: TaskStatus) => {
      for (const taskId of selectedIds) {
        updateStatus.mutate({ taskId, status });
      }
      setSelectedIds(new Set());
    },
    [selectedIds, updateStatus],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-3 text-sm">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Filters */}
      <div className="px-4 py-3">
        <TaskTableFilters />
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 ? (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
        />
      ) : null}

      {/* Table */}
      <div
        className="border-border rounded-lg border"
        role="table"
      >
        <TaskTableHeader
          allSelected={allSelected}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSelectAll={handleSelectAll}
          onSort={handleSort}
        />

        {/* Rows */}
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskTableRow
              key={task.id}
              isSelected={selectedIds.has(task.id)}
              task={task}
              onClick={() => handleTaskClick(task)}
              onDelete={() => handleDelete(task)}
              onExecute={() => handleExecute(task)}
              onSelect={() => handleSelectRow(task.id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">No tasks found</p>
            {searchQuery.length > 0 || filterStatuses.length > 0 ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Try adjusting your filters
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bulk Action Bar ───────────────────────────────────────────

const BULK_STATUS_OPTIONS: TaskStatus[] = ['backlog', 'queue', 'in_progress', 'done'];

interface BulkActionBarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkStatusChange: (status: TaskStatus) => void;
}

function BulkActionBar({ selectedCount, onBulkDelete, onBulkStatusChange }: BulkActionBarProps) {
  return (
    <div className={cn('bg-muted/50 border-border flex items-center gap-3 border-y px-4 py-2')}>
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>

      <div className="flex items-center gap-1">
        {BULK_STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            className={cn(
              'text-muted-foreground hover:text-foreground',
              'rounded px-2 py-1 text-xs transition-colors',
              'hover:bg-muted',
            )}
            onClick={() => onBulkStatusChange(status)}
          >
            {status.replaceAll('_', ' ')}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={cn(
          'text-destructive hover:bg-destructive/10',
          'ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
        )}
        onClick={onBulkDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Delete</span>
      </button>
    </div>
  );
}
