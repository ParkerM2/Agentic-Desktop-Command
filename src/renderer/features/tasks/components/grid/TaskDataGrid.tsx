/**
 * TaskDataGrid -- Main AG-Grid wrapper for the task dashboard.
 * Renders all tasks with custom cell renderers, expandable detail rows,
 * and real-time update support via applyTransactionAsync.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { AgGridReact } from 'ag-grid-react';

import type { Task } from '@shared/types';

import { useLooseParams } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';

import { Card, Spinner } from '@ui';

import { useProjects } from '@features/projects';
import { useLaunchTask } from '@features/workflow';

import { useKillAgent, useReplanWithFeedback, useRestartFromCheckpoint, useStartExecution, useStartPlanning } from '../../api/useAgentMutations';
import { useUpdateTaskStatus } from '../../api/useTaskMutations';
import { useAllTasks, useTasks } from '../../api/useTasks';
import { useTaskEvents } from '../../hooks/useTaskEvents';
import { useTaskUI } from '../../store';
import { ActionsCell } from '../cells/ActionsCell';
import { ActivitySparklineCell } from '../cells/ActivitySparklineCell';
import { AgentCell } from '../cells/AgentCell';
import { CostCell } from '../cells/CostCell';
import { ExpandToggleCell } from '../cells/ExpandToggleCell';
import { PriorityCell } from '../cells/PriorityCell';
import { ProgressBarCell } from '../cells/ProgressBarCell';
import { PrStatusCell } from '../cells/PrStatusCell';
import { RelativeTimeCell } from '../cells/RelativeTimeCell';
import { StatusBadgeCell } from '../cells/StatusBadgeCell';
import { TitleCell } from '../cells/TitleCell';
import { WorkspaceCell } from '../cells/WorkspaceCell';
import { TaskDetailRow } from '../detail/TaskDetailRow';
import { TaskFiltersToolbar } from '../TaskFiltersToolbar';

import { registerAgGridModules } from './ag-grid-modules';

import type { ColDef, GridApi, GridReadyEvent, ICellRendererParams, RowClassParams } from 'ag-grid-community';

// Register once at module level
registerAgGridModules();

/** Synthetic detail row marker prefix */
const DETAIL_ROW_PREFIX = '_detail_';

interface TaskOrDetail {
  id: string;
  isDetailRow?: boolean;
  parentTask?: Task;
  [key: string]: unknown;
}

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

  // Mutations — agent orchestrator
  const startPlanning = useStartPlanning();
  const startExecution = useStartExecution();
  const killAgent = useKillAgent();
  const restartCheckpoint = useRestartFromCheckpoint();
  const replanWithFeedback = useReplanWithFeedback();
  const updateStatus = useUpdateTaskStatus();
  const launchTask = useLaunchTask();

  // Project data for resolving projectPath
  const { data: projects } = useProjects();

  // Store
  const expandedRowIds = useTaskUI((s) => s.expandedRowIds);
  const toggleRowExpansion = useTaskUI((s) => s.toggleRowExpansion);
  const gridSearchText = useTaskUI((s) => s.gridSearchText);
  const filterStatuses = useTaskUI((s) => s.filterStatuses);

  // Grid API ref
  const gridApiRef = useRef<GridApi | null>(null);

  // Build row data with synthetic detail rows interleaved
  const rowData = useMemo(() => {
    let filtered = [...tasks];

    // Apply search filter
    if (gridSearchText.length > 0) {
      const lower = gridSearchText.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Hub data may omit description at runtime
          (t.description ?? '').toLowerCase().includes(lower),
      );
    }

    // Apply status filter
    if (filterStatuses.length > 0) {
      filtered = filtered.filter((t) => filterStatuses.includes(t.status));
    }

    const rows: TaskOrDetail[] = [];
    for (const task of filtered) {
      rows.push(task as unknown as TaskOrDetail);
      if (expandedRowIds.has(task.id)) {
        rows.push({
          id: `${DETAIL_ROW_PREFIX}${task.id}`,
          isDetailRow: true,
          parentTask: task,
        });
      }
    }
    return rows;
  }, [tasks, expandedRowIds, gridSearchText, filterStatuses]);

  // ── Helper: resolve project path from projectId ──
  const resolveProjectPath = useCallback(
    (taskProjectId: string): string => {
      if (!projects) {
        return '';
      }
      const project = projects.find((p) => p.id === taskProjectId);
      return project?.path ?? '';
    },
    [projects],
  );

  // ── Callbacks ──
  function handleToggleExpand(rowId: string) {
    toggleRowExpansion(rowId);
  }

  const handleStartPlanning = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const taskProjectId = (task as unknown as { projectId?: string }).projectId ?? projectId ?? '';
      const path = resolveProjectPath(taskProjectId);
      if (path.length === 0) return;
      startPlanning.mutate({
        taskId,
        projectPath: path,
        taskDescription: task.description,
      });
    },
    [tasks, projectId, resolveProjectPath, startPlanning],
  );

  const handleStartExecution = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const taskProjectId = (task as unknown as { projectId?: string }).projectId ?? projectId ?? '';
      const path = resolveProjectPath(taskProjectId);
      if (path.length === 0) return;

      // Pass planRef from task metadata when available (plan_ready → execution)
      const metadata = task.metadata as Record<string, unknown> | undefined;
      const planRef = typeof metadata?.planFilePath === 'string' ? metadata.planFilePath : undefined;

      startExecution.mutate({
        taskId,
        projectPath: path,
        taskDescription: task.description,
        planRef,
      });
    },
    [tasks, projectId, resolveProjectPath, startExecution],
  );

  const handleKillAgent = useCallback(
    (taskId: string) => {
      void (async () => {
        const session = await ipc('agent.getOrchestratorSession', { taskId });
        if (session) {
          killAgent.mutate({ sessionId: session.id });
        }
      })();
    },
    [killAgent],
  );

  const handleRestartCheckpoint = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const taskProjectId = (task as unknown as { projectId?: string }).projectId ?? projectId ?? '';
      const path = resolveProjectPath(taskProjectId);
      if (path.length === 0) return;
      restartCheckpoint.mutate({ taskId, projectPath: path });
    },
    [tasks, projectId, resolveProjectPath, restartCheckpoint],
  );

  const handleRejectPlan = useCallback(
    (taskId: string) => {
      updateStatus.mutate({ taskId, status: 'backlog' });
    },
    [updateStatus],
  );

  const handleRequestChanges = useCallback(
    (taskId: string, feedback: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const taskProjectId = (task as unknown as { projectId?: string }).projectId ?? projectId ?? '';
      const path = resolveProjectPath(taskProjectId);
      if (path.length === 0) return;

      const metadata = task.metadata as Record<string, unknown> | undefined;
      const previousPlanPath = typeof metadata?.planFilePath === 'string' ? metadata.planFilePath : undefined;

      replanWithFeedback.mutate({
        taskId,
        projectPath: path,
        taskDescription: task.description,
        feedback,
        previousPlanPath,
      });
    },
    [tasks, projectId, resolveProjectPath, replanWithFeedback],
  );

  const handleLaunchWorkflow = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const taskProjectId = (task as unknown as { projectId?: string }).projectId ?? projectId ?? '';
      const path = resolveProjectPath(taskProjectId);
      if (path.length === 0) return;
      launchTask.mutate({
        taskDescription: task.description,
        projectPath: path,
      });
    },
    [tasks, projectId, resolveProjectPath, launchTask],
  );

  const getRowId = useCallback(
    (params: { data: TaskOrDetail }) => params.data.id,
    [],
  );

  const isFullWidthRow = useCallback(
    (params: { rowNode: { data: TaskOrDetail | undefined } }) =>
      params.rowNode.data?.isDetailRow === true,
    [],
  );

  const getRowHeight = useCallback(
    (params: { data: TaskOrDetail | undefined }) => {
      if (params.data?.isDetailRow === true) {
        return 220;
      }
      return 44;
    },
    [],
  );

  const getRowClass = useCallback(
    (params: RowClassParams<TaskOrDetail>) => {
      if (params.data?.isDetailRow === true) {
        return 'ag-full-width-row-detail';
      }
      return '';
    },
    [],
  );

  const onGridReady = useCallback((event: GridReadyEvent) => {
    gridApiRef.current = event.api;
  }, []);

  // Resize columns when grid/data changes
  useEffect(() => {
    if (gridApiRef.current) {
      gridApiRef.current.sizeColumnsToFit();
    }
  }, [rowData]);

  // Column definitions
  const columnDefs = useMemo<Array<ColDef<TaskOrDetail>>>(
    () => [
      {
        headerName: '',
        field: 'id',
        width: 40,
        minWidth: 40,
        maxWidth: 40,
        sortable: false,
        filter: false,
        resizable: false,
        suppressMovable: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AG-Grid cellRendererSelector uses generic params
        cellRendererSelector: (params: Record<string, any>) => {
          const data = params.data as TaskOrDetail | undefined;
          if (data?.isDetailRow === true) {
            return { component: () => null };
          }
          return {
            component: ExpandToggleCell,
            params: {
              isExpanded: expandedRowIds.has(data?.id ?? ''),
              onToggle: handleToggleExpand,
            },
          };
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 130,
        cellRenderer: StatusBadgeCell,
        sortable: true,
      },
      {
        headerName: 'Title',
        field: 'title',
        flex: 1,
        minWidth: 200,
        cellRenderer: TitleCell,
        sortable: true,
      },
      {
        headerName: 'Workspace',
        width: 130,
        cellRenderer: WorkspaceCell,
        sortable: true,
        valueGetter: (params) => {
          const task = params.data;
          return (task?.metadata as Record<string, unknown> | undefined)?.workspaceName ?? null;
        },
      },
      {
        headerName: 'Agent',
        width: 140,
        cellRenderer: AgentCell,
        sortable: true,
        valueGetter: (params) => {
          const task = params.data;
          return (task?.metadata as Record<string, unknown> | undefined)?.agentName ?? '';
        },
      },
      {
        headerName: 'Progress',
        width: 180,
        cellRenderer: ProgressBarCell,
        sortable: true,
        valueGetter: (params) => {
          const task = params.data as Task | undefined;
          return task?.executionProgress?.overallProgress ?? 0;
        },
      },
      {
        headerName: 'Activity',
        width: 150,
        cellRenderer: ActivitySparklineCell,
        sortable: false,
        valueGetter: (params) => {
          const task = params.data;
          return (task?.metadata as Record<string, unknown> | undefined)?.activityHistory ?? [];
        },
      },
      {
        headerName: 'Priority',
        width: 100,
        cellRenderer: PriorityCell,
        sortable: true,
        valueGetter: (params) => {
          const task = params.data;
          return (task?.metadata as Record<string, unknown> | undefined)?.priority ?? 'medium';
        },
      },
      {
        headerName: 'PR',
        width: 100,
        cellRenderer: PrStatusCell,
        sortable: true,
        valueGetter: (params) => {
          const task = params.data as Task | undefined;
          if (!task?.prStatus) return null;
          return {
            state: task.prStatus.state,
            ciStatus: task.prStatus.ciStatus,
            number: task.prStatus.prNumber,
          };
        },
      },
      {
        headerName: 'Cost',
        width: 90,
        cellRenderer: CostCell,
        sortable: true,
        valueGetter: (params) => {
          const task = params.data;
          return (task?.metadata as Record<string, unknown> | undefined)?.costUsd ?? 0;
        },
      },
      {
        headerName: 'Updated',
        field: 'updatedAt',
        width: 110,
        cellRenderer: RelativeTimeCell,
        sort: 'desc',
        sortable: true,
      },
      {
        headerName: 'Actions',
        width: 120,
        cellRenderer: ActionsCell,
        cellRendererParams: {
          onStartPlanning: handleStartPlanning,
          onStartExecution: handleStartExecution,
          onKillAgent: handleKillAgent,
          onRestartCheckpoint: handleRestartCheckpoint,
        },
        filter: false,
        resizable: false,
        sortable: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expandedRowIds is a Set; must re-render column defs when it changes
    [expandedRowIds, handleStartPlanning, handleStartExecution, handleKillAgent, handleRestartCheckpoint],
  );

  // Full-width cell renderer for detail rows
  const fullWidthCellRenderer = useCallback(
    (params: ICellRendererParams<TaskOrDetail>) => {
      const detailData = params.data;
      if (detailData?.isDetailRow === true && detailData.parentTask) {
        return (
          <TaskDetailRow
            task={detailData.parentTask}
            onApproveAndExecute={handleStartExecution}
            onKillAgent={handleKillAgent}
            onLaunchWorkflow={handleLaunchWorkflow}
            onRejectPlan={handleRejectPlan}
            onRequestChanges={handleRequestChanges}
            onRestartCheckpoint={handleRestartCheckpoint}
          />
        );
      }
      return null;
    },
    [handleStartExecution, handleKillAgent, handleLaunchWorkflow, handleRejectPlan, handleRequestChanges, handleRestartCheckpoint],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="text-muted-foreground" size="lg" />
        <p className="text-muted-foreground mt-3 text-sm">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <TaskFiltersToolbar />

      <Card className="border-border bg-card min-h-0 flex-1 overflow-hidden rounded-lg border">
        <div className={cn('ag-theme-quartz ag-theme-claude h-full bg-card')}>
          <AgGridReact<TaskOrDetail>
            animateRows
            suppressCellFocus
            columnDefs={columnDefs}
            fullWidthCellRenderer={fullWidthCellRenderer}
            getRowClass={getRowClass}
            getRowHeight={getRowHeight}
            getRowId={getRowId}
            isFullWidthRow={isFullWidthRow}
            noRowsOverlayComponent={NoRowsOverlay}
            rowData={rowData}
            defaultColDef={{
              filter: false,
              resizable: true,
              suppressHeaderMenuButton: true,
            }}
            onGridReady={onGridReady}
          />
        </div>
      </Card>
    </div>
  );
}

function NoRowsOverlay() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-muted-foreground text-sm">No tasks found</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Try adjusting your filters or create a new task
      </p>
    </div>
  );
}
