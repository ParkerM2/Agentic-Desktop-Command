/**
 * TaskSelector — Dropdown to pick a task from the current project.
 * Shows task title and status badge for each option.
 */

import { Loader2 } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useTasks } from '@features/tasks';

interface TaskSelectorProps {
  projectId: string;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

export function TaskSelector({ projectId, selectedTaskId, onSelectTask }: TaskSelectorProps) {
  const { data: tasks, isLoading } = useTasks(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-sm">Loading tasks...</span>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return <span className="text-muted-foreground text-sm">No tasks in this project</span>;
  }

  return (
    <select
      aria-label="Select a task"
      value={selectedTaskId ?? ''}
      className={cn(
        'border-input bg-background text-foreground rounded-md border px-3 py-1.5 text-sm',
        'focus:ring-ring focus:border-ring focus:outline-none focus:ring-1',
        'max-w-sm',
      )}
      onChange={(event) => {
        if (event.target.value.length > 0) {
          onSelectTask(event.target.value);
        }
      }}
    >
      <option value="">Select a task...</option>
      {tasks.map((task) => (
        <option key={task.id} value={task.id}>
          {task.title} [{task.status}]
        </option>
      ))}
    </select>
  );
}
