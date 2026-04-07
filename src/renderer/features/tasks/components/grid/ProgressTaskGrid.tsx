/**
 * ProgressTaskGrid — TanStack Table grid reading from useProgressContext.
 *
 * Replaces the Hub-backed TaskDataGrid with a local-first progress store grid.
 * Data source: useProgressContext (src/renderer/shared/stores/progress-context-store.ts)
 */

import { useMemo, useState } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, ChevronRight, Play, Plus } from 'lucide-react';

import type { ProgressPriority, ProgressStatus, ProgressTask } from '@shared/types/progress';

import { cn, formatRelativeTime } from '@renderer/shared/lib/utils';
import { useProgressContext } from '@renderer/shared/stores/progress-context-store';

import {
  Badge,
  Button,
  Code,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@ui';

// TODO: Task 6 — import ProgressTaskDetailRow once created
// import { ProgressTaskDetailRow } from '../detail/ProgressTaskDetailRow';

import type { ColumnDef, SortingState } from '@tanstack/react-table';

// ── Status config ──────────────────────────────────────────

const PROGRESS_STATUS_LABELS: Record<ProgressStatus, string> = {
  backlog: 'Backlog',
  researching: 'Researching',
  research_done: 'Research Done',
  planning: 'Planning',
  plan_ready: 'Plan Ready',
  executing: 'Executing',
  review: 'Review',
  done: 'Done',
  archived: 'Archived',
  error: 'Error',
};

const PROGRESS_STATUS_VARIANTS: Record<
  ProgressStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  backlog: 'outline',
  researching: 'secondary',
  research_done: 'secondary',
  planning: 'secondary',
  plan_ready: 'secondary',
  executing: 'default',
  review: 'secondary',
  done: 'default',
  archived: 'outline',
  error: 'destructive',
};

const ACTIVE_PROGRESS_STATUSES = new Set<ProgressStatus>(['researching', 'planning', 'executing']);

const PRIORITY_LABELS: Record<ProgressPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const PRIORITY_VARIANTS: Record<
  ProgressPriority,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  low: 'outline',
  normal: 'secondary',
  high: 'secondary',
  urgent: 'destructive',
};

const ALL_STATUSES: ProgressStatus[] = [
  'backlog',
  'researching',
  'research_done',
  'planning',
  'plan_ready',
  'executing',
  'review',
  'done',
  'error',
];

// ── Stage indicator ────────────────────────────────────────

interface StepIndicatorProps {
  done: boolean;
  label: string;
}

function StepIndicator({ done, label }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={cn(
          'h-3 w-3 rounded-full border-2 transition-colors',
          done
            ? 'bg-primary border-primary'
            : 'bg-background border-muted-foreground/40',
        )}
        aria-label={done ? `${label}: done` : `${label}: pending`}
      />
      <Text className="text-muted-foreground text-[9px] font-medium uppercase leading-none">
        {label[0]}
      </Text>
    </div>
  );
}

interface StageCellProps {
  hasResearch: boolean;
  hasPlan: boolean;
  hasTeamTasks: boolean;
}

function StageCell({ hasResearch, hasPlan, hasTeamTasks }: StageCellProps) {
  return (
    <div className="flex items-center gap-2">
      <StepIndicator done={hasResearch} label="Research" />
      <div className="bg-muted-foreground/20 h-px w-2 flex-shrink-0" />
      <StepIndicator done={hasPlan} label="Plan" />
      <div className="bg-muted-foreground/20 h-px w-2 flex-shrink-0" />
      <StepIndicator done={hasTeamTasks} label="Team" />
    </div>
  );
}

// ── New Task Dialog ────────────────────────────────────────

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (
    slug: string,
    title: string,
    description: string,
    priority?: ProgressPriority,
  ) => Promise<unknown>;
}

function NewTaskDialog({ open, onOpenChange, onCreate }: NewTaskDialogProps) {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ProgressPriority>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSlug('');
      setTitle('');
      setDescription('');
      setPriority('normal');
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slug.trim() || !title.trim()) {
      setError('Slug and title are required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(slug.trim(), title.trim(), description.trim(), priority);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>
            Create a new progress task. The slug becomes the directory name under{' '}
            <Code>progress/</Code>.
          </DialogDescription>
        </DialogHeader>

        <form id="new-task-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-slug">Slug</Label>
            <Input
              id="task-slug"
              placeholder="my-feature"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="Implement feature X"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Input
              id="task-description"
              placeholder="Short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as ProgressPriority)}
            >
              <SelectTrigger id="task-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error === null ? null : (
            <Text className="text-destructive text-sm">{error}</Text>
          )}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-task-form"
            disabled={isSubmitting || !slug.trim() || !title.trim()}
          >
            {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ────────────────────────────────────────────────

function getPrVariant(
  prStatus: string | undefined,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (prStatus === 'merged') return 'default';
  if (prStatus === 'closed') return 'outline';
  return 'secondary';
}

// ── Column definitions ─────────────────────────────────────

function createProgressColumns(
  expandedSlugs: Set<string>,
  selectedSlugs: Set<string>,
  onToggleExpand: (slug: string) => void,
  onToggleSelect: (slug: string) => void,
): Array<ColumnDef<ProgressTask>> {
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
          aria-label={expandedSlugs.has(row.original.slug) ? 'Collapse row' : 'Expand row'}
          onClick={() => onToggleExpand(row.original.slug)}
        >
          {expandedSlugs.has(row.original.slug) ? <ChevronDown /> : <ChevronRight />}
        </Button>
      ),
    },
    {
      id: 'select',
      size: 32,
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => {
        const { slug } = row.original;
        const isSelected = selectedSlugs.has(slug);
        return (
          <input
            type="checkbox"
            aria-label={`Select task ${row.original.title}`}
            checked={isSelected}
            className="accent-primary h-4 w-4 cursor-pointer rounded"
            onChange={() => onToggleSelect(slug)}
          />
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      size: 130,
      cell: ({ row }) => {
        const status = row.getValue<ProgressStatus>('status');
        return (
          <Badge variant={PROGRESS_STATUS_VARIANTS[status]}>
            {ACTIVE_PROGRESS_STATUSES.has(status) ? (
              <span className="bg-primary mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
            ) : null}
            {PROGRESS_STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      minSize: 200,
      cell: ({ row }) => (
        <Text className="text-foreground truncate text-sm font-medium">
          {row.getValue<string>('title')}
        </Text>
      ),
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Priority
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      size: 90,
      cell: ({ row }) => {
        const priority = row.getValue<ProgressPriority>('priority');
        return (
          <Badge variant={PRIORITY_VARIANTS[priority]}>
            {PRIORITY_LABELS[priority]}
          </Badge>
        );
      },
    },
    {
      id: 'stage',
      size: 160,
      enableSorting: false,
      header: () => (
        <Text className="text-muted-foreground text-xs font-medium">Stage</Text>
      ),
      cell: ({ row }) => (
        <StageCell
          hasResearch={row.original.hasResearch}
          hasPlan={row.original.hasPlan}
          hasTeamTasks={row.original.hasTeamTasks}
        />
      ),
    },
    {
      id: 'ticket',
      size: 110,
      enableSorting: false,
      header: () => (
        <Text className="text-muted-foreground text-xs font-medium">Ticket</Text>
      ),
      cell: ({ row }) => {
        const { jiraTicket, jiraUrl } = row.original;
        if (!jiraTicket) {
          return <Text className="text-muted-foreground text-xs">—</Text>;
        }
        return (
          <a
            href={jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
            aria-label={`Jira ticket ${jiraTicket}`}
          >
            <Badge variant="outline" className="cursor-pointer text-xs hover:bg-muted">
              {jiraTicket}
            </Badge>
          </a>
        );
      },
    },
    {
      id: 'pr',
      size: 100,
      enableSorting: false,
      header: () => (
        <Text className="text-muted-foreground text-xs font-medium">PR</Text>
      ),
      cell: ({ row }) => {
        const { prNumber, prUrl, prStatus } = row.original;
        if (prNumber === undefined) {
          return <Text className="text-muted-foreground text-xs">—</Text>;
        }
        const prVariant = getPrVariant(prStatus);
        return (
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
            aria-label={`Pull request #${String(prNumber)}`}
          >
            <Badge variant={prVariant} className="cursor-pointer text-xs hover:opacity-80">
              #{String(prNumber)}
              {prStatus === undefined ? null : (
                <span className="text-muted-foreground ml-1 text-[10px]">{prStatus}</span>
              )}
            </Badge>
          </a>
        );
      },
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Updated
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      size: 110,
      cell: ({ row }) => (
        <Text className="text-muted-foreground text-xs">
          {formatRelativeTime(row.getValue<string>('updatedAt'))}
        </Text>
      ),
    },
  ];
}

// ── Main component ─────────────────────────────────────────

export function ProgressTaskGrid() {
  // Store
  const tasks = useProgressContext((s) => s.tasks);
  const isLoading = useProgressContext((s) => s.isLoading);
  const createTask = useProgressContext((s) => s.createTask);
  const runWorkflow = useProgressContext((s) => s.runWorkflow);

  // Local UI state
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(new Set());
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProgressStatus | 'all'>('all');
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false);
  const [runWorkflowError, setRunWorkflowError] = useState<string | null>(null);

  // Derived
  const singleSelected = selectedSlugs.size === 1;
  const selectedSlug = singleSelected ? [...selectedSlugs][0] : null;

  // Handlers
  function handleToggleExpand(slug: string) {
    setExpandedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function handleToggleSelect(slug: string) {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  async function handleRunWorkflow() {
    if (!selectedSlug) return;
    setRunWorkflowError(null);
    try {
      await runWorkflow(selectedSlug);
    } catch (err) {
      setRunWorkflowError(err instanceof Error ? err.message : 'Failed to start workflow.');
    }
  }

  // Filtered data
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (searchText.length > 0) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          t.description.toLowerCase().includes(lower),
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    return filtered;
  }, [tasks, searchText, statusFilter]);

  // Stable column defs
  const columns = useMemo(
    () =>
      createProgressColumns(expandedSlugs, selectedSlugs, handleToggleExpand, handleToggleSelect),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Set refs are stable enough; handlers are inline
    [expandedSlugs, selectedSlugs],
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
    getRowId: (row) => row.slug,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <SearchInput
          className="w-48"
          placeholder="Search tasks…"
          value={searchText}
          showClear={searchText.length > 0}
          onChange={(e) => setSearchText(e.target.value)}
          onClear={() => setSearchText('')}
        />

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ProgressStatus | 'all')}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PROGRESS_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {runWorkflowError === null ? null : (
          <Text className="text-destructive text-xs">{runWorkflowError}</Text>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={!singleSelected}
          onClick={() => void handleRunWorkflow()}
          aria-label="Run workflow for selected task"
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          Run Workflow
        </Button>

        <Dialog open={newTaskDialogOpen} onOpenChange={setNewTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" aria-label="Create new task">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Task
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <>
                    <TableRow
                      key={row.id}
                      data-state={selectedSlugs.has(row.original.slug) ? 'selected' : undefined}
                      className={cn(
                        selectedSlugs.has(row.original.slug) && 'bg-muted/50',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expandedSlugs.has(row.original.slug) ? (
                      <TableRow key={`${row.id}-detail`}>
                        <TableCell
                          className="bg-muted/20 p-4"
                          colSpan={columns.length}
                        >
                          {/* TODO: Task 6 — replace with <ProgressTaskDetailRow task={row.original} /> */}
                          <div className="text-muted-foreground rounded border border-dashed p-4 text-sm">
                            <Text className="font-medium">{row.original.title}</Text>
                            <Text className="mt-1 text-xs">
                              Slug: {row.original.slug} · Status: {row.original.status} ·{' '}
                              Research: {row.original.hasResearch ? 'yes' : 'no'} · Plan:{' '}
                              {row.original.hasPlan ? 'yes' : 'no'} · Team tasks:{' '}
                              {row.original.teamTaskCount}
                            </Text>
                            {row.original.description ? (
                              <Text className="mt-1 text-xs">{row.original.description}</Text>
                            ) : null}
                          </div>
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

      {/* New Task Dialog (rendered outside toolbar so it gets proper portal) */}
      <NewTaskDialog
        open={newTaskDialogOpen}
        onOpenChange={setNewTaskDialogOpen}
        onCreate={createTask}
      />
    </div>
  );
}
