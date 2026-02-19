/**
 * SubtaskList -- Checkbox list of subtasks from task.subtasks[]
 */

import { CheckCircle2, Circle, XCircle } from 'lucide-react';

import type { Subtask, SubtaskStatus } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { Spinner } from '@ui';

interface SubtaskListProps {
  subtasks: Subtask[];
}

function getSubtaskIcon(status: SubtaskStatus) {
  switch (status) {
    case 'completed': {
      return <CheckCircle2 className="text-success h-4 w-4 shrink-0" />;
    }
    case 'in_progress': {
      return <Spinner className="text-primary shrink-0" size="sm" />;
    }
    case 'failed': {
      return <XCircle className="text-destructive h-4 w-4 shrink-0" />;
    }
    case 'pending': {
      return <Circle className="text-muted-foreground h-4 w-4 shrink-0" />;
    }
  }
}

export function SubtaskList({ subtasks }: SubtaskListProps) {
  if (subtasks.length === 0) {
    return (
      <p className="text-muted-foreground text-xs italic">No subtasks defined</p>
    );
  }

  const completedCount = subtasks.filter((s) => s.status === 'completed').length;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground mb-1 text-xs font-medium">
        Subtasks ({completedCount}/{subtasks.length})
      </div>
      <ul className="flex flex-col gap-1">
        {subtasks.map((subtask) => (
          <li
            key={subtask.id}
            className="flex items-start gap-2"
          >
            {getSubtaskIcon(subtask.status)}
            <span
              title={subtask.description}
              className={cn(
                'text-xs leading-tight',
                subtask.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground',
              )}
            >
              {subtask.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
