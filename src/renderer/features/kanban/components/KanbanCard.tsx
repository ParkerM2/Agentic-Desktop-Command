/**
 * KanbanCard — Draggable card wrapper for the kanban board
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { Task } from '@shared/types';

import { TaskCard } from '@features/tasks';

interface KanbanCardProps {
  task: Task;
  isSelected?: boolean;
  onClick?: () => void;
}

export function KanbanCard({ task, isSelected, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard isSelected={isSelected} task={task} onClick={onClick} />
    </div>
  );
}
