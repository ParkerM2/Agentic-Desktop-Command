/**
 * TaskDataGrid — TanStack Table + shadcn/ui primitives
 *
 * Replaces AG-Grid with a headless TanStack Table rendered
 * through the design system's Table primitives.
 */

import { useMemo, useState } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';

import type { Task, TaskStatus } from '@shared/types';

import { useLooseParams } from '@renderer/shared/hooks';
import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';

import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  PageLayout,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui';

import { useAllTasks, useTasks } from '../../api/useTasks';
import { useTaskEvents } from '../../hooks/useTaskEvents';
import { useTaskUI } from '../../store';
import { TaskDetailRow } from '../detail/TaskDetailRow';
import { TaskFiltersToolbar } from '../TaskFiltersToolbar';

import type { ColumnDef, SortingState } from '@tanstack/react-table';

// ── Status config ──────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  planning: 'Planning',
  plan_ready: 'Plan Ready',
  queued: 'Queued',
  running: 'Running',
  paused: 'Paused',
  review: 'Review',
  done: 'Done',
  error: 'Error',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  backlog: 'outline',
  planning: 'secondary',
  plan_ready: 'secondary',
  queued: 'outline',
  running: 'default',
  paused: 'secondary',
  review: 'secondary',
  done: 'default',
  error: 'destructive',
};

const ACTIVE_STATUSES = new Set(['planning', 'running']);

// ── Columns ────────────────────────────────────────────────

function createTaskColumns(
  expandedRowIds: Set<string>,
  toggleRowExpansion: (id: string) => void,
): Array<ColumnDef<Task>> {
  return [
    {
      id: 'expand',
      size: 40,
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => (
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => toggleRowExpansion(row.original.id)}
        >
          {expandedRowIds.has(row.original.id) ? (
            <ChevronDown />
          ) : (
            <ChevronRight />
          )}
        </Button>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 130,
      cell: ({ row }) => {
        const status = row.getValue<TaskStatus>('status');
        return (
          <Badge variant={STATUS_VARIANTS[status] ?? 'outline'}>
            {ACTIVE_STATUSES.has(status) ? (
              <span className="bg-primary mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
            ) : null}
            {STATUS_LABELS[status] ?? status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown />
        </Button>
      ),
      size: 300,
      cell: ({ row }) => (
        <span className="text-foreground truncate text-sm font-medium">
          {row.getValue<string>('title')}
        </span>
      ),
    },
    {
      id: 'priority',
      accessorFn: (row) =>
        (row.metadata as Record<string, unknown> | undefined)?.priority ?? 'medium',
      header: 'Priority',
      size: 100,
      cell: ({ getValue }) => {
        const priority = getValue<string>();
        const colors: Record<string, string> = {
          critical: 'text-destructive',
          high: 'text-warning',
          medium: 'text-foreground',
          low: 'text-muted-foreground',
        };
        return (
          <span className={cn('text-xs font-medium capitalize', colors[priority] ?? '')}>
            {priority}
          </span>
        );
      },
    },
    {
      id: 'progress',
      accessorFn: (row) => row.executionProgress?.overallProgress ?? 0,
      header: 'Progress',
      size: 160,
      cell: ({ getValue }) => {
        const progress = getValue<number>();
        return (
          <div className="flex items-center gap-2">
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${String(Math.min(100, progress))}%` }}
              />
            </div>
            <span className="text-muted-foreground w-8 text-right text-xs">
              {progress}%
            </span>
          </div>
        );
      },
    },
    {
      id: 'cost',
      accessorFn: (row) =>
        (row.metadata as Record<string, unknown> | undefined)?.costUsd ?? 0,
      header: 'Cost',
      size: 90,
      cell: ({ getValue }) => {
        const cost = getValue<number>();
        if (cost === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="text-foreground text-xs font-medium">
            ${cost < 1 ? cost.toFixed(3) : cost.toFixed(2)}
          </span>
        );
      },
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Updated
          <ArrowUpDown />
        </Button>
      ),
      size: 110,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatRelativeTime(row.getValue<string>('updatedAt'))}
        </span>
      ),
    },
  ];
}

// ── Component ──────────────────────────────────────────────

interface TaskDataGridProps {
  projectId?: string | null;
}

export function TaskDataGrid({ projectId: projectIdProp }: TaskDataGridProps) {
  const params = useLooseParams();
  const projectId: string | undefined = projectIdProp ?? params.projectId;

  useTaskEvents();

  // Queries
  const projectQuery = useTasks(projectId ?? null);
  const allQuery = useAllTasks();
  const query = projectId ? projectQuery : allQuery;
  const tasks = useMemo(() => query.data ?? [], [query.data]);
  const { isLoading } = query;

  // Store
  const expandedRowIds = useTaskUI((s) => s.expandedRowIds);
  const toggleRowExpansion = useTaskUI((s) => s.toggleRowExpansion);
  const gridSearchText = useTaskUI((s) => s.gridSearchText);
  const filterStatuses = useTaskUI((s) => s.filterStatuses);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updatedAt', desc: true },
  ]);

  // Filtered data
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (gridSearchText.length > 0) {
      const lower = gridSearchText.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Hub data may omit description
          (t.description ?? '').toLowerCase().includes(lower),
      );
    }

    if (filterStatuses.length > 0) {
      filtered = filtered.filter((t) => filterStatuses.includes(t.status));
    }

    return filtered;
  }, [tasks, gridSearchText, filterStatuses]);

  // Stable column defs
  const columns = useMemo(
    () => createTaskColumns(expandedRowIds, toggleRowExpansion),
    [expandedRowIds, toggleRowExpansion],
  );

  // Table instance
  const table = useReactTable({
    data: filteredTasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  });

  if (isLoading) {
    return (
      <PageLayout>
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Title>Tasks</PageHeader.Title>
          </PageHeader.Row>
        </PageHeader>
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title>Tasks</PageHeader.Title>
          <PageHeader.Actions>
            <TaskFiltersToolbar />
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4">
        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <>
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expandedRowIds.has(row.original.id) ? (
                      <TableRow key={`${row.id}-detail`}>
                        <TableCell
                          className="bg-muted/20 p-4"
                          colSpan={columns.length}
                        >
                          <TaskDetailRow task={row.original} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </>
                ))
              ) : (
                <TableRow>
                  <TableCell className="h-32" colSpan={columns.length}>
                    <EmptyState
                      description="Try adjusting your filters or create a new task"
                      title="No tasks found"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
}
