/**
 * MilestoneEditDialog — Edit a milestone's title, description, targetDate, status,
 * and task items (rename, delete, toggle).
 */

import { useEffect, useState } from 'react';

import { Pencil, Plus, Square, SquareCheck, Trash2, X } from 'lucide-react';

import type { Milestone, MilestoneStatus, MilestoneTask } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@ui';

import { useUpdateMilestone } from '../api/useMilestones';

interface MilestoneEditDialogProps {
  milestone: Milestone | null;
  onClose: () => void;
}

export function MilestoneEditDialog({ milestone, onClose }: MilestoneEditDialogProps) {
  // 1. Hooks
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('planned');
  const [tasks, setTasks] = useState<MilestoneTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateMilestone = useUpdateMilestone();

  // 2. Effects — initialize form from milestone prop
  useEffect(() => {
    if (milestone !== null) {
      setTitle(milestone.title);
      setDescription(milestone.description);
      setTargetDate(milestone.targetDate.substring(0, 10));
      setStatus(milestone.status);
      setTasks([...milestone.tasks]);
      setNewTaskTitle('');
      setEditingTaskId(null);
      setEditingTaskTitle('');
      setErrorMessage(null);
    }
  }, [milestone]);

  // 3. Derived state
  const titleIsEmpty = title.trim().length === 0;
  const targetDateIsEmpty = targetDate.trim().length === 0;
  const isFormValid = !titleIsEmpty && !targetDateIsEmpty;

  // 4. Task handlers
  function handleAddTask(): void {
    if (!newTaskTitle.trim()) return;
    const newTask: MilestoneTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      completed: false,
    };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskTitle('');
  }

  function handleDeleteTask(taskId: string): void {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  function handleToggleTask(taskId: string): void {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
    );
  }

  function handleStartEditTask(task: MilestoneTask): void {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  }

  function handleCommitTaskEdit(): void {
    if (editingTaskId === null) return;
    if (editingTaskTitle.trim().length === 0) {
      setEditingTaskId(null);
      setEditingTaskTitle('');
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTaskId ? { ...t, title: editingTaskTitle.trim() } : t,
      ),
    );
    setEditingTaskId(null);
    setEditingTaskTitle('');
  }

  function handleCancelTaskEdit(): void {
    setEditingTaskId(null);
    setEditingTaskTitle('');
  }

  // 5. Submit handler
  function handleSave(): void {
    if (milestone === null || !isFormValid) return;

    setErrorMessage(null);

    updateMilestone.mutate(
      {
        id: milestone.id,
        title: title.trim(),
        description: description.trim(),
        targetDate: new Date(targetDate).toISOString(),
        status,
        tasks,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to update milestone');
        },
      },
    );
  }

  // 6. Render helpers
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
    <Dialog open={milestone !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Pencil className="text-primary h-5 w-5" />
            Edit Milestone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <Label htmlFor="edit-milestone-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              aria-required="true"
              className="mt-1"
              id="edit-milestone-title"
              placeholder="Milestone title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="edit-milestone-description">Description</Label>
            <Textarea
              className="mt-1 resize-none"
              id="edit-milestone-description"
              placeholder="Optional description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Target Date */}
          <div>
            <Label htmlFor="edit-milestone-date">
              Target Date <span className="text-destructive">*</span>
            </Label>
            <Input
              aria-required="true"
              className="mt-1"
              id="edit-milestone-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="edit-milestone-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MilestoneStatus)}>
              <SelectTrigger className="mt-1" id="edit-milestone-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tasks */}
          <div>
            <Label>Tasks</Label>
            <div className="border-border mt-1 space-y-0.5 rounded-md border p-2">
              {(tasks.length) > 0 ? (
                <div className="group mb-2 space-y-0.5">
                  {tasks.map((task) => renderTaskItem(task))}
                </div>
              ) : null}

              {/* Add new task */}
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
        </div>

        {/* Error message */}
        {errorMessage === null ? null : (
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-destructive text-sm">{errorMessage}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!isFormValid || updateMilestone.isPending}
            type="button"
            onClick={handleSave}
          >
            {updateMilestone.isPending ? (
              <>
                <Spinner size="sm" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
