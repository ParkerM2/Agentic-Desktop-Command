/**
 * EditProgressTaskDialog — Edit title, description, priority, and status
 * for an existing progress task.
 *
 * Opened from:
 *   - ProgressTaskGrid row action column (edit icon button)
 *   - ProgressTaskDetailRow footer edit button
 */

import type { ProgressPriority, ProgressStatus, ProgressTask } from '@shared/types/progress';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
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
  Text,
  Textarea,
} from '@ui';

import { useEditProgressTaskDialog } from './useEditProgressTaskDialog';

// ── Constants ───────────────────────────────────────────────

const PRIORITY_OPTIONS: Array<{ value: ProgressPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_OPTIONS: Array<{ value: ProgressStatus; label: string }> = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'researching', label: 'Researching' },
  { value: 'research_done', label: 'Research Done' },
  { value: 'planning', label: 'Planning' },
  { value: 'plan_ready', label: 'Plan Ready' },
  { value: 'executing', label: 'Executing' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'error', label: 'Error' },
];

// ── Props ───────────────────────────────────────────────────

interface EditProgressTaskDialogProps {
  task: ProgressTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ───────────────────────────────────────────────

export function EditProgressTaskDialog({ task, open, onOpenChange }: EditProgressTaskDialogProps) {
  const {
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    status,
    setStatus,
    error,
    isSubmitting,
    handleOpenChange,
    handleSubmit,
  } = useEditProgressTaskDialog(task, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update title, description, priority, and status for this task.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" id="edit-task-form" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-task-title">Title</Label>
            <Input
              id="edit-task-title"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-task-description">Description</Label>
            <Textarea
              id="edit-task-description"
              placeholder="Short description (optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-task-priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as ProgressPriority)}
            >
              <SelectTrigger id="edit-task-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-task-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ProgressStatus)}
            >
              <SelectTrigger id="edit-task-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error === null ? null : (
            <Text className="text-destructive text-sm">{error}</Text>
          )}
        </form>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || title.trim().length === 0}
            form="edit-task-form"
            type="submit"
          >
            {isSubmitting ? <Spinner className="mr-2" size="sm" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
