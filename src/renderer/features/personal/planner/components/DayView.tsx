/**
 * DayView — Timeline with time blocks for a single day
 */

import { useState } from 'react';

import { Calendar, Clock, Edit2, Plus, Trash2 } from 'lucide-react';

import type { ScheduledTask, TimeBlock } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Heading, Text } from '@ui';

import { usePlannerUI } from '../store';

import { CalendarOverlay } from './CalendarOverlay';
import { TimeBlockEditor } from './TimeBlockEditor';

const BLOCK_TYPE_STYLES: Record<TimeBlock['type'], string> = {
  focus: 'border-l-primary bg-primary/5',
  meeting: 'border-l-info bg-info/5',
  break: 'border-l-success bg-success/5',
  other: 'border-l-muted-foreground bg-muted/30',
};

const BLOCK_TYPE_LABELS: Record<TimeBlock['type'], string> = {
  focus: 'Focus',
  meeting: 'Meeting',
  break: 'Break',
  other: 'Other',
};

interface DayViewProps {
  /** Date in YYYY-MM-DD format */
  date: string;
  timeBlocks: TimeBlock[];
  scheduledTasks?: ScheduledTask[];
  onAdd: (block: Omit<TimeBlock, 'id'>) => void;
  onUpdate: (blockId: string, updates: Partial<Omit<TimeBlock, 'id'>>) => void;
  onRemove: (blockId: string) => void;
}

export function DayView({ date, timeBlocks, scheduledTasks = [], onAdd, onUpdate, onRemove }: DayViewProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | undefined>();
  const { showCalendarOverlay, setShowCalendarOverlay } = usePlannerUI();

  const sorted = [...timeBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  function handleSave(block: Omit<TimeBlock, 'id'>) {
    if (editingBlock) {
      onUpdate(editingBlock.id, block);
    } else {
      onAdd(block);
    }
    setShowEditor(false);
    setEditingBlock(undefined);
  }

  function handleEdit(block: TimeBlock) {
    setEditingBlock(block);
    setShowEditor(true);
  }

  function handleCancel() {
    setShowEditor(false);
    setEditingBlock(undefined);
  }

  function handleToggleCalendar() {
    setShowCalendarOverlay(!showCalendarOverlay);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Heading as="h3" className="text-foreground text-sm font-semibold">Schedule</Heading>
        <div className="flex items-center gap-2">
          <Button
            aria-label={showCalendarOverlay ? 'Hide calendar events' : 'Show calendar events'}
            size="sm"
            title={showCalendarOverlay ? 'Hide calendar events' : 'Show calendar events'}
            type="button"
            variant="ghost"
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
              showCalendarOverlay
                ? 'bg-info/10 text-info hover:bg-info/20'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={handleToggleCalendar}
          >
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </Button>
          {showEditor ? null : (
            <Button
              className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs transition-colors"
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => setShowEditor(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Block
            </Button>
          )}
        </div>
      </div>

      {showEditor ? (
        <TimeBlockEditor editingBlock={editingBlock} onCancel={handleCancel} onSave={handleSave} />
      ) : null}

      {/* Calendar Events Overlay */}
      <CalendarOverlay date={date} visible={showCalendarOverlay} />

      {/* User Time Blocks */}
      {sorted.length === 0 && !showEditor ? (
        <Text className="text-muted-foreground text-xs">No time blocks scheduled.</Text>
      ) : (
        <div className="space-y-2">
          {sorted.map((block) => (
            <div
              key={block.id}
              className={cn(
                'group rounded-md border-l-3 px-3 py-2.5 transition-colors',
                BLOCK_TYPE_STYLES[block.type],
              )}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <Text className="text-foreground text-sm font-medium">{block.label}</Text>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>
                      {block.startTime} - {block.endTime}
                    </span>
                    <span className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
                      {BLOCK_TYPE_LABELS[block.type]}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    aria-label="Edit block"
                    className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(block)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    aria-label="Remove block"
                    className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemove(block.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled Tasks */}
      {scheduledTasks.length > 0 ? (
        <div className="mt-4 space-y-2">
          <Heading as="h3" className="text-foreground text-sm font-semibold">Scheduled Tasks</Heading>
          <div className="space-y-2">
            {scheduledTasks.map((task) => (
              <div
                key={task.taskId}
                className="border-l-muted-foreground bg-muted/20 group rounded-md border-l-3 px-3 py-2"
              >
                <div className="flex items-start justify-between">
                  <div className={cn('min-w-0 flex-1', task.completed ? 'opacity-50' : '')}>
                    <code className="text-foreground text-xs font-mono">{task.taskId}</code>
                    {task.scheduledTime === undefined && task.estimatedDuration === undefined ? null : (
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                        {task.scheduledTime === undefined ? null : <span>{task.scheduledTime}</span>}
                        {task.estimatedDuration === undefined ? null : (
                          <span>{task.estimatedDuration} min</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
