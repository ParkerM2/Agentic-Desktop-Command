/**
 * KanbanBoard — Drag-and-drop task board
 *
 * Groups tasks by status into columns.
 * Uses dnd-kit for drag-and-drop between columns.
 */

import { useMemo, useState } from 'react';

import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useParams } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import type { Task, TaskStatus } from '@shared/types';

import { useTasks, useUpdateTaskStatus, useTaskUI, TaskCard, useTaskEvents } from '@features/tasks';

import { KanbanCard } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';
import { TaskDetailModal } from './TaskDetailModal';

const COLUMNS: Array<{ status: TaskStatus; label: string; color: string }> = [
  { status: 'backlog', label: 'Backlog', color: 'border-t-zinc-500' },
  { status: 'queue', label: 'Queue', color: 'border-t-blue-500' },
  { status: 'in_progress', label: 'In Progress', color: 'border-t-amber-500' },
  { status: 'ai_review', label: 'AI Review', color: 'border-t-purple-500' },
  { status: 'human_review', label: 'Review', color: 'border-t-orange-500' },
  { status: 'done', label: 'Done', color: 'border-t-emerald-500' },
  { status: 'error', label: 'Error', color: 'border-t-red-500' },
];

export function KanbanBoard() {
  const { projectId } = useParams({ strict: false });
  const { data: tasks, isLoading } = useTasks(projectId ?? null);
  const updateStatus = useUpdateTaskStatus();
  const { selectedTaskId, selectTask } = useTaskUI();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Register real-time event listeners
  useTaskEvents();

  // dnd-kit sensors — require 8px movement before drag starts
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    for (const col of COLUMNS) {
      grouped[col.status] = [];
    }
    for (const task of tasks ?? []) {
      grouped[task.status].push(task);
    }
    return grouped;
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks?.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(_event: DragOverEvent) {
    // Could be used for visual feedback when hovering over columns
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    // The "over" could be a column ID (status) or another card
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = COLUMNS.find((c) => c.status === overId);
    const targetStatus = targetColumn?.status;

    if (!targetStatus) {
      // Dropped on a card — find which column that card is in
      const targetTask = tasks?.find((t) => t.id === overId);
      if (targetTask && targetTask.status !== activeTask?.status) {
        updateStatus.mutate({ taskId, status: targetTask.status });
      }
      return;
    }

    // Dropped on a column directly
    if (activeTask && activeTask.status !== targetStatus) {
      updateStatus.mutate({ taskId, status: targetStatus });
    }
  }

  function handleCardClick(taskId: string) {
    selectTask(taskId);
    setDetailTaskId(taskId);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const detailTask = detailTaskId ? tasks?.find((t) => t.id === detailTaskId) : null;

  return (
    <>
      <DndContext
        collisionDetection={closestCorners}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
      >
        <div className="flex h-full gap-3 overflow-x-auto p-4">
          {COLUMNS.map((col) => {
            const columnTasks = tasksByStatus[col.status] ?? [];
            return (
              <KanbanColumn
                key={col.status}
                color={col.color}
                count={columnTasks.length}
                id={col.status}
                label={col.label}
              >
                <SortableContext
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      isSelected={task.id === selectedTaskId}
                      task={task}
                      onClick={() => handleCardClick(task.id)}
                    />
                  ))}
                </SortableContext>

                {columnTasks.length === 0 && (
                  <div className="border-border/50 text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
                    No tasks
                  </div>
                )}
              </KanbanColumn>
            );
          })}
        </div>

        {/* Drag overlay — floating card while dragging */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 opacity-90">
              <TaskCard className="shadow-xl" task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      {detailTask ? (
        <TaskDetailModal
          open={!!detailTaskId}
          projectId={projectId ?? ''}
          task={detailTask}
          onClose={() => setDetailTaskId(null)}
        />
      ) : null}
    </>
  );
}
