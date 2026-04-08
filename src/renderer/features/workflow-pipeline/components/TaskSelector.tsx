/**
 * TaskSelector — Dropdown to pick a task from the current project.
 * Shows task title and status badge for each option.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@ui';

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
        <Spinner className="text-muted-foreground" size="sm" />
        <span className="text-muted-foreground text-sm">Loading tasks...</span>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return <span className="text-muted-foreground text-sm">No tasks in this project</span>;
  }

  return (
    <Select
      value={selectedTaskId ?? ''}
      onValueChange={(value) => {
        if (value.length > 0) {
          onSelectTask(value);
        }
      }}
    >
      <SelectTrigger aria-label="Select a task" className="max-w-sm">
        <SelectValue placeholder="Select a task..." />
      </SelectTrigger>
      <SelectContent>
        {tasks.map((task) => (
          <SelectItem key={task.id} value={task.id}>
            {task.title} [{task.status}]
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
