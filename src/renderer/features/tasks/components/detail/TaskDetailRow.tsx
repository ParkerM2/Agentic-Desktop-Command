/**
 * TaskDetailRow -- Full-width expanded view with subtasks, logs, PR info, and controls.
 * Rendered as a full-width row below the parent task row in the grid.
 */

import type { Task } from '@shared/types';

import { ExecutionLog } from './ExecutionLog';
import { PRStatusPanel } from './PrStatusPanel';
import { SubtaskList } from './SubtaskList';
import { TaskControls } from './TaskControls';

interface TaskDetailRowProps {
  task: Task;
}

export function TaskDetailRow({ task }: TaskDetailRowProps) {
  return (
    <div className="bg-card/50 border-border border-b px-6 py-4">
      {/* Three-column layout: Subtasks | Logs | PR Status */}
      <div className="mb-4 grid grid-cols-3 gap-6">
        {/* Left: Subtasks */}
        <div className="min-w-0">
          <SubtaskList subtasks={task.subtasks} />
        </div>

        {/* Center: Execution Log */}
        <div className="min-w-0">
          <ExecutionLog logs={task.logs ?? []} />
        </div>

        {/* Right: PR Status */}
        <div className="min-w-0">
          <PRStatusPanel
            prStatus={task.prStatus}
            prUrl={task.metadata?.prUrl}
          />
        </div>
      </div>

      {/* Bottom: Controls */}
      <div className="border-border border-t pt-3">
        <TaskControls task={task} />
      </div>
    </div>
  );
}
