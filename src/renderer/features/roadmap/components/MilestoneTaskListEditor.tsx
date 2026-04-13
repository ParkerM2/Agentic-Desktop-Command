/**
 * MilestoneTaskListEditor — Manage the task checklist within a milestone.
 * Handles add / rename / toggle / delete operations on MilestoneTask items.
 */

import { useState } from 'react';

import { Pencil, Plus, Square, SquareCheck, Trash2, X } from 'lucide-react';

import type { MilestoneTask } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Input, Label } from '@ui';

interface MilestoneTaskListEditorProps {
  tasks: MilestoneTask[];
  onChange: (tasks: MilestoneTask[]) => void;
}

export function MilestoneTaskListEditor({ tasks, onChange }: MilestoneTaskListEditorProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  function handleAddTask(): void {
    if (newTaskTitle.trim().length === 0) return;
    const newTask: MilestoneTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      completed: false,
    };
    onChange([...tasks, newTask]);
    setNewTaskTitle('');
  }

  function handleDeleteTask(taskId: string): void {
    onChange(tasks.filter((t) => t.id !== taskId));
  }

  function handleToggleTask(taskId: string): void {
    onChange(tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)));
  }

  function handleStartEditTask(task: MilestoneTask): void {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  }

  function handleCommitTaskEdit(): void {
    if (editingTaskId === null) return;
    if (editingTaskTitle.trim().length > 0) {
      onChange(
        tasks.map((t) =>
          t.id === editingTaskId ? { ...t, title: editingTaskTitle.trim() } : t,
        ),
      );
    }
    setEditingTaskId(null);
    setEditingTaskTitle('');
  }

  function handleCancelTaskEdit(): void {
    setEditingTaskId(null);
    setEditingTaskTitle('');
  }

  function renderTaskItem(task: MilestoneTask) {
    const isEditing = editingTaskId === task.id;

    if (isEditing) {
      return (
        <div key={task.id} className="flex items-center gap-2 py-0.5">
          <Input
            className="h-7 flex-1 text-sm"
            type="text"
            value={editingTaskTitle}
            onChange={(e) => setEditingTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommitTaskEdit();
              if (e.key === 'Escape') handleCancelTaskEdit();
            }}
          />
          <Button
            aria-label="Confirm task rename"
            className="h-7 w-7"
            size="icon"
            type="button"
            variant="ghost"
            onClick={handleCommitTaskEdit}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            aria-label="Cancel task rename"
            className="h-7 w-7"
            size="icon"
            type="button"
            variant="ghost"
            onClick={handleCancelTaskEdit}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div
        key={task.id}
        className="flex items-center gap-2 rounded px-1 py-0.5"
      >
        <Button
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          className="h-6 w-6 shrink-0 p-0"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => handleToggleTask(task.id)}
        >
          {task.completed ? (
            <SquareCheck className="text-primary h-4 w-4" />
          ) : (
            <Square className="text-muted-foreground h-4 w-4" />
          )}
        </Button>
        <span
          className={cn(
            'flex-1 truncate text-sm',
            task.completed && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </span>
        <Button
          aria-label="Edit task title"
          className="h-6 w-6 shrink-0 p-0 opacity-0 group-hover:opacity-100"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => handleStartEditTask(task)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          aria-label="Delete task"
          className="text-muted-foreground hover:text-destructive h-6 w-6 shrink-0 p-0"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => handleDeleteTask(task.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Label>Tasks</Label>
      <div className="border-border mt-1 space-y-0.5 rounded-md border p-2">
        {(tasks.length > 0) ? (
          <div className="group mb-2 space-y-0.5">
            {tasks.map((task) => renderTaskItem(task))}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Input
            className="h-7 flex-1 text-sm"
            placeholder="Add a task..."
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
            }}
          />
          <Button
            aria-label="Add task"
            className="h-7 w-7"
            size="icon"
            type="button"
            variant="ghost"
            onClick={handleAddTask}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
