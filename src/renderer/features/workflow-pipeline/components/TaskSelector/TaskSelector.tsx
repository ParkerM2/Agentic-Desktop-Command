/**
 * TaskSelector — Dropdown to pick a progress task.
 * Shows task title and status badge for each option.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner } from '@ui';

import { useProgressTasks } from '@features/tasks/api/useProgress';

interface TaskSelectorProps {
  projectId: string;
  selectedSlug: string | null;
  onSelectTask: (slug: string) => void;
}

export function TaskSelector({ selectedSlug, onSelectTask }: TaskSelectorProps) {
  const { data: tasks, isLoading } = useProgressTasks();

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
      value={selectedSlug ?? ''}
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
          <SelectItem key={task.slug} value={task.slug}>
            {task.title} [{task.status}]
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
