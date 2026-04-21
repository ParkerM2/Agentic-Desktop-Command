/**
 * TeamGroup — Card grouping tasks by team name
 */

import { Users } from 'lucide-react';

import type { ProgressTask } from '@shared/types/progress';

import {
  Card,
  CardContent,
  CardHeader,
  Separator,
} from '@ui';

import { TaskRow } from '../TaskRow';

export interface TasksByTeam {
  teamName: string;
  tasks: ProgressTask[];
}

export interface TeamGroupProps {
  group: TasksByTeam;
  onNavigate: (task: ProgressTask) => void;
}

export function TeamGroup({ group, onNavigate }: TeamGroupProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-3">
        <Users className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground text-sm font-semibold">{group.teamName}</span>
        <span className="text-muted-foreground text-xs">({group.tasks.length})</span>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <div className="divide-border divide-y">
          {group.tasks.map((task) => (
            <TaskRow
              key={task.slug}
              task={task}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
